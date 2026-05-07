/**
 * Script one-shot : re-score tous les prospect_leads en prod après refonte scoring 2026-05-01.
 * Charge les leads depuis Supabase, applique calculerScore avec la logique fixée
 * (normalize accents + lecture secteur_detecte + pondération sourcesIntervention regbl),
 * UPDATE chaque ligne. Idempotent.
 *
 * Usage : npx tsx scripts/rescore-leads-prod.mjs [--dry]
 *   --dry : log les nouveaux scores sans écrire en DB.
 *
 * Pourquoi tsx : le script importe ../src/lib/scoring.ts (TypeScript) directement.
 * Node natif ne peut pas (sauf flag --experimental-strip-types Node 22+). tsx est
 * la solution standard du repo (déjà utilisé pour les scripts de migration).
 */

import { createClient } from '@supabase/supabase-js';
import { calculerScore } from '../src/lib/scoring.ts';
import fs from 'node:fs';

// Charge .env.local en gérant les \n littéraux (cf. memory feedback_env_local_escaped_newlines)
function loadEnv() {
	const text = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
	for (const line of text.split(/\r?\n/)) {
		if (!line || line.startsWith('#') || !line.includes('=')) continue;
		const [k, ...rest] = line.split('=');
		const raw = rest.join('=').trim().replace(/^["']|["']$/g, '');
		process.env[k.trim()] = raw.replace(/\\n/g, '');
	}
}

loadEnv();

const dry = process.argv.includes('--dry');
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const c = createClient(url, key);

const { data: leads, error } = await c
	.from('prospect_leads')
	.select('id, canton, description, raison_sociale, secteur_detecte, source, date_publication, telephone, montant, score_pertinence');

if (error) {
	console.error('Fetch error:', error);
	process.exit(1);
}

if (!leads || leads.length === 0) {
	console.log('Aucun lead en prod.');
	process.exit(0);
}

console.log(`Total leads à re-scorer : ${leads.length}`);
console.log(`Mode : ${dry ? 'DRY-RUN' : 'WRITE'}\n`);

let changed = 0;
const distribution = {};
const samples = [];

for (const lead of leads) {
	// On ne charge pas intelligenceSignals ici : le re-scoring complet (avec signaux Veille)
	// est fait par recompute-score.ts en runtime. Ce script ne fixe que la bimodalité.
	const result = calculerScore({
		canton: lead.canton,
		description: lead.description,
		raison_sociale: lead.raison_sociale,
		secteur_detecte: lead.secteur_detecte,
		source: lead.source,
		date_publication: lead.date_publication,
		telephone: lead.telephone,
		montant: lead.montant ? Number(lead.montant) : null
	});

	const oldScore = lead.score_pertinence;
	const newScore = result.total;
	distribution[newScore] = (distribution[newScore] || 0) + 1;

	if (oldScore !== newScore) changed++;
	if (samples.length < 8) {
		samples.push({ id: lead.id.slice(0, 8), src: lead.source, old: oldScore, new: newScore });
	}

	if (!dry && oldScore !== newScore) {
		const { error: upErr } = await c
			.from('prospect_leads')
			.update({ score_pertinence: newScore, date_modification: new Date().toISOString() })
			.eq('id', lead.id);
		if (upErr) {
			console.error(`Update fail ${lead.id}:`, upErr.message);
		}
	}
}

console.log('Échantillon (8 premiers) :');
for (const s of samples) {
	console.log(`  ${s.id}  src=${s.src.padEnd(8)} old=${s.old} → new=${s.new}`);
}

console.log('\nNouvelle distribution scores :');
for (const score of Object.keys(distribution).sort((a, b) => Number(a) - Number(b))) {
	const n = distribution[score];
	const bar = '█'.repeat(Math.round(n / 2));
	console.log(`  score=${String(score).padStart(2)} : ${String(n).padStart(3)}  ${bar}`);
}

console.log(`\nTotal modifiés : ${changed}/${leads.length}`);
if (dry) console.log('(DRY-RUN : aucun UPDATE écrit)');
