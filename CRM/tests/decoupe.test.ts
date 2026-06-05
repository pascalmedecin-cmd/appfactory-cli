import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * e2e « Découpe Films » (barrières QA tolérance zéro §4 parcours + §5 axe).
 * Session mintée OTP-free : `node tests/mint-session.mjs` produit tests/.auth.local.json.
 *
 * Données seedées via service_role (déterministe, ids connus, cleanup propre) — préfixe
 * [E2E] pour repérage/purge. Le flux UI (saisie, optimisation, lancement) est ensuite
 * exercé par-dessus, et le rendu premium asserté (KPI, strip, liste de coupe, alertes,
 * commande). Couvre : découpe interne, commande fournisseur, pièce non plaçable, produit
 * non nestable, statut lancé, empty states.
 */
test.use({ storageState: 'tests/.auth.local.json' });

// --- env (.env.local, gère les \n littéraux — cf. feedback_env_local_escaped_newlines) ------
function loadEnv(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		v = v.replace(/(\\n|\s)+$/, '');
		out[m[1]] = v;
	}
	return out;
}
const env = loadEnv();
const admin: SupabaseClient = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const TAG = '[E2E-DECOUPE]';
const TEST_EMAIL = 'pascal@filmpro.ch'; // compte mint par défaut (cf. tests/mint-session.mjs)
let chantierId = '';
let chantierVideId = '';
const produitIds: string[] = [];
let testUserId = '';
let prevFlag = false; // état ff_decoupe avant le test (restauré en afterAll)

test.beforeAll(async () => {
	// Le guard ffDecoupe est lu en temps réel via getUser() (hooks.server.ts) → on active le
	// flag en DB le temps du test, puis on restaure (état canonique OFF jusqu'à Phase 5).
	const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
	if (lErr) throw lErr;
	const u = list.users.find((x) => x.email?.toLowerCase() === TEST_EMAIL.toLowerCase());
	if (!u) throw new Error(`compte de test ${TEST_EMAIL} introuvable`);
	testUserId = u.id;
	prevFlag = (u.app_metadata as Record<string, unknown> | undefined)?.ff_decoupe === true;
	await admin.auth.admin.updateUserById(testUserId, {
		app_metadata: { ...(u.app_metadata || {}), ff_decoupe: true }
	});

	// 3 produits : nestable solaire (jointage), non-nestable, orientation imposée (provoque non plaçable).
	const { data: prods, error: pErr } = await admin
		.from('decoupe_produits')
		.insert([
			{ reference: `${TAG}-SOL`, nom: `${TAG} Film solaire`, famille: 'solaire', fabricant: 'TestFab', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 },
			{ reference: `${TAG}-VRN`, nom: `${TAG} Vernis`, famille: 'securite', fabricant: 'TestFab', laizes_mm: [1000], orientation_imposee: false, jointage_autorise: false, nestable: false, marge_pose_mm: 0, recouvrement_mm: 0 },
			{ reference: `${TAG}-DISC`, nom: `${TAG} Dépoli`, famille: 'discretion', fabricant: 'TestFab', laizes_mm: [1270, 1520], orientation_imposee: true, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 }
		])
		.select('id, reference');
	if (pErr) throw pErr;
	const idOf = (suffix: string) => prods!.find((p) => p.reference === `${TAG}-${suffix}`)!.id;
	const pSol = idOf('SOL'), pVrn = idOf('VRN'), pDisc = idOf('DISC');
	produitIds.push(pSol, pVrn, pDisc);

	const { data: chs, error: cErr } = await admin
		.from('decoupe_chantiers')
		.insert([
			{ nom: `${TAG} Villa Test`, client: 'Régie Test', statut: 'en_saisie' },
			{ nom: `${TAG} Chantier vide`, client: 'Sans vitre', statut: 'en_saisie' }
		])
		.select('id, nom');
	if (cErr) throw cErr;
	chantierId = chs!.find((c) => c.nom === `${TAG} Villa Test`)!.id;
	chantierVideId = chs!.find((c) => c.nom === `${TAG} Chantier vide`)!.id;

	const { error: vErr } = await admin.from('decoupe_vitres').insert([
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 1200, hauteur_mm: 800, quantite: 4, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 900, hauteur_mm: 2100, quantite: 2, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pSol, largeur_mm: 2000, hauteur_mm: 1000, quantite: 1, sur_mesure_fournisseur: true },
		{ chantier_id: chantierId, produit_id: pDisc, largeur_mm: 1700, hauteur_mm: 900, quantite: 1, sur_mesure_fournisseur: false },
		{ chantier_id: chantierId, produit_id: pVrn, largeur_mm: 800, hauteur_mm: 600, quantite: 2, sur_mesure_fournisseur: false }
	]);
	if (vErr) throw vErr;
});

test.afterAll(async () => {
	if (chantierId) await admin.from('decoupe_chantiers').delete().eq('id', chantierId);
	if (chantierVideId) await admin.from('decoupe_chantiers').delete().eq('id', chantierVideId);
	if (produitIds.length) await admin.from('decoupe_produits').delete().in('id', produitIds);
	// Restaure l'état du flag (OFF jusqu'à Phase 5).
	if (testUserId) {
		const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
		const u = list?.users.find((x) => x.id === testUserId);
		await admin.auth.admin.updateUserById(testUserId, {
			app_metadata: { ...(u?.app_metadata || {}), ff_decoupe: prevFlag }
		});
	}
});

async function gotoOk(page: Page, url: string) {
	const resp = await page.goto(url, { waitUntil: 'networkidle' });
	expect(resp?.status(), `status ${url}`).toBeLessThan(400);
}

test('base produit : les produits seedés sont listés avec leurs attributs', async ({ page }) => {
	await gotoOk(page, '/decoupe/produits');
	await expect(page.getByText(`${TAG}-SOL`).first()).toBeVisible();
	// Recherche du produit non nestable → chip « non nestable » visible.
	await page.getByPlaceholder('Rechercher une référence, un nom…').fill(`${TAG}-VRN`);
	await expect(page.getByText('non nestable').first()).toBeVisible();
});

test('fiche chantier : vitres saisies listées + bouton optimiser', async ({ page }) => {
	await gotoOk(page, `/decoupe/chantiers/${chantierId}`);
	await expect(page.getByRole('heading', { name: `${TAG} Villa Test` })).toBeVisible();
	// 5 lignes de vitres seedées.
	await expect(page.locator('main tbody tr')).toHaveCount(5);
	await expect(page.getByRole('link', { name: /Optimiser ce chantier/ })).toBeVisible();
});

test('optimisation : KPI, strip, liste de coupe, alertes et commande cohérents', async ({ page }) => {
	await gotoOk(page, `/decoupe/optimisation?chantiers=${chantierId}`);

	// KPI mis en scène (4 cartes).
	await expect(page.locator('.df-kpi')).toHaveCount(4);
	await expect(page.getByText('Taux de chute')).toBeVisible();
	await expect(page.getByText('Film à découper')).toBeVisible();

	// Statut « À vérifier » (il y a des alertes) — la statepill exactement, pas le titre du callout.
	await expect(page.getByText('À vérifier', { exact: true })).toBeVisible();

	// Au moins une carte film avec strip SVG (role img) + pastille de chute + liste de coupe.
	await expect(page.locator('.df-film').first()).toBeVisible();
	await expect(page.locator('.df-strip svg[role="img"]').first()).toBeVisible();
	await expect(page.locator('.df-chute').first()).toBeVisible();
	await expect(page.locator('.df-cuttable').first()).toBeAttached();

	// Alertes jamais masquées : pièce non plaçable (DISC 1700×900 > laize) + non nestable.
	await expect(page.locator('.df-callout')).toBeVisible();
	await expect(page.getByText('Pièce non plaçable')).toBeVisible();

	// Commande fournisseur : sur-mesure + produit non nestable.
	await expect(page.locator('.df-ordercard')).toBeVisible();
	await expect(page.getByText('Sur-mesure fournisseur').first()).toBeVisible();
});

test('lancer la découpe : confirmation → chantier en statut lancée', async ({ page }) => {
	await gotoOk(page, `/decoupe/optimisation?chantiers=${chantierId}`);
	await page.getByRole('button', { name: /Lancer la découpe/ }).click();
	// ConfirmModal : confirmer.
	await page.getByRole('button', { name: 'Lancer la découpe', exact: true }).last().click();
	await expect(page.getByText(/Découpe lancée/)).toBeVisible({ timeout: 8000 });

	// La fiche reflète le statut lancée.
	await gotoOk(page, `/decoupe/chantiers/${chantierId}`);
	await expect(page.getByText('Lancée').first()).toBeVisible();

	// Remise en saisie pour rejouabilité du test (idempotence).
	await admin.from('decoupe_chantiers').update({ statut: 'en_saisie' }).eq('id', chantierId);
});

test('cas limites : chantier vide → empty state ; lien sans chantier → empty', async ({ page }) => {
	await gotoOk(page, `/decoupe/chantiers/${chantierVideId}`);
	await expect(page.getByText('Aucune vitre')).toBeVisible();

	await gotoOk(page, '/decoupe/optimisation');
	await expect(page.getByText('Aucun chantier à optimiser')).toBeVisible();
});

// --- Accessibilité (axe-core) : 0 violation sérieuse sur les 4 écrans ------------------------
const ECRANS = [
	{ nom: 'Chantiers', url: '/decoupe' },
	{ nom: 'Base produit', url: '/decoupe/produits' },
	{ nom: 'Fiche chantier', url: () => `/decoupe/chantiers/${chantierId}` },
	{ nom: 'Résultat', url: () => `/decoupe/optimisation?chantiers=${chantierId}` }
];
for (const ecran of ECRANS) {
	test(`a11y axe : ${ecran.nom} sans violation`, async ({ page }) => {
		await gotoOk(page, typeof ecran.url === 'function' ? ecran.url() : ecran.url);
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
		if (results.violations.length) {
			console.log(`axe ${ecran.nom}:`, JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n) => n.target) })), null, 2));
		}
		expect(results.violations, `violations ${ecran.nom}`).toEqual([]);
	});
}
