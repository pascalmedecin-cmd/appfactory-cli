/**
 * Nettoyeur déterministe des tirets typographiques (« — ») dans le contenu
 * généré par le LLM, AVANT persistance DB.
 *
 * Pourquoi déterministe et pas seulement le prompt : la règle « pas de tiret
 * cadratin » vit déjà dans prompt.ts (direction éditoriale), mais une consigne
 * LLM n'est jamais fiable à 100 % — un « — » a fui dans le résumé W25 (2026-06-20).
 * Invariant dur (typographie FR) => post-processeur déterministe, jamais confié
 * au prompt seul. Cf. memory/feedback_splitter_deterministe_post_llm.md +
 * règle globale ~/.claude/rules/communication.md (« Pas de tiret long »).
 *
 * Substitution PUREMENT typographique : ne touche aucun chiffre, date, entité ni
 * citation (garantie zéro-hallu intacte — un dash n'est pas un fait). Le
 * hyphen-minus normal `-` (U+002D) n'est JAMAIS modifié (Saint-Gobain, COOL-LITE).
 *
 * Dashes couverts : figure (U+2012), en (U+2013), em/cadratin (U+2014),
 * barre horizontale (U+2015).
 *  - en prose : « A — B » / « A—B »  ->  « A - B » (tiret court espacé)
 *  - en plage numérique : « 2020–2025 » / « 10—12 »  ->  « 2020-2025 » (collé)
 *  - bord de chaîne / de ligne : pas d'espace parasite (« — ouverture » -> « - ouverture »)
 * Idempotent.
 */

// Classe de caractères : figure, en, em, barre.
const DASHES = '‒–—―';
const RANGE_RE = new RegExp(`(\\d)[ \\t]*[${DASHES}][ \\t]*(\\d)`, 'g');
const DASH_RE = new RegExp(`[ \\t]*[${DASHES}][ \\t]*`, 'g');

export function dedashText(text: string): string;
export function dedashText(text: null): null;
export function dedashText(text: undefined): undefined;
export function dedashText(text: string | null | undefined): string | null | undefined;
export function dedashText(text: string | null | undefined): string | null | undefined {
	if (text === null || text === undefined || text === '') return text;

	let out = text;

	// 1. Plages numériques (chiffre <dash> chiffre) -> hyphen collé : « 2020–2025 ».
	//    Passe répétée car les matches consécutifs se chevauchent sur le chiffre partagé.
	let prev: string;
	do {
		prev = out;
		out = out.replace(RANGE_RE, '$1-$2');
	} while (out !== prev);

	// 2. Dashes typographiques restants (prose) -> tiret court espacé, sans espace
	//    parasite en bord de chaîne ou de ligne.
	out = out.replace(DASH_RE, (match, offset: number, full: string) => {
		const before = full[offset - 1];
		const after = full[offset + match.length];
		const atLineStart = offset === 0 || before === '\n';
		const atLineEnd = offset + match.length >= full.length || after === '\n';
		return `${atLineStart ? '' : ' '}-${atLineEnd ? '' : ' '}`;
	});

	// 3. Collapse des espaces horizontaux multiples introduits (jamais les newlines).
	out = out.replace(/[ \t]{2,}/g, ' ');

	return out;
}

/**
 * Dedash sur tous les champs textuels d'un item veille. Couvre title + source.name
 * (que stripCitationsFromItem ne touche pas), en plus de summary/filmpro_relevance/
 * deep_dive. URL jamais touchée. Retourne une copie (pas de mutation).
 */
export function dedashItem<
	T extends {
		title: string;
		summary: string;
		filmpro_relevance: string;
		deep_dive: string | null;
		source: { name: string };
	}
>(item: T): T {
	return {
		...item,
		title: dedashText(item.title),
		summary: dedashText(item.summary),
		filmpro_relevance: dedashText(item.filmpro_relevance),
		deep_dive: dedashText(item.deep_dive),
		source: { ...item.source, name: dedashText(item.source.name) }
	};
}

/**
 * Dedash sur l'édition complète : executive_summary + tous les items + les notes
 * d'impacts_filmpro. Retourne une copie (pas de mutation). Typage lâche pour
 * accepter aussi bien IntelligenceReport que des structures pré/post-Zod.
 */
export function dedashReport<
	T extends {
		meta: { executive_summary: string };
		items: Array<{
			title: string;
			summary: string;
			filmpro_relevance: string;
			deep_dive: string | null;
			source: { name: string };
		}>;
		impacts_filmpro?: Array<{ note?: string }> | null;
	}
>(report: T): T {
	return {
		...report,
		meta: { ...report.meta, executive_summary: dedashText(report.meta.executive_summary) },
		items: report.items.map((it) => dedashItem(it)),
		impacts_filmpro: report.impacts_filmpro
			? report.impacts_filmpro.map((im) =>
					im && typeof im.note === 'string' ? { ...im, note: dedashText(im.note) } : im
				)
			: report.impacts_filmpro
	};
}
