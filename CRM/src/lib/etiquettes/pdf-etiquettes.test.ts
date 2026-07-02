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
	layoutEtiquettesItems,
	transitionFontSize,
	labelLines,
	buildEtiquettesPagesSvg,
	buildEtiquettesItemsPagesSvg,
	estWidth,
	ellipsize,
	wrapToWidth,
	etiquettesFileName,
	type EtiquetteItem
} from './pdf-etiquettes';
import { measureOutfitBold } from './outfit-metrics';
import type { EtiquetteEntry } from './prospect-etiquette';

function entry(p: Partial<EtiquetteEntry> = {}): EtiquetteEntry {
	return {
		nom: p.nom ?? 'Régie Léman SA',
		...(p.destinataire ? { destinataire: p.destinataire } : {}),
		rue: p.rue ?? 'Rue du Rhône 100',
		cpVille: p.cpVille ?? '1204 Genève'
	};
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

	it('étiquette PLEINE (nom 2 lignes + destinataire + rue + cp/ville) reste DANS la cellule', () => {
		const pleine = entry({
			nom: 'Régie Immobilière du Grand Genève et de la Côte Lémanique Réunies SA', // force 2 lignes
			destinataire: 'Service technique, Mme Bianchi',
			rue: 'Boulevard Georges-Favon 14',
			cpVille: '1204 Genève'
		});
		const { pages } = layoutEtiquettes([pleine]);
		const lab = pages[0][0];
		// Au plus 5 lignes (2 nom + 1 dest + 1 rue + 1 cp/ville) et jamais de débordement vertical.
		expect(lab.lines.length).toBeLessThanOrEqual(5);
		for (const ln of lab.lines) {
			expect(ln.baseline).toBeGreaterThan(lab.cellY);
			expect(ln.baseline).toBeLessThan(lab.cellY + GEOMETRY.LABEL_H);
			expect(ln.estWidth).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
		}
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

	it('insère le destinataire SOUS le nom, avant l’adresse (non gras)', () => {
		const lines = labelLines({
			nom: 'Naef Immobilier SA',
			destinataire: 'Service technique, M. Roth',
			rue: 'Rue du Rhône 12',
			cpVille: '1204 Genève'
		});
		expect(lines.map((l) => l.text)).toEqual([
			'Naef Immobilier SA',
			'Service technique, M. Roth',
			'Rue du Rhône 12',
			'1204 Genève'
		]);
		expect(lines[0].bold).toBe(true); // nom gras
		expect(lines[1].bold).toBe(false); // destinataire non gras
	});

	it('destinataire absent ou vide -> aucune ligne destinataire', () => {
		expect(labelLines({ nom: 'X', rue: 'Rue 1', cpVille: '1200 Genève' }).map((l) => l.text)).toEqual([
			'X',
			'Rue 1',
			'1200 Genève'
		]);
		expect(labelLines({ nom: 'X', destinataire: '   ', rue: '', cpVille: '' }).map((l) => l.text)).toEqual(['X']);
	});

	it('destinataire tenu sur UNE ligne (ellipse si trop long)', () => {
		const lines = labelLines({
			nom: 'X',
			destinataire: 'Service technique et gérance immobilière, à l’attention de Monsieur Jean-Baptiste de la Tour du Pin',
			rue: 'Rue 1',
			cpVille: '1200 Genève'
		});
		const dest = lines[1];
		expect(dest.text.endsWith('…')).toBe(true);
		expect(estWidth(dest.text, dest.size)).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
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

describe('etiquettesFileName (convention explicite, décision Pascal 02/07)', () => {
	const d = new Date(2026, 6, 2); // 02.07.2026
	it('nom de campagne verbatim + date du jour, tiret long normalisé', () => {
		expect(etiquettesFileName('Salon Habitat 2026', d)).toBe('Étiquettes - Salon Habitat 2026 - 02.07.2026.pdf');
		expect(etiquettesFileName('Régies — Genève', d)).toBe('Étiquettes - Régies - Genève - 02.07.2026.pdf');
		expect(etiquettesFileName('   ', d)).toBe('Étiquettes - Campagne - 02.07.2026.pdf');
	});
});

// ===== Étiquettes de TRANSITION (intercalaires de groupe, 2026-07-02) ===========================

/** Noms réalistes ≤ 24 chars (borne CRM stress-testée) : tous doivent rester à 15 pt pleins. */
const NOMS_REALISTES = [
	'Régies immobilières',
	'Facility management',
	'Entreprises générales',
	'Architectes & designers',
	'Administration publique',
	'Bureaux d’études',
	'Sécurité bâtiment',
	'Commerces',
	'CVC / HVAC'
];

describe('transitionFontSize (fit-to-width par avances réelles Outfit Bold)', () => {
	it('15 pt plein pour tous les noms réalistes ≤ 24 caractères (stress test 2026-07-02)', () => {
		for (const nom of NOMS_REALISTES) {
			expect(nom.length).toBeLessThanOrEqual(24);
			expect(transitionFontSize(nom), nom).toBe(15);
		}
	});

	it('un nom dégénéré (24 lettres larges) est RÉTRÉCI, jamais tronqué ni débordant', () => {
		const degenere = 'M'.repeat(24);
		const size = transitionFontSize(degenere);
		expect(size).toBeLessThan(15);
		expect(size).toBeGreaterThan(8); // plancher théorique ~8.5 pt (24 « M » à 0.858 em)
		expect(measureOutfitBold(degenere, size)).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
	});

	it('stress : AUCUNE chaîne ≤ 24 chars ne déborde la cellule (y compris caractères inconnus)', () => {
		const alphabets = ['W', 'M', '@', '€', 'Æ', 'm', 'É', ' ', '-'];
		for (let len = 1; len <= 24; len++) {
			for (const ch of alphabets) {
				const nom = ch.repeat(len);
				const size = transitionFontSize(nom);
				expect(measureOutfitBold(nom, size), `« ${ch} » × ${len}`).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
			}
		}
	});
});

describe('layoutEtiquettesItems (flux continu adresses + intercalaires)', () => {
	const mixed = (nAvant: number, nApres: number): EtiquetteItem[] => [
		{ kind: 'transition', nom: 'Régies' },
		...entries(nAvant).map((entry) => ({ kind: 'adresse', entry }) as EtiquetteItem),
		{ kind: 'transition', nom: 'Sans groupe' },
		...entries(nApres).map((entry) => ({ kind: 'adresse', entry }) as EtiquetteItem)
	];

	it('un intercalaire occupe EXACTEMENT 1 cellule : aucune cellule perdue, indexes continus', () => {
		const items = mixed(12, 14); // 2 transitions + 26 adresses = 28 cellules
		const { pages } = layoutEtiquettesItems(items);
		expect(pages.length).toBe(2);
		expect(pages[0].length).toBe(24);
		expect(pages[1].length).toBe(4);
		const indexes = pages.flat().map((p) => p.index);
		expect(indexes).toEqual(Array.from({ length: 28 }, (_, i) => i)); // flux continu, zéro trou
	});

	it('l’intercalaire = 1 ligne grasse, marquée kind:transition, dans les bornes de sa cellule', () => {
		const { pages } = layoutEtiquettesItems(mixed(2, 0));
		const t = pages[0][0];
		expect(t.kind).toBe('transition');
		expect(t.lines).toHaveLength(1);
		expect(t.lines[0].bold).toBe(true);
		expect(t.lines[0].size).toBe(15);
		expect(t.lines[0].estWidth).toBeLessThanOrEqual(GEOMETRY.USABLE_W);
		// La ligne vit dans sa cellule (baseline entre bord haut et bord bas).
		expect(t.lines[0].baseline).toBeGreaterThan(t.cellY);
		expect(t.lines[0].baseline).toBeLessThan(t.cellY + GEOMETRY.LABEL_H);
	});

	it('layoutEtiquettes (API historique) = layoutEtiquettesItems en adresses seules', () => {
		const es = entries(30);
		const viaItems = layoutEtiquettesItems(es.map((entry) => ({ kind: 'adresse', entry })));
		expect(layoutEtiquettes(es)).toEqual(viaItems);
	});
});

describe('buildEtiquettesItemsPagesSvg (rendu intercalaires)', () => {
	it('rend le nom du groupe en gras 15 pt centré, fond blanc (ni sombre ni inversé)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([
			{ kind: 'transition', nom: 'Régies immobilières' },
			{ kind: 'adresse', entry: entry() }
		]);
		expect(svgs).toHaveLength(1);
		expect(svgs[0]).toContain('Régies immobilières');
		expect(svgs[0]).toContain('font-size="15"');
		expect(svgs[0]).toContain('font-weight="700"');
		// Un seul rect = le fond de page blanc : l'intercalaire n'ajoute AUCUN aplat (pas d'inversé).
		expect(svgs[0].match(/<rect/g)?.length).toBe(1);
		expect(svgs[0]).toContain('fill="#ffffff"');
	});

	it('échappe le XML du nom de groupe (saisie utilisateur)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([{ kind: 'transition', nom: 'R&D <Vitrages>' }]);
		expect(svgs[0]).toContain('R&amp;D &lt;Vitrages&gt;');
	});

	it('retire les caractères de contrôle illégaux XML (audit sécu 2026-07-02 : un C0 cassait le DOMParser)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([{ kind: 'transition', nom: 'AB\u0001CD\u009FEF' }]);
		expect(svgs[0]).toContain('>ABCDEF</text>');
		// Le SVG reste parseable en XML strict (c'est ce que l'export fait avant svg2pdf).
		expect(svgs[0]).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/);
	});
});
