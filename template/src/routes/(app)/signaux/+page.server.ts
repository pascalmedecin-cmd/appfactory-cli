import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { SignalCreateSchema, SignalUpdateSchema, SignalUpdateStatutSchema, SignalCreateOpportuniteSchema, extractForm, validate } from '$lib/schemas';

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

const SIGNAL_FIELDS = [
	'type_signal', 'description_projet', 'maitre_ouvrage', 'architecte_bureau',
	'canton', 'commune', 'source_officielle', 'date_publication', 'notes_libres', 'responsable_filmpro',
];

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, SIGNAL_FIELDS);
		const parsed = validate(SignalCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const now = new Date().toISOString();
		const { error } = await locals.supabase.from('signaux_affaires').insert({
			id: randomUUID(),
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
			date_detection: now,
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
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

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	updateStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalUpdateStatutSchema, extractForm(form, ['id', 'statut_traitement']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({ statut_traitement: parsed.data.statut_traitement })
			.eq('id', parsed.data.id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	createOpportunite: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalCreateOpportuniteSchema, extractForm(form, ['signal_id', 'titre', 'entreprise_id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const now = new Date().toISOString();
		const oppId = randomUUID();
		const { error: oppError } = await locals.supabase.from('opportunites').insert({
			id: oppId,
			titre: parsed.data.titre,
			entreprise_id: parsed.data.entreprise_id || null,
			etape_pipeline: 'identification',
			signal_affaires_id: parsed.data.signal_id,
			lie_signal_affaires: true,
			date_creation: now,
			date_derniere_modification: now,
		});

		if (oppError) return fail(400, { error: oppError.message });

		const { error: sigError } = await locals.supabase
			.from('signaux_affaires')
			.update({
				statut_traitement: 'converti',
				opportunite_associee_id: oppId,
			})
			.eq('id', parsed.data.signal_id);

		if (sigError) return fail(400, { error: sigError.message });
		return { success: true, redirectTo: '/pipeline' };
	},
};
