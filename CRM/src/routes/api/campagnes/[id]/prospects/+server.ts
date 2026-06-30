import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { fetchProspectsForCampagne } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * GET /api/campagnes/[id]/prospects - prospects étiquetés d'une campagne, réduits aux champs
 * d'adresse postale (alimente le panneau « Étiquettes d'adresses » de l'écran Campagnes).
 *
 * Lecture seule. Auth obligatoire + gate `ffCrmListesV2` re-vérifié côté serveur (defense-in-depth :
 * l'UI masque la surface, l'endpoint ne fait jamais confiance à ça). Param id validé uuid. Erreur DB
 * -> 500 générique (le détail est journalisé, jamais renvoyé au client).
 */
const idSchema = z.string().uuid();

export const GET = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const { data, error } = await fetchProspectsForCampagne(locals.supabase, id.data);
	if (error) {
		console.error('Erreur chargement prospects campagne:', error.message);
		return json({ error: 'Chargement impossible' }, { status: 500 });
	}
	return json({ prospects: data });
};
