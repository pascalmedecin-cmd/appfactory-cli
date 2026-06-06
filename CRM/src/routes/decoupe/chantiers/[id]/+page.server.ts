import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	DecoupeChantierUpdateSchema,
	DecoupeChantierDeleteSchema,
	DecoupeVitreCreateSchema,
	DecoupeVitreUpdateSchema,
	DecoupeVitreDeleteSchema,
	DECOUPE_CHANTIER_FIELDS,
	DECOUPE_VITRE_FIELDS,
	extractForm,
	validate
} from '$lib/schemas';
import { dbFail } from '$lib/server/db-helpers';
import { buildChantierUpdate, buildVitreInsert, buildVitreUpdate } from '$lib/server/decoupe/builders';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: chantier, error: chErr } = await locals.supabase
		.from('decoupe_chantiers')
		.select('id, nom, client, statut, created_at, updated_at')
		.eq('id', params.id)
		.maybeSingle();

	if (chErr) {
		console.error('Erreur chargement chantier découpe:', chErr.message);
		throw error(500, 'Erreur de chargement');
	}
	if (!chantier) throw error(404, 'Chantier introuvable');

	const [vitresRes, produitsRes] = await Promise.all([
		locals.supabase
			.from('decoupe_vitres')
			.select(
				'id, largeur_mm, hauteur_mm, quantite, type_vitrage, sur_mesure_fournisseur, produit_id, produit:decoupe_produits(id, reference, nom, famille, fabricant)'
			)
			.eq('chantier_id', params.id)
			.order('created_at', { ascending: true }),
		locals.supabase
			.from('decoupe_produits')
			.select('id, reference, nom, famille, fabricant, laizes_mm')
			.eq('actif', true)
			.order('reference', { ascending: true })
	]);

	return {
		chantier,
		vitres: vitresRes.data ?? [],
		produits: produitsRes.data ?? []
	};
};

export const actions: Actions = {
	updateChantier: async ({ request, locals }) => {
		const raw = extractForm(await request.formData(), ['id', ...DECOUPE_CHANTIER_FIELDS]);
		const parsed = validate(DecoupeChantierUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error: e } = await locals.supabase
			.from('decoupe_chantiers')
			.update(buildChantierUpdate(parsed.data))
			.eq('id', parsed.data.id);
		return dbFail(e) ?? { success: true };
	},

	deleteChantier: async ({ request, locals }) => {
		const parsed = validate(
			DecoupeChantierDeleteSchema,
			extractForm(await request.formData(), ['id'])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		// CASCADE supprime les vitres rattachées (FK ON DELETE CASCADE).
		const { error: e } = await locals.supabase
			.from('decoupe_chantiers')
			.delete()
			.eq('id', parsed.data.id);
		if (e) return dbFail(e);
		throw redirect(303, '/decoupe');
	},

	addVitre: async ({ request, locals }) => {
		const raw = extractForm(await request.formData(), [...DECOUPE_VITRE_FIELDS]);
		const parsed = validate(DecoupeVitreCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error: e } = await locals.supabase
			.from('decoupe_vitres')
			.insert(buildVitreInsert(parsed.data));
		return dbFail(e) ?? { success: true };
	},

	updateVitre: async ({ request, locals }) => {
		const raw = extractForm(await request.formData(), [
			'id',
			'produit_id',
			'largeur_mm',
			'hauteur_mm',
			'quantite',
			'type_vitrage',
			'sur_mesure_fournisseur'
		]);
		const parsed = validate(DecoupeVitreUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error: e } = await locals.supabase
			.from('decoupe_vitres')
			.update(buildVitreUpdate(parsed.data))
			.eq('id', parsed.data.id);
		return dbFail(e) ?? { success: true };
	},

	deleteVitre: async ({ request, locals }) => {
		const parsed = validate(
			DecoupeVitreDeleteSchema,
			extractForm(await request.formData(), ['id'])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error: e } = await locals.supabase
			.from('decoupe_vitres')
			.delete()
			.eq('id', parsed.data.id);
		return dbFail(e) ?? { success: true };
	}
};
