import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { Database } from '$lib/database.types';

export function createSupabaseServerClient(cookies: Cookies) {
	return createServerClient<Database>(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}

/**
 * Client Supabase avec flowType implicit — pour signInWithOtp uniquement.
 * createServerClient force flowType:'pkce' (hardcodé dans @supabase/ssr),
 * ce qui génère des liens ?code= incompatibles avec mobile Safari
 * (le cookie code_verifier se perd entre Mail.app et le navigateur).
 * Ce client génère des liens ?token_hash= qui fonctionnent sans cookie.
 */
export function createSupabaseOtpClient() {
	return createClient<Database>(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
		auth: {
			flowType: 'implicit',
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false
		}
	});
}

/**
 * Client Supabase avec service role key — bypass RLS.
 * Réservé aux crons et opérations serveur sans session utilisateur.
 */
export function createSupabaseServiceClient() {
	const url = env.PUBLIC_SUPABASE_URL;
	const key = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY ou PUBLIC_SUPABASE_URL manquant');
	}
	return createClient<Database>(url, key);
}
