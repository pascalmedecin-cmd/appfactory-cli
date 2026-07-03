import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { createGroupe, assignGroupeToLeads } from '$lib/server/campagne-groupes';
import { GROUPE_NOM_MAX, MAX_GROUPE_LEAD_IDS } from '$lib/campagne-groupes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * Groupes de prospects d'UNE campagne (2026-07-02).
 *  - POST : crée un groupe { nom, leadIds? } ; `leadIds` (optionnel) = assignation initiale
 *    (pré-remplissage par type Google côté client - le serveur ne reçoit qu'une liste d'ids,
 *    re-scopée à la campagne par l'update : un id étranger est simplement ignoré).
 *
 * La LECTURE des groupes est servie côté serveur par le load de la page campagne dédiée
 * (`listGroupes`) : le handler GET, consommé uniquement par l'ex-panneau latéral, a été retiré
 * avec lui (2026-07-03, un seul chemin - spec validation externe §2).
 *
 * Auth obligatoire + gate `ffCrmListesV2` re-vérifié serveur (defense-in-depth). Payload borné
 * (nom ≤ 24 chars = borne stress-testée de l'étiquette de transition ; lot ≤ 1000 ids).
 */
const idSchema = z.string().uuid();
const CreateSchema = z.object({
	nom: z.string().trim().min(1).max(GROUPE_NOM_MAX),
	leadIds: z.array(z.string().uuid()).max(MAX_GROUPE_LEAD_IDS).optional(),
});

export const POST = async ({ params, request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	if (!isCampagnesEnabled(user)) return json({ error: 'Fonctionnalité non activée' }, { status: 403 });

	const id = idSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Identifiant invalide' }, { status: 400 });

	const raw = await request.json().catch(() => null);
	const parsed = CreateSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Données invalides' }, { status: 400 });

	const { data: groupe, error } = await createGroupe(locals.supabase, {
		campagneId: id.data,
		nom: parsed.data.nom,
		userId: user?.id ?? null,
	});
	if (error || !groupe) {
		const status = error?.code === 'duplicate' ? 409 : error?.code === 'invalid' ? 400 : 500;
		return json({ error: error?.message ?? 'Création impossible' }, { status });
	}

	// Assignation initiale (best-effort APRÈS création : le groupe est la sortie primaire).
	// Un échec n'annule pas la création mais n'est JAMAIS silencieux (`assignWarning`).
	let assigned = 0;
	let assignWarning: string | null = null;
	if (parsed.data.leadIds && parsed.data.leadIds.length > 0) {
		const { updated, error: aErr } = await assignGroupeToLeads(
			locals.supabase,
			id.data,
			groupe.id,
			parsed.data.leadIds
		);
		assigned = updated;
		if (aErr) {
			console.warn(`[groupes] assignation initiale échouée (groupe ${groupe.id}): ${aErr.message}`);
			assignWarning =
				'Le groupe est créé mais les prospects n’ont pas tous pu y être ajoutés. Sélectionnez-les puis « Ajouter au groupe ».';
		}
	}
	return json({ groupe, assigned, assignWarning }, { status: 201 });
};
