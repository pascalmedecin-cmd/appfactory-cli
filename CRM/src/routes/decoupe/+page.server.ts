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

// Ordre d'affichage stable des pastilles de famille.
const FAMILLE_ORDER: Record<string, number> = { solaire: 0, securite: 1, discretion: 2 };

export const load: PageServerLoad = async ({ locals }) => {
	const { data: chantiers, error } = await locals.supabase
		.from('decoupe_chantiers')
		.select('id, nom, client, statut, created_at, updated_at, decoupe_vitres(produit_id, decoupe_produits(famille))')
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Erreur chargement chantiers découpe:', error.message);
		return { chantiers: [] };
	}

	// Aplatit les vitres imbriquées → nombre de vitres + familles distinctes (pour les pastilles).
	type VitreRow = { produit_id: string; decoupe_produits: { famille: string } | null };
	const rows = (chantiers ?? []).map((c) => {
		const { decoupe_vitres, ...rest } = c as typeof c & { decoupe_vitres: VitreRow[] };
		const vitres = decoupe_vitres ?? [];
		const familles = [...new Set(vitres.map((v) => v.decoupe_produits?.famille).filter(Boolean))].sort(
			(a, b) => (FAMILLE_ORDER[a as string] ?? 9) - (FAMILLE_ORDER[b as string] ?? 9)
		) as string[];
		return { ...rest, nb_vitres: vitres.length, familles };
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
