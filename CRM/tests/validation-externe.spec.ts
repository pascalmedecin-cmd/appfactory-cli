import { test, expect } from '@playwright/test';

/**
 * e2e du flux de VALIDATION EXTERNE d'une campagne (base jetable Colima locale).
 *
 * Ferme la dette « module `8b90f6d` déployé sans Playwright feature-spécifique » : couvre le
 * parcours de bout en bout sur des routes RÉELLES, en trois postures d'utilisateur distinctes.
 *
 *  1. FONDATEUR (authentifié, flag premium) : ouvre la campagne, génère le lien secret ->
 *     l'API renvoie l'URL publique (seul moment où le token existe en clair).
 *  2. PUBLIC (aucune session, contexte navigateur anonyme) : ouvre /validation/<token>, marque
 *     un prospect « Garder » et l'autre « Retirer », puis « Envoyer la validation ».
 *  3. FONDATEUR : la campagne affiche « Validation reçue », la décision « Retirer » remonte en
 *     chip ; la page ÉTIQUETTES propose « Ignorer les Retirer » ; « Appliquer les retraits »
 *     retire effectivement le prospect « Retirer » (le « Garder » reste).
 *
 * Données : seed jetable `supabase/seed.sql` (campagne filmpro « Regies Geneve T4 » + 2 prospects).
 * Pré-requis : `supabase db reset` (migrations + seed) + `node tests/mint-session-local.mjs`.
 */

const CAMPAGNE_ID = '22222222-0000-4000-8000-0000000000f1';
const CAMPAGNE_NOM = 'Regies Geneve T4';
const AUTH = 'tests/.auth.local.json';
const GARDER_NOM = 'Regie du Molard SA'; // reste après application des retraits
const RETIRER_NOM = 'Renovation Genevoise Sarl'; // retiré à la fin

test.describe.configure({ mode: 'serial' });

test('validation externe : fondateur -> public -> étiquettes ignore retirer -> appliquer', async ({ browser }) => {
	test.setTimeout(90_000);

	// ============================================================================
	// 1) FONDATEUR : générer le lien de validation depuis la campagne
	// ============================================================================
	const founder = await browser.newContext({ storageState: AUTH });
	const fpage = await founder.newPage();
	await fpage.goto(`/crm/campagnes/${CAMPAGNE_ID}`);

	const section = fpage.locator('#sec-validation');
	await expect(section).toBeVisible();

	const genBtn = section.getByRole('button', { name: /Partager pour validation|Générer un nouveau lien/ });
	const [genResp] = await Promise.all([
		fpage.waitForResponse(
			(r) => r.url().includes(`/api/campagnes/${CAMPAGNE_ID}/validation`) && r.request().method() === 'POST'
		),
		genBtn.click(),
	]);
	expect(genResp.status()).toBe(201);
	const { url: shareUrl } = (await genResp.json()) as { url: string };
	const token = shareUrl.split('/validation/')[1];
	expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

	// ============================================================================
	// 2) PUBLIC (anonyme) : décider puis envoyer la validation
	// ============================================================================
	const publicCtx = await browser.newContext(); // aucune session : la route est exemptée du gate auth
	const ppage = await publicCtx.newPage();
	await ppage.goto(`/validation/${token}`);

	await expect(ppage.getByRole('heading', { name: CAMPAGNE_NOM })).toBeVisible();
	const garderRow = ppage.locator('.val-row', { hasText: GARDER_NOM });
	const retirerRow = ppage.locator('.val-row', { hasText: RETIRER_NOM });
	await expect(garderRow).toBeVisible();
	await expect(retirerRow).toBeVisible();

	// « Garder » sur l'un, « Retirer » sur l'autre : chaque décision est un POST /decision optimiste.
	await Promise.all([
		ppage.waitForResponse(
			(r) => r.url().includes(`/api/validation/${token}/decision`) && r.request().method() === 'POST' && r.ok()
		),
		garderRow.getByRole('button', { name: 'Garder' }).click(),
	]);
	await Promise.all([
		ppage.waitForResponse(
			(r) => r.url().includes(`/api/validation/${token}/decision`) && r.request().method() === 'POST' && r.ok()
		),
		retirerRow.getByRole('button', { name: 'Retirer' }).click(),
	]);
	await expect(ppage.getByText('2/2 vérifiés')).toBeVisible();

	// Geste final explicite : « Envoyer la validation » -> horodatage serveur.
	await Promise.all([
		ppage.waitForResponse(
			(r) => r.url().includes(`/api/validation/${token}/confirmer`) && r.request().method() === 'POST' && r.ok()
		),
		ppage.getByRole('button', { name: /Envoyer la validation/ }).click(),
	]);
	await expect(ppage.getByText(/Validation envoyée le/)).toBeVisible();

	// ============================================================================
	// 3) FONDATEUR : validation reçue + décisions remontées
	// ============================================================================
	await fpage.goto(`/crm/campagnes/${CAMPAGNE_ID}`);
	await expect(fpage.getByText(/Validation reçue le/)).toBeVisible();
	await expect(fpage.locator('.val-chip.garder')).toBeVisible();
	await expect(fpage.locator('.val-chip.retirer')).toBeVisible();
	await expect(section.getByRole('button', { name: /Appliquer les retraits \(1\)/ })).toBeVisible();

	// ---- Étiquettes : l'option « Ignorer les Retirer » apparaît (un retirer existe) ----
	await fpage.goto(`/crm/campagnes/${CAMPAGNE_ID}/etiquettes`);
	await expect(fpage.getByText(/Ignorer les 1 prospect marqué/)).toBeVisible();

	// ---- Appliquer les retraits : le « Retirer » quitte la campagne, le « Garder » reste ----
	await fpage.goto(`/crm/campagnes/${CAMPAGNE_ID}`);
	await fpage.locator('#sec-validation').getByRole('button', { name: /Appliquer les retraits \(1\)/ }).click();
	const confirmBtn = fpage.getByRole('button', { name: 'Retirer de la campagne' });
	await expect(confirmBtn).toBeVisible();
	await Promise.all([
		fpage.waitForResponse(
			(r) =>
				r.url().includes(`/api/campagnes/${CAMPAGNE_ID}/validation/appliquer`) &&
				r.request().method() === 'POST' &&
				r.ok()
		),
		confirmBtn.click(),
	]);

	await expect(fpage.getByText(RETIRER_NOM)).toHaveCount(0);
	await expect(fpage.getByText(GARDER_NOM)).toBeVisible();

	await founder.close();
	await publicCtx.close();
});
