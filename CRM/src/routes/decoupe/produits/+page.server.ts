import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	DecoupeProduitCreateSchema,
	DecoupeProduitUpdateSchema,
	DecoupeProduitArchiveSchema,
	DECOUPE_PRODUIT_FIELDS,
	extractForm,
	validate
} from '$lib/schemas';
import { dbFail } from '$lib/server/db-helpers';
import {
	buildProduitInsert,
	buildProduitUpdate,
	buildProduitActif
} from '$lib/server/decoupe/builders';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: produits, error } = await locals.supabase
		.from('decoupe_produits')
		.select('*')
		.order('actif', { ascending: false })
		.order('reference', { ascending: true });

	if (error) {
		console.error('Erreur chargement produits découpe:', error.message);
		return { produits: [] };
	}
	return { produits: produits ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		const raw = extractForm(await request.formData(), [...DECOUPE_PRODUIT_FIELDS]);
		const parsed = validate(DecoupeProduitCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('decoupe_produits')
			.insert(buildProduitInsert(parsed.data, user?.id ?? null));

		return dbFail(error) ?? { success: true };
	},

	update: async ({ request, locals }) => {
		const raw = extractForm(await request.formData(), ['id', ...DECOUPE_PRODUIT_FIELDS]);
		const parsed = validate(DecoupeProduitUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('decoupe_produits')
			.update(buildProduitUpdate(parsed.data))
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	archive: async ({ request, locals }) => {
		const parsed = validate(
			DecoupeProduitArchiveSchema,
			extractForm(await request.formData(), ['id'])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('decoupe_produits')
			.update(buildProduitActif(false))
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	restore: async ({ request, locals }) => {
		const parsed = validate(
			DecoupeProduitArchiveSchema,
			extractForm(await request.formData(), ['id'])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('decoupe_produits')
			.update(buildProduitActif(true))
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	}
};
