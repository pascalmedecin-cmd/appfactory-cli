import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { renameGroupe, deleteGroupe } from '$lib/server/campagne-groupes';
import { GROUPE_NOM_MAX } from '$lib/campagne-groupes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * Un groupe d'une campagne (2026-07-02).
 *  - PATCH  { nom } : renomme (unicité insensible à la casse par campagne -> 409).
 *  - DELETE         : supprime le groupe ; ses prospects repassent « sans groupe »
 *    (FK ON DELETE SET NULL, testée postgres réel), aucun lien ni lead supprimé.
 *
 * Toute opération est SCOPÉE (id, campagne_id) : un gid d'une autre campagne -> 400.
 */
const idSchema = z.string().uuid();
const RenameSchema = z.object({ nom: z.string().trim().min(1).max(GROUPE_NOM_MAX) });

export const PATCH = async ({ params, request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	const gid = idSchema.safeParse(params.gid);
	if (!id.success || !gid.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const raw = await request.json().catch(() => null);
	const parsed = RenameSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { data, error } = await renameGroupe(locals.supabase, id.data, gid.data, parsed.data.nom);
	if (error || !data) {
		const status = error?.code === 'duplicate' ? 409 : error?.code === 'invalid' ? 400 : 500;
		return json({ error: error?.message ?? 'Renommage impossible' }, { status });
	}
	return json({ groupe: data });
};

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	const gid = idSchema.safeParse(params.gid);
	if (!id.success || !gid.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const { error } = await deleteGroupe(locals.supabase, id.data, gid.data);
	if (error) {
		const status = error.code === 'invalid' ? 400 : 500;
		return json({ error: error.message }, { status });
	}
	return json({ ok: true });
};
