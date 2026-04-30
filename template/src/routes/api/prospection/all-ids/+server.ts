import { json, type RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

const VALID_TEMPS = new Set(['chaud', 'tiede', 'froid']);
const MAX_IDS = 5_000;
const MAX_FILTER_VALUES = 50; // Garde-fou DoS : `IN (...)` borné par paramètre

type LeadIdRow = { id: string };

function buildBase(
	supabase: SupabaseClient,
	sources: string[],
	cantons: string[],
	statuts: string[],
	temps: string[],
) {
	let q = supabase.from('prospect_leads').select('id', { count: 'exact' });
	if (sources.length > 0) q = q.in('source', sources);
	if (cantons.length > 0) q = q.in('canton', cantons);
	if (statuts.length > 0) q = q.in('statut', statuts);
	if (temps.length > 0) {
		const ranges: string[] = [];
		if (temps.includes('chaud')) ranges.push('score_pertinence.gte.7');
		if (temps.includes('tiede')) ranges.push('and(score_pertinence.gte.4,score_pertinence.lte.6)');
		if (temps.includes('froid')) ranges.push('score_pertinence.lte.3');
		if (ranges.length > 0) q = q.or(ranges.join(','));
	}
	return q;
}

// Renvoie tous les IDs prospect_leads matchant les filtres URL.
// Mêmes paramètres que /prospection (?source, ?canton, ?statut, ?temp, ?q).
// Sert la sélection globale "tous les prospects qui correspondent aux filtres".
export async function GET({ locals, url }: RequestEvent) {
	const sources = url.searchParams.getAll('source').slice(0, MAX_FILTER_VALUES);
	const cantons = url.searchParams.getAll('canton').slice(0, MAX_FILTER_VALUES);
	const statuts = url.searchParams.getAll('statut').slice(0, MAX_FILTER_VALUES);
	const temps = url.searchParams.getAll('temp').filter((t) => VALID_TEMPS.has(t));
	const search = (url.searchParams.get('q') ?? '').slice(0, 200).trim();

	if (search) {
		// Pattern sûr : 2 .ilike() en parallèle + Set dédup
		// (cf. memory/feedback_postgrest_or_filter_injection.md, S120 finding High).
		const escaped = search.replace(/[%_\\]/g, (c) => `\\${c}`);
		const q1 = buildBase(locals.supabase, sources, cantons, statuts, temps)
			.ilike('raison_sociale', `%${escaped}%`)
			.limit(MAX_IDS);
		const q2 = buildBase(locals.supabase, sources, cantons, statuts, temps)
			.ilike('localite', `%${escaped}%`)
			.limit(MAX_IDS);
		const [r1, r2] = await Promise.all([q1, q2]);
		if (r1.error || r2.error) {
			console.error('[all-ids] supabase search error', r1.error ?? r2.error);
			return json({ error: 'Erreur serveur' }, { status: 500 });
		}

		const merged = Array.from(
			new Set([...(r1.data ?? []), ...(r2.data ?? [])].map((r: LeadIdRow) => r.id))
		);
		const ids = merged.slice(0, MAX_IDS);
		const capped = ids.length >= MAX_IDS && merged.length > MAX_IDS;
		return json({ ids, total: ids.length, capped });
	}

	const { data, count, error } = await buildBase(locals.supabase, sources, cantons, statuts, temps).limit(MAX_IDS);
	if (error) {
		console.error('[all-ids] supabase error', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}

	const ids = (data ?? []).map((r: LeadIdRow) => r.id);
	return json({ ids, total: count ?? ids.length, capped: (count ?? 0) > MAX_IDS });
}
