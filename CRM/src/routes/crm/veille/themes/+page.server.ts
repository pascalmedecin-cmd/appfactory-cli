import { fail, redirect, type Actions, type ServerLoad } from '@sveltejs/kit';
import { z } from 'zod';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { coerceFormBoolean } from '$lib/schemas';
import {
	listAllThemes,
	createTheme,
	updateTheme,
	deleteTheme,
	ThemeCreateSchema,
	ThemeUpdateSchema,
	ThemeSlugSchema
} from '$lib/server/intelligence/themes-repository';

const UuidSchema = z.string().uuid();

export const load: ServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	const themes = await listAllThemes(locals.supabase);
	return { themes };
};

function flattenIssues(issues: z.ZodIssue[]): string {
	return issues.map((i) => `${i.path.join('.') || '_'}: ${i.message}`).join(' | ');
}

function parseSortOrder(raw: FormDataEntryValue | null): number {
	if (raw === null) return Number.NaN;
	const n = Number(String(raw).trim());
	return Number.isFinite(n) ? n : Number.NaN;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const input = {
			slug: String(fd.get('slug') ?? '').trim(),
			label: String(fd.get('label') ?? '').trim(),
			description: String(fd.get('description') ?? '').trim(),
			category: String(fd.get('category') ?? '').trim(),
			sort_order: parseSortOrder(fd.get('sort_order')),
			active: coerceFormBoolean(fd.get('active'))
		};

		const parsed = ThemeCreateSchema.safeParse(input);
		if (!parsed.success) {
			return fail(400, { error: flattenIssues(parsed.error.issues), values: input });
		}

		try {
			const service = createSupabaseServiceClient();
			await createTheme(service, parsed.data);
			return { success: true, message: `Thème "${parsed.data.label}" créé.` };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			if (msg.includes('duplicate key') || msg.includes('unique')) {
				return fail(409, { error: 'Slug déjà utilisé', values: input });
			}
			console.error('[themes create]', msg);
			return fail(500, { error: 'Erreur DB', values: input });
		}
	},

	update: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const idRaw = String(fd.get('id') ?? '').trim();
		const idParsed = UuidSchema.safeParse(idRaw);
		if (!idParsed.success) return fail(400, { error: 'id UUID invalide' });

		const input: Record<string, unknown> = {};
		const labelRaw = fd.get('label');
		if (labelRaw !== null) input.label = String(labelRaw).trim();
		const descRaw = fd.get('description');
		if (descRaw !== null) input.description = String(descRaw).trim();
		const catRaw = fd.get('category');
		if (catRaw !== null) input.category = String(catRaw).trim();
		const sortRaw = fd.get('sort_order');
		if (sortRaw !== null) input.sort_order = parseSortOrder(sortRaw);

		const parsed = ThemeUpdateSchema.safeParse(input);
		if (!parsed.success) {
			return fail(400, { error: flattenIssues(parsed.error.issues), values: input });
		}

		try {
			const service = createSupabaseServiceClient();
			await updateTheme(service, idParsed.data, parsed.data);
			return { success: true, message: 'Thème mis à jour.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			console.error('[themes update]', msg);
			return fail(500, { error: 'Erreur DB' });
		}
	},

	toggleActive: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const idRaw = String(fd.get('id') ?? '').trim();
		const idParsed = UuidSchema.safeParse(idRaw);
		if (!idParsed.success) return fail(400, { error: 'id UUID invalide' });

		const active = coerceFormBoolean(fd.get('active'));

		try {
			const service = createSupabaseServiceClient();
			await updateTheme(service, idParsed.data, { active });
			return {
				success: true,
				message: active ? 'Thème activé.' : 'Thème désactivé.'
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			console.error('[themes toggleActive]', msg);
			return fail(500, { error: 'Erreur DB' });
		}
	},

	delete: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const idRaw = String(fd.get('id') ?? '').trim();
		const idParsed = UuidSchema.safeParse(idRaw);
		if (!idParsed.success) return fail(400, { error: 'id UUID invalide' });

		try {
			const service = createSupabaseServiceClient();
			await deleteTheme(service, idParsed.data);
			return { success: true, message: 'Thème supprimé.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			console.error('[themes delete]', msg);
			return fail(500, { error: 'Erreur DB' });
		}
	},

	validateSlug: async ({ request }) => {
		const fd = await request.formData();
		const slug = String(fd.get('slug') ?? '').trim();
		const parsed = ThemeSlugSchema.safeParse(slug);
		if (!parsed.success) {
			return fail(400, { slugError: parsed.error.issues[0]?.message ?? 'Slug invalide' });
		}
		return { slugValid: true };
	}
};
