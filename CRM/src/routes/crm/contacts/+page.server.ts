import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema, CONTACT_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, now } from '$lib/server/db-helpers';
// Dédup entreprise + mapping contact centralisés dans le référentiel partagé (chantier portail).
import { getOrCreateEntreprise, buildContactInsert, buildContactUpdate } from '$lib/server/referentiel/contacts';

export const load: PageServerLoad = async ({ locals }) => {
	// Audit 360 V2b H-06 : le SELECT full-table `entreprises` est retiré du
	// load. Le frontend autocomplete utilise désormais `/api/entreprises/search`
	// (ilike trigram-backed, max 20 résultats par query). Le join contact ↔
	// entreprise inclut `id, site_web` pour permettre au slide-out d'afficher
	// le logo Clearbit sans round-trip supplémentaire.
	const { data: contacts, error } = await locals.supabase
		.from('contacts')
		.select('*, entreprises(id, raison_sociale, site_web)')
		.eq('statut_archive', false)
		.eq('marque', locals.marque)
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
		const raw = extractForm(form, [...CONTACT_FIELDS, 'entreprise_nom']);
		const entrepriseNom = raw.entreprise_nom ?? '';

		// Auto-création entreprise si nom fourni sans ID (anti-race C-05).
		if (entrepriseNom && !raw.entreprise_id) {
			const entId = await getOrCreateEntreprise(locals.supabase, entrepriseNom, locals.marque);
			if (entId) raw.entreprise_id = entId;
		}

		const parsed = validate(ContactCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('contacts')
			.insert(buildContactInsert(parsed.data, locals.marque));

		return dbFail(error) ?? { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...CONTACT_FIELDS, 'entreprise_nom']);
		const entrepriseNom = raw.entreprise_nom ?? '';

		if (entrepriseNom && !raw.entreprise_id) {
			const entId = await getOrCreateEntreprise(locals.supabase, entrepriseNom, locals.marque);
			if (entId) raw.entreprise_id = entId;
		}

		const parsed = validate(ContactUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('contacts')
			.update(buildContactUpdate(parsed.data))
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
