/**
 * Helpers d'agrégation pour la page /reporting.
 *
 * Toutes les fonctions sont pures : elles prennent des rows Supabase
 * déjà récupérés (SELECT côté +page.server.ts) et renvoient des
 * structures immédiatement consommables par les graphiques SVG.
 *
 * Séparer l'agrégation du fetch permet : (1) tests unitaires sans mock
 * Supabase ; (2) réutilisation par un futur dashboard exec.
 */

export interface PipelineRow {
	etape_pipeline: string | null;
	montant_estime: number | string | null;
	date_creation: string | null;
	date_cloture_effective?: string | null;
}

export interface CountByDateRow {
	created_at?: string | null;
	date_creation?: string | null;
}

export interface PipelineEtapeStat {
	etape: string;
	count: number;
	montant_total: number;
}

export interface MonthlyPipelineStat {
	/** Format YYYY-MM */
	month: string;
	count: number;
}

export interface ActivityStats {
	last_30_days: number;
	last_90_days: number;
	total: number;
}

export interface ConversionStats {
	total_leads: number;
	opportunites_depuis_lead: number;
	taux_pct: number;
}

// ---------- Pipeline par étape ----------

/** Agrège les opportunités par `etape_pipeline` (count + somme montants). */
export function aggregatePipelineByEtape(rows: PipelineRow[]): PipelineEtapeStat[] {
	const bucket = new Map<string, { count: number; montant: number }>();
	for (const row of rows) {
		const key = row.etape_pipeline ?? 'inconnu';
		const montant = parseMontant(row.montant_estime);
		const existing = bucket.get(key) ?? { count: 0, montant: 0 };
		existing.count += 1;
		existing.montant += montant;
		bucket.set(key, existing);
	}
	return Array.from(bucket.entries())
		.map(([etape, v]) => ({ etape, count: v.count, montant_total: v.montant }))
		.sort((a, b) => b.count - a.count);
}

function parseMontant(v: unknown): number {
	if (v === null || v === undefined) return 0;
	const n = typeof v === 'number' ? v : parseFloat(String(v));
	return Number.isFinite(n) ? n : 0;
}

// ---------- Activité par période ----------

/**
 * Compte les enregistrements créés dans les 30 et 90 derniers jours.
 * Utilise `created_at` sinon `date_creation` comme clé.
 */
export function aggregateActivity(
	rows: CountByDateRow[],
	now: Date = new Date()
): ActivityStats {
	const nowMs = now.getTime();
	const d30 = nowMs - 30 * 24 * 60 * 60 * 1000;
	const d90 = nowMs - 90 * 24 * 60 * 60 * 1000;

	let count30 = 0;
	let count90 = 0;
	for (const row of rows) {
		const dateStr = row.created_at ?? row.date_creation;
		if (!dateStr) continue;
		const ms = Date.parse(dateStr);
		if (!Number.isFinite(ms)) continue;
		if (ms >= d30) count30 += 1;
		if (ms >= d90) count90 += 1;
	}
	return { last_30_days: count30, last_90_days: count90, total: rows.length };
}

// ---------- Pipeline mensuel (12 derniers mois) ----------

/**
 * Regroupe les opportunités par mois de création (YYYY-MM).
 * Retourne les `monthsWindow` derniers mois (inclus mois en cours),
 * même vides (comptage 0).
 */
export function aggregateMonthlyPipeline(
	rows: PipelineRow[],
	monthsWindow = 12,
	now: Date = new Date()
): MonthlyPipelineStat[] {
	const bucket = new Map<string, number>();
	for (const row of rows) {
		if (!row.date_creation) continue;
		const ms = Date.parse(row.date_creation);
		if (!Number.isFinite(ms)) continue;
		const d = new Date(ms);
		const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
		bucket.set(key, (bucket.get(key) ?? 0) + 1);
	}

	// Générer la liste des N derniers mois inclus (ordre chronologique).
	const result: MonthlyPipelineStat[] = [];
	const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	for (let i = monthsWindow - 1; i >= 0; i--) {
		const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
		const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
		result.push({ month: key, count: bucket.get(key) ?? 0 });
	}
	return result;
}

// ---------- Taux de conversion Leads → Opportunités ----------

/**
 * Taux de conversion : opportunités créées depuis un lead / total leads.
 * Heuristique : une opportunité est "depuis un lead" si son champ
 * `source` (sur l'opportunité) contient 'lead' ou si on a un lien explicite.
 * Ici approximation simple : opportunités créées = proxy conversion.
 */
export function computeConversionRate(
	totalLeads: number,
	opportunitesDepuisLead: number
): ConversionStats {
	const taux = totalLeads > 0 ? (opportunitesDepuisLead / totalLeads) * 100 : 0;
	return {
		total_leads: totalLeads,
		opportunites_depuis_lead: opportunitesDepuisLead,
		taux_pct: Math.round(taux * 10) / 10
	};
}
