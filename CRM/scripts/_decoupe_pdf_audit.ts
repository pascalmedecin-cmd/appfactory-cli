/**
 * Backbone DÉTERMINISTE de l'audit visuel du PDF Découpe Films (étape 4).
 *
 * Anti-hallucination (reference_pdf_golden_rules.md §8 + pdf-audit-plan.md) : on ne demande JAMAIS
 * à un agent « est-ce propre ? ». Ce script (1) génère toutes les fixtures obligatoires, (2) calcule
 * des MÉTRIQUES DÉTERMINISTES depuis `layoutDecoupePdf` + parsing du SVG exact que svg2pdf convertit,
 * (3) écrit un rapport JSON + un HTML par fixture (prévisualisable / screenshotable).
 *
 * Lancer depuis CRM/ :  npx vite-node scripts/_decoupe_pdf_audit.ts
 * Sorties :
 *   .product-architect/decoupe/audit/metrics.json          (rapport machine)
 *   .product-architect/decoupe/audit/<fixture>.html        (1 page A4 par <div class=sheet>)
 *   .product-architect/decoupe/audit/index.html            (sommaire)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
	buildPageSvgStrings,
	layoutDecoupePdf,
	CONTENT_TOP,
	CONTENT_BOTTOM,
	PAGE_W,
	PAGE_H,
	type DecoupePdfInput
} from '../src/lib/decoupe/pdf-export';
import type { PlacementPiece, ResultatOptimisation } from '../src/lib/decoupe/types';

const MM = 2.834645;
const MARGIN = 15 * MM; // 42.52  (doit rester synchro avec pdf-export.ts)

// ---------------------------------------------------------------------------------------------
// Fabriques de fixtures
// ---------------------------------------------------------------------------------------------
type ProdInfo = DecoupePdfInput['produitsInfo'];
type VitInfo = DecoupePdfInput['vitresInfo'];

/** Un film « solaire » à N pièces variées (split au-delà d'une page). */
function filmManyPieces(N: number, laize = 1830, seed = 1): {
	plan: ResultatOptimisation['plans'][number];
	vitresInfo: VitInfo;
	vitreOrder: string[];
} {
	let y = 0;
	const placements: PlacementPiece[] = [];
	const vitresInfo: VitInfo = {};
	const vitreOrder: string[] = [];
	for (let k = 0; k < N; k++) {
		const w = 300 + ((k * 37 * seed) % 900);
		const h = 250 + ((k * 53 * seed) % 700);
		const id = `v${k}`;
		placements.push({
			vitre_id: id, piece_index: 0, x_mm: 0, y_mm: y,
			largeur_placee_mm: Math.min(w, laize), hauteur_placee_mm: h, pivotee: k % 3 === 0
		});
		y += h;
		vitresInfo[id] = { produit_id: 'p-sol', largeur_mm: w, hauteur_mm: h, quantite: 1 };
		vitreOrder.push(id);
	}
	const surf = placements.reduce((s, p) => s + p.largeur_placee_mm * p.hauteur_placee_mm, 0);
	return {
		plan: {
			produit_id: 'p-sol', laize_mm: laize, longueur_consommee_mm: y, surface_pieces_mm2: surf,
			taux_chute: Math.max(0, 1 - surf / (laize * y)), poses_en_les: [], placements
		},
		vitresInfo, vitreOrder
	};
}

interface Fix {
	key: string;
	label: string;
	input: DecoupePdfInput;
}

const FIXTURES: Fix[] = [];

// F1 — golden « Villa Léman » (2 films, 2 alertes, 2 commandes, statut « à vérifier »)
{
	const resultat: ResultatOptimisation = {
		plans: [
			{
				produit_id: 'p-sec', laize_mm: 1830, longueur_consommee_mm: 600,
				surface_pieces_mm2: 3 * 600 * 600, taux_chute: 0.02, poses_en_les: [],
				placements: [0, 600, 1200].map((x) => ({
					vitre_id: 'v-600', piece_index: 0, x_mm: x, y_mm: 0,
					largeur_placee_mm: 600, hauteur_placee_mm: 600, pivotee: false
				}))
			},
			{
				produit_id: 'p-sol', laize_mm: 1830, longueur_consommee_mm: 5300,
				surface_pieces_mm2: 2 * 900 * 2100 + 4 * 1200 * 800, taux_chute: 0.21, poses_en_les: [],
				placements: [
					{ vitre_id: 'v-900', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 900, hauteur_placee_mm: 2100, pivotee: false },
					{ vitre_id: 'v-900', piece_index: 1, x_mm: 900, y_mm: 0, largeur_placee_mm: 900, hauteur_placee_mm: 2100, pivotee: false },
					...[2100, 2900, 3700, 4500].map((y, i) => ({
						vitre_id: 'v-1200', piece_index: i, x_mm: 0, y_mm: y, largeur_placee_mm: 1200, hauteur_placee_mm: 800, pivotee: true
					}))
				]
			}
		],
		commandes_fournisseur: [
			{ vitre_id: 'v-cmd-sol', raison: 'sur_mesure_fournisseur' },
			{ vitre_id: 'v-cmd-vrn', raison: 'non_nestable' }
		],
		alertes: [
			{ vitre_id: 'v5', type: 'piece_non_placable', message: 'Vitre v5 plus large que la laize max (1520 mm), jointage non autorisé.' },
			{ vitre_id: 'v6', type: 'non_nestable_laisse_en_interne', message: 'Vitre v6 : produit traité hors découpe interne.' }
		]
	};
	FIXTURES.push({
		key: 'villa-leman', label: 'Golden « Villa Léman » (2 films, alertes, commandes)',
		input: {
			titre: 'Villa Léman, étage 2', dateLabel: '05.06.2026 à 14:32', nbVitres: 6, resultat,
			produitsInfo: {
				'p-sec': { reference: 'SEC-100', nom: 'Film sécurité 100µ', famille: 'securite', fabricant: 'Hanita SafetyZone' },
				'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' },
				'p-vrn': { reference: 'VRN-AR', nom: 'Vernis anti-rayures', famille: 'securite', fabricant: '' }
			},
			vitresInfo: {
				'v-1200': { produit_id: 'p-sol', largeur_mm: 800, hauteur_mm: 1200, quantite: 4 }, // source 800×1200, posée pivotée → coupe 1200×800
				'v-900': { produit_id: 'p-sol', largeur_mm: 900, hauteur_mm: 2100, quantite: 2 },
				'v-600': { produit_id: 'p-sec', largeur_mm: 600, hauteur_mm: 600, quantite: 3 },
				'v-cmd-sol': { produit_id: 'p-sol', largeur_mm: 2000, hauteur_mm: 1000, quantite: 1 },
				'v-cmd-vrn': { produit_id: 'p-vrn', largeur_mm: 800, hauteur_mm: 600, quantite: 1 },
				v5: { produit_id: 'p-sol', largeur_mm: 1700, hauteur_mm: 900, quantite: 1 },
				v6: { produit_id: 'p-vrn', largeur_mm: 800, hauteur_mm: 600, quantite: 1 }
			},
			vitreOrder: ['v-1200', 'v-900', 'v-600']
		}
	});
}

// F2 — un seul film, aucune alerte/commande, statut « prêt » (cas minimal le plus fréquent)
{
	const f = filmManyPieces(4, 1520, 2);
	FIXTURES.push({
		key: 'un-seul-film', label: 'Un seul film, statut prêt (cas minimal)',
		input: {
			titre: 'Bureau Genève', dateLabel: '05.06.2026 à 09:10', nbVitres: 4,
			resultat: { plans: [f.plan], commandes_fournisseur: [], alertes: [] },
			produitsInfo: { 'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' } },
			vitresInfo: f.vitresInfo, vitreOrder: f.vitreOrder
		}
	});
}

// F3 — stress 26 pièces (split tableau multi-pages)
{
	const f = filmManyPieces(26, 1830, 1);
	FIXTURES.push({
		key: 'stress-26', label: 'Stress 26 pièces (split, en-tête répété)',
		input: {
			titre: 'Chantier stress — 26 pièces distinctes', dateLabel: '05.06.2026 à 15:10', nbVitres: 26,
			resultat: { plans: [f.plan], commandes_fournisseur: [], alertes: [] },
			produitsInfo: { 'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' } },
			vitresInfo: f.vitresInfo, vitreOrder: f.vitreOrder
		}
	});
}

// F4 — libellés produits/fabricants/titre très longs (test troncatures & débordement texte)
{
	const f = filmManyPieces(3, 1830, 3);
	FIXTURES.push({
		key: 'libelles-longs', label: 'Libellés très longs (référence, nom, fabricant, titre)',
		input: {
			titre: 'Résidence Les Hauts-de-Cologny, immeuble B, niveaux 3 à 7 (façades sud et ouest)',
			dateLabel: '05.06.2026 à 11:48', nbVitres: 3,
			resultat: {
				plans: [f.plan],
				commandes_fournisseur: [{ vitre_id: 'v0', raison: 'sur_mesure_fournisseur' }],
				alertes: [{ vitre_id: 'v1', type: 'piece_non_placable', message: 'Vitre cintrée non rectangulaire : la pose en lés droits ne couvre pas la géométrie courbe, découpe manuelle requise sur gabarit fourni par le poseur.' }]
			},
			produitsInfo: {
				'p-sol': { reference: 'SOLAIRE-PRESTIGE-70-EXT', nom: 'Film solaire extérieur réfléchissant haute performance 70 % anti-UV', famille: 'solaire', fabricant: '3M Prestige Exterior Series' }
			},
			vitresInfo: { v0: f.vitresInfo.v0, v1: f.vitresInfo.v1, v2: f.vitresInfo.v2 },
			vitreOrder: f.vitreOrder
		}
	});
}

// F5 — 8 alertes (bloc alertes haut)
{
	const f = filmManyPieces(2, 1830, 4);
	const alertes: ResultatOptimisation['alertes'] = [];
	for (let i = 0; i < 8; i++) {
		alertes.push({
			vitre_id: `a${i}`, type: i % 2 ? 'non_nestable_laisse_en_interne' : 'piece_non_placable',
			message: `Vitre a${i} : ${i % 2 ? 'produit traité hors découpe interne (vernis).' : 'pièce plus large que la laize max, jointage non autorisé.'}`
		});
	}
	const vitresInfo: VitInfo = { ...f.vitresInfo };
	for (let i = 0; i < 8; i++) vitresInfo[`a${i}`] = { produit_id: 'p-sol', largeur_mm: 1600 + i * 30, hauteur_mm: 900 + i * 20, quantite: 1 };
	FIXTURES.push({
		key: 'huit-alertes', label: '8 alertes (bloc à vérifier dense)',
		input: {
			titre: 'Tour Acacias, plateau 6', dateLabel: '05.06.2026 à 16:00', nbVitres: 10,
			resultat: { plans: [f.plan], commandes_fournisseur: [], alertes },
			produitsInfo: { 'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' } },
			vitresInfo, vitreOrder: f.vitreOrder
		}
	});
}

// F6 — 6 commandes fournisseur (familles variées)
{
	const f = filmManyPieces(2, 1830, 5);
	const fams = ['solaire', 'securite', 'discretion'];
	const refs = ['SOL-70', 'SEC-100', 'DIS-FROST', 'SOL-50', 'SEC-200', 'DIS-MIRROR'];
	const noms = ['Film solaire 70 %', 'Film sécurité 100µ', 'Film dépoli givré', 'Film solaire 50 %', 'Film sécurité 200µ', 'Film miroir sans tain'];
	const produitsInfo: ProdInfo = { 'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' } };
	const vitresInfo: VitInfo = { ...f.vitresInfo };
	const commandes: ResultatOptimisation['commandes_fournisseur'] = [];
	for (let i = 0; i < 6; i++) {
		const pid = `pc${i}`;
		produitsInfo[pid] = { reference: refs[i], nom: noms[i], famille: fams[i % 3], fabricant: '3M' };
		vitresInfo[`c${i}`] = { produit_id: pid, largeur_mm: 1800 + i * 40, hauteur_mm: 1000 + i * 25, quantite: 1 };
		commandes.push({ vitre_id: `c${i}`, raison: i % 2 ? 'non_nestable' : 'sur_mesure_fournisseur' });
	}
	FIXTURES.push({
		key: 'six-commandes', label: '6 commandes fournisseur (familles variées)',
		input: {
			titre: 'Villa Cologny', dateLabel: '05.06.2026 à 10:20', nbVitres: 8,
			resultat: { plans: [f.plan], commandes_fournisseur: commandes, alertes: [] },
			produitsInfo, vitresInfo, vitreOrder: f.vitreOrder
		}
	});
}

// F7 — consolidation multi-chantiers (titre « N chantiers consolidés », 3 films)
{
	const a = filmManyPieces(5, 1520, 6);
	const b = filmManyPieces(7, 1830, 7);
	const c = filmManyPieces(4, 1220, 8);
	// re-namespacer les ids pour éviter collisions
	const rename = (f: ReturnType<typeof filmManyPieces>, pfx: string, pid: string) => {
		const vi: VitInfo = {};
		f.plan.placements.forEach((p) => (p.vitre_id = pfx + p.vitre_id));
		f.plan.produit_id = pid;
		Object.entries(f.vitresInfo).forEach(([k, v]) => (vi[pfx + k] = { ...v, produit_id: pid }));
		return { plan: f.plan, vitresInfo: vi, order: f.vitreOrder.map((id) => pfx + id) };
	};
	const ra = rename(a, 'a', 'p-sol');
	const rb = rename(b, 'b', 'p-sec');
	const rc = rename(c, 'c', 'p-dis');
	FIXTURES.push({
		key: 'multi-chantiers', label: '3 chantiers consolidés (3 films)',
		input: {
			titre: '3 chantiers consolidés', dateLabel: '05.06.2026 à 17:30', nbVitres: 16,
			resultat: { plans: [ra.plan, rb.plan, rc.plan], commandes_fournisseur: [], alertes: [] },
			produitsInfo: {
				'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' },
				'p-sec': { reference: 'SEC-100', nom: 'Film sécurité 100µ', famille: 'securite', fabricant: 'Hanita SafetyZone' },
				'p-dis': { reference: 'DIS-FROST', nom: 'Film dépoli givré', famille: 'discretion', fabricant: 'Solar Screen' }
			},
			vitresInfo: { ...ra.vitresInfo, ...rb.vitresInfo, ...rc.vitresInfo },
			vitreOrder: [...ra.order, ...rb.order, ...rc.order]
		}
	});
}

// F8 — rouleau très court (0,3 m)
{
	const plan = {
		produit_id: 'p-sec', laize_mm: 1830, longueur_consommee_mm: 300,
		surface_pieces_mm2: 2 * 250 * 250, taux_chute: 1 - (2 * 250 * 250) / (1830 * 300), poses_en_les: [],
		placements: [
			{ vitre_id: 'vc', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 250, hauteur_placee_mm: 250, pivotee: false },
			{ vitre_id: 'vc', piece_index: 1, x_mm: 300, y_mm: 0, largeur_placee_mm: 250, hauteur_placee_mm: 250, pivotee: false }
		]
	};
	FIXTURES.push({
		key: 'rouleau-court', label: 'Rouleau très court (0,3 m) — strip mini',
		input: {
			titre: 'Cabine douche', dateLabel: '05.06.2026 à 08:05', nbVitres: 2,
			resultat: { plans: [plan], commandes_fournisseur: [], alertes: [] },
			produitsInfo: { 'p-sec': { reference: 'DIS-FROST', nom: 'Film dépoli givré', famille: 'discretion', fabricant: 'Solar Screen' } },
			vitresInfo: { vc: { produit_id: 'p-sec', largeur_mm: 250, hauteur_mm: 250, quantite: 2 } },
			vitreOrder: ['vc']
		}
	});
}

// F9 — rouleau très long, pièces nombreuses (longueur cohérente avec les placements)
{
	const f = filmManyPieces(40, 1830, 9);
	FIXTURES.push({
		key: 'rouleau-long', label: 'Rouleau très long (~23 m), 40 pièces',
		input: {
			titre: 'Centre commercial Balexert', dateLabel: '05.06.2026 à 13:00', nbVitres: 40,
			resultat: { plans: [f.plan], commandes_fournisseur: [], alertes: [] },
			produitsInfo: { 'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' } },
			vitresInfo: f.vitresInfo, vitreOrder: f.vitreOrder
		}
	});
}

// F10 — pièces pivotées + posées en lés (tags « pivotée » / « en lés »)
{
	const placements: PlacementPiece[] = [
		{ vitre_id: 'vp', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 800, hauteur_placee_mm: 1200, pivotee: true },
		{ vitre_id: 'vp', piece_index: 1, x_mm: 800, y_mm: 0, largeur_placee_mm: 800, hauteur_placee_mm: 1200, pivotee: true },
		{ vitre_id: 'vl', piece_index: 0, x_mm: 0, y_mm: 1200, largeur_placee_mm: 915, hauteur_placee_mm: 2000, pivotee: false, les_index: 0 },
		{ vitre_id: 'vl', piece_index: 0, x_mm: 915, y_mm: 1200, largeur_placee_mm: 915, hauteur_placee_mm: 2000, pivotee: false, les_index: 1 }
	];
	const surf = placements.reduce((s, p) => s + p.largeur_placee_mm * p.hauteur_placee_mm, 0);
	const plan = {
		produit_id: 'p-sec', laize_mm: 1830, longueur_consommee_mm: 3200, surface_pieces_mm2: surf,
		taux_chute: Math.max(0, 1 - surf / (1830 * 3200)),
		poses_en_les: [{ vitre_id: 'vl', piece_index: 0, nb_les: 2, largeur_bande_mm: 915 }],
		placements
	};
	FIXTURES.push({
		key: 'pivot-les', label: 'Pièces pivotées + posées en lés',
		input: {
			titre: 'Loft Carouge', dateLabel: '05.06.2026 à 14:00', nbVitres: 3,
			resultat: { plans: [plan], commandes_fournisseur: [], alertes: [] },
			produitsInfo: { 'p-sec': { reference: 'SEC-200', nom: 'Film sécurité 200µ', famille: 'securite', fabricant: 'Hanita' } },
			vitresInfo: {
				vp: { produit_id: 'p-sec', largeur_mm: 1200, hauteur_mm: 800, quantite: 2 },
				vl: { produit_id: 'p-sec', largeur_mm: 1800, hauteur_mm: 2000, quantite: 1 }
			},
			vitreOrder: ['vp', 'vl']
		}
	});
}

// ---------------------------------------------------------------------------------------------
// Parsing SVG + métriques
// ---------------------------------------------------------------------------------------------
interface TextEl { i: number; x: number; y: number; family: string; size: number; weight: number; fill: string; anchor: string; rot: boolean; content: string; }
interface RectEl { i: number; x: number; y: number; w: number; h: number; fill: string; }

const TEXT_RE = /<text x="([\d.eE+-]+)" y="([\d.eE+-]+)" font-family="(\w+)" font-size="([\d.eE+-]+)" font-weight="(\d+)" fill="(#[0-9a-fA-F]+|none)" text-anchor="(\w+)"([^>]*)>([^<]*)<\/text>/g;
const RECT_RE = /<rect x="([\d.eE+-]+)" y="([\d.eE+-]+)" width="([\d.eE+-]+)" height="([\d.eE+-]+)"(?:[^>]*?)fill="(#[0-9a-fA-F]+|none)"[^>]*\/>/g;

function parseTexts(svg: string): TextEl[] {
	const out: TextEl[] = [];
	let m: RegExpExecArray | null;
	TEXT_RE.lastIndex = 0;
	while ((m = TEXT_RE.exec(svg))) {
		out.push({
			i: m.index, x: +m[1], y: +m[2], family: m[3], size: +m[4], weight: +m[5],
			fill: m[6], anchor: m[7], rot: /transform=/.test(m[8]),
			content: m[9].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
		});
	}
	return out;
}
function parseRects(svg: string): RectEl[] {
	const out: RectEl[] = [];
	let m: RegExpExecArray | null;
	RECT_RE.lastIndex = 0;
	while ((m = RECT_RE.exec(svg))) {
		if (m[5] === 'none') continue;
		out.push({ i: m.index, x: +m[1], y: +m[2], w: +m[3], h: +m[4], fill: m[5] });
	}
	return out;
}

// --- Contraste WCAG -------------------------------------------------------------------------
function srgbToLin(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
	const h = hex.replace('#', '');
	const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
	return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrast(a: string, b: string): number {
	const l1 = luminance(a), l2 = luminance(b);
	const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
	return (hi + 0.05) / (lo + 0.05);
}
/** Fond effectif d'un texte = dernier rect (avant lui dans le SVG, fill≠none) le contenant. */
function bgOf(t: TextEl, rects: RectEl[]): string {
	const cy = t.y - t.size * 0.35; // centre vertical approx du glyphe
	let best: RectEl | null = null;
	for (const r of rects) {
		if (r.i > t.i) break;
		if (t.x >= r.x - 0.5 && t.x <= r.x + r.w + 0.5 && cy >= r.y - 0.5 && cy <= r.y + r.h + 0.5) {
			best = r; // dernier qui contient = dessiné le plus tard = visible
		}
	}
	return best ? best.fill : '#ffffff';
}

const ROUND = (n: number) => Math.round(n * 100) / 100;

interface PageMetrics {
	page: number;
	nbTexts: number;
	nbRects: number;
	margins: { left: number; right: number; top: number; bottom: number };
	xHistogram: Record<string, number>; // x de texte anchor=start → count
	xOutliers: { x: number; content: string; nearest: number; delta: number }[];
	truncations: { content: string; x: number; y: number }[];
	roleTypography: Record<string, number>; // "size/weight/family" → count
	contrastIssues: { fg: string; bg: string; ratio: number; size: number; weight: number; need: number; content: string }[];
}

function analysePage(svg: string, page: number): PageMetrics {
	const texts = parseTexts(svg);
	const rects = parseRects(svg);

	// marges réelles : min/max sur textes (anchor start) + rects « cadres » (fill blanc) à largeur ~CW
	let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
	for (const t of texts) {
		const xStart = t.anchor === 'start' ? t.x : t.anchor === 'middle' ? t.x : t.x; // approx point
		minX = Math.min(minX, t.anchor === 'end' ? t.x - estWidth(t) : xStart);
		maxX = Math.max(maxX, t.anchor === 'end' ? t.x : t.x + (t.anchor === 'middle' ? estWidth(t) / 2 : estWidth(t)));
		minY = Math.min(minY, t.y);
		maxY = Math.max(maxY, t.y);
	}
	for (const r of rects) {
		if (r.w < 5 || r.h < 5) continue;
		minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w);
		minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y + r.h);
	}

	// grille x : histogramme des x de texte anchor=start, hors strip labels (rotés / mono petits)
	const startXs: { x: number; content: string }[] = texts
		.filter((t) => t.anchor === 'start' && !t.rot)
		.map((t) => ({ x: ROUND(t.x), content: t.content }));
	const hist: Record<string, number> = {};
	for (const s of startXs) hist[s.x.toFixed(1)] = (hist[s.x.toFixed(1)] ?? 0) + 1;
	// x récurrents = ceux apparaissant ≥ 3 fois (colonnes structurantes)
	const recurrent = Object.entries(hist).filter(([, c]) => c >= 3).map(([x]) => +x).sort((a, b) => a - b);
	// outliers = x à faible occurrence proches d'un récurrent (1.5 ≤ delta ≤ 6) → désalignement suspect
	const outliers: PageMetrics['xOutliers'] = [];
	for (const s of startXs) {
		for (const rx of recurrent) {
			const d = Math.abs(s.x - rx);
			if (d >= 1.5 && d <= 6) outliers.push({ x: s.x, content: s.content.slice(0, 30), nearest: rx, delta: ROUND(d) });
		}
	}

	const truncations = texts.filter((t) => t.content.includes('…')).map((t) => ({ content: t.content, x: ROUND(t.x), y: ROUND(t.y) }));

	const roleTypography: Record<string, number> = {};
	for (const t of texts) {
		if (!t.content.trim()) continue;
		const k = `${ROUND(t.size)}/${t.weight}/${t.family}`;
		roleTypography[k] = (roleTypography[k] ?? 0) + 1;
	}

	// contraste : pour chaque texte (taille ≥ 6, contenu non vide), fg vs fond effectif
	const seen = new Set<string>();
	const contrastIssues: PageMetrics['contrastIssues'] = [];
	for (const t of texts) {
		if (!t.content.trim() || t.fill === 'none') continue;
		const bg = bgOf(t, rects);
		const ratio = ROUND(contrast(t.fill, bg));
		const large = t.size >= 18 || (t.size >= 14 && t.weight >= 700);
		const need = large ? 3 : 4.5;
		const key = `${t.fill}|${bg}|${large}`;
		if (ratio < need && !seen.has(key)) {
			seen.add(key);
			contrastIssues.push({ fg: t.fill, bg, ratio, size: ROUND(t.size), weight: t.weight, need, content: t.content.slice(0, 24) });
		}
	}

	return {
		page, nbTexts: texts.length, nbRects: rects.length,
		margins: { left: ROUND(minX - MARGIN), right: ROUND(PAGE_W - MARGIN - maxX), top: ROUND(minY), bottom: ROUND(PAGE_H - maxY) },
		xHistogram: hist, xOutliers: outliers, truncations, roleTypography, contrastIssues
	};
}

// Largeur estimée d'un texte (mono = 0.6em, sans = ~0.52em moyen) — pour marges approx seulement.
function estWidth(t: TextEl): number {
	const per = t.family === 'DMMono' ? 0.6 : 0.52;
	return t.content.length * t.size * per;
}

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------
const outDir = '.product-architect/decoupe/audit';
mkdirSync(outDir, { recursive: true });

const report: Record<string, unknown> = {
	generatedFrom: 'scripts/_decoupe_pdf_audit.ts',
	geometry: { PAGE_W: ROUND(PAGE_W), PAGE_H: ROUND(PAGE_H), MARGIN: ROUND(MARGIN), CONTENT_TOP: ROUND(CONTENT_TOP), CONTENT_BOTTOM: ROUND(CONTENT_BOTTOM) },
	fixtures: {}
};

const cssLink = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">';
const sheetCss = `<style>body{margin:0;background:#5b6472;padding:24px 0 48px;font-family:'DM Sans',sans-serif}.sheet{background:#fff;margin:0 auto 22px;box-shadow:0 10px 40px -12px rgba(0,0,0,.5);width:210mm}.sheet svg{display:block;width:100%;height:auto}text{font-family:'DM Sans',sans-serif}.cap{color:#e8eaed;text-align:center;font:12px 'DM Mono',monospace;margin:0 0 18px}</style>`;

let totalOverflow = 0;
const indexRows: string[] = [];

for (const fx of FIXTURES) {
	const { pages } = layoutDecoupePdf(fx.input);
	const svgs = buildPageSvgStrings(fx.input);

	// bornes (régression tolérance zéro)
	const overflow: string[] = [];
	const blockMetrics: { page: number; blocks: { tag: string; y: number; h: number; bottom: number }[]; gaps: number[] }[] = [];
	pages.forEach((items, pi) => {
		const blocks = items.map((it) => ({ tag: it.tag, y: ROUND(it.y), h: ROUND(it.h), bottom: ROUND(it.y + it.h) }));
		for (const it of items) if (it.y + it.h > CONTENT_BOTTOM + 0.5) overflow.push(`p${pi + 1}:${it.tag} bottom=${ROUND(it.y + it.h)}>${ROUND(CONTENT_BOTTOM)}`);
		const gaps: number[] = [];
		for (let k = 1; k < items.length; k++) gaps.push(ROUND(items[k].y - (items[k - 1].y + items[k - 1].h)));
		blockMetrics.push({ page: pi + 1, blocks, gaps });
	});
	totalOverflow += overflow.length;

	const pageMetrics = svgs.map((svg, i) => analysePage(svg, i + 1));

	(report.fixtures as Record<string, unknown>)[fx.key] = {
		label: fx.label, nbPages: pages.length, tagsPerPage: pages.map((p) => p.map((i) => i.tag).join(',')),
		overflow, flow: blockMetrics, pages: pageMetrics
	};

	const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Audit · ${fx.key}</title>${cssLink}${sheetCss}</head><body>
<div class="cap">AUDIT FIXTURE · ${fx.key} · ${fx.label} · ${pages.length} page(s) A4</div>
${svgs.map((s) => `<div class="sheet">${s}</div>`).join('\n')}
</body></html>`;
	writeFileSync(`${outDir}/${fx.key}.html`, html, 'utf-8');
	indexRows.push(`<li><a href="${fx.key}.html">${fx.key}</a> — ${fx.label} — ${pages.length} page(s)${overflow.length ? ` — ⚠ ${overflow.length} débordement(s)` : ''}</li>`);
}

writeFileSync(`${outDir}/metrics.json`, JSON.stringify(report, null, 2), 'utf-8');
writeFileSync(`${outDir}/index.html`, `<!doctype html><meta charset="utf-8"><title>Audit PDF Découpe</title><style>body{font-family:system-ui;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.7}</style><h1>Audit visuel PDF Découpe Films</h1><p>${FIXTURES.length} fixtures · débordements totaux : <b>${totalOverflow}</b></p><ul>${indexRows.join('')}</ul>`, 'utf-8');

console.log(`Fixtures: ${FIXTURES.length} | débordements totaux: ${totalOverflow}`);
console.log(`Écrit ${outDir}/metrics.json + ${FIXTURES.length} HTML + index.html`);
for (const fx of FIXTURES) {
	const r = (report.fixtures as Record<string, { nbPages: number; overflow: string[] }>)[fx.key];
	console.log(`  - ${fx.key.padEnd(16)} ${r.nbPages} page(s)${r.overflow.length ? `  OVERFLOW ${r.overflow.join('; ')}` : ''}`);
}
