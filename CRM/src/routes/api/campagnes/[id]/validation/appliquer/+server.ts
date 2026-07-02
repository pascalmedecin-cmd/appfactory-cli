import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { applyValidationRetraits } from '$lib/server/validation-campagne';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * POST /api/campagnes/[id]/validation/appliquer - applique les retraits décidés par la
 * validation externe : supprime de la campagne les prospects marqués « retirer » (les
 * prospects eux-mêmes restent en Prospection). Geste FONDATEUR (droit de regard : la
 * personne externe marque, seul un fondateur retire).
 *
 * Auth obligatoire + gate `ffCrmListesV2` re-vérifié serveur (defense-in-depth).
 */
const idSchema = z.string().uuid();

export const POST = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const { removed, error } = await applyValidationRetraits(locals.supabase, id.data);
	if (error) {
		console.error('Erreur application retraits validation:', error.message);
		return json({ error: 'Application impossible' }, { status: 500 });
	}
	return json({ removed });
};
