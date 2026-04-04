import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema, CONTACT_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';

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
		const raw = extractForm(form, [...CONTACT_FIELDS]);
		const parsed = validate(ContactCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const ts = now();
		const { error } = await locals.supabase.from('contacts').insert({
			id: newId(),
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
			date_ajout: ts,
			date_derniere_modification: ts,
		});

		return dbFail(error) ?? { success: true };
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
				date_derniere_modification: now(),
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(ContactDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('contacts')
			.update({ statut_archive: true, date_derniere_modification: now() })
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},
};
