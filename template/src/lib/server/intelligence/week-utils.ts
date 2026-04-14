// Utilitaires de calcul de semaine ISO 8601 (aligne sur le format "YYYY-Www").

export interface WeekRange {
	weekLabel: string;   // "2026-W15"
	dateStart: string;   // "2026-04-06" (lundi)
	dateEnd: string;     // "2026-04-12" (dimanche)
}

function toIsoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/**
 * Calcule la semaine ISO 8601 d'une date donnee.
 * Semaine commence lundi. Semaine 1 = celle contenant le 4 janvier.
 */
export function getIsoWeek(date: Date): { year: number; week: number } {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { year: d.getUTCFullYear(), week };
}

export function formatWeekLabel(year: number, week: number): string {
	return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Retourne la semaine ISO courante (lundi -> dimanche) a partir de now().
 */
export function currentWeekRange(now: Date = new Date()): WeekRange {
	const { year, week } = getIsoWeek(now);

	// Lundi de la semaine ISO
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() - (dayNum - 1));
	const monday = new Date(d);

	const sunday = new Date(d);
	sunday.setUTCDate(sunday.getUTCDate() + 6);

	return {
		weekLabel: formatWeekLabel(year, week),
		dateStart: toIsoDate(monday),
		dateEnd: toIsoDate(sunday)
	};
}

/**
 * Fenêtre de vérification étendue (tolérance délai d'indexation web_search).
 * Éditorial = 7 jours (dateStart -> dateEnd). Filtre date = dateEnd - (days-1).
 * Par défaut 14 jours : absorbe le retard typique d'indexation sans ouvrir trop large.
 */
export function extendedWindowStart(range: WeekRange, days: number = 14): string {
	const end = new Date(`${range.dateEnd}T00:00:00Z`);
	end.setUTCDate(end.getUTCDate() - (days - 1));
	return toIsoDate(end);
}
