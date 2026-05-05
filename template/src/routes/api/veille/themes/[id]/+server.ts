import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import {
	updateTheme,
	ThemeUpdateSchema
} from '$lib/server/intelligence/themes-repository';

const UuidSchema = z.string().uuid();

// PATCH : update partiel d'un thème (label, description, category, sort_order,
// active). Auth requise. Service client pour bypass RLS.
export async function PATCH({ params, request, locals }: RequestEvent) {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const idParsed = UuidSchema.safeParse(params.id);
	if (!idParsed.success) {
		return json({ error: 'id UUID invalide' }, { status: 400 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = ThemeUpdateSchema.safeParse(payload);
	if (!parsed.success) {
		return json(
			{ error: 'Validation failed', issues: parsed.error.issues },
			{ status: 400 }
		);
	}

	try {
		const service = createSupabaseServiceClient();
		const theme = await updateTheme(service, idParsed.data, parsed.data);
		return json({ theme });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'unknown';
		if (msg.includes('No rows') || msg.includes('PGRST116')) {
			return json({ error: 'Thème introuvable' }, { status: 404 });
		}
		console.error('[veille/themes PATCH]', msg);
		return json({ error: 'DB error' }, { status: 500 });
	}
}
