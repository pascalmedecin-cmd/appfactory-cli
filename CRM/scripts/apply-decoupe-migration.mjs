/**
 * One-shot : applique la migration Découpe Films (3 tables) sur la base prod + vérifie.
 * Usage : node scripts/apply-decoupe-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Migration idempotente (rejouable).
 * Voie de secours pg lib (mémoire feedback_supabase_migration_via_pg_lib.md) :
 * MCP Supabase en read-only → pg.Client simple query.
 * Tables NOUVELLES + RLS + bornes CHECK defense-in-depth (audit sécu 2026-06-05).
 * Le flag ffDecoupe reste OFF → aucun accès utilisateur exposé.
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

const migFile = '../supabase/migrations/20260605000001_decoupe_films.sql';
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	const sql = fs.readFileSync(new URL(migFile, import.meta.url), 'utf-8');
	process.stdout.write(`\n=== APPLY ${migFile.split('/').pop()} ===\n`);
	await client.query(sql);
	console.log('APPLY OK');

	console.log('\n=== VÉRIFICATIONS SCHÉMA ===');
	for (const t of ['decoupe_produits', 'decoupe_chantiers', 'decoupe_vitres']) {
		const tbl = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1", [t]);
		const rls = await client.query('SELECT relrowsecurity FROM pg_class WHERE relname=$1', [t]);
		const pol = await client.query('SELECT policyname FROM pg_policies WHERE tablename=$1', [t]);
		console.log(`${t.padEnd(18)} existe=${tbl.rowCount === 1} RLS=${rls.rows[0]?.relrowsecurity === true} policy=${pol.rows.map((r) => r.policyname).join(',') || '—'}`);
	}
	const fab = await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='decoupe_produits' AND column_name='fabricant'");
	console.log('colonne fabricant :', fab.rowCount === 1);
	const grant = await client.query("SELECT has_table_privilege('authenticated','public.decoupe_chantiers','INSERT') AS ins, has_table_privilege('authenticated','public.decoupe_chantiers','SELECT') AS sel");
	console.log('authenticated INSERT/SELECT (chantiers) :', grant.rows[0]?.ins, grant.rows[0]?.sel);

	console.log('\n=== PROBES BORNES CHECK (defense-in-depth) ===');
	async function expectReject(label, q, params = []) {
		try {
			await client.query('BEGIN');
			await client.query(q, params);
			await client.query('ROLLBACK');
			console.log(`[FAIL] ${label} : aurait dû être rejeté`);
		} catch (e) {
			await client.query('ROLLBACK');
			console.log(`[OK] ${label} rejeté (${e.code})`);
		}
	}
	async function expectAccept(label, q, params = []) {
		try {
			await client.query('BEGIN');
			await client.query(q, params);
			await client.query('ROLLBACK');
			console.log(`[OK] ${label} accepté`);
		} catch (e) {
			await client.query('ROLLBACK');
			console.log(`[FAIL] ${label} : aurait dû être accepté (${e.code} ${e.message})`);
		}
	}
	// Produit valide / invalides (bornes laizes & marge)
	const PV = (l, m = 0) => `INSERT INTO decoupe_produits (reference,nom,famille,laizes_mm,marge_pose_mm) VALUES ('probe-${Math.floor(l[0])}-${m}','p','solaire',ARRAY[${l.join(',')}]::int[],${m})`;
	await expectAccept('produit laize 1830 / marge 50', PV([1830], 50));
	await expectReject('produit laize 21000 (>20000)', PV([21000]));
	await expectReject('produit marge 60000 (>50000)', PV([1830], 60000));
	await expectReject('produit 0 laize (array vide)', PV([]));
	// Vitre : on a besoin d'un chantier + produit transitoires
	await client.query('BEGIN');
	const c = await client.query("INSERT INTO decoupe_chantiers (nom) VALUES ('probe') RETURNING id");
	const p = await client.query("INSERT INTO decoupe_produits (reference,nom,famille,laizes_mm) VALUES ('probe-vitre','p','solaire',ARRAY[1830]::int[]) RETURNING id");
	const cid = c.rows[0].id, pid = p.rows[0].id;
	const VI = (w, h, q) => `INSERT INTO decoupe_vitres (chantier_id,produit_id,largeur_mm,hauteur_mm,quantite) VALUES ('${cid}','${pid}',${w},${h},${q})`;
	async function sub(label, q, reject) {
		try { await client.query('SAVEPOINT s'); await client.query(q); await client.query('RELEASE SAVEPOINT s'); console.log(`[${reject ? 'FAIL' : 'OK'}] ${label} ${reject ? 'aurait dû rejeter' : 'accepté'}`); }
		catch (e) { await client.query('ROLLBACK TO SAVEPOINT s'); console.log(`[${reject ? 'OK' : 'FAIL'}] ${label} ${reject ? 'rejeté' : 'aurait dû accepter'} (${e.code})`); }
	}
	await sub('vitre 1200x800 q4', VI(1200, 800, 4), false);
	await sub('vitre quantite 20000 (>10000)', VI(1200, 800, 20000), true);
	await sub('vitre largeur 60000 (>50000)', VI(60000, 800, 1), true);
	await client.query('ROLLBACK'); // rien de persistant

	console.log('\nMigration Découpe appliquée + bornes vérifiées. Flag ffDecoupe OFF (rien exposé).');
} finally {
	await client.end();
}
