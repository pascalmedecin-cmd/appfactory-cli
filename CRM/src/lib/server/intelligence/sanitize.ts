/**
 * Sanitize de logs / messages d'erreur avant exposition (DB, stdout, email).
 *
 * Source unique des patterns redact pour le pipeline veille. Reproduit la
 * logique historiquement inline dans `run-generation.ts:markError` (S166)
 * et la rend partagée pour les chemins stdout (run-veille.ts panic handler,
 * console.error best-effort) — critique depuis le passage à GitHub Actions
 * en repo public S167 où les logs sont publics.
 *
 * Patterns couverts (5) :
 *  - Anthropic API key : `sk-ant-*`
 *  - Bearer auth header : `Bearer *`
 *  - JWT (Supabase, third-party) : `eyJ*.*.*`
 *  - Resend API key : `re_*`
 *  - Génériques `api_key=val`, `token=val`, `secret=val`, `apikey=val`
 *
 * Tronque par défaut à 500 chars pour éviter l'inflation de logs.
 */
export function sanitizeForLog(message: string, maxLen = 500): string {
	return message
		.slice(0, maxLen)
		.replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]')
		.replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
		.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
		.replace(/\bre_[a-zA-Z0-9]{20,}/g, '[REDACTED_RESEND_KEY]')
		.replace(
			/(api[_-]?key|token|secret|apikey)\s*[:=]\s*[a-zA-Z0-9_\-.]+/gi,
			'$1=[REDACTED]'
		);
}

/**
 * Sanitize une erreur arbitraire (Error ou autre) pour log stdout.
 * Préfixe la cause si dispo. Stringify safely.
 */
export function sanitizeError(e: unknown, maxLen = 500): string {
	if (e instanceof Error) {
		return sanitizeForLog(e.message, maxLen);
	}
	try {
		return sanitizeForLog(String(e), maxLen);
	} catch {
		return '[unserializable error]';
	}
}
