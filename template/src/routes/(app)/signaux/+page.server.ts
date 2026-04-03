import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

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
		const now = new Date().toISOString();

		const { error } = await locals.supabase.from('signaux_affaires').insert({
			id: randomUUID(),
			type_signal: form.get('type_signal') as string || null,
			description_projet: form.get('description_projet') as string || null,
			maitre_ouvrage: form.get('maitre_ouvrage') as string || null,
			architecte_bureau: form.get('architecte_bureau') as string || null,
			canton: form.get('canton') as string || null,
			commune: form.get('commune') as string || null,
			source_officielle: form.get('source_officielle') as string || null,
			date_publication: form.get('date_publication') as string || null,
			notes_libres: form.get('notes_libres') as string || null,
			responsable_filmpro: form.get('responsable_filmpro') as string || null,
			statut_traitement: 'nouveau',
			date_detection: now,
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({
				type_signal: form.get('type_signal') as string || null,
				description_projet: form.get('description_projet') as string || null,
				maitre_ouvrage: form.get('maitre_ouvrage') as string || null,
				architecte_bureau: form.get('architecte_bureau') as string || null,
				canton: form.get('canton') as string || null,
				commune: form.get('commune') as string || null,
				source_officielle: form.get('source_officielle') as string || null,
				date_publication: form.get('date_publication') as string || null,
				notes_libres: form.get('notes_libres') as string || null,
				responsable_filmpro: form.get('responsable_filmpro') as string || null,
				statut_traitement: form.get('statut_traitement') as string || null,
			})
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	updateStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const statut = form.get('statut_traitement') as string;

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({ statut_traitement: statut })
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	createOpportunite: async ({ request, locals }) => {
		const form = await request.formData();
		const signalId = form.get('signal_id') as string;
		const now = new Date().toISOString();

		// Create opportunite linked to signal
		const oppId = randomUUID();
		const { error: oppError } = await locals.supabase.from('opportunites').insert({
			id: oppId,
			titre: form.get('titre') as string,
			entreprise_id: form.get('entreprise_id') as string || null,
			etape_pipeline: 'identification',
			signal_affaires_id: signalId,
			lie_signal_affaires: true,
			date_creation: now,
			date_derniere_modification: now,
		});

		if (oppError) return fail(400, { error: oppError.message });

		// Update signal status and link
		const { error: sigError } = await locals.supabase
			.from('signaux_affaires')
			.update({
				statut_traitement: 'converti',
				opportunite_associee_id: oppId,
			})
			.eq('id', signalId);

		if (sigError) return fail(400, { error: sigError.message });
		return { success: true, redirectTo: '/pipeline' };
	},
};
