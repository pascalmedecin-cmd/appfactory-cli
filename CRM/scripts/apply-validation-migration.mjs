/**
 * One-shot : applique la migration « validation externe des prospects d'une campagne » sur la
 * base PROD :
 *  - 20260702120000_validation_externe_campagne.sql (table campagne_validation_liens + token_hash
 *    SHA-256, index partiel unique « un seul lien actif par campagne » WHERE revoked_at IS NULL,
 *    colonnes validation_statut / validation_at sur prospect_lead_campagnes, RLS authenticated).
 * Usage : node scripts/apply-validation-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS).
 * MCP Supabase étant read-only, c'est la voie d'application (cf. feedback_supabase_migration_via_pg_lib).
 * À appliquer AVANT le push du code (les routes publiques + la page campagne lisent ces objets).
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

const file = '../supabase/migrations/20260702120000_validation_externe_campagne.sql';

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf-8');
	process.stdout.write(`\n=== ${file.split('/').pop()} ===\n`);
	await client.query(sql);
	console.log('OK');

	// Vérifications
	const t = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='campagne_validation_liens'");
	console.log('table campagne_validation_liens existe :', t.rowCount === 1);
	const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='prospect_lead_campagnes' AND column_name IN ('validation_statut','validation_at') ORDER BY column_name");
	console.log('colonnes validation sur le lien N-N :', cols.rows.map((r) => r.column_name).join(', '), '(attendu validation_at, validation_statut)');
	const idx = await client.query("SELECT indexdef FROM pg_indexes WHERE indexname='uniq_cvl_actif_par_campagne'");
	console.log('index partiel « 1 lien actif/campagne » présent :', idx.rowCount === 1);
	if (idx.rowCount === 1) console.log('  ', idx.rows[0].indexdef);
	const pol = await client.query("SELECT count(*)::int AS n FROM pg_policies WHERE tablename='campagne_validation_liens'");
	console.log('policies RLS campagne_validation_liens (attendu 1, authenticated) :', pol.rows[0]?.n);
	const chk = await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid='campagne_validation_liens'::regclass AND contype='c'");
	console.log('CHECK token_hash (hex 64) présent :', (chk.rows[0]?.n ?? 0) >= 1);
} finally {
	await client.end();
}
