/**
 * Active/désactive le feature flag ff_decoupe sur le compte de test (QA étape 3bis-b).
 * Usage : node scripts/_set-decoupe-flag.mjs [on|off] [email]
 * Merge app_metadata (préserve les autres flags). Utilitaire temporaire (préfixe _).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
	const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (!m) continue;
	let v = m[2].trim();
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
	env[m[1]] = v.replace(/\\n/g, '');
}
const on = (process.argv[2] || 'on') === 'on';
const email = process.argv[3] || 'pascal@filmpro.ch';
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) throw lErr;
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) throw new Error(`user ${email} introuvable`);

const meta = { ...(user.app_metadata || {}), ff_decoupe: on };
const { error: uErr } = await admin.auth.admin.updateUserById(user.id, { app_metadata: meta });
if (uErr) throw uErr;
console.log(`ff_decoupe=${on} pour ${email} (id=${user.id}). app_metadata.ff_decoupe =`, meta.ff_decoupe);
