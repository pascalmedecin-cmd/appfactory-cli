// QA visuelle avant/après cohérence UI (b) — base jetable LOCALE uniquement.
// Capture, pour la page passée en argument, la liste + le slideout détail (défilé au bas, là où
// vivent les boutons migrés) + la modale création. Réutilisé pour chaque page migrée.
// Usage : node tests/_qa-coherence-shots.mjs <state=off|on> <slug=entreprises> [origin]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = (process.argv[2] || 'off').toLowerCase();
const slug = process.argv[3] || 'entreprises';
const origin = process.argv[4] || 'http://localhost:5173';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;

const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function shot(name) {
	await page.screenshot({ path: `${dir}${slug}-${state}-${name}.png` });
}
async function killToasts() {
	// Les toasts d'erreur (seed UUID version-0 : PhotoGallery/VisitsPanel rejetés) masquent les boutons.
	// Artefact de base jetable, identique OFF/ON, hors périmètre : on les retire avant capture.
	await page.evaluate(() => document.querySelectorAll('div[role="region"].fixed').forEach((e) => e.remove()));
}
async function shotEl(sel, name) {
	await killToasts();
	const el = page.locator(sel).first();
	await el.screenshot({ path: `${dir}${slug}-${state}-${name}.png` });
}

await page.goto(`${origin}/crm/${slug}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await shot('list');

// Slideout détail : cliquer la 1re ligne, défiler au bas (boutons Modifier/Enrichir/Supprimer + carte Pipeline).
try {
	await page.locator('table tbody tr').first().click({ timeout: 5000 });
	await page.waitForSelector('div[role="dialog"][aria-modal="true"]', { timeout: 4000 });
	await page.waitForTimeout(400);
	// défiler le conteneur scrollable interne tout en bas
	await page.evaluate(() => {
		const sc = document.querySelector('div[role="dialog"] .overflow-y-auto');
		if (sc) sc.scrollTop = sc.scrollHeight;
	});
	await page.waitForTimeout(300);
	await shotEl('div[role="dialog"][aria-modal="true"]', 'slideout-bottom');
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);
} catch (e) {
	console.log('slideout skip:', e.message);
}

// Modale création : bouton "Ajouter" (texte exact, pas le FAB).
try {
	await page.getByRole('button', { name: 'Ajouter', exact: true }).first().click({ timeout: 5000 });
	await page.waitForTimeout(500);
	await shotEl('div[role="dialog"]', 'modal');
} catch (e) {
	console.log('modal skip:', e.message);
}

await browser.close();
console.log(`OK shots ${slug} [${state}] -> ${dir}`);
