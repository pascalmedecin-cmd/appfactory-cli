import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
	gauge,
	buildPageSvgStrings,
	PAGE_W,
	PAGE_H,
	type DecoupePdfInput
} from '../src/lib/decoupe/pdf-export';
import { DMSANS_400, DMSANS_700, DMMONO_400 } from '../src/lib/decoupe/pdf-fonts';
import type { PlacementPiece, PlanProduit } from '../src/lib/decoupe/types';

/**
 * Validation que **svg2pdf** (le convertisseur SVG → PDF utilisé à l'export) rend bien le DONUT
 * du KPI « Taux de chute » sur le VRAI PDF généré (point de vigilance de l'audit visuel
 * 2026-06-05 : `<circle>` + arc `path M…L…`, sans la commande d'arc « A »).
 *
 * Méthode décisive et robuste, sans outil de rastérisation :
 *  - on convertit, dans Chromium, des SVG ne contenant QUE la jauge via jsPDF + svg2pdf
 *    (mêmes libs que l'app), PDF NON compressé (`compress:false`) ;
 *  - frac=0 (anneau seul) > SVG vide  ⇒ le `<circle>` émet du contenu vectoriel (pas ignoré) ;
 *  - frac=1 (anneau + arc) > frac=0   ⇒ l'arc `path M…L…` émet du contenu (pas ignoré) ;
 *  - enfin la PAGE RÉELLE (donut inclus, vraies polices DM Sans/Mono) se convertit en PDF
 *    valide sans lever d'erreur. Le parcours bouton → téléchargement réel est couvert par
 *    `decoupe.test.ts` (pipeline complet exercé end-to-end).
 *
 * Ces tests n'utilisent ni l'app ni de session : page `about:blank` + libs injectées depuis
 * node_modules + SVG calculés en Node par le moteur pur `pdf-export.ts`.
 */

const JSPDF_UMD = readFileSync(
	new URL('../node_modules/jspdf/dist/jspdf.umd.min.js', import.meta.url),
	'utf8'
);
const SVG2PDF_UMD = readFileSync(
	new URL('../node_modules/svg2pdf.js/dist/svg2pdf.umd.min.js', import.meta.url),
	'utf8'
);

/** Convertit un SVG en chaîne PDF (non compressée) dans le navigateur, polices optionnelles. */
async function svgToPdf(page: Page, svg: string, w: number, h: number, withFonts = false): Promise<string> {
	return page.evaluate(
		async ({ svg, w, h, withFonts, fonts }) => {
			// jsPDF expose window.jspdf.jsPDF ; svg2pdf (UMD) lit window.jspdf et expose window.svg2pdf.svg2pdf.
			const { jsPDF } = (window as unknown as { jspdf: { jsPDF: new (o: unknown) => unknown } }).jspdf;
			const svg2pdf = (window as unknown as { svg2pdf: { svg2pdf: (el: Element, doc: unknown, o: unknown) => Promise<unknown> } }).svg2pdf.svg2pdf;
			const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false }) as {
				addFileToVFS: (n: string, b: string) => void;
				addFont: (n: string, f: string, s: string) => void;
				output: () => string;
			};
			if (withFonts) {
				doc.addFileToVFS('DMSans-Regular.ttf', fonts.s4);
				doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal');
				doc.addFileToVFS('DMSans-Bold.ttf', fonts.s7);
				doc.addFont('DMSans-Bold.ttf', 'DMSans', 'bold');
				doc.addFileToVFS('DMMono-Regular.ttf', fonts.m4);
				doc.addFont('DMMono-Regular.ttf', 'DMMono', 'normal');
			}
			const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
			await svg2pdf(el, doc, { x: 0, y: 0, width: w, height: h });
			return doc.output();
		},
		{ svg, w, h, withFonts, fonts: { s4: DMSANS_400, s7: DMSANS_700, m4: DMMONO_400 } }
	);
}

async function prepare(page: Page): Promise<void> {
	await page.goto('about:blank');
	await page.addScriptTag({ content: JSPDF_UMD }); // doit précéder svg2pdf (qui lit window.jspdf)
	await page.addScriptTag({ content: SVG2PDF_UMD });
}

function donutSvg(frac: number): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">${gauge(30, 30, 11, frac, '#B42318', '#F3F4F6', 3.5)}</svg>`;
}
const EMPTY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60"></svg>';

test('svg2pdf rend le donut : le <circle> puis l’arc path M…L… émettent du contenu vectoriel', async ({ page }) => {
	await prepare(page);
	const pEmpty = await svgToPdf(page, EMPTY_SVG, 60, 60);
	const pRing = await svgToPdf(page, donutSvg(0), 60, 60); // anneau de fond seul
	const pArc = await svgToPdf(page, donutSvg(1), 60, 60); // anneau + arc complet

	for (const pdf of [pEmpty, pRing, pArc]) {
		expect(pdf.startsWith('%PDF')).toBe(true);
	}
	// Le <circle> de fond ajoute du contenu (s'il était ignoré, pRing ≈ pEmpty).
	expect(pRing.length, 'cercle de fond émis').toBeGreaterThan(pEmpty.length + 40);
	// L'arc (path M…L…) ajoute du contenu (s'il était ignoré, pArc ≈ pRing).
	expect(pArc.length, 'arc proportionnel émis').toBeGreaterThan(pRing.length + 40);
});

test('la page réelle (KPI + donut + strips, vraies polices) se convertit en PDF valide', async ({ page }) => {
	await prepare(page);

	// Fixture réaliste : 1 film à chute non nulle (le donut se dessine) + quelques pièces.
	const placements: PlacementPiece[] = Array.from({ length: 6 }, (_, i) => ({
		vitre_id: `v${i}`,
		piece_index: 0,
		x_mm: 0,
		y_mm: i * 600,
		largeur_placee_mm: 800,
		hauteur_placee_mm: 600,
		pivotee: false
	}));
	const plan: PlanProduit = {
		produit_id: 'p1',
		laize_mm: 1520,
		longueur_consommee_mm: 3600,
		surface_pieces_mm2: 6 * 800 * 600,
		taux_chute: 0.16,
		placements,
		poses_en_les: []
	};
	const input: DecoupePdfInput = {
		titre: 'Villa Léman, étage 2',
		dateLabel: '05.06.2026 à 14:32',
		nbVitres: 6,
		resultat: { plans: [plan], alertes: [], commandes_fournisseur: [] },
		produitsInfo: { p1: { reference: 'SLR-70', nom: 'Film solaire neutre', famille: 'solaire', fabricant: 'TestFab' } },
		vitresInfo: Object.fromEntries(
			placements.map((pl) => [pl.vitre_id, { produit_id: 'p1', largeur_mm: 600, hauteur_mm: 800, quantite: 1 }])
		),
		vitreOrder: placements.map((pl) => pl.vitre_id)
	};

	const svgs = buildPageSvgStrings(input);
	expect(svgs.length).toBeGreaterThanOrEqual(1);
	const pdf = await svgToPdf(page, svgs[0], PAGE_W, PAGE_H, true);
	expect(pdf.startsWith('%PDF')).toBe(true);
	expect(pdf.length, 'document substantiel (vecteurs + polices)').toBeGreaterThan(8000);
});
