/**
 * QA tolérance zéro §8 (perf écran résultat) : mesure LCP + CLS RÉELS, authentifié, sur
 * l'écran de résultat Découpe. Web-vitals via PerformanceObserver (pas Lighthouse : adapter
 * Vercel ne se preview pas en SSR local ; le dev sert le SSR réel). Le dev est PLUS LENT que
 * la prod → un LCP sous le cap en dev = marge confortable en prod. CLS est build-indépendant.
 * Prérequis : serveur dev :5173 préchauffé. Seed [PERF] + ff_decoupe ON, cleanup en fin.
 * Lancer depuis CRM/ :  node scripts/_decoupe_perf_check.mjs
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
	const out = {};
	for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		out[m[1]] = v.replace(/(\\n|\s)+$/, '');
	}
	return out;
}
const env = loadEnv();
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const TAG = '[PERF]';
const CAP_LCP = 2500, CAP_CLS = 0.1;

let chantierId, prodIds = [], userId, prevFlag = false, fail = 0;
try {
	const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
	const u = list.users.find((x) => x.email?.toLowerCase() === 'pascal@filmpro.ch');
	userId = u.id; prevFlag = u.app_metadata?.ff_decoupe === true;
	await admin.auth.admin.updateUserById(userId, { app_metadata: { ...(u.app_metadata || {}), ff_decoupe: true } });

	const { data: prods } = await admin.from('decoupe_produits').insert([
		{ reference: `${TAG}-SOL`, nom: 'Film solaire', famille: 'solaire', fabricant: 'x', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 }
	]).select('id');
	prodIds = prods.map((p) => p.id);
	const { data: ch } = await admin.from('decoupe_chantiers').insert({ nom: `${TAG} Villa`, statut: 'en_saisie' }).select('id').single();
	chantierId = ch.id;
	await admin.from('decoupe_vitres').insert([
		{ chantier_id: chantierId, produit_id: prodIds[0], largeur_mm: 600, hauteur_mm: 800, quantite: 4, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: prodIds[0], largeur_mm: 1200, hauteur_mm: 500, quantite: 2, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: prodIds[0], largeur_mm: 900, hauteur_mm: 1400, quantite: 1, sur_mesure_fournisseur: false }
	]);

	const browser = await chromium.launch();
	const ctx = await browser.newContext({ storageState: 'tests/.auth.local.json', viewport: { width: 1280, height: 1400 } });
	const page = await ctx.newPage();
	const url = `http://localhost:5173/decoupe/optimisation?chantiers=${chantierId}`;
	// La route est déjà compilée (curl de préchauffage) → ce goto est un load « chaud » représentatif.
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForSelector('.df-kpis');

	// Lecture des web-vitals via observers buffered (entries déjà enregistrées), SANS re-navigation.
	const vitals = await page.evaluate(() => new Promise((resolve) => {
		let lcp = 0, cls = 0;
		new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
		new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
		setTimeout(() => {
			const nav = performance.getEntriesByType('navigation')[0] || {};
			resolve({ lcp: Math.round(lcp), cls: Math.round(cls * 1000) / 1000, dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0) });
		}, 1000);
	}));

	console.log(`LCP=${vitals.lcp}ms (cap ${CAP_LCP}) · CLS=${vitals.cls} (cap ${CAP_CLS}) · DCL=${vitals.dcl}ms · load=${vitals.load}ms`);
	const okLcp = vitals.lcp > 0 && vitals.lcp < CAP_LCP;
	const okCls = vitals.cls < CAP_CLS;
	console.log(`${okLcp ? '\x1b[32mOK\x1b[0m  ' : '\x1b[31mECHEC\x1b[0m'} LCP < ${CAP_LCP}ms (dev, prod plus rapide)`);
	console.log(`${okCls ? '\x1b[32mOK\x1b[0m  ' : '\x1b[31mECHEC\x1b[0m'} CLS < ${CAP_CLS} (≈0, build-indépendant)`);
	if (!okLcp || !okCls) fail = 1;
	await browser.close();
} finally {
	if (chantierId) await admin.from('decoupe_chantiers').delete().eq('id', chantierId);
	if (prodIds.length) await admin.from('decoupe_produits').delete().in('id', prodIds);
	if (userId) await admin.auth.admin.updateUserById(userId, { app_metadata: { ff_decoupe: prevFlag } });
	console.log('Cleanup OK (flag restauré:', prevFlag, ')');
}
process.exit(fail);
