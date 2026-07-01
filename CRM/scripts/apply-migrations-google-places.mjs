/**
 * One-shot : applique les 2 migrations de la source Google Places sur la base prod.
 * Usage : node scripts/apply-migrations-google-places.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Idempotent (CREATE TABLE IF NOT EXISTS,
 * CREATE OR REPLACE FUNCTION, DROP CONSTRAINT IF EXISTS).
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
	'../supabase/migrations/20260512000002_api_quota_log.sql',
	'../supabase/migrations/20260512000003_prospect_leads_source_google_places.sql',
];

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	for (const f of files) {
		const sql = fs.readFileSync(new URL(f, import.meta.url), 'utf-8');
		process.stdout.write(`\n=== ${f.split('/').pop()} ===\n`);
		await client.query(sql);
		console.log('OK');
	}
	// Vérifications
	const chk1 = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='api_quota_log'");
	console.log('api_quota_log existe :', chk1.rowCount === 1);
	const chk2 = await client.query("SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='api_quota_increment'");
	console.log('RPC api_quota_increment existe :', chk2.rowCount === 1);
	const chk3 = await client.query("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname='prospect_leads_source_check'");
	console.log('CHECK source contient google_places :', /google_places/.test(chk3.rows[0]?.def ?? ''));
	const chk4 = await client.query("SELECT calls FROM api_quota_log WHERE source='google_places' AND year_month=to_char(now(),'YYYY-MM')");
	console.log('Compteur google_places ce mois :', chk4.rows[0]?.calls ?? 0);
} finally {
	await client.end();
}
