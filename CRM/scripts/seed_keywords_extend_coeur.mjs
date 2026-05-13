#!/usr/bin/env node
/**
 * Script one-shot : étend le seed Cœur de `signaux_mots_cles` avec ~15 termes
 * supplémentaires alignés sur le brief métier FilmPro (vitrage + films + vernis).
 *
 * Spec : notes/refonte-signaux-v3-2026-05-13/spec.md § 5 (axe 3 C10-C12).
 * Référence métier : memory/project_filmpro_metier.md.
 *
 * Usage :
 *   node scripts/seed_keywords_extend_coeur.mjs            # dry-run (par défaut)
 *   node scripts/seed_keywords_extend_coeur.mjs --apply    # INSERT en prod
 *
 * Idempotent : INSERT ... ON CONFLICT (terme_norm) DO NOTHING. Les termes déjà
 * seedés S187 sont silencieusement skippés.
 *
 * Après --apply : lancer `node scripts/rescore_signaux_v2.mjs --apply` pour que
 * les signaux actifs absorbent le nouveau vocabulaire (cf. spec § 4 C12).
 */
import { readFileSync } from 'fs';
import { Client } from 'pg';
import { normalizeNFD } from './_keywords_pure.mjs';

const DRY_RUN = !process.argv.includes('--apply');

// Keep in sync with src/lib/scoring/keywords.ts POIDS_PAR_CATEGORIE.coeur.
// Hardcodé ici car script ESM autonome (pas de build TS depuis .mjs).
const POIDS_COEUR = 5;

// 15 termes Cœur étendus (poids +5, identique POIDS_PAR_CATEGORIE.coeur).
// Justification : vocabulaire bâti suisse moderne SIMAP pour augmenter le rappel
// (état S187 : 0/117 SIMAP matchait le Cœur sur le vocab initial `vitrage / film / vernis`).
const TERMES_COEUR_EXTENSION = [
	'verrière',
	'double vitrage',
	'triple vitrage',
	'survitrage',
	'paroi vitrée',
	'protection solaire',
	'pare-soleil',
	'brise-soleil',
	'film solaire',
	'film thermique',
	'film de protection',
	'vitrage isolant',
	'vitrage feuilleté',
	'vitrage de sécurité',
	'film opacifiant',
];

async function main() {
	const env = Object.fromEntries(
		readFileSync('.env.local', 'utf8')
			.split('\n')
			.filter((l) => l && !l.startsWith('#'))
			.map((l) => {
				const i = l.indexOf('=');
				return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
			}),
	);
	const c = new Client({ connectionString: env.DATABASE_URL_ADMIN });
	await c.connect();

	// Charger l'état actuel pour identifier les termes déjà présents.
	const existing = new Set(
		(await c.query('SELECT terme_norm FROM signaux_mots_cles')).rows.map((r) => r.terme_norm),
	);
	console.log(`Mots-clés en base : ${existing.size}`);

	const toInsert = [];
	const skipped = [];
	for (const terme of TERMES_COEUR_EXTENSION) {
		const tn = normalizeNFD(terme);
		if (existing.has(tn)) {
			skipped.push({ terme, terme_norm: tn });
		} else {
			toInsert.push({ terme, terme_norm: tn });
		}
	}

	console.log(`\nProposés à l'ajout : ${TERMES_COEUR_EXTENSION.length} terme(s) Cœur`);
	console.log(`  → ${toInsert.length} nouveau(x) à INSERT`);
	console.log(`  → ${skipped.length} déjà présent(s), skippé(s) (ON CONFLICT DO NOTHING)\n`);

	for (const k of toInsert) {
		console.log(`  + ${k.terme}   (terme_norm: ${k.terme_norm})`);
	}
	if (skipped.length > 0) {
		console.log('\nSkippés (déjà en base) :');
		for (const k of skipped) console.log(`  = ${k.terme}`);
	}

	if (DRY_RUN) {
		console.log('\nMode DRY-RUN. Relance avec --apply pour exécuter les INSERT.');
		console.log("Après --apply : node scripts/rescore_signaux_v2.mjs --apply  (rescore les signaux actifs).");
		await c.end();
		return;
	}

	if (toInsert.length === 0) {
		console.log('\nRien à insérer.');
		await c.end();
		return;
	}

	console.log('\nExécution des INSERT...');
	let inserted = 0;
	for (const k of toInsert) {
		const r = await c.query(
			`INSERT INTO public.signaux_mots_cles (terme, terme_norm, categorie, poids, cree_par_email)
			 VALUES ($1, $2, 'coeur', $3, 'seed@filmpro.ch')
			 ON CONFLICT (terme_norm) DO NOTHING
			 RETURNING id`,
			[k.terme, k.terme_norm, POIDS_COEUR],
		);
		if (r.rowCount > 0) {
			inserted++;
			console.log(`  ✓ ${k.terme}`);
		} else {
			console.log(`  · ${k.terme}  (skip via ON CONFLICT)`);
		}
	}

	console.log(`\n${inserted} terme(s) inséré(s).`);
	console.log('Étape suivante : node scripts/rescore_signaux_v2.mjs --apply');
	await c.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
