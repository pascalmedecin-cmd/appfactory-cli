import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * E2E du flux « Import de liste » (Atelier 209 Run 3) - pilote la modale 3 étapes de bout en bout
 * dans un vrai navigateur contre la base jetable locale, et valide l'oracle de dédup sur le fixture
 * `import-liste-g7.csv` (2 nouveaux / 1 doublon exact / 1 ligne invalide) + l'écriture réelle en base
 * (les 2 prospects apparaissent dans l'onglet « Ma liste »). Couvre le DOM (file input + rendu wizard)
 * que les tests unit + intégration ne touchent pas.
 *
 * Prérequis (base jetable, cf. rules/methodology.md § Tests conditions réelles) :
 *   colima start ; supabase start && supabase db reset ; node tests/mint-session-local.mjs
 * → session PREMIUM (ff_crm_listes_v2 + ff_decoupe) dans tests/.auth.local.json, base à 127.0.0.1:54321.
 *
 * Les screenshots par étape (QA visuelle du flux) sont écrits hors-repo dans /tmp (artefacts de session).
 */
test.use({ storageState: 'tests/.auth.local.json', viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: 'serial' });

const FIXTURE = fileURLToPath(new URL('./fixtures/import-liste-g7.csv', import.meta.url));
const SHOTS = '/tmp/atelier209-import-qa';

test('import de liste : dépôt → mapping auto → aperçu (dédup) → import → Ma liste', async ({ page }) => {
	// --- Onglet « Ma liste » (source manuel), vide au départ (le seed n'a aucune source manuel).
	await page.goto('/crm/prospection?tab=maliste', { waitUntil: 'networkidle', timeout: 60_000 });
	await expect(page).toHaveURL(/\/crm\/prospection/); // pas de redirection login
	await expect(page.getByRole('tab', { name: /Ma liste/ })).toHaveAttribute('aria-selected', 'true');
	await page.screenshot({ path: `${SHOTS}/00-maliste-vide.png`, fullPage: true });

	// --- Ouvrir la modale d'import (CTA de l'onglet Ma liste / empty-state).
	await page.getByRole('button', { name: /Importer une liste/i }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('heading', { name: /Importer une liste de prospects/i })).toBeVisible();
	await expect(dialog.getByText('Étape 1 sur 3', { exact: false })).toBeVisible();
	await dialog.screenshot({ path: `${SHOTS}/01-etape1-depot.png` });

	// --- Étape 1 → 2 : déposer le fichier (input file sr-only) → passage auto au mapping.
	await dialog.locator('input[type="file"]').setInputFiles(FIXTURE);
	await expect(dialog.getByText('Étape 2 sur 3', { exact: false })).toBeVisible();
	// Auto-mapping : 8 colonnes reconnues sur 10 (NOTE GOOGLE / PLACE ID ignorées).
	await expect(dialog.getByText(/8 colonnes reconnues sur 10/)).toBeVisible();
	// raison_sociale auto-mappé → le bouton d'aperçu est actif (pas de warning obligatoire).
	await expect(dialog.getByRole('alert')).toHaveCount(0);
	await dialog.screenshot({ path: `${SHOTS}/02-etape2-mapping.png` });

	const previewBtn = dialog.getByRole('button', { name: /Vérifier/ });
	await expect(previewBtn).toBeEnabled();
	await previewBtn.click();

	// --- Étape 3 : aperçu. Oracle dédup sur le fixture g7.
	await expect(dialog.getByText('Étape 3 sur 3', { exact: false })).toBeVisible();
	// Cartes stats présentes, libellés accordés sur la valeur (fixture g7 : 4 lues / 2 nouveaux / 1 doublon / 1 à corriger).
	// exact: « à corriger » minuscule = label, ≠ badge « À corriger ».
	await expect(dialog.getByText('lignes lues', { exact: true })).toBeVisible();
	await expect(dialog.getByText('nouveaux prospects', { exact: true })).toBeVisible();
	await expect(dialog.getByText('doublon ignoré', { exact: true })).toBeVisible();
	await expect(dialog.getByText('à corriger', { exact: true })).toBeVisible();
	// États de ligne : 2 nouveaux, 1 doublon exact (ligne 3 == ligne 1), 1 invalide (raison sociale vide).
	await expect(dialog.getByText('Nouveau', { exact: true })).toHaveCount(2);
	await expect(dialog.getByText('Doublon ignoré', { exact: true })).toHaveCount(1);
	await expect(dialog.getByText('À corriger', { exact: true })).toHaveCount(1);
	await dialog.screenshot({ path: `${SHOTS}/03-etape3-apercu.png` });

	// --- Import final : le bouton porte le compte toImport (= 2).
	const importBtn = dialog.getByRole('button', { name: /Importer 2 prospects? dans/ });
	await expect(importBtn).toBeEnabled();
	await importBtn.click();

	// --- Après import : redirection Ma liste + les 2 prospects réellement écrits en base.
	await page.waitForURL(/tab=maliste/, { timeout: 30_000 });
	await expect(dialog).toBeHidden();
	const rows = page.locator('main tbody tr');
	await expect(rows).toHaveCount(2);
	await expect(page.getByText('ZZFX Miroiterie Cornavin')).toBeVisible();
	await expect(page.getByText('ZZFX Régie du Rhône')).toBeVisible();
	await page.screenshot({ path: `${SHOTS}/04-maliste-2-importes.png`, fullPage: true });
});
