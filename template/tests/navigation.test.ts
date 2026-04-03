import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
	test('redirige vers /login si non authentifie', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
	});

	test('la page login contient le bouton Google', async ({ page }) => {
		await page.goto('/login');
		await expect(page.locator('text=Se connecter avec Google')).toBeVisible();
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
