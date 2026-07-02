import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
	buildListePagesSvg,
	toListeRow,
	paginateRows,
	PAGE_W,
	PAGE_H
} from '../src/lib/campagnes-pdf/pdf-liste-prospects';
import { OUTFIT_400, OUTFIT_700 } from '../src/lib/etiquettes/etiquettes-fonts';
import { filmproLogoSvg } from '../src/lib/pdf/filmpro-logo';
import type { ProspectCampagne } from '../src/lib/campagnes';

/**
 * Validation que la liste de prospects d'une campagne se convertit en VRAI PDF A4 PAYSAGE avec
 * les mêmes libs que l'app (jsPDF + svg2pdf, polices Outfit, logo partagé) ET que les pastilles
 * « Ouvrir sur Google Maps » deviennent de vraies annotations de lien cliquables (`doc.link`),
 * ce que svg2pdf seul ne produit pas. Méthode identique à `etiquettes-pdf.test.ts` : page
 * `about:blank` + libs injectées, document reproduit comme dans `exportListeProspectsPdf`
 * (compress: false pour pouvoir asserter le binaire : /Annots, /URI, MediaBox paysage).
 */
const JSPDF_UMD = readFileSync(new URL('../node_modules/jspdf/dist/jspdf.umd.min.js', import.meta.url), 'utf8');
const SVG2PDF_UMD = readFileSync(new URL('../node_modules/svg2pdf.js/dist/svg2pdf.umd.min.js', import.meta.url), 'utf8');

async function prepare(page: Page): Promise<void> {
	await page.goto('about:blank');
	await page.addScriptTag({ content: JSPDF_UMD }); // doit précéder svg2pdf (qui lit window.jspdf)
	await page.addScriptTag({ content: SVG2PDF_UMD });
}

function leads(n: number, googleEvery = 2): ProspectCampagne[] {
	const villes: Array<[string, string]> = [['1204', 'Genève'], ['1003', 'Lausanne'], ['1950', 'Sion'], ['1700', 'Fribourg']];
	return Array.from({ length: n }, (_, i) => {
		const isGoogle = googleEvery > 0 && i % googleEvery === 0;
		const [npa, localite] = villes[i % villes.length];
		return {
			id: `L${i}`,
			raison_sociale: `Entreprise Test ${i + 1} SA`,
			adresse: `Rue de l’Exemple ${i + 1}`,
			npa,
			localite,
			statut: 'vide',
			score_pertinence: 5,
			source: isGoogle ? 'google_places' : 'zefix',
			source_url: isGoogle ? `https://maps.google.com/?cid=${1000 + i}` : `https://zefix.ch/x${i}`,
			description: isGoogle ? `Rue de l’Exemple ${i + 1}, ${npa} ${localite}, Suisse — real_estate_agency / establishment` : null,
			google_types: isGoogle ? ['real_estate_agency', 'establishment'] : null,
			groupe_id: null,
			validation_statut: null
		};
	});
}

/** Reproduit exportListeProspectsPdf (paysage + polices + logo + doc.link) et rend le binaire. */
async function buildFullPdf(page: Page, prospects: ProspectCampagne[]): Promise<string> {
	const rows = prospects.map(toListeRow);
	const logoFragment = filmproLogoSvg(34, 34, 18, '#00003B');
	const { svgs, links } = buildListePagesSvg('Campagne Test Vitrages', '2 juillet 2026', rows, logoFragment);
	return page.evaluate(
		async ({ svgs, links, w, h, fonts }) => {
			const { jsPDF } = (window as unknown as { jspdf: { jsPDF: new (o: unknown) => unknown } }).jspdf;
			const svg2pdf = (window as unknown as { svg2pdf: { svg2pdf: (el: Element, doc: unknown, o: unknown) => Promise<unknown> } }).svg2pdf.svg2pdf;
			const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape', compress: false }) as {
				addFileToVFS: (n: string, b: string) => void;
				addFont: (n: string, f: string, s: string) => void;
				addPage: (f: string, o: string) => void;
				link: (x: number, y: number, w: number, h: number, o: { url: string }) => void;
				output: () => string;
			};
			doc.addFileToVFS('Outfit-Regular.ttf', fonts.s4);
			doc.addFont('Outfit-Regular.ttf', 'Outfit', 'normal');
			doc.addFileToVFS('Outfit-Bold.ttf', fonts.s7);
			doc.addFont('Outfit-Bold.ttf', 'Outfit', 'bold');
			for (let i = 0; i < svgs.length; i++) {
				if (i > 0) doc.addPage('a4', 'landscape');
				const el = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
				await svg2pdf(el, doc, { x: 0, y: 0, width: w, height: h });
				for (const l of links) {
					if (l.page === i) doc.link(l.x, l.y, l.w, l.h, { url: l.url });
				}
			}
			return doc.output();
		},
		{ svgs, links, w: PAGE_W, h: PAGE_H, fonts: { s4: OUTFIT_400, s7: OUTFIT_700 } }
	);
}

test('liste 1 page (Google + non-Google) -> PDF paysage valide avec liens cliquables', async ({ page }) => {
	await prepare(page);
	const pdf = await buildFullPdf(page, leads(8, 2));
	expect(pdf.startsWith('%PDF')).toBe(true);
	// A4 PAYSAGE : MediaBox largeur ~841.89 en premier (et pas portrait 595.28 x 841.89).
	expect(pdf).toMatch(/\/MediaBox \[0 0 841\.8[89]\d* 595\.2[78]\d*\]/);
	// 4 leads Google -> 4 annotations de lien /URI vers Google Maps.
	expect(pdf).toContain('/Annots');
	const uris = pdf.match(/\/URI \(https:\/\/maps\.google\.com\/\?cid=\d+\)/g) ?? [];
	expect(uris.length).toBe(4);
	// Jamais de lien pour les leads non-Google.
	expect(pdf).not.toContain('zefix.ch');
	expect(pdf.length, 'document substantiel (logo + tableau + polices)').toBeGreaterThan(8000);
});

test('liste multi-pages : liens posés sur la BONNE page', async ({ page }) => {
	await prepare(page);
	const n = 40; // déborde la page 1
	expect(paginateRows(n).length).toBeGreaterThan(1);
	const pdf = await buildFullPdf(page, leads(n, 1));
	expect(pdf.startsWith('%PDF')).toBe(true);
	const uris = pdf.match(/\/URI \(https:\/\/maps\.google\.com\/\?cid=\d+\)/g) ?? [];
	expect(uris.length).toBe(n);
	// Chaque page (objet /Type /Page) doit exister ; toutes portent des /Annots (liens partout).
	const pagesInPdf = pdf.match(/\/Type \/Page[^s]/g) ?? [];
	expect(pagesInPdf.length).toBe(paginateRows(n).length);
});

test('campagne 100 % hors Google : PDF valide, zéro annotation de lien', async ({ page }) => {
	await prepare(page);
	const pdf = await buildFullPdf(page, leads(6, 0)); // aucun lead Google
	expect(pdf.startsWith('%PDF')).toBe(true);
	expect(pdf).not.toContain('/URI (https://maps.google.com');
});
