import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { LeadCreateSchema, LeadUpdateStatutSchema, LeadBatchStatutSchema, LeadTransfertSchema, RechercheCreateSchema, RechercheDeleteSchema, extractForm, validate } from '$lib/schemas';
import { calculerScore } from '$lib/scoring';

export const load: PageServerLoad = async ({ locals }) => {
	const [leadsRes, entreprisesRes, recherchesRes] = await Promise.all([
		locals.supabase
			.from('prospect_leads')
			.select('*')
			.order('score_pertinence', { ascending: false }),
		locals.supabase
			.from('entreprises')
			.select('id, raison_sociale')
			.order('raison_sociale'),
		locals.supabase
			.from('recherches_sauvegardees')
			.select('*')
			.order('date_creation', { ascending: false }),
	]);

	return {
		leads: leadsRes.data ?? [],
		entreprises: entreprisesRes.data ?? [],
		recherches: recherchesRes.data ?? [],
	};
};

const LEAD_FIELDS = [
	'source', 'source_id', 'source_url', 'raison_sociale', 'nom_contact',
	'adresse', 'npa', 'localite', 'canton', 'telephone', 'site_web', 'email',
	'secteur_detecte', 'description', 'montant', 'date_publication',
];

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, LEAD_FIELDS);
		const parsed = validate(LeadCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const d = parsed.data;

		// Scoring
		const scoreResult = calculerScore({
			canton: d.canton || null,
			description: d.description || null,
			raison_sociale: d.raison_sociale,
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
				// Update existing
				const { error } = await locals.supabase
					.from('prospect_leads')
					.update({
						raison_sociale: d.raison_sociale,
						description: d.description || null,
						montant: d.montant != null && d.montant !== '' ? Number(d.montant) : null,
						date_publication: d.date_publication || null,
						score_pertinence: scoreResult.total,
						date_modification: new Date().toISOString(),
					})
					.eq('id', existing.id);
				if (error) return fail(400, { error: error.message });
				return { success: true };
			}
		}

		const { error } = await locals.supabase.from('prospect_leads').insert({
			id: randomUUID(),
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
			date_import: new Date().toISOString(),
			date_modification: new Date().toISOString(),
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	updateStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(LeadUpdateStatutSchema, extractForm(form, ['id', 'statut']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('prospect_leads')
			.update({
				statut: parsed.data.statut,
				date_modification: new Date().toISOString(),
			})
			.eq('id', parsed.data.id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
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
				date_modification: new Date().toISOString(),
			})
			.in('id', parsed.data.ids);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	transferer: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(LeadTransfertSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		// Get lead data
		const { data: lead, error: leadErr } = await locals.supabase
			.from('prospect_leads')
			.select('*')
			.eq('id', parsed.data.id)
			.single();

		if (leadErr || !lead) return fail(400, { error: 'Lead introuvable' });

		const now = new Date().toISOString();

		// Create entreprise
		const entrepriseId = randomUUID();
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
			date_import_ajout: now,
			date_derniere_modification: now,
		});

		if (entErr) return fail(400, { error: entErr.message });

		// Create contact if nom_contact available
		let contactId: string | null = null;
		if (lead.nom_contact) {
			contactId = randomUUID();
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
				date_ajout: now,
				date_derniere_modification: now,
			});
			if (ctErr) return fail(400, { error: ctErr.message });
		}

		// Update lead status
		const { error: upErr } = await locals.supabase
			.from('prospect_leads')
			.update({
				statut: 'transfere',
				transfere_vers_entreprise_id: entrepriseId,
				transfere_vers_contact_id: contactId,
				date_modification: now,
			})
			.eq('id', lead.id);

		if (upErr) return fail(400, { error: upErr.message });
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
			score_minimum: form.get('score_minimum') ? Number(form.get('score_minimum')) : undefined,
			alerte_active: form.get('alerte_active') === 'true',
			frequence_alerte: (form.get('frequence_alerte') as string) || 'quotidien',
		};

		const parsed = validate(RechercheCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const d = parsed.data;
		const { error } = await locals.supabase.from('recherches_sauvegardees').insert({
			id: randomUUID(),
			nom: d.nom,
			sources: d.sources || null,
			cantons: d.cantons || null,
			mots_cles: d.mots_cles || null,
			secteurs: d.secteurs || null,
			score_minimum: d.score_minimum ?? null,
			alerte_active: d.alerte_active ?? true,
			frequence_alerte: d.frequence_alerte || 'quotidien',
			date_creation: new Date().toISOString(),
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	deleteRecherche: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(RechercheDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('recherches_sauvegardees')
			.delete()
			.eq('id', parsed.data.id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},
};
