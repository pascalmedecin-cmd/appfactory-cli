import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	FeedbackCreateSchema,
	FeedbackUpdateStatusSchema,
	FeedbackUpdateNotesSchema,
	FeedbackContextSchema,
	FEEDBACK_CREATE_FIELDS,
	FEEDBACK_UPDATE_STATUS_FIELDS,
	FEEDBACK_UPDATE_NOTES_FIELDS,
	extractForm,
	validate,
} from '$lib/schemas';
import { dbFail } from '$lib/server/db-helpers';
import { isAdmin } from '$lib/server/roles';
import type { FeedbackEntry, FeedbackContext } from '$lib/feedback/types';

// Defense in depth (spec § 11) : la RLS UPDATE via `auth.jwt() ->> 'email'` peut
// échouer silencieusement si Supabase ne propage pas l'email dans le JWT. On checke
// donc isAdmin(user.email) côté serveur AVANT chaque mutation admin, et la RLS
// agit comme second filet. Rôles : src/lib/server/roles.ts (retours = ADMIN seul).

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	const admin = isAdmin(user?.email);

	const { data, error } = await locals.supabase
		.from('feedback_entries')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Erreur chargement feedback_entries:', error.message);
		return { entries: [] as FeedbackEntry[], isAdmin: admin, userEmail: user?.email ?? '' };
	}

	// Normalise context au load : les rows legacy (jsonb '{}' par défaut, ou héritées
	// d'une version antérieure du schéma) n'ont pas forcément {url, viewport, userAgent,
	// recentErrors}. FeedbackContextSchema.parse(...) honore les defaults Zod et garantit
	// la forme attendue par le type TS strict côté composant (audit L-4 contracts).
	const entries: FeedbackEntry[] = (data ?? []).map((row) => ({
		...row,
		type: row.type as FeedbackEntry['type'],
		severity: row.severity as FeedbackEntry['severity'],
		status: row.status as FeedbackEntry['status'],
		context: FeedbackContextSchema.parse(row.context ?? {}) as FeedbackContext,
	}));

	return {
		entries,
		isAdmin: admin,
		userEmail: user?.email ?? '',
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id || !user?.email) {
			return fail(401, { error: 'Session expirée.' });
		}

		const form = await request.formData();
		const raw = extractForm(form, [...FEEDBACK_CREATE_FIELDS]);
		const parsed = validate(FeedbackCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		// Normalise email : trim + lower-case pour aligner sur isAdmin (qui lower-case
		// avant compare). Un email à casse mixte (rare avec OTP @filmpro.ch mais possible)
		// casserait une requête SQL ad hoc `created_by_email = ADMIN_EMAIL` (audit L-2).
		const { error } = await locals.supabase.from('feedback_entries').insert({
			created_by: user.id,
			created_by_email: user.email.trim().toLowerCase(),
			type: parsed.data.type,
			severity: parsed.data.type === 'bug' ? parsed.data.severity || null : null,
			page: parsed.data.page,
			description: parsed.data.description,
			context: parsed.data.context ?? {},
			status: 'nouveau',
		});

		return dbFail(error) ?? { success: true };
	},

	updateStatus: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!isAdmin(user?.email)) {
			return fail(403, { error: 'Action réservée à l\'administrateur.' });
		}

		const form = await request.formData();
		const parsed = validate(
			FeedbackUpdateStatusSchema,
			extractForm(form, [...FEEDBACK_UPDATE_STATUS_FIELDS])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('feedback_entries')
			.update({ status: parsed.data.status })
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	updateAdminNotes: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!isAdmin(user?.email)) {
			return fail(403, { error: 'Action réservée à l\'administrateur.' });
		}

		const form = await request.formData();
		const parsed = validate(
			FeedbackUpdateNotesSchema,
			extractForm(form, [...FEEDBACK_UPDATE_NOTES_FIELDS])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		// admin_notes déjà normalisé par `FeedbackUpdateNotesSchema.transform` (trim + ''→null).
		// Defense-in-depth : CHECK SQL `_002` (1..2000 chars), Zod transform, et l'absence
		// du payload renvoie `null` natif côté Supabase JS.
		const { error } = await locals.supabase
			.from('feedback_entries')
			.update({ admin_notes: parsed.data.admin_notes })
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},
};
