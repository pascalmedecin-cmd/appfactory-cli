// QA re-vérif placement recherche ON (fix campagnes + contrôle veille/editeur). Base LOCALE.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const state = (process.argv[2] || 'on').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const report = { state, pages: {} };

async function go(p) { await page.goto(`${origin}${p}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); return page.url(); }
async function boxes(sel) {
	return page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => {
		const r = el.getBoundingClientRect();
		return { x: Math.round(r.x), right: Math.round(r.right), width: Math.round(r.width), h: Math.round(r.height) };
	}), sel);
}

{
	const finalUrl = await go('/crm/campagnes');
	// Sonde le SearchInput (ON) OU le .search legacy (OFF) et le contour de la toolbar.
	report.pages.campagnes = {
		finalUrl,
		searchInput: await boxes('.search-input'),
		legacySearch: await boxes('.search'),
		toolbarRight: await page.evaluate(() => { const t = document.querySelector('.toolbar'); return t ? Math.round(t.getBoundingClientRect().right) : null; }),
	};
	await page.screenshot({ path: `${dir}campagnes-${state}-searchfix.png` });
}
{
	const finalUrl = await go('/crm/veille/editeur');
	report.pages.veilleEditeur = { finalUrl, searchInput: await boxes('.search-input'), legacySearch: await boxes('.search') };
	await page.screenshot({ path: `${dir}veille-editeur-${state}-search.png` });
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
