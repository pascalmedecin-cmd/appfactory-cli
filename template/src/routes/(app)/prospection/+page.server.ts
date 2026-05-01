import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { LeadCreateSchema, LeadExpressCreateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema, LeadTransfertSchema, RechercheCreateSchema, RechercheDeleteSchema, LEAD_FIELDS, LEAD_EXPRESS_FIELDS, extractForm, validate } from '$lib/schemas';
import { calculerScore } from '$lib/scoring';
import { dbFail, escapeIlike, newId, now } from '$lib/server/db-helpers';

const PAGE_SIZE = 25;
const VALID_SORT_KEYS = ['score_pertinence', 'raison_sociale', 'canton', 'localite', 'source', 'statut', 'date_import'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);
	const sortKey = VALID_SORT_KEYS.includes(url.searchParams.get('sort') ?? '') ? url.searchParams.get('sort')! : 'score_pertinence';
	const sortAsc = url.searchParams.get('dir') === 'asc';

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

	let query = locals.supabase
		.from('prospect_leads')
		.select('*', { count: 'exact' });

	// Appliquer les filtres serveur
	if (filterSources.length > 0) query = query.in('source', filterSources);
	if (filterCantons.length > 0) query = query.in('canton', filterCantons);
	if (filterStatuts.length > 0) {
		query = query.in('statut', filterStatuts);
	} else if (!showTransferred) {
		// Filtre par défaut : on masque les leads transférés tant que le toggle est off.
		query = query.neq('statut', 'transfere');
	}
	if (filterTemperatures.length > 0) {
		const ranges: string[] = [];
		if (filterTemperatures.includes('chaud')) ranges.push('score_pertinence.gte.7');
		if (filterTemperatures.includes('tiede')) ranges.push('and(score_pertinence.gte.4,score_pertinence.lte.6)');
		if (filterTemperatures.includes('froid')) ranges.push('score_pertinence.lte.3');
		if (ranges.length > 0) query = query.or(ranges.join(','));
	}
	if (search) {
		query = query.or(`raison_sociale.ilike.%${search}%,localite.ilike.%${search}%,canton.ilike.%${search}%`);
	}

	// Tri + pagination
	query = query
		.order(sortKey, { ascending: sortAsc })
		.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

	// Indicateurs honnêtes (remplacent l'ancien funnel décoratif 4 cartes).
	// 1. Leads actifs : statut ∈ {nouveau, interesse} = ce qui reste à traiter.
	// 2. Marchés publics ouverts : SIMAP non écartés.
	// 3. Transférés ce mois : statut=transfere AND date_modification >= 1er du mois courant.
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	const [leadsRes, entreprisesRes, recherchesRes, leadsActifsRes, marchesOuvertsRes, transferresMoisRes] = await Promise.all([
		query,
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
	]);

	return {
		leads: leadsRes.data ?? [],
		totalLeads: leadsRes.count ?? 0,
		// Phase 0 : 3 indicateurs honnêtes (remplacent enrichedCount/qualifiedCount/convertedCount).
		leadsActifsCount: leadsActifsRes.count ?? 0,
		marchesOuvertsCount: marchesOuvertsRes.count ?? 0,
		transferresMoisCount: transferresMoisRes.count ?? 0,
		page,
		pageSize: PAGE_SIZE,
		sort: sortKey,
		sortAsc,
		filters: { sources: filterSources, cantons: filterCantons, statuts: filterStatuts, temperatures: filterTemperatures },
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
		const telNorm = tel.replace(/[^\d]/g, '');
		const { data: candidates } = await locals.supabase
			.from('prospect_leads')
			.select('id, telephone')
			.ilike('raison_sociale', escapeIlike(raison))
			.limit(5);
		if (candidates && candidates.length > 0) {
			let match: { id: string } | null = null;
			if (telNorm.length >= 6) {
				match = candidates.find(c => {
					const dbTel = (c.telephone || '').replace(/[^\d]/g, '');
					return dbTel.length >= 6 && (dbTel.includes(telNorm) || telNorm.includes(dbTel));
				}) ?? null;
			}
			// Fallback : tel manquant ou aucun match tel → raison sociale seule.
			if (!match) match = candidates[0];
			return { success: true, id: match.id, duplicate: true };
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
