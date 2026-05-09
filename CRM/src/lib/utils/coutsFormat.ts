/**
 * Helpers de formatage et d'agrégation pour le dashboard /dashboard/couts.
 *
 * Source de vérité : table `cost_audit_runs` (1 ligne par run).
 * Toutes les fonctions sont pures + déterministes pour faciliter les tests.
 */

export interface CostRun {
	id: string;
	run_id: string;
	feature: 'veille' | 'signaux' | 'autre';
	model: string;
	status: 'success' | 'partial' | 'error';
	started_at: string;
	finished_at: string | null;
	duration_seconds: number | null;
	total_input_tokens: number;
	total_output_tokens: number;
	total_cache_read_tokens: number;
	total_cache_creation_tokens: number;
	total_usd: number;
	total_eur: number;
	breakdown: Array<{
		kind?: string;
		label?: string;
		model?: string;
		input_tokens?: number;
		output_tokens?: number;
		cache_read_tokens?: number;
		cache_creation_tokens?: number;
		usd?: number;
		eur?: number;
	}>;
	error_message: string | null;
	created_at: string;
}

const EUR_FORMATTER = new Intl.NumberFormat('fr-CH', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 4
});

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 2,
	maximumFractionDigits: 4
});

const PERCENT_FORMATTER = new Intl.NumberFormat('fr-CH', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
	signDisplay: 'exceptZero'
});

export function formatEur(eur: number): string {
	if (!Number.isFinite(eur)) return '—';
	return EUR_FORMATTER.format(eur);
}

export function formatUsd(usd: number): string {
	if (!Number.isFinite(usd)) return '—';
	return USD_FORMATTER.format(usd);
}

/** Formate un nombre de tokens : 1234567 → "1,2 M". */
export function formatTokens(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '0';
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')} k`;
	return String(Math.round(n));
}

/** Formate une durée en secondes : 510 → "8 min 30 s", 45 → "45 s". */
export function formatDuration(seconds: number | null): string {
	if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—';
	if (seconds < 60) return `${Math.round(seconds)} s`;
	const m = Math.floor(seconds / 60);
	const s = Math.round(seconds % 60);
	return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

/** Formate un timestamp ISO en date+heure FR : "9 mai 14:32". */
export function formatDateTime(iso: string): string {
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '—';
	const date = d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
	const time = d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
	return `${date} ${time}`;
}

/** Formate une variation en pourcentage : 0.124 → "+12.4 %". */
export function formatPercent(ratio: number): string {
	if (!Number.isFinite(ratio)) return '—';
	return PERCENT_FORMATTER.format(ratio);
}

/** Label humain feature. */
export function featureLabel(feature: CostRun['feature']): string {
	switch (feature) {
		case 'veille':
			return 'Veille hebdo';
		case 'signaux':
			return 'Signaux';
		case 'autre':
			return 'Autre';
		default:
			return feature;
	}
}

/** Label humain status avec variant de Badge. */
export function statusLabel(
	status: CostRun['status']
): { label: string; variant: 'success' | 'warning' | 'danger' } {
	switch (status) {
		case 'success':
			return { label: 'Succès', variant: 'success' };
		case 'partial':
			return { label: 'Partiel', variant: 'warning' };
		case 'error':
			return { label: 'Erreur', variant: 'danger' };
	}
}

/**
 * Calcule la clé ISO semaine pour une date donnée. Format `YYYY-Wxx`.
 * Algorithme ISO 8601 standard (jeudi de la semaine = jour de référence).
 */
export function weekKey(date: Date): string {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Agrège les runs par semaine sur les N dernières semaines (ordre chronologique
 * croissant). Inclut les semaines sans run (total_eur=0). Permet à layerchart
 * d'afficher un axe x continu sans gap.
 */
export interface WeekAggregate {
	weekKey: string;
	weekStart: string; // ISO date (lundi)
	totalEur: number;
	totalUsd: number;
	runsCount: number;
	byFeature: Record<CostRun['feature'], number>;
}

export function aggregateByWeek(runs: CostRun[], weeksCount: number = 12, now: Date = new Date()): WeekAggregate[] {
	// Construire les N dernières clés semaine (ordre croissant).
	const buckets: WeekAggregate[] = [];
	for (let i = weeksCount - 1; i >= 0; i--) {
		const ref = new Date(now);
		ref.setUTCDate(ref.getUTCDate() - i * 7);
		const key = weekKey(ref);
		// Lundi de cette semaine ISO
		const dayNum = ref.getUTCDay() || 7;
		const monday = new Date(ref);
		monday.setUTCDate(ref.getUTCDate() - dayNum + 1);
		buckets.push({
			weekKey: key,
			weekStart: monday.toISOString().slice(0, 10),
			totalEur: 0,
			totalUsd: 0,
			runsCount: 0,
			byFeature: { veille: 0, signaux: 0, autre: 0 }
		});
	}

	const byKey = new Map(buckets.map((b) => [b.weekKey, b]));
	for (const r of runs) {
		const k = weekKey(new Date(r.started_at));
		const bucket = byKey.get(k);
		if (!bucket) continue;
		bucket.totalEur += r.total_eur;
		bucket.totalUsd += r.total_usd;
		bucket.runsCount += 1;
		bucket.byFeature[r.feature] = (bucket.byFeature[r.feature] ?? 0) + r.total_eur;
	}
	return buckets;
}

/**
 * Calcule les KPI synthétiques pour le bandeau supérieur : total 30j, total
 * 12 sem, coût moyen par run, variation 7j vs 7j précédent.
 */
export interface CostKpi {
	total30dEur: number;
	total12wEur: number;
	avgRunEur: number;
	trend7dRatio: number; // (current - previous) / previous, NaN si previous=0
	runs30d: number;
}

export function computeKpis(runs: CostRun[], now: Date = new Date()): CostKpi {
	const nowMs = now.getTime();
	const ms30d = 30 * 86400 * 1000;
	const ms7d = 7 * 86400 * 1000;
	const ms14d = 14 * 86400 * 1000;
	const ms84d = 84 * 86400 * 1000;

	let total30d = 0;
	let runs30d = 0;
	let total12w = 0;
	let current7d = 0;
	let previous7d = 0;

	for (const r of runs) {
		const t = Date.parse(r.started_at);
		if (!Number.isFinite(t)) continue;
		const age = nowMs - t;
		if (age <= ms30d) {
			total30d += r.total_eur;
			runs30d += 1;
		}
		if (age <= ms84d) {
			total12w += r.total_eur;
		}
		if (age <= ms7d) {
			current7d += r.total_eur;
		} else if (age <= ms14d) {
			previous7d += r.total_eur;
		}
	}

	const avgRunEur = runs30d > 0 ? total30d / runs30d : 0;
	const trend7dRatio = previous7d > 0 ? (current7d - previous7d) / previous7d : NaN;

	return {
		total30dEur: total30d,
		total12wEur: total12w,
		avgRunEur,
		trend7dRatio,
		runs30d
	};
}

/** Filtre runs par feature, conserve les runs sans feature si feature='all'. */
export function filterRunsByFeature(
	runs: CostRun[],
	feature: 'all' | CostRun['feature']
): CostRun[] {
	if (feature === 'all') return runs;
	return runs.filter((r) => r.feature === feature);
}
