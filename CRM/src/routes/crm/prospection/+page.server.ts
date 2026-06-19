import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { LeadCreateSchema, LeadExpressCreateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema, LeadTransfertSchema, RechercheCreateSchema, RechercheDeleteSchema, LEAD_FIELDS, LEAD_EXPRESS_FIELDS, extractForm, validate, coerceFormBoolean } from '$lib/schemas';
import { calculerScore } from '$lib/scoring';
import { dbFail, escapeIlike, newId, now } from '$lib/server/db-helpers';
import { PROSPECTION_TABS, TAB_SOURCE_MAP, VALID_SORT_KEYS, type ProspectionTabKey } from '$lib/prospection-utils';
import { isProspectionFeatureEnabled, isProspectionTabVisible, defaultProspectionTab, isProspectionSourceEnabled } from '$lib/prospection-flags';
import { getMonthlyUsage } from '$lib/server/quota';
import { googlePlacesQuotaStatus } from '$lib/api-limits';

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = new Set([25, 50, 100]);

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);
	const rawSort = url.searchParams.get('sort') ?? '';
	const sortKey = (VALID_SORT_KEYS as readonly string[]).includes(rawSort)
		? (rawSort as (typeof VALID_SORT_KEYS)[number])
		: ('score_pertinence' as const);
	const sortAsc = url.searchParams.get('dir') === 'asc';

	// Onglet actif. V5/P1 (2026-06-18) : SIMAP et RegBL sont masqués (sources coupées par flag).
	// Le défaut ET le fallback pointent sur le premier onglet VISIBLE (plus 'simap', sinon écran
	// fantôme). Garde de route : un ?tab= explicite vers un onglet masqué/inconnu redirige (303)
	// vers l'URL canonique du défaut. Comme la cible est toujours un onglet visible, pas de boucle.
	const fallbackTab = defaultProspectionTab();
	const requestedTab = url.searchParams.get('tab');
	const rawTab = requestedTab ?? fallbackTab;
	const tab: ProspectionTabKey =
		(PROSPECTION_TABS as readonly string[]).includes(rawTab) && isProspectionTabVisible(rawTab as ProspectionTabKey)
			? (rawTab as ProspectionTabKey)
			: fallbackTab;
	if (requestedTab !== null && requestedTab !== tab) {
		const target = new URL(url);
		target.searchParams.set('tab', tab);
		throw redirect(303, target.pathname + target.search);
	}

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
		gpUsedRaw,
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
		// P2 : usage quota Google du mois (lecture seule), uniquement si la source est active.
		isProspectionSourceEnabled('google_places')
			? getMonthlyUsage(locals.supabase, 'google_places')
			: Promise.resolve(null),
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
		// P2 (2026-06-18) : statut quota Google Places exposé à la page (compteur « X/900 restantes
		// ce mois », seuils 80/95 %). null si la source est coupée. Foundation pour la carte Google P3.
		googlePlacesQuota: gpUsedRaw === null ? null : googlePlacesQuotaStatus(gpUsedRaw),
		page,
		pageSize,
		sort: sortKey,
		sortAsc,
		filters: { sources: filterSources, cantons: filterCantons, statuts: filterStatuts, temperatures: filterTemperatures },
		sourceFilterIncompatible,
		showTransferred,
		search,
		entreprises: entreprisesRes.data ?? [],
		// V5 (2026-06-07) : recherches sauvegardées coupées → liste vide côté UI (masque les
		// boutons « Mes recherches » et le panneau, sans supprimer la table). Réversible via
		// `config.prospection.features.savedSearches`.
		recherches: isProspectionFeatureEnabled('savedSearches') ? (recherchesRes.data ?? []) : [],
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

		// Audit 360 V2b H-10 : transfert atomique via RPC plpgsql
		// `transfer_lead_to_crm` (migration 20260510_007). Rollback automatique
		// si l'un des INSERT/UPDATE échoue (transaction implicite Postgres).
		// Avant le fix : 3 INSERT/UPDATE séquentiels en JS = état partiel
		// corrompu (entreprise sans contact, ou orphelins) si erreur en cours.
		// Cast `as never` : la fonction RPC est créée par migration 20260510_007 ;
		// les types Database générés ne la connaissent pas encore. Tracé pour
		// regen post-merge (prochaine génération `supabase gen types`).
		const { data, error: rpcErr } = await locals.supabase.rpc(
			'transfer_lead_to_crm' as never,
			{ p_lead_id: parsed.data.id } as never
		);

		if (rpcErr) {
			// P0002 = lead_introuvable.
			if (rpcErr.code === 'P0002') return fail(400, { error: 'Lead introuvable' });
			// P0001 = lead_already_transferred (audit V2b bug-hunter F2 fix).
			if (rpcErr.code === 'P0001') {
				return fail(409, { error: 'Lead déjà transféré dans le CRM' });
			}
			console.error('[transferer] RPC transfer_lead_to_crm failed:', rpcErr.message);
			return fail(500, { error: 'Erreur lors du transfert (transaction annulée)' });
		}

		const result = data as { entreprise_id?: string; contact_id?: string | null } | null;
		if (!result?.entreprise_id) {
			return fail(500, { error: 'Réponse RPC invalide' });
		}

		return { success: true, entrepriseId: result.entreprise_id };
	},

	saveRecherche: async ({ request, locals }) => {
		// V5 (2026-06-07) : recherches sauvegardées (acquisition de masse) désactivées.
		// Gate serveur (defense-in-depth, l'UI masque déjà l'entrée). Réversible via
		// `config.prospection.features.savedSearches`.
		if (!isProspectionFeatureEnabled('savedSearches')) {
			return fail(403, { success: false as const, error: 'Recherches sauvegardées désactivées (recentrage Prospection V5).' });
		}
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
			alerte_active: coerceFormBoolean(form.get('alerte_active')),
			frequence_alerte: (form.get('frequence_alerte') as string) || 'quotidien',
		};

		const parsed = validate(RechercheCreateSchema, raw);
		// Audit 360 H-14 : ActionResult discriminated union (`success: true|false`).
		if (!parsed.success) return fail(400, { success: false as const, error: parsed.error });

		const d = parsed.data;
		// Spec google-places-2026-05-12 A5 : Google Places est une source payante — interdit
		// dans les recherches/alertes rejouables automatiquement (garde-fou budget). Import manuel only.
		if (Array.isArray(d.sources) && d.sources.includes('google_places')) {
			return fail(400, {
				success: false as const,
				error: 'Google Places ne peut pas être enregistré dans une recherche ou une alerte automatique (source payante — import manuel uniquement).',
			});
		}
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

		return dbFail(error) ?? { success: true as const };
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

	// Audit 360 H-14 : ActionResult discriminated union (`success: true|false`).
	// Cas spécial `{ambiguous, candidates}` (multi-candidats sans tel) reste hors
	// ActionResult car le frontend `LeadExpressForm.svelte` consomme un 3e shape
	// dédié pour ouvrir la modale de désambiguïsation.
	createExpress: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...LEAD_EXPRESS_FIELDS]);
		const parsed = validate(LeadExpressCreateSchema, raw);
		if (!parsed.success) return fail(400, { success: false as const, error: parsed.error });

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
				if (match) return { success: true as const, id: match.id, duplicate: true };
				// Pas de match tel mais ≥1 candidat raison sociale : laisser l'utilisateur trancher.
			}
			if (candidates.length === 1) {
				// Pas de tel utilisable + 1 seul candidat : silent redirect (ambiguïté nulle).
				return { success: true as const, id: candidates[0].id, duplicate: true };
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

		return dbFail(error) ?? { success: true as const, id, duplicate: false };
	},
};
