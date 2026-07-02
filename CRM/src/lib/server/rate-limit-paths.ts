/**
 * Chemins soumis au rate limiting (10 req/min/IP, hooks.server.ts).
 * Extrait en helper pur pour être testable (audit 360 M-04/M-14 + audit V3 Medium).
 *
 * - /api/prospection/* , /api/photos* , /api/visits* : endpoints d'écriture coûteux.
 * - /api/contact-suggestions* : création de brouillons + resolve (écrit dans `contacts`),
 *   ajouté en V3 (audit sécu 2026-05-31) — comble l'asymétrie avec les autres écritures.
 * - POST /login : anti cost-burn SMTP (`?/sendcode` bombing).
 * - POST /crm/log/* : form actions feedback (audit S185 ; sous /crm depuis reorg portail 2026-06-01).
 * - POST /crm/signaux : form actions keywords + rescore synchrone (audit S186 ; idem /crm).
 */
export function isRateLimitedPath(pathname: string, method: string): boolean {
	return (
		pathname.startsWith('/api/prospection/') ||
		pathname.startsWith('/api/photos') ||
		pathname.startsWith('/api/visits') ||
		pathname.startsWith('/api/contact-suggestions') ||
		(pathname === '/login' && method === 'POST') ||
		(pathname.startsWith('/crm/log') && method === 'POST') ||
		(pathname === '/crm/signaux' && method === 'POST')
	);
}

/**
 * Routes PUBLIQUES de validation externe d'une campagne (2026-07-02) : page /validation/<token>
 * + API de décision. Exemptées du gate auth (hooks.server.ts) - l'autorisation est le token -
 * et soumises à un rate limiting DÉDIÉ plus permissif (60 req/min/IP) : la personne externe
 * enchaîne les décisions plus vite que 10/min, mais un scan de tokens reste borné.
 *
 * Matching par motifs EXACTS (et NON `startsWith`) : l'exemption d'auth est une surface sensible.
 * Un `startsWith('/api/validation/')` ferait hériter automatiquement de l'exemption toute future
 * sous-route (ex. `/api/validation/<token>/admin`). On liste donc précisément les 2 seules routes
 * publiques : la page (1 segment token) et l'API decision. Le token est un base64url sans `/`,
 * donc `[^/]+` capture exactement un segment. Slash final toléré (normalisation SvelteKit).
 */
const VALIDATION_PAGE_RE = /^\/validation\/[^/]+\/?$/;
const VALIDATION_API_DECISION_RE = /^\/api\/validation\/[^/]+\/decision\/?$/;

export function isValidationPublicRoute(pathname: string): boolean {
	return VALIDATION_PAGE_RE.test(pathname) || VALIDATION_API_DECISION_RE.test(pathname);
}
