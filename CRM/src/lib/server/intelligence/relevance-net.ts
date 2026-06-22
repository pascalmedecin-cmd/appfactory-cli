// Filet anti-générique DÉTERMINISTE sur `filmpro_relevance` (2026-06-22, Lot 1).
//
// Le « so what » d'un item doit être concret : nommer un SEGMENT cible FilmPro
// (tertiaire, résidentiel, commerces, ERP, partenaires — ou une instance : bureaux,
// hôtels, écoles, régies, architectes...) ET une ACTION commerciale (prospecter,
// relancer, cibler, argumentaire, opportunité, diagnostic...). Un so-what qui ne
// nomme NI segment NI action est générique (« à surveiller pour le marché »).
//
// Politique : RÉTROGRADATION, jamais rejet (on combat la famine, pas le trop-plein).
// Un item générique reçoit une pénalité de rank → il passe derrière les items
// concrets et tombe en premier si l'édition dépasse le cap ; en famine il reste
// publié. La pénalité n'affecte que l'ORDRE (le rank publié est réassigné 1..N en
// aval). Déterministe, zéro appel LLM. Voir refonte-lot1-lot2-spec.md AC-5.

import type { IntelligenceItem } from './schema';

/** Pénalité de rank appliquée à un so-what générique (pousse derrière les concrets). */
export const GENERIC_RANK_PENALTY = 100;

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
 * Applique la rétrogradation aux items dont le so-what est générique. Retourne les
 * items (rank pénalisé pour les génériques) + le nombre rétrogradé (pour log/audit).
 * Ne supprime jamais d'item.
 */
export function demoteGenericRelevance(
	items: IntelligenceItem[]
): { items: IntelligenceItem[]; demotedCount: number } {
	let demotedCount = 0;
	const out = items.map((it) => {
		if (scoreRelevance(it.filmpro_relevance).generic) {
			demotedCount++;
			return { ...it, rank: it.rank + GENERIC_RANK_PENALTY };
		}
		return it;
	});
	return { items: out, demotedCount };
}
