import { test, expect } from '@playwright/test';

/**
 * Verrou de câblage : les colonnes d'Entreprises et de Contacts sont redimensionnables et persistent
 * leur largeur (parité avec Prospection/Veille). Protège contre un retrait accidentel de
 * `resizable`/`storageKey` sur le <DataTable> de ces deux vues (cohérence backlog Atelier 209).
 *
 * Resize au CLAVIER (WCAG 2.1.1, DataTable.handleResizeKeydown) = déterministe, sans flakiness pointer.
 * Prérequis : base jetable locale + session premium (cf. prospection-import-liste.test.ts).
 */
test.use({ storageState: 'tests/.auth.local.json', viewport: { width: 1440, height: 900 } });

async function assertResizablePersists(page: import('@playwright/test').Page, path: string, storageKey: string) {
	await page.goto(path, { waitUntil: 'networkidle', timeout: 60_000 });
	const resizer = page.locator('main .col-resizer').first();
	await expect(resizer).toHaveCount(1); // poignée présente = resizable câblé
	await resizer.focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight'); // +20px, écrit colWidths + localStorage
	const stored = await page.evaluate(
		(k) => window.localStorage.getItem('datatable.col-widths.' + k),
		storageKey,
	);
	expect(stored, `largeur persistée sous datatable.col-widths.${storageKey}`).toBeTruthy();
	const parsed = JSON.parse(stored as string) as Record<string, number>;
	expect(Object.keys(parsed).length).toBeGreaterThan(0);
	// Bornes du garde-fou DataTable (40..2000).
	for (const w of Object.values(parsed)) expect(w).toBeGreaterThanOrEqual(40);
}

test('Entreprises : colonnes redimensionnables + persistance', async ({ page }) => {
	await assertResizablePersists(page, '/crm/entreprises', 'entreprises');
});

test('Contacts : colonnes redimensionnables + persistance', async ({ page }) => {
	await assertResizablePersists(page, '/crm/contacts', 'contacts');
});
