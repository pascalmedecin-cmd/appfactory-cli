import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema, CONTACT_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';

/** Fuzzy match : normalise et compare les noms d'entreprise */
function normalizeCompanyName(name: string): string {
	return name.toLowerCase().trim()
		.replace(/\s+(sa|sàrl|sarl|gmbh|ag|s\.a\.|s\.à\.r\.l\.)$/i, '')
		.replace(/[^a-zà-ü0-9]/g, '');
}

export const load: PageServerLoad = async ({ locals }) => {
	const { data: contacts, error } = await locals.supabase
		.from('contacts')
		.select('*, entreprises(raison_sociale)')
		.eq('statut_archive', false)
		.order('date_derniere_modification', { ascending: false });

	if (error) {
		console.error('Erreur chargement contacts:', error.message);
		return { contacts: [], entreprises: [] };
	}

	const { data: entreprises } = await locals.supabase
		.from('entreprises')
		.select('id, raison_sociale, site_web')
		.order('raison_sociale');

	return { contacts: contacts ?? [], entreprises: entreprises ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...CONTACT_FIELDS, 'entreprise_nom']);
		const entrepriseNom = raw.entreprise_nom ?? '';

		// Auto-création entreprise si nom fourni sans ID
		if (entrepriseNom && !raw.entreprise_id) {
			const { data: existantes } = await locals.supabase
				.from('entreprises')
				.select('id, raison_sociale');
			const normalized = normalizeCompanyName(entrepriseNom);
			const match = existantes?.find(e => normalizeCompanyName(e.raison_sociale) === normalized);
			if (match) {
				raw.entreprise_id = match.id;
			} else {
				const entId = newId();
				const ts = now();
				const { error: entErr } = await locals.supabase.from('entreprises').insert({
					id: entId,
					raison_sociale: entrepriseNom.trim(),
					statut_qualification: 'nouveau',
					source: 'auto-contact',
					date_import_ajout: ts,
					date_derniere_modification: ts,
				});
				if (entErr) {
					console.error('Erreur création entreprise auto:', entErr.message);
				} else {
					raw.entreprise_id = entId;
				}
			}
		}

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
		const raw = extractForm(form, ['id', ...CONTACT_FIELDS, 'entreprise_nom']);
		const entrepriseNom = raw.entreprise_nom ?? '';

		if (entrepriseNom && !raw.entreprise_id) {
			const { data: existantes } = await locals.supabase
				.from('entreprises')
				.select('id, raison_sociale');
			const normalized = normalizeCompanyName(entrepriseNom);
			const match = existantes?.find(e => normalizeCompanyName(e.raison_sociale) === normalized);
			if (match) {
				raw.entreprise_id = match.id;
			} else {
				const entId = newId();
				const ts = now();
				const { error: entErr } = await locals.supabase.from('entreprises').insert({
					id: entId,
					raison_sociale: entrepriseNom.trim(),
					statut_qualification: 'nouveau',
					source: 'auto-contact',
					date_import_ajout: ts,
					date_derniere_modification: ts,
				});
				if (!entErr) raw.entreprise_id = entId;
			}
		}

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
