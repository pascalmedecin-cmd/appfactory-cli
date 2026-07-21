// QA DOM cohérence UI increment d3 (« rythme vertical, échelle de 8 : 16/16/24/32/48 ») contre la base
// jetable LOCALE. Pour chaque page, mesure les ÉCARTS VERTICAUX entre zones adjacentes réellement rendues :
//   gap(i) = round(rect[i+1].top - rect[i].bottom)   (px, entre le bas d'une zone et le haut de la suivante)
// et capture par zone marginTop/Bottom + paddingTop/Bottom (diagnostic). Deux usages :
//   - state=on  : les écarts doivent atteindre la cible (16/16/24 en tête, 32 entre sections, 48 identité dashboard).
//   - state=off : les écarts doivent être STRICTEMENT identiques au legacy (byte-identical, zéro régression).
// Comparer les JSON OFF vs OFF-pré-édit (doivent matcher) et ON vs cibles.
// Flags : premium (ff_crm_listes_v2) TOUJOURS ON (baseline fondateurs = prod) ; ff_ui_coherence + ff_page_bandeau
// = on?true:null (merge-null pour désactiver, cf. feedback_supabase_update_metadata_merge_null).
// Prérequis : supabase up + npm run dev + tests/.auth.local.json. Usage : node tests/_qa-coherence-d3.mjs <off|on> [origin] [vw]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// states : off | on (coherence+bandeau) | coh-only (coherence ON, bandeau OFF = état mixte, flags indépendants)
const state = (process.argv[2] || 'off').toLowerCase();
const origin = process.argv[3] || 'http://localhost:5173';
const vw = parseInt(process.argv[4] || '1440', 10);
const email = 'pascal@filmpro.ch';
const on = state === 'on' || state === 'coh-only';
const bandeauOn = state === 'on';
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
meta.ff_page_bandeau = bandeauOn ? true : null;
const { error: uErr } = await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
if (uErr) throw uErr;

// PAGES : liste ordonnée des ZONES par page (du haut vers le bas). Chaque zone = un sélecteur du 1er
// élément de la zone. La cible `t` (px) est l'écart ATTENDU vers la zone SUIVANTE sous ON.
// (rempli depuis la cartographie coherence-d3-rhythm-map ; NULL/absent = zone non rendue → ignorée)
// zones ordonnées haut→bas (1er élément de chaque zone). Les écarts consécutifs sont mesurés.
// Cibles (échelle de 8) : bandeau→pouls 16, pouls→filtres 16, filtres→contenu 24, entre sections 32.
// Exemptions signées : dashboard (compact « Capsule » uniforme 16), veille (magazine), aide-sections (docs).
const PAGES = [
	{ key: 'dashboard', path: '/crm', zones: [
		{ sel: '.pband', name: 'bandeau' }, { sel: '.dt-hero', name: 'hero' },
		{ sel: '.kpi-strip', name: 'pouls', t: 24 }, { sel: '.dt-grid', name: 'contenu' } ] },
	{ key: 'contacts', path: '/crm/contacts', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.kpi-strip', name: 'pouls', t: 16 },
		{ sel: '.tabs-bar', name: 'filtres', t: 24 }, { sel: '.table-wrap', name: 'contenu' } ] },
	{ key: 'entreprises', path: '/crm/entreprises', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.kpi-strip', name: 'pouls', t: 16 },
		{ sel: '.tabs-bar', name: 'filtres', t: 24 }, { sel: '.ws-content', name: 'contenu' } ] },
	{ key: 'pipeline', path: '/crm/pipeline', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.kpi-strip', name: 'pouls', t: 16 },
		{ sel: '.tabs-bar', name: 'filtres', t: 24 }, { sel: '.kanban-wrap', name: 'contenu' } ] },
	{ key: 'signaux', path: '/crm/signaux', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.kpi-strip', name: 'pouls', t: 16 },
		{ sel: '.tabs-bar', name: 'onglets', t: 8 }, { sel: '.signaux-search-wrap', name: 'recherche', t: 8 },
		{ sel: '.signaux-toolbar', name: 'toolbar', t: 24 }, { sel: '.ws-content', name: 'contenu' } ] },
	{ key: 'prospection', path: '/crm/prospection', zones: [
		{ sel: '.pband', name: 'bandeau', t: 24 }, { sel: '.kpi-strip', name: 'pouls' } ] },
	{ key: 'campagnes', path: '/crm/campagnes', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.kpi-strip', name: 'pouls', t: 16 },
		{ sel: '.toolbar', name: 'filtres', t: 24 }, { sel: '.listcard', name: 'contenu' } ] },
	{ key: 'reporting', path: '/crm/reporting', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.indicators', name: 'pouls', t: 16 },
		{ sel: '.tabs-bar', name: 'filtres', t: 24 }, { sel: '.content', name: 'contenu' },
		{ sel: '.panel.mt-24', name: 'section2' } ] },
	{ key: 'aide', path: '/crm/aide', zones: [
		{ sel: '.pband', name: 'bandeau', t: 16 }, { sel: '.tabs-bar', name: 'filtres', t: 24 },
		{ sel: '.aide-body', name: 'contenu' } ] },
	{ key: 'veille', path: '/crm/veille', zones: [ { sel: '.pband', name: 'bandeau' } ] },
];

const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: storage, viewport: { width: vw, height: 1000 } });
const pg = await ctx.newPage();
const report = { state, vw, flags: { ff_crm_listes_v2: true, ff_ui_coherence: on, ff_page_bandeau: on }, pages: {} };

for (const P of PAGES) {
	try {
		await pg.goto(`${origin}${P.path}`, { waitUntil: 'networkidle' });
		await pg.waitForTimeout(450);
		report.pages[P.key] = await pg.evaluate((zones) => {
			const found = [];
			for (const z of zones) {
				const el = document.querySelector(z.sel);
				if (!el) continue;
				const r = el.getBoundingClientRect();
				const cs = getComputedStyle(el);
				found.push({
					name: z.name,
					sel: z.sel,
					t: z.t ?? null,
					top: Math.round(r.top),
					bottom: Math.round(r.bottom),
					mt: cs.marginTop,
					mb: cs.marginBottom,
					pt: cs.paddingTop,
					pb: cs.paddingBottom,
				});
			}
			const gaps = [];
			for (let i = 0; i < found.length - 1; i++) {
				gaps.push({
					from: found[i].name,
					to: found[i + 1].name,
					gap: Math.round(found[i + 1].top - found[i].bottom),
					target: found[i].t,
					ok: found[i].t == null ? null : Math.round(found[i + 1].top - found[i].bottom) === found[i].t,
				});
			}
			return { viewportW: window.innerWidth, zones: found, gaps };
		}, P.zones);
		await pg.screenshot({ path: `${dir}d3-${P.key}-${state}-${vw}.png` });
	} catch (e) {
		report.pages[P.key] = { error: String(e).slice(0, 200) };
	}
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
