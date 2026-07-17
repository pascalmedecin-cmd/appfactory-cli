// Bascule ff_ui_coherence (cohérence UI b/c/d) sur un user de la base jetable LOCALE.
// getUser() lit la metadata LIVE (feedback_flag_qa_getuser_live_metadata) : flipper la DB entre
// deux captures suffit, pas besoin de re-minter. Réutilisable pour toute la QA avant/après b/c/d.
//
// Prérequis : `supabase start` + session mintée (mint-session-local.mjs).
// Usage : node tests/_set-coherence-flag-local.mjs <on|off> [email]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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
const mode = (process.argv[2] || '').toLowerCase();
const email = process.argv[3] || 'pascal@filmpro.ch';
if (mode !== 'on' && mode !== 'off') throw new Error('usage: node _set-coherence-flag-local.mjs <on|off> [email]');

const URL_ = env.PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
// GARDE-FOU DUR : base locale uniquement (jamais la prod).
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
	throw new Error(`REFUS : cible non-locale ${URL_}. Réservé à la base jetable locale.`);
}

const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) throw lErr;
const u = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
if (!u) throw new Error(`user ${email} absent (mint d'abord)`);

// updateUserById FUSIONNE app_metadata (ne remplace pas) : `delete` ne retire rien. Pour désactiver,
// on met la clé à null → GoTrue la supprime, et readFeatureFlags (=== true) la lit comme false de toute façon.
const meta = { ...(u.app_metadata || {}) };
meta.ff_ui_coherence = mode === 'on' ? true : null;
const { error: uErr } = await admin.auth.admin.updateUserById(u.id, { app_metadata: meta });
if (uErr) throw uErr;
console.log(`ff_ui_coherence = ${mode.toUpperCase()} sur ${email} (metadata live)`);
