/**
 * QA tolérance zéro §9 (fidélité golden ↔ Svelte) : capture l'écran de RÉSULTAT réel
 * (authentifié, ff_decoupe ON le temps du shot) pour vérifier le langage golden v4 + le
 * nouveau bouton « Exporter en PDF » + les labels de strip rotés. Seed [QA-SHOT] puis cleanup.
 * Lancer depuis CRM/, serveur dev sur :5173 :  node scripts/_decoupe_qa_screen_shot.mjs
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
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});
const TAG = '[QA-SHOT]';
const EMAIL = 'pascal@filmpro.ch';

let chantierId, prodIds = [], userId, prevFlag = false;
try {
	const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
	const u = list.users.find((x) => x.email?.toLowerCase() === EMAIL.toLowerCase());
	userId = u.id;
	prevFlag = u.app_metadata?.ff_decoupe === true;
	await admin.auth.admin.updateUserById(userId, { app_metadata: { ...(u.app_metadata || {}), ff_decoupe: true } });

	const { data: prods } = await admin.from('decoupe_produits').insert([
		{ reference: `${TAG}-SOL`, nom: 'Film solaire neutre 70', famille: 'solaire', fabricant: 'Solar', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
		{ reference: `${TAG}-VRN`, nom: 'Vernis anti-rayures', famille: 'securite', fabricant: 'CoatX', laizes_mm: [1000], orientation_imposee: false, jointage_autorise: false, nestable: false, marge_pose_mm: 0, recouvrement_mm: 0 }
	]).select('id, reference');
	prodIds = prods.map((p) => p.id);
	const pSol = prods.find((p) => p.reference === `${TAG}-SOL`).id;
	const pVrn = prods.find((p) => p.reference === `${TAG}-VRN`).id;

	const { data: ch } = await admin.from('decoupe_chantiers').insert({ nom: `${TAG} Villa Léman`, statut: 'en_saisie' }).select('id').single();
	chantierId = ch.id;
	await admin.from('decoupe_vitres').insert([
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 600, hauteur_mm: 800, quantite: 3, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 1200, hauteur_mm: 500, quantite: 2, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 900, hauteur_mm: 1400, quantite: 1, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pVrn, largeur_mm: 700, hauteur_mm: 900, quantite: 1, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 1100, hauteur_mm: 2200, quantite: 1, sur_mesure_fournisseur: true }
	]);

	const browser = await chromium.launch();
	const ctx = await browser.newContext({ storageState: 'tests/.auth.local.json', viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 });
	const page = await ctx.newPage();
	const resp = await page.goto(`http://localhost:5173/decoupe/optimisation?chantiers=${chantierId}`, { waitUntil: 'networkidle' });
	console.log('HTTP', resp.status());
	await page.evaluate(() => document.fonts.ready);
	await page.waitForSelector('.df-kpis');
	await page.screenshot({ path: 'scripts/_qa-decoupe-result.png', fullPage: true });
	console.log('Screenshot → scripts/_qa-decoupe-result.png');
	await browser.close();
} finally {
	if (chantierId) await admin.from('decoupe_chantiers').delete().eq('id', chantierId);
	if (prodIds.length) await admin.from('decoupe_produits').delete().in('id', prodIds);
	if (userId) await admin.auth.admin.updateUserById(userId, { app_metadata: { ff_decoupe: prevFlag } });
	console.log('Cleanup OK (flag restauré:', prevFlag, ')');
}
