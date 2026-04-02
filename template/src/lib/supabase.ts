import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

export function createSupabaseBrowserClient() {
	return createBrowserClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!);
}
