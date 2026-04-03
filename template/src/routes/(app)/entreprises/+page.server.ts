import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: entreprises, error } = await locals.supabase
		.from('entreprises')
		.select('*')
		.order('date_derniere_modification', { ascending: false });

	if (error) {
		console.error('Erreur chargement entreprises:', error.message);
		return { entreprises: [], contacts: [] };
	}

	const { data: contacts } = await locals.supabase
		.from('contacts')
		.select('id, nom, prenom, role_fonction, entreprise_id, email_professionnel, telephone')
		.eq('statut_archive', false);

	return { entreprises: entreprises ?? [], contacts: contacts ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const now = new Date().toISOString();

		const { error } = await locals.supabase.from('entreprises').insert({
			id: randomUUID(),
			raison_sociale: form.get('raison_sociale') as string,
			secteur_activite: form.get('secteur_activite') as string || null,
			canton: form.get('canton') as string || null,
			taille_estimee: form.get('taille_estimee') as string || null,
			site_web: form.get('site_web') as string || null,
			numero_ide: form.get('numero_ide') as string || null,
			adresse_siege: form.get('adresse_siege') as string || null,
			segment_cible: form.get('segment_cible') as string || null,
			source: form.get('source') as string || null,
			notes_libres: form.get('notes_libres') as string || null,
			tags: form.get('tags') as string || null,
			statut_qualification: 'nouveau',
			date_import_ajout: now,
			date_derniere_modification: now,
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;

		const { error } = await locals.supabase
			.from('entreprises')
			.update({
				raison_sociale: form.get('raison_sociale') as string,
				secteur_activite: form.get('secteur_activite') as string || null,
				canton: form.get('canton') as string || null,
				taille_estimee: form.get('taille_estimee') as string || null,
				site_web: form.get('site_web') as string || null,
				numero_ide: form.get('numero_ide') as string || null,
				adresse_siege: form.get('adresse_siege') as string || null,
				segment_cible: form.get('segment_cible') as string || null,
				source: form.get('source') as string || null,
				notes_libres: form.get('notes_libres') as string || null,
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
			.from('entreprises')
			.delete()
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},
};
