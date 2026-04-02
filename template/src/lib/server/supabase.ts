import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
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
