import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Oracle déterministe Vague 4b (palette prospection -deep, audit live LIVE-H4).
 *
 * Indépendant du rendu : lit directement les tokens de `src/app.css` et calcule le
 * contraste WCAG des variantes `-deep` (texte) sur leur fond pâle `-bg` ET sur blanc.
 * Complète le gate Playwright `tests/vague2-a11y.test.ts` (qui dépend des pages
 * rendues + données seedées) en verrouillant la calibration des tokens eux-mêmes :
 * si un `-deep` est ré-édité vers une valeur sous AA, ce test échoue.
 *
 * Décision design : les teintes vives passent sous AA 4.5:1 en TEXTE sur fond pâle
 * de même teinte ; les `-deep` assombrissent jusqu'à AA pour les usages TEXTE.
 */

const AA_TEXT = 4.5;

function srgbToLinear(channel: number): number {
	const c = channel / 255;
	return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
	const h = hex.replace('#', '');
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
	const l1 = relativeLuminance(fg) + 0.05;
	const l2 = relativeLuminance(bg) + 0.05;
	return Math.max(l1, l2) / Math.min(l1, l2);
}

const cssPath = fileURLToPath(new URL('../app.css', import.meta.url));
const css = readFileSync(cssPath, 'utf-8');

/** Extrait toutes les définitions `--color-<name>: #rrggbb;` de app.css. */
function readTokens(): Record<string, string> {
	const tokens: Record<string, string> = {};
	const re = /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(css)) !== null) tokens[m[1]] = m[2].toLowerCase();
	return tokens;
}

const tokens = readTokens();

// Bases de la palette « prospection workflow » qui exposent une variante -deep.
const PALETTE_BASES = [
	'prosp-import',
	'prosp-enrich',
	'prosp-qualify',
	'prosp-convert',
	'prosp-place',
	'tab-regbl'
];

describe('Vague 4b — variantes -deep de la palette prospection (contraste AA texte)', () => {
	it('expose un -deep + un -bg pour chaque base attendue', () => {
		for (const base of PALETTE_BASES) {
			expect(tokens[`${base}-deep`], `--color-${base}-deep défini`).toMatch(/^#[0-9a-f]{6}$/);
			expect(tokens[`${base}-bg`], `--color-${base}-bg défini`).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	for (const base of PALETTE_BASES) {
		it(`${base}-deep atteint AA sur son -bg et sur blanc`, () => {
			const deep = tokens[`${base}-deep`];
			const bg = tokens[`${base}-bg`];
			const onBg = contrastRatio(deep, bg);
			const onWhite = contrastRatio(deep, '#ffffff');
			expect(onBg, `${base}-deep ${deep} sur -bg ${bg} = ${onBg.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT);
			expect(onWhite, `${base}-deep ${deep} sur blanc = ${onWhite.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT);
		});
	}

	// Baseline qui justifie la migration : au moins une teinte vive échouait l'AA en texte
	// sur son fond pâle (sinon le -deep serait inutile). Garde anti-régression de l'intention.
	it('au moins une teinte vive échouait AA sur son -bg (la migration était nécessaire)', () => {
		const failing = PALETTE_BASES.filter((base) => {
			const vivid = tokens[base];
			const bg = tokens[`${base}-bg`];
			return vivid && bg && contrastRatio(vivid, bg) < AA_TEXT;
		});
		expect(failing.length, `bases dont le vif échoue sur -bg: ${failing.join(', ')}`).toBeGreaterThan(0);
	});
});
