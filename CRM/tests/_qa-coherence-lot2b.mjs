// QA DOM cohérence UI lot 2B contre la base jetable LOCALE. Sonde les computed styles / présence de nœuds
// OFF/ON sur les VRAIES vues, sans supposer le rendu. L'app lit la metadata LIVE (getUser) : flipper le
// flag en DB entre deux runs suffit (pas de re-mint).
//   1) node tests/_set-coherence-flag-local.mjs off && node tests/_qa-coherence-lot2b.mjs off
//   2) node tests/_set-coherence-flag-local.mjs on  && node tests/_qa-coherence-lot2b.mjs on
// Attendu OFF = legacy ; ON = INC-10 champs 40px, INC-7 EmptyState (role=status), INC-8/9 titres 700/12px,
// INC-5 aide→SearchInput 40px + kbd.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = (process.argv[2] || 'off').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const report = { state, probes: {} };

async function go(path) {
	await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
}
function num(v) {
	const n = parseFloat(v);
	return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : v;
}

// --- INC-9 + INC-7 : /crm/log = titre h2 (600->700) + FeedbackTable vide (0 entries => EmptyState) ---
try {
	await go('/crm/log');
	report.probes.log = await page.evaluate(() => {
		const h = document.querySelector('h2.coh-title');
		const status = document.querySelector('[role="status"]');
		const legacy = document.querySelector('.log-desktop .text-center.py-12');
		return {
			titleFound: !!h,
			titleWeight: h ? getComputedStyle(h).fontWeight : null,
			emptyStatusRole: !!status, // ON attendu
			legacyEmpty: !!legacy, // OFF attendu
		};
	});
	await page.screenshot({ path: `${dir}lot2b-log-${state}.png` });
} catch (e) { report.probes.log = { error: String(e).slice(0, 140) }; }

// --- INC-8 : /crm/reporting = .activity-grid .card h4 (600/0.04em -> 700/0.12em) ---
try {
	await go('/crm/reporting');
	report.probes.reporting_kicker = await page.evaluate(() => {
		const h = document.querySelector('.activity-grid .card h4');
		if (!h) return { found: false };
		const cs = getComputedStyle(h);
		return { found: true, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize };
	});
} catch (e) { report.probes.reporting_kicker = { error: String(e).slice(0, 140) }; }

// --- INC-8 : dashboard kickers .panel-meta / .section-meta (11/600 -> 12/700) si rendus ---
try {
	await go('/crm');
	report.probes.dashboard_kickers = await page.evaluate(() => {
		const pm = document.querySelector('.panel-meta');
		const sm = document.querySelector('.section-meta');
		const pack = (el) => (el ? { weight: getComputedStyle(el).fontWeight, size: getComputedStyle(el).fontSize } : null);
		return { panelMeta: pack(pm), sectionMeta: pack(sm) };
	});
} catch (e) { report.probes.dashboard_kickers = { error: String(e).slice(0, 140) }; }

// --- INC-5 + INC-8 : /crm/aide = recherche (legacy .aide-search 36px OFF / .coh-search .search-input 40px ON)
//     + kbd « / » présent + TOC titles (600/0.06em -> 700/0.12em) ---
try {
	await go('/crm/aide');
	report.probes.aide = await page.evaluate(() => {
		const legacyInput = document.querySelector('.aide-search input');
		const cohField = document.querySelector('.coh-search .search-input');
		const cohInput = document.querySelector('.coh-search .search-input__field');
		const kbdLegacy = document.querySelector('.aide-search-kbd');
		const kbdCoh = document.querySelector('.aide-kbd-coh');
		const toc = document.querySelector('.aide-toc-title');
		const g = (el) => (el ? getComputedStyle(el) : null);
		return {
			legacyInputFound: !!legacyInput,
			legacyHeight: legacyInput ? legacyInput.offsetHeight : null,
			legacyRadius: legacyInput ? g(legacyInput).borderTopLeftRadius : null,
			cohFieldFound: !!cohField,
			cohHeight: cohField ? cohField.offsetHeight : null,
			cohRadius: cohField ? g(cohField).borderTopLeftRadius : null,
			cohInputFound: !!cohInput,
			kbdLegacyFound: !!kbdLegacy,
			kbdCohFound: !!kbdCoh,
			tocFound: !!toc,
			tocWeight: toc ? g(toc).fontWeight : null,
			tocLetterSpacing: toc ? g(toc).letterSpacing : null,
		};
	});
	await page.screenshot({ path: `${dir}lot2b-aide-${state}.png` });
} catch (e) { report.probes.aide = { error: String(e).slice(0, 140) }; }

// --- INC-5 : raccourci « / » focalise le champ (OFF input legacy, ON instance SearchInput) ---
try {
	await go('/crm/aide');
	await page.keyboard.press('/');
	await page.waitForTimeout(150);
	report.probes.aide_slash_focus = await page.evaluate(() => {
		const a = document.activeElement;
		return {
			activeTag: a ? a.tagName.toLowerCase() : null,
			activeIsSearch: a ? (a.getAttribute('type') === 'search' || a.classList.contains('search-input__field')) : false,
		};
	});
} catch (e) { report.probes.aide_slash_focus = { error: String(e).slice(0, 140) }; }

// --- INC-7 : /crm/signaux recherche vide => SignauxCards empty (legacy .empty OFF / role=status ON) ---
try {
	await go('/crm/signaux');
	const searchbox = page.locator('input.search-input__field, input[type="search"]').first();
	if (await searchbox.count()) {
		await searchbox.fill('zzznonexistentquery');
		await page.waitForTimeout(600);
	}
	report.probes.signaux_empty = await page.evaluate(() => {
		const status = document.querySelector('[role="status"]');
		const legacy = document.querySelector('.empty .empty-icon');
		return { emptyStatusRole: !!status, legacyEmpty: !!legacy };
	});
	await page.screenshot({ path: `${dir}lot2b-signaux-empty-${state}.png` });
} catch (e) { report.probes.signaux_empty = { error: String(e).slice(0, 140) }; }

// --- INC-10 : modale entreprises « Ajouter » => champ .crm-field-control (34 OFF / 40 ON) ---
try {
	await go('/crm/entreprises');
	const addBtn = page.getByRole('button', { name: /ajouter une entreprise|ajouter|nouvelle entreprise|créer/i }).first();
	let opened = false;
	if (await addBtn.count()) {
		await addBtn.click().catch(() => {});
		await page.waitForSelector('.crm-field-control', { timeout: 4000 }).then(() => (opened = true)).catch(() => {});
	}
	report.probes.field_height = await page.evaluate(() => {
		const el = document.querySelector('.crm-field-control');
		if (!el) return { found: false };
		return { found: true, offsetHeight: el.offsetHeight, tag: el.tagName.toLowerCase() };
	});
	report.probes.field_height.opened = opened;
	if (opened) await page.screenshot({ path: `${dir}lot2b-field-${state}.png` });
} catch (e) { report.probes.field_height = { error: String(e).slice(0, 140) }; }

for (const p of Object.values(report.probes)) {
	for (const k of ['letterSpacing', 'fontSize', 'tocLetterSpacing']) if (p && p[k]) p[k] = num(p[k]);
}
console.log(JSON.stringify(report, null, 2));
await browser.close();
