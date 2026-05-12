/**
 * Plan de filtrage PostgREST par température (audit 360 M-52).
 *
 * Le cron `/api/cron/alertes` appliquait deux fois (branche mots-clés / branche count)
 * exactement la même logique « températures → filtre score_pertinence ». Extraite ici en
 * fonction pure testable : `buildScoreFilter` calcule le plan, `applyScoreFilter`
 * (dans `+server.ts`) le traduit en appels `.gte()/.lte()/.or()` sur le query builder.
 *
 * Convention de seuils (alignée `config.scoring.labels`) :
 *   chaud >= chaudMin ; tiede dans [tiedeMin, tiedeMax] ; froid <= froidMax
 *   avec tiedeMax = chaudMin - 1 et froidMax = tiedeMin - 1.
 */

export type ScoreThresholds = {
	chaudMin: number;
	tiedeMin: number;
	tiedeMax: number;
	froidMax: number;
};

export type ScoreFilterPlan =
	| { mode: 'gte'; gte: number }
	| { mode: 'lte'; lte: number }
	| { mode: 'between'; gte: number; lte: number }
	| { mode: 'or'; orExpr: string };

const KNOWN_TEMPS = ['chaud', 'tiede', 'froid'] as const;

/**
 * @returns `null` si aucun filtre ne doit être appliqué (pas de température, ou les 3 →
 *          équivaut à « pas de filtre »), sinon le plan à appliquer au query builder.
 */
export function buildScoreFilter(
	temperatures: readonly string[] | null | undefined,
	t: ScoreThresholds
): ScoreFilterPlan | null {
	if (!temperatures || temperatures.length === 0) return null;
	const selected = temperatures.filter((x) => (KNOWN_TEMPS as readonly string[]).includes(x));
	// On dé-duplique en gardant l'ordre d'apparition.
	const ordered = selected.filter((x, i) => selected.indexOf(x) === i);
	if (ordered.length === 0) return null;
	if (ordered.length >= 3) return null; // les 3 → couvre tout l'intervalle → pas de filtre

	const exprFor = (temp: string): string => {
		if (temp === 'chaud') return `score_pertinence.gte.${t.chaudMin}`;
		if (temp === 'tiede') return `and(score_pertinence.gte.${t.tiedeMin},score_pertinence.lte.${t.tiedeMax})`;
		return `score_pertinence.lte.${t.froidMax}`; // froid
	};

	if (ordered.length === 1) {
		const only = ordered[0];
		if (only === 'chaud') return { mode: 'gte', gte: t.chaudMin };
		if (only === 'tiede') return { mode: 'between', gte: t.tiedeMin, lte: t.tiedeMax };
		return { mode: 'lte', lte: t.froidMax }; // froid
	}

	return { mode: 'or', orExpr: ordered.map(exprFor).join(',') };
}
