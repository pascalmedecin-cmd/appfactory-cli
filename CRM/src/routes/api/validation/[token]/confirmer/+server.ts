import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import {
	resolveValidationToken,
	confirmValidationLien,
	validationExterneEnabled,
} from '$lib/server/validation-campagne';

/**
 * POST /api/validation/[token]/confirmer - confirmation FINALE de la personne externe
 * (« Envoyer la validation », 2026-07-03). Sans corps : le geste horodate le lien résolu,
 * le CRM affiche « Validation reçue ». Renvoyer (après un changement d'avis) met simplement
 * l'horodatage à jour. Signal informatif : ne bloque jamais campagne ni étiquettes.
 *
 * SÉCURITÉ (route PUBLIQUE, exemptée du gate auth par hooks.server.ts) - même doctrine que
 * /decision :
 *  - kill-switch `VALIDATION_EXTERNE_ENABLED` testé EN TÊTE, avant toute requête ;
 *  - l'autorisation EST le token, résolu à CHAQUE appel (révocation/expiration immédiates) ;
 *  - la seule écriture possible est `confirmed_at` sur LE lien du token (par id résolu) ;
 *  - service role UNIQUEMENT après résolution ; 404 uniforme anti-énumération, 410 lien expiré.
 */
export const POST = async ({ params }: RequestEvent) => {
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

	const { confirmedAt, error } = await confirmValidationLien(supabase, resolution.lienId);
	if (error) {
		console.error('[validation] écriture confirmation en erreur:', error.message);
		return json({ error: 'Envoi impossible' }, { status: 500 });
	}

	return json({ ok: true, confirmedAt });
};
