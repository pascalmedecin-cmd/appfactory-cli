import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { OpportuniteCreateSchema, OpportuniteUpdateSchema, OpportuniteMoveSchema, OpportuniteArchiveSchema, OpportuniteNextActionSchema, OPP_FIELDS, extractForm, validate } from '$lib/schemas';
import { PipelineOpportuniteRowSchema } from '$lib/utils/pipelineFormat';
import { dbFail, newId, now } from '$lib/server/db-helpers';

export const load: PageServerLoad = async ({ locals }) => {
	const [oppsRes, contactsRes, entreprisesRes] = await Promise.all([
		locals.supabase
			.from('opportunites')
			// Désambiguïsation PostgREST : 2 FK existent entre opportunites et signaux_affaires
			// (signal_affaires_id → signaux_affaires.id ET signaux_affaires.opportunite_associee_id → opportunites.id).
			// On veut le signal d'origine de l'opp (many-to-one) → embed via la FK nommée, sinon PGRST201
			// fait échouer TOUTE la requête (data=null → pipeline vide quelles que soient les données).
			.select(
				'*, contacts(id, nom, prenom), entreprises(id, raison_sociale), signaux_affaires!opportunites_signal_affaires_id_fkey(id, type_signal, description_projet, source_officielle)'
			)
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

	// Observabilité : une erreur PostgREST (ex. embed ambigu) renvoie data=null → pipeline
	// silencieusement vide quelles que soient les données. On log fort au lieu de l'avaler.
	for (const [label, res] of [
		['opportunites', oppsRes],
		['contacts', contactsRes],
		['entreprises', entreprisesRes]
	] as const) {
		if (res.error) console.error(`[pipeline] load ${label} en erreur: ${res.error.message}`);
	}

	// Audit 360 M-16 : validation au boundary — on écarte (en loggant) une
	// ligne `opportunites` dont les champs critiques sont absents/mal typés,
	// plutôt que de la transmettre au composant cast à l'aveugle.
	const opportunites = (oppsRes.data ?? []).filter((r) => {
		const parsed = PipelineOpportuniteRowSchema.safeParse(r);
		if (!parsed.success) {
			const id = (r as { id?: unknown })?.id;
			console.warn(
				`[pipeline] opportunité ignorée (forme inattendue, id=${String(id)}): ${parsed.error.issues.map((i) => i.path.join('.') || '_').join(', ')}`
			);
		}
		return parsed.success;
	});

	return {
		opportunites,
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
			montant_estime: typeof parsed.data.montant_estime === 'number' ? parsed.data.montant_estime : null,
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
				montant_estime: typeof parsed.data.montant_estime === 'number' ? parsed.data.montant_estime : null,
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

	updateNextAction: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(OpportuniteNextActionSchema, extractForm(form, ['id', 'date_relance_prevue', 'notes_libres']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('opportunites')
			.update({
				date_relance_prevue: parsed.data.date_relance_prevue || null,
				notes_libres: parsed.data.notes_libres || null,
				date_derniere_modification: now(),
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},
};
