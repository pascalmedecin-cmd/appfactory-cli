import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	const [oppsRes, contactsRes, entreprisesRes] = await Promise.all([
		locals.supabase
			.from('opportunites')
			.select('*, contacts(id, nom, prenom), entreprises(id, raison_sociale), signaux_affaires(id, type_signal, description_projet)')
			.order('date_derniere_modification', { ascending: false }),
		locals.supabase
			.from('contacts')
			.select('id, nom, prenom')
			.eq('statut_archive', false)
			.order('nom'),
		locals.supabase
			.from('entreprises')
			.select('id, raison_sociale')
			.order('raison_sociale'),
	]);

	return {
		opportunites: oppsRes.data ?? [],
		contacts: contactsRes.data ?? [],
		entreprises: entreprisesRes.data ?? [],
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const now = new Date().toISOString();

		const { error } = await locals.supabase.from('opportunites').insert({
			id: randomUUID(),
			titre: form.get('titre') as string,
			contact_id: form.get('contact_id') as string || null,
			entreprise_id: form.get('entreprise_id') as string || null,
			montant_estime: form.get('montant_estime') ? Number(form.get('montant_estime')) : null,
			etape_pipeline: form.get('etape_pipeline') as string || 'identification',
			date_relance_prevue: form.get('date_relance_prevue') as string || null,
			notes_libres: form.get('notes_libres') as string || null,
			responsable: form.get('responsable') as string || null,
			signal_affaires_id: form.get('signal_affaires_id') as string || null,
			lie_signal_affaires: !!(form.get('signal_affaires_id')),
			date_creation: now,
			date_derniere_modification: now,
		});

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;

		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				titre: form.get('titre') as string,
				contact_id: form.get('contact_id') as string || null,
				entreprise_id: form.get('entreprise_id') as string || null,
				montant_estime: form.get('montant_estime') ? Number(form.get('montant_estime')) : null,
				etape_pipeline: form.get('etape_pipeline') as string || null,
				date_relance_prevue: form.get('date_relance_prevue') as string || null,
				notes_libres: form.get('notes_libres') as string || null,
				responsable: form.get('responsable') as string || null,
				date_derniere_modification: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	move: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const etape = form.get('etape_pipeline') as string;

		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				etape_pipeline: etape,
				date_derniere_modification: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const motif = form.get('motif_perte') as string || null;

		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				etape_pipeline: 'perdu',
				motif_perte: motif,
				date_cloture_effective: new Date().toISOString(),
				date_derniere_modification: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) return fail(400, { error: error.message });
		return { success: true };
	},
};
