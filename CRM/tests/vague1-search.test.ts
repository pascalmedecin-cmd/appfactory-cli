import { test, expect } from '@playwright/test';

/**
 * E2E Vague 1 cohérence (SPEC_VAGUE1_COHERENCE § 4) :
 * - A1/A2 : la primitive SearchInput est rendue (icône + clear) sur Prospection ET Signaux,
 *   et sur Contacts (cross-app DataTable). Recherche visible y compris en viewport mobile.
 * - Clear `X` réinitialise le champ.
 * - C : le filtre « Type » a disparu de la page Signaux ; le filtre « Canton » reste.
 *
 * Session OTP-free mintée via tests/mint-session.mjs → tests/.auth.local.json.
 */
test.use({ storageState: 'tests/.auth.local.json' });
test.describe.configure({ mode: 'serial' });

test('Signaux : SearchInput présent, filtre Type retiré, Canton conservé, clear fonctionne', async ({ page }) => {
	await page.goto('/crm/signaux', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/signaux/); // pas de redirection login

	const search = page.getByLabel('Rechercher dans les signaux');
	await expect(search).toBeVisible();

	// Chantier C : plus de filtre Type ; Canton conservé.
	await expect(page.getByLabel('Filtrer par type')).toHaveCount(0);
	await expect(page.getByLabel('Filtrer par canton')).toBeVisible();

	// Clear : taper puis effacer remet le champ à vide.
	await search.fill('zur');
	await expect(search).toHaveValue('zur');
	const clear = page.getByLabel('Effacer la recherche');
	await expect(clear).toBeVisible();
	await clear.click();
	await expect(search).toHaveValue('');
});

test('Prospection : SearchInput présent et visible en mobile', async ({ page }) => {
	await page.goto('/crm/prospection', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/prospection/);

	const search = page.getByLabel('Rechercher un prospect');
	await expect(search).toBeVisible();

	// Visible aussi en viewport mobile (critère A1 : plus caché desktop-only).
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(search).toBeVisible();
});

test('Contacts (cross-app DataTable) : page OK, recherche si données sinon empty-state', async ({ page }) => {
	await page.goto('/crm/contacts', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/contacts/);
	// Contacts peut être vide en base (empty-state, sans DataTable donc sans recherche).
	// Si des contacts existent, la recherche DataTable->SearchInput doit être présente.
	const search = page.getByLabel('Rechercher un contact');
	const hasSearch = await search.count();
	if (hasSearch > 0) {
		await expect(search.first()).toBeVisible();
	} else {
		// Pas de données : la page rend son empty-state sans planter (pas de redirection login).
		await expect(page.getByText(/aucun contact/i).first()).toBeVisible();
	}
});
