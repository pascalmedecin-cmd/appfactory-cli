import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { renameCampagne, updateCampagne, deleteCampagne, CAMPAGNE_NOM_MAX, CAMPAGNE_DESC_MAX, CAMPAGNE_STATUTS } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * PATCH /api/campagnes/[id]  — renomme / recolore / (dé)archive / change le statut d'une campagne
 *                              (écran dédié). DELETE — supprime (liens N-N en cascade ; AUCUN
 *                              prospect supprimé). Auth obligatoire ; payload Zod borné ; conflit
 *                              de nom (insensible à la casse) -> 409 ; couleur hors palette -> défaut ;
 *                              statut hors {en_cours, active} -> 400 (champ métier contraint).
 */
const idSchema = z.string().uuid();

const PatchSchema = z.object({
	nom: z.string().trim().min(1).max(CAMPAGNE_NOM_MAX).optional(),
	// Couleur libre : le repo contraint à la palette c1..c8 (défaut si hors palette).
	couleur: z.string().max(8).optional(),
	description: z.string().max(CAMPAGNE_DESC_MAX).nullable().optional(),
	archived: z.boolean().optional(),
	// Statut strict (2 valeurs, source unique CAMPAGNE_STATUTS) : rejet propre en 400 côté API,
	// re-validé par le repo (defense-in-depth).
	statut: z.enum(CAMPAGNE_STATUTS).optional()
});

export const PATCH = async ({ request, params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const raw = await request.json().catch(() => null);
	const parsed = PatchSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { nom, couleur, description, archived, statut } = parsed.data;
	if (nom === undefined && couleur === undefined && description === undefined && archived === undefined && statut === undefined) {
		return json({ error: 'Aucune modification' }, { status: 400 });
	}

	let last: unknown = null;

	// Renommage d'abord (gère l'unicité), puis les autres champs : si les deux sont demandés,
	// l'update final reflète aussi le nouveau nom (rename committé avant).
	if (nom !== undefined) {
		const { data, error } = await renameCampagne(locals.supabase, id.data, nom);
		if (error) {
			const status = error.code === 'duplicate' ? 409 : error.code === 'invalid' ? 400 : 500;
			return json({ error: error.message }, { status });
		}
		last = data;
	}
	if (couleur !== undefined || description !== undefined || archived !== undefined || statut !== undefined) {
		const { data, error } = await updateCampagne(locals.supabase, id.data, { couleur, description, archived, statut });
		if (error) {
			const status = error.code === 'invalid' ? 400 : 500;
			return json({ error: error.message }, { status });
		}
		last = data;
	}

	return json({ campagne: last });
};

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const { error } = await deleteCampagne(locals.supabase, id.data);
	if (error) return json({ error: error.message }, { status: 500 });
	return json({ ok: true });
};
