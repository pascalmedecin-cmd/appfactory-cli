/**
 * Smoke PROD « Découpe Films » Phase 5 (livraison).
 * Parcours réel contre https://filmpro-portail.vercel.app : seed chantier éphémère
 * [SMOKE-P5] -> écran d'optimisation -> clic « Exporter en PDF » -> vérifie qu'un vrai
 * PDF (%PDF, polices + vecteurs, > 20 Ko) est téléchargé. Le download réussi prouve que
 * le moteur jsPDF + svg2pdf + donut a abouti (svg2pdf rejetterait sur le donut sinon).
 * Purge garantie (finally) : aucune donnée prod résiduelle.
 *
 * Prérequis : tests/.auth.local.json minté pour filmpro-portail.vercel.app
 *   node tests/mint-session.mjs pascal@filmpro.ch https://filmpro-portail.vercel.app
 *
 * Usage : node scripts/_decoupe_smoke_prod.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const BASE = 'https://filmpro-portail.vercel.app';
const TAG = '[SMOKE-P5]';
const STORAGE = new URL('../tests/.auth.local.json', import.meta.url).pathname;

function loadEnv() {
	const out = {};
	for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
		const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		out[m[1]] = v.replace(/(\\n|\s)+$/, '');
	}
	return out;
}
const env = loadEnv();
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

let produitId = '';
let chantierId = '';
let browser;
let ok = false;

try {
	// 1) Seed : 1 produit nestable + 1 chantier + vitres (de quoi produire film/strip/donut).
	const { data: prod, error: pErr } = await admin
		.from('decoupe_produits')
		.insert({ reference: `${TAG}-SOL`, nom: `${TAG} Film solaire`, famille: 'solaire', fabricant: 'SmokeFab', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 })
		.select('id')
		.single();
	if (pErr) throw pErr;
	produitId = prod.id;

	const { data: ch, error: cErr } = await admin
		.from('decoupe_chantiers')
		.insert({ nom: `${TAG} Villa smoke`, client: 'Smoke Phase 5', statut: 'en_saisie' })
		.select('id')
		.single();
	if (cErr) throw cErr;
	chantierId = ch.id;

	const { error: vErr } = await admin.from('decoupe_vitres').insert([
		{ chantier_id: chantierId, produit_id: produitId, largeur_mm: 1200, hauteur_mm: 800, quantite: 4, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: produitId, largeur_mm: 900, hauteur_mm: 600, quantite: 3, sur_mesure_fournisseur: false }
	]);
	if (vErr) throw vErr;
	console.log(`Seed OK : chantier=${chantierId}`);

	// 2) Navigateur réel avec session fondateur, contre la PROD.
	browser = await chromium.launch();
	const ctx = await browser.newContext({ storageState: STORAGE, acceptDownloads: true });
	const page = await ctx.newPage();

	const url = `${BASE}/decoupe/optimisation?chantiers=${chantierId}`;
	const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
	console.log(`GET ${url} -> HTTP ${resp?.status()}`);
	if (!resp || resp.status() >= 400) throw new Error(`écran optimisation non servi (HTTP ${resp?.status()})`);

	// Vérif rendu : KPI + bouton export.
	const btn = page.getByRole('button', { name: /Exporter en PDF/ });
	await btn.waitFor({ state: 'visible', timeout: 20000 });
	const kpiCount = await page.locator('.df-kpi').count();
	const stripVisible = await page.locator('.df-strip svg[role="img"]').first().isVisible().catch(() => false);
	console.log(`Écran optimisation rendu : ${kpiCount} KPI, strip SVG ${stripVisible ? 'présent' : 'absent'}`);

	// 3) Clic export -> download réel (jsPDF + svg2pdf + donut). Échec donut = pas de download.
	const [download] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), btn.click()]);
	const filename = download.suggestedFilename();
	const path = await download.path();
	const buf = readFileSync(path);
	const head = buf.subarray(0, 5).toString('latin1');
	console.log(`PDF téléchargé : ${filename} (${(buf.length / 1024).toFixed(1)} Ko, en-tête « ${head} »)`);

	if (!/^plan-decoupe-.*\.pdf$/.test(filename)) throw new Error(`nom de fichier inattendu : ${filename}`);
	if (head !== '%PDF-') throw new Error(`en-tête PDF invalide : ${head}`);
	if (buf.length <= 20000) throw new Error(`PDF trop petit (${buf.length} o) : polices/vecteurs absents ?`);

	ok = true;
	console.log('\n✅ SMOKE PROD PDF : OK (PDF valide, donut rendu sans rejet svg2pdf).');
} finally {
	if (browser) await browser.close();
	// Purge garantie, dans l'ordre inverse des FK.
	if (chantierId) await admin.from('decoupe_chantiers').delete().eq('id', chantierId);
	if (produitId) await admin.from('decoupe_produits').delete().eq('id', produitId);
	console.log(`Purge : chantier ${chantierId || '-'} + produit ${produitId || '-'} supprimés.`);
}

process.exit(ok ? 0 : 1);
