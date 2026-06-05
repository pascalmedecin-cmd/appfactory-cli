/**
 * Stress test pagination PDF Découpe Films : un film avec BEAUCOUP de lignes de coupe (split de
 * tableau attendu sur plusieurs pages, avec en-tête répété + « (suite) »). Vérifie le moteur de
 * flux. Lancer : `npx vite-node scripts/_decoupe_pdf_stress.ts` puis ouvrir le HTML.
 */
import { writeFileSync } from 'node:fs';
import { buildPageSvgStrings, layoutDecoupePdf, CONTENT_BOTTOM, type DecoupePdfInput } from '../src/lib/decoupe/pdf-export';
import type { PlacementPiece, ResultatOptimisation } from '../src/lib/decoupe/types';

const N = 26; // pièces distinctes → 26 lignes de coupe (déborde largement une page)
const laize = 1830;
let yCursor = 0;
const placements: PlacementPiece[] = [];
const vitresInfo: DecoupePdfInput['vitresInfo'] = {};
const vitreOrder: string[] = [];
for (let k = 0; k < N; k++) {
	const w = 300 + ((k * 37) % 900); // largeur de coupe variée
	const h = 250 + ((k * 53) % 700); // longueur de coupe variée
	const id = `v${k}`;
	placements.push({ vitre_id: id, piece_index: 0, x_mm: 0, y_mm: yCursor, largeur_placee_mm: Math.min(w, laize), hauteur_placee_mm: h, pivotee: k % 3 === 0 });
	yCursor += h;
	vitresInfo[id] = { produit_id: 'p-sol', largeur_mm: w, hauteur_mm: h, quantite: 1 };
	vitreOrder.push(id);
}

const resultat: ResultatOptimisation = {
	plans: [
		{
			produit_id: 'p-sol',
			laize_mm: laize,
			longueur_consommee_mm: yCursor,
			surface_pieces_mm2: placements.reduce((s, p) => s + p.largeur_placee_mm * p.hauteur_placee_mm, 0),
			taux_chute: 0.34,
			poses_en_les: [],
			placements
		}
	],
	commandes_fournisseur: [],
	alertes: []
};

const input: DecoupePdfInput = {
	titre: 'Chantier stress — 26 pièces distinctes',
	dateLabel: '05.06.2026 à 15:10',
	nbVitres: N,
	resultat,
	produitsInfo: { 'p-sol': { reference: 'SOL-70', nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige' } },
	vitresInfo,
	vitreOrder
};

// Garde-fou : aucun bloc ne franchit la zone de contenu.
const { pages } = layoutDecoupePdf(input);
let overflow = 0;
pages.forEach((items, pi) => {
	for (const it of items) {
		if (it.y + it.h > CONTENT_BOTTOM + 0.5) {
			overflow++;
			console.error(`DÉBORDEMENT page ${pi + 1} : ${it.tag} bas=${(it.y + it.h).toFixed(1)} > ${CONTENT_BOTTOM.toFixed(1)}`);
		}
	}
});
const tags = pages.map((p) => p.map((i) => i.tag).join(','));
console.log(`Pages: ${pages.length} | tags par page: ${JSON.stringify(tags)} | débordements: ${overflow}`);

const svgs = buildPageSvgStrings(input);
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Stress PDF Découpe</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>body{margin:0;background:#5b6472;padding:30px 0 60px}.sheet{background:#fff;margin:0 auto 26px;box-shadow:0 10px 40px -12px rgba(0,0,0,.5);width:210mm}.sheet svg{display:block;width:100%;height:auto}text{font-family:'DM Sans',sans-serif}</style></head><body>
${svgs.map((s) => `<div class="sheet">${s}</div>`).join('\n')}
</body></html>`;
writeFileSync('.product-architect/decoupe/pdf-stress.html', html, 'utf-8');
console.log(`Écrit .product-architect/decoupe/pdf-stress.html (${svgs.length} pages)`);
