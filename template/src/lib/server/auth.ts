/**
 * Validation email : domaines et adresses autorisés.
 * Utilisé par hooks.server.ts et login/+page.server.ts.
 */

export function isEmailAllowed(
	email: string | undefined,
	allowedDomains: string[],
	allowedEmails: string[]
): boolean {
	if (!email) return false;

	const emailLower = email.toLowerCase();

	if (allowedEmails.length > 0 && allowedEmails.includes(emailLower)) return true;

	if (allowedDomains.length > 0) {
		const domain = emailLower.split('@')[1];
		if (domain && allowedDomains.includes(domain)) return true;
	}

	// Si aucune restriction configurée, bloquer par défaut (sécurité)
	if (allowedEmails.length === 0 && allowedDomains.length === 0) return false;

	return false;
}

/** Parse une env var comma-separated en liste nettoyée */
export function parseEnvList(value: string | undefined): string[] {
	return value?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];
}
