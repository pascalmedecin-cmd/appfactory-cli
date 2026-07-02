import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { getCampagne } from '$lib/server/campagnes';
import { createValidationLien, revokeValidationLiens } from '$lib/server/validation-campagne';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * Lien de validation externe d'UNE campagne (2026-07-02).
 *  - POST   : génère un lien secret (révoque les précédents - au plus UN lien actif) et
 *    retourne l'URL complète + l'expiration. Le token n'est JAMAIS persisté en clair :
 *    c'est la seule réponse qui le contient.
 *  - DELETE : révoque le(s) lien(s) actif(s) (la page publique devient « lien expiré »).
 *
 * Auth obligatoire + gate `ffCrmListesV2` re-vérifié serveur (defense-in-depth) : c'est un
 * geste fondateur qui OUVRE une porte publique sur les données de la campagne.
 */
const idSchema = z.string().uuid();

export const POST = async ({ params, locals, url }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	// Existence vérifiée AVANT de créer le lien : 404 propre plutôt qu'une violation FK opaque.
	const { data: campagne, error: campErr } = await getCampagne(locals.supabase, id.data);
	if (campErr) {
		console.error('Erreur lecture campagne (validation):', campErr.message);
		return json({ error: 'Chargement impossible' }, { status: 500 });
	}
	if (!campagne) return json({ error: 'Campagne introuvable' }, { status: 404 });

	const { data, error } = await createValidationLien(locals.supabase, id.data, user?.id ?? null);
	if (error || !data) {
		console.error('Erreur création lien validation:', error?.message);
		return json({ error: 'Création du lien impossible' }, { status: 500 });
	}

	return json(
		{ url: `${url.origin}/validation/${data.token}`, expiresAt: data.expiresAt },
		{ status: 201 }
	);
};

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const { error } = await revokeValidationLiens(locals.supabase, id.data);
	if (error) {
		console.error('Erreur révocation lien validation:', error.message);
		return json({ error: 'Révocation impossible' }, { status: 500 });
	}
	return json({ ok: true });
};
