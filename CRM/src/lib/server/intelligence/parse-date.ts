/**
 * Parse flexible d'une date émise par le LLM ou par une métadonnée HTML.
 * Accepte : YYYY-MM-DD, ISO 8601 complet, partielles YYYY-MM, YYYY.
 * Retourne null si non parsable ou année < 2000 (garde-fou contre dates absurdes).
 */
export function parseFlexibleDate(input: string | null | undefined): Date | null {
	if (!input || typeof input !== 'string') return null;
	const trimmed = input.trim();
	if (!trimmed) return null;

	// YYYY seul
	if (/^\d{4}$/.test(trimmed)) {
		const y = Number(trimmed);
		if (y < 2000 || y > 2100) return null;
		return new Date(Date.UTC(y, 0, 1));
	}

	// YYYY-MM
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m] = trimmed.split('-').map(Number);
		if (y < 2000 || m < 1 || m > 12) return null;
		return new Date(Date.UTC(y, m - 1, 1));
	}

	// YYYY-MM-DD ou ISO complet
	const d = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00Z`);
	if (isNaN(d.getTime())) return null;
	if (d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) return null;
	return d;
}

/**
 * Vérifie qu'une date tombe dans une fenêtre inclusive [start, end].
 * start et end sont au format YYYY-MM-DD ; on étend end à 23:59:59 UTC
 * pour inclure tout le dernier jour.
 */
export function isWithinWindow(
	date: Date,
	dateStart: string,
	dateEnd: string
): boolean {
	const start = parseFlexibleDate(dateStart);
	const end = parseFlexibleDate(dateEnd);
	if (!start || !end) return false;
	const endOfDay = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
	return date.getTime() >= start.getTime() && date.getTime() <= endOfDay.getTime();
}
