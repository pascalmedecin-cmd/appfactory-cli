/**
 * Tests du MOTEUR DE FLUX de l'export PDF Découpe Films (doctrine projet `.svelte` = e2e ;
 * tout le métier en `.ts` pur testé). On exerce les fonctions PURES de `pdf-export.ts` :
 *  - `layoutDecoupePdf` : pagination, split de film, anti-veuve, GARDE 0 débordement (golden §1).
 *  - `buildPageSvgStrings` : 1 SVG par page, en-tête/pied, troncature du titre, échappement.
 *  - briques : `gauge` (donut), `stripLayout` (couverture des pièces), `tint`, `ellipsize`, `wrapText`.
 * Le rendu effectif (jsPDF + svg2pdf, donut compris) est validé en e2e (`tests/decoupe*.test.ts`).
 */
import { describe, it, expect } from 'vitest';
import {
	layoutDecoupePdf,
	buildPageSvgStrings,
	stripLayout,
	gauge,
	tint,
	ellipsize,
	wrapText,
	CONTENT_TOP,
	CONTENT_BOTTOM,
	type DecoupePdfInput,
	type Placed
} from './pdf-export';
import { cutGroups } from './presenter';
import type { Alerte, LigneCommandeFournisseur, PlacementPiece, PlanProduit } from './types';

// --- Fabriques de fixtures (déterministes) ----------------------------------------------------

/** Plan d'un film avec `n` groupes de coupe DISTINCTS (1 vitre par groupe → n groupes). */
function planWithGroups(produit_id: string, n: number, laize = 1520): PlanProduit {
	const placements: PlacementPiece[] = [];
	let y = 0;
	for (let i = 0; i < n; i++) {
		const w = 300 + (i % 7) * 20; // en travers de la laize
		const h = 380 + i; // le long du rouleau (distinct → groupe distinct)
		placements.push({
			vitre_id: `${produit_id}-v${i}`,
			piece_index: 0,
			x_mm: 0,
			y_mm: y,
			largeur_placee_mm: w,
			hauteur_placee_mm: h,
			pivotee: false
		});
		y += h;
	}
	const surface = placements.reduce((s, p) => s + p.largeur_placee_mm * p.hauteur_placee_mm, 0);
	const rollArea = laize * Math.max(1, y);
	return {
		produit_id,
		laize_mm: laize,
		longueur_consommee_mm: y,
		surface_pieces_mm2: surface,
		taux_chute: Math.max(0, Math.min(0.999, 1 - surface / rollArea)),
		placements,
		poses_en_les: []
	};
}

function inputFor(
	plans: PlanProduit[],
	opts: { alertes?: Alerte[]; commandes?: LigneCommandeFournisseur[]; titre?: string } = {}
): DecoupePdfInput {
	const produitsInfo: DecoupePdfInput['produitsInfo'] = {};
	const vitresInfo: DecoupePdfInput['vitresInfo'] = {};
	const vitreOrder: string[] = [];
	const famille = ['solaire', 'securite', 'discretion'];
	plans.forEach((plan, idx) => {
		produitsInfo[plan.produit_id] = {
			reference: `REF-${plan.produit_id}`,
			nom: `Film ${plan.produit_id} contrôle solaire`,
			famille: famille[idx % 3],
			fabricant: 'TestFab'
		};
		for (const pl of plan.placements) {
			if (!(pl.vitre_id in vitresInfo)) {
				vitresInfo[pl.vitre_id] = {
					produit_id: plan.produit_id,
					largeur_mm: pl.hauteur_placee_mm,
					hauteur_mm: pl.largeur_placee_mm,
					quantite: 1
				};
				vitreOrder.push(pl.vitre_id);
			}
		}
	});
	// Vitres référencées par alertes/commandes mais hors plans (sur-mesure / non plaçable).
	for (const a of opts.alertes ?? []) {
		if (!(a.vitre_id in vitresInfo)) {
			vitresInfo[a.vitre_id] = { produit_id: 'ext', largeur_mm: 1700, hauteur_mm: 900, quantite: 1 };
			vitreOrder.push(a.vitre_id);
		}
	}
	for (const c of opts.commandes ?? []) {
		if (!(c.vitre_id in vitresInfo)) {
			vitresInfo[c.vitre_id] = { produit_id: 'ext', largeur_mm: 1200, hauteur_mm: 2400, quantite: 1 };
			vitreOrder.push(c.vitre_id);
		}
	}
	if (!('ext' in produitsInfo)) {
		produitsInfo['ext'] = { reference: 'REF-EXT', nom: 'Produit fournisseur', famille: 'securite', fabricant: 'Ext' };
	}
	return {
		titre: opts.titre ?? 'Villa Léman, étage 2',
		dateLabel: '05.06.2026 à 14:32',
		nbVitres: vitreOrder.length,
		resultat: {
			plans,
			alertes: opts.alertes ?? [],
			commandes_fournisseur: opts.commandes ?? []
		},
		produitsInfo,
		vitresInfo,
		vitreOrder
	};
}

const EPS = 0.5;
function allItems(pages: Placed[][]): Placed[] {
	return pages.flat();
}

// --- GARDE 0 débordement (invariant central, golden §1) ---------------------------------------

describe('layoutDecoupePdf : aucun bloc ne franchit la zone de contenu (0 débordement)', () => {
	const cas: Record<string, DecoupePdfInput> = {
		'un seul petit film': inputFor([planWithGroups('A', 4)]),
		'trois films': inputFor([planWithGroups('A', 5), planWithGroups('B', 6), planWithGroups('C', 4)]),
		'film long (split sur plusieurs pages)': inputFor([planWithGroups('A', 45)]),
		'alertes + commandes + films': inputFor(
			[planWithGroups('A', 8), planWithGroups('B', 12)],
			{
				alertes: [
					{ vitre_id: 'al1', type: 'piece_non_placable', message: 'Pièce trop grande pour la laize' },
					{ vitre_id: 'al2', type: 'non_nestable_laisse_en_interne', message: 'Produit non nestable' }
				],
				commandes: [
					{ vitre_id: 'cm1', raison: 'sur_mesure_fournisseur' },
					{ vitre_id: 'cm2', raison: 'non_nestable' }
				]
			}
		)
	};

	for (const [nom, input] of Object.entries(cas)) {
		it(`${nom} : chaque bloc reste dans [CONTENT_TOP, CONTENT_BOTTOM]`, () => {
			const { pages } = layoutDecoupePdf(input);
			for (const items of pages) {
				for (const it of items) {
					expect(it.y, `${it.tag} top`).toBeGreaterThanOrEqual(CONTENT_TOP - EPS);
					expect(it.y + it.h, `${it.tag} bottom`).toBeLessThanOrEqual(CONTENT_BOTTOM + EPS);
				}
			}
		});

		it(`${nom} : aucun chevauchement vertical entre blocs d'une même page`, () => {
			const { pages } = layoutDecoupePdf(input);
			for (const items of pages) {
				const sorted = [...items].sort((a, b) => a.y - b.y);
				for (let i = 1; i < sorted.length; i++) {
					expect(sorted[i].y + EPS, `${sorted[i - 1].tag} → ${sorted[i].tag}`).toBeGreaterThanOrEqual(
						sorted[i - 1].y + sorted[i - 1].h
					);
				}
			}
		});
	}
});

// --- Pagination + split + anti-veuve ----------------------------------------------------------

describe('layoutDecoupePdf : pagination et split de film', () => {
	it('un film court tient sur une seule page (aucun split)', () => {
		const { pages } = layoutDecoupePdf(inputFor([planWithGroups('A', 4)]));
		expect(pages).toHaveLength(1);
		expect(allItems(pages).some((it) => it.tag === 'film-suite')).toBe(false);
	});

	it('un film long déborde sur plusieurs pages et produit un segment "film" + des "film-suite"', () => {
		const { pages } = layoutDecoupePdf(inputFor([planWithGroups('A', 45)]));
		expect(pages.length).toBeGreaterThan(1);
		const tags = allItems(pages).map((it) => it.tag);
		expect(tags).toContain('film');
		expect(tags).toContain('film-suite');
	});

	it('anti-veuve : tout segment de continuation porte ≥ 3 lignes ; aucune ligne perdue', () => {
		// Balaye des tailles autour du seuil de split pour exercer la règle anti-veuve.
		for (const n of [19, 20, 21, 22, 25, 30, 45]) {
			const plan = planWithGroups('A', n);
			const { pages } = layoutDecoupePdf(inputFor([plan]));
			const segs = allItems(pages).filter((it) => it.tag === 'film' || it.tag === 'film-suite');
			for (const s of segs) {
				if (s.tag === 'film-suite') {
					expect(s.rows ?? 0, `n=${n} continuation`).toBeGreaterThanOrEqual(3);
				}
			}
			// Conservation : la somme des lignes des segments = nb de groupes (rien perdu / dupliqué).
			const total = segs.reduce((sum, s) => sum + (s.rows ?? 0), 0);
			expect(total, `n=${n} conservation`).toBe(cutGroups(plan).length);
		}
	});

	it("l'en-tête de section ne reste pas orpheline : elle bascule avec son premier film", () => {
		// Beaucoup d'alertes + commandes poussent la section en bas de page ; elle doit suivre le film.
		const input = inputFor([planWithGroups('A', 6), planWithGroups('B', 6)], {
			alertes: Array.from({ length: 8 }, (_, i) => ({
				vitre_id: `al${i}`,
				type: 'piece_non_placable' as const,
				message: `Alerte ${i}`
			})),
			commandes: Array.from({ length: 6 }, (_, i) => ({
				vitre_id: `cm${i}`,
				raison: 'sur_mesure_fournisseur' as const
			}))
		});
		const { pages } = layoutDecoupePdf(input);
		for (const items of pages) {
			const si = items.findIndex((it) => it.tag === 'section');
			if (si >= 0) {
				// Si une section est posée, un film la suit sur la même page (jamais seule en bas).
				expect(items.slice(si + 1).some((it) => it.tag === 'film')).toBe(true);
			}
		}
	});
});

// --- Donut (gauge) : math du tracé robuste svg2pdf --------------------------------------------

describe('gauge (donut KPI) : anneau de fond + arc proportionnel', () => {
	it('frac = 0 → anneau seul, aucun arc', () => {
		const s = gauge(30, 30, 11, 0, '#B42318', '#F3F4F6', 3.5);
		expect(s).toContain('<circle');
		expect(s).not.toContain('<path');
	});
	it('frac négatif est borné à 0 (aucun arc)', () => {
		expect(gauge(30, 30, 11, -0.4, '#B42318', '#F3F4F6', 3.5)).not.toContain('<path');
	});
	it('frac = 1 → arc complet (path M…L…)', () => {
		const s = gauge(30, 30, 11, 1, '#B42318', '#F3F4F6', 3.5);
		expect(s).toContain('<circle');
		expect(s).toContain('<path d="M');
	});
	it('frac intermédiaire → anneau + arc ; frac > 1 borné sans erreur', () => {
		expect(gauge(30, 30, 11, 0.5, '#B42318', '#F3F4F6', 3.5)).toContain('<path d="M');
		expect(() => gauge(30, 30, 11, 2, '#B42318', '#F3F4F6', 3.5)).not.toThrow();
		expect(gauge(30, 30, 11, 2, '#B42318', '#F3F4F6', 3.5)).toContain('<path d="M');
	});
	it('le nombre de segments d’arc croît avec frac (approximation lisse)', () => {
		const seg = (s: string) => (s.match(/ L/g) ?? []).length;
		expect(seg(gauge(30, 30, 11, 1, '#B42318', '#F3F4F6', 3.5))).toBeGreaterThan(
			seg(gauge(30, 30, 11, 0.25, '#B42318', '#F3F4F6', 3.5))
		);
	});
});

// --- stripLayout : la bande couvre TOUJOURS l'étendue réelle des pièces ------------------------

describe('stripLayout : couverture de l’étendue des pièces (robustesse données)', () => {
	it('données cohérentes : la largeur de bande suit la longueur consommée', () => {
		const plan = planWithGroups('A', 3);
		const sl = stripLayout(plan, 500);
		expect(sl.gw).toBeGreaterThan(0);
		expect(sl.boxW).toBeGreaterThan(sl.gw); // padding inclus
	});

	it('données INCOHÉRENTES (pièce au-delà de longueur_consommée) : la bande couvre la pièce', () => {
		// Cas réel observé : longueur_consommee sous-évaluée → pièces hors cadre. La bande doit couvrir.
		const plan: PlanProduit = {
			produit_id: 'A',
			laize_mm: 1500,
			longueur_consommee_mm: 500, // sous-évaluée
			surface_pieces_mm2: 1000 * 2000,
			taux_chute: 0,
			placements: [
				{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 1000, hauteur_placee_mm: 2000, pivotee: false }
			],
			poses_en_les: []
		};
		const s = 88 / plan.laize_mm;
		const declared = Math.round(plan.longueur_consommee_mm * s);
		const contentUnits = Math.max(
			...plan.placements.map((p) => Math.round(p.y_mm * s) + Math.max(1, Math.round(p.hauteur_placee_mm * s)))
		);
		expect(declared, 'la largeur déclarée seule tronquerait').toBeLessThan(contentUnits);
		const sl = stripLayout(plan, 500);
		// gw / scale = nombre d'unités couvertes ; doit atteindre l'étendue réelle des pièces.
		expect(sl.gw / sl.scale).toBeGreaterThanOrEqual(contentUnits - EPS);
	});
});

// --- buildPageSvgStrings : 1 SVG par page, en-tête/pied, titre, échappement -------------------

describe('buildPageSvgStrings : assemblage des pages', () => {
	it('produit exactement 1 SVG par page, bien formé, avec en-tête et pied', () => {
		const input = inputFor([planWithGroups('A', 4)]);
		const { pages } = layoutDecoupePdf(input);
		const svgs = buildPageSvgStrings(input);
		expect(svgs).toHaveLength(pages.length);
		expect(svgs[0].startsWith('<svg')).toBe(true);
		expect(svgs[0].endsWith('</svg>')).toBe(true);
		expect(svgs[0]).toContain('PLAN DE DÉCOUPE'); // en-tête page 1 (non-suite)
		expect(svgs[0]).toContain('page 1 / '); // pied
	});

	it('pages de continuation : en-tête « suite »', () => {
		const svgs = buildPageSvgStrings(inputFor([planWithGroups('A', 45)]));
		expect(svgs.length).toBeGreaterThan(1);
		expect(svgs[1]).toContain('suite');
	});

	it('le titre long est tronqué (ellipsis) et ne déborde pas brut', () => {
		const longTitre = 'Résidence du Lac Léman, bâtiment A, niveaux 1 à 7, façades sud et ouest complètes';
		const svgs = buildPageSvgStrings(inputFor([planWithGroups('A', 3)], { titre: longTitre }));
		expect(svgs[0]).toContain('…');
		expect(svgs[0]).not.toContain(longTitre); // jamais le titre complet (chevaucherait)
	});

	it('échappe le contenu dynamique (anti-XSS / SVG bien formé)', () => {
		const svgs = buildPageSvgStrings(inputFor([planWithGroups('A', 3)], { titre: 'Toit A<b>x</b>' }));
		expect(svgs[0]).toContain('A&lt;b&gt;x'); // échappé
		expect(svgs[0]).not.toContain('A<b>x'); // jamais brut
	});
});

// --- Briques de texte / couleur ---------------------------------------------------------------

describe('tint : mélange sur fond blanc (remplace fill-opacity)', () => {
	it('alpha 0 = blanc, alpha 1 = couleur d’origine', () => {
		expect(tint('#2F5A9E', 0)).toBe('#ffffff');
		expect(tint('#2f5a9e', 1)).toBe('#2f5a9e');
	});
	it('alpha intermédiaire éclaircit vers le blanc', () => {
		const mid = tint('#000000', 0.5);
		expect(mid).toBe('#808080');
	});
});

describe('ellipsize : troncature sans parenthèse orpheline', () => {
	it('texte court inchangé', () => {
		expect(ellipsize('Court', 10)).toBe('Court');
	});
	it('texte long tronqué avec ellipsis', () => {
		const r = ellipsize('Abcdefghijklmnop', 8);
		expect(r.endsWith('…')).toBe(true);
		expect(r.length).toBeLessThanOrEqual(8);
	});
	it('coupe avant une parenthèse restée ouverte', () => {
		const r = ellipsize('Film solaire (vernis renforcé extérieur)', 18);
		expect(r).not.toContain('('); // jamais « … (vernis… »
		expect(r.endsWith('…')).toBe(true);
	});
});

describe('wrapText : découpe par mots dans la largeur', () => {
	it('respecte la longueur max par ligne (sauf mot plus long)', () => {
		const lines = wrapText('un deux trois quatre cinq six sept huit', 12);
		expect(lines.length).toBeGreaterThan(1);
		for (const l of lines) {
			// chaque ligne ≤ maxChars, sauf si un seul mot la dépasse
			expect(l.split(' ').length === 1 || l.length <= 12).toBe(true);
		}
		expect(lines.join(' ')).toBe('un deux trois quatre cinq six sept huit');
	});
});
