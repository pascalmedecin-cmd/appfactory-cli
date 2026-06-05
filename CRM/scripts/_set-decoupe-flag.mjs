/**
 * Active/désactive le feature flag ff_decoupe (app_metadata) sur les comptes FilmPro.
 *
 * Usage :
 *   node scripts/_set-decoupe-flag.mjs [on|off] [cible] [--dry-run]
 *
 *   cible :
 *     - un email précis           (ex: pascal@filmpro.ch)
 *     - un domaine commençant par @ (ex: @filmpro.ch  -> tous les comptes du domaine)
 *     - défaut : @filmpro.ch (Phase 5 livraison : tous les fondateurs)
 *
 *   --dry-run : lecture seule, affiche l'état courant sans rien écrire.
 *
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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const on = (positional[0] || 'on') === 'on';
const target = positional[1] || '@filmpro.ch';

const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lErr) throw lErr;

const isDomain = target.startsWith('@');
const users = list.users.filter((u) => {
	const e = u.email?.toLowerCase();
	if (!e) return false;
	return isDomain ? e.endsWith(target.toLowerCase()) : e === target.toLowerCase();
});

if (users.length === 0) throw new Error(`aucun compte ne matche la cible « ${target} »`);

console.log(`Cible « ${target} » -> ${users.length} compte(s). Mode : ${dryRun ? 'DRY-RUN (lecture seule)' : `ÉCRITURE ff_decoupe=${on}`}\n`);

for (const user of users) {
	const current = user.app_metadata?.ff_decoupe;
	if (dryRun) {
		console.log(`  ${user.email.padEnd(28)} ff_decoupe(actuel)=${current ?? '(absent)'}`);
		continue;
	}
	const meta = { ...(user.app_metadata || {}), ff_decoupe: on };
	const { error: uErr } = await admin.auth.admin.updateUserById(user.id, { app_metadata: meta });
	if (uErr) throw uErr;
	console.log(`  ${user.email.padEnd(28)} ff_decoupe ${current ?? '(absent)'} -> ${on}`);
}

console.log(`\n${dryRun ? 'Aucune écriture (dry-run).' : 'Terminé.'}`);
