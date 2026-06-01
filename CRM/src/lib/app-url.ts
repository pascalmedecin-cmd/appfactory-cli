import { env } from '$env/dynamic/public';

/**
 * URL publique de l'app FilmPro (origine). Externalisee via PUBLIC_APP_URL pour survivre a la
 * bascule d'adresse (filmpro-crm.vercel.app -> filmpro.vercel.app, chantier portail session 3).
 * Fallback = adresse actuelle, donc comportement inchange tant que la variable n'est pas posee.
 * A definir dans les env Vercel (preview + prod) au moment de la bascule.
 */
export const APP_URL = env.PUBLIC_APP_URL || 'https://filmpro-crm.vercel.app';
