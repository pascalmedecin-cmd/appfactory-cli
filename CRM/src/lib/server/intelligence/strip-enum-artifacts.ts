/**
 * Nettoyeur déterministe des « artefacts d'enum » dans la prose générée par le LLM,
 * AVANT persistance DB. Symétrique de dedash.ts / strip-citations.ts (même chaîne
 * de sanitation post-LLM, « invariant dur jamais confié au prompt seul »).
 *
 * Problème (observé W25, 2026-06-23) : le modèle dumpe parfois la valeur de
 * classification (actionnabilité, géo, slug de thème) en queue de prose, p.ex.
 *   « …qui reçoivent des demandes de locataires. veille_active. »
 *   « …posés sur vitrages existants. a_surveiller. »
 * Le slug technique snake_case fuit alors à l'écran (commentaire Pascal W25 #1 :
 * « aucun enum brut user-facing, zéro underscore »). Les champs ENUM structurés
 * sont humanisés par veilleFormat.ts, mais un enum NOYÉ dans la prose libre
 * échappe par construction à ce mécanisme : il faut un strip déterministe du texte.
 *
 * PORTÉE STRICTE (corrigée 2026-06-23 après revue adversariale) : on ne strippe QUE
 * les VALEURS D'ENUM RÉELLES connues (liste close dérivée des enums Zod du schéma),
 * restreintes à celles qui contiennent un underscore. Surtout PAS un token snake_case
 * générique : la 1re version le faisait et amputait la terminologie métier vitrage
 * écrite en minuscules avec underscore en fin de phrase (euroclasse feu « b_s1_d0 »,
 * verre « low_e », label « minergie_p », facteur « g_value », marques « saint_gobain »,
 * normes « iso_50001 »…). Un underscore garantit que la valeur n'est jamais un mot
 * français courant ; l'égalité stricte à un enum connu garantit qu'on ne touche
 * jamais un terme métier homonyme.
 *
 * Couverture délibérément restreinte aux champs PROSE narratifs (summary,
 * filmpro_relevance, deep_dive, executive_summary, impacts.note). On ne touche PAS
 * les champs identifiants courts (title, source.name).
 *
 * Garantie zéro-hallu : on ne RETIRE qu'un libellé de classification redondant
 * (déjà porté par le champ enum structuré), jamais un fait, un chiffre, une date,
 * une entité ni un terme métier. Idempotent. Retourne des copies (pas de mutation).
 */
import {
	ActionabilityEnum,
	GeoScopeEnum,
	ImpactAxisEnum,
	SegmentEnum,
	MaturityEnum,
	ThemeEnum,
	ChipKindEnum
} from './schema';

// Liste CLOSE des valeurs d'enum/slug réellement définies, restreinte à celles qui
// contiennent un underscore. Dérivée des enums Zod (source unique) -> drift-proof :
// un nouvel enum à underscore est couvert automatiquement, un mot simple
// (tertiaire, monde, etabli, reglementation, autre…) est exclu et donc protégé.
const ARTIFACT_SLUGS: readonly string[] = [
	...ActionabilityEnum.options,
	...GeoScopeEnum.options,
	...ImpactAxisEnum.options,
	...SegmentEnum.options,
	...MaturityEnum.options,
	...ThemeEnum.options,
	...ChipKindEnum.options
].filter((v) => v.includes('_'));

// Échappe chaque valeur (defense in depth : aucune n'a de métacaractère regex, mais
// on ne fait pas confiance à une source qui pourrait évoluer).
const ARTIFACT_ALT = ARTIFACT_SLUGS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

// Token = une de ces valeurs EXACTES, précédée d'au moins un blanc (jamais en tête de
// champ), suivie d'un point optionnel puis fin de chaîne. Case-sensitive (les slugs
// sont en minuscules ; on n'attrape pas un mot capitalisé homonyme).
const TRAILING_ENUM_RE = new RegExp(`\\s+(?:${ARTIFACT_ALT})\\.?\\s*$`);

export function stripEnumArtifactText(text: string): string;
export function stripEnumArtifactText(text: null): null;
export function stripEnumArtifactText(text: undefined): undefined;
export function stripEnumArtifactText(text: string | null | undefined): string | null | undefined;
export function stripEnumArtifactText(
	text: string | null | undefined
): string | null | undefined {
	if (text === null || text === undefined || text === '') return text;

	// Boucle : strippe d'éventuelles valeurs d'enum terminales empilées
	// (« …sujet. veille_active suisse_romande. »). Idempotent par construction.
	let out = text;
	let prev: string;
	do {
		prev = out;
		out = out.replace(TRAILING_ENUM_RE, '');
	} while (out !== prev);

	// Garde anti-vidage : ne jamais réduire un champ à du vide (cas dégénéré où le
	// champ ne serait QUE des enums + blancs). On préfère garder l'original.
	return out.trim() === '' ? text : out;
}

/**
 * Strip sur les champs PROSE d'un item veille : summary, filmpro_relevance,
 * deep_dive. Ne touche PAS title ni source.name. Retourne une copie.
 */
export function stripEnumArtifactsFromItem<
	T extends {
		summary: string;
		filmpro_relevance: string;
		deep_dive: string | null;
	}
>(item: T): T {
	return {
		...item,
		summary: stripEnumArtifactText(item.summary),
		filmpro_relevance: stripEnumArtifactText(item.filmpro_relevance),
		deep_dive: stripEnumArtifactText(item.deep_dive)
	};
}

/**
 * Strip sur l'édition complète : executive_summary + tous les items + les notes
 * d'impacts_filmpro. Retourne une copie (pas de mutation). Typage lâche pour
 * accepter aussi bien IntelligenceReport que des structures pré/post-Zod.
 */
export function stripEnumArtifactsFromReport<
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
			executive_summary: stripEnumArtifactText(report.meta.executive_summary)
		},
		items: report.items.map((it) => stripEnumArtifactsFromItem(it)),
		impacts_filmpro: report.impacts_filmpro
			? report.impacts_filmpro.map((im) =>
					im && typeof im.note === 'string' ? { ...im, note: stripEnumArtifactText(im.note) } : im
				)
			: report.impacts_filmpro
	};
}
