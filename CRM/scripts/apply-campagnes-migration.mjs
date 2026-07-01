/**
 * One-shot : applique la migration du module Campagnes (Vague 3.2) sur la base prod.
 * Usage : node scripts/apply-campagnes-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Idempotent (CREATE TABLE/INDEX IF NOT EXISTS,
 * DROP POLICY IF EXISTS). MCP Supabase étant read-only, c'est la voie d'application.
 * Après application : régénérer database.types.ts (supabase gen types, rediriger stderr).
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

const file = '../supabase/migrations/20260622000001_campagnes_module.sql';

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf-8');
	process.stdout.write(`\n=== ${file.split('/').pop()} ===\n`);
	await client.query(sql);
	console.log('OK');

	// Vérifications
	const t1 = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='campagnes'");
	console.log('table campagnes existe :', t1.rowCount === 1);
	const t2 = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prospect_lead_campagnes'");
	console.log('table prospect_lead_campagnes existe :', t2.rowCount === 1);
	const c1 = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='campagnes' AND column_name='couleur'");
	console.log('colonne couleur existe :', c1.rowCount === 1);
	const fk = await client.query("SELECT 1 FROM information_schema.table_constraints WHERE table_name='prospect_lead_campagnes' AND constraint_type='FOREIGN KEY'");
	console.log('FK de la jonction présentes :', fk.rowCount >= 1);
	const pol = await client.query("SELECT count(*)::int AS n FROM pg_policies WHERE tablename IN ('campagnes','prospect_lead_campagnes')");
	console.log('policies RLS (attendu 2) :', pol.rows[0]?.n);
} finally {
	await client.end();
}
