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
 * Stratégie : zéro mutation données. Lecture-seule sur SIMAP par défaut.
 * Toute interaction (drag, switch, sélecteur) est rétractable au reload.
 */

const PROSPECTION_PATH = '/prospection';

async function gotoProspectionSimap(page: Page) {
	// On force tab=simap pour avoir le scope avec le plus de chances d'avoir
	// des résultats en prod (le storageKey resizable est `prospection-simap`).
	await page.goto(`${PROSPECTION_PATH}?tab=simap`, { waitUntil: 'networkidle' });
	// Attendre que la table soit montée (au moins le wrapper, même si 0 résultat).
	await page.waitForSelector('table', { timeout: 10_000 });
}

test.describe('Phase 2 prospection — tests E2E', () => {
	test('(a) sélecteur entrées par page : URL ?perPage=50 + select reflète + reload', async ({ page, isMobile }) => {
		await gotoProspectionSimap(page);

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
		await gotoProspectionSimap(page);

		const STORAGE_KEY = 'datatable.col-widths.prospection-simap';

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

		// localStorage doit contenir la nouvelle largeur (clé scope = prospection-simap).
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

	test('(c) switch onglet Terrain (potentiellement vide) puis retour SIMAP', async ({ page, isMobile }) => {
		await gotoProspectionSimap(page);

		if (isMobile) {
			// Mobile : tabs deviennent un <select> avec id #tabs-mobile-select.
			const mobileSelect = page.locator('#tabs-mobile-select');
			await expect(mobileSelect).toBeVisible();
			// Vérifier que les 4 onglets sont présents en options.
			const options = await mobileSelect.locator('option').allTextContents();
			expect(options.some((o) => o.startsWith('Marchés publics'))).toBe(true);
			expect(options.some((o) => o.startsWith('Chantiers RegBL'))).toBe(true);
			expect(options.some((o) => o.startsWith('Entreprises'))).toBe(true);
			expect(options.some((o) => o.startsWith('Terrain'))).toBe(true);

			// Switch vers Terrain (peut être vide).
			await mobileSelect.selectOption('terrain');
			await page.waitForURL((url) => url.searchParams.get('tab') === 'terrain', { timeout: 5_000 });
			await expect(mobileSelect).toHaveValue('terrain');
			// Le dropdown reste actionnable même si Terrain count=0 (régression Pascal :
			// les tabs disparaissaient quand les 4 tabCounts étaient à 0, fixé commit 7fa7829).
			await expect(mobileSelect).toBeVisible();

			// Retour SIMAP : `simap` est le défaut, donc l'URL ne contient PAS ?tab=
			// (cf. buildUrl : `if (tab && tab !== 'simap') params.set('tab', tab);`).
			await mobileSelect.selectOption('simap');
			await page.waitForURL((url) => !url.searchParams.has('tab'), { timeout: 5_000 });
			await expect(mobileSelect).toHaveValue('simap');
			return;
		}

		// Desktop : tablist + boutons role=tab.
		const tablist = page.locator('[role="tablist"][aria-label*="prospection"]');
		await expect(tablist).toBeVisible();

		const terrainTab = page.locator('button[role="tab"]', { hasText: 'Terrain' });
		const simapTab = page.locator('button[role="tab"]', { hasText: 'Marchés publics' });
		await expect(simapTab).toHaveAttribute('aria-selected', 'true');

		// Cliquer Terrain (count peut être 0 — important : doit rester cliquable).
		await terrainTab.click();
		await page.waitForURL((url) => url.searchParams.get('tab') === 'terrain', { timeout: 5_000 });
		await expect(terrainTab).toHaveAttribute('aria-selected', 'true');

		// Tablist toujours présente même si Terrain est vide.
		await expect(tablist).toBeVisible();
		await expect(simapTab).toBeVisible();

		// Retour SIMAP : `simap` est le défaut, donc l'URL ne contient PAS ?tab=
		// (cf. buildUrl : `if (tab && tab !== 'simap') params.set('tab', tab);`).
		await simapTab.click();
		await page.waitForURL((url) => !url.searchParams.has('tab'), { timeout: 5_000 });
		await expect(simapTab).toHaveAttribute('aria-selected', 'true');
	});
});
