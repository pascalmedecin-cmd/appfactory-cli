// Tri d'IMPORTANCE FilmPro DÉTERMINISTE post-LLM (2026-06-22 Lot 1, étendu 2026-06-23
// commentaires Pascal W25 #4+#5).
//
// L'ordre d'affichage des items ne doit plus dépendre du seul `rank` jugé par le LLM
// (mou, dérive constatée : 77 % monde W18-24). On ré-ordonne par une pénalité GRADUÉE,
// déterministe, calculée sur des champs déjà émis par item :
//   - so-what générique (ni segment NI action) : pénalité DOMINANTE (Lot 1) ;
//   - actionability : action_directe (0) < veille_active < a_surveiller ;
//   - geo_scope : suisse_romande (0) < suisse < monde ;
//   - maturity : etabli (0) < emergent < speculatif (la nouveauté produit lointaine recule).
// Effet : un signal LOCAL ACTIONNABLE MÛR remonte ; un « monde + a_surveiller + speculatif »
// (profil Vitro EcoArmor / Fraunhofer jugés peu pertinents par Pascal) redescend.
//
// Politique inchangée : RÉTROGRADATION, JAMAIS rejet (on combat la famine, pas le
// trop-plein). On réécrit le `rank` de chaque item par un rank SYNTHÉTIQUE = pénalité
// d'importance (bandes) * 100 + rank LLM borné (départage à importance égale). Tout le
// reste (selectByMix trie par rank, run-generation réassigne 1..N) fonctionne tel quel.
// Déterministe, zéro appel LLM, zéro impact sur la garde anti-hallu (qui tourne en amont).
// Voir refonte-lot1-lot2-spec.md AC-5 + [[project_veille_commentaires_pascal_w25_2026-06-23]].

import type { IntelligenceItem, Actionability, GeoScope, Maturity } from './schema';

/**
 * Poids de pénalité d'un so-what générique (ni segment ni action). DOMINANT : un item
 * générique passe sous TOUS les items concrets, quel que soit son ancrage local.
 */
export const GENERIC_PENALTY = 100;

// Poids gradués (plus haut = moins important = plus bas dans la liste). Bornés bien
// au-dessous de GENERIC_PENALTY pour que le générique reste toujours dominant, et la
// somme max (4+4+2=10) reste < 100 (une bande d'importance = un cran de 1 dans la somme).
const ACTIONABILITY_WEIGHT: Record<Actionability, number> = {
	action_directe: 0,
	veille_active: 2,
	a_surveiller: 4
};
const GEO_WEIGHT: Record<GeoScope, number> = {
	suisse_romande: 0,
	suisse: 1,
	monde: 4
};
const MATURITY_WEIGHT: Record<Maturity, number> = {
	etabli: 0,
	emergent: 1,
	speculatif: 2
};

// Fallback prudent pour une valeur d'enum inattendue (édition legacy) : traitée comme
// peu importante (poids max de sa catégorie), jamais comme prioritaire.
const ACT_FALLBACK = 4;
const GEO_FALLBACK = 4;
const MAT_FALLBACK = 2;

/** Borne du rank LLM utilisé en départage (à importance égale). Garde les bandes nettes. */
const RANK_TIEBREAK_CAP = 99;

// Matching insensible aux accents et à la casse (substrings de racines).
function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

// Racines de SEGMENTS cibles FilmPro (project_filmpro_metier). Tokens simples : le
// matching est ancré sur une limite de mot (\b) pour éviter les faux positifs de
// sous-chaîne (ex. « erp » dans « interpreter »/« superpose »). « bureau » couvre
// déjà « bureau d'études » (les entrées apostrophe-droite étaient mortes : le modèle
// emploie l'apostrophe typographique, non normalisée).
const SEGMENT_ROOTS = [
	'tertiaire',
	'bureau',
	'hotel',
	'residentiel',
	'commerce',
	'erp',
	'ecole',
	'hopital',
	'musee',
	'regie',
	'gerance',
	'architecte',
	'facadier',
	'hvac',
	'copropriete',
	'collectivite',
	'partenaire',
	'facility'
];

// Racines d'ACTIONS commerciales concrètes.
const ACTION_ROOTS = [
	'prospect',
	'relanc',
	'contacter',
	'cibl',
	'propos',
	'argument',
	'opportunit',
	'devis',
	'diagnostic',
	'demarch',
	'pitch',
	'vente',
	'vendre',
	'offre',
	'rendez-vous',
	'campagne',
	'approch',
	'convertir',
	'lead'
];

export interface RelevanceScore {
	namesSegment: boolean;
	namesAction: boolean;
	generic: boolean;
}

/** Vrai si une racine apparaît en début de mot dans le texte normalisé (anti-faux-positif). */
function matchesAnyRoot(text: string, roots: readonly string[]): boolean {
	return roots.some((r) => new RegExp('\\b' + normalize(r)).test(text));
}

export function scoreRelevance(filmproRelevance: string): RelevanceScore {
	const n = normalize(filmproRelevance ?? '');
	const namesSegment = matchesAnyRoot(n, SEGMENT_ROOTS);
	const namesAction = matchesAnyRoot(n, ACTION_ROOTS);
	return { namesSegment, namesAction, generic: !namesSegment && !namesAction };
}

/**
 * Pénalité d'importance FilmPro d'un item (plus bas = plus important). Somme :
 * générique (dominant) + actionnabilité + ancrage local + maturité. Pure, testable.
 */
export function filmproImportancePenalty(item: IntelligenceItem): number {
	const generic = scoreRelevance(item.filmpro_relevance).generic ? GENERIC_PENALTY : 0;
	const act = ACTIONABILITY_WEIGHT[item.actionability as Actionability] ?? ACT_FALLBACK;
	const geo = GEO_WEIGHT[item.geo_scope as GeoScope] ?? GEO_FALLBACK;
	const mat = MATURITY_WEIGHT[item.maturity as Maturity] ?? MAT_FALLBACK;
	return generic + act + geo + mat;
}

export interface ImportanceOrdering {
	items: IntelligenceItem[];
	/** Nb d'items au so-what générique (pénalité dominante) - pour log/audit, parité Lot 1. */
	demotedCount: number;
	/** Nb d'items dont le rang change vs l'ordre LLM brut - mesure l'effet du tri. */
	reorderedCount: number;
}

/**
 * Ré-ordonne les items par importance FilmPro DÉTERMINISTE. Réécrit chaque `rank` par un
 * rank synthétique = pénalité d'importance * 100 + rank LLM borné (départage à importance
 * égale). L'ordre relatif des items à importance égale reste celui du LLM. Ne supprime
 * JAMAIS d'item (rétrogradation pure). Le rank synthétique est interne : run-generation
 * réassigne 1..N continu avant persistance, donc il ne fuit pas en DB ni au schéma.
 */
export function orderByFilmproImportance(items: IntelligenceItem[]): ImportanceOrdering {
	let demotedCount = 0;
	const out = items.map((it) => {
		if (scoreRelevance(it.filmpro_relevance).generic) demotedCount++;
		const penalty = filmproImportancePenalty(it);
		const tie = Math.min(Math.max(it.rank, 1), RANK_TIEBREAK_CAP);
		return { ...it, rank: penalty * 100 + tie };
	});

	// reorderedCount : nb d'items dont la position change entre l'ordre LLM (rank d'origine)
	// et l'ordre d'importance. Identité = index d'ENTRÉE (unique), pas l'URL : robuste aux
	// ranks LLM dupliqués (le schema n'impose pas l'unicité) et aux URLs partagées. Départage
	// stable par index dans les DEUX tris => reorderedCount=0 ssi l'ordre est réellement
	// inchangé. Métrique de log/audit uniquement (ne pilote ni sélection ni re-rank).
	const llmOrder = items
		.map((it, i) => ({ rank: it.rank, i }))
		.sort((a, b) => a.rank - b.rank || a.i - b.i)
		.map((x) => x.i);
	const newOrder = out
		.map((it, i) => ({ rank: it.rank, i }))
		.sort((a, b) => a.rank - b.rank || a.i - b.i)
		.map((x) => x.i);
	let reorderedCount = 0;
	for (let i = 0; i < newOrder.length; i++) {
		if (newOrder[i] !== llmOrder[i]) reorderedCount++;
	}

	return { items: out, demotedCount, reorderedCount };
}
