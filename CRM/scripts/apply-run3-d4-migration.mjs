/**
 * One-shot : applique la migration Atelier 209 Run 3 (dette D4) sur la base PROD :
 *   20260716000001_prospect_leads_source_manuel.sql
 * (DROP/ADD du CHECK `prospect_leads_source_check` = 9 valeurs + 'manuel').
 *
 * Usage : node scripts/apply-run3-d4-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. ÉLARGISSEMENT PUR (aucune ligne existante invalidée)
 * → non-régression garantie. Fichier envoyé en une requête = transaction implicite unique.
 * MCP Supabase étant read-only, c'est la voie d'application (cf. feedback_supabase_migration_via_pg_lib).
 */
import fs from 'node:fs';
import pg from 'pg';

function loadEnv() {
	const text = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
	for (const line of text.split(/\r?\n/)) {
		if (!line || line.startsWith('#') || !line.includes('=')) continue;
		const [k, ...rest] = line.split('=');
		process.env[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '');
	}
}
loadEnv();

const url = process.env.DATABASE_URL_ADMIN;
if (!url) { console.error('DATABASE_URL_ADMIN absent'); process.exit(1); }

const sql = fs.readFileSync(new URL('../supabase/migrations/20260716000001_prospect_leads_source_manuel.sql', import.meta.url), 'utf-8');

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	// --- Pré-check : contrainte de départ + répartition des sources (non-régression) ---
	const before = await client.query(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'prospect_leads_source_check'`);
	console.log('AVANT :', before.rows[0]?.def ?? '(pas de contrainte)');
	const dist = await client.query(`SELECT source, count(*)::int AS n FROM prospect_leads GROUP BY source ORDER BY source`);
	console.log('Sources en prod :', dist.rows.map((r) => `${r.source}=${r.n}`).join(', ') || '(vide)');

	// --- Application ---
	await client.query(sql);

	// --- Post-check : 'manuel' présent, 9 valeurs conservées, 0 ligne invalidée ---
	const after = await client.query(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'prospect_leads_source_check'`);
	const def = after.rows[0]?.def ?? '';
	console.log('APRÈS :', def);
	const expect = ['zefix', 'simap', 'sitg', 'search_ch', 'fosc', 'regbl', 'minergie', 'lead_express', 'google_places', 'manuel'];
	const missing = expect.filter((v) => !def.includes(`'${v}'`));
	if (missing.length) { console.error('ÉCHEC : valeurs absentes du CHECK :', missing); process.exit(2); }

	// Toutes les lignes existantes satisfont-elles encore la contrainte ? (validation SQL réelle)
	const invalid = await client.query(`SELECT count(*)::int AS n FROM prospect_leads WHERE source <> ALL (ARRAY[${expect.map((v) => `'${v}'`).join(',')}]::text[])`);
	if (invalid.rows[0].n !== 0) { console.error('ÉCHEC : lignes hors CHECK :', invalid.rows[0].n); process.exit(3); }

	console.log(`OK - CHECK élargi (10 valeurs, 'manuel' inclus), 0 ligne invalidée. D4 appliquée en prod.`);
} finally {
	await client.end();
}
