import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * axe-core sur les écrans /terrain (shell mobile V3, flag ffCrmMobileV3 ON via la
 * session test pascal@filmpro.ch). Objectif (reste Phase 4 mobile V3, AC-012) :
 * 0 violation color-contrast. On vérifie aussi serious/critical au sens large.
 * Viewport mobile (le shell terrain est mobile-only).
 */
const FICHE_ID = '828059a2-0d22-450c-a956-f22457f94087';

const ECRANS = [
	{ nom: 'À faire (relances)', url: '/terrain' },
	{ nom: 'Rechercher', url: '/terrain/rechercher' },
	{ nom: 'Fiche entreprise', url: `/terrain/entreprise/${FICHE_ID}` }
];

test.use({ viewport: { width: 390, height: 844 } });

for (const ecran of ECRANS) {
	test(`${ecran.nom} : 0 violation color-contrast`, async ({ page }) => {
		const resp = await page.goto(ecran.url, { waitUntil: 'networkidle' });
		expect(resp?.status(), `status ${ecran.url}`).toBeLessThan(400);
		await expect(page).toHaveURL(new RegExp(ecran.url.replace(/\//g, '\\/').replace(/\[/g, '\\[')));

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();

		const contrast = results.violations.filter((v) => v.id === 'color-contrast');
		if (contrast.length) {
			console.log(
				`color-contrast ${ecran.url}:`,
				JSON.stringify(
					contrast.flatMap((v) => v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary }))),
					null,
					2
				)
			);
		}
		expect(contrast, `color-contrast ${ecran.nom}`).toEqual([]);

		// Filet large : pas d'autre violation serious/critical sur l'écran terrain.
		const graves = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
		if (graves.length) {
			console.log(`serious/critical ${ecran.url}:`, JSON.stringify(graves.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
		}
		expect(graves, `serious/critical ${ecran.nom}`).toEqual([]);
	});
}
