import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import { ContactCreateSchema, ContactUpdateSchema, ContactDeleteSchema, CONTACT_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';
import { normalizeCompanyName } from '$lib/utils/contactsFormat';

/**
 * Récupère ou crée une entreprise par raison sociale.
 *
 * Audit 360 C-05 (bug-hunter) : la version pré-fix faisait check-then-insert
 * sans contrainte DB → race condition entre 2 transactions concurrentes (terrain
 * mobile + main app) créait des doublons silencieux. Fix structurel : index
 * UNIQUE partial DB (`entreprises_raison_sociale_normalized_unique`, migration
 * 20260510_001) + ce helper qui rattrape le 23505 unique violation.
 *
 * Audit 360 V2b H-06 + bug-hunter F5 : recherche désormais via RPC
 * `entreprises_lookup_by_name` (migration 20260510_010), qui exécute le
 * prefix match directement sur `lower(immutable_unaccent(raison_sociale))`.
 * Cela aligne le lookup avec l'index UNIQUE partial (sinon "École Suisse SA"
 * en DB + saisie "ecole" rate le match côté ILIKE brut). Le filtre JS final
 * reste basé sur `normalizeCompanyName` (qui retire les suffixes légaux
 * "SA", "SàRL", "GmbH"), parce que la RPC matche le préfixe normalisé mais
 * pas les suffixes équivalents.
 */
async function lookupEntrepriseByName(
	supabase: SupabaseClient<Database>,
	trimmed: string,
	normalized: string
): Promise<string | null> {
	// La RPC est créée par migration 010 ; les types Database générés ne
	// la connaissent pas encore (cast `as never`, tracé V3a regen).
	const { data: candidates } = await supabase.rpc(
		'entreprises_lookup_by_name' as never,
		{ p_query: trimmed } as never
	);

	const rows = (candidates ?? []) as Array<{ id: string; raison_sociale: string }>;
	const match = rows.find((e) => normalizeCompanyName(e.raison_sociale) === normalized);
	return match?.id ?? null;
}

async function getOrCreateEntreprise(
	supabase: SupabaseClient<Database>,
	rawName: string
): Promise<string | null> {
	const trimmed = rawName.trim();
	if (!trimmed) return null;

	const normalized = normalizeCompanyName(trimmed);

	// 1. Lookup optimiste (cas commun : entreprise déjà connue).
	const matchedId = await lookupEntrepriseByName(supabase, trimmed, normalized);
	if (matchedId) return matchedId;

	// 2. Tentative INSERT.
	const entId = newId();
	const ts = now();
	const { error: insertErr } = await supabase.from('entreprises').insert({
		id: entId,
		raison_sociale: trimmed,
		statut_qualification: 'nouveau',
		source: 'auto-contact',
		date_import_ajout: ts,
		date_derniere_modification: ts
	});
	if (!insertErr) return entId;

	// 3. Code 23505 = unique_violation : autre transaction a créé l'entreprise
	//    entre notre lookup et notre INSERT. Re-lookup pour récupérer son id.
	if (insertErr.code === '23505') {
		const matchedId2 = await lookupEntrepriseByName(supabase, trimmed, normalized);
		if (matchedId2) return matchedId2;
	}

	console.error('Erreur création entreprise auto:', insertErr.message);
	return null;
}

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
			const entId = await getOrCreateEntreprise(locals.supabase, entrepriseNom);
			if (entId) raw.entreprise_id = entId;
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
			const entId = await getOrCreateEntreprise(locals.supabase, entrepriseNom);
			if (entId) raw.entreprise_id = entId;
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
