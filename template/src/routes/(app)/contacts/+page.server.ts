import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema, extractForm, validate } from '$lib/schemas';

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

const CONTACT_FIELDS = [
	'nom', 'prenom', 'email_professionnel', 'telephone', 'role_fonction',
	'entreprise_id', 'canton', 'segment', 'source', 'notes_libres', 'adresse', 'tags',
];

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, CONTACT_FIELDS);
		const parsed = validate(ContactCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const now = new Date().toISOString();
		const { error } = await locals.supabase.from('contacts').insert({
			id: randomUUID(),
			nom: parsed.data.nom,
			prenom: parsed.data.prenom || null,
			email_professionnel: parsed.data.email_professionnel || null,
			telephone: parsed.data.telephone || null,
			role_fonction: parsed.data.role_fonction || null,
			entreprise_id: parsed.data.entreprise_id || null,
			canton: parsed.data.canton || null,
			segment: parsed.data.segment || null,
			source: parsed.data.source || null,
			notes_libres: parsed.data.notes_libres || null,
			adresse: parsed.data.adresse || null,
			tags: parsed.data.tags || null,
			statut_qualification: 'nouveau',
			statut_archive: false,
			est_prescripteur: false,
			doublon_detecte: false,
			date_ajout: now,
			date_derniere_modification: now,
		});

		if (error) { console.error('Supabase error:', error.message); return fail(400, { error: 'Erreur lors de l\'operation' }); }
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...CONTACT_FIELDS]);
		const parsed = validate(ContactUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('contacts')
			.update({
				nom: parsed.data.nom,
				prenom: parsed.data.prenom || null,
				email_professionnel: parsed.data.email_professionnel || null,
				telephone: parsed.data.telephone || null,
				role_fonction: parsed.data.role_fonction || null,
				entreprise_id: parsed.data.entreprise_id || null,
				canton: parsed.data.canton || null,
				segment: parsed.data.segment || null,
				source: parsed.data.source || null,
				notes_libres: parsed.data.notes_libres || null,
				adresse: parsed.data.adresse || null,
				tags: parsed.data.tags || null,
				date_derniere_modification: new Date().toISOString(),
			})
			.eq('id', parsed.data.id);

		if (error) { console.error('Supabase error:', error.message); return fail(400, { error: 'Erreur lors de l\'operation' }); }
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(ContactDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('contacts')
			.update({ statut_archive: true, date_derniere_modification: new Date().toISOString() })
			.eq('id', parsed.data.id);

		if (error) { console.error('Supabase error:', error.message); return fail(400, { error: 'Erreur lors de l\'operation' }); }
		return { success: true };
	},
};
