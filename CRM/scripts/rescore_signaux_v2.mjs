#!/usr/bin/env node
/**
 * Script one-shot : rescore les signaux existants avec le scoring v2 (keywords BDD).
 *
 * À lancer une fois en post-migration `_003_signaux_mots_cles` :
 *   node scripts/rescore_signaux_v2.mjs
 *
 * Lit `.env.local` (DATABASE_URL_ADMIN), connecte via `pg`, charge tous les
 * mots-clés actifs, recalcule `score_pertinence` + `notes_libres` pour les
 * signaux à statut `nouveau` ou `en_analyse`. Les archivés (`converti`, `ecarte`)
 * sont laissés intacts (cf. spec § 3 hors-scope).
 *
 * Sécurité : DRY-RUN par défaut. Ajoute `--apply` pour exécuter les UPDATE.
 *
 * Re-implémente une version simplifiée de scoreKeywords pour rester sans build TS
 * (script ESM autonome). La logique est alignée avec src/lib/scoring/keywords.ts ;
 * en cas de divergence, c'est `keywords.ts` qui fait foi (re-exécuter au prochain
 * passage admin via UI suffit à reconverger via rescoreActiveSignaux côté serveur).
 */
import { readFileSync } from 'fs';
import { Client } from 'pg';
// Source partagée avec le test de parité Vitest (src/lib/scoring/keywords.test.ts).
// Si normalizeNFD / countMatches divergent de src/lib/scoring/keywords.ts, le test
// rouge l'indique avant que le script ne tourne en prod.
import { normalizeNFD, countMatches } from './_keywords_pure.mjs';

const DRY_RUN = !process.argv.includes('--apply');

const KEYWORD_CAPS = { coeur: 10, bonus: 4 };
const KEYWORD_SCORE_FLOOR = -10;
const KEYWORD_SCORE_CEIL = 20;

function scoreKeywords(text, keywords) {
	if (!text) return { total: 0, criteres: [] };
	const textNorm = normalizeNFD(text);
	let coeurRaw = 0, bonusRaw = 0, eviterApplied = 0;
	const coeurDetail = [], bonusDetail = [], eviterDetail = [];
	for (const kw of keywords) {
		const n = countMatches(textNorm, kw.terme_norm);
		if (n === 0) continue;
		if (kw.categorie === 'coeur') { coeurRaw += n * kw.poids; coeurDetail.push(`${kw.terme}×${n}`); }
		else if (kw.categorie === 'bonus') { bonusRaw += n * kw.poids; bonusDetail.push(`${kw.terme}×${n}`); }
		else { eviterApplied += kw.poids; eviterDetail.push(kw.terme); }
	}
	const coeurApplied = Math.min(coeurRaw, KEYWORD_CAPS.coeur);
	const bonusApplied = Math.min(bonusRaw, KEYWORD_CAPS.bonus);
	const criteres = [];
	if (coeurApplied > 0) criteres.push(coeurRaw <= KEYWORD_CAPS.coeur ? `Coeur ${coeurDetail.join(', ')} (+${coeurApplied})` : `Coeur ${coeurDetail.join(', ')} plafonné (+${coeurApplied}/${coeurRaw})`);
	if (bonusApplied > 0) criteres.push(bonusRaw <= KEYWORD_CAPS.bonus ? `Bonus ${bonusDetail.join(', ')} (+${bonusApplied})` : `Bonus ${bonusDetail.join(', ')} plafonné (+${bonusApplied}/${bonusRaw})`);
	if (eviterApplied !== 0) criteres.push(`Éviter ${eviterDetail.join(', ')} (${eviterApplied})`);
	const raw = coeurApplied + bonusApplied + eviterApplied;
	return { total: Math.max(KEYWORD_SCORE_FLOOR, Math.min(KEYWORD_SCORE_CEIL, raw)), criteres };
}

// Composants v1 résiduels (canton, source, récence) reproduits depuis src/lib/scoring.ts
// pour calculer le score final cohérent avec le runtime (sinon dérive).
const CANTONS_PRIO = new Set(['GE', 'VD', 'VS']);
const CANTONS_SEC = new Set(['NE', 'FR', 'JU']);
const SOURCES_CHAUDES = new Set(['simap']);
const SOURCES_INTERVENTION = new Set(['regbl']);
const SOURCES_ENTREPRISE = new Set(['zefix', 'google_places']);
const DAY_MS = 86400000;

function computeFullScore(s, keywords) {
	let total = 0;
	const criteres = [];
	if (s.canton && CANTONS_PRIO.has(s.canton)) { total += 2; criteres.push(`Canton ${s.canton} (+2)`); }
	else if (s.canton && CANTONS_SEC.has(s.canton)) { total += 1; criteres.push(`Canton ${s.canton} (+1)`); }
	const kw = scoreKeywords([s.description_projet || '', s.maitre_ouvrage || ''].join(' '), keywords);
	if (kw.total !== 0) { total += kw.total; criteres.push(...kw.criteres); }
	if (s.source_officielle && SOURCES_CHAUDES.has(s.source_officielle)) { total += 2; criteres.push(`Signal ${s.source_officielle.toUpperCase()} (+2)`); }
	if (s.source_officielle && SOURCES_INTERVENTION.has(s.source_officielle)) { total += 1; criteres.push(`Source ${s.source_officielle.toUpperCase()} (+1)`); }
	if (s.source_officielle && SOURCES_ENTREPRISE.has(s.source_officielle)) { total += 1; criteres.push('Entreprise identifiee (+1)'); }
	if (s.date_publication) {
		const d = new Date(s.date_publication);
		if (!isNaN(d.getTime())) {
			const jours = Math.floor((Date.now() - d.getTime()) / DAY_MS);
			if (jours >= 0 && jours <= 30) { total += 2; criteres.push(`Recente < 30j (+2)`); }
			else if (jours > 30 && jours <= 90) { total += 1; criteres.push(`Recente < 90j (+1)`); }
		}
	}
	return { total, criteres };
}

async function main() {
	const env = Object.fromEntries(
		readFileSync('.env.local', 'utf8')
			.split('\n')
			.filter((l) => l && !l.startsWith('#'))
			.map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; })
	);
	const c = new Client({ connectionString: env.DATABASE_URL_ADMIN });
	await c.connect();

	const kwRes = await c.query('SELECT id, terme, terme_norm, categorie, poids FROM signaux_mots_cles');
	const keywords = kwRes.rows;
	console.log(`Mots-clés chargés : ${keywords.length}`);

	const signauxRes = await c.query(
		`SELECT id, canton, description_projet, maitre_ouvrage, source_officielle, date_publication, score_pertinence, notes_libres
		 FROM signaux_affaires
		 WHERE statut_traitement IN ('nouveau', 'en_analyse')`
	);
	console.log(`Signaux actifs à rescorer : ${signauxRes.rows.length}`);

	let changed = 0;
	for (const s of signauxRes.rows) {
		const { total, criteres } = computeFullScore(s, keywords);
		const newNotes = criteres.join(', ') || null;
		if (s.score_pertinence === total && s.notes_libres === newNotes) continue;
		changed++;
		console.log(`  ${s.id} : ${s.score_pertinence ?? 'null'} → ${total}  | ${criteres.join(', ')}`);
		if (!DRY_RUN) {
			await c.query('UPDATE signaux_affaires SET score_pertinence = $1, notes_libres = $2 WHERE id = $3', [total, newNotes, s.id]);
		}
	}

	console.log(`\n${changed} signaux ${DRY_RUN ? 'auraient été' : 'ont été'} modifiés.`);
	if (DRY_RUN) console.log('Mode DRY-RUN. Relance avec --apply pour exécuter les UPDATE.');
	await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
