import { test, expect } from '@playwright/test';

/**
 * E2E mini-projet Prospection P1 (SPEC_MINIPROJET_PROSPECTION_SOURCES § BLOC P1) :
 * - La page n'expose plus que les onglets Entreprises + Terrain (SIMAP/RegBL masqués par flag).
 * - Onglet par défaut (sans ?tab) = Entreprises.
 * - ?tab=simap / ?tab=regbl redirige vers l'onglet par défaut (entreprises), pas d'écran fantôme.
 * - Le <select> mobile ne propose pas non plus SIMAP/RegBL.
 *
 * Session OTP-free mintée via tests/mint-session.mjs → tests/.auth.local.json (localhost).
 */
test.use({ storageState: 'tests/.auth.local.json' });
test.describe.configure({ mode: 'serial' });

test('Prospection : seuls Entreprises + Terrain sont rendus, défaut = Entreprises', async ({ page }) => {
	await page.goto('/crm/prospection', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/prospection/); // pas de redirection login

	// Onglets visibles (desktop tablist).
	await expect(page.getByRole('tab', { name: /Entreprises/ })).toBeVisible();
	await expect(page.getByRole('tab', { name: /Terrain/ })).toBeVisible();

	// Onglets masqués (sources coupées en V5).
	await expect(page.getByRole('tab', { name: /Marchés publics/ })).toHaveCount(0);
	await expect(page.getByRole('tab', { name: /Chantiers/ })).toHaveCount(0);

	// Défaut = Entreprises sélectionné.
	await expect(page.getByRole('tab', { name: /Entreprises/ })).toHaveAttribute('aria-selected', 'true');

	// Mobile : le <select> d'onglets ne propose pas non plus SIMAP/RegBL.
	await page.setViewportSize({ width: 390, height: 844 });
	const mobileSelect = page.locator('#tabs-mobile-select');
	await expect(mobileSelect).toHaveCount(1);
	const optionsText = (await mobileSelect.locator('option').allTextContents()).join(' ');
	expect(optionsText).toMatch(/Entreprises/);
	expect(optionsText).toMatch(/Terrain/);
	expect(optionsText).not.toMatch(/Marchés publics|Chantiers/);
});

test('Prospection : ?tab=simap redirige vers Entreprises (pas d\'écran fantôme)', async ({ page }) => {
	await page.goto('/crm/prospection?tab=simap', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/prospection\?tab=entreprises/);
	await expect(page.getByRole('tab', { name: /Entreprises/ })).toHaveAttribute('aria-selected', 'true');
});

test('Prospection : ?tab=regbl redirige vers Entreprises', async ({ page }) => {
	await page.goto('/crm/prospection?tab=regbl', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/prospection\?tab=entreprises/);
});
