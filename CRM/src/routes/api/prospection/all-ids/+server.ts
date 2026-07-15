import { json, type RequestEvent } from '@sveltejs/kit';
import { parseProspectionFilter, fetchProspectionRows } from '$lib/server/prospection-query';

const MAX_IDS = 5_000;

// Renvoie tous les IDs prospect_leads matchant les filtres URL (sélection globale
// « tous les prospects qui correspondent aux filtres »). Mêmes filtres que /crm/prospection
// et l'export CSV — via le module partagé `prospection-query` (source unique). Corrige la
// divergence historique : la sélection mappe désormais l'onglet, exclut les transférés par
// défaut et cherche sur 3 champs, donc elle reflète EXACTEMENT la vue affichée.
export async function GET({ locals, url }: RequestEvent) {
	const filter = parseProspectionFilter(url, locals.marque);

	const { rows, truncated, error } = await fetchProspectionRows<{ id: string }>(locals.supabase, filter, {
		select: 'id',
		cap: MAX_IDS,
		order: false, // sélection d'ids : le tri est sans objet.
	});

	if (error) {
		console.error('[all-ids] supabase error', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}

	const ids = rows.map((r) => r.id);
	// `total` = nombre d'ids effectivement renvoyés (le consumer affiche « N prospects ») ;
	// `capped` = la sélection a été tronquée au plafond technique (affiner les filtres).
	return json({ ids, total: ids.length, capped: truncated });
}
