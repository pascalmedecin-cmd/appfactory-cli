/**
 * Redirection 308 des anciens hosts de prod -> nouveau host portail (bascule d'adresse 2026-06-04).
 * Extrait de hooks.server.ts en helper pur pour etre testable (audit sécu 2026-06-04 F-1).
 *
 * Le CRM est passe de filmpro-crm.vercel.app (+ alias historique template-rho-three) a
 * filmpro-portail.vercel.app. Le 308 preserve methode + path + query pour que les favoris
 * des fondateurs continuent de marcher. `/api/*` EST exempte (les 5 crons Vercel + endpoints
 * internes ne doivent jamais etre rediriges). Voir doctrine `feedback_filmpro_vercel_deploy_cli.md`.
 */

// Anciens hosts attaches au projet Vercel avant la bascule d'adresse.
const LEGACY_HOSTS = ['filmpro-crm.vercel.app', 'template-rho-three.vercel.app'];

// Origine cible de la redirection (nouveau host portail).
const PORTAL_ORIGIN = 'https://filmpro-portail.vercel.app';

/**
 * Retourne l'URL cible absolue du 308 si la requete arrive sur un ancien host (hors `/api/*`),
 * sinon `null` (host cible, host inconnu, ou chemin API exempte).
 *
 * @param host - `event.url.host` resolu par adapter-vercel.
 * @param pathname - `event.url.pathname`.
 * @param search - `event.url.search` (inclut le `?` initial, ou chaine vide).
 */
export function legacyHostRedirect(host: string, pathname: string, search: string): string | null {
	if (!LEGACY_HOSTS.includes(host)) return null;
	if (pathname.startsWith('/api/')) return null;
	return `${PORTAL_ORIGIN}${pathname}${search}`;
}
