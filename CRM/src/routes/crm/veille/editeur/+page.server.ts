import { fail, redirect, type Actions, type ServerLoad } from '@sveltejs/kit';
import { z } from 'zod';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { coerceFormBoolean } from '$lib/schemas';
import { listAllThemes } from '$lib/server/intelligence/themes-repository';
import {
	listAllSources,
	createSource,
	updateSource,
	deleteSource,
	normalizeSourceHostname,
	SourceCreateSchema,
	SourceUpdateSchema
} from '$lib/server/intelligence/sources-repository';

// Éditeur de la veille (étape 5 du chantier sources éditables) : page 2 onglets
// (Thèmes + Sources). Les actions THÈMES vivent déjà dans /crm/veille/themes et
// sont réutilisées cross-route par l'onglet Thèmes ; ICI on porte les actions
// SOURCES (calque exact du pattern themes : auth + Zod + service-role + mapping erreurs).
// Le `regime` n'est jamais saisi : le repository le calcule depuis tier+flags (étape 5a).

const UuidSchema = z.string().uuid();

export const load: ServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	const [themes, sources] = await Promise.all([
		listAllThemes(locals.supabase),
		listAllSources(locals.supabase)
	]);
	return { themes, sources };
};

function flattenIssues(issues: z.ZodIssue[]): string {
	return issues.map((i) => `${i.path.join('.') || '_'}: ${i.message}`).join(' | ');
}

function parseSortOrder(raw: FormDataEntryValue | null): number {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) ? n : Number.NaN;
}

/** '' (toutes familles / hors tier) → null ; sinon la valeur brute (validée par Zod). */
function tierFromForm(raw: FormDataEntryValue | null): string | null {
	const v = String(raw ?? '').trim();
	return v === '' ? null : v;
}

const FLAG_FIELDS = [
	'in_denylist',
	'strict_verbatim',
	'is_advocacy',
	'is_preprint',
	'is_benchmark',
	'is_new'
] as const;

export const actions: Actions = {
	createSource: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		// L'UI saisit une URL ; on stocke le domaine normalisé (= identifiant unique).
		let hostname = '';
		try {
			hostname = normalizeSourceHostname(String(fd.get('url') ?? fd.get('hostname') ?? ''));
		} catch {
			return fail(400, { error: 'URL requise (ex. https://exemple.ch)' });
		}

		const input: Record<string, unknown> = {
			hostname,
			name: String(fd.get('name') ?? '').trim(),
			description: String(fd.get('description') ?? '').trim(),
			tier: tierFromForm(fd.get('tier'))
		};
		for (const flag of FLAG_FIELDS) input[flag] = coerceFormBoolean(fd.get(flag));

		const parsed = SourceCreateSchema.safeParse(input);
		if (!parsed.success) {
			return fail(400, { error: flattenIssues(parsed.error.issues), values: input });
		}

		try {
			const service = createSupabaseServiceClient();
			// Nouvelle source en fin de file (sort_order = max + 10), comme les thèmes.
			const { data: maxRow } = await service
				.from('veille_sources')
				.select('sort_order')
				.order('sort_order', { ascending: false })
				.limit(1)
				.maybeSingle();
			const sort_order = Math.min((maxRow?.sort_order ?? 0) + 10, 100000);
			await createSource(service, { ...parsed.data, sort_order });
			return { success: true, message: `Source « ${parsed.data.name} » ajoutée.` };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			if (msg.includes('duplicate key') || msg.includes('unique')) {
				return fail(409, { error: `Le domaine ${hostname} existe déjà.`, values: input });
			}
			console.error('[sources createSource]', msg);
			return fail(500, { error: 'Erreur DB', values: input });
		}
	},

	updateSource: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const idParsed = UuidSchema.safeParse(String(fd.get('id') ?? '').trim());
		if (!idParsed.success) return fail(400, { error: 'id UUID invalide' });

		const input: Record<string, unknown> = {};
		const nameRaw = fd.get('name');
		if (nameRaw !== null) input.name = String(nameRaw).trim();
		const descRaw = fd.get('description');
		if (descRaw !== null) input.description = String(descRaw).trim();
		if (fd.get('tier') !== null) input.tier = tierFromForm(fd.get('tier'));
		for (const flag of FLAG_FIELDS) {
			if (fd.get(flag) !== null) input[flag] = coerceFormBoolean(fd.get(flag));
		}
		const sortRaw = fd.get('sort_order');
		if (sortRaw !== null) input.sort_order = parseSortOrder(sortRaw);

		const parsed = SourceUpdateSchema.safeParse(input);
		if (!parsed.success) {
			return fail(400, { error: flattenIssues(parsed.error.issues), values: input });
		}

		try {
			const service = createSupabaseServiceClient();
			await updateSource(service, idParsed.data, parsed.data);
			return { success: true, message: 'Source mise à jour.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			console.error('[sources updateSource]', msg);
			return fail(500, { error: 'Erreur DB' });
		}
	},

	toggleSourceActive: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const idParsed = UuidSchema.safeParse(String(fd.get('id') ?? '').trim());
		if (!idParsed.success) return fail(400, { error: 'id UUID invalide' });
		const active = coerceFormBoolean(fd.get('active'));

		try {
			const service = createSupabaseServiceClient();
			await updateSource(service, idParsed.data, { active });
			return { success: true, message: active ? 'Source réactivée.' : 'Source mise en pause.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			console.error('[sources toggleSourceActive]', msg);
			return fail(500, { error: 'Erreur DB' });
		}
	},

	deleteSource: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await request.formData();
		const idParsed = UuidSchema.safeParse(String(fd.get('id') ?? '').trim());
		if (!idParsed.success) return fail(400, { error: 'id UUID invalide' });

		try {
			const service = createSupabaseServiceClient();
			await deleteSource(service, idParsed.data);
			return { success: true, message: 'Source supprimée.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'unknown';
			console.error('[sources deleteSource]', msg);
			return fail(500, { error: 'Erreur DB' });
		}
	}
};
