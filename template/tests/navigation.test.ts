import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
	test('redirige vers /login si non authentifie', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
	});

	test('la page login contient le formulaire magic link', async ({ page }) => {
		await page.goto('/login');
		await expect(page.locator('text=Recevoir le lien de connexion')).toBeVisible();
	});

	test('redirige /contacts vers /login si non authentifie', async ({ page }) => {
		await page.goto('/contacts');
		await expect(page).toHaveURL(/\/login/);
	});

	test('redirige /pipeline vers /login si non authentifie', async ({ page }) => {
		await page.goto('/pipeline');
		await expect(page).toHaveURL(/\/login/);
	});

	test('redirige /prospection vers /login si non authentifie', async ({ page }) => {
		await page.goto('/prospection');
		await expect(page).toHaveURL(/\/login/);
	});
});

test.describe('Responsive mobile', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('page login s\'affiche correctement sur mobile', async ({ page }) => {
		await page.goto('/login');
		await expect(page.locator('text=Recevoir le lien de connexion')).toBeVisible();
		const button = page.locator('button[type="submit"]');
		await expect(button).toBeVisible();
		const box = await button.boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThan(250);
	});
});
