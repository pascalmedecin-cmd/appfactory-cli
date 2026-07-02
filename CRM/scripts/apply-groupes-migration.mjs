/**
 * One-shot : applique les migrations du 2026-07-02 sur la base prod :
 *  - 20260702000000_recherches_temperatures_rattrapage.sql (no-op prod attendu : la colonne
 *    existe déjà ; répare seulement la reproductibilité locale),
 *  - 20260702000001_campagne_groupes_google_types.sql (google_types + backfill, table
 *    campagne_groupes, groupe_id + FK composite sur prospect_lead_campagnes, RLS).
 * Usage : node scripts/apply-groupes-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Idempotent (IF NOT EXISTS / backfill sur NULL
 * seulement / DO $$ guard sur la contrainte). MCP Supabase étant read-only, c'est la voie
 * d'application (cf. feedback_supabase_migration_via_pg_lib).
 * Après application : le code peut être poussé (les selects lisent google_types/groupe_id).
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

const files = [
	'../supabase/migrations/20260702000000_recherches_temperatures_rattrapage.sql',
	'../supabase/migrations/20260702000001_campagne_groupes_google_types.sql'
];

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	for (const file of files) {
		const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf-8');
		process.stdout.write(`\n=== ${file.split('/').pop()} ===\n`);
		await client.query(sql);
		console.log('OK');
	}

	// Vérifications
	const t1 = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='campagne_groupes'");
	console.log('table campagne_groupes existe :', t1.rowCount === 1);
	const c1 = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='prospect_leads' AND column_name='google_types'");
	console.log('colonne prospect_leads.google_types existe :', c1.rowCount === 1);
	const c2 = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='prospect_lead_campagnes' AND column_name='groupe_id'");
	console.log('colonne prospect_lead_campagnes.groupe_id existe :', c2.rowCount === 1);
	const fk = await client.query("SELECT 1 FROM pg_constraint WHERE conname='plc_groupe_campagne_fk'");
	console.log('FK composite plc_groupe_campagne_fk présente :', fk.rowCount === 1);
	const pol = await client.query("SELECT count(*)::int AS n FROM pg_policies WHERE tablename='campagne_groupes'");
	console.log('policies RLS campagne_groupes (attendu 1) :', pol.rows[0]?.n);
	const bf = await client.query(
		"SELECT count(*) FILTER (WHERE google_types IS NOT NULL)::int AS remplis, count(*)::int AS total FROM prospect_leads WHERE source='google_places'"
	);
	console.log(`backfill google_types : ${bf.rows[0]?.remplis}/${bf.rows[0]?.total} leads google_places remplis`);
} finally {
	await client.end();
}
