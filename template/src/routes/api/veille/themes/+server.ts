import { json, type RequestEvent } from '@sveltejs/kit';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import {
	listAllThemes,
	createTheme,
	ThemeCreateSchema
} from '$lib/server/intelligence/themes-repository';

// GET : liste de tous les thèmes (auth requise — CRM interne FilmPro,
// tous les utilisateurs connectés peuvent lister, ALLOWED_DOMAINS gère la
// whitelist). Trié par sort_order asc.
export async function GET({ locals }: RequestEvent) {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const themes = await listAllThemes(locals.supabase);
		return json({ themes });
	} catch (err) {
		console.error('[veille/themes GET]', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'DB error' }, { status: 500 });
	}
}

// POST : créer un nouveau thème. Auth requise. Service client pour bypass RLS
// (table veille_themes a une policy SELECT public mais aucune policy INSERT,
// seul service_role peut écrire).
export async function POST({ request, locals }: RequestEvent) {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = ThemeCreateSchema.safeParse(payload);
	if (!parsed.success) {
		return json(
			{ error: 'Validation failed', issues: parsed.error.issues },
			{ status: 400 }
		);
	}

	try {
		const service = createSupabaseServiceClient();
		const theme = await createTheme(service, parsed.data);
		return json({ theme }, { status: 201 });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'unknown';
		// Conflit unique slug
		if (msg.includes('duplicate key') || msg.includes('unique')) {
			return json({ error: 'Slug déjà utilisé' }, { status: 409 });
		}
		console.error('[veille/themes POST]', msg);
		return json({ error: 'DB error' }, { status: 500 });
	}
}
