// Mint une session de test SANS OTP via le service_role (admin.generateLink ne
// déclenche aucun email). Produit un storageState Playwright pour localhost.
// Usage : node tests/mint-session.mjs [email] [origin]
//   email  : défaut pascal@filmpro.ch (doit être dans l'allowlist)
//   origin : défaut http://localhost:5173
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// --- parse .env.local en gérant les `\n` littéraux (feedback_env_local_escaped_newlines)
function loadEnv(path) {
	const out = {};
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		v = v.replace(/(\\n|\s)+$/, ''); // `\n` littéral DANS les guillemets + espaces résiduels
		out[m[1]] = v;
	}
	return out;
}

const env = loadEnv(new URL('../.env.local', import.meta.url).pathname);
const email = process.argv[2] || 'pascal@filmpro.ch';
const origin = process.argv[3] || 'http://localhost:5173';
const host = new URL(origin).hostname;

const URL_ = env.PUBLIC_SUPABASE_URL;
const ANON = env.PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error('env Supabase manquant');

const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

// 1) generateLink magiclink (n'envoie PAS d'email, ne consomme pas le quota OTP)
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (linkErr) throw linkErr;
const tokenHash = link?.properties?.hashed_token;
if (!tokenHash) throw new Error('hashed_token absent : ' + JSON.stringify(link));

// 2) verifyOtp → session (access_token + refresh_token)
const anon = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: verify, error: verErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
if (verErr) throw verErr;
const session = verify?.session;
if (!session) throw new Error('session absente après verifyOtp');

// 3) createServerClient (mêmes options que l'app) → setSession capture les cookies
const jar = new Map();
const ssr = createServerClient(URL_, ANON, {
	cookies: {
		getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
		setAll: (toSet) => toSet.forEach(({ name, value }) => jar.set(name, value))
	}
});
await ssr.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });

// 4) storageState Playwright (domain = host local) + login_at frais
const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
const cookies = [...jar.entries()].map(([name, value]) => ({
	name, value, domain: host, path: '/', expires, httpOnly: false, secure: false, sameSite: 'Lax'
}));
cookies.push({ name: 'login_at', value: String(Date.now()), domain: host, path: '/', expires, httpOnly: false, secure: false, sameSite: 'Lax' });

const out = { cookies, origins: [] };
const dest = new URL('./.auth.local.json', import.meta.url).pathname;
writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`OK session ${email} → ${dest} (${cookies.length} cookies, host=${host})`);
console.log('cookies:', cookies.map((c) => c.name).join(', '));
