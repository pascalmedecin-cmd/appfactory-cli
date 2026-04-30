import { test, expect, devices } from '@playwright/test';

/**
 * Screenshots de validation /veille refonte 2026-04-30.
 * Lance avec :
 *   npx playwright test tests/refonte-veille-screenshots.spec.ts --config=playwright.veille.config.ts
 */

const SHOTS_DIR = '../notes/refonte-veille-2026-04-30';

test.describe('/veille refonte - screenshots', () => {
	test('desktop 1280x900 - full page', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/veille', { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		await page.screenshot({
			path: `${SHOTS_DIR}/after-desktop.png`,
			fullPage: true,
		});
	});

	test('desktop 1440x900 - hero only', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/veille', { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		await page.screenshot({
			path: `${SHOTS_DIR}/after-desktop-1440.png`,
			fullPage: true,
		});
	});

	test('mobile iPhone 14 Pro Max - full page (audit objectif)', async ({ browser }) => {
		const context = await browser.newContext({
			...devices['iPhone 14 Pro Max'],
			storageState: 'tests/.auth.json',
		});
		const page = await context.newPage();
		await page.goto('/veille', { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);

		const overflow = await page.evaluate(() => {
			const html = document.documentElement;
			const body = document.body;
			return {
				scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
				innerWidth: window.innerWidth,
			};
		});
		expect.soft(
			overflow.scrollWidth,
			`mobile : scrollWidth (${overflow.scrollWidth}) > innerWidth (${overflow.innerWidth})`,
		).toBeLessThanOrEqual(overflow.innerWidth + 1);

		await page.screenshot({
			path: `${SHOTS_DIR}/after-mobile.png`,
			fullPage: true,
		});
		await context.close();
	});

	test('CTA primary visible et accessible (a11y)', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/veille', { waitUntil: 'networkidle' });
		const cta = page.locator('a:has-text("Lire l\'édition complète")').first();
		await expect(cta).toBeVisible();
		const box = await cta.boundingBox();
		expect.soft(box?.height ?? 0, `CTA height ${box?.height}px doit être ≥ 40px`).toBeGreaterThanOrEqual(40);
	});

	test('navigation /veille → /veille/[id] preservée', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/veille', { waitUntil: 'networkidle' });
		const cta = page.locator('a:has-text("Lire l\'édition complète")').first();
		await cta.click();
		await page.waitForURL(/\/veille\/[\w-]+/);
		expect(page.url()).toMatch(/\/veille\/[\w-]+/);
	});

	test('détail édition desktop 1280 - full page', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/veille', { waitUntil: 'networkidle' });
		const cta = page.locator('a:has-text("Lire l\'édition complète")').first();
		await cta.click();
		await page.waitForURL(/\/veille\/[\w-]+/);
		await page.waitForTimeout(800);
		await page.screenshot({
			path: `${SHOTS_DIR}/after-detail-desktop.png`,
			fullPage: true,
		});
	});

	test('détail édition mobile iPhone 14 Pro Max - full page', async ({
		browser,
	}) => {
		const context = await browser.newContext({
			...devices['iPhone 14 Pro Max'],
			storageState: 'tests/.auth.json',
		});
		const page = await context.newPage();
		await page.goto('/veille', { waitUntil: 'networkidle' });
		const cta = page.locator('a:has-text("Lire l\'édition complète")').first();
		await cta.click();
		await page.waitForURL(/\/veille\/[\w-]+/);
		await page.waitForTimeout(800);

		const overflow = await page.evaluate(() => {
			const html = document.documentElement;
			const body = document.body;
			return {
				scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
				innerWidth: window.innerWidth,
			};
		});
		expect.soft(
			overflow.scrollWidth,
			`détail mobile : scrollWidth (${overflow.scrollWidth}) > innerWidth (${overflow.innerWidth})`,
		).toBeLessThanOrEqual(overflow.innerWidth + 1);

		await page.screenshot({
			path: `${SHOTS_DIR}/after-detail-mobile.png`,
			fullPage: true,
		});
		await context.close();
	});
});
