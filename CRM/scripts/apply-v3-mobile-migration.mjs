/**
 * One-shot : applique la migration V3 mobile terrain sur la base prod + vérifie.
 * Usage : node scripts/apply-v3-mobile-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Migration idempotente (rejouable).
 * Voie de secours pg lib (mémoire feedback_supabase_migration_via_pg_lib.md) :
 * MCP Supabase en read-only, psql/pg absents en runtime → pg.Client simple query.
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

const migFile = '../supabase/migrations/20260531_001_v3_mobile_terrain.sql';

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	const sql = fs.readFileSync(new URL(migFile, import.meta.url), 'utf-8');
	process.stdout.write(`\n=== APPLY ${migFile.split('/').pop()} ===\n`);
	await client.query(sql);
	console.log('APPLY OK');

	console.log('\n=== VÉRIFICATIONS SCHÉMA ===');
	const cols = await client.query(
		"SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='prospect_visits' AND column_name IN ('resultat','note','lat','lng') ORDER BY column_name"
	);
	console.log('prospect_visits cols :', cols.rows.map((r) => `${r.column_name}(nullable=${r.is_nullable})`).join(', '));

	const cons = await client.query(
		"SELECT conname FROM pg_constraint WHERE conname LIKE 'prospect_visits_%chk' OR conname LIKE 'contact_suggestions_%' ORDER BY conname"
	);
	console.log('constraints :', cons.rows.map((r) => r.conname).join(', '));

	const tbl = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contact_suggestions'");
	console.log('contact_suggestions existe :', tbl.rowCount === 1);

	const pol = await client.query("SELECT policyname, roles FROM pg_policies WHERE tablename='contact_suggestions'");
	console.log('RLS policy :', JSON.stringify(pol.rows));

	const rls = await client.query("SELECT relrowsecurity FROM pg_class WHERE relname='contact_suggestions'");
	console.log('RLS enabled :', rls.rows[0]?.relrowsecurity === true);

	const grant = await client.query("SELECT has_table_privilege('authenticated','public.contact_suggestions','INSERT') AS ins, has_table_privilege('authenticated','public.contact_suggestions','SELECT') AS sel");
	console.log('authenticated INSERT/SELECT :', grant.rows[0]?.ins, grant.rows[0]?.sel);

	console.log('\n=== PROBES CONTRAINTES (attendus : REJET) ===');
	async function expectReject(label, q) {
		try {
			await client.query('BEGIN');
			await client.query(q);
			await client.query('ROLLBACK');
			console.log(`[FAIL] ${label} : aurait dû être rejeté`);
		} catch (e) {
			await client.query('ROLLBACK');
			console.log(`[OK] ${label} rejeté (${e.code})`);
		}
	}
	async function expectAccept(label, q) {
		try {
			await client.query('BEGIN');
			await client.query(q);
			await client.query('ROLLBACK');
			console.log(`[OK] ${label} accepté`);
		} catch (e) {
			await client.query('ROLLBACK');
			console.log(`[FAIL] ${label} : aurait dû être accepté (${e.code} ${e.message})`);
		}
	}

	// Une entreprise réelle pour les FK.
	const ent = await client.query("SELECT id FROM entreprises LIMIT 1");
	const entId = ent.rows[0]?.id ?? null;
	console.log('entreprise test :', entId);

	await expectReject('résultat hors enum', `INSERT INTO prospect_visits (entreprise_id, resultat) VALUES ('${entId}','foo')`);
	await expectAccept('visite sans GPS (lat/lng NULL)', `INSERT INTO prospect_visits (entreprise_id, resultat, note) VALUES ('${entId}','absent','test')`);
	await expectReject('demi-GPS (lat sans lng)', `INSERT INTO prospect_visits (entreprise_id, lat) VALUES ('${entId}', 46.5)`);
	if (entId) {
		await expectReject('suggestion sans identifiant', `INSERT INTO contact_suggestions (entreprise_id, notes) VALUES ('${entId}','rien')`);
		await expectAccept('suggestion avec nom', `INSERT INTO contact_suggestions (entreprise_id, nom) VALUES ('${entId}','Dupont')`);
		await expectReject('merged sans valide', `INSERT INTO contact_suggestions (entreprise_id, nom, merged_contact_id) VALUES ('${entId}','X','nope')`);
	}
} finally {
	await client.end();
}
