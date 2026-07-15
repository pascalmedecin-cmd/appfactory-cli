import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { OpportuniteCreateSchema, OpportuniteUpdateSchema, OpportuniteMoveSchema, OpportuniteArchiveSchema, OpportuniteNextActionSchema, OpportuniteConvertSchema, OPP_FIELDS, extractForm, validate } from '$lib/schemas';
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
			.eq('marque', locals.marque)
			.order('date_derniere_modification', { ascending: false }),
		locals.supabase
			.from('contacts')
			.select('id, nom, prenom')
			.eq('marque', locals.marque)
			.eq('statut_archive', false)
			.order('nom'),
		locals.supabase
			.from('entreprises')
			.select('id, raison_sociale')
			.eq('marque', locals.marque)
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
			marque: locals.marque,
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

	// Lot 2 : « Convertir en client ». Sur une opportunité issue d'un prospect
	// (prospect_lead_id), crée l'entreprise + contact via RPC transfer_lead_to_crm
	// (atomique), puis lie l'opportunité à l'entreprise créée. C'est le SEUL chemin
	// prospect -> entreprise (le bouton a quitté la prospection au Lot 2).
	convertToClient: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(OpportuniteConvertSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		// select('*') + cast : prospect_lead_id (migration 20260701000002) pas encore
		// dans les types Database générés (même pattern que les RPC castées `as never`).
		const { data: oppData, error: readErr } = await locals.supabase
			.from('opportunites')
			.select('*')
			.eq('marque', locals.marque)
			.eq('id', parsed.data.id)
			.maybeSingle();
		if (readErr) {
			console.error('[convertToClient] lecture opportunité:', readErr.message);
			return fail(500, { error: 'Erreur lecture opportunité' });
		}
		const opp = oppData as { id: string; entreprise_id: string | null; prospect_lead_id: string | null } | null;
		if (!opp) return fail(404, { error: 'Opportunité introuvable' });
		if (opp.entreprise_id) return fail(409, { error: 'Opportunité déjà convertie en client' });
		if (!opp.prospect_lead_id) return fail(400, { error: "Cette opportunité n'est pas liée à un prospect" });

		// Lie l'opportunité à l'entreprise (+contact) créés. Un échec ici N'EST PAS masqué en
		// faux succès (règle anti-fallback-silencieux) : on renvoie une erreur actionnable.
		const linkOpp = async (entrepriseId: string, contactId: string | null) => {
			const { error: linkErr } = await locals.supabase
				.from('opportunites')
				.update({ entreprise_id: entrepriseId, contact_id: contactId, date_derniere_modification: now() })
				.eq('id', parsed.data.id);
			if (linkErr) {
				console.error('[convertToClient] lien opportunité<->entreprise:', linkErr.message);
				return fail(500, { error: "Client créé, mais la liaison de l'opportunité a échoué. Réessayez." });
			}
			return null;
		};

		// Récupération : si le prospect est DÉJÀ transféré (ex. lien échoué à un essai
		// précédent), l'entreprise existe -> on relie l'opportunité SANS re-appeler la RPC
		// (qui lèverait P0001 et laisserait l'opportunité orpheline pour toujours).
		const { data: leadRow } = await locals.supabase
			.from('prospect_leads')
			.select('statut, transfere_vers_entreprise_id, transfere_vers_contact_id')
			.eq('marque', locals.marque)
			.eq('id', opp.prospect_lead_id)
			.maybeSingle();
		if (leadRow?.statut === 'transfere' && leadRow.transfere_vers_entreprise_id) {
			const failLink = await linkOpp(leadRow.transfere_vers_entreprise_id, leadRow.transfere_vers_contact_id ?? null);
			return failLink ?? { success: true, entrepriseId: leadRow.transfere_vers_entreprise_id };
		}

		const { data, error: rpcErr } = await locals.supabase.rpc(
			'transfer_lead_to_crm' as never,
			{ p_lead_id: opp.prospect_lead_id } as never
		);
		if (rpcErr) {
			const code = (rpcErr as { code?: string }).code;
			if (code === 'P0002') return fail(400, { error: 'Prospect introuvable' });
			if (code === 'P0001') return fail(409, { error: 'Prospect déjà converti en client' });
			console.error('[convertToClient] RPC transfer_lead_to_crm:', rpcErr.message);
			return fail(500, { error: 'Erreur lors de la conversion (transaction annulée)' });
		}
		const result = data as { entreprise_id?: string; contact_id?: string | null } | null;
		if (!result?.entreprise_id) return fail(500, { error: 'Réponse RPC invalide' });

		const failLink = await linkOpp(result.entreprise_id, result.contact_id ?? null);
		return failLink ?? { success: true, entrepriseId: result.entreprise_id };
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
