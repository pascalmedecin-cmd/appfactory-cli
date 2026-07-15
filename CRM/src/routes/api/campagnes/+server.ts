import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { createCampagne, CAMPAGNE_NOM_MAX, CAMPAGNE_DESC_MAX } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * POST /api/campagnes — crée une campagne (combo « créer à la volée » de la prospection +
 * écran dédié). Le payload client n'est jamais fait confiance : Zod borné + la couleur
 * hors palette retombe sur le défaut côté repo. Conflit de nom (insensible à la casse) -> 409.
 */
const CreateSchema = z.object({
	nom: z.string().trim().min(1).max(CAMPAGNE_NOM_MAX),
	// Couleur libre : le repo contraint à la palette c1..c8 (défaut c1 si hors palette).
	couleur: z.string().max(8).optional(),
	description: z.string().max(CAMPAGNE_DESC_MAX).nullable().optional()
});

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	// Defense-in-depth : la surface Campagnes est gatée par ffCrmListesV2 (pas que l'UI).
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const raw = await request.json().catch(() => null);
	const parsed = CreateSchema.safeParse(raw);
	if (!parsed.success) {
		const msg = parsed.error.issues.map((i) => i.message).join(', ');
		return json({ error: `Données invalides : ${msg}` }, { status: 400 });
	}

	const { data, error } = await createCampagne(locals.supabase, locals.marque, {
		nom: parsed.data.nom,
		couleur: parsed.data.couleur,
		description: parsed.data.description ?? null,
		userId: user?.id ?? null
	});

	if (error) {
		const status = error.code === 'duplicate' ? 409 : error.code === 'invalid' ? 400 : 500;
		return json({ error: error.message }, { status });
	}
	return json({ campagne: data }, { status: 201 });
};
