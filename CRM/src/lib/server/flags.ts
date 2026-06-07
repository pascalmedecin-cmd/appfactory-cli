import { env } from '$env/dynamic/private';

/**
 * Flags produit V5 (recentrage Signaux & Prospection sur l'affaire métier, 2026-06-07).
 *
 * Ces interrupteurs sont GLOBAUX (décision produit), à ne pas confondre avec les feature
 * flags par utilisateur (`src/lib/types/feature-flags.ts`, JWT custom claims) qui pilotent
 * des opt-in individuels (Découpe, mobile V3...).
 */

/**
 * Ingestion Zefix (créations d'entreprises) dans le cron signaux.
 *
 * OFF par défaut depuis V5 : le radar Signaux est centré sur SIMAP (appels d'offres
 * construction = affaires vitrage concrètes). Une création d'entreprise n'a pas de lien
 * causal avec un besoin de traiter du vitrage (cf. spec V5 §1).
 *
 * Lu depuis une variable d'environnement (`$env/dynamic/private`) et non un flag JWT :
 * le cron tourne sans utilisateur, et une variable d'env Vercel se modifie sans
 * redéploiement de code (critère d'acceptation V5). Strict `=== 'true'` : toute autre
 * valeur (absente, '1', 'yes'...) laisse l'ingestion OFF.
 */
export function isSignauxZefixEnabled(): boolean {
	return env.SIGNAUX_ZEFIX_ENABLED === 'true';
}
