// QA DOM cohérence UI increment d1 (« gouttière unique + largeur bornée ancrée à gauche ») contre la
// base jetable LOCALE. Prouve, page par page, OFF vs ON :
//   - le socle .crm-page-wrap : padding-inline (32/24/16 sous ON, p-4/md:p-6 = 16/24 sous OFF) + max-width
//     (1440px sous ON, none sous OFF) + margin-left 0 (ancré à gauche, pas centré).
//   - la gouttière EFFECTIVE de chaque brique = getBoundingClientRect().left - (main.left + main.paddingLeft) :
//     doit valoir ~32 sous ON (viewport 1440), et la valeur legacy (48/56/64/centré) sous OFF.
//   - Veille/Aide : le wrapper se dé-centre (margin-left → 0) sous ON.
// Flags : premium (ff_crm_listes_v2) TOUJOURS ON (baseline fondateurs = prod) ; ff_ui_coherence + ff_page_bandeau
// = on?true:null (merge-null pour désactiver, cf. feedback_supabase_update_metadata_merge_null).
// Prérequis : supabase start + npm run dev + mint-session-local. Usage : node tests/_qa-coherence-d1.mjs <off|on> [origin] [vw]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const state = (process.argv[2] || 'off').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const vw = parseInt(process.argv[4] || '1440', 10);
const email = 'pascal@filmpro.ch';
const on = state === 'on';
const dir = new URL('../.atelier-209/coherence-ui/qa/', import.meta.url).pathname;

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

const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) throw lErr;
const u = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
if (!u) throw new Error(`user ${email} absent (mint d'abord)`);
const meta = { ...(u.app_metadata || {}) };
meta.ff_crm_listes_v2 = true; // premium = baseline fondateurs (prod)
meta.ff_ui_coherence = on ? true : null;
meta.ff_page_bandeau = on ? true : null;
const { error: uErr } = await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
if (uErr) throw uErr;

const PAGES = [
	{ path: '/crm', key: 'dashboard', bricks: ['.pband', '.dash', '.dt', '.kpis'] },
	{ path: '/crm/contacts', key: 'contacts', bricks: ['.pband', '.kpi-strip', '.tabs-bar', '.ws-content', '.indicators'] },
	{ path: '/crm/entreprises', key: 'entreprises', bricks: ['.pband', '.kpi-strip', '.tabs-bar', '.ws-content', '.indicators'] },
	{ path: '/crm/signaux', key: 'signaux', bricks: ['.pband', '.kpi-strip', '.tabs-bar', '.ws-content', '.indicators'] },
	{ path: '/crm/pipeline', key: 'pipeline', bricks: ['.pband', '.kpi-strip', '.tabs-bar', '.kanban-wrap', '.indicators'] },
	{ path: '/crm/reporting', key: 'reporting', bricks: ['.pband', '.tabs-bar', '.hero', '.content', '.indicators'] },
	{ path: '/crm/prospection', key: 'prospection', bricks: ['.pband', '.prospection-shell'] },
	{ path: '/crm/campagnes', key: 'campagnes', bricks: ['.pband', '.toolbar', '.listcard', '.head'] },
	{ path: '/crm/veille', key: 'veille', bricks: ['.veille-page-wrap', '.pband'] },
	{ path: '/crm/aide', key: 'aide', bricks: ['.aide', '.tabs-bar'] },
	{ path: '/crm/dashboard/couts', key: 'couts', bricks: ['.page', '.page-header', '.chart-section'] },
];

const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: vw, height: 900 } });
const pg = await ctx.newPage();
const report = { state, vw, flags: { ff_crm_listes_v2: true, ff_ui_coherence: on, ff_page_bandeau: on }, pages: {} };

for (const P of PAGES) {
	try {
		await pg.goto(`${origin}${P.path}`, { waitUntil: 'networkidle' });
		await pg.waitForTimeout(450);
		report.pages[P.key] = await pg.evaluate((bricks) => {
			const main = document.querySelector('main');
			if (!main) return { error: 'no main' };
			const mr = main.getBoundingClientRect();
			const mcs = getComputedStyle(main);
			const mainContentLeft = mr.left + parseFloat(mcs.paddingLeft || '0');
			const wrap = document.querySelector('.crm-page-wrap');
			const wcs = wrap ? getComputedStyle(wrap) : null;
			const wr = wrap ? wrap.getBoundingClientRect() : null;
			const brickData = {};
			for (const sel of bricks) {
				const el = document.querySelector(sel);
				if (!el) { brickData[sel] = null; continue; }
				const r = el.getBoundingClientRect();
				const cs = getComputedStyle(el);
				brickData[sel] = {
					gutter: Math.round(r.left - mainContentLeft),
					width: Math.round(r.width),
					padLeft: cs.paddingLeft,
					marginLeft: cs.marginLeft,
					maxWidth: cs.maxWidth,
				};
			}
			return {
				viewportW: window.innerWidth,
				mainContentLeft: Math.round(mainContentLeft),
				socle: wrap
					? {
							padLeft: wcs.paddingLeft,
							padRight: wcs.paddingRight,
							maxWidth: wcs.maxWidth,
							width: Math.round(wr.width),
							leftRelMain: Math.round(wr.left - mainContentLeft),
							marginLeft: wcs.marginLeft,
						}
					: null,
				bricks: brickData,
			};
		}, P.bricks);
		await pg.screenshot({ path: `${dir}d1-${P.key}-${state}-${vw}.png` });
	} catch (e) {
		report.pages[P.key] = { error: String(e).slice(0, 200) };
	}
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
