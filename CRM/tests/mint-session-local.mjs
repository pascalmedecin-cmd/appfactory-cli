// Mint une session de test PREMIUM contre la base jetable LOCALE (Colima/supabase start).
// Différence avec mint-session.mjs : lit `.env.development.local` (base locale 127.0.0.1:54321),
// PAS `.env.local` (qui pointe la prod) - sinon on minerait une session contre la prod. Pose aussi
// les feature flags premium (ff_crm_listes_v2 + ff_decoupe) sur pascal@filmpro.ch AVANT de minter,
// pour que le JWT signé les porte (directive Pascal : preview premium avant le sign-off).
//
// Prérequis : `supabase start` (base locale up). Usage : node tests/mint-session-local.mjs [email] [origin]
// Produit tests/.auth.local.json (storageState Playwright, host localhost) - gitignoré.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const FLAGS = { ff_crm_listes_v2: true, ff_decoupe: true };

// --- parse .env.development.local en gérant les `\n` littéraux (feedback_env_local_escaped_newlines)
function loadEnv(path) {
	const out = {};
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		v = v.replace(/(\\n|\s)+$/, '');
		out[m[1]] = v;
	}
	return out;
}

const env = loadEnv(new URL('../.env.development.local', import.meta.url).pathname);
const email = process.argv[2] || 'pascal@filmpro.ch';
const origin = process.argv[3] || 'http://localhost:5173';
const host = new URL(origin).hostname;

const URL_ = env.PUBLIC_SUPABASE_URL;
const ANON = env.PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error('env Supabase manquant dans .env.development.local');

// GARDE-FOU DUR : ne mint QUE contre une base locale. Un mint contre la prod écrirait des flags
// et créerait/modifierait un compte réel (fmflvjubjtpidvxwhqab.supabase.co).
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
	throw new Error(`REFUS : cible non-locale ${URL_}. Ce mint est réservé à la base jetable locale.`);
}

const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

// 0) Garantir que le user existe avec les flags premium (la base jetable est vide d'auth.users).
const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) throw lErr;
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (existing) {
	const meta = { ...(existing.app_metadata || {}), ...FLAGS };
	const { error: uErr } = await admin.auth.admin.updateUserById(existing.id, { app_metadata: meta });
	if (uErr) throw uErr;
	console.log(`user ${email} déjà présent -> flags premium mis à jour`);
} else {
	const { error: cErr } = await admin.auth.admin.createUser({
		email,
		email_confirm: true,
		app_metadata: { ...FLAGS }
	});
	if (cErr) throw cErr;
	console.log(`user ${email} créé (email_confirm) avec flags premium`);
}

// 1) generateLink magiclink (n'envoie PAS d'email, ne consomme pas de quota OTP) -> hashed_token.
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (linkErr) throw linkErr;
const tokenHash = link?.properties?.hashed_token;
if (!tokenHash) throw new Error('hashed_token absent : ' + JSON.stringify(link));

// 2) verifyOtp -> session (le JWT porte app_metadata = flags posés ci-dessus).
const anon = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: verify, error: verErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
if (verErr) throw verErr;
const session = verify?.session;
if (!session) throw new Error('session absente après verifyOtp');

// 3) createServerClient (mêmes options que l'app) -> setSession capture les cookies.
const jar = new Map();
const ssr = createServerClient(URL_, ANON, {
	cookies: {
		getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
		setAll: (toSet) => toSet.forEach(({ name, value }) => jar.set(name, value))
	}
});
await ssr.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });

// 4) storageState Playwright (domain = host local) + login_at frais.
const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
const cookies = [...jar.entries()].map(([name, value]) => ({
	name, value, domain: host, path: '/', expires, httpOnly: false, secure: false, sameSite: 'Lax'
}));
cookies.push({ name: 'login_at', value: String(Date.now()), domain: host, path: '/', expires, httpOnly: false, secure: false, sameSite: 'Lax' });

const out = { cookies, origins: [] };
const dest = new URL('./.auth.local.json', import.meta.url).pathname;
writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`OK session PREMIUM ${email} -> ${dest} (${cookies.length} cookies, host=${host})`);
console.log('flags:', JSON.stringify(FLAGS));
