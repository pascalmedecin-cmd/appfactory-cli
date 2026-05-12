import type { Page } from '@playwright/test';

/**
 * Seeders d'état DB pour les e2e mobiles (audit 360 M-57 — déskip des tests qui
 * dépendaient d'un lead / d'une entreprise présent en prod).
 *
 * Stratégie : on crée la fixture *via les form actions de l'app* (pas d'accès DB direct),
 * en utilisant la session authentifiée déjà chargée dans `storageState` (tests/.auth.json).
 * Idempotent en pratique : si une fixture du même nom existe déjà, l'app crée un doublon
 * inoffensif (table de test interne FilmPro). Best-effort : si la création échoue (auth
 * absente, action 4xx), le helper renvoie `false` → le test concerné reste skippé proprement.
 *
 * Noms réservés : préfixe « [E2E] » pour repérer / purger les fixtures côté CRM.
 */

const E2E_LEAD = '[E2E] Fixture Lead SA';
const E2E_ENTREPRISE = '[E2E] Fixture Entreprise SA';

async function actionOk(page: Page, path: string, fields: Record<string, string>): Promise<boolean> {
	try {
		const resp = await page.request.post(path, { multipart: fields });
		if (!resp.ok()) return false;
		// Une form action SvelteKit renvoie un body JSON ; on accepte tout 2xx
		// (création réussie, ou doublon traité comme succès).
		return true;
	} catch {
		return false;
	}
}

async function hasFirstRow(page: Page, listPath: string): Promise<boolean> {
	await page.goto(listPath, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	return page.locator('main tbody tr').first().isVisible().catch(() => false);
}

/** Garantit qu'au moins un lead existe (et est listé). Renvoie `true` si une ligne est visible ensuite. */
export async function ensureSeedLead(page: Page): Promise<boolean> {
	if (await hasFirstRow(page, '/prospection')) return true;
	await actionOk(page, '/prospection?/createExpress', {
		raison_sociale: E2E_LEAD,
		telephone: '+41 21 000 00 00',
		nom_contact: '',
		notes: 'Fixture e2e — peut être archivée',
		force_create: '1',
	});
	return hasFirstRow(page, '/prospection');
}

/** Garantit qu'au moins une entreprise existe (et est listée). */
export async function ensureSeedEntreprise(page: Page): Promise<boolean> {
	if (await hasFirstRow(page, '/entreprises')) return true;
	await actionOk(page, '/entreprises?/create', {
		raison_sociale: E2E_ENTREPRISE,
		notes_libres: 'Fixture e2e — peut être archivée',
	});
	return hasFirstRow(page, '/entreprises');
}
