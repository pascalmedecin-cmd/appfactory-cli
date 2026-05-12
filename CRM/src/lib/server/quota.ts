// Spec « API Google Places comme source de prospection » (notes/google-places-2026-05-12/spec.md, A4 + § 7 DoD #6).
// Lecture / incrément du compteur mensuel d'appels API externes (table api_quota_log).
//
// Lecture : policy SELECT pour les utilisateurs authentifiés → `locals.supabase` suffit.
// Incrément : RPC `api_quota_increment` (SECURITY DEFINER, atomique via ON CONFLICT) →
// fonctionne avec un client authentifié, pas besoin de service role.

import type { SupabaseClient } from '@supabase/supabase-js';

export type QuotaSource = 'search_ch' | 'google_places';

/** Clé année-mois courante au format `YYYY-MM` (UTC). */
export function currentYearMonth(d: Date = new Date()): string {
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Nombre d'appels déjà consommés ce mois pour `source`. 0 si aucune ligne (mois neuf).
 * Tolérant aux erreurs DB : retourne 0 plutôt que de bloquer l'affichage (le garde-fou
 * dur reste l'incrément + check côté endpoint).
 */
export async function getMonthlyUsage(
	supabase: Pick<SupabaseClient, 'from'>,
	source: QuotaSource,
	d: Date = new Date(),
): Promise<number> {
	const ym = currentYearMonth(d);
	const { data, error } = await supabase
		.from('api_quota_log')
		.select('calls')
		.eq('source', source)
		.eq('year_month', ym)
		.maybeSingle();
	if (error || !data || typeof (data as { calls?: unknown }).calls !== 'number') return 0;
	return (data as { calls: number }).calls;
}

/**
 * Incrémente atomiquement le compteur du mois courant de `by` (défaut 1) via la RPC
 * `api_quota_increment`. Retourne la nouvelle valeur, ou null en cas d'erreur DB
 * (le caller logge ; un échec d'incrément ne doit pas annuler l'import déjà effectué).
 */
export async function incrementUsage(
	supabase: Pick<SupabaseClient, 'rpc'>,
	source: QuotaSource,
	by = 1,
	d: Date = new Date(),
): Promise<number | null> {
	const { data, error } = await supabase.rpc('api_quota_increment' as never, {
		p_source: source,
		p_year_month: currentYearMonth(d),
		p_by: by,
	} as never);
	if (error || typeof data !== 'number') return null;
	return data;
}
