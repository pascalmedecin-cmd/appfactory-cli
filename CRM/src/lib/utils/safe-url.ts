/**
 * Audit 360 M-02 : garde URL pour le rendu d'attributs `href` côté Svelte.
 *
 * Svelte n'échappe PAS les schémas d'URL : un `href={lead.source_url}` où
 * `source_url = "javascript:alert(1)"` est rendu tel quel et exécutable. On
 * filtre donc en whitelist de protocole (http/https uniquement). Toute valeur
 * non absolue, mal formée, ou de schéma exotique (`javascript:`, `data:`,
 * `ftp:`, `vbscript:`, etc.) retourne `null` → le composant n'affiche pas le lien.
 *
 * Pure, sans I/O, testable. Source unique pour tout rendu de lien externe
 * dont l'URL vient d'une source externe (search.ch source_url, etc.).
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	const trimmed = url.trim();
	if (!trimmed) return null;
	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.href;
	} catch {
		return null;
	}
}
