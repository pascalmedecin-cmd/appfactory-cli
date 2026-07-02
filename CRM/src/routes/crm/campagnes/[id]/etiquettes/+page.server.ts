import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { CRM_BASE } from '$lib/config';
import { getCampagne, fetchProspectsForCampagne } from '$lib/server/campagnes';
import { listGroupes } from '$lib/server/campagne-groupes';

/**
 * Page dédiée « Impression d'étiquettes » d'UNE campagne (migration du volet V1 vers une page).
 *
 * Premium uniquement : sans le flag `ffCrmListesV2`, la route redirige vers le dashboard (cohérent
 * avec l'écran Campagnes, invariant « OFF = aucune surface Campagnes accessible »). Le flag vit dans
 * les claims JWT signés (`app_metadata`), exposé par `+layout.server.ts` via `featureFlags`.
 *
 * Charge la campagne (nom + couleur, pour l'en-tête) et ses prospects réduits aux champs d'adresse.
 * Séparation nette des cas : id malformé / campagne absente -> 404 ; échec DB transitoire -> 500 +
 * log (jamais présenté comme « campagne vide », cf. robustesse `fetchProspectsForCampagne`).
 */
const idSchema = z.string().uuid();

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { featureFlags } = await parent();
	if (featureFlags?.ffCrmListesV2 !== true) throw redirect(307, CRM_BASE);

	const id = idSchema.safeParse(params.id);
	if (!id.success) throw error(404, 'Campagne introuvable');

	const { data: campagne, error: campErr } = await getCampagne(locals.supabase, id.data);
	if (campErr) {
		console.error('Erreur chargement campagne (étiquettes):', campErr.message);
		throw error(500, 'Chargement impossible');
	}
	if (!campagne) throw error(404, 'Campagne introuvable');

	const { data: prospects, error: prospErr } = await fetchProspectsForCampagne(locals.supabase, id.data);
	if (prospErr) {
		console.error('Erreur chargement prospects (étiquettes):', prospErr.message);
		throw error(500, 'Chargement impossible');
	}

	// Groupes de la campagne (2026-07-02) : la planche sort groupe par groupe avec intercalaires.
	// Même doctrine que les prospects : un échec DB remonte (jamais « pas de groupes » menteur).
	const { data: groupes, error: grpErr } = await listGroupes(locals.supabase, id.data);
	if (grpErr) {
		console.error('Erreur chargement groupes (étiquettes):', grpErr.message);
		throw error(500, 'Chargement impossible');
	}

	return { campagne, prospects, groupes };
};
