import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { LeadCreateSchema, LeadExpressCreateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema, LeadMarkForContactSchema, RechercheCreateSchema, RechercheDeleteSchema, LEAD_FIELDS, LEAD_EXPRESS_FIELDS, extractForm, validate, coerceFormBoolean } from '$lib/schemas';
import { calculerScore } from '$lib/scoring';
import { dbFail, escapeIlike, newId, now } from '$lib/server/db-helpers';
import { TAB_SOURCE_MAP } from '$lib/prospection-utils';
import { isProspectionFeatureEnabled, isProspectionSourceEnabled } from '$lib/prospection-flags';
import { parseProspectionFilter, applyProspectionFilters, applyProspectionScopeFilters, applyCampagneLeadFilter, resolveCampagneLeadIds, PROSPECTION_SEARCH_FIELDS, prospectionSearchPattern } from '$lib/server/prospection-query';
import { listCampagnes, fetchCampagnesByLead, type CampagneWithCount, type Campagne } from '$lib/server/campagnes';
import { getMonthlyUsage } from '$lib/server/quota';
import { googlePlacesQuotaStatus } from '$lib/api-limits';

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = new Set([25, 50, 100]);

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);

	// Filtre normalisé partagé avec l'export CSV et la sélection globale (source unique
	// `$lib/server/prospection-query` — la dette des 3 filtres dupliqués est résorbée).
	const filter = parseProspectionFilter(url, locals.marque);

	// Vague 3.2 (flag ffCrmListesV2, hérité du layout racine) : le module Campagnes ne charge
	// rien quand le flag est OFF -> payload byte-identique à l'existant. Le filtre relationnel
	// `?campagne` s'applique côté requête (cf. plus bas), uniforme avec export/all-ids.
	const { featureFlags } = await parent();
	const premium = featureFlags?.ffCrmListesV2 === true;

	// Filtre campagne (relation N-N) : résolu UNE fois en lead_ids, appliqué via `.in('id', ...)`
	// sur la query principale ET les compteurs d'onglet (cohérent avec les autres filtres de
	// portée). `null` = pas de filtre campagne ; `[]` = filtre actif sans aucun lead -> vue vide.
	const campagneRestrictIds = await resolveCampagneLeadIds(locals.supabase, filter);
	const campagneFilterEmpty = campagneRestrictIds !== null && campagneRestrictIds.length === 0;

	// Onglet actif. V5/P1 : SIMAP et RegBL sont masqués (sources coupées par flag) ;
	// `parseProspectionFilter` retombe sur le premier onglet visible. Garde de route :
	// un ?tab= explicite vers un onglet masqué/inconnu redirige (303) vers l'URL canonique
	// du défaut. Comme la cible est toujours un onglet visible, pas de boucle.
	const requestedTab = url.searchParams.get('tab');
	if (requestedTab !== null && requestedTab !== filter.tab) {
		const target = new URL(url);
		target.searchParams.set('tab', filter.tab);
		throw redirect(303, target.pathname + target.search);
	}

	// Phase 2 : entrées par page configurable, whitelist stricte (anti-DOS via URL).
	const rawPerPage = parseInt(url.searchParams.get('perPage') ?? '', 10);
	const pageSize = ALLOWED_PAGE_SIZES.has(rawPerPage) ? rawPerPage : DEFAULT_PAGE_SIZE;

	// Tracabilite Veille -> Prospection : propagee depuis /veille/[id] via URL.
	// UUID = tracable vers intelligence_reports, term = libre (max 200).
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const rawFromIntelligence = url.searchParams.get('from_intelligence');
	const fromIntelligence = rawFromIntelligence && UUID_RE.test(rawFromIntelligence) ? rawFromIntelligence : null;
	const fromTerm = (url.searchParams.get('from_term') ?? '').slice(0, 200) || null;

	// Query principale : filtre partagé (source onglet + canton/statut/transférés/température).
	// La recherche reste un pattern sûr (3 .ilike() en parallèle + Set dédup, pas de mini-DSL
	// .or() interpolé, cf. memory/feedback_postgrest_or_filter_injection.md).
	const buildBaseQuery = () =>
		applyCampagneLeadFilter(
			// marque appliquée par applyProspectionScopeFilters (via filter.marque) - couvre aussi export/all-ids.
			applyProspectionFilters(locals.supabase.from('prospect_leads').select('*', { count: 'exact' }), filter),
			campagneRestrictIds,
		);

	// Type ligne : on récupère le type produit par Supabase (Database.public.prospect_leads.Row).
	// Awaited<ReturnType<typeof buildBaseQuery>>['data'] = LeadRow[] | null typé strict.
	type LeadRow = NonNullable<Awaited<ReturnType<typeof buildBaseQuery>>['data']>[number];

	const runMainQuery = async (): Promise<{ data: LeadRow[]; count: number; error: { message: string } | null }> => {
		if (filter.sourceFilterIncompatible || campagneFilterEmpty) {
			return { data: [], count: 0, error: null };
		}
		if (filter.search) {
			// Recherche sûre : 3 .ilike() en parallèle + Set dédup. La valeur est passée comme
			// argument à `.ilike(field, value)` (wildcards échappés), jamais comme expression `.or(...)`.
			const pattern = prospectionSearchPattern(filter.search);
			const queries = PROSPECTION_SEARCH_FIELDS.map((field) =>
				buildBaseQuery()
					.ilike(field, pattern)
					.order(filter.sortKey, { ascending: filter.sortAsc })
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
			.order(filter.sortKey, { ascending: filter.sortAsc })
			.range(page * pageSize, (page + 1) * pageSize - 1);
		const r = await q;
		return { data: (r.data ?? []) as LeadRow[], count: r.count ?? 0, error: r.error };
	};

	// Indicateurs honnêtes (remplacent l'ancien funnel décoratif 4 cartes).
	// 1. Leads actifs : statut ∈ {vide, a_contacter} = à trier + au pipeline.
	// 2. Marchés publics ouverts : SIMAP non écartés.
	// 3. Transférés ce mois : statut=transfere AND date_modification >= 1er du mois courant.
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	// Phase 2 : counts par onglet (Promise.all parallèle, 1 round-trip).
	// Filtre identique à la requête principale (cantons + statuts + showTransferred + temperatures + search)
	// pour que les badges des onglets reflètent le résultat actuel des filtres globaux.
	// Compteur par onglet : source = celle de l'onglet compté (pas l'onglet actif) + les
	// mêmes filtres de portée (canton/statut/transférés/température) que la vue, via le helper
	// partagé. Les badges reflètent ainsi le résultat des filtres globaux.
	const buildTabCountBase = (sources: readonly string[]) =>
		applyCampagneLeadFilter(
			applyProspectionScopeFilters(
				// marque appliquée par applyProspectionScopeFilters (via filter.marque).
				locals.supabase.from('prospect_leads').select('*', { count: 'exact', head: true }).in('source', [...sources]),
				filter,
			),
			campagneRestrictIds,
		);

	// V1.2 audit S160 : tab count avec recherche sécurisée (pattern S120).
	// Pour les counts on prend max(field1, field2, field3) comme proxy du distinct count.
	// Acceptable : badge onglet, pas une pagination critique.
	const runTabCount = async (sources: readonly string[]): Promise<{ count: number }> => {
		if (campagneFilterEmpty) return { count: 0 };
		if (filter.search) {
			const pattern = prospectionSearchPattern(filter.search);
			const queries = PROSPECTION_SEARCH_FIELDS.map((field) =>
				buildTabCountBase(sources).ilike(field, pattern)
			);
			const results = await Promise.all(queries);
			return { count: Math.max(...results.map((r) => r.count ?? 0)) };
		}
		const r = await buildTabCountBase(sources);
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
		campagnesListRes,
	] = await Promise.all([
		runMainQuery(),
		locals.supabase
			.from('entreprises')
			.select('id, raison_sociale')
			.eq('marque', locals.marque)
			.order('raison_sociale'),
		locals.supabase
			.from('recherches_sauvegardees')
			.select('*')
			.eq('marque', locals.marque)
			.order('date_creation', { ascending: false }),
		locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.eq('marque', locals.marque)
			.in('statut', ['vide', 'a_contacter']),
		locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.eq('marque', locals.marque)
			.eq('source', 'simap')
			.neq('statut', 'ecarte'),
		locals.supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.eq('marque', locals.marque)
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
		// Vague 3.2 : campagnes actives (filtre + combos), uniquement en premium (sinon vide).
		premium
			? listCampagnes(locals.supabase, locals.marque, { includeArchived: false })
			: Promise.resolve({ data: [] as CampagneWithCount[], error: null }),
	]);

	// Vague 3.2 : campagnes par lead pour la page courante (multi-pastilles colonne + fiche).
	// 1 requête sur la jonction, uniquement en premium et s'il reste des leads affichés.
	const campagnesByLead: Record<string, Campagne[]> = {};
	const campagnesList: CampagneWithCount[] = premium ? (campagnesListRes.data ?? []) : [];
	if (premium) {
		const leadIds = (leadsRes.data ?? []).map((l) => l.id);
		if (leadIds.length > 0) {
			const byLead = await fetchCampagnesByLead(locals.supabase, locals.marque, leadIds);
			for (const [leadId, list] of byLead) campagnesByLead[leadId] = list;
		}
	}

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
		tab: filter.tab,
		// P2 (2026-06-18) : statut quota Google Places exposé à la page (compteur « X/900 restantes
		// ce mois », seuils 80/95 %). null si la source est coupée. Foundation pour la carte Google P3.
		googlePlacesQuota: gpUsedRaw === null ? null : googlePlacesQuotaStatus(gpUsedRaw),
		page,
		pageSize,
		sort: filter.sortKey,
		sortAsc: filter.sortAsc,
		filters: { sources: filter.filterSources, cantons: filter.filterCantons, statuts: filter.filterStatuts, campagnes: filter.filterCampagnes },
		// Vague 3.2 (premium uniquement, sinon vides -> rendu OFF byte-identique).
		campagnes: campagnesList,
		campagnesByLead,
		sourceFilterIncompatible: filter.sourceFilterIncompatible,
		showDismissed: filter.showDismissed,
		search: filter.search,
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
				.eq('marque', locals.marque)
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
			marque: locals.marque,
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
			statut: 'vide',
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

	// Lot 2 : « À contacter » — le prospect entre au pipeline. RPC atomique qui passe
	// le statut à a_contacter ET crée l'opportunité d'entrée (étape identification).
	// Le prospect disparaît ensuite de la file de prospection (filtre de portée).
	markForContact: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(LeadMarkForContactSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		// Cast `as never` : RPC créée par migration 20260701000002, pas encore dans les types.
		const { data, error: rpcErr } = await locals.supabase.rpc(
			'mark_lead_for_contact' as never,
			{ p_lead_id: parsed.data.id } as never
		);

		if (rpcErr) {
			const code = (rpcErr as { code?: string }).code;
			if (code === 'P0002') return fail(400, { error: 'Prospect introuvable' });
			// P0001 = lead déjà écarté / converti (non ré-activable via ce chemin).
			if (code === 'P0001') return fail(409, { error: 'Prospect déjà traité' });
			console.error('[markForContact] RPC mark_lead_for_contact failed:', rpcErr.message);
			return fail(500, { error: 'Erreur lors du passage au pipeline' });
		}

		const result = data as { opportunite_id?: string; created?: boolean } | null;
		return { success: true, opportuniteId: result?.opportunite_id ?? null };
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
			.eq('marque', locals.marque)
			.in('id', parsed.data.ids);

		return dbFail(error) ?? { success: true };
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
			marque: locals.marque,
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
			.eq('marque', locals.marque)
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
			marque: locals.marque,
			source: 'lead_express',
			raison_sociale: raison,
			nom_contact: contact || null,
			telephone: tel || null,
			description: notes || null,
			canton: null,
			// score_pertinence reste null jusqu'à enrichissement Zefix : évite que les
			// leads terrain soient filtrés "froid" par le filtre température (seuil ≤ 3).
			score_pertinence: null,
			statut: 'vide',
			date_import: ts,
			date_modification: ts,
		});

		return dbFail(error) ?? { success: true as const, id, duplicate: false };
	},
};
