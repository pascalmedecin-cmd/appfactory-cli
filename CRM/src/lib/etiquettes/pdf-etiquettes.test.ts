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
	transitionLayout,
	labelLayout,
	buildEtiquettesPagesSvg,
	buildEtiquettesItemsPagesSvg,
	estWidth,
	ellipsize,
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
		expect(lines[0].weight).toBe(700); // nom
		expect(lines.slice(1).every((l) => l.weight === 400)).toBe(true);
	});

	it('étiquette PLEINE (nom multi-lignes + destinataire + rue + cp/ville) reste DANS la cellule', () => {
		const pleine = entry({
			nom: 'Régie Immobilière du Grand Genève et de la Côte Lémanique Réunies SA', // force le wrap
			destinataire: 'Service technique, Mme Bianchi',
			rue: 'Boulevard Georges-Favon 14',
			cpVille: '1204 Genève'
		});
		const { pages } = layoutEtiquettes([pleine]);
		const lab = pages[0][0];
		// Jamais de débordement (le fitting réduit la police si le bloc est trop haut).
		for (const ln of lab.lines) {
			expect(ln.baseline).toBeGreaterThan(lab.cellY);
			expect(ln.baseline).toBeLessThan(lab.cellY + GEOMETRY.LABEL_H);
			expect(ln.estWidth).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
		}
	});
});

describe('labelLayout (règle « jamais tronqué », Pascal 2026-07-03)', () => {
	/** Mots de tous les champs de l'entrée, dans l'ordre (référence d'intégrité du texte). */
	function wordsOf(e: EtiquetteEntry): string[] {
		return [e.nom, e.destinataire ?? '', e.rue, e.cpVille]
			.flatMap((s) => s.split(/\s+/))
			.filter(Boolean);
	}
	/** Invariants durs : texte INTÉGRAL (aucune ellipse), lignes ≤ USABLE_W, bloc ≤ hauteur utile. */
	function assertNoTruncation(e: EtiquetteEntry) {
		const { lines, lineH } = labelLayout(e);
		expect(lines.flatMap((l) => l.text.split(/\s+/)).filter(Boolean)).toEqual(wordsOf(e));
		for (const l of lines) {
			expect(l.text).not.toContain('…');
			expect(measureOutfitBold(l.text, l.size)).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
		}
		expect(lines.length * lineH).toBeLessThanOrEqual(
			GEOMETRY.LABEL_H - 2 * GEOMETRY.PAD_Y + 0.01
		);
	}

	it('omet les lignes vides (rue/ville absentes)', () => {
		expect(labelLayout({ nom: 'Boutique X', rue: '', cpVille: '' }).lines.map((l) => l.text)).toEqual(['Boutique X']);
		expect(labelLayout({ nom: 'Boutique X', rue: '', cpVille: '1003 Lausanne' }).lines.map((l) => l.text)).toEqual([
			'Boutique X',
			'1003 Lausanne'
		]);
	});

	it('insère le destinataire SOUS le nom, avant l’adresse (semi-gras 600)', () => {
		const { lines } = labelLayout({
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
		expect(lines[0].weight).toBe(700); // nom gras
		expect(lines[1].weight).toBe(600); // destinataire SEMI-GRAS (hiérarchie Pascal 2026-07-03)
		expect(lines.at(-1)?.weight).toBe(400); // adresse normale
	});

	it('destinataire absent ou vide -> aucune ligne destinataire', () => {
		expect(labelLayout({ nom: 'X', rue: 'Rue 1', cpVille: '1200 Genève' }).lines.map((l) => l.text)).toEqual([
			'X',
			'Rue 1',
			'1200 Genève'
		]);
		expect(labelLayout({ nom: 'X', destinataire: '   ', rue: '', cpVille: '' }).lines.map((l) => l.text)).toEqual(['X']);
	});

	it('régression PDF 03/07 : les noms tronqués du mailing réel sont rendus INTÉGRALEMENT', () => {
		// Cas verbatim du PDF « Mailing Commerces - Vernis solaire » livré avec « ... ».
		assertNoTruncation(entry({ nom: 'ACUITIS Opticien & Audioprothésiste Genève Centre' }));
		assertNoTruncation(entry({ nom: 'Fouchault l’Opticien : Montures originales et créateurs' }));
		assertNoTruncation(entry({ nom: 'Optic 2000 Choitel Corraterie - Opticien Genève' }));
	});

	it('régression PDF 03/07 : la rue longue « Avenue de la Gare des Eaux-Vives 10 » est rendue INTÉGRALEMENT', () => {
		assertNoTruncation(entry({ nom: 'HOOD Restaurant', rue: 'Avenue de la Gare des Eaux-Vives 10' }));
	});

	it('destinataire long : wrappé sur plusieurs lignes, jamais d’ellipse', () => {
		assertNoTruncation({
			nom: 'X',
			destinataire: 'Service technique et gérance immobilière, à l’attention de Monsieur Jean-Baptiste de la Tour du Pin',
			rue: 'Rue 1',
			cpVille: '1200 Genève'
		});
	});

	it('bloc trop haut aux tailles nominales -> police réduite (jamais tronqué)', () => {
		const dense: EtiquetteEntry = {
			nom: 'Régie Immobilière du Grand Genève et de la Côte Lémanique Réunies, succursale de Carouge SA',
			destinataire: 'Service technique et gérance, à l’attention de Madame la Directrice générale adjointe',
			rue: 'Avenue de la Praille et des Acacias 123bis, Bâtiment C, 4e étage, porte 12',
			cpVille: '1227 Carouge (Genève)'
		};
		assertNoTruncation(dense);
		const { lines } = labelLayout(dense);
		// La tenue exige une réduction : au moins une ligne sous la taille nominale minimale (9,5).
		expect(Math.min(...lines.map((l) => l.size))).toBeLessThan(9.5);
	});

	it('fuzz déterministe : invariants tenus sur 200 entrées pseudo-aléatoires (mots dégénérés inclus)', () => {
		// LCG déterministe (pas de Math.random : reproductibilité des runs).
		let seed = 42;
		const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
		const alphabet = 'aàbcdeéèêfghiîjklmnoôpqrstuùûvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ&-\'0123456789';
		const word = () => {
			const len = 1 + Math.floor(rnd() * (rnd() < 0.05 ? 60 : 14)); // 5 % de mots dégénérés
			return Array.from({ length: len }, () => alphabet[Math.floor(rnd() * alphabet.length)]).join('');
		};
		const phrase = (maxWords: number) =>
			Array.from({ length: 1 + Math.floor(rnd() * maxWords) }, word).join(' ');
		for (let i = 0; i < 200; i++) {
			assertNoTruncation({
				nom: phrase(9),
				...(rnd() < 0.5 ? { destinataire: phrase(10) } : {}),
				rue: rnd() < 0.9 ? phrase(8) : '',
				cpVille: rnd() < 0.9 ? phrase(3) : ''
			});
		}
	});
});

describe('helpers texte (ellipse : réservée au PDF liste des prospects)', () => {
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

	it('destinataire rendu en famille Outfit-SemiBold dans le SVG (hiérarchie visuelle)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([
			{ kind: 'adresse', entry: entry({ destinataire: 'Service technique' }) }
		]);
		expect(svgs[0]).toContain('font-family="Outfit-SemiBold"');
		// Le nom reste en famille Outfit gras, l'adresse en Outfit normal.
		expect(svgs[0]).toContain('font-family="Outfit" font-size="10.5" font-weight="700"');
		expect(svgs[0]).toContain('font-family="Outfit" font-size="9.5" font-weight="400"');
	});

	it('normalise le tiret long en tiret court (typo FR)', () => {
		const svgs = buildEtiquettesPagesSvg([entry({ nom: 'Boutique — Léman' })]);
		expect(svgs[0]).toContain('Boutique - Léman');
		expect(svgs[0]).not.toContain('—');
	});

	it('aucun repère de cellule dans le SVG (l’aperçu = le PDF réel, plus de mode guides)', () => {
		expect(buildEtiquettesPagesSvg([entry()])[0]).not.toContain('stroke="#E5E7EB"');
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

/** Noms réalistes ≤ 24 chars (borne CRM stress-testée), rendus en CAPITALES depuis le 02/07. */
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

describe('transitionLayout (capitales + multi-lignes, fit-to-width par avances réelles)', () => {
	it('TOUS les noms réalistes ≤ 24 chars rendent à 15 pt pleins (wrap par mots si besoin)', () => {
		for (const nom of NOMS_REALISTES) {
			expect(nom.length).toBeLessThanOrEqual(24);
			const { lines, size } = transitionLayout(nom);
			expect(size, nom).toBe(15);
			expect(lines.length, nom).toBeLessThanOrEqual(2);
			for (const l of lines) {
				expect(measureOutfitBold(l, size), `${nom} / ${l}`).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
			}
		}
	});

	it('« Régies immobilières » -> 2 lignes CAPITALES 15 pt (exemple Pascal 02/07)', () => {
		expect(transitionLayout('Régies immobilières')).toEqual({ lines: ['RÉGIES', 'IMMOBILIÈRES'], size: 15 });
		expect(transitionLayout('Régies')).toEqual({ lines: ['RÉGIES'], size: 15 });
	});

	it('un MOT unique dégénéré (24 lettres larges, insécable) est rétréci, jamais tronqué', () => {
		const degenere = 'M'.repeat(24);
		const { lines, size } = transitionLayout(degenere);
		expect(lines).toEqual([degenere]); // pas de wrap possible
		expect(size).toBeLessThan(15);
		expect(size).toBeGreaterThan(8); // plancher théorique ~8.5 pt (24 « M » à 0.858 em)
		expect(measureOutfitBold(degenere, size)).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
	});

	it('stress : AUCUNE chaîne ≤ 24 chars ne déborde la cellule (largeur ET hauteur, wrap + capitales)', () => {
		const alphabets = ['W', 'M', '@', '€', 'Æ', 'm', 'é', '-', 'W ', 'M W '];
		for (let len = 1; len <= 24; len++) {
			for (const base of alphabets) {
				const nom = base.repeat(Math.ceil(len / base.length)).slice(0, len);
				const { lines, size } = transitionLayout(nom);
				for (const l of lines) {
					expect(measureOutfitBold(l, size), `« ${base} » × ${len} / ${l}`).toBeLessThanOrEqual(GEOMETRY.USABLE_W + 0.01);
				}
				// Le bloc tient TOUJOURS en hauteur dans la cellule (17 pt d'interligne).
				expect(lines.length * 17, `« ${base} » × ${len}`).toBeLessThanOrEqual(GEOMETRY.LABEL_H - 2 * GEOMETRY.PAD_Y);
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

	it('l’intercalaire = bloc gras CAPITALES marqué kind:transition, dans les bornes de sa cellule', () => {
		const { pages } = layoutEtiquettesItems(mixed(2, 0));
		const t = pages[0][0];
		expect(t.kind).toBe('transition');
		expect(t.lines).toHaveLength(1); // « RÉGIES » tient sur 1 ligne
		expect(t.lines[0].text).toBe('RÉGIES');
		expect(t.lines[0].weight).toBe(700);
		expect(t.lines[0].size).toBe(15);
		expect(t.lines[0].estWidth).toBeLessThanOrEqual(GEOMETRY.USABLE_W);
		// La ligne vit dans sa cellule (baseline entre bord haut et bord bas).
		expect(t.lines[0].baseline).toBeGreaterThan(t.cellY);
		expect(t.lines[0].baseline).toBeLessThan(t.cellY + GEOMETRY.LABEL_H);
	});

	it('intercalaire MULTI-LIGNES : chaque baseline reste dans la cellule', () => {
		const { pages } = layoutEtiquettesItems([{ kind: 'transition', nom: 'Régies immobilières' }]);
		const t = pages[0][0];
		expect(t.lines.map((l) => l.text)).toEqual(['RÉGIES', 'IMMOBILIÈRES']);
		for (const ln of t.lines) {
			expect(ln.size).toBe(15);
			expect(ln.baseline).toBeGreaterThan(t.cellY);
			expect(ln.baseline).toBeLessThan(t.cellY + GEOMETRY.LABEL_H);
		}
	});

	it('layoutEtiquettes (API historique) = layoutEtiquettesItems en adresses seules', () => {
		const es = entries(30);
		const viaItems = layoutEtiquettesItems(es.map((entry) => ({ kind: 'adresse', entry })));
		expect(layoutEtiquettes(es)).toEqual(viaItems);
	});
});

describe('buildEtiquettesItemsPagesSvg (rendu intercalaires)', () => {
	it('rend le nom du groupe en CAPITALES (accents préservés), gras 15 pt centré, fond blanc (ni sombre ni inversé)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([
			{ kind: 'transition', nom: 'Régies' },
			{ kind: 'adresse', entry: entry() }
		]);
		expect(svgs).toHaveLength(1);
		expect(svgs[0]).toContain('>RÉGIES</text>'); // capitales, demande Pascal 02/07
		expect(svgs[0]).not.toContain('>Régies</text>');
		expect(svgs[0]).toContain('font-size="15"');
		expect(svgs[0]).toContain('font-weight="700"');
		// Un seul rect = le fond de page blanc : l'intercalaire n'ajoute AUCUN aplat (pas d'inversé).
		expect(svgs[0].match(/<rect/g)?.length).toBe(1);
		expect(svgs[0]).toContain('fill="#ffffff"');
	});

	it('un nom long est WRAPPÉ en capitales 15 pt pleins (2 <text>), entier, sans ellipse', () => {
		const svgs = buildEtiquettesItemsPagesSvg([{ kind: 'transition', nom: 'Administration publique' }]);
		expect(svgs[0]).toContain('>ADMINISTRATION</text>');
		expect(svgs[0]).toContain('>PUBLIQUE</text>');
		expect(svgs[0]).toContain('font-size="15"');
		expect(svgs[0]).not.toContain('…');
	});

	it('échappe le XML du nom de groupe (saisie utilisateur)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([{ kind: 'transition', nom: 'R&D <Vitrages>' }]);
		expect(svgs[0]).toContain('R&amp;D &lt;VITRAGES&gt;');
	});

	it('retire les caractères de contrôle illégaux XML (audit sécu 2026-07-02 : un C0 cassait le DOMParser)', () => {
		const svgs = buildEtiquettesItemsPagesSvg([{ kind: 'transition', nom: 'AB\u0001CD\u009FEF' }]);
		expect(svgs[0]).toContain('>ABCDEF</text>');
		// Le SVG reste parseable en XML strict (c'est ce que l'export fait avant svg2pdf).
		expect(svgs[0]).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/);
	});
});
