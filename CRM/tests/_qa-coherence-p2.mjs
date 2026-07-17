// QA DOM cohérence UI b PART 2 — base jetable LOCALE. Sonde le swap OFF/ON des états vides
// (EmptyState) et des recherches (SearchInput) sur les vraies vues, sans supposer le rendu.
// L'app lit la metadata LIVE (getUser) : flipper le flag en DB entre deux runs suffit.
//   1) node tests/_set-coherence-flag-local.mjs off && node tests/_qa-coherence-p2.mjs off
//   2) node tests/_set-coherence-flag-local.mjs on  && node tests/_qa-coherence-p2.mjs on
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = (process.argv[2] || 'off').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const report = { state, pages: {} };

async function go(path) {
	await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	return page.url();
}

// --- Veille : état vide (0 édition seedée) ---
{
	const finalUrl = await go('/crm/veille');
	const sonde = await page.evaluate(() => {
		const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim().startsWith('Aucune édition publiée'));
		const inStatus = !!h?.closest('[role="status"]');
		const card = h?.closest('.rounded-xl');
		return {
			emptyTextFound: !!h,
			emptyStatePrimitive: inStatus, // ON attendu : true (EmptyState role=status)
			legacyCardPresent: !!card && !inStatus, // OFF attendu : true (carte bg-white rounded-xl)
			iconSize: (() => {
				const svg = h?.closest('[role="status"],.rounded-xl')?.querySelector('svg');
				return svg ? { w: svg.getAttribute('width') || getComputedStyle(svg).width, cls: svg.getAttribute('class') } : null;
			})(),
		};
	});
	report.pages.veille = { finalUrl, redirected: !finalUrl.includes('/crm/veille'), ...sonde };
	await page.screenshot({ path: `${dir}veille-${state}-empty.png` });
}

// --- Campagnes : recherche (toujours visible) + état vide via recherche nonsense ---
{
	const finalUrl = await go('/crm/campagnes');
	const searchSonde = await page.evaluate(() => ({
		searchInputPrimitive: document.querySelectorAll('.search-input').length, // ON : ≥1
		legacySearch: document.querySelectorAll('.search input[type="search"]').length, // OFF : ≥1
		searchInputHeight: (() => {
			const el = document.querySelector('.search-input');
			return el ? getComputedStyle(el).height : null; // ON attendu : 40px
		})(),
	}));
	// Déclenche l'état vide : tape un terme qui ne matche rien.
	const input = page.locator('.search-input input, .search input[type="search"]').first();
	let emptySonde = { skipped: true };
	if (await input.count()) {
		await input.fill('zzz-aucune-campagne-xyz');
		await page.waitForTimeout(400);
		emptySonde = await page.evaluate(() => {
			const h = [...document.querySelectorAll('h2,h3')].find((e) => e.textContent.includes('Aucune campagne ne correspond'));
			return {
				emptyTextFound: !!h,
				emptyStatePrimitive: !!h?.closest('[role="status"]'), // ON : true
				legacyEmptyPresent: !!h?.closest('.empty') && !h?.closest('[role="status"]'), // OFF : true
			};
		});
	}
	report.pages.campagnes = { finalUrl, redirected: !finalUrl.includes('/crm/campagnes'), search: searchSonde, empty: emptySonde };
	await page.screenshot({ path: `${dir}campagnes-${state}-search-empty.png` });
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
