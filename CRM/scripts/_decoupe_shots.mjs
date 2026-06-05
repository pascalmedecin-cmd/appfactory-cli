/**
 * QA Découpe §8 (perf) + §9 (fidélité golden) : seed un chantier démo identique au golden
 * (Villa Léman, 6 vitres, 4 produits), capture les 4 écrans en screenshot pleine page,
 * mesure LCP/CLS + erreurs console sur l'écran résultat, puis cleanup. Utilitaire temporaire.
 * Usage : node scripts/_decoupe_shots.mjs   (dev server sur :5173 + tests/.auth.local.json)
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const env = {};
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
	const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (!m) continue;
	let v = m[2].trim();
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
	env[m[1]] = v.replace(/\\n/g, '');
}
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TAG = '[QA-SHOT]';
const OUT = new URL('../.product-architect/decoupe/qa-shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// --- Seed (mêmes profils que le golden v4) ---------------------------------------------------
const prodDefs = [
	{ reference: `${TAG}-SOL-70`, nom: 'Film solaire 70 %', famille: 'solaire', fabricant: '3M Prestige', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true },
	{ reference: `${TAG}-SEC-100`, nom: 'Film sécurité 100µ', famille: 'securite', fabricant: 'Hanita SafetyZone', laizes_mm: [1830], orientation_imposee: false, jointage_autorise: false, nestable: true },
	{ reference: `${TAG}-DISC-FR`, nom: 'Dépoli discrétion', famille: 'discretion', fabricant: 'Solar Screen', laizes_mm: [1270, 1520], orientation_imposee: true, jointage_autorise: false, nestable: true },
	{ reference: `${TAG}-VRN-AR`, nom: 'Vernis anti-rayures', famille: 'securite', fabricant: 'ClearShield', laizes_mm: [1000], orientation_imposee: false, jointage_autorise: false, nestable: false }
];
const { data: prods, error: pErr } = await admin.from('decoupe_produits').insert(prodDefs).select('id, reference');
if (pErr) throw pErr;
const pid = (suf) => prods.find((p) => p.reference === `${TAG}-${suf}`).id;
const { data: chs, error: cErr } = await admin.from('decoupe_chantiers').insert({ nom: `${TAG} Villa Léman, étage 2`, client: 'Régie Dupont', statut: 'en_saisie' }).select('id');
if (cErr) throw cErr;
const cid = chs[0].id;
const base = new Date('2026-06-05T08:00:00Z').getTime();
const ts = (i) => new Date(base + i * 60000).toISOString();
const vitres = [
	{ produit: 'SOL-70', largeur_mm: 1200, hauteur_mm: 800, quantite: 4, sur_mesure_fournisseur: false },
	{ produit: 'SOL-70', largeur_mm: 900, hauteur_mm: 2100, quantite: 2, sur_mesure_fournisseur: false },
	{ produit: 'SEC-100', largeur_mm: 600, hauteur_mm: 600, quantite: 3, sur_mesure_fournisseur: false },
	{ produit: 'SOL-70', largeur_mm: 2000, hauteur_mm: 1000, quantite: 1, sur_mesure_fournisseur: true },
	{ produit: 'DISC-FR', largeur_mm: 1700, hauteur_mm: 900, quantite: 1, sur_mesure_fournisseur: false },
	{ produit: 'VRN-AR', largeur_mm: 800, hauteur_mm: 600, quantite: 2, sur_mesure_fournisseur: false }
];
const { error: vErr } = await admin.from('decoupe_vitres').insert(
	vitres.map((v, i) => ({ chantier_id: cid, produit_id: pid(v.produit), largeur_mm: v.largeur_mm, hauteur_mm: v.hauteur_mm, quantite: v.quantite, sur_mesure_fournisseur: v.sur_mesure_fournisseur, created_at: ts(i) }))
);
if (vErr) throw vErr;
console.log('seed OK chantier', cid);

// --- Capture + perf --------------------------------------------------------------------------
const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: new URL('../tests/.auth.local.json', import.meta.url).pathname, viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
await page.addInitScript(() => {
	window.__lcp = 0; window.__cls = 0;
	try {
		new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
		new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: true });
	} catch { /* noop */ }
});

const screens = [
	{ name: 'optimisation', url: `/decoupe/optimisation?chantiers=${cid}`, perf: true },
	{ name: 'chantiers', url: '/decoupe' },
	{ name: 'produits', url: '/decoupe/produits' },
	{ name: 'fiche', url: `/decoupe/chantiers/${cid}` }
];
for (const s of screens) {
	await page.goto(`http://localhost:5173${s.url}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(700);
	// Déplie la 1re liste de coupe pour la capturer (optimisation).
	if (s.perf) { const d = page.locator('.df-cut summary').first(); if (await d.count()) await d.click().catch(() => {}); await page.waitForTimeout(200); }
	await page.screenshot({ path: `${OUT}${s.name}.png`, fullPage: true });
	if (s.perf) {
		const lcp = await page.evaluate(() => window.__lcp || 0);
		const cls = await page.evaluate(() => window.__cls || 0);
		console.log(`PERF ${s.name}: LCP=${Math.round(lcp)}ms CLS=${cls.toFixed(3)}`);
	}
	console.log(`shot ${s.name} → ${s.name}.png`);
}
console.log('console errors:', consoleErrors.length, consoleErrors.slice(0, 5));
await browser.close();

// --- Cleanup ---------------------------------------------------------------------------------
await admin.from('decoupe_chantiers').delete().eq('id', cid);
await admin.from('decoupe_produits').delete().in('id', prods.map((p) => p.id));
console.log('cleanup OK · shots dans', OUT);
