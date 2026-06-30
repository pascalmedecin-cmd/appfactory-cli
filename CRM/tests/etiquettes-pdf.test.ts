import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
	buildEtiquettesPagesSvg,
	layoutEtiquettes,
	PAGE_W,
	PAGE_H
} from '../src/lib/etiquettes/pdf-etiquettes';
import { DMSANS_400, DMSANS_700 } from '../src/lib/decoupe/pdf-fonts';
import type { EtiquetteEntry } from '../src/lib/etiquettes/prospect-etiquette';

/**
 * Validation que **svg2pdf** (le convertisseur SVG → PDF utilisé à l'export) rend bien la planche
 * d'étiquettes d'adresses sur le VRAI PDF généré (mêmes libs que l'app), polices Outfit 400/700
 * réellement embarquées. Méthode identique à `decoupe-pdf.test.ts` : page `about:blank` + libs
 * injectées depuis node_modules + SVG calculés en Node par le moteur pur `pdf-etiquettes.ts`.
 * Aucune session/aucune auth -> robuste (n'exerce pas le flux UI, couvert par le panneau côté app).
 */
const JSPDF_UMD = readFileSync(new URL('../node_modules/jspdf/dist/jspdf.umd.min.js', import.meta.url), 'utf8');
const SVG2PDF_UMD = readFileSync(new URL('../node_modules/svg2pdf.js/dist/svg2pdf.umd.min.js', import.meta.url), 'utf8');

async function svgToPdf(page: Page, svg: string, withFonts = false): Promise<string> {
	return page.evaluate(
		async ({ svg, w, h, withFonts, fonts }) => {
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
			}
			const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
			await svg2pdf(el, doc, { x: 0, y: 0, width: w, height: h });
			return doc.output();
		},
		{ svg, w: PAGE_W, h: PAGE_H, withFonts, fonts: { s4: DMSANS_400, s7: DMSANS_700 } }
	);
}

async function prepare(page: Page): Promise<void> {
	await page.goto('about:blank');
	await page.addScriptTag({ content: JSPDF_UMD }); // doit précéder svg2pdf (qui lit window.jspdf)
	await page.addScriptTag({ content: SVG2PDF_UMD });
}

function entries(n: number): EtiquetteEntry[] {
	const villes = ['1204 Genève', '1003 Lausanne', '1950 Sion', '1700 Fribourg', '2000 Neuchâtel'];
	return Array.from({ length: n }, (_, i) => ({
		nom: `Régie ${i + 1} - Société Immobilière Romande SA`,
		rue: `Rue de l’Exemple ${i + 1}`,
		cpVille: villes[i % villes.length]
	}));
}

test('une page d’étiquettes (vraies polices Outfit) se convertit en PDF valide', async ({ page }) => {
	await prepare(page);
	const svgs = buildEtiquettesPagesSvg(entries(24));
	expect(svgs.length).toBe(1);
	const pdf = await svgToPdf(page, svgs[0], true);
	expect(pdf.startsWith('%PDF')).toBe(true);
	expect(pdf.length, 'document substantiel (texte vectoriel + polices)').toBeGreaterThan(8000);
});

test('planche multi-page (25 adresses -> 2 pages) : chaque page se convertit', async ({ page }) => {
	await prepare(page);
	const svgs = buildEtiquettesPagesSvg(entries(25));
	expect(svgs.length).toBe(2);
	expect(layoutEtiquettes(entries(25)).pages[1].length).toBe(1); // 2e page = 1 étiquette
	for (const svg of svgs) {
		const pdf = await svgToPdf(page, svg, true);
		expect(pdf.startsWith('%PDF')).toBe(true);
	}
});

test('le texte des étiquettes émet réellement du contenu vectoriel (vs page vide)', async ({ page }) => {
	await prepare(page);
	const empty = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${PAGE_W}" height="${PAGE_H}"><rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" fill="#ffffff"/></svg>`;
	const pEmpty = await svgToPdf(page, empty, true);
	const pFull = await svgToPdf(page, buildEtiquettesPagesSvg(entries(6))[0], true);
	expect(pEmpty.startsWith('%PDF')).toBe(true);
	expect(pFull.length, 'les libellés ajoutent du contenu').toBeGreaterThan(pEmpty.length + 200);
});
