import { describe, it, expect } from 'vitest';
import {
	PAGE_W,
	PAGE_H,
	COLS,
	ROWS,
	PER_PAGE,
	GEOMETRY,
	pageCount,
	layoutEtiquettes,
	labelLines,
	buildEtiquettesPagesSvg,
	estWidth,
	ellipsize,
	wrapToWidth,
	etiquettesFileName
} from './pdf-etiquettes';
import type { EtiquetteEntry } from './prospect-etiquette';

function entry(p: Partial<EtiquetteEntry> = {}): EtiquetteEntry {
	return { nom: p.nom ?? 'Régie Léman SA', rue: p.rue ?? 'Rue du Rhône 100', cpVille: p.cpVille ?? '1204 Genève' };
}
function entries(n: number): EtiquetteEntry[] {
	return Array.from({ length: n }, (_, i) => entry({ nom: `Société ${i + 1}` }));
}

describe('géométrie Avery 6122', () => {
	it('la grille remplit l’A4 (3 × 70 mm = pleine largeur, 5 + 8 × 36 + 4 = hauteur)', () => {
		expect(COLS).toBe(3);
		expect(ROWS).toBe(8);
		expect(PER_PAGE).toBe(24);
		expect(COLS * GEOMETRY.LABEL_W).toBeCloseTo(PAGE_W, 1);
		expect(GEOMETRY.MARGIN_TOP + ROWS * GEOMETRY.LABEL_H).toBeCloseTo(PAGE_H - 4 * 2.834645, 1);
	});
});

describe('pageCount', () => {
	it('0 page pour 0 adresse, puis 1 page par tranche de 24', () => {
		expect(pageCount(0)).toBe(0);
		expect(pageCount(1)).toBe(1);
		expect(pageCount(24)).toBe(1);
		expect(pageCount(25)).toBe(2);
		expect(pageCount(48)).toBe(2);
		expect(pageCount(49)).toBe(3);
	});
});

describe('layoutEtiquettes', () => {
	it('pagine en pages de 24, dernière page partielle conservée', () => {
		const { pages } = layoutEtiquettes(entries(25));
		expect(pages.length).toBe(2);
		expect(pages[0].length).toBe(24);
		expect(pages[1].length).toBe(1); // cellules vides simplement absentes
	});

	it('col 0..2 et row 0..7 dans le bon ordre (gauche→droite, haut→bas)', () => {
		const { pages } = layoutEtiquettes(entries(24));
		const p = pages[0];
		expect(p[0]).toMatchObject({ col: 0, row: 0 });
		expect(p[1]).toMatchObject({ col: 1, row: 0 });
		expect(p[2]).toMatchObject({ col: 2, row: 0 });
		expect(p[3]).toMatchObject({ col: 0, row: 1 });
		expect(p[23]).toMatchObject({ col: 2, row: 7 });
		for (const lab of p) {
			expect(lab.col).toBeGreaterThanOrEqual(0);
			expect(lab.col).toBeLessThan(COLS);
			expect(lab.row).toBeGreaterThanOrEqual(0);
			expect(lab.row).toBeLessThan(ROWS);
		}
	});

	it('chaque cellule reste DANS la page A4', () => {
		const { pages } = layoutEtiquettes(entries(24));
		for (const lab of pages[0]) {
			expect(lab.cellX).toBeGreaterThanOrEqual(0);
			expect(lab.cellX + GEOMETRY.LABEL_W).toBeLessThanOrEqual(PAGE_W + 0.01);
			expect(lab.cellY).toBeGreaterThanOrEqual(0);
			expect(lab.cellY + GEOMETRY.LABEL_H).toBeLessThanOrEqual(PAGE_H + 0.01);
		}
	});

	it('texte centré H (axe central) et lignes DANS la cellule (V)', () => {
		const { pages } = layoutEtiquettes(entries(6));
		for (const lab of pages[0]) {
			expect(lab.centerX).toBeCloseTo(lab.cellX + GEOMETRY.LABEL_W / 2, 5);
			for (const ln of lab.lines) {
				// baseline strictement dans les bornes verticales de la cellule
				expect(ln.baseline).toBeGreaterThan(lab.cellY);
				expect(ln.baseline).toBeLessThan(lab.cellY + GEOMETRY.LABEL_H);
			}
		}
	});

	it('chaque ligne tient dans la largeur utile (noms et rues très longs inclus)', () => {
		const longues = [
			entry({
				nom: 'Régie Immobilière du Grand Genève et de la Côte Lémanique Réunies SA',
				rue: 'Avenue de la Praille et des Acacias 123bis, Bâtiment C, 4e étage',
				cpVille: '1227 Carouge'
			}),
			entry({ nom: 'Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', rue: '', cpVille: '' })
		];
		const { pages } = layoutEtiquettes(longues);
		for (const lab of pages[0]) {
			for (const ln of lab.lines) {
				expect(ln.estWidth).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
			}
		}
	});

	it('NOM en gras, lignes d’adresse en normal', () => {
		const { pages } = layoutEtiquettes([entry()]);
		const lines = pages[0][0].lines;
		expect(lines[0].bold).toBe(true); // nom
		expect(lines.slice(1).every((l) => l.bold === false)).toBe(true);
	});
});

describe('labelLines', () => {
	it('omet les lignes vides (rue/ville absentes)', () => {
		expect(labelLines({ nom: 'Boutique X', rue: '', cpVille: '' }).map((l) => l.text)).toEqual(['Boutique X']);
		expect(labelLines({ nom: 'Boutique X', rue: '', cpVille: '1003 Lausanne' }).map((l) => l.text)).toEqual([
			'Boutique X',
			'1003 Lausanne'
		]);
	});

	it('un nom long passe sur 2 lignes max', () => {
		const lines = labelLines({
			nom: 'Régie Immobilière du Grand Genève et de la Côte Lémanique Réunies SA',
			rue: 'Rue Test 1',
			cpVille: '1200 Genève'
		});
		const nomLines = lines.filter((l) => l.bold);
		expect(nomLines.length).toBeLessThanOrEqual(2);
		expect(nomLines.length).toBeGreaterThanOrEqual(1);
	});
});

describe('helpers texte', () => {
	it('estWidth croît avec la longueur et la taille', () => {
		expect(estWidth('ab', 10)).toBeLessThan(estWidth('abcd', 10));
		expect(estWidth('abcd', 9)).toBeLessThan(estWidth('abcd', 12));
	});

	it('ellipsize ne touche pas une chaîne courte et borne une longue', () => {
		expect(ellipsize('Court', 10, 1000)).toBe('Court');
		const e = ellipsize('Une chaîne vraiment beaucoup trop longue pour cette étiquette', 10, 60);
		expect(e.endsWith('…')).toBe(true);
		expect(estWidth(e, 10)).toBeLessThanOrEqual(60);
	});

	it('wrapToWidth borne le nombre de lignes et conserve la largeur', () => {
		const lines = wrapToWidth('mot1 mot2 mot3 mot4 mot5 mot6 mot7 mot8', 10, 50, 2);
		expect(lines.length).toBeLessThanOrEqual(2);
		for (const l of lines) expect(estWidth(l, 10)).toBeLessThanOrEqual(50);
	});
});

describe('buildEtiquettesPagesSvg', () => {
	it('produit 1 SVG par page A4 avec fond blanc', () => {
		const svgs = buildEtiquettesPagesSvg(entries(25));
		expect(svgs.length).toBe(2);
		for (const s of svgs) {
			expect(s.startsWith('<svg')).toBe(true);
			expect(s).toContain('fill="#ffffff"');
			expect(s).toContain(`viewBox="0 0 ${Number(PAGE_W.toFixed(2))} ${Number(PAGE_H.toFixed(2))}"`);
		}
	});

	it('rend le texte avec accents préservés et échappe le XML', () => {
		const svgs = buildEtiquettesPagesSvg([entry({ nom: 'Régie & Cie <SA>', rue: 'Rue de l’Évêché 2', cpVille: '1950 Sion' })]);
		expect(svgs[0]).toContain('Régie &amp; Cie &lt;SA&gt;');
		expect(svgs[0]).toContain('Rue de l’Évêché 2');
		expect(svgs[0]).toContain('font-weight="700"'); // nom gras
		expect(svgs[0]).toContain('text-anchor="middle"'); // centré
	});

	it('normalise le tiret long en tiret court (typo FR)', () => {
		const svgs = buildEtiquettesPagesSvg([entry({ nom: 'Boutique — Léman' })]);
		expect(svgs[0]).toContain('Boutique - Léman');
		expect(svgs[0]).not.toContain('—');
	});

	it('aucune option guide par défaut, mais traçable en QA', () => {
		expect(buildEtiquettesPagesSvg([entry()])[0]).not.toContain('stroke="#E5E7EB"');
		expect(buildEtiquettesPagesSvg([entry()], { guides: true })[0]).toContain('stroke="#E5E7EB"');
	});

	it('liste vide -> aucune page', () => {
		expect(buildEtiquettesPagesSvg([])).toEqual([]);
	});
});

describe('etiquettesFileName', () => {
	it('slugifie le libellé de campagne', () => {
		expect(etiquettesFileName('Salon Habitat 2026')).toBe('etiquettes-salon-habitat-2026.pdf');
		expect(etiquettesFileName('Régies — Genève')).toBe('etiquettes-regies-geneve.pdf');
		expect(etiquettesFileName('   ')).toBe('etiquettes-campagne.pdf');
	});
});
