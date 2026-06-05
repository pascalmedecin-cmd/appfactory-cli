/**
 * Aperçu navigateur du PDF Découpe Films (dev/QA fidélité).
 * Rejoue le scénario du golden « Villa Léman, étage 2 » et écrit un HTML embarquant les SVG
 * de page produits par `buildPageSvgStrings` (= exactement ce que svg2pdf convertira).
 * Lancer : `npx vite-node scripts/_decoupe_pdf_preview.ts` (depuis CRM/), puis ouvrir le HTML.
 */
import { writeFileSync } from 'node:fs';
import { buildPageSvgStrings, type DecoupePdfInput } from '../src/lib/decoupe/pdf-export';
import type { ResultatOptimisation } from '../src/lib/decoupe/types';

const resultat: ResultatOptimisation = {
	plans: [
		{
			produit_id: 'p-sec',
			laize_mm: 1830,
			longueur_consommee_mm: 600,
			surface_pieces_mm2: 3 * 600 * 600,
			taux_chute: 0.02,
			poses_en_les: [],
			placements: [0, 600, 1200].map((x) => ({
				vitre_id: 'v-600', piece_index: 0, x_mm: x, y_mm: 0, largeur_placee_mm: 600, hauteur_placee_mm: 600, pivotee: false
			}))
		},
		{
			produit_id: 'p-sol',
			laize_mm: 1830,
			longueur_consommee_mm: 5300,
			surface_pieces_mm2: 2 * 900 * 2100 + 4 * 1200 * 800,
			taux_chute: 0.21,
			poses_en_les: [],
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

const input: DecoupePdfInput = {
	titre: 'Villa Léman, étage 2',
	dateLabel: '05.06.2026 à 14:32',
	nbVitres: 6,
	resultat,
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
};

const svgs = buildPageSvgStrings(input);
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Aperçu PDF Découpe Films</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#5b6472;padding:30px 0 60px;font-family:'DM Sans',sans-serif}
.bar{color:#e8eaed;text-align:center;font:12px 'DM Mono',monospace;margin-bottom:24px;padding:0 16px;line-height:1.6}
.sheet{background:#fff;margin:0 auto 26px;box-shadow:0 10px 40px -12px rgba(0,0,0,.5);width:210mm}
.sheet svg{display:block;width:100%;height:auto}
text{font-family:'DM Sans',sans-serif}
</style></head><body>
<div class="bar">APERÇU PDF (rendu via buildPageSvgStrings = ce que svg2pdf convertira) · ${svgs.length} page(s) A4 · scénario golden « Villa Léman »</div>
${svgs.map((s) => `<div class="sheet">${s}</div>`).join('\n')}
</body></html>`;

const out = '.product-architect/decoupe/pdf-preview.html';
writeFileSync(out, html, 'utf-8');
console.log(`Écrit ${out} (${svgs.length} page(s))`);
