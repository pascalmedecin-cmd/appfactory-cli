/**
 * Chemins soumis au rate limiting (10 req/min/IP, hooks.server.ts).
 * Extrait en helper pur pour être testable (audit 360 M-04/M-14 + audit V3 Medium).
 *
 * - /api/prospection/* , /api/photos* , /api/visits* : endpoints d'écriture coûteux.
 * - /api/contact-suggestions* : création de brouillons + resolve (écrit dans `contacts`),
 *   ajouté en V3 (audit sécu 2026-05-31) — comble l'asymétrie avec les autres écritures.
 * - POST /login : anti cost-burn SMTP (`?/sendcode` bombing).
 * - POST /log/* : form actions feedback (audit S185).
 * - POST /signaux : form actions keywords + rescore synchrone (audit S186).
 */
export function isRateLimitedPath(pathname: string, method: string): boolean {
	return (
		pathname.startsWith('/api/prospection/') ||
		pathname.startsWith('/api/photos') ||
		pathname.startsWith('/api/visits') ||
		pathname.startsWith('/api/contact-suggestions') ||
		(pathname === '/login' && method === 'POST') ||
		(pathname.startsWith('/log') && method === 'POST') ||
		(pathname === '/signaux' && method === 'POST')
	);
}
