/**
 * Export CSV filtré de la Prospection : reflète EXACTEMENT la vue affichée
 * (onglet actif + filtres source/canton/statut/température + recherche), pas
 * la page paginée — toutes les lignes filtrées, plafonnées à MAX_EXPORT.
 *
 * Le bouton « Exporter CSV » de /crm/prospection pointe ici avec la querystring
 * courante de la page, donc l'export = ce que l'utilisateur voit.
 *
 * Le filtre est désormais partagé avec le `load` de la page ET la sélection globale
 * via `$lib/server/prospection-query` (source unique — la dette des 3 filtres dupliqués
 * est résorbée). Toute évolution du filtre se fait dans ce module, pas ici.
 *
 * Protégé par le hook global (session @filmpro.ch requise).
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toCsv, csvFilename, csvResponseHeaders } from '$lib/server/csv-export';
import { LEADS_EXPORT_COLUMNS } from '$lib/server/export-columns';
import { PROSPECTION_EXPORT_CAP } from '$lib/prospection-utils';
import { parseProspectionFilter, fetchProspectionRows } from '$lib/server/prospection-query';
import { fetchCampagnesByLead } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

const MAX_EXPORT = PROSPECTION_EXPORT_CAP;

export const GET: RequestHandler = async ({ locals, url }) => {
	// Vague 3.2 : la colonne Campagnes n'apparaît qu'en premium (defense-in-depth ; hors flag
	// l'export reste byte-identique a l'existant, meme sur appel direct par un admin non-premium).
	const { user } = await locals.safeGetSession();
	const premium = isCampagnesEnabled(user);
	const filter = parseProspectionFilter(url);

	const { rows, totalMatching, truncated, error: dbError } = await fetchProspectionRows<Record<string, unknown> & { id: string }>(
		locals.supabase,
		filter,
		{ select: '*', cap: MAX_EXPORT, order: true },
	);
	if (dbError) {
		console.error('[export prospection] erreur Supabase', dbError);
		throw error(500, 'Erreur lors de la récupération des données');
	}

	// Vague 3.2 : colonne Campagnes = noms joints par lead (1 requête), uniquement en premium.
	if (premium && rows.length > 0) {
		const byLead = await fetchCampagnesByLead(locals.supabase, rows.map((r) => r.id));
		for (const r of rows) r.campagnes = (byLead.get(r.id) ?? []).map((c) => c.nom).join('; ');
	}

	const columns = premium ? LEADS_EXPORT_COLUMNS : LEADS_EXPORT_COLUMNS.filter((c) => c.key !== 'campagnes');
	const csv = toCsv(rows, columns);
	// BOM UTF-8 (Excel). Version du schéma dans le header X-Export-Schema-Version.
	const body = '\ufeff' + csv;

	const headers = csvResponseHeaders(csvFilename('prospection'));
	// « No silent caps » : si le filtre dépasse le plafond, l'export tronque — on le
	// signale (header + log serveur). Le bouton UI avertit aussi quand totalLeads > cap.
	// Au volume actuel (< 200 leads) ce cas ne se déclenche pas ; garde-fou pour l'échelle.
	if (truncated) {
		headers.set('X-Export-Truncated', '1');
		headers.set('X-Export-Total', String(totalMatching));
		console.warn(`[export prospection] export tronqué : ${rows.length}/${totalMatching} lignes (cap ${MAX_EXPORT})`);
	}

	return new Response(body, { status: 200, headers });
};
