/**
 * Rendu PNG haute déf (≈240 dpi) de chaque page A4 de chaque fixture d'audit PDF Découpe.
 * Prérequis : avoir lancé `npx vite-node scripts/_decoupe_pdf_audit.ts` (génère audit/*.html).
 * Lancer depuis CRM/ :  node scripts/_decoupe_pdf_shots.mjs
 * Sorties : .product-architect/decoupe/audit-shots/<fixture>-pN.png
 */
import { chromium } from 'playwright';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const AUDIT = resolve('.product-architect/decoupe/audit');
const OUT = resolve('.product-architect/decoupe/audit-shots');
mkdirSync(OUT, { recursive: true });

const files = readdirSync(AUDIT).filter((f) => f.endsWith('.html') && f !== 'index.html');

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2.5, viewport: { width: 820, height: 1200 } });
const page = await ctx.newPage();

let shots = 0;
for (const file of files) {
	const key = file.replace('.html', '');
	await page.goto('file://' + resolve(AUDIT, file), { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	const sheets = await page.locator('.sheet').all();
	for (let i = 0; i < sheets.length; i++) {
		const dest = resolve(OUT, `${key}-p${i + 1}.png`);
		await sheets[i].screenshot({ path: dest });
		shots++;
	}
	console.log(`${key}: ${sheets.length} page(s)`);
}

await browser.close();
console.log(`\nÉcrit ${shots} PNG dans ${OUT}`);
