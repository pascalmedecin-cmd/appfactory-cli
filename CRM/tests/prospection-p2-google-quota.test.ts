import { test, expect } from '@playwright/test';

/**
 * E2E mini-projet Prospection P2 (SPEC_MINIPROJET_PROSPECTION_SOURCES § BLOC P2) :
 * - Google Places est de nouveau interrogeable depuis la Prospection (carte source présente).
 * - Le compteur « X/900 recherches restantes ce mois » s'affiche AVANT toute recherche
 *   (câblé via le load serveur → modale, sans round-trip).
 *
 * Les seuils 80/95/100 % + le blocage 429 sans appel API sont couverts en unitaire
 * (api-limits.test.ts, google-places/quota/server.test.ts, google-places/server.test.ts).
 * Session OTP-free mintée via tests/mint-session.mjs → tests/.auth.local.json (localhost).
 */
test.use({ storageState: 'tests/.auth.local.json' });
test.describe.configure({ mode: 'serial' });

test('Prospection P2 : Google interrogeable + compteur quota « restantes ce mois » visible', async ({ page }) => {
	await page.goto('/crm/prospection', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/prospection/);

	// Ouvrir la modale d'import via le CTA visible de l'onglet Entreprises (défaut P1).
	await page.locator('button:visible').filter({ hasText: 'Rechercher une entreprise' }).first().click();

	// La carte source Google est proposée (flag rétabli en P2).
	const googleCard = page.locator('#tab-google_places');
	await expect(googleCard).toBeVisible();
	await googleCard.click();

	// Le compteur « X/900 recherches restantes ce mois » s'affiche AVANT toute recherche.
	await expect(page.getByText(/recherches restantes ce mois/i)).toBeVisible();
	// Le formulaire Google (type d'activité) est présent et actionnable.
	await expect(page.locator('#gp-activity')).toBeVisible();
});
