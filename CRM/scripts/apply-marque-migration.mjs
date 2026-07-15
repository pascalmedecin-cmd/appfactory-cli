/**
 * One-shot : applique la migration Atelier 209 Run 2 sur la base PROD :
 *   20260715120000_marque_cloisonnement.sql
 * (colonne `marque` DEFAULT 'filmpro' sur 12 tables + CHECK + index, cles composites
 * (id,marque), unicites metier prefixees par marque, FK composites de coherence, DROP des
 * FK simples redondantes, RPC reecrites transfer_lead_to_crm/mark_lead_for_contact/
 * entreprises_lookup_by_name).
 *
 * Usage : node scripts/apply-marque-migration.mjs
 * Lit DATABASE_URL_ADMIN depuis .env.local. Migration idempotente + DEFAULT filmpro =
 * NON-REGRESSION (toutes les lignes legacy restent FilmPro). Le fichier entier est envoye
 * en UNE requete simple = transaction implicite unique (tout ou rien). MCP Supabase etant
 * read-only, c'est la voie d'application (cf. feedback_supabase_migration_via_pg_lib).
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

const TABLES = [
	'prospect_leads', 'entreprises', 'contacts', 'opportunites', 'signaux_affaires',
	'campagnes', 'recherches_sauvegardees', 'prospect_lead_campagnes', 'campagne_groupes',
	'campagne_validation_liens', 'prospect_photos', 'prospect_visits'
];

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
	// --- Pre-check : etat de depart (colonne deja presente ?) ---
	const pre = await client.query(
		"SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='public' AND column_name='marque' AND table_name = ANY($1)",
		[TABLES]
	);
	console.log(`Pre-check : colonnes marque presentes avant application : ${pre.rows[0].n}/12`);

	// --- Application (transaction implicite unique) ---
	const sql = fs.readFileSync(new URL('../supabase/migrations/20260715120000_marque_cloisonnement.sql', import.meta.url), 'utf-8');
	process.stdout.write('\n=== application 20260715120000_marque_cloisonnement.sql ===\n');
	await client.query(sql);
	console.log('OK (migration appliquee)');

	// --- Verifications ---
	console.log('\n--- Verifications ---');
	const cols = await client.query(
		"SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='public' AND column_name='marque' AND table_name = ANY($1)",
		[TABLES]
	);
	console.log(`colonnes marque (attendu 12) : ${cols.rows[0].n}`);

	const chk = await client.query("SELECT count(*)::int n FROM pg_constraint WHERE conname LIKE '%\\_marque\\_chk'");
	console.log(`CHECK marque IN (filmpro,led) (attendu 12) : ${chk.rows[0].n}`);

	const uniq = await client.query(
		"SELECT count(*)::int n FROM pg_constraint WHERE conname IN ('prospect_leads_id_marque_key','campagnes_id_marque_key')"
	);
	console.log(`cles composites (id,marque) (attendu 2) : ${uniq.rows[0].n}`);

	const fkComp = await client.query(
		"SELECT count(*)::int n FROM pg_constraint WHERE conname IN ('prospect_lead_campagnes_lead_marque_fk','prospect_lead_campagnes_campagne_marque_fk','campagne_groupes_campagne_marque_fk')"
	);
	console.log(`FK composites de coherence (attendu 3) : ${fkComp.rows[0].n}`);

	const fkSimple = await client.query(
		"SELECT count(*)::int n FROM pg_constraint WHERE conname IN ('prospect_lead_campagnes_campagne_id_fkey','prospect_lead_campagnes_lead_id_fkey','campagne_groupes_campagne_id_fkey')"
	);
	console.log(`FK simples redondantes supprimees (attendu 0) : ${fkSimple.rows[0].n}`);

	const lookup = await client.query(
		"SELECT pg_get_function_arguments(oid) args FROM pg_proc WHERE proname='entreprises_lookup_by_name'"
	);
	console.log(`entreprises_lookup_by_name args : ${lookup.rows[0]?.args}`);

	const rpc = await client.query(
		"SELECT count(*)::int n FROM pg_proc WHERE proname IN ('transfer_lead_to_crm','mark_lead_for_contact')"
	);
	console.log(`RPC transfer/mark presentes (attendu 2) : ${rpc.rows[0].n}`);

	// --- Preuve de NON-REGRESSION : 100% des lignes existantes = filmpro ---
	console.log('\n--- Non-regression (toutes les lignes legacy = filmpro) ---');
	for (const t of ['prospect_leads', 'entreprises', 'contacts', 'campagnes', 'opportunites']) {
		const g = await client.query(`SELECT marque, count(*)::int n FROM public.${t} GROUP BY marque ORDER BY marque`);
		const parts = g.rows.map((r) => `${r.marque}=${r.n}`).join(' ');
		const nonFilmpro = g.rows.filter((r) => r.marque !== 'filmpro').reduce((s, r) => s + r.n, 0);
		console.log(`  ${t.padEnd(14)} : ${parts || '(vide)'}  ${nonFilmpro === 0 ? 'OK' : 'ALERTE non-filmpro=' + nonFilmpro}`);
	}
} finally {
	await client.end();
}
