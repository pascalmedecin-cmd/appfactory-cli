import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { assignGroupeToLeads } from '$lib/server/campagne-groupes';
import { MAX_GROUPE_LEAD_IDS } from '$lib/campagne-groupes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * POST /api/campagnes/[id]/groupes/assign - assigne (ou retire) le groupe d'un lot de
 * prospects DE la campagne (2026-07-02). `groupeId: null` = retirer du groupe (sans groupe).
 *
 * N'update que les liens existants de la campagne : un lead non étiqueté est ignoré (jamais
 * créé ici). L'appartenance du groupe à LA campagne est vérifiée serveur (+ FK composite en
 * base). Renvoie `updated` (compte honnête pour le toast).
 */
const idSchema = z.string().uuid();
const AssignSchema = z.object({
	groupeId: z.string().uuid().nullable(),
	leadIds: z.array(z.string().uuid()).min(1).max(MAX_GROUPE_LEAD_IDS),
});

export const POST = async ({ params, request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const raw = await request.json().catch(() => null);
	const parsed = AssignSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { updated, error } = await assignGroupeToLeads(
		locals.supabase,
		id.data,
		parsed.data.groupeId,
		parsed.data.leadIds
	);
	if (error) {
		const status = error.code === 'invalid' ? 400 : 500;
		return json({ error: error.message }, { status });
	}
	return json({ updated });
};
