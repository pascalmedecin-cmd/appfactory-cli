import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Gate a11y Vague 2 (audit live 2026-06-07). Session authentifiée injectée via
 * storageState (playwright.vague2-a11y.config.ts), mintée OTP-free par
 * tests/mint-session.mjs. Couvre les 4 familles High :
 *  - LIVE-H3 : dialog avec nom accessible (aria-labelledby) → axe `aria-dialog-name`.
 *  - LIVE-H4 : contrastes texte AA (tokens -deep) → axe `color-contrast`.
 *  - LIVE-H5 : <th scope> table Log → axe table rules.
 *  - LIVE-H2 : focus restitué au déclencheur à la fermeture (vérif clavier, hors axe).
 */

const PAGES = [
	{ nom: 'Dashboard', url: '/crm' },
	{ nom: 'Entreprises', url: '/crm/entreprises' },
	{ nom: 'Contacts', url: '/crm/contacts' },
	{ nom: 'Pipeline', url: '/crm/pipeline' },
	{ nom: 'Signaux', url: '/crm/signaux' },
	{ nom: 'Veille', url: '/crm/veille' },
	{ nom: 'Log', url: '/crm/log' }
];

async function axeOf(page: import('@playwright/test').Page) {
	return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
}

// Périmètre Vague 2 = les 4 familles status de l'audit LIVE-H4 (ambre/rouge + extension
// vert/bleu). On asserte par ALLOWLIST des couleurs status (robuste : les couleurs hors
// périmètre sont des dérivés color-mix/opacité aux hexes variables d'un run à l'autre).
// Le gate échoue si une couleur status échoue le contraste — vivid (régression : non migrée
// vers -deep) OU deep (token mal calibré). Hors périmètre (dette tracée CLAUDE.md, décision
// Pascal séparée) : palette « prospection workflow » (--color-prosp-*/--color-tab-*, slate
// #5a7190 partagé avec info, bronze, etc.) + gris muted/décoratifs pré-existants.
// Info vivid #5a7190 est exclu (hex partagé avec --color-prosp-import) : info utilise
// désormais le deep #4a5e78, vérifié AA — donc inutile et ambigu de surveiller le vivid.
const STATUS_FG = new Set([
	'#f79009', '#f04438', '#12b76a', // status vivid (ne doivent plus apparaître en texte)
	'#b54708', '#b42318', '#067647', '#4a5e78' // status -deep (doivent passer AA)
]);

// Règles axe graves PRÉ-EXISTANTES hors des 5 familles de l'audit live (dette tracée
// CLAUDE.md, décision Pascal séparée). N'ont pas été introduites par la Vague 2 :
//  - aria-required-children : structure ARIA du Kanban Pipeline (role list/listitem).
// Le filet anti-régression reste actif sur TOUTE autre règle serious/critical.
const OUT_OF_SCOPE_RULES = new Set(['color-contrast', 'aria-required-children']);

function fgOf(summary: string | undefined): string | null {
	const m = summary?.match(/foreground color: (#[0-9a-f]+)/i);
	return m ? m[1].toLowerCase() : null;
}

/** Nœuds color-contrast en échec qui RELÈVENT du périmètre status (hors palette/gris). */
function inScopeContrastNodes(results: { violations: { id: string; nodes: { target: unknown; failureSummary?: string }[] }[] }) {
	const cc = results.violations.find((v) => v.id === 'color-contrast');
	if (!cc) return [];
	return cc.nodes
		.map((n) => ({ target: n.target, fg: fgOf(n.failureSummary), summary: n.failureSummary }))
		.filter((n) => n.fg !== null && STATUS_FG.has(n.fg));
}

function dump(label: string, violations: { id: string; impact?: string | null; nodes: { target: unknown; failureSummary?: string }[] }[]) {
	if (violations.length) {
		console.log(
			`${label}:`,
			JSON.stringify(
				violations.flatMap((v) => v.nodes.map((n) => ({ id: v.id, impact: v.impact, target: n.target, summary: n.failureSummary }))),
				null,
				2
			)
		);
	}
}

for (const p of PAGES) {
	test(`${p.nom} : contraste AA + pas de violation grave`, async ({ page }) => {
		const resp = await page.goto(p.url, { waitUntil: 'networkidle' });
		expect(resp?.status(), `status ${p.url}`).toBeLessThan(400);

		const results = await axeOf(page);

		// LIVE-H4 : contraste texte AA sur les familles status (périmètre Vague 2).
		const contrast = inScopeContrastNodes(results);
		if (contrast.length) console.log(`color-contrast IN-SCOPE ${p.url}:`, JSON.stringify(contrast, null, 2));
		expect(contrast, `color-contrast (status) ${p.nom}`).toEqual([]);

		// Filet anti-régression : aucune NOUVELLE violation grave (hors dette pré-existante tracée).
		const graves = results.violations.filter((v) => (v.impact === 'serious' || v.impact === 'critical') && !OUT_OF_SCOPE_RULES.has(v.id));
		dump(`serious/critical ${p.url}`, graves);
		expect(graves, `serious/critical ${p.nom}`).toEqual([]);
	});
}

test('LIVE-H3 + H2 : slide-out détail Entreprises nommé + focus restitué', async ({ page }) => {
	await page.goto('/crm/entreprises', { waitUntil: 'networkidle' });

	const row = page.locator('tr[role="button"]').first();
	const rowCount = await page.locator('tr[role="button"]').count();
	test.skip(rowCount === 0, 'DB sans entreprise : slide-out non exerçable');

	const rowLabel = await row.getAttribute('aria-label');
	await row.click();

	const dialog = page.locator('[role="dialog"]');
	await expect(dialog).toBeVisible();

	// LIVE-H3 : le dialog a un nom accessible (aria-labelledby résolu, non vide).
	const labelledby = await dialog.getAttribute('aria-labelledby');
	expect(labelledby, 'aria-labelledby présent').toBeTruthy();
	const accName = await page.locator(`#${labelledby}`).textContent();
	expect(accName?.trim().length ?? 0, 'nom accessible non vide').toBeGreaterThan(0);

	// axe sur le dialog ouvert : pas de aria-dialog-name ni color-contrast.
	const open = await axeOf(page);
	const dialogName = open.violations.filter((v) => v.id === 'aria-dialog-name');
	dump('aria-dialog-name (dialog ouvert)', dialogName);
	expect(dialogName, 'aria-dialog-name').toEqual([]);
	const contrastOpen = inScopeContrastNodes(open);
	if (contrastOpen.length) console.log('color-contrast IN-SCOPE (dialog ouvert):', JSON.stringify(contrastOpen, null, 2));
	expect(contrastOpen, 'color-contrast dialog ouvert (status)').toEqual([]);

	// LIVE-H2 : Escape ferme et restitue le focus à la ligne déclencheuse.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await page.waitForTimeout(120); // laisse passer le rAF de restitution + fin de transition
	const activeLabel = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label'));
	expect(activeLabel, 'focus revenu sur la ligne déclencheuse').toBe(rowLabel);
});
