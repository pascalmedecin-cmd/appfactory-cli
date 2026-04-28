import { test, expect, type Page } from '@playwright/test';

const PAGES_TO_AUDIT = [
	{ path: '/', label: 'Dashboard' },
	{ path: '/contacts', label: 'Contacts' },
	{ path: '/entreprises', label: 'Entreprises' },
	{ path: '/pipeline', label: 'Pipeline' },
	{ path: '/prospection', label: 'Prospection' },
	{ path: '/signaux', label: 'Signaux' },
	{ path: '/veille', label: 'Veille' },
	{ path: '/reporting', label: 'Reporting' },
];

async function checkNoHorizontalOverflow(page: Page, label: string) {
	const overflow = await page.evaluate(() => {
		const html = document.documentElement;
		const body = document.body;
		return {
			scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
			clientWidth: html.clientWidth,
			innerWidth: window.innerWidth,
		};
	});
	expect.soft(overflow.scrollWidth, `${label} : scrollWidth (${overflow.scrollWidth}) > innerWidth (${overflow.innerWidth})`).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

test.describe('CRM mobile V1 — audits objectifs', () => {
	for (const { path, label } of PAGES_TO_AUDIT) {
		test(`${label} (${path}) — pas de scroll horizontal`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'networkidle' });
			await checkNoHorizontalOverflow(page, label);
		});
	}

	test('Sidebar : entrée Reporting visible (mobile menu)', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const burger = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
		await burger.click();
		const reportingLink = page.locator('a[href="/reporting"]');
		await expect(reportingLink).toBeVisible();
		const text = await reportingLink.textContent();
		expect(text?.toLowerCase()).toContain('reporting');
	});

	test('Reporting : SVG widths ≤ parent, pas de débordement', async ({ page }) => {
		await page.goto('/reporting', { waitUntil: 'networkidle' });
		const svgs = await page.locator('svg').all();
		expect(svgs.length).toBeGreaterThan(0);
		for (let i = 0; i < svgs.length; i++) {
			const svg = svgs[i];
			const parent = svg.locator('xpath=..');
			const sBox = await svg.boundingBox();
			const pBox = await parent.boundingBox();
			if (!sBox || !pBox) continue;
			expect.soft(sBox.width, `SVG #${i} width ${sBox.width} > parent ${pBox.width}`).toBeLessThanOrEqual(pBox.width + 1);
		}
	});

	test('Prospection : table width ≤ wrapper, "Temp." abrégé sous md', async ({ page }) => {
		await page.goto('/prospection', { waitUntil: 'networkidle' });
		const table = page.locator('table').first();
		const wrapper = table.locator('xpath=..');
		const tBox = await table.boundingBox();
		const wBox = await wrapper.boundingBox();
		if (tBox && wBox) {
			expect.soft(tBox.width, `Table width ${tBox.width} > wrapper ${wBox.width}`).toBeLessThanOrEqual(wBox.width + 1);
		}
		// Temp. abrégé : le label "Température" doit être absent en mobile (md:inline)
		const fullLabel = page.locator('th:has-text("Température")').first();
		const shortLabel = page.locator('th:has-text("Temp.")').first();
		const fullVisible = await fullLabel.isVisible().catch(() => false);
		const shortVisible = await shortLabel.isVisible().catch(() => false);
		expect.soft(shortVisible || !fullVisible, `Header Température doit être abrégé "Temp." sur mobile`).toBeTruthy();
	});

	test('Boutons modale d\'action ≥ 44px (HIG) sur 5 routes', async ({ page }) => {
		const routes = ['/contacts', '/entreprises', '/pipeline', '/signaux', '/prospection'];
		for (const route of routes) {
			await page.goto(route, { waitUntil: 'networkidle' });
			// Trigger modale : bouton "Ajouter", "Nouveau", "+"
			const triggerBtn = page.locator('button:has-text("Ajouter"), button:has-text("Nouveau"), button[aria-label*="ajouter" i]').first();
			const hasTrigger = await triggerBtn.isVisible().catch(() => false);
			if (!hasTrigger) continue;
			await triggerBtn.click();
			await page.waitForTimeout(300);
			// Mesurer hauteur des boutons d'ACTION (avec texte) dans la modale, hors bouton X close
			const actionButtons = page.locator('[role="dialog"], .modal, dialog').first().locator('button:has-text("Annuler"), button:has-text("Enregistrer"), button:has-text("Sauvegarder"), button:has-text("Supprimer"), button:has-text("Confirmer"), button:has-text("Valider"), button[type="submit"]');
			const count = await actionButtons.count();
			for (let i = 0; i < count; i++) {
				const btn = actionButtons.nth(i);
				const box = await btn.boundingBox().catch(() => null);
				const label = await btn.textContent().catch(() => '');
				if (!box) continue;
				expect.soft(box.height, `${route} : bouton modale "${label?.trim()}" hauteur ${box.height}px < 44`).toBeGreaterThanOrEqual(44);
			}
			// Fermer modale (Escape)
			await page.keyboard.press('Escape');
		}
	});

	test('Dashboard : 4 raccourcis ≥ 44px hauteur', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		const shortcuts = page.locator('a[class*="shortcut"], a[class*="raccourci"], main a').filter({ hasText: /\w/ });
		const count = await shortcuts.count();
		let measured = 0;
		for (let i = 0; i < count && measured < 4; i++) {
			const box = await shortcuts.nth(i).boundingBox().catch(() => null);
			if (box && box.height > 0) {
				expect.soft(box.height, `Raccourci #${i} hauteur ${box.height}px < 44`).toBeGreaterThanOrEqual(44);
				measured++;
			}
		}
	});

	test('Police DM Sans self-hosted : 0 requête fonts.googleapis.com', async ({ page }) => {
		const externalFontRequests: string[] = [];
		page.on('request', (req) => {
			const url = req.url();
			if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
				externalFontRequests.push(url);
			}
		});
		await page.goto('/', { waitUntil: 'networkidle' });
		expect(externalFontRequests, `Requêtes Google Fonts détectées : ${externalFontRequests.join(', ')}`).toHaveLength(0);
	});
});
