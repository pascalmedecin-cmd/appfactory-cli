import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	DecoupeChantierCreateSchema,
	DECOUPE_CHANTIER_FIELDS,
	extractForm,
	validate
} from '$lib/schemas';
import { dbFail } from '$lib/server/db-helpers';
import { buildChantierInsert } from '$lib/server/decoupe/builders';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: chantiers, error } = await locals.supabase
		.from('decoupe_chantiers')
		.select('id, nom, client, statut, created_at, updated_at, decoupe_vitres(count)')
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Erreur chargement chantiers découpe:', error.message);
		return { chantiers: [] };
	}

	// Aplatit le count imbriqué Supabase (decoupe_vitres: [{ count }]) → nb_vitres.
	const rows = (chantiers ?? []).map((c) => {
		const { decoupe_vitres, ...rest } = c as typeof c & {
			decoupe_vitres: { count: number }[];
		};
		return { ...rest, nb_vitres: decoupe_vitres?.[0]?.count ?? 0 };
	});

	return { chantiers: rows };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		const raw = extractForm(await request.formData(), [...DECOUPE_CHANTIER_FIELDS]);
		const parsed = validate(DecoupeChantierCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('decoupe_chantiers')
			.insert(buildChantierInsert(parsed.data, user?.id ?? null));

		return dbFail(error) ?? { success: true };
	}
};
