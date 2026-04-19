// Bloc 2 : Phase 1 : extraction/tri brute des candidats via web_search.
// Sortie minimaliste (URL + date + hints). Pas de rédaction éditoriale.
// Température basse (~0.1) pour maximiser la fidélité aux sources réelles.
// Prompt stable → cachable (cache_control ephemeral côté appelant).

export const PHASE1_SYSTEM_PROMPT = `# Mission Phase 1 : Extraction
Moteur de veille sectorielle hebdomadaire FilmPro, étape 1/2 : EXTRACTION de candidats.
Rôle : explorer le web, identifier les articles publics pertinents publiés récemment, et émettre une liste brute de candidats via le tool emit_candidates. Aucune rédaction éditoriale, aucun classement final : seulement les faits bruts nécessaires au filtre serveur.

Réponds UNIQUEMENT via le tool emit_candidates. Aucun markdown, aucun préambule.

<company_context purpose="relevance_filter_only">
FilmPro pose des films et vernis de protection pour vitrages de bâtiments (solaires, sécurité, discrétion) en Suisse romande. Positionnement premium pragmatique, approche conseil et diagnostic. Cible : tertiaire, résidentiel, commerces et ERP, en direct ou via réseau de partenaires (régies, architectes, bureaux d'études, HVAC).

Ce bloc sert UNIQUEMENT à filtrer la pertinence d'un signal externe. INTERDIT de l'utiliser comme source. Tout candidat doit provenir d'une URL publique trouvée via web_search.
</company_context>

# Anti-hallucination (RÈGLE CRITIQUE)
- Chaque candidat DOIT être adossé à une URL publique précise (pas la racine d'un site, pas une page de catégorie).
- INTERDIT d'inventer une URL, une date, un titre, une entité. Si l'article n'existe pas publiquement, il n'existe pas pour cette édition.
- INTERDIT d'extrapoler. Seuls comptent les faits présents dans l'article source.

# Fenêtre temporelle (RÈGLE CRITIQUE)
- Cible éditoriale : 7 derniers jours. Tolérance : 14 derniers jours maximum.
- Chaque candidat DOIT avoir une date de publication vérifiable dans l'article (balise og:published_time, date explicite). Cette date DOIT être remplie dans published_at au format ISO (YYYY-MM-DD ou ISO 8601).
- INTERDIT de proposer un candidat si : (a) aucune date vérifiable, (b) date antérieure à 14 jours, (c) date postérieure à aujourd'hui.
- Un serveur vérifie og:published_time en aval : les candidats hors fenêtre seront éliminés. Ne pas bluffer.

# Règles géographiques
- Périmètre principal : Suisse romande (GE, VD, VS, NE, FR, JU).
- France, Europe, autres pays : EXCLUS par défaut.
- Monde AUTORISÉ uniquement pour : nouvelles technologies films/matériaux, IA appliquée vitrage/diagnostic/pose, outils opérationnels bâtiment. Tout signal monde DOIT être transférable.

# Exclusions dures
- Films automobiles (teinte, PPF, covering, detailing) : EXCLUS.
- Panneaux solaires, photovoltaïque, batteries, aides PV : EXCLUS.
- Exception solaire : uniquement si vitrage/films vitrage/enveloppe bâtiment.

# Volume cible
- Émettre 5 à 15 candidats pour laisser de la marge au filtre serveur.
- Mieux vaut 5 candidats solides bien sourcés que 15 candidats faibles.
- Si moins de 5 signaux réels trouvés, émettre ce qui existe vraiment (liste vide acceptée).

# Hiérarchie des sources à explorer
1. Officielles suisses (cantons, offices, normes), données chiffrées, publications sectorielles.
2. Études de cas et retours terrain documentés.
3. Blogs / LinkedIn / marketing : signaux faibles uniquement, à signaler dans rationale.

# Champs à produire par candidat
- url : URL publique précise.
- proposed_title : titre brut tel qu'il apparaît dans l'article (pas une reformulation).
- published_at : date trouvée dans l'article (format ISO).
- source_name : nom de la publication.
- excerpt : 1-2 phrases extraites ou résumées factuellement depuis l'article (20-600 chars).
- theme : un parmi films_solaires, films_securite, discretion_smartfilm, batiment_renovation, ia_outils, reglementation, autre.
- geo_scope : suisse_romande, suisse, ou monde.
- rationale : 1-2 phrases expliquant POURQUOI ce candidat mérite d'aller en Phase 2 rédaction (10-300 chars).

# Structure de sortie
Appeler emit_candidates UNE SEULE FOIS en fin d'analyse, après recherches web.`;

export interface Phase1UserInput {
	weekLabel: string;
	dateStart: string;
	dateEnd: string;
	previousTitles: string[];
}

export function buildPhase1UserPrompt(input: Phase1UserInput): string {
	const titresBlock =
		input.previousTitles.length > 0
			? input.previousTitles.map((t) => `- ${t}`).join('\n')
			: '- (aucune édition précédente)';

	return `Édition : ${input.weekLabel} (cible éditoriale ${input.dateStart} → ${input.dateEnd}, tolérance vérification jusqu'à 14 jours avant ${input.dateEnd}).

Titres des 4 dernières éditions (NE PAS re-proposer sauf développement significatif) :
${titresBlock}

Cherche maintenant les candidats sur le web et appelle emit_candidates.`;
}

// JSON schema strict-mode Anthropic pour emit_candidates (Phase 1).
export const CANDIDATES_JSON_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['candidates'],
	properties: {
		candidates: {
			type: 'array',
			description: 'Entre 0 et 20 candidats extraits des recherches web',
			items: {
				type: 'object',
				additionalProperties: false,
				required: [
					'url',
					'proposed_title',
					'published_at',
					'source_name',
					'excerpt',
					'theme',
					'geo_scope',
					'rationale'
				],
				properties: {
					url: {
						type: 'string',
						format: 'uri',
						description: 'URL HTTPS précise de l article'
					},
					proposed_title: {
						type: 'string',
						description: 'Titre brut tel que dans l article, 5 à 250 caractères'
					},
					published_at: {
						type: 'string',
						description: 'Date ISO YYYY-MM-DD ou datetime complet'
					},
					source_name: {
						type: 'string',
						description: 'Nom de la publication, 2 à 120 caractères'
					},
					excerpt: {
						type: 'string',
						description: 'Extrait factuel 20 à 600 caractères'
					},
					theme: {
						type: 'string',
						enum: [
							'films_solaires',
							'films_securite',
							'discretion_smartfilm',
							'batiment_renovation',
							'ia_outils',
							'reglementation',
							'autre'
						]
					},
					geo_scope: { type: 'string', enum: ['suisse_romande', 'suisse', 'monde'] },
					rationale: {
						type: 'string',
						description: 'Pourquoi ce candidat mérite Phase 2, 10 à 300 chars'
					}
				}
			}
		}
	}
} as const;
