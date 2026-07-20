// QA DOM cohérence UI lot 2A (INC-4 modales / INC-6 surfaces / INC-8 eyebrows / INC-9 titres) contre la
// base jetable LOCALE. Sonde les computed styles OFF/ON sur les VRAIES vues, sans supposer le rendu.
// L'app lit la metadata LIVE (getUser) : flipper le flag en DB entre deux runs suffit (pas de re-mint).
//   1) node tests/_set-coherence-flag-local.mjs off && node tests/_qa-coherence-lot2a.mjs off
//   2) node tests/_set-coherence-flag-local.mjs on  && node tests/_qa-coherence-lot2a.mjs on
// Attendu : OFF = valeurs legacy (panel sans ombre, titres 600/800, eyebrow 600/~0.05em, modale 12px) ;
//           ON  = panel shadow-card, titres 700, eyebrow 700/0.12em, modale 16px desktop.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = (process.argv[2] || 'off').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const CAMP_ID = '22222222-0000-4000-8000-0000000000f1';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const report = { state, probes: {} };

async function go(path) {
	await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	return page.url();
}

function num(v) {
	const n = parseFloat(v);
	return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : v;
}

// --- INC-6 : reporting .panel (co-located override, box-shadow absente OFF -> shadow-card ON) ---
try {
	await go('/crm/reporting');
	report.probes.reporting_panel = await page.evaluate(() => {
		const el = document.querySelector('.panel');
		if (!el) return { found: false };
		const cs = getComputedStyle(el);
		return { found: true, boxShadow: cs.boxShadow, hasShadow: cs.boxShadow !== 'none' };
	});
	await page.screenshot({ path: `${dir}lot2a-reporting-${state}.png` });
} catch (e) { report.probes.reporting_panel = { error: String(e).slice(0, 120) }; }

// --- INC-9 : aide .aide-title (600->700) + .aide-section-title (600->700) ---
try {
	await go('/crm/aide');
	report.probes.aide_titles = await page.evaluate(() => {
		const t = document.querySelector('.aide-title');
		const s = document.querySelector('.aide-section-title');
		return {
			titleFound: !!t, titleWeight: t ? getComputedStyle(t).fontWeight : null,
			sectionFound: !!s, sectionWeight: s ? getComputedStyle(s).fontWeight : null,
		};
	});
	await page.screenshot({ path: `${dir}lot2a-aide-${state}.png` });
} catch (e) { report.probes.aide_titles = { error: String(e).slice(0, 120) }; }

// --- INC-9 + INC-6 : campagne détail .cp-title (800->700) + .card (shadow-xs->shadow-card) ---
try {
	await go(`/crm/campagnes/${CAMP_ID}`);
	report.probes.campagne = await page.evaluate(() => {
		const t = document.querySelector('.cp-title');
		const c = document.querySelector('.card');
		return {
			titleFound: !!t, titleWeight: t ? getComputedStyle(t).fontWeight : null,
			cardFound: !!c, cardShadow: c ? getComputedStyle(c).boxShadow : null,
		};
	});
	await page.screenshot({ path: `${dir}lot2a-campagne-${state}.png` });
} catch (e) { report.probes.campagne = { error: String(e).slice(0, 120) }; }

// --- INC-4 : ModalForm centrée desktop -> .crm-modal-shell border-radius 12px OFF / 16px ON ---
try {
	await go('/crm/campagnes');
	// Ouvre la modale « Nouvelle campagne » (ModalForm).
	const btn = page.getByRole('button', { name: /nouvelle campagne|créer|ajouter/i }).first();
	let opened = false;
	if (await btn.count()) {
		await btn.click().catch(() => {});
		await page.waitForSelector('.crm-modal-shell', { timeout: 4000 }).then(() => (opened = true)).catch(() => {});
	}
	report.probes.modal_radius = await page.evaluate(() => {
		const el = document.querySelector('.crm-modal-shell');
		if (!el) return { found: false };
		const cs = getComputedStyle(el);
		return { found: true, borderTopLeftRadius: cs.borderTopLeftRadius, borderBottomRightRadius: cs.borderBottomRightRadius };
	});
	report.probes.modal_radius.opened = opened;
	if (opened) await page.screenshot({ path: `${dir}lot2a-modal-${state}.png` });
} catch (e) { report.probes.modal_radius = { error: String(e).slice(0, 120) }; }

// --- INC-8 : eyebrow réel via LeadSlideOut (prospection) : h4 « Coordonnées » 600/0.05em -> 700/0.12em ---
try {
	await go('/crm/prospection');
	// Clique la première ligne de lead pour ouvrir le slide-out.
	const row = page.locator('table tbody tr, [role="row"]').first();
	let slidOpen = false;
	if (await row.count()) {
		await row.click().catch(() => {});
		await page.waitForTimeout(700);
		slidOpen = await page.locator('h4:has-text("Coordonnées"), h4:has-text("Détails"), h4:has-text("Campagnes")').count() > 0;
	}
	report.probes.eyebrow_leadslideout = await page.evaluate(() => {
		const h = [...document.querySelectorAll('h4')].find((e) =>
			['Coordonnées', 'Détails', 'Campagnes', 'Actions'].includes(e.textContent.trim()) && e.className.includes('eyebrow'));
		if (!h) return { found: false };
		const cs = getComputedStyle(h);
		return { found: true, label: h.textContent.trim(), fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize };
	});
	report.probes.eyebrow_leadslideout.slidOpen = slidOpen;
	if (report.probes.eyebrow_leadslideout.found) await page.screenshot({ path: `${dir}lot2a-eyebrow-${state}.png` });
} catch (e) { report.probes.eyebrow_leadslideout = { error: String(e).slice(0, 120) }; }

// Normalise les nombres lisibles
for (const p of Object.values(report.probes)) {
	for (const k of ['letterSpacing', 'fontSize']) if (p && p[k]) p[k] = num(p[k]);
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
