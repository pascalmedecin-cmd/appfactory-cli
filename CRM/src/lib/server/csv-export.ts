/**
 * Export CSV : sérialisation conforme RFC 4180 (guillemets doublés,
 * LF intégrés, virgules protégées). Utilisé par les endpoints
 * /api/export/{contacts,entreprises,leads}.
 */

export interface CsvColumn<T> {
	/** Clé de l'objet source. */
	key: keyof T;
	/** Label colonne exporté (1ère ligne CSV). */
	label: string;
	/** Optionnel : transformation (ex: formater date ISO, joindre tags). */
	transform?: (value: unknown, row: T) => string;
}

/** Échappe une valeur pour inclusion dans une cellule CSV (RFC 4180). Exporté pour tests. */
export function escapeCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const s = String(value);
	// Quote si virgule, guillemet, CR ou LF.
	if (/[",\r\n]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

/**
 * Sérialise une liste d'enregistrements en CSV.
 * Séparateur = `,`, terminator = `\r\n` (compat Excel), header obligatoire.
 */
export function toCsv<T extends Record<string, unknown>>(
	rows: T[],
	columns: CsvColumn<T>[]
): string {
	const lines: string[] = [];
	// Header
	lines.push(columns.map((c) => escapeCell(c.label)).join(','));
	// Data
	for (const row of rows) {
		const cells = columns.map((c) => {
			const raw = row[c.key];
			const formatted = c.transform ? c.transform(raw, row) : raw;
			return escapeCell(formatted);
		});
		lines.push(cells.join(','));
	}
	return lines.join('\r\n');
}

/** Nom de fichier timestampé pour un export (ex: contacts-2026-04-17.csv). */
export function csvFilename(entity: string, now: Date = new Date()): string {
	const iso = now.toISOString().slice(0, 10);
	return `${entity}-${iso}.csv`;
}

/** Entêtes HTTP standard pour réponse CSV téléchargeable. */
export function csvResponseHeaders(filename: string): Headers {
	const headers = new Headers();
	headers.set('Content-Type', 'text/csv; charset=utf-8');
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);
	return headers;
}
