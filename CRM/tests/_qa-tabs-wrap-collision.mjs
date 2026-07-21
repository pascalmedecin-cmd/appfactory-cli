// Validation du wrap content-driven (fix collision tabs-shell). Mesure wrap/collision à plusieurs
// largeurs, en 3 onglets (réel) ET 5 onglets (simulé par injection DOM) pour prouver la robustesse au
// nombre d'onglets. Usage : node tests/_calib-wrap.mjs <off|on>
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const on = (process.argv[2] || 'off') === 'on';
const email = 'pascal@filmpro.ch';
function le(p){const o={};for(const l of readFileSync(p,'utf8').split('\n')){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);v=v.replace(/(\\n|\s)+$/,'');o[m[1]]=v;}return o;}
const env = le(new URL('../.env.development.local', import.meta.url).pathname);
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.PUBLIC_SUPABASE_URL)) throw new Error('non-local');
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const u = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
const meta = { ...(u.app_metadata || {}) };
meta.ff_crm_listes_v2 = true; meta.ff_ui_coherence = on ? true : null; meta.ff_page_bandeau = null;
await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
const storage = JSON.parse(readFileSync(new URL('./.auth.local.json', import.meta.url).pathname, 'utf8'));

function measure(inject5) {
	const bar = document.querySelector('.tabs-bar');
	const actions = document.querySelector('.tabs-actions');
	if (!bar || !actions) return { absent: true };
	if (inject5) {
		// simule 5 onglets : clone 2 onglets et étire leurs labels (Marchés publics / Chantiers)
		const src = bar.querySelector('.tab');
		['Marchés publics', 'Chantiers'].forEach((lbl) => {
			const c = src.cloneNode(true);
			const l = c.querySelector('.tab-label'); if (l) l.textContent = lbl;
			bar.appendChild(c);
		});
	}
	const barR = bar.getBoundingClientRect();
	const actR = actions.getBoundingClientRect();
	const tabs = [...bar.querySelectorAll('.tab')];
	const lastR = tabs.length ? tabs[tabs.length - 1].getBoundingClientRect() : null;
	const wrapped = actR.top - barR.top > 20;
	const collision = !wrapped && lastR ? actR.left < lastR.right - 1 : false; // même ligne + actions à gauche du dernier onglet
	return { tabCount: tabs.length, wrapped, collision, gap: !wrapped && lastR ? Math.round(actR.left - lastR.right) : 'wrapped' };
}

const browser = await chromium.launch();
const rows = [];
for (const w of [1024, 1200, 1280, 1366, 1440, 1500, 1600]) {
	const ctx = await browser.newContext({ storageState: storage, viewport: { width: w, height: 900 } });
	const pg = await ctx.newPage();
	await pg.goto('http://localhost:5173/crm/prospection', { waitUntil: 'networkidle' });
	await pg.waitForTimeout(300);
	const m3 = await pg.evaluate(measure, false);
	const m5 = await pg.evaluate(measure, true); // injecte 2 onglets → 5
	rows.push({ w, t3: m3, t5: m5 });
	await ctx.close();
}
console.log(JSON.stringify({ state: on ? 'on' : 'off', rows }, null, 2));
await browser.close();
