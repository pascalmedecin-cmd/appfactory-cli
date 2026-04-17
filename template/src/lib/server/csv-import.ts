/**
 * Import CSV : parser RFC 4180 (state-machine, gère guillemets doublés
 * et LF/CRLF intégrés). Utilisé par scripts/import-csv.ts.
 *
 * Pas de dépendance externe — parseur ~100 lignes suffisant pour les
 * volumes d'import CRM (milliers de lignes max).
 */

/** Strip optionnel BOM UTF-8 en tête de fichier. */
export function stripBom(s: string): string {
	return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * Parse une chaîne CSV conforme RFC 4180 et retourne un tableau de lignes
 * (chaque ligne = tableau de cellules string, cells vides préservées).
 */
export function parseCsv(input: string): string[][] {
	const src = stripBom(input);
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let i = 0;
	let inQuotes = false;

	while (i < src.length) {
		const ch = src[i];

		if (inQuotes) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					// Guillemet doublé → guillemet littéral.
					cell += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			cell += ch;
			i++;
			continue;
		}

		if (ch === '"' && cell === '') {
			inQuotes = true;
			i++;
			continue;
		}

		if (ch === ',') {
			row.push(cell);
			cell = '';
			i++;
			continue;
		}

		if (ch === '\r') {
			// Swallow CR; le \n suivant (ou non) clôt la ligne.
			if (src[i + 1] === '\n') i++;
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
			i++;
			continue;
		}

		if (ch === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
			i++;
			continue;
		}

		cell += ch;
		i++;
	}

	// Dernière cellule / ligne (pas de trailing newline).
	if (cell !== '' || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}

	return rows;
}

/**
 * Convertit les lignes CSV en objets : la première ligne = headers (clés),
 * les suivantes = valeurs. Normalise les clés (lowercase, espaces → _).
 */
export function csvToObjects(rows: string[][]): Record<string, string>[] {
	if (rows.length < 2) return [];
	const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
	return rows.slice(1).map((r) => {
		const obj: Record<string, string> = {};
		headers.forEach((h, idx) => {
			obj[h] = (r[idx] ?? '').trim();
		});
		return obj;
	});
}

export interface ImportLineError {
	line: number; // 1-based, header = 1
	errors: string[];
	raw: Record<string, string>;
}

export interface ImportResult<T> {
	ok: T[];
	errors: ImportLineError[];
	total: number;
}

/**
 * Shape minimale d'un schema Zod (v3 ou v4) consommable par validateRows.
 * Typage volontairement permissif pour rester neutre vs version Zod.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ValidationSchema<T> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	safeParse: (v: unknown) => any;
}

/**
 * Valide chaque ligne d'un CSV contre un schema Zod (parsé via
 * safeParse). Retourne ok + errors + total. N'insère rien — séparation
 * parse ↔ persist pour faciliter `--dry-run` et preview.
 */
export function validateRows<T>(
	rows: Record<string, string>[],
	schema: ValidationSchema<T>
): ImportResult<T> {
	const ok: T[] = [];
	const errors: ImportLineError[] = [];
	rows.forEach((row, idx) => {
		const result = schema.safeParse(row);
		if (result.success && result.data) {
			ok.push(result.data as T);
		} else {
			const issues: Array<{ path?: PropertyKey[]; message?: string }> =
				result.error?.issues ?? [];
			const msgs = issues.length
				? issues.map((iss) => `${(iss.path ?? []).join('.')}: ${iss.message ?? 'invalid'}`)
				: ['validation failed'];
			errors.push({ line: idx + 2, errors: msgs, raw: row });
		}
	});
	return { ok, errors, total: rows.length };
}
