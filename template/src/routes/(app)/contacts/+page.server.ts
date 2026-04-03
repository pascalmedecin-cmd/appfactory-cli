import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: contacts, error } = await locals.supabase
		.from('contacts')
		.select('*, entreprises(raison_sociale)')
		.eq('statut_archive', false)
		.order('date_derniere_modification', { ascending: false });

	if (error) {
		console.error('Erreur chargement contacts:', error.message);
		return { contacts: [] };
	}

	return { contacts: contacts ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const now = new Date().toISOString();

		const { error } = await locals.supabase.from('contacts').insert({
			id: randomUUID(),
			nom: form.get('nom') as string || null,
			prenom: form.get('prenom') as string || null,
			email_professionnel: form.get('email_professionnel') as string || null,
			telephone: form.get('telephone') as string || null,
			role_fonction: form.get('role_fonction') as string || null,
			entreprise_id: form.get('entreprise_id') as string || null,
			canton: form.get('canton') as string || null,
			segment: form.get('segment') as string || null,
			source: form.get('source') as string || null,
			notes_libres: form.get('notes_libres') as string || null,
			adresse: form.get('adresse') as string || null,
			tags: form.get('tags') as string || null,
			statut_qualification: 'nouveau',
			statut_archive: false,
			est_prescripteur: false,
			doublon_detecte: false,
			date_ajout: now,
			date_derniere_modification: now,
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;

		const { error } = await locals.supabase
			.from('contacts')
			.update({
				nom: form.get('nom') as string || null,
				prenom: form.get('prenom') as string || null,
				email_professionnel: form.get('email_professionnel') as string || null,
				telephone: form.get('telephone') as string || null,
				role_fonction: form.get('role_fonction') as string || null,
				entreprise_id: form.get('entreprise_id') as string || null,
				canton: form.get('canton') as string || null,
				segment: form.get('segment') as string || null,
				source: form.get('source') as string || null,
				notes_libres: form.get('notes_libres') as string || null,
				adresse: form.get('adresse') as string || null,
				tags: form.get('tags') as string || null,
				date_derniere_modification: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;

		const { error } = await locals.supabase
			.from('contacts')
			.update({ statut_archive: true, date_derniere_modification: new Date().toISOString() })
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},
};
