import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA 360 portail FilmPro (Session 2 du delivery-plan). Couvre les AC bloquants
 * de phase 4 : home portail, navigation, redirects 308, a11y, responsive, snapshot.
 * Session authentifiée injectée via storageState (playwright.portail.config.ts).
 */

// ---------------------------------------------------------------------------
// AC-019 : anciennes URLs internes -> 308 /crm/* (favoris fondateurs preserves).
// Le redirect 308 s'exécute AVANT le check d'auth → indépendant de la session.
// ---------------------------------------------------------------------------
const LEGACY = [
	'/pipeline',
	'/signaux',
	'/prospection',
	'/entreprises',
	'/contacts',
	'/veille',
	'/reporting',
	'/aide',
	'/log',
	'/dashboard/couts'
];

test.describe('AC-019 redirects 308 anciennes URLs', () => {
	for (const p of LEGACY) {
		test(`GET ${p} -> 308 /crm${p}`, async ({ request }) => {
			const r = await request.get(p, { maxRedirects: 0 });
			expect(r.status()).toBe(308);
			expect(r.headers()['location']).toMatch(new RegExp(`/crm${p}(\\?.*)?$`));
		});
	}

	test('un sous-chemin profond redirige aussi (308) : /pipeline/xyz', async ({ request }) => {
		const r = await request.get('/pipeline/xyz', { maxRedirects: 0 });
		expect(r.status()).toBe(308);
		expect(r.headers()['location']).toMatch(/\/crm\/pipeline\/xyz$/);
	});

	test('AC-024 : le dashboard CRM ne declenche aucun 308 (liens internes deja sous /crm)', async ({ page }) => {
		const r308: string[] = [];
		page.on('response', (res) => {
			if (res.status() === 308) r308.push(res.url());
		});
		await page.goto('/crm', { waitUntil: 'networkidle' });
		// Les quick-actions du dashboard pointent directement sous /crm (pas de filet 308).
		const hrefs = await page.locator('.qa-card').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
		expect(hrefs.length).toBeGreaterThan(0);
		for (const h of hrefs) expect(h, `href quick-action ${h}`).toMatch(/^\/crm\//);
		expect(r308, `aucun 308 attendu, vu: ${r308.join(', ')}`).toEqual([]);
	});

	test('faux positif evite : /login N\'est PAS capture par le 308 -> /crm', async ({ request }) => {
		// Session active : /login -> 303 / (AC-015). Sans session : 200. Jamais un 308 vers /crm.
		const r = await request.get('/login', { maxRedirects: 0 });
		expect(r.status()).not.toBe(308);
		expect(r.headers()['location'] ?? '').not.toMatch(/\/crm/);
	});
});

// ---------------------------------------------------------------------------
// Home portail (authentifiee) : cards, logo, navigation, retour.
// ---------------------------------------------------------------------------
test.describe('Home portail', () => {
	test('AC-015 : /login deja authentifie -> redirige vers la home portail (/)', async ({ page }) => {
		await page.goto('/login');
		await expect(page).toHaveURL(new RegExp('http://localhost:5173/$'));
		await expect(page.getByRole('heading', { name: 'Bonjour, par où commencer ?' })).toBeVisible();
	});

	test('AC-001 : exactement 2 cards (CRM active + Devis bientot)', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.card')).toHaveCount(2);
		// CRM = vrai lien navigable
		await expect(page.getByRole('link', { name: /Ouvrir le CRM/ })).toBeVisible();
		// Devis = conteneur non interactif, badge bientot
		await expect(page.getByText('Bientôt disponible')).toBeVisible();
	});

	test('AC-018 : le vrai logo FilmPro est dans le header de la home', async ({ page }) => {
		await page.goto('/');
		const logo = page.getByRole('img', { name: 'FilmPro' });
		await expect(logo).toBeVisible();
		// Asset verbatim (FilmProLogo inline) : plusieurs sous-chemins (lettres evidees + carres).
		const paths = await logo.locator('path').count();
		expect(paths).toBeGreaterThanOrEqual(4);
	});

	test('AC-002 : clic sur la card CRM navigue vers le dashboard CRM', async ({ page }) => {
		await page.goto('/');
		const lien = page.getByRole('link', { name: /Ouvrir le CRM/ });
		await expect(lien).toBeVisible();
		await Promise.all([page.waitForURL(/\/crm$/), lien.click()]);
		await expect(page.locator('main')).toBeVisible();
	});

	test('AC-003 : la card Devis ne navigue pas (aria-disabled, aucun href)', async ({ page }) => {
		await page.goto('/');
		const devis = page.locator('.card--disabled');
		await expect(devis).toHaveCount(1);
		await expect(devis).toHaveAttribute('aria-disabled', 'true');
		// Pas de lien actif dans la card Devis
		expect(await devis.locator('a').count()).toBe(0);
		// Clic dans la zone (force : l'element est aria-disabled donc "disabled" pour
		// Playwright) : aucune navigation possible faute de <a>, on reste sur la home.
		await devis.click({ force: true, position: { x: 10, y: 10 } });
		await page.waitForTimeout(200);
		await expect(page).toHaveURL(new RegExp('http://localhost:5173/$'));
	});

	test('AC-005 : depuis une page CRM, le logo sidebar ramene au portail (/)', async ({ page }) => {
		await page.goto('/crm/pipeline');
		await page.getByRole('link', { name: 'Retour au portail FilmPro' }).click();
		await expect(page).toHaveURL(new RegExp('http://localhost:5173/$'));
		await expect(page.getByRole('heading', { name: 'Bonjour, par où commencer ?' })).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// AC-004 : 100% des pages CRM accessibles et rendues sans erreur.
// ---------------------------------------------------------------------------
const CRM_PAGES = [
	'/crm',
	'/crm/contacts',
	'/crm/entreprises',
	'/crm/pipeline',
	'/crm/prospection',
	'/crm/signaux',
	'/crm/veille',
	'/crm/reporting',
	'/crm/log',
	'/crm/aide',
	'/crm/dashboard/couts'
];

test.describe('AC-004 pages CRM accessibles sans erreur', () => {
	for (const p of CRM_PAGES) {
		test(`${p} rend sans erreur ni redirect login`, async ({ page }) => {
			const pageErrors: string[] = [];
			page.on('pageerror', (e) => pageErrors.push(e.message));
			const resp = await page.goto(p, { waitUntil: 'networkidle' });
			// Document servi (pas de 4xx/5xx, pas de redirect vers /login)
			expect(resp?.status(), `status ${p}`).toBeLessThan(400);
			await expect(page, `pas de redirect login sur ${p}`).toHaveURL(new RegExp(`${p.replace(/\//g, '\\/')}(\\?.*)?$`));
			await expect(page.locator('main'), `<main> visible ${p}`).toBeVisible();
			expect(pageErrors, `exceptions JS sur ${p}`).toEqual([]);
		});
	}
});

// ---------------------------------------------------------------------------
// AC-009 : axe-core 0 violation serieuse/critique sur la home.
// AC-003 (a11y) couvert : la card disabled est validee par axe (aria-disabled).
// ---------------------------------------------------------------------------
test('AC-009 : axe-core 0 violation serious/critical sur la home', async ({ page }) => {
	await page.goto('/');
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	if (serious.length) {
		console.log('Violations serious/critical:', JSON.stringify(serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
	}
	expect(serious).toEqual([]);
});

// ---------------------------------------------------------------------------
// AC-010 : home responsive (1 colonne < 720px, lisible/utilisable a 375px).
// ---------------------------------------------------------------------------
test.describe('AC-010 home responsive', () => {
	test('375px : cards empilees en 1 colonne, pas de scroll horizontal', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/');
		const cols = await page.locator('.tools-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
		expect(cols.trim().split(/\s+/).length, `colonnes a 375px (${cols})`).toBe(1);
		await expect(page.locator('.card')).toHaveCount(2);
		// Pas de debordement horizontal
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(overflow, 'overflow horizontal').toBeLessThanOrEqual(1);
	});

	test('>=720px : 2 colonnes', async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 800 });
		await page.goto('/');
		const cols = await page.locator('.tools-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
		expect(cols.trim().split(/\s+/).length, `colonnes a 1024px (${cols})`).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// AC-021 : snapshot visuel baseline de la home (approuve au 1er run).
// ---------------------------------------------------------------------------
test('AC-021 : snapshot baseline home portail', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Bonjour, par où commencer ?' })).toBeVisible();
	await expect(page).toHaveScreenshot('portail-home.png', { maxDiffPixelRatio: 0.01 });
});
