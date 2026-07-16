/**
 * Import CSV : validation par-ligne contre un schéma Zod (dry-run / preview).
 *
 * Le parseur RFC 4180 lui-même (`stripBom`/`parseCsv`/`csvToObjects`) vit désormais dans
 * `$lib/utils/csv.ts` (pur, importable côté client) et est ré-exporté ci-dessous pour ne pas
 * casser `scripts/import-csv.ts` ni les consommateurs/tests existants.
 */

export { stripBom, parseCsv, csvToObjects, detectDelimiter } from '$lib/utils/csv';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural type minimal, neutre
// vis-à-vis de la version de Zod (v3/v4) : la forme exacte de `safeParse` diffère (audit 360 V3b L-20).
export interface ValidationSchema<T> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- retour `safeParse` typé en interne
	// par chaque schéma Zod concret ; ici on reste générique (audit 360 V3b L-20).
	safeParse: (v: unknown) => any;
}

/**
 * Valide chaque ligne d'un CSV contre un schema Zod (parsé via
 * safeParse). Retourne ok + errors + total. N'insère rien : séparation
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
