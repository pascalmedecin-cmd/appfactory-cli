import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import {
	resolveValidationToken,
	setValidationDecision,
	validationExterneEnabled,
	VALIDATION_STATUTS,
} from '$lib/server/validation-campagne';

/**
 * POST /api/validation/[token]/decision - enregistre une décision de la personne externe
 * (page publique de validation) : { leadId, statut: 'garder' | 'retirer' | null (annuler) }.
 *
 * SÉCURITÉ (route PUBLIQUE, exemptée du gate auth par hooks.server.ts) :
 *  - l'autorisation EST le token (32 octets aléatoires, expirant 2 jours, révocable) : résolu à
 *    CHAQUE appel - un lien révoqué/expiré cesse d'agir immédiatement ;
 *  - la seule écriture possible est `validation_statut`/`validation_at` sur le lien N-N de LA
 *    campagne du token (setValidationDecision filtre par campagne_id ET lead_id) : aucun accès
 *    à d'autres campagnes, aucune suppression (le retrait reste un geste fondateur) ;
 *  - service role UNIQUEMENT après résolution du token (RLS authenticated sinon) ;
 *  - rate limiting dédié + réponses génériques (404 uniforme anti-énumération, 410 lien expiré).
 */
const BodySchema = z.object({
	leadId: z.string().uuid(),
	statut: z.enum(VALIDATION_STATUTS).nullable(),
});

export const POST = async ({ params, request }: RequestEvent) => {
	// Kill-switch de la porte publique (spec §5.0) : testé EN TÊTE, AVANT toute lecture DB et même
	// avant la création du client service role -> 410 immédiat, zéro requête. Fermeture instantanée
	// de l'écriture publique sans migration ni révocation (le flag JWT ffCrmListesV2 ne s'y applique pas).
	if (!validationExterneEnabled(env.VALIDATION_EXTERNE_ENABLED)) {
		return json({ error: 'Validation externe désactivée' }, { status: 410 });
	}

	let supabase: ReturnType<typeof createSupabaseServiceClient>;
	try {
		supabase = createSupabaseServiceClient();
	} catch (e) {
		console.error('[validation] service client indisponible:', (e as Error).message);
		return json({ error: 'Service indisponible' }, { status: 500 });
	}

	const resolution = await resolveValidationToken(supabase, params.token);
	if (resolution.status === 'db') {
		console.error('[validation] résolution token en erreur:', resolution.message);
		return json({ error: 'Service indisponible' }, { status: 500 });
	}
	if (resolution.status === 'introuvable') return json({ error: 'Lien invalide' }, { status: 404 });
	if (resolution.status === 'expire') return json({ error: 'Lien expiré' }, { status: 410 });

	const raw = await request.json().catch(() => null);
	const parsed = BodySchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { notFound, error } = await setValidationDecision(
		supabase,
		resolution.campagneId,
		parsed.data.leadId,
		parsed.data.statut
	);
	if (error) {
		console.error('[validation] écriture décision en erreur:', error.message);
		return json({ error: 'Enregistrement impossible' }, { status: 500 });
	}
	// Prospect retiré de la campagne entre-temps (geste fondateur) : l'UI publique recharge.
	if (notFound) return json({ error: 'Prospect plus dans la campagne' }, { status: 409 });

	return json({ ok: true });
};
