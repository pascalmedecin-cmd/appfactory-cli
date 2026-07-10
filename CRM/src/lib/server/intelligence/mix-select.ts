// Sélection geo-aware des items publiés (2026-06-22, cause racine baseline : mix
// géo inversé — 77 % monde sur W18-24 alors que la cible est 2/3 local, dérive
// JAMAIS détectée car le cap final était `sort(rank)+slice(10)` aveugle au géo).
//
// Cette sélection :
//  - préserve le mix 2/3 local / 1/3 monde QUAND il y a plus d'items que le cap
//    (sinon, en famine, elle garde TOUT — elle ne force jamais un item inexistant) ;
//  - calcule le mix réel publié + lève un signal de DÉRIVE (canari) si la part
//    locale tombe sous un plancher malgré un volume suffisant pour juger.
//
// « Local » = geo_scope suisse_romande OU suisse (marché national). « Monde » =
// veille tech/concurrentielle globale. Voir refonte-lot1-lot2-spec.md AC-3.

import type { IntelligenceItem } from './schema';

export interface MixReport {
	total: number;
	romande: number;
	suisse: number;
	monde: number;
	local: number;
	/** Part locale (romande+suisse) sur le total publié, 0..1 (0 si total=0). */
	localShare: number;
}

export interface MixSelection {
	selected: IntelligenceItem[];
	mix: MixReport;
	/** true si la part locale publiée est sous le plancher malgré un volume suffisant. */
	drift: boolean;
}

export interface MixOptions {
	/** Cible de part locale (défaut 2/3). */
	localTargetRatio?: number;
	/** Plancher de part locale sous lequel on signale une dérive (défaut 0.30). */
	driftLocalShareFloor?: number;
	/** Nb minimal d'items publiés pour juger d'une dérive (défaut 3). */
	driftMinItems?: number;
}

const DEFAULT_LOCAL_TARGET_RATIO = 2 / 3;
// Plancher de dérive recalibré 0.5 → 0.30 le 2026-07-10 (décision Pascal). La cible
// éditoriale reste 2/3 local, mais le canari ne doit se déclencher que sur une VRAIE
// dérive « tout-monde » (0 % local des semaines W20-W24, baseline 77 % monde = 23 %
// local qui déclenche encore < 0.30), pas sur des semaines à ~38 % jugées de bonne
// qualité (W28 : 3/8 local, contenu monde pertinent). Le ratio géo n'est pas un proxy
// de qualité éditoriale : sous 30 % = édition anormalement peu ancrée, à investiguer.
const DEFAULT_DRIFT_FLOOR = 0.3;
const DEFAULT_DRIFT_MIN_ITEMS = 3;

function isLocal(it: IntelligenceItem): boolean {
	return it.geo_scope === 'suisse_romande' || it.geo_scope === 'suisse';
}

export function computeMix(items: IntelligenceItem[]): MixReport {
	const romande = items.filter((i) => i.geo_scope === 'suisse_romande').length;
	const suisse = items.filter((i) => i.geo_scope === 'suisse').length;
	const monde = items.filter((i) => i.geo_scope === 'monde').length;
	const local = romande + suisse;
	const total = items.length;
	return { total, romande, suisse, monde, local, localShare: total > 0 ? local / total : 0 };
}

/**
 * Sélectionne au plus `cap` items en préservant le mix local/monde, puis re-trie
 * par rank. En famine (items ≤ cap), garde TOUT (aucun item perdu vs l'ancien
 * slice). Ne force jamais un item inexistant : les quotas sont bornés par la
 * disponibilité réelle de chaque groupe + backfill.
 */
export function selectByMix(
	items: IntelligenceItem[],
	cap: number,
	opts: MixOptions = {}
): MixSelection {
	const localRatio = opts.localTargetRatio ?? DEFAULT_LOCAL_TARGET_RATIO;
	const driftFloor = opts.driftLocalShareFloor ?? DEFAULT_DRIFT_FLOOR;
	const driftMinItems = opts.driftMinItems ?? DEFAULT_DRIFT_MIN_ITEMS;

	const byRank = [...items].sort((a, b) => a.rank - b.rank);
	const locals = byRank.filter(isLocal);
	const globals = byRank.filter((it) => !isLocal(it));

	const effectiveCap = Math.min(cap, byRank.length);
	const localQuota = Math.round(effectiveCap * localRatio);
	const globalQuota = effectiveCap - localQuota;

	const takeLocal = Math.min(localQuota, locals.length);
	const takeGlobal = Math.min(globalQuota, globals.length);

	let selected = [...locals.slice(0, takeLocal), ...globals.slice(0, takeGlobal)];

	// Backfill : si un groupe est plus court que son quota, remplir les slots
	// restants avec le reste (par rank), sans jamais dépasser effectiveCap.
	const remaining = effectiveCap - selected.length;
	if (remaining > 0) {
		const pool = [...locals.slice(takeLocal), ...globals.slice(takeGlobal)].sort(
			(a, b) => a.rank - b.rank
		);
		selected = selected.concat(pool.slice(0, remaining));
	}

	selected.sort((a, b) => a.rank - b.rank);

	const mix = computeMix(selected);
	const drift = mix.total >= driftMinItems && mix.localShare < driftFloor;
	return { selected, mix, drift };
}
