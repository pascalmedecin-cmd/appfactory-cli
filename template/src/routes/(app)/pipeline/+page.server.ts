import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { OpportuniteCreateSchema, OpportuniteUpdateSchema, OpportuniteMoveSchema, OpportuniteArchiveSchema, OPP_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';

export const load: PageServerLoad = async ({ locals }) => {
	const [oppsRes, contactsRes, entreprisesRes] = await Promise.all([
		locals.supabase
			.from('opportunites')
			.select('*, contacts(id, nom, prenom), entreprises(id, raison_sociale), signaux_affaires(id, type_signal, description_projet)')
			.order('date_derniere_modification', { ascending: false }),
		locals.supabase
			.from('contacts')
			.select('id, nom, prenom')
			.eq('statut_archive', false)
			.order('nom'),
		locals.supabase
			.from('entreprises')
			.select('id, raison_sociale')
			.order('raison_sociale'),
	]);

	return {
		opportunites: oppsRes.data ?? [],
		contacts: contactsRes.data ?? [],
		entreprises: entreprisesRes.data ?? [],
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, [...OPP_FIELDS]);
		const parsed = validate(OpportuniteCreateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const ts = now();
		const { error } = await locals.supabase.from('opportunites').insert({
			id: newId(),
			titre: parsed.data.titre,
			contact_id: parsed.data.contact_id || null,
			entreprise_id: parsed.data.entreprise_id || null,
			montant_estime: parsed.data.montant_estime ?? null,
			etape_pipeline: parsed.data.etape_pipeline || 'identification',
			date_relance_prevue: parsed.data.date_relance_prevue || null,
			notes_libres: parsed.data.notes_libres || null,
			responsable: parsed.data.responsable || null,
			signal_affaires_id: parsed.data.signal_affaires_id || null,
			lie_signal_affaires: !!(parsed.data.signal_affaires_id),
			date_creation: ts,
			date_derniere_modification: ts,
		});

		return dbFail(error) ?? { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...OPP_FIELDS]);
		const parsed = validate(OpportuniteUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				titre: parsed.data.titre,
				contact_id: parsed.data.contact_id || null,
				entreprise_id: parsed.data.entreprise_id || null,
				montant_estime: parsed.data.montant_estime ?? null,
				etape_pipeline: parsed.data.etape_pipeline || null,
				date_relance_prevue: parsed.data.date_relance_prevue || null,
				notes_libres: parsed.data.notes_libres || null,
				responsable: parsed.data.responsable || null,
				date_derniere_modification: now(),
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	move: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(OpportuniteMoveSchema, extractForm(form, ['id', 'etape_pipeline']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				etape_pipeline: parsed.data.etape_pipeline,
				date_derniere_modification: now(),
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(OpportuniteArchiveSchema, extractForm(form, ['id', 'motif_perte']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const ts = now();
		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				etape_pipeline: 'perdu',
				motif_perte: parsed.data.motif_perte || null,
				date_cloture_effective: ts,
				date_derniere_modification: ts,
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},
};
