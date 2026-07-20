// QA DOM cohérence UI lot 2C (increment c « compteurs ») contre la base jetable LOCALE.
// Auto-suffisant : pose les flags en DB (metadata LIVE, getUser la relit à chaque requête) puis
// lit les computed styles / textes sur les VRAIES vues. Prérequis : supabase start + npm run dev
// + session mintée (tests/mint-session-local.mjs).
//   node tests/_qa-coherence-lot2c.mjs off
//   node tests/_qa-coherence-lot2c.mjs on
//
// OFF (ff_ui_coherence + ff_page_bandeau OFF) :
//   - ProspectionTabs count actif = --color-primary-dark (fork legacy) ; radius 999px.
//   - Signaux : pas de bandeau (ff_page_bandeau OFF) => pastille absente.
// ON :
//   - ProspectionTabs count actif = --color-primary (aligné primitive Tabs) ; radius = --radius-full.
//   - Signaux bandeau : pastille = « 2 signaux » (data.signaux.length = GLOBAL de vue), STABLE quand
//     l'onglet « À trier » ne montre qu'1 carte et quand une recherche vide la liste (preuve : la
//     pastille n'est plus le compte FILTRÉ `filteredSignaux.length`).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const state = (process.argv[2] || 'off').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const email = process.argv[4] || 'pascal@filmpro.ch';
const on = state === 'on';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;

// --- env local (gère les `\n` littéraux) ------------------------------------------------------
function loadEnv(path) {
	const out = {};
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		v = v.replace(/(\\n|\s)+$/, '');
		out[m[1]] = v;
	}
	return out;
}
const env = loadEnv(new URL('../.env.development.local', import.meta.url).pathname);
const URL_ = env.PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
	throw new Error(`REFUS : cible non-locale ${URL_}. Réservé à la base jetable locale.`);
}

// --- pose les flags (merge-null pour désactiver, cf. feedback_supabase_update_metadata_merge_null) ---
const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) throw lErr;
const u = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
if (!u) throw new Error(`user ${email} absent (mint d'abord)`);
const meta = { ...(u.app_metadata || {}) };
meta.ff_crm_listes_v2 = true; // premium (déjà posé au mint, on le garantit)
meta.ff_ui_coherence = on ? true : null;
meta.ff_page_bandeau = on ? true : null;
const { error: uErr } = await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
if (uErr) throw uErr;

// --- navigation + sondes ----------------------------------------------------------------------
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: 1440, height: 900 } });
const pg = await ctx.newPage();
const report = { state, flags: { ff_ui_coherence: on, ff_page_bandeau: on }, probes: {} };

async function go(path) {
	await pg.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
	await pg.waitForTimeout(400);
}

// --- INC-4/5 (increment c) : ProspectionTabs count actif ---
try {
	await go('/crm/prospection');
	report.probes.prospection_tab_count = await pg.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const active = document.querySelector('.tab--active .tab-count');
		const cs = active ? getComputedStyle(active) : null;
		const norm = (s) => (s || '').replace(/\s+/g, '');
		return {
			found: !!active,
			color: cs ? cs.color : null,
			borderRadius: cs ? cs.borderTopLeftRadius : null,
			tokenPrimary: norm(root.getPropertyValue('--color-primary')),
			tokenPrimaryDark: norm(root.getPropertyValue('--color-primary-dark')),
			// couleurs résolues des tokens (pour comparer aux rgb calculés)
			resolved: (() => {
				const probe = document.createElement('span');
				probe.style.color = 'var(--color-primary)';
				document.body.appendChild(probe);
				const p = getComputedStyle(probe).color;
				probe.style.color = 'var(--color-primary-dark)';
				const pd = getComputedStyle(probe).color;
				probe.remove();
				return { primary: p, primaryDark: pd };
			})()
		};
	});
	await pg.screenshot({ path: `${dir}lot2c-prospection-${state}.png` });
} catch (e) { report.probes.prospection_tab_count = { error: String(e).slice(0, 160) }; }

// --- increment c : pastille bandeau signaux = GLOBAL de vue (stable sous filtre) ---
try {
	await go('/crm/signaux');
	const readBand = () => pg.evaluate(() => {
		const band = document.querySelector('.pband__count');
		// nb de cartes signaux visibles (SignauxCards) pour montrer que la pastille != liste filtrée
		const cards = document.querySelectorAll('.signal-card, [data-signal-card], article.signal').length;
		return { bandText: band ? band.textContent.trim() : null, visibleCards: cards };
	});
	const initial = await readBand();
	// applique une recherche qui ne matche rien => filteredSignaux -> 0
	const box = pg.locator('input.search-input__field, input[type="search"]').first();
	let searched = false;
	if (await box.count()) { await box.fill('zzznonexistentquery'); await pg.waitForTimeout(600); searched = true; }
	const afterSearch = await readBand();
	report.probes.signaux_band = { initial, afterSearch, searched };
	await pg.screenshot({ path: `${dir}lot2c-signaux-${state}.png` });
} catch (e) { report.probes.signaux_band = { error: String(e).slice(0, 160) }; }

// --- FIX finding CSS : onglet ACTIF ET VIDE (count 0) → le « 0 » doit rester gris muted (border),
//     jamais primary. `:not(.tab--empty)` préserve la précédence OFF. On clique un onglet vide visible. ---
try {
	await go('/crm/prospection');
	const tabsInfo = await pg.evaluate(() => {
		return [...document.querySelectorAll('.tab')].map((b) => ({
			key: (b.id || '').replace(/^tab-/, ''),
			empty: b.classList.contains('tab--empty'),
			label: b.querySelector('.tab-label')?.textContent?.trim() || null,
		}));
	});
	const emptyTab = tabsInfo.find((t) => t.empty && t.key);
	if (emptyTab) {
		await pg.locator(`#tab-${emptyTab.key}`).click();
		await pg.waitForTimeout(300);
		report.probes.prospection_empty_active = await pg.evaluate((key) => {
			const btn = document.getElementById(`tab-${key}`);
			const cnt = btn?.querySelector('.tab-count');
			const root = getComputedStyle(document.documentElement);
			const probe = document.createElement('span');
			probe.style.color = 'var(--color-border)';
			document.body.appendChild(probe);
			const border = getComputedStyle(probe).color;
			probe.style.color = 'var(--color-primary)';
			const primary = getComputedStyle(probe).color;
			probe.remove();
			return {
				key,
				isActive: btn?.classList.contains('tab--active') ?? false,
				isEmpty: btn?.classList.contains('tab--empty') ?? false,
				countText: cnt?.textContent?.trim() ?? null,
				countColor: cnt ? getComputedStyle(cnt).color : null,
				resolvedBorder: border,
				resolvedPrimary: primary,
			};
		}, emptyTab.key);
	} else {
		report.probes.prospection_empty_active = { note: 'aucun onglet vide visible dans le seed', tabsInfo };
	}
} catch (e) { report.probes.prospection_empty_active = { error: String(e).slice(0, 160) }; }

console.log(JSON.stringify(report, null, 2));
await browser.close();
