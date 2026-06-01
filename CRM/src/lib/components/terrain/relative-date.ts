/**
 * Date relative courte FR pour la ligne de contexte d'une `AFaireRow`
 * (« relance le {date relative} »). Lisibilité terrain : libellés courts,
 * jamais une date technique brute. Pur, testable hors DOM (Vitest).
 */

/** Nombre de jours calendaires entre deux dates (ignore l'heure). */
function dayDiff(target: Date, now: Date): number {
	const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
	const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	return Math.round((a - b) / 86_400_000);
}

/**
 * Rend une date (ISO `YYYY-MM-DD` ou Date) en libellé relatif court.
 * - aujourd'hui / hier / demain
 * - 2-6 jours passés → « il y a N j »
 * - 2-6 jours futurs → « dans N j »
 * - au-delà → date courte « JJ.MM »
 * Renvoie '' si l'entrée est invalide.
 */
export function formatRelativeDate(input: string | Date | null | undefined, now: Date = new Date()): string {
	if (!input) return '';
	const d = input instanceof Date ? input : new Date(input + 'T00:00:00');
	if (Number.isNaN(d.getTime())) return '';
	const diff = dayDiff(d, now);
	if (diff === 0) return "aujourd'hui";
	if (diff === -1) return 'hier';
	if (diff === 1) return 'demain';
	if (diff < 0 && diff >= -6) return `il y a ${-diff} j`;
	if (diff > 0 && diff <= 6) return `dans ${diff} j`;
	// Au-delà d'une semaine : date courte JJ.MM (et jour si proche année courante).
	const jj = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	return `${jj}.${mm}`;
}
