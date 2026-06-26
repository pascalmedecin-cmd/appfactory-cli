import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { assignCampagnesToLead, removeCampagneFromLead, MAX_CAMPAGNE_IDS } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * Assignation / retrait d'étiquettes campagne sur un prospect (multi-étiquetage N-N).
 *  - POST   { leadId, campagneIds[] } : ajoute (cumulatif, idempotent).
 *  - DELETE { leadId, campagneId }    : retire une étiquette (ne supprime ni lead ni campagne).
 *
 * Utilisé par l'édition inline de la liste + le bloc Campagnes de la fiche. Auth obligatoire ;
 * payload borné ; un id campagne inexistant -> 400 (FK 23503 traduite côté repo).
 */
const AssignSchema = z.object({
	leadId: z.string().uuid(),
	campagneIds: z.array(z.string().uuid()).min(1).max(MAX_CAMPAGNE_IDS)
});
const RemoveSchema = z.object({
	leadId: z.string().uuid(),
	campagneId: z.string().uuid()
});

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const raw = await request.json().catch(() => null);
	const parsed = AssignSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { error } = await assignCampagnesToLead(locals.supabase, parsed.data.leadId, parsed.data.campagneIds);
	if (error) {
		const status = error.code === 'invalid' ? 400 : 500;
		return json({ error: error.message }, { status });
	}
	return json({ ok: true });
};

export const DELETE = async ({ request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const raw = await request.json().catch(() => null);
	const parsed = RemoveSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { error } = await removeCampagneFromLead(locals.supabase, parsed.data.leadId, parsed.data.campagneId);
	if (error) return json({ error: error.message }, { status: 500 });
	return json({ ok: true });
};
