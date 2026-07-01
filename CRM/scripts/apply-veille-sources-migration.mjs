/**
 * One-shot : applique la migration veille_sources (table + seed 238) sur la base prod.
 * Usage : node scripts/apply-veille-sources-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Idempotent (CREATE TABLE IF NOT EXISTS,
 * ON CONFLICT (hostname) DO NOTHING, DROP POLICY/TRIGGER IF EXISTS).
 *
 * Vérifications post-application : structure (table/RLS/policy/trigger), count fidèle
 * au SQL source (aucune ligne perdue/écrasée), distribution régime, spot-checks
 * anti-dérive (glassforeurope.com présent / glass-for-europe.eu absent ; flags).
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

const migPath = new URL('../supabase/migrations/20260624000001_veille_sources.sql', import.meta.url);
const sql = fs.readFileSync(migPath, 'utf-8');

// Référence : nombre de lignes VALUES dans le SQL source (lignes "  ('host', ...").
const expectedRows = (sql.match(/^\s{2}\('/gm) ?? []).length;

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	process.stdout.write('=== Application 20260624000001_veille_sources.sql ===\n');
	await client.query(sql);
	console.log('OK (idempotent)');

	const tbl = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='veille_sources'");
	console.log('table veille_sources existe :', tbl.rowCount === 1);

	const rls = await client.query("SELECT relrowsecurity FROM pg_class WHERE relname='veille_sources'");
	console.log('RLS active :', rls.rows[0]?.relrowsecurity === true);

	const pol = await client.query("SELECT policyname FROM pg_policies WHERE tablename='veille_sources'");
	console.log('policies :', pol.rows.map((r) => r.policyname).join(', ') || '(aucune)');

	const trg = await client.query("SELECT 1 FROM pg_trigger WHERE tgname='veille_sources_updated_at'");
	console.log('trigger updated_at :', trg.rowCount === 1);

	const idx = await client.query("SELECT indexname FROM pg_indexes WHERE tablename='veille_sources' ORDER BY indexname");
	console.log('index :', idx.rows.map((r) => r.indexname).join(', '));

	const cnt = await client.query('SELECT count(*)::int AS n FROM veille_sources');
	const dbCount = cnt.rows[0].n;
	console.log(`count DB : ${dbCount}  | attendu (SQL source) : ${expectedRows}  | match : ${dbCount === expectedRows}`);

	const reg = await client.query("SELECT regime, count(*)::int AS n FROM veille_sources GROUP BY regime ORDER BY regime");
	console.log('régime :', reg.rows.map((r) => `${r.regime}=${r.n}`).join(', '));

	const flags = await client.query("SELECT count(*) FILTER (WHERE in_denylist)::int AS deny, count(*) FILTER (WHERE strict_verbatim)::int AS sv, count(*) FILTER (WHERE is_advocacy)::int AS adv, count(*) FILTER (WHERE is_preprint)::int AS pre, count(*) FILTER (WHERE NOT active)::int AS inactive FROM veille_sources");
	console.log('flags :', JSON.stringify(flags.rows[0]));

	// Spot-checks anti-dérive (cf. étape 4 : 120→238, glass-for-europe.eu mort retiré).
	const spot = await client.query(
		"SELECT hostname, tier, regime, in_denylist, is_advocacy, is_preprint FROM veille_sources WHERE hostname = ANY($1::text[]) ORDER BY hostname",
		[['glassforeurope.com', 'glass-for-europe.eu', 'apfv.org', 'arxiv.org', 'coast-smartfilm.com']]
	);
	const byHost = Object.fromEntries(spot.rows.map((r) => [r.hostname, r]));
	console.log('\n--- spot-checks ---');
	console.log('glassforeurope.com présent (corrigé) :', !!byHost['glassforeurope.com']);
	console.log('glass-for-europe.eu absent (mort retiré) :', !byHost['glass-for-europe.eu']);
	console.log('apfv.org = trusted_advocacy + is_advocacy :', byHost['apfv.org']?.regime === 'trusted_advocacy' && byHost['apfv.org']?.is_advocacy === true);
	console.log('arxiv.org = strict + is_preprint :', byHost['arxiv.org']?.regime === 'strict' && byHost['arxiv.org']?.is_preprint === true);
	console.log('coast-smartfilm.com in_denylist :', byHost['coast-smartfilm.com']?.in_denylist === true);
} finally {
	await client.end();
}
