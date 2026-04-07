import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { SignalCreateSchema, SignalUpdateSchema, SignalUpdateStatutSchema, SignalDeleteSchema, SignalCreateOpportuniteSchema, SIGNAL_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: signaux, error } = await locals.supabase
		.from('signaux_affaires')
		.select('*, contacts:contact_maitre_ouvrage_id(id, nom, prenom)')
		.order('date_detection', { ascending: false });

	if (error) {
		console.error('Erreur chargement signaux:', error.message);
		return { signaux: [] };
	}

	return { signaux: signaux ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...SIGNAL_FIELDS]);
		const parsed = validate(SignalCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase.from('signaux_affaires').insert({
			id: newId(),
			type_signal: parsed.data.type_signal || null,
			description_projet: parsed.data.description_projet || null,
			maitre_ouvrage: parsed.data.maitre_ouvrage || null,
			architecte_bureau: parsed.data.architecte_bureau || null,
			canton: parsed.data.canton || null,
			commune: parsed.data.commune || null,
			source_officielle: parsed.data.source_officielle || null,
			date_publication: parsed.data.date_publication || null,
			notes_libres: parsed.data.notes_libres || null,
			responsable_filmpro: parsed.data.responsable_filmpro || null,
			statut_traitement: 'nouveau',
			date_detection: now(),
		});

		return dbFail(error) ?? { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...SIGNAL_FIELDS, 'statut_traitement']);
		const parsed = validate(SignalUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({
				type_signal: parsed.data.type_signal || null,
				description_projet: parsed.data.description_projet || null,
				maitre_ouvrage: parsed.data.maitre_ouvrage || null,
				architecte_bureau: parsed.data.architecte_bureau || null,
				canton: parsed.data.canton || null,
				commune: parsed.data.commune || null,
				source_officielle: parsed.data.source_officielle || null,
				date_publication: parsed.data.date_publication || null,
				notes_libres: parsed.data.notes_libres || null,
				responsable_filmpro: parsed.data.responsable_filmpro || null,
				statut_traitement: parsed.data.statut_traitement || null,
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	updateStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalUpdateStatutSchema, extractForm(form, ['id', 'statut_traitement']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({ statut_traitement: parsed.data.statut_traitement })
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.delete()
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	createOpportunite: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalCreateOpportuniteSchema, extractForm(form, ['signal_id', 'titre', 'entreprise_id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const ts = now();
		const oppId = newId();
		const { error: oppError } = await locals.supabase.from('opportunites').insert({
			id: oppId,
			titre: parsed.data.titre,
			entreprise_id: parsed.data.entreprise_id || null,
			etape_pipeline: 'identification',
			signal_affaires_id: parsed.data.signal_id,
			lie_signal_affaires: true,
			date_creation: ts,
			date_derniere_modification: ts,
		});

		const oppFail = dbFail(oppError);
		if (oppFail) return oppFail;

		const { error: sigError } = await locals.supabase
			.from('signaux_affaires')
			.update({
				statut_traitement: 'converti',
				opportunite_associee_id: oppId,
			})
			.eq('id', parsed.data.signal_id);

		const sigFail = dbFail(sigError);
		if (sigFail) return sigFail;

		return { success: true, redirectTo: '/pipeline' };
	},
};
