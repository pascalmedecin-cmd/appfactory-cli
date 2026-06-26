// PDF de marque (Bloc C, 2026-06-26) : rend une édition de veille en page imprimable
// brandée (« Exporter en PDF » depuis /crm/veille/[id]). Réutilise le rendu de l'email
// brief (source unique de la charte veille, cf. email-brief.ts) -> zéro duplication de
// charte, cohérence stricte avec l'email reçu par antoine@/pascal@. Auth obligatoire.

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildBriefPrintHtml } from '$lib/server/intelligence/email-brief';
import { rowToIntelligenceReport } from '$lib/server/intelligence/report-items';

export const GET: RequestHandler = async ({ params, locals }) => {
	const { session } = await locals.safeGetSession();
	if (!session) throw error(401, 'Non authentifié');

	// Pas de filtre status= : parité volontaire avec /crm/veille/[id] (qui rend toute
	// édition quel que soit son statut) ; le bouton « Exporter en PDF » n'est de toute
	// façon affiché que sur les éditions à contenu (items > 0, cf. +page.svelte). Outil
	// mono-tenant (<=10 admins @filmpro.ch) : exporter un brouillon est sans risque.
	const { data: row, error: dbErr } = await locals.supabase
		.from('intelligence_reports')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (dbErr || !row) throw error(404, 'Édition introuvable');

	// Adaptateur unique ligne DB plate -> forme rendu (meta nichée), meta + items validés
	// au boundary (cf. report-items.ts). Évite toute reconstruction inline non typée.
	const report = rowToIntelligenceReport(row);
	const html = buildBriefPrintHtml({ weekLabel: row.week_label, report });

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			// Contenu métier nominatif : jamais mis en cache partagé.
			'Cache-Control': 'private, no-store'
		}
	});
};
