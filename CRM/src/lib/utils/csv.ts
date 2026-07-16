/**
 * Parseur CSV/TSV pur (RFC 4180), partagé client + serveur.
 *
 * Extrait de `src/lib/server/csv-import.ts` (Run 3 Atelier 209) pour être importable côté
 * CLIENT (la modale d'import de liste parse le fichier dans le navigateur avant de POSTer les
 * lignes + le mapping ; le serveur re-valide/dé-duplique/score/insère). Zéro dépendance,
 * zéro accès serveur : pure manipulation de chaînes. `csv-import.ts` ré-exporte ces fonctions
 * pour ne pas casser ses consommateurs existants.
 *
 * Gère : guillemets doublés RFC 4180, LF/CRLF intégrés dans un champ quoté, BOM UTF-8,
 * et 3 délimiteurs (`,` `;` `\t`) — l'européen exporte souvent en `;`, les scrapes en `,`,
 * les copier-coller de tableur en `\t`. Le délimiteur est auto-détecté sur la 1re ligne.
 */

/** Strip optionnel BOM UTF-8 en tête de fichier. */
export function stripBom(s: string): string {
	return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const DELIMITERS = [',', ';', '\t'] as const;
export type CsvDelimiter = (typeof DELIMITERS)[number];

/**
 * Détecte le délimiteur d'un CSV à partir de sa 1re ligne (en-têtes) : compte les occurrences
 * de `,` `;` `\t` HORS guillemets et retient le plus fréquent. Égalité / aucune occurrence →
 * `,` (défaut sûr, rétro-compatible avec l'ancien parseur comma-only).
 */
export function detectDelimiter(input: string): CsvDelimiter {
	const src = stripBom(input);
	// 1re ligne logique (respecte les guillemets : un \n quoté n'termine pas la ligne).
	let line = '';
	let inQuotes = false;
	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (ch === '"') {
			if (inQuotes && src[i + 1] === '"') { line += '""'; i++; continue; }
			inQuotes = !inQuotes;
			line += ch;
			continue;
		}
		if (!inQuotes && (ch === '\n' || ch === '\r')) break;
		line += ch;
	}
	// Comptage hors guillemets.
	const counts: Record<CsvDelimiter, number> = { ',': 0, ';': 0, '\t': 0 };
	inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') { inQuotes = !inQuotes; continue; }
		if (inQuotes) continue;
		if (ch === ',' || ch === ';' || ch === '\t') counts[ch]++;
	}
	let best: CsvDelimiter = ',';
	for (const d of DELIMITERS) if (counts[d] > counts[best]) best = d;
	return best;
}

/**
 * Parse une chaîne CSV/TSV (RFC 4180) → tableau de lignes (chaque ligne = tableau de cellules,
 * cellules vides préservées). `delimiter` auto-détecté si omis.
 */
export function parseCsv(input: string, delimiter?: CsvDelimiter): string[][] {
	const src = stripBom(input);
	const sep = delimiter ?? detectDelimiter(src);
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

		if (ch === sep) {
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
 * Convertit les lignes CSV en objets : la première ligne = headers (clés), les suivantes =
 * valeurs. Normalise les clés (lowercase, espaces → _). Conservé pour `scripts/import-csv.ts`
 * et les tests existants ; la modale d'import de liste, elle, garde les en-têtes bruts pour le
 * mapping assisté (cf. `import-mapping.ts`).
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
