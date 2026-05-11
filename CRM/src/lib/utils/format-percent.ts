/**
 * Audit 360 M-24 : source unique du formatage de pourcentage fr-CH.
 *
 * Deux sémantiques d'entrée distinctes — d'où deux fonctions :
 *  - `formatPercentFromRatio(0.42)` → "+42,0 %" : l'entrée est un *ratio* (0..1),
 *    formaté via `Intl … style:'percent'`. Signe explicite optionnel (delta de coût).
 *  - `formatPercentValue(42)` → "42,0 %" : l'entrée est déjà un *pourcentage*
 *    (0..100), formaté en décimal + " % " (espace ASCII, comportement historique
 *    de `reportingFormat`).
 *
 * Non-fini (NaN, ±Infinity) → `fallback` (défaut "—") dans les deux cas.
 */

const PERCENT_FMT = new Intl.NumberFormat('fr-CH', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
	signDisplay: 'auto'
});

const PERCENT_FMT_SIGNED = new Intl.NumberFormat('fr-CH', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
	signDisplay: 'exceptZero'
});

const DECIMAL_1 = new Intl.NumberFormat('fr-CH', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});

export function formatPercentFromRatio(
	ratio: number,
	opts?: { signed?: boolean; fallback?: string }
): string {
	if (!Number.isFinite(ratio)) return opts?.fallback ?? '—';
	return (opts?.signed ? PERCENT_FMT_SIGNED : PERCENT_FMT).format(ratio);
}

export function formatPercentValue(value: number, opts?: { fallback?: string }): string {
	if (!Number.isFinite(value)) return opts?.fallback ?? '—';
	return `${DECIMAL_1.format(value)} %`;
}
