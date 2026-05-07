/**
 * Helpers de formatage de dates relatives pour le dashboard.
 * Pattern : aujourd'hui → "HH:MM", hier → "Hier", cette semaine → "Lun." / "Mar.",
 * sinon → "DD/MM".
 */

const JOURS_COURTS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

/**
 * Date relative format dashboard.
 * - Aujourd'hui : "14:32" (HH:MM)
 * - Hier : "Hier"
 * - 2-6 jours en arrière même semaine : "Lun." (jour court)
 * - Sinon : "DD/MM"
 */
export function formatRelativeDate(input: string | Date | null | undefined, now: Date = new Date()): string {
	if (!input) return '–';
	const d = typeof input === 'string' ? new Date(input) : input;
	if (Number.isNaN(d.getTime())) return '–';

	const today = startOfDay(now);
	const target = startOfDay(d);
	const diffMs = today.getTime() - target.getTime();
	const diffDays = Math.round(diffMs / 86_400_000);

	if (diffDays === 0) {
		return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
	}
	if (diffDays === 1) return 'Hier';
	if (diffDays > 0 && diffDays < 7) return JOURS_COURTS[d.getDay()];
	return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' });
}

/**
 * Délai relance pour relances.
 * - date < today → "Retard Nj"
 * - date == today → "Aujourd'hui"
 * - date == today+1 → "Demain"
 * - sinon → "DD/MM"
 */
export type RelanceUrgency = 'retard' | 'today' | 'demain' | 'futur';

export function formatRelanceDate(input: string | Date | null | undefined, now: Date = new Date()): { label: string; urgency: RelanceUrgency } {
	if (!input) return { label: '–', urgency: 'futur' };
	const d = typeof input === 'string' ? new Date(input) : input;
	if (Number.isNaN(d.getTime())) return { label: '–', urgency: 'futur' };

	const today = startOfDay(now);
	const target = startOfDay(d);
	const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

	if (diffDays < 0) {
		const retard = Math.abs(diffDays);
		return { label: `Retard ${retard}j`, urgency: 'retard' };
	}
	if (diffDays === 0) return { label: "Aujourd'hui", urgency: 'today' };
	if (diffDays === 1) return { label: 'Demain', urgency: 'demain' };
	return {
		label: d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' }),
		urgency: 'futur',
	};
}

/**
 * Extrait un firstName plausible depuis un email.
 * - "pascal.medecin@gmail.com" → "Pascal"
 * - "pascal@filmpro.ch" → "Pascal"
 * - email vide / null / format imprévu → null (caller utilise fallback "Bonjour")
 */
export function firstNameFromEmail(email: string | null | undefined): string | null {
	if (!email) return null;
	const local = email.split('@')[0];
	if (!local) return null;
	const first = local.split(/[._+-]/)[0];
	if (!first || !/^[a-zà-ÿ]+$/i.test(first)) return null;
	return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
