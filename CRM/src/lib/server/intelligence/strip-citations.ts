/**
 * Retire les balises <cite> ... </cite> des résumés veille avant insertion DB.
 *
 * Origine : LLM Anthropic web_search annote certains passages avec un marqueur
 * <cite index="1-15">...</cite> qui n'est pas filtré côté SDK et qui pollue
 * l'affichage côté CRM (lu en HTML brut). On strippe en post-LLM pour ne
 * jamais persister ces marqueurs en DB.
 *
 * Comportement :
 * - balise cite (ouvrante + fermante) : retirée, contenu conservé
 * - imbriquée (cite dans cite) : nettoyée par itération jusqu'à idempotence
 * - multiligne (saut de ligne dans contenu OU attributs) : géré via flag s
 * - attributs variants (index, end, data-*, quotes simples/doubles) : tolérés
 * - balise orpheline (ouvrante sans fermante) : ignorée pour éviter
 *   d'avaler tout le reste du texte (sécurité)
 * - null / undefined / '' : retournés tels quels
 */

// Pattern : <cite ...>...</cite>
//   - i : insensible à la casse (CITE / cite)
//   - s : DOTALL (le . matche \n) → contenus et attributs multilignes
//   - g : remplacer toutes occurrences
//   - [^>]* : attributs (peut être vide), pas de '>' interne
//   - [\s\S]*? : contenu non gourmand (équivaut à .*? avec flag s, doublé pour
//     compatibilité runtimes anciens même si le flag s est utilisé)
const CITE_TAG_RE = /<cite\b[^>]*>([\s\S]*?)<\/cite>/gis;

export function stripCitationTags(text: string): string;
export function stripCitationTags(text: null): null;
export function stripCitationTags(text: undefined): undefined;
export function stripCitationTags(text: string | null | undefined): string | null | undefined;
export function stripCitationTags(
	text: string | null | undefined
): string | null | undefined {
	if (text === null || text === undefined || text === '') return text;

	// Itération jusqu'à idempotence pour gérer les imbrications.
	// Garde-fou anti-boucle : 10 passes maximum (dépasse largement les profondeurs
	// d'imbrication réalistes : Anthropic n'imbrique jamais au-delà de 2-3).
	let current = text;
	for (let i = 0; i < 10; i++) {
		const next = current.replace(CITE_TAG_RE, '$1');
		if (next === current) return next;
		current = next;
	}
	return current;
}

/**
 * Strip cite sur tous les champs textuels d'un IntelligenceItem.
 * Retourne une nouvelle copie (pas de mutation du paramètre).
 *
 * Le typage est volontairement lâche (T extends ...) pour accepter aussi bien
 * IntelligenceItem que des items pré-Zod-parse, des items de DB legacy, ou
 * des items issus de l'addItem manuel (mêmes champs).
 */
export function stripCitationsFromItem<
	T extends {
		summary: string;
		filmpro_relevance: string;
		deep_dive: string | null;
	}
>(item: T): T {
	return {
		...item,
		summary: stripCitationTags(item.summary),
		filmpro_relevance: stripCitationTags(item.filmpro_relevance),
		deep_dive: stripCitationTags(item.deep_dive)
	};
}

/**
 * Strip cite sur l'edition complète : executive_summary + tous les items + les
 * notes d'impacts_filmpro. Retourne une nouvelle copie (pas de mutation du
 * paramètre). Couvre impacts_filmpro[].note en miroir exact de ses deux jumeaux
 * de la même chaîne post-LLM (dedashReport, stripEnumArtifactsFromReport) : un
 * <cite> émis par web_search dans une note d'impact est rendu en clair dans le
 * brief client (email-brief), il doit être strippé comme partout ailleurs.
 */
export function stripCitationsFromReport<
	T extends {
		meta: { executive_summary: string };
		items: Array<{
			summary: string;
			filmpro_relevance: string;
			deep_dive: string | null;
		}>;
		impacts_filmpro?: Array<{ note?: string }> | null;
	}
>(report: T): T {
	return {
		...report,
		meta: {
			...report.meta,
			executive_summary: stripCitationTags(report.meta.executive_summary)
		},
		items: report.items.map((it) => stripCitationsFromItem(it)),
		impacts_filmpro: report.impacts_filmpro
			? report.impacts_filmpro.map((im) =>
					im && typeof im.note === 'string' ? { ...im, note: stripCitationTags(im.note) } : im
				)
			: report.impacts_filmpro
	};
}
