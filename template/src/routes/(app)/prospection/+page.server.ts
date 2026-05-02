import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { LeadCreateSchema, LeadExpressCreateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema, LeadTransfertSchema, RechercheCreateSchema, RechercheDeleteSchema, LEAD_FIELDS, LEAD_EXPRESS_FIELDS, extractForm, validate } from '$lib/schemas';
import { calculerScore } from '$lib/scoring';
import { dbFail, escapeIlike, newId, now } from '$lib/server/db-helpers';
import { PROSPECTION_TABS, TAB_SOURCE_MAP, VALID_SORT_KEYS, type ProspectionTabKey } from '$lib/prospection-utils';

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = new Set([25, 50, 100]);

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);
	const sortKey = VALID_SORT_KEYS.includes(url.searchParams.get('sort') ?? '') ? url.searchParams.get('sort')! : 'score_pertinence';
	const sortAsc = url.searchParams.get('dir') === 'asc';

	// Phase 2 2026-05-01 : onglet actif (par défaut SIMAP, signal le plus actionnable).
	const rawTab = url.searchParams.get('tab') ?? 'simap';
	const tab: ProspectionTabKey = (PROSPECTION_TABS as readonly string[]).includes(rawTab)
		? (rawTab as ProspectionTabKey)
		: 'simap';

	// Phase 2 : entrées par page configurable, whitelist stricte (anti-DOS via URL).
	const rawPerPage = parseInt(url.searchParams.get('perPage') ?? '', 10);
	const pageSize = ALLOWED_PAGE_SIZES.has(rawPerPage) ? rawPerPage : DEFAULT_PAGE_SIZE;

	// Filtres depuis URL params
	const filterSources = url.searchParams.getAll('source');
	const filterCantons = url.searchParams.getAll('canton');
	const filterStatuts = url.searchParams.getAll('statut');
	const filterTemperatures = url.searchParams.getAll('temp');
	const search = url.searchParams.get('q') ?? '';

	// Phase 0 : toggle "afficher les transférés". Off par défaut, persiste via URL.
	// Quand off ET aucun filtre statut explicite : on cache statut=transfere de la liste.
	// Si l'utilisateur cherche explicitement les transférés via le filtre statut, on respecte.
	const showTransferred = url.searchParams.get('showTransferred') === '1';

	// Tracabilite Veille -> Prospection : propagee depuis /veille/[id] via URL.
	// UUID = tracable vers intelligence_reports, term = libre (max 200).
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const rawFromIntelligence = url.searchParams.get('from_intelligence');
	const fromIntelligence = rawFromIntelligence && UUID_RE.test(rawFromIntelligence) ? rawFromIntelligence : null;
	const fromTerm = (url.searchParams.get('from_term') ?? '').slice(0, 200) || null;

	// V1.2 audit S160 : pattern dédié pour search safe (pas de mini-DSL PostgREST).
	// Injection passée par .or() était critique (cf. memory/feedback_postgrest_or_filter_injection.md).
	// On factorise toute la query (sans search) puis on duplique en parallèle 3 .ilike() + Set dédup.
	const tabSources = TAB_SOURCE_MAP[tab];
	const effectiveSources = filterSources.length > 0
		? filterSources.filter((s) => tabSources.includes(s))
		: tabSources;
	const sourceFilterIncompatible = filterSources.length > 0 && effectiveSources.length === 0;

	const buildBaseQuery = () => {
		let q = locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact' });
		if (!sourceFilterIncompatible) {
			q = q.in('source', effectiveSources.length > 0 ? effectiveSources : tabSources);
		}
		if (filterCantons.length > 0) q = q.in('canton', filterCantons);
		if (filterStatuts.length > 0) {
			q = q.in('statut', filterStatuts);
		} else if (!showTransferred) {
			q = q.neq('statut', 'transfere');
		}
		if (filterTemperatures.length > 0) {
			const ranges: string[] = [];
			if (filterTemperatures.includes('chaud')) ranges.push('score_pertinence.gte.7');
			if (filterTemperatures.includes('tiede')) ranges.push('and(score_pertinence.gte.4,score_pertinence.lte.6)');
			if (filterTemperatures.includes('froid')) ranges.push('score_pertinence.lte.3');
			if (ranges.length > 0) q = q.or(ranges.join(','));
		}
		return q;
	};

	// Type ligne : on récupère le type produit par Supabase (Database.public.prospect_leads.Row).
	// Awaited<ReturnType<typeof buildBaseQuery>>['data'] = LeadRow[] | null typé strict.
	type LeadRow = NonNullable<Awaited<ReturnType<typeof buildBaseQuery>>['data']>[number];
	const SEARCH_FIELDS: Array<'raison_sociale' | 'localite' | 'canton'> = ['raison_sociale', 'localite', 'canton'];

	const runMainQuery = async (): Promise<{ data: LeadRow[]; count: number; error: { message: string } | null }> => {
		if (sourceFilterIncompatible) {
			return { data: [], count: 0, error: null };
		}
		if (search) {
			// Échappe les 3 wildcards SQL ilike (% _ \). Les séparateurs mini-DSL PostgREST
			// (`,` `(` `)` `:` `.`) ne sont plus interprétés ici car la valeur est passée
			// comme argument à `.ilike(field, value)` (pas comme expression `.or(...)`).
			const escaped = search.replace(/[%_\\]/g, (c) => `\\${c}`);
			const queries = SEARCH_FIELDS.map((field) =>
				buildBaseQuery()
					.ilike(field, `%${escaped}%`)
					.order(sortKey, { ascending: sortAsc })
					.range(page * pageSize, (page + 1) * pageSize - 1)
			);
			const results = await Promise.all(queries);
			const firstError = results.find((r) => r.error)?.error ?? null;
			if (firstError) return { data: [], count: 0, error: firstError };
			const seen = new Set<string>();
			const merged: LeadRow[] = [];
			for (const r of results) {
				for (const row of (r.data ?? []) as LeadRow[]) {
					if (!seen.has(row.id)) {
						seen.add(row.id);
						merged.push(row);
					}
				}
			}
			// Le count fusionné est approximé par max() : Postgres ne nous donne pas le distinct count
			// nativement via count: 'exact' sur 3 queries séparées. Acceptable car la recherche est
			// déjà restreinte (saisie utilisateur). Pagination "page suivante" peut sous-estimer 1 page max.
			const mergedCount = Math.max(...results.map((r) => r.count ?? 0));
			return { data: merged.slice(0, pageSize), count: mergedCount, error: null };
		}
		const q = buildBaseQuery()
			.order(sortKey, { ascending: sortAsc })
			.range(page * pageSize, (page + 1) * pageSize - 1);
		const r = await q;
		return { data: (r.data ?? []) as LeadRow[], count: r.count ?? 0, error: r.error };
	};

	// Indicateurs honnêtes (remplacent l'ancien funnel décoratif 4 cartes).
	// 1. Leads actifs : statut ∈ {nouveau, interesse} = ce qui reste à traiter.
	// 2. Marchés publics ouverts : SIMAP non écartés.
	// 3. Transférés ce mois : statut=transfere AND date_modification >= 1er du mois courant.
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	// Phase 2 : counts par onglet (Promise.all parallèle, 1 round-trip).
	// Filtre identique à la requête principale (cantons + statuts + showTransferred + temperatures + search)
	// pour que les badges des onglets reflètent le résultat actuel des filtres globaux.
	const buildTabCountBase = (sources: string[]) => {
		let q = locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.in('source', sources);
		if (filterCantons.length > 0) q = q.in('canton', filterCantons);
		if (filterStatuts.length > 0) q = q.in('statut', filterStatuts);
		else if (!showTransferred) q = q.neq('statut', 'transfere');
		if (filterTemperatures.length > 0) {
			const ranges: string[] = [];
			if (filterTemperatures.includes('chaud')) ranges.push('score_pertinence.gte.7');
			if (filterTemperatures.includes('tiede')) ranges.push('and(score_pertinence.gte.4,score_pertinence.lte.6)');
			if (filterTemperatures.includes('froid')) ranges.push('score_pertinence.lte.3');
			if (ranges.length > 0) q = q.or(ranges.join(','));
		}
		return q;
	};

	// V1.2 audit S160 : tab count avec recherche sécurisée (pattern S120).
	// Pour les counts on prend max(field1, field2, field3) comme proxy du distinct count.
	// Acceptable : badge onglet, pas une pagination critique.
	const runTabCount = async (sources: readonly string[]): Promise<{ count: number }> => {
		const sourcesArr = [...sources];
		if (search) {
			const escaped = search.replace(/[%_\\]/g, (c) => `\\${c}`);
			const queries = SEARCH_FIELDS.map((field) =>
				buildTabCountBase(sourcesArr).ilike(field, `%${escaped}%`)
			);
			const results = await Promise.all(queries);
			return { count: Math.max(...results.map((r) => r.count ?? 0)) };
		}
		const r = await buildTabCountBase(sourcesArr);
		return { count: r.count ?? 0 };
	};

	const [
		leadsRes,
		entreprisesRes,
		recherchesRes,
		leadsActifsRes,
		marchesOuvertsRes,
		transferresMoisRes,
		tabSimapRes,
		tabRegblRes,
		tabEntreprisesRes,
		tabTerrainRes,
	] = await Promise.all([
		runMainQuery(),
		locals.supabase
			.from('entreprises')
			.select('id, raison_sociale')
			.order('raison_sociale'),
		locals.supabase
			.from('recherches_sauvegardees')
			.select('*')
			.order('date_creation', { ascending: false }),
		locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.in('statut', ['nouveau', 'interesse']),
		locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.eq('source', 'simap')
			.neq('statut', 'ecarte'),
		locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.eq('statut', 'transfere')
			.gte('date_modification', monthStart.toISOString()),
		runTabCount(TAB_SOURCE_MAP.simap),
		runTabCount(TAB_SOURCE_MAP.regbl),
		runTabCount(TAB_SOURCE_MAP.entreprises),
		runTabCount(TAB_SOURCE_MAP.terrain),
	]);

	return {
		leads: leadsRes.data ?? [],
		totalLeads: leadsRes.count ?? 0,
		// Phase 0 : 3 indicateurs honnêtes (remplacent enrichedCount/qualifiedCount/convertedCount).
		leadsActifsCount: leadsActifsRes.count ?? 0,
		marchesOuvertsCount: marchesOuvertsRes.count ?? 0,
		transferresMoisCount: transferresMoisRes.count ?? 0,
		// Phase 2 : counts par onglet (filtres globaux appliqués).
		tabCounts: {
			simap: tabSimapRes.count ?? 0,
			regbl: tabRegblRes.count ?? 0,
			entreprises: tabEntreprisesRes.count ?? 0,
			terrain: tabTerrainRes.count ?? 0,
		},
		tab,
		page,
		pageSize,
		sort: sortKey,
		sortAsc,
		filters: { sources: filterSources, cantons: filterCantons, statuts: filterStatuts, temperatures: filterTemperatures },
		sourceFilterIncompatible,
		showTransferred,
		search,
		entreprises: entreprisesRes.data ?? [],
		recherches: recherchesRes.data ?? [],
		fromIntelligence,
		fromTerm,
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...LEAD_FIELDS]);
		const parsed = validate(LeadCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const d = parsed.data;

		// Tracabilite Veille -> Prospection (form fields optionnels, hors schema Zod).
		const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const rawFromI = (form.get('from_intelligence') as string) ?? '';
		const fromIntelligence = rawFromI && UUID_RE.test(rawFromI) ? rawFromI : null;
		const fromTerm = ((form.get('from_term') as string) ?? '').slice(0, 200) || null;

		const scoreResult = calculerScore({
			canton: d.canton || null,
			description: d.description || null,
			raison_sociale: d.raison_sociale,
			secteur_detecte: d.secteur_detecte || null,
			source: d.source,
			date_publication: d.date_publication || null,
			telephone: d.telephone || null,
			montant: d.montant != null && d.montant !== '' ? Number(d.montant) : null,
		});

		// Dedup check
		if (d.source_id) {
			const { data: existing } = await locals.supabase
				.from('prospect_leads')
				.select('id, statut')
				.eq('source', d.source)
				.eq('source_id', d.source_id)
				.maybeSingle();

			if (existing) {
				if (existing.statut === 'ecarte' || existing.statut === 'transfere') {
					return fail(400, { error: 'Ce lead a deja ete traite (ecarte ou transfere).' });
				}
				const { error } = await locals.supabase
					.from('prospect_leads')
					.update({
						raison_sociale: d.raison_sociale,
						description: d.description || null,
						montant: d.montant != null && d.montant !== '' ? Number(d.montant) : null,
						date_publication: d.date_publication || null,
						score_pertinence: scoreResult.total,
						date_modification: now(),
					})
					.eq('id', existing.id);
				return dbFail(error) ?? { success: true };
			}
		}

		const { error } = await locals.supabase.from('prospect_leads').insert({
			id: newId(),
			source: d.source,
			source_id: d.source_id || null,
			source_url: d.source_url || null,
			raison_sociale: d.raison_sociale,
			nom_contact: d.nom_contact || null,
			adresse: d.adresse || null,
			npa: d.npa || null,
			localite: d.localite || null,
			canton: d.canton || null,
			telephone: d.telephone || null,
			site_web: d.site_web || null,
			email: d.email || null,
			secteur_detecte: d.secteur_detecte || null,
			description: d.description || null,
			montant: d.montant != null && d.montant !== '' ? Number(d.montant) : null,
			date_publication: d.date_publication || null,
			score_pertinence: scoreResult.total,
			statut: 'nouveau',
			date_import: now(),
			date_modification: now(),
			source_intelligence_id: fromIntelligence,
			source_intelligence_term: fromTerm,
		});

		return dbFail(error) ?? { success: true };
	},

	updateStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(LeadUpdateStatutSchema, extractForm(form, ['id', 'statut']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('prospect_leads')
			.update({
				statut: parsed.data.statut,
				date_modification: now(),
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	batchStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const idsRaw = form.get('ids') as string;
		const statut = form.get('statut') as string;

		let ids: string[];
		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return fail(400, { error: 'IDs invalides' });
		}

		const parsed = validate(LeadBatchStatutSchema, { ids, statut });
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('prospect_leads')
			.update({
				statut: parsed.data.statut,
				date_modification: now(),
			})
			.in('id', parsed.data.ids);

		return dbFail(error) ?? { success: true };
	},

	transferer: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(LeadTransfertSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { data: lead, error: leadErr } = await locals.supabase
			.from('prospect_leads')
			.select('*')
			.eq('id', parsed.data.id)
			.single();

		if (leadErr || !lead) return fail(400, { error: 'Lead introuvable' });

		const ts = now();

		// Create entreprise
		const entrepriseId = newId();
		const { error: entErr } = await locals.supabase.from('entreprises').insert({
			id: entrepriseId,
			raison_sociale: lead.raison_sociale,
			canton: lead.canton || null,
			adresse_siege: [lead.adresse, lead.npa, lead.localite].filter(Boolean).join(', ') || null,
			numero_ide: lead.source_id || null,
			site_web: lead.site_web || null,
			secteur_activite: lead.secteur_detecte || null,
			source: `prospection (${lead.source})`,
			notes_libres: lead.description || null,
			statut_qualification: 'nouveau',
			date_import_ajout: ts,
			date_derniere_modification: ts,
		});

		const entFail = dbFail(entErr);
		if (entFail) return entFail;

		// Create contact if nom_contact available
		let contactId: string | null = null;
		if (lead.nom_contact) {
			contactId = newId();
			const { error: ctErr } = await locals.supabase.from('contacts').insert({
				id: contactId,
				nom: lead.nom_contact,
				entreprise_id: entrepriseId,
				telephone: lead.telephone || null,
				email_professionnel: lead.email || null,
				canton: lead.canton || null,
				source: `prospection (${lead.source})`,
				statut_qualification: 'nouveau',
				statut_archive: false,
				est_prescripteur: false,
				doublon_detecte: false,
				date_ajout: ts,
				date_derniere_modification: ts,
			});
			const ctFail = dbFail(ctErr);
			if (ctFail) return ctFail;
		}

		// Update lead status
		const { error: upErr } = await locals.supabase
			.from('prospect_leads')
			.update({
				statut: 'transfere',
				transfere_vers_entreprise_id: entrepriseId,
				transfere_vers_contact_id: contactId,
				date_modification: ts,
			})
			.eq('id', lead.id);

		const upFail = dbFail(upErr);
		if (upFail) return upFail;

		return { success: true, entrepriseId };
	},

	saveRecherche: async ({ request, locals }) => {
		const form = await request.formData();

		function safeJsonParse(val: FormDataEntryValue | null): unknown {
			if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
			try { return JSON.parse(val); } catch { return undefined; }
		}

		const raw: Record<string, unknown> = {
			nom: form.get('nom') as string,
			sources: safeJsonParse(form.get('sources')),
			cantons: safeJsonParse(form.get('cantons')),
			mots_cles: safeJsonParse(form.get('mots_cles')),
			temperatures: safeJsonParse(form.get('temperatures')),
			score_minimum: form.get('score_minimum') ? Number(form.get('score_minimum')) : undefined,
			alerte_active: form.get('alerte_active') === 'true',
			frequence_alerte: (form.get('frequence_alerte') as string) || 'quotidien',
		};

		const parsed = validate(RechercheCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const d = parsed.data;
		const { error } = await locals.supabase.from('recherches_sauvegardees').insert({
			id: newId(),
			nom: d.nom,
			sources: d.sources || null,
			cantons: d.cantons || null,
			mots_cles: d.mots_cles || null,
			secteurs: d.secteurs || null,
			score_minimum: d.score_minimum ?? null,
			temperatures: d.temperatures || null,
			alerte_active: d.alerte_active ?? true,
			frequence_alerte: d.frequence_alerte || 'quotidien',
			date_creation: now(),
		});

		return dbFail(error) ?? { success: true };
	},

	deleteRecherche: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(RechercheDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('recherches_sauvegardees')
			.delete()
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	createExpress: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...LEAD_EXPRESS_FIELDS]);
		const parsed = validate(LeadExpressCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const d = parsed.data;
		const raison = d.raison_sociale.trim();
		const tel = (d.telephone || '').trim();
		const contact = (d.nom_contact || '').trim();
		const notes = (d.notes || '').trim();

		// Dedup multi-passes : raison_sociale (égalité case-insensitive échappée), confronté
		// au telephone normalisé en mémoire si présent. Sans téléphone, raison sociale seule
		// suffit à signaler un doublon probable post-RDV.
		//
		// V1.6 audit S160 décision (b) match strict documenté (vs (a) préfixe + Levenshtein) :
		// préférence pour rappel modale désambiguation côté UI plutôt que matching flou côté
		// serveur. Les variantes "Vitrerie Dupont" vs "Vitrerie Dupont SA" sont gérées par
		// l'humain au moment de la création (UX explicite), pas par un score Levenshtein
		// implicite (faux positifs sur abréviations légitimes : multi-sites = même nom).
		// Garde-fou multi-sites : `force_create=1` bypasse la dedup (cf. flag dans UI).
		const telNorm = tel.replace(/[^\d]/g, '');
		const { data: candidates } = await locals.supabase
			.from('prospect_leads')
			.select('id, raison_sociale, localite, telephone')
			.ilike('raison_sociale', escapeIlike(raison))
			.limit(5);
		const force = String(form.get('force_create') || '') === '1';
		if (!force && candidates && candidates.length > 0) {
			if (telNorm.length >= 6) {
				const match = candidates.find(c => {
					const dbTel = (c.telephone || '').replace(/[^\d]/g, '');
					return dbTel.length >= 6 && (dbTel.includes(telNorm) || telNorm.includes(dbTel));
				}) ?? null;
				if (match) return { success: true, id: match.id, duplicate: true };
				// Pas de match tel mais ≥1 candidat raison sociale : laisser l'utilisateur trancher.
			}
			if (candidates.length === 1) {
				// Pas de tel utilisable + 1 seul candidat : silent redirect (ambiguïté nulle).
				return { success: true, id: candidates[0].id, duplicate: true };
			}
			// Multi-candidats sans tel discriminant : retourner la liste pour la modale.
			return fail(409, {
				ambiguous: true,
				candidates: candidates.map(c => ({
					id: c.id,
					raison_sociale: c.raison_sociale,
					localite: c.localite ?? null,
				})),
			});
		}

		const ts = now();
		const id = newId();
		const { error } = await locals.supabase.from('prospect_leads').insert({
			id,
			source: 'lead_express',
			raison_sociale: raison,
			nom_contact: contact || null,
			telephone: tel || null,
			description: notes || null,
			canton: null,
			// score_pertinence reste null jusqu'à enrichissement Zefix : évite que les
			// leads terrain soient filtrés "froid" par le filtre température (seuil ≤ 3).
			score_pertinence: null,
			statut: 'nouveau',
			date_import: ts,
			date_modification: ts,
		});

		return dbFail(error) ?? { success: true, id, duplicate: false };
	},
};
