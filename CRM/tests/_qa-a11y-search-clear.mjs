// Preuve e2e du fix a11y SearchInput : après clic OU Enter sur le bouton clear, le focus revient dans
// l'input (au lieu de retomber sur <body> quand le bouton se démonte). Non flag-gated (touche tous les
// users). Page = /crm/signaux (SearchInput contrôlé client-side, barre toujours rendue, sans dépendre du seed).
// Usage : node tests/_qa-a11y-search-clear.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const origin = process.argv[2] || 'http://localhost:5173';
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = {};

await page.goto(`${origin}/crm/signaux`, { waitUntil: 'networkidle' });
const input = page.locator('input.search-input__field').first();
await input.waitFor({ state: 'visible' });

// 1) Voie SOURIS : remplir -> clic sur le clear -> focus doit revenir dans l'input.
await input.fill('vitrage');
await page.waitForSelector('button.search-input__clear', { state: 'visible' });
await page.click('button.search-input__clear');
await page.waitForTimeout(150);
out.mouse = await page.evaluate(() => {
	const field = document.querySelector('input.search-input__field');
	return {
		focusInInput: document.activeElement === field,
		activeTag: document.activeElement?.tagName?.toLowerCase() ?? null,
		clearUnmounted: document.querySelectorAll('button.search-input__clear').length === 0,
		valueEmpty: field?.value === '',
	};
});

// 2) Voie CLAVIER : remplir -> focus le clear au clavier -> Enter -> focus doit revenir dans l'input
//    (c'est la voie qui matérialise le préjudice a11y : sans le fix, le focus tombe sur <body>).
await input.fill('vitrage');
await page.waitForSelector('button.search-input__clear', { state: 'visible' });
await page.focus('button.search-input__clear');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
out.keyboard = await page.evaluate(() => {
	const field = document.querySelector('input.search-input__field');
	return {
		focusInInput: document.activeElement === field,
		activeTag: document.activeElement?.tagName?.toLowerCase() ?? null,
		clearUnmounted: document.querySelectorAll('button.search-input__clear').length === 0,
	};
});

out.PASS = out.mouse.focusInInput && out.mouse.clearUnmounted && out.keyboard.focusInInput && out.keyboard.clearUnmounted;
console.log(JSON.stringify(out, null, 2));
await browser.close();
