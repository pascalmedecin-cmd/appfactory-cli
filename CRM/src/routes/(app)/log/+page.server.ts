import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	FeedbackCreateSchema,
	FeedbackUpdateStatusSchema,
	FeedbackUpdateNotesSchema,
	FEEDBACK_CREATE_FIELDS,
	FEEDBACK_UPDATE_STATUS_FIELDS,
	FEEDBACK_UPDATE_NOTES_FIELDS,
	extractForm,
	validate,
} from '$lib/schemas';
import { dbFail } from '$lib/server/db-helpers';
import { isAdminEmail } from '$lib/feedback/admin';
import type { FeedbackEntry } from '$lib/feedback/types';

// Defense in depth (spec § 11) : la RLS UPDATE via `auth.jwt() ->> 'email'` peut
// échouer silencieusement si Supabase ne propage pas l'email dans le JWT. On checke
// donc isAdminEmail(user.email) côté serveur AVANT chaque mutation admin, et la RLS
// agit comme second filet.

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	const isAdmin = isAdminEmail(user?.email);

	const { data, error } = await locals.supabase
		.from('feedback_entries' as never)
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Erreur chargement feedback_entries:', error.message);
		return { entries: [] as FeedbackEntry[], isAdmin, userEmail: user?.email ?? '' };
	}

	return {
		entries: (data ?? []) as unknown as FeedbackEntry[],
		isAdmin,
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

		const { error } = await locals.supabase.from('feedback_entries' as never).insert({
			created_by: user.id,
			created_by_email: user.email,
			type: parsed.data.type,
			severity: parsed.data.type === 'bug' ? parsed.data.severity || null : null,
			page: parsed.data.page,
			description: parsed.data.description,
			context: parsed.data.context ?? {},
			status: 'nouveau',
		} as never);

		return dbFail(error) ?? { success: true };
	},

	updateStatus: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!isAdminEmail(user?.email)) {
			return fail(403, { error: 'Action réservée à l\'administrateur.' });
		}

		const form = await request.formData();
		const parsed = validate(
			FeedbackUpdateStatusSchema,
			extractForm(form, [...FEEDBACK_UPDATE_STATUS_FIELDS])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('feedback_entries' as never)
			.update({ status: parsed.data.status } as never)
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	updateAdminNotes: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!isAdminEmail(user?.email)) {
			return fail(403, { error: 'Action réservée à l\'administrateur.' });
		}

		const form = await request.formData();
		const parsed = validate(
			FeedbackUpdateNotesSchema,
			extractForm(form, [...FEEDBACK_UPDATE_NOTES_FIELDS])
		);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('feedback_entries' as never)
			.update({ admin_notes: parsed.data.admin_notes || null } as never)
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},
};
