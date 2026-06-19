import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 2 prospection — tests E2E contre prod (desktop + iPhone 14 Pro Max).
 * Couvre les 3 livrables S157 non-couverts par la suite vitest :
 *  (a) sélecteur entrées par page (URL `?perPage=` + reflet visuel + reload)
 *  (b) colonnes redimensionnables (drag handle + persistance localStorage + reload)
 *  (c) switch onglet (vide ou non) + dégradation mobile (tabs → dropdown <768px)
 *
 * Origine : dette honnête S157 — Phase 2 livrée prod sans validation E2E
 * (Pascal a découvert le bug sélecteur entrées/page via clic UI manuel,
 * fixé commit a48a9c1 sans test régression).
 *
 * Stratégie : zéro mutation données. Lecture-seule sur l'onglet Entreprises (défaut P1).
 * Toute interaction (drag, switch, sélecteur) est rétractable au reload.
 *
 * MISE À JOUR P1 (2026-06-18) : les onglets SIMAP/RegBL sont retirés de la Prospection
 * (sources coupées par flag). Le défaut est désormais Entreprises. Ce test PROD valide donc
 * la prod APRÈS déploiement de P1 (avant déploiement, la prod expose encore les 4 onglets).
 */

const PROSPECTION_PATH = '/prospection';

async function gotoProspectionEntreprises(page: Page) {
	// P1 : l'onglet par défaut est Entreprises (SIMAP/RegBL retirés ; storageKey `prospection-entreprises`).
	await page.goto(`${PROSPECTION_PATH}?tab=entreprises`, { waitUntil: 'networkidle' });
	// Attendre que la table soit montée (au moins le wrapper, même si 0 résultat).
	await page.waitForSelector('table', { timeout: 10_000 });
}

test.describe('Phase 2 prospection — tests E2E', () => {
	test('(a) sélecteur entrées par page : URL ?perPage=50 + select reflète + reload', async ({ page, isMobile }) => {
		await gotoProspectionEntreprises(page);

		const select = page.locator('select[aria-label="Nombre d\'entrées par page"]');
		// Le sélecteur n'apparaît que si le footer est rendu (totalPages > 1 OU pageSizeOptions présentes).
		// Phase 2 passe pageSizeOptions=[25,50,100], donc footer toujours rendu.
		await expect(select).toBeVisible({ timeout: 10_000 });

		// Valeur initiale = 25 (DEFAULT_PAGE_SIZE) quand pas de ?perPage en URL.
		await expect(select).toHaveValue('25');

		// Switcher à 50 : déclenche goto avec ?perPage=50.
		await select.selectOption('50');
		await page.waitForURL((url) => url.searchParams.get('perPage') === '50', { timeout: 5_000 });

		// Le sélecteur reflète bien la nouvelle valeur (régression Pascal a48a9c1 :
		// `<option value={opt}>` numérique + `<select value={pageSize}>` cassait le reflet).
		await expect(select).toHaveValue('50');

		// Reload : valeur persiste via URL.
		await page.reload({ waitUntil: 'networkidle' });
		await expect(select).toHaveValue('50');

		// Cleanup : revenir à perPage=25 pour ne pas polluer la session.
		await select.selectOption('25');
		await page.waitForURL((url) => !url.searchParams.has('perPage') || url.searchParams.get('perPage') === '25', { timeout: 5_000 });
	});

	test('(b) colonnes resizables : drag handle + persistance localStorage + reload', async ({ page, isMobile }) => {
		// Le drag pointer suppose un device avec mouse. Sur iPhone (touch), le
		// handle n'est pas exposé visuellement (cf. CSS .col-resizer hover-only).
		// On skip le scénario drag sur mobile mais on garde un check structurel.
		await gotoProspectionEntreprises(page);

		const STORAGE_KEY = 'datatable.col-widths.prospection-entreprises';

		// Reset état localStorage au cas où une exécution précédente a laissé des largeurs.
		await page.evaluate((k) => window.localStorage.removeItem(k), STORAGE_KEY);

		if (isMobile) {
			// Sur mobile, on vérifie juste que le composant est monté (pas d'overflow horizontal
			// imprévu, table présente). Le drag ne se teste qu'en desktop.
			const table = page.locator('table').first();
			await expect(table).toBeVisible();
			return;
		}

		// Desktop : trouver une colonne avec un handle resizer.
		// La 1re colonne (raison_sociale) a `defaultWidth: 240, minWidth: 160` côté config Phase 2.
		// Le `.col-resizer` est l'élément `<span>` à droite de chaque <th> resizable.
		const firstResizer = page.locator('th .col-resizer').first();
		await expect(firstResizer).toBeAttached();

		const targetTh = firstResizer.locator('xpath=..');
		const initialBox = await targetTh.boundingBox();
		expect(initialBox, 'colonne mesurable avant drag').not.toBeNull();
		const initialWidth = initialBox!.width;

		// Simuler un drag de +120px sur le handle (pointerdown → pointermove → pointerup).
		const handleBox = await firstResizer.boundingBox();
		expect(handleBox, 'handle mesurable').not.toBeNull();
		const startX = handleBox!.x + handleBox!.width / 2;
		const startY = handleBox!.y + handleBox!.height / 2;

		await page.mouse.move(startX, startY);
		await page.mouse.down();
		// Drag en 2 étapes pour déclencher pointermove (Chromium parfois coalesce).
		await page.mouse.move(startX + 60, startY, { steps: 5 });
		await page.mouse.move(startX + 120, startY, { steps: 5 });
		await page.mouse.up();

		// Largeur après drag : nouvelle dimension stockée (sync au pointerup).
		// On laisse 50ms à Svelte pour propager le state → DOM.
		await page.waitForTimeout(100);
		const finalBox = await targetTh.boundingBox();
		expect(finalBox, 'colonne mesurable après drag').not.toBeNull();
		expect(finalBox!.width).toBeGreaterThan(initialWidth + 30);

		// localStorage doit contenir la nouvelle largeur (clé scope = prospection-entreprises).
		const stored = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY);
		expect(stored, 'colWidths persisté en localStorage').not.toBeNull();
		const parsed = JSON.parse(stored!);
		expect(typeof parsed).toBe('object');
		expect(Object.keys(parsed).length).toBeGreaterThan(0);
		// Au moins une valeur numérique finie ≥ initialWidth+30.
		const widths = Object.values(parsed) as unknown[];
		const numericWidths = widths.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
		expect(numericWidths.length).toBeGreaterThan(0);
		expect(Math.max(...numericWidths)).toBeGreaterThan(initialWidth + 30);

		// Reload : largeur restaurée depuis localStorage (même cellule, même valeur).
		await page.reload({ waitUntil: 'networkidle' });
		await page.waitForSelector('table', { timeout: 10_000 });
		const restoredBox = await page.locator('th .col-resizer').first().locator('xpath=..').boundingBox();
		expect(restoredBox, 'colonne mesurable après reload').not.toBeNull();
		expect(Math.abs(restoredBox!.width - finalBox!.width)).toBeLessThanOrEqual(2);

		// Cleanup : retirer la clé pour ne pas polluer les exécutions suivantes.
		await page.evaluate((k) => window.localStorage.removeItem(k), STORAGE_KEY);
	});

	test('(c) P1 : seuls Entreprises + Terrain ; SIMAP/RegBL retirés ; switch Terrain puis retour', async ({ page, isMobile }) => {
		await gotoProspectionEntreprises(page);

		if (isMobile) {
			// Mobile : tabs deviennent un <select> avec id #tabs-mobile-select.
			const mobileSelect = page.locator('#tabs-mobile-select');
			await expect(mobileSelect).toBeVisible();
			// P1 : seules les sources actives → onglets Entreprises + Terrain. SIMAP/RegBL absents.
			const options = await mobileSelect.locator('option').allTextContents();
			expect(options.some((o) => o.startsWith('Entreprises'))).toBe(true);
			expect(options.some((o) => o.startsWith('Terrain'))).toBe(true);
			expect(options.some((o) => o.startsWith('Marchés publics'))).toBe(false);
			expect(options.some((o) => o.startsWith('Chantiers'))).toBe(false);

			// Switch vers Terrain (peut être vide).
			await mobileSelect.selectOption('terrain');
			await page.waitForURL((url) => url.searchParams.get('tab') === 'terrain', { timeout: 5_000 });
			await expect(mobileSelect).toHaveValue('terrain');
			// Le dropdown reste actionnable même si Terrain count=0 (régression Pascal :
			// les tabs disparaissaient quand les tabCounts étaient à 0, fixé commit 7fa7829).
			await expect(mobileSelect).toBeVisible();

			// Retour Entreprises : `entreprises` est le défaut P1, donc l'URL ne contient PAS ?tab=
			// (cf. buildUrl : `if (tab && tab !== defaultProspTab) params.set('tab', tab);`).
			await mobileSelect.selectOption('entreprises');
			await page.waitForURL((url) => !url.searchParams.has('tab'), { timeout: 5_000 });
			await expect(mobileSelect).toHaveValue('entreprises');
			return;
		}

		// Desktop : tablist + boutons role=tab.
		const tablist = page.locator('[role="tablist"][aria-label*="prospection"]');
		await expect(tablist).toBeVisible();

		const entreprisesTab = page.locator('button[role="tab"]', { hasText: 'Entreprises' });
		const terrainTab = page.locator('button[role="tab"]', { hasText: 'Terrain' });
		// P1 : SIMAP/RegBL retirés des onglets.
		await expect(page.locator('button[role="tab"]', { hasText: 'Marchés publics' })).toHaveCount(0);
		await expect(page.locator('button[role="tab"]', { hasText: 'Chantiers' })).toHaveCount(0);
		// Défaut P1 = Entreprises sélectionné.
		await expect(entreprisesTab).toHaveAttribute('aria-selected', 'true');

		// Cliquer Terrain (count peut être 0 — important : doit rester cliquable).
		await terrainTab.click();
		await page.waitForURL((url) => url.searchParams.get('tab') === 'terrain', { timeout: 5_000 });
		await expect(terrainTab).toHaveAttribute('aria-selected', 'true');

		// Tablist toujours présente même si Terrain est vide.
		await expect(tablist).toBeVisible();
		await expect(entreprisesTab).toBeVisible();

		// Retour Entreprises : défaut P1, donc l'URL ne contient PAS ?tab=.
		await entreprisesTab.click();
		await page.waitForURL((url) => !url.searchParams.has('tab'), { timeout: 5_000 });
		await expect(entreprisesTab).toHaveAttribute('aria-selected', 'true');
	});

	test('(d) P1 : ?tab=simap redirige vers Entreprises (pas d\'écran fantôme)', async ({ page }) => {
		await page.goto(`${PROSPECTION_PATH}?tab=simap`, { waitUntil: 'networkidle' });
		await expect(page).toHaveURL(/\/prospection\?tab=entreprises/);
	});
});
