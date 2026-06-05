/**
 * QA tolérance zéro §7 (RLS réelle, pas les mocks Vitest) pour les 3 tables Découpe.
 * Vérifie sur la VRAIE base Postgres (cf. feedback_rls_mocks_insufficient_S99) :
 *  1. RLS ACTIVÉE sur decoupe_produits / decoupe_chantiers / decoupe_vitres ;
 *  2. policies = design « mono-tenant plat » (TO authenticated) ;
 *  3. anon (non authentifié) : SELECT masqué + INSERT refusé (la vraie frontière) ;
 *  4. authenticated : SELECT autorisé (plat, pas sur-restrictif).
 * Seed [RLS-CHECK] via service_role puis cleanup. Lancer depuis CRM/ :
 *   node scripts/_decoupe_rls_check.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

function loadEnv() {
	const out = {};
	for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		out[m[1]] = v.replace(/(\\n|\s)+$/, '');
	}
	return out;
}
const env = loadEnv();
const URL_ = env.PUBLIC_SUPABASE_URL, ANON = env.PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const TABLES = ['decoupe_produits', 'decoupe_chantiers', 'decoupe_vitres'];

let fail = 0;
const ok = (c, msg) => { console.log(`${c ? '\x1b[32mOK\x1b[0m  ' : '\x1b[31mECHEC\x1b[0m'} ${msg}`); if (!c) fail = 1; };

// --- 1+2. Introspection (RLS activée + policies) ---------------------------------------------
const client = new pg.Client({ connectionString: env.DATABASE_URL_ADMIN });
await client.connect();
const { rows: rls } = await client.query(
	`SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY($1) AND relkind='r'`, [TABLES]
);
for (const t of TABLES) {
	const r = rls.find((x) => x.relname === t);
	ok(r && r.relrowsecurity === true, `RLS activée sur ${t} (relrowsecurity=${r?.relrowsecurity})`);
}
const { rows: pol } = await client.query(
	`SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename = ANY($1) ORDER BY tablename`, [TABLES]
);
console.log('\nPolicies :');
for (const p of pol) console.log(`  ${p.tablename} · ${p.policyname} · roles=${p.roles} · cmd=${p.cmd} · qual=${p.qual}`);
for (const t of TABLES) {
	const ps = pol.filter((p) => p.tablename === t);
	ok(ps.length > 0, `${t} a ≥1 policy`);
	// design plat : aucune policy ne doit cibler le rôle public/anon (sinon anon passerait).
	const exposesAnon = ps.some((p) => /\{?(public|anon)\}?/.test(String(p.roles)));
	ok(!exposesAnon, `${t} : aucune policy TO public/anon (anon bloqué par défaut)`);
}
await client.end();

// --- seed via service_role (bypass RLS) ------------------------------------------------------
const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: prod } = await admin.from('decoupe_produits')
	.insert({ reference: '[RLS-CHECK]', nom: 'RLS check', famille: 'solaire', fabricant: 'x', laizes_mm: [1520], orientation_imposee: false, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 })
	.select('id').single();
const { data: chan } = await admin.from('decoupe_chantiers').insert({ nom: '[RLS-CHECK]', statut: 'en_saisie' }).select('id').single();

try {
	// --- 3. anon : SELECT masqué + INSERT refusé ---------------------------------------------
	const anon = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
	const { data: aSel } = await anon.from('decoupe_chantiers').select('id').eq('id', chan.id);
	ok((aSel ?? []).length === 0, `anon SELECT decoupe_chantiers masqué (vu ${(aSel ?? []).length} ligne(s), attendu 0)`);
	const { error: aIns } = await anon.from('decoupe_chantiers').insert({ nom: '[RLS-CHECK-ANON]', statut: 'en_saisie' });
	ok(Boolean(aIns), `anon INSERT decoupe_chantiers refusé (${aIns ? 'erreur RLS' : 'AUCUNE erreur = FUITE'})`);

	// --- 4. authenticated : SELECT autorisé (plat) -------------------------------------------
	const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'pascal@filmpro.ch' });
	const authed = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
	await authed.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
	const { data: uSel } = await authed.from('decoupe_chantiers').select('id').eq('id', chan.id);
	ok((uSel ?? []).length === 1, `authenticated SELECT decoupe_chantiers autorisé (vu ${(uSel ?? []).length}, attendu 1)`);
	const { data: uProd } = await authed.from('decoupe_produits').select('id').eq('id', prod.id);
	ok((uProd ?? []).length === 1, `authenticated SELECT decoupe_produits autorisé (vu ${(uProd ?? []).length}, attendu 1)`);
} finally {
	await admin.from('decoupe_chantiers').delete().eq('id', chan.id);
	await admin.from('decoupe_chantiers').delete().eq('nom', '[RLS-CHECK-ANON]');
	await admin.from('decoupe_produits').delete().eq('id', prod.id);
}

console.log(`\n${fail ? '\x1b[31mRLS : ECHEC\x1b[0m' : '\x1b[32mRLS : OK (mono-tenant plat : anon bloqué, authenticated autorisé)\x1b[0m'}`);
process.exit(fail);
