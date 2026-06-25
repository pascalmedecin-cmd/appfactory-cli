/**
 * Export CSV : sérialisation conforme RFC 4180 (guillemets doublés,
 * LF intégrés, virgules protégées). Utilisé par les endpoints
 * /api/export/{contacts,entreprises,leads}.
 */

/**
 * Audit 360 M-21 : version du schéma d'export (nom + ordre des colonnes par
 * entité). Tout renommage/réordonnancement de colonne = incrémenter ce numéro.
 * Exposé via le header HTTP `X-Export-Schema-Version` uniquement — PAS dans le
 * corps CSV (une ligne `# ...` en tête décalerait la ligne d'en-tête pour les
 * parseurs naïfs : ni Excel ni pandas ne traitent `#` comme un commentaire CSV).
 */
export const EXPORT_SCHEMA_VERSION = 2;

export interface CsvColumn<T> {
	/** Clé de l'objet source. */
	key: keyof T;
	/** Label colonne exporté (1ère ligne CSV). */
	label: string;
	/** Optionnel : transformation (ex: formater date ISO, joindre tags). */
	transform?: (value: unknown, row: T) => string;
}

/**
 * Caractères qui déclenchent l'évaluation d'une formule dans Excel/LibreOffice
 * lorsqu'ils ouvrent la 1ʳᵉ position d'une cellule. La cellule est alors préfixée
 * par une apostrophe (`'`) qui force l'interprétation en texte.
 *
 * Réf : OWASP « CSV Injection » (formula injection). Vector confirmé par audit
 * 360 finding C-04 (cross-source bug-hunter + security-auditor).
 */
const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

/** Échappe une valeur pour inclusion dans une cellule CSV (RFC 4180). Exporté pour tests. */
export function escapeCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	let s = String(value);
	// Mitigation CSV/formula injection : neutraliser AVANT le quoting RFC 4180.
	if (FORMULA_TRIGGER_RE.test(s)) {
		s = `'${s}`;
	}
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
	// Audit 360 M-21 : version du schéma d'export (source canonique).
	headers.set('X-Export-Schema-Version', String(EXPORT_SCHEMA_VERSION));
	return headers;
}
