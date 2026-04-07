import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { EntrepriseCreateSchema, EntrepriseUpdateSchema, EntrepriseDeleteSchema, ENTREPRISE_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';

interface ZefixSearchResult {
	name: string;
	uid: string;
	legalSeat: string;
	canton: { cantonAbbreviation: string };
	purpose?: { fr?: string; de?: string; it?: string };
	address?: { street?: string; houseNumber?: string; swissZipCode?: string; city?: string };
}

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
		const raw = extractForm(form, [...ENTREPRISE_FIELDS]);
		const parsed = validate(EntrepriseCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const ts = now();
		const { error } = await locals.supabase.from('entreprises').insert({
			id: newId(),
			raison_sociale: parsed.data.raison_sociale,
			secteur_activite: parsed.data.secteur_activite || null,
			canton: parsed.data.canton || null,
			taille_estimee: parsed.data.taille_estimee || null,
			site_web: parsed.data.site_web || null,
			numero_ide: parsed.data.numero_ide || null,
			adresse_siege: parsed.data.adresse_siege || null,
			segment_cible: parsed.data.segment_cible || null,
			source: parsed.data.source || null,
			notes_libres: parsed.data.notes_libres || null,
			tags: parsed.data.tags || null,
			statut_qualification: 'nouveau',
			date_import_ajout: ts,
			date_derniere_modification: ts,
		});

		return dbFail(error) ?? { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...ENTREPRISE_FIELDS]);
		const parsed = validate(EntrepriseUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('entreprises')
			.update({
				raison_sociale: parsed.data.raison_sociale,
				secteur_activite: parsed.data.secteur_activite || null,
				canton: parsed.data.canton || null,
				taille_estimee: parsed.data.taille_estimee || null,
				site_web: parsed.data.site_web || null,
				numero_ide: parsed.data.numero_ide || null,
				adresse_siege: parsed.data.adresse_siege || null,
				segment_cible: parsed.data.segment_cible || null,
				source: parsed.data.source || null,
				notes_libres: parsed.data.notes_libres || null,
				tags: parsed.data.tags || null,
				date_derniere_modification: now(),
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(EntrepriseDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		// Verifier les dependances avant suppression
		const [contactsRes, oppsRes] = await Promise.all([
			locals.supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('entreprise_id', parsed.data.id),
			locals.supabase.from('opportunites').select('id', { count: 'exact', head: true }).eq('entreprise_id', parsed.data.id),
		]);

		const deps: string[] = [];
		if ((contactsRes.count ?? 0) > 0) deps.push(`${contactsRes.count} contact(s)`);
		if ((oppsRes.count ?? 0) > 0) deps.push(`${oppsRes.count} opportunite(s)`);
		if (deps.length > 0) {
			return fail(400, { error: `Impossible de supprimer : ${deps.join(' et ')} rattache(s)` });
		}

		const { error } = await locals.supabase
			.from('entreprises')
			.delete()
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	enrichir: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const raison_sociale = form.get('raison_sociale') as string;
		if (!id || !raison_sociale) return fail(400, { error: 'Données manquantes' });

		const u = env.ZEFIX_USERNAME;
		const p = env.ZEFIX_PASSWORD;
		if (!u || !p) return fail(400, { error: 'Credentials Zefix non configurés' });

		try {
			const resp = await fetch('https://www.zefix.admin.ch/ZefixPublicREST/api/v1/company/search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64'),
					'Accept': 'application/json',
				},
				body: JSON.stringify({ name: raison_sociale, maxEntries: 5 }),
			});

			if (!resp.ok) return fail(400, { error: `Zefix HTTP ${resp.status}` });
			const companies: ZefixSearchResult[] = await resp.json();
			if (!Array.isArray(companies) || companies.length === 0) {
				return fail(400, { error: 'Aucun résultat Zefix' });
			}

			const best = companies[0];
			const addr = best.address;
			const adresse = addr
				? [addr.street, addr.houseNumber, addr.swissZipCode, addr.city].filter(Boolean).join(' ')
				: null;
			const purpose = best.purpose?.fr || best.purpose?.de || best.purpose?.it || null;

			const updates: Record<string, string | null> = {
				numero_ide: best.uid || null,
				canton: best.canton?.cantonAbbreviation || null,
				date_derniere_modification: now(),
			};
			if (adresse) updates.adresse_siege = adresse;
			if (purpose) updates.notes_libres = purpose;

			const { error } = await locals.supabase
				.from('entreprises')
				.update(updates)
				.eq('id', id);

			return dbFail(error) ?? { success: true };
		} catch (err) {
			console.error('Erreur enrichissement Zefix:', err);
			return fail(500, { error: 'Erreur lors de la requête Zefix' });
		}
	},
};
