import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Gate a11y + responsive du Centre d'aide (refonte 2026-06-30 : contenu remis à jour +
 * UI premium). Session authentifiée injectée via storageState (tests/.auth.local.json),
 * mintée OTP-free par tests/mint-session.mjs (service_role, aucun email).
 *
 * Vérifie, sur les trois niveaux (onglets) :
 *  - aucune violation axe d'impact serious/critical (wcag2a/2aa/21aa) ;
 *  - aucun débordement horizontal à 375px (critère 7 de la spec refonte aide).
 *
 * La page est du contenu statique data-driven (`$lib/aide/content.ts`) : le rendu ne
 * dépend d'aucune donnée live, donc le gate est stable d'un run à l'autre.
 */

const TABS = [
	{ nom: 'Prise en main', tab: 'demarrage' },
	{ nom: 'Fonctions détaillées', tab: 'fonctions' },
	{ nom: 'Documentation technique', tab: 'technique' }
];

async function axeOf(page: import('@playwright/test').Page) {
	return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
}

for (const { nom, tab } of TABS) {
	test(`aide /${tab} : 0 violation axe serious/critical`, async ({ page }) => {
		await page.goto(`/crm/aide?tab=${tab}`);
		await expect(page.getByRole('tab', { name: nom })).toHaveAttribute('aria-selected', 'true');
		const results = await axeOf(page);
		const grave = results.violations.filter(
			(v) => v.impact === 'serious' || v.impact === 'critical'
		);
		expect(grave, JSON.stringify(grave.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([]);
	});
}

test('aide : aucun débordement horizontal à 375px (mobile)', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	for (const { tab } of TABS) {
		await page.goto(`/crm/aide?tab=${tab}`);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow, `débordement horizontal sur ?tab=${tab}`).toBeLessThanOrEqual(1);
	}
});
