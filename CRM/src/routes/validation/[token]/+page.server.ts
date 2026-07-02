import type { PageServerLoad } from './$types';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { resolveValidationToken, validationExterneEnabled } from '$lib/server/validation-campagne';
import { getCampagne, fetchProspectsForCampagne } from '$lib/server/campagnes';
import { toPublicProspect, PUBLIC_MAX_PROSPECTS, type PublicProspect } from '$lib/campagnes';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Page PUBLIQUE de validation externe (/validation/<token>) - exemptée du gate auth par
 * hooks.server.ts. La personne de l'équipe (sans compte CRM) vérifie chaque prospect via sa
 * fiche Google Maps et marque « garder » / « retirer ».
 *
 * SÉCURITÉ / MINIMISATION :
 *  - kill-switch `VALIDATION_EXTERNE_ENABLED` testé EN TÊTE, avant toute lecture DB (spec §5.0) ;
 *  - le token est résolu à CHAQUE chargement (révocation immédiate) ; états distincts :
 *    lien inconnu (404 générique anti-énumération) / expiré-révoqué (message dédié) / valide ;
 *  - service role UNIQUEMENT après résolution ;
 *  - données exposées MINIMALES via `toPublicProspect` (source unique) : nom de campagne + par
 *    prospect : raison sociale, adresse, lien Maps (hôtes Google only) et décision courante.
 *    Jamais de score, statut de tri, source, description ou id de campagne ;
 *  - volume borné à PUBLIC_MAX_PROSPECTS (pas de sérialisation illimitée vers un anonyme) ;
 *  - headers no-store + noindex posés centralement dans hooks.server.ts (couvre aussi 404/500/410).
 */
export type ProspectValidation = PublicProspect;

export const load: PageServerLoad = async ({ params }) => {
	// Kill-switch de la porte publique : la variable posée à `0`/`false`/... ferme instantanément
	// la page (état « service désactivé ») SANS aucune requête DB - le seul levier qui ne dépend ni
	// d'une migration ni d'une révocation individuelle (le flag JWT ffCrmListesV2 ne s'y applique pas).
	if (!validationExterneEnabled(env.VALIDATION_EXTERNE_ENABLED)) {
		return { state: 'disabled' as const, campagneNom: null, expiresAt: null, truncated: false, prospects: [] as ProspectValidation[] };
	}

	const supabase = createSupabaseServiceClient();
	const resolution = await resolveValidationToken(supabase, params.token);

	if (resolution.status === 'db') {
		console.error('[validation] résolution token en erreur:', resolution.message);
		throw error(500, 'Service momentanément indisponible');
	}
	if (resolution.status === 'introuvable') throw error(404, 'Lien invalide');
	if (resolution.status === 'expire') {
		return { state: 'expire' as const, campagneNom: null, expiresAt: null, truncated: false, prospects: [] as ProspectValidation[] };
	}

	const [{ data: campagne, error: campErr }, { data: prospects, error: prospErr, truncated }] = await Promise.all([
		getCampagne(supabase, resolution.campagneId),
		fetchProspectsForCampagne(supabase, resolution.campagneId, { maxRows: PUBLIC_MAX_PROSPECTS }),
	]);
	if (campErr || prospErr || !campagne) {
		console.error('[validation] chargement campagne/prospects en erreur:', campErr?.message ?? prospErr?.message);
		throw error(500, 'Service momentanément indisponible');
	}
	if (truncated) {
		// Cas extrême (campagne > 1000) : on borne la sérialisation publique et on trace côté serveur.
		console.warn(`[validation] campagne ${resolution.campagneId} tronquée à ${PUBLIC_MAX_PROSPECTS} prospects (lecture publique)`);
	}

	return {
		state: 'ok' as const,
		campagneNom: campagne.nom,
		expiresAt: resolution.expiresAt,
		truncated,
		prospects: prospects.map(toPublicProspect),
	};
};
