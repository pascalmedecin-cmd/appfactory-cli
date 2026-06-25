/**
 * Helpers PURS du Dashboard temporel « façon Capsule » (Vague 3.3, flag ffCrmListesV2).
 *
 * L'accueil ouvre sur « ce qui presse » groupé dans le temps (en retard / aujourd'hui /
 * cette semaine), au lieu d'un mur de chiffres. La source = les relances dues sur
 * opportunités (ADR-0005 : pas de faux agenda, uniquement des données réelles).
 *
 * Aucune dépendance DOM : tout est testable. Le tri/bucketing repose sur la comparaison
 * lexicographique des dates ISO (`YYYY-MM-DD`), équivalente à l'ordre chronologique et
 * insensible au fuseau (pas de `new Date(iso)` pour les bornes).
 */

/** Une tâche = une relance/opportunité due, telle que chargée par le `load` du dashboard. */
export type TacheDue = {
	id: string;
	titre: string | null;
	etape_pipeline: string | null;
	date_relance_prevue: string | null;
	/** Nom de l'entreprise rattachée (embed PostgREST to-one), ou null. */
	entreprise: { raison_sociale: string | null } | null;
};

export type TacheBuckets = {
	late: TacheDue[];
	today: TacheDue[];
	week: TacheDue[];
};

export type DueKind = 'late' | 'today' | 'week';

/**
 * Répartit les tâches dues en 3 paniers temporels par rapport à `todayIso`.
 * - late : échéance strictement avant aujourd'hui
 * - today : échéance aujourd'hui
 * - week : échéance après aujourd'hui (déjà bornée à la fin de semaine par la requête)
 *
 * Les tâches sans date sont ignorées (impossible de les situer dans le temps).
 * L'ordre d'entrée est préservé dans chaque panier (le `load` trie déjà par date asc).
 */
export function bucketTaches(taches: readonly TacheDue[], todayIso: string): TacheBuckets {
	const today = dateOnly(todayIso);
	const buckets: TacheBuckets = { late: [], today: [], week: [] };
	for (const t of taches) {
		if (!t.date_relance_prevue) continue;
		const d = dateOnly(t.date_relance_prevue);
		if (!d) continue;
		if (d < today) buckets.late.push(t);
		else if (d === today) buckets.today.push(t);
		else buckets.week.push(t);
	}
	return buckets;
}

/**
 * Réduit une valeur ISO à sa partie date `YYYY-MM-DD`. La colonne `date_relance_prevue`
 * est un `timestamptz` : PostgREST renvoie `2026-06-25T00:00:00+00:00`, pas une date nue.
 * Sans cette normalisation, la comparaison lexicographique d'égalité (`=== today`) échoue
 * et une échéance du jour bascule à tort dans « cette semaine ».
 */
function dateOnly(iso: string): string {
	return iso.slice(0, 10);
}

/** Parse une date ISO `YYYY-MM-DD` en Date locale à minuit (évite les décalages de fuseau). */
function parseIsoLocal(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return null;
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/**
 * Libellé d'échéance compact pour une tâche, dans le style du golden Capsule :
 * - en retard : « hier » / « il y a N j »
 * - aujourd'hui : « Aujourd'hui »
 * - cette semaine : « demain » / « ven. 20 »
 *
 * `now` est injectable pour des tests déterministes.
 */
export function dueLabel(
	dateIso: string | null,
	todayIso: string,
	now: Date = new Date()
): { text: string; kind: DueKind } {
	if (!dateIso) return { text: '', kind: 'week' };
	const day = dateOnly(dateIso);
	const today = dateOnly(todayIso);

	if (day < today) {
		const days = wholeDaysBetween(today, day, now);
		if (days <= 1) return { text: 'hier', kind: 'late' };
		return { text: `il y a ${days} j`, kind: 'late' };
	}

	if (day === today) return { text: "Aujourd'hui", kind: 'today' };

	const days = wholeDaysBetween(day, today, now);
	if (days === 1) return { text: 'demain', kind: 'week' };
	const d = parseIsoLocal(day);
	if (!d) return { text: '', kind: 'week' };
	return { text: `${JOURS_COURTS[d.getDay()]} ${d.getDate()}`, kind: 'week' };
}

/** Nombre entier de jours entre deux dates ISO (|a - b|), via parsing local à minuit. */
function wholeDaysBetween(aIso: string, bIso: string, now: Date): number {
	const a = parseIsoLocal(aIso);
	const b = parseIsoLocal(bIso);
	if (!a || !b) return 0;
	void now; // signature homogène (réservé si une logique horaire devient nécessaire)
	return Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

/** Date ISO (`YYYY-MM-DD`) de la fin de la semaine courante (dimanche inclus) à partir d'`isoDay`. */
export function endOfWeekIso(isoDay: string): string {
	const d = parseIsoLocal(isoDay);
	if (!d) return isoDay;
	const jsDay = d.getDay(); // 0 = dimanche … 6 = samedi
	const offset = jsDay === 0 ? 0 : 7 - jsDay;
	d.setDate(d.getDate() + offset);
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const da = String(d.getDate()).padStart(2, '0');
	return `${y}-${mo}-${da}`;
}

/**
 * Date ISO (`YYYY-MM-DD`) du lendemain d'`isoDay`. Sert de borne supérieure EXCLUSIVE côté
 * serveur (`.lt`) : `date_relance_prevue` étant un timestamptz, une échéance le dernier jour
 * à une heure > minuit serait exclue par un `.lte(weekEnd)` ; `< (weekEnd + 1 j)` la capture.
 */
export function nextDayIso(isoDay: string): string {
	const d = parseIsoLocal(isoDay);
	if (!d) return isoDay;
	d.setDate(d.getDate() + 1);
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const da = String(d.getDate()).padStart(2, '0');
	return `${y}-${mo}-${da}`;
}

/** Titre d'action affiché sur une tâche : le titre de l'opportunité, sinon un repli neutre. */
export function tacheTitre(t: TacheDue): string {
	const titre = t.titre?.trim();
	if (titre) return titre;
	const ent = t.entreprise?.raison_sociale?.trim();
	return ent ? `Relancer ${ent}` : 'Relance à faire';
}
