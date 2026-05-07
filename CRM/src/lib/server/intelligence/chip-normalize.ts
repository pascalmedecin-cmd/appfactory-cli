// Bloc 4 : Normalisation search_terms legacy (string) → chip structuré {kind, canton, query, label}.
// Objectif : rendre tous les items rétro-compat cliquables pour auto-exécution prospection.
// Heuristique volontairement conservative : SIMAP par défaut (seul API acceptant du texte libre).
//
// Phase F (Veille→Prospection) : RegBL ajouté pour permettre des chips ciblant des
// chantiers (permis de construire). Détecté uniquement sur indices forts (chantier,
// permis de construire, RegBL, EGID). Sinon SIMAP/Zefix par défaut, comportement legacy.

export type ChipKind = 'simap' | 'zefix' | 'regbl';
export type ChipCanton = 'GE' | 'VD' | 'VS' | 'NE' | 'FR' | 'JU';

export interface SearchChip {
	kind: ChipKind;
	canton: ChipCanton;
	query: string;
	label: string;
}

const CANTON_PATTERNS: Array<{ canton: ChipCanton; re: RegExp }> = [
	{ canton: 'GE', re: /\b(GE|Gen[eè]ve|Genevois)\b/i },
	{ canton: 'VD', re: /\b(VD|Vaud|Vaudois|Lausanne|Yverdon|Morges|Nyon|Renens|Vevey)\b/i },
	{ canton: 'VS', re: /\b(VS|Valais|Valaisan|Sion|Martigny|Monthey|Sierre)\b/i },
	{ canton: 'NE', re: /\b(NE|Neuch[aâ]tel(?:ois)?|La Chaux-de-Fonds|Le Locle)\b/i },
	{ canton: 'FR', re: /\b(FR|Fribourg(?:eois)?|Bulle|Ch[aâ]tel-St-Denis)\b/i },
	{ canton: 'JU', re: /\b(JU|Jura|Jurassien|Del[eé]mont|Porrentruy)\b/i }
];

const SIMAP_HINT = /\b(SIMAP|appel[s]?\s+d['’]?offres?|AO|march[eé]\s+public|adjudication|soumission)\b/i;
const ZEFIX_HINT = /\b(SA|S\.A\.|Sàrl|SARL|GmbH|AG|entreprise|raison\s+sociale|Zefix)\b/i;
const REGBL_HINT = /\b(RegBL|EGID|permis\s+de\s+construire|chantier|b[aâ]timent|construction\s+neuve|GWR)\b/i;

/**
 * Détecte le canton explicite dans une chaîne. Retourne null si aucun match.
 */
export function detectCanton(text: string): ChipCanton | null {
	for (const { canton, re } of CANTON_PATTERNS) {
		if (re.test(text)) return canton;
	}
	return null;
}

/**
 * Devine le kind SIMAP/Zefix/RegBL. SIMAP par défaut (seul API texte libre historique).
 * Zefix seulement si indices forts (SA/Sàrl/GmbH/AG...).
 * RegBL seulement si indices forts (chantier, permis de construire, EGID).
 */
export function detectKind(text: string): ChipKind {
	// RegBL prioritaire car ses indices sont les plus spécifiques (peu de faux positifs).
	if (REGBL_HINT.test(text)) return 'regbl';
	// Si SIMAP explicite ou indices d'appel d'offres → simap
	if (SIMAP_HINT.test(text)) return 'simap';
	// Si indices raison sociale entreprise → zefix
	if (ZEFIX_HINT.test(text)) return 'zefix';
	return 'simap';
}

/**
 * Normalise une string libre en chip structuré exécutable.
 * Canton par défaut : VD (canton FilmPro le plus actif, fallback sûr).
 */
export function normalizeStringToChip(text: string, fallbackCanton: ChipCanton = 'VD'): SearchChip {
	const trimmed = text.trim();
	const canton = detectCanton(trimmed) ?? fallbackCanton;
	const kind = detectKind(trimmed);
	// Query : on garde la string quasi brute, juste trim + collapse spaces.
	const query = trimmed.replace(/\s+/g, ' ');
	const label = buildChipLabel(kind, canton, query);
	return { kind, canton, query, label };
}

/**
 * Libellé affiché sur le chip UI : "SIMAP · VD · école rénovation vitrage".
 */
export function buildChipLabel(kind: ChipKind, canton: ChipCanton, query: string): string {
	const kindLabel = kind === 'simap' ? 'SIMAP' : kind === 'zefix' ? 'Zefix' : 'RegBL';
	const clipped = query.length > 80 ? query.slice(0, 77) + '…' : query;
	return `${kindLabel} · ${canton} · ${clipped}`;
}

/**
 * Normalise un tableau mixte (strings legacy + chips structurés) stocké en DB
 * en SearchChip[] garantis. Utilisé côté +page.server.ts /veille et item/[slug].
 */
export function normalizeStoredChips(raw: unknown): SearchChip[] {
	if (!Array.isArray(raw)) return [];
	const out: SearchChip[] = [];
	for (const entry of raw) {
		if (typeof entry === 'string') {
			out.push(normalizeStringToChip(entry));
			continue;
		}
		if (
			entry &&
			typeof entry === 'object' &&
			typeof (entry as SearchChip).kind === 'string' &&
			typeof (entry as SearchChip).canton === 'string' &&
			typeof (entry as SearchChip).query === 'string'
		) {
			const e = entry as SearchChip;
			out.push({
				kind: e.kind,
				canton: e.canton,
				query: e.query,
				label: e.label ?? buildChipLabel(e.kind, e.canton, e.query)
			});
		}
	}
	return out;
}
