import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { EntrepriseCreateSchema, EntrepriseUpdateSchema, EntrepriseDeleteSchema, extractForm, validate } from '$lib/schemas';

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

const ENTREPRISE_FIELDS = [
	'raison_sociale', 'secteur_activite', 'canton', 'taille_estimee', 'site_web',
	'numero_ide', 'adresse_siege', 'segment_cible', 'source', 'notes_libres', 'tags',
];

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ENTREPRISE_FIELDS);
		const parsed = validate(EntrepriseCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const now = new Date().toISOString();
		const { error } = await locals.supabase.from('entreprises').insert({
			id: randomUUID(),
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
			date_import_ajout: now,
			date_derniere_modification: now,
		});

		if (error) { console.error('Supabase error:', error.message); return fail(400, { error: 'Erreur lors de l\'operation' }); }
		return { success: true };
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
				date_derniere_modification: new Date().toISOString(),
			})
			.eq('id', parsed.data.id);

		if (error) { console.error('Supabase error:', error.message); return fail(400, { error: 'Erreur lors de l\'operation' }); }
		return { success: true };
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

		if (error) { console.error('Supabase error:', error.message); return fail(400, { error: 'Erreur lors de l\'operation' }); }
		return { success: true };
	},
};
