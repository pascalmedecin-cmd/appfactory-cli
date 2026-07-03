import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { CRM_BASE } from '$lib/config';
import { getCampagne, fetchProspectsForCampagne } from '$lib/server/campagnes';
import { listGroupes } from '$lib/server/campagne-groupes';
import { getValidationLienActif, getValidationConfirmation } from '$lib/server/validation-campagne';

/**
 * Page dédiée d'UNE campagne : le « poste de pilotage » du processus complet
 * (Constituer -> Organiser -> Valider -> Diffuser). Remplace le panneau latéral de l'écran
 * Campagnes (2026-07-02, décision Pascal : la campagne est l'objet de travail central,
 * un slide-out ne peut pas porter lisiblement les 4 étapes + les sorties).
 *
 * Premium uniquement : sans le flag `ffCrmListesV2`, redirige vers le dashboard (invariant
 * « OFF = aucune surface Campagnes »). Même doctrine d'erreurs que la page Étiquettes :
 * id malformé / campagne absente -> 404 ; échec DB -> 500 + log (jamais « campagne vide »).
 */
const idSchema = z.string().uuid();

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { featureFlags } = await parent();
	if (featureFlags?.ffCrmListesV2 !== true) throw redirect(307, CRM_BASE);

	const id = idSchema.safeParse(params.id);
	if (!id.success) throw error(404, 'Campagne introuvable');

	const { data: campagne, error: campErr } = await getCampagne(locals.supabase, id.data);
	if (campErr) {
		console.error('Erreur chargement campagne (page):', campErr.message);
		throw error(500, 'Chargement impossible');
	}
	if (!campagne) throw error(404, 'Campagne introuvable');

	const [prospectsRes, groupesRes, lienRes, confirmationRes] = await Promise.all([
		fetchProspectsForCampagne(locals.supabase, id.data),
		listGroupes(locals.supabase, id.data),
		getValidationLienActif(locals.supabase, id.data),
		getValidationConfirmation(locals.supabase, id.data),
	]);
	if (prospectsRes.error) {
		console.error('Erreur chargement prospects (page campagne):', prospectsRes.error.message);
		throw error(500, 'Chargement impossible');
	}
	if (groupesRes.error) {
		console.error('Erreur chargement groupes (page campagne):', groupesRes.error.message);
		throw error(500, 'Chargement impossible');
	}
	// Le lien de validation et la confirmation sont des états SECONDAIRES : un échec de lecture ne
	// doit pas rendre la page inaccessible (dégradé : « état inconnu », la génération reste
	// possible ; badge « reçue » simplement absent). Loggé fort.
	if (lienRes.error) {
		console.error('Erreur lecture lien validation (page campagne):', lienRes.error.message);
	}
	if (confirmationRes.error) {
		console.error('Erreur lecture confirmation validation (page campagne):', confirmationRes.error.message);
	}

	return {
		campagne,
		prospects: prospectsRes.data,
		groupes: groupesRes.data,
		validationLien: lienRes.data,
		// « Validation reçue » du round courant (confirmed_at du lien le plus récent, même expiré).
		validationConfirmedAt: confirmationRes.confirmedAt,
	};
};
