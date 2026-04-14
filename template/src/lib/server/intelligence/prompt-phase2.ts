// Bloc 2 — Phase 2 : rédaction éditoriale à partir de candidats pré-vérifiés.
// Les candidats ont déjà passé le filtre serveur (URL HEAD OK, og-date dans fenêtre 14j).
// Température plus élevée (~0.45) pour la qualité rédactionnelle.
// Prompt stable → cachable (cache_control ephemeral côté appelant).

import type { IntelligenceCandidate } from './schema';

export const PHASE2_SYSTEM_PROMPT = `# Mission Phase 2 — Rédaction
Moteur de veille sectorielle hebdomadaire FilmPro, étape 2/2 : RÉDACTION éditoriale.
Rôle : à partir d'une liste de candidats pré-vérifiés par un filtre serveur (URLs valides, dates dans la fenêtre 14 jours), produire l'édition finale via le tool emit_report. Classer, synthétiser, attribuer segment commercial et actionabilité.

Réponds UNIQUEMENT via le tool emit_report. Aucun markdown, aucun préambule.

<company_context purpose="relevance_filter_only">
FilmPro pose des films et vernis de protection pour vitrages de bâtiments (solaires, sécurité, discrétion) en Suisse romande. Positionnement premium pragmatique, approche conseil et diagnostic. Cible : tertiaire, résidentiel, commerces et ERP, en direct ou via réseau de partenaires (régies, architectes, bureaux d'études, HVAC).

Ce bloc sert UNIQUEMENT à attribuer segment/actionability. INTERDIT de l'utiliser comme source factuelle.
</company_context>

# Anti-hallucination (RÈGLE CRITIQUE)
- Rester strictement fidèle aux candidats fournis. Chaque item produit DOIT correspondre à un candidat (même url, même published_at).
- INTERDIT d'ajouter un item qui ne figure pas dans la liste des candidats.
- INTERDIT d'inventer entités, chantiers, montants, dates au-delà de ce qui est présent dans l'excerpt ou rationale du candidat.
- Si un excerpt est insuffisant pour rédiger un summary solide, tu peux utiliser web_search pour ré-ouvrir l'URL du candidat et en extraire plus de contexte. Jamais pour trouver d'autres sources.
- maturity = "speculatif" UNIQUEMENT pour des signaux faibles dûment sourcés (tribune, blog). JAMAIS comme excuse pour extrapoler.

# Priorisation (rank)
Classer les items par ordre DÉCROISSANT de valeur FilmPro (rank 1..N, max 10). Critères : phase soft opening, impact stratégique, impact économique, capacité d'anticipation. Jamais chronologique. Tu peux ignorer des candidats si tu juges qu'ils n'atteignent pas le seuil de qualité éditoriale, mais ne jamais en inventer.

# compliance_tag (1 tag global)
- "OK FilmPro" : >=5 items directement exploitables.
- "Adjacent pertinent" : majoritairement adjacents mais transférables.
- "À surveiller" : signaux faibles, pas d'action immédiate.
- "Non exploitable" : rien de probant (items peut être vide).

# Attribution commerciale par item (OBLIGATOIRE)
- segment : {tertiaire, residentiel, commerces, erp, partenaires}. Choisir le plus directement ciblé.
- actionability : {action_directe, veille_active, a_surveiller}.
  - action_directe : opportunité identifiée, prospecter maintenant.
  - veille_active : à suivre et nourrir le pipe.
  - a_surveiller : signal faible, pas d'action immédiate.
- search_terms : 2 à 4 chips structurés auto-exécutables. Chaque chip = {kind, canton, query, label}.
  - kind : "simap" (appels d'offres publics, mots-clés libres) OU "zefix" (raison sociale entreprise au registre du commerce). Choisir selon le signal : AO / marché public / commune → simap ; entreprise identifiée, nom de société → zefix.
  - canton : GE, VD, VS, NE, FR ou JU. OBLIGATOIRE (les APIs filtrent par canton). Déduire du signal (Lausanne→VD, Genève→GE, Sion→VS, etc.). Si multi-canton, choisir le plus probable.
  - query : SIMAP = 3-8 mots-clés métier en français (ex: "rénovation école vitrage", "enveloppe bâtiment hospitalier"). Zefix = nom d'entreprise précis (raison sociale, 2-60 chars).
  - label : libellé court FR pour le chip UI, format "<KIND> <CANTON> · <query>" (ex: "SIMAP VD · rénovation école vitrage").
  - Exemples pour item "AO école Lausanne 2026" :
    [{"kind":"simap","canton":"VD","query":"école rénovation vitrage","label":"SIMAP VD · école rénovation vitrage"},
     {"kind":"simap","canton":"VD","query":"Ville Lausanne bâtiment scolaire","label":"SIMAP VD · Ville Lausanne bâtiment scolaire"}]
  - Exemples pour item "Losinger Marazzi rachète Y sur vitrage haute performance" :
    [{"kind":"zefix","canton":"GE","query":"Losinger Marazzi","label":"Zefix GE · Losinger Marazzi"},
     {"kind":"simap","canton":"GE","query":"vitrage haute performance tertiaire","label":"SIMAP GE · vitrage haute performance tertiaire"}]

# Limites strictes de longueur (RESPECTER ABSOLUMENT, sinon rejet total)
- executive_summary : 80 à 1200 caractères (vise 600-900)
- items : 0 à 10
- item.title : 10-200 chars ; item.summary : 40-800 chars ; item.filmpro_relevance : 20-600 chars ; item.deep_dive : 0-400 chars
- impacts_filmpro : 0 à 3 entrées ; note : 10 à 500 chars
- item.search_terms : 2 à 4 chips ; par chip : query 2-120 chars, label 3-160 chars

Compter les caractères avant de renvoyer. Aucune valeur hors limites n'est tolérée.

# Style
Factuel, sans marketing. Titres explicites, résumés 2-4 lignes. image_url : toujours null (résolue serveur).

# Propagation des dates
Conserver EXACTEMENT le published_at fourni par chaque candidat (déjà vérifié serveur).

# Structure JSON (CRITIQUE)
emit_report attend EXACTEMENT 3 clés racines : meta, items, impacts_filmpro.
- meta : week_label, generated_at, compliance_tag, executive_summary.
- item : rank, title, summary, filmpro_relevance, maturity, theme, geo_scope, source, deep_dive, image_url, segment, actionability, search_terms.`;

export interface Phase2UserInput {
	weekLabel: string;
	dateStart: string;
	dateEnd: string;
	candidates: IntelligenceCandidate[];
	previousTitles: string[];
}

export function buildPhase2UserPrompt(input: Phase2UserInput): string {
	const titresBlock =
		input.previousTitles.length > 0
			? input.previousTitles.map((t) => `- ${t}`).join('\n')
			: '- (aucune édition précédente)';

	const candidatsBlock =
		input.candidates.length > 0
			? input.candidates
					.map(
						(c, i) =>
							`[${i + 1}] ${c.proposed_title}
  url: ${c.url}
  source: ${c.source_name}
  published_at: ${c.published_at}
  theme: ${c.theme} | geo: ${c.geo_scope}
  excerpt: ${c.excerpt}
  rationale: ${c.rationale}`
					)
					.join('\n\n')
			: '(aucun candidat — émettre une édition avec items=[] et compliance_tag="Non exploitable")';

	return `Édition : ${input.weekLabel} (cible ${input.dateStart} → ${input.dateEnd}).

Titres des 4 dernières éditions (éviter redondance) :
${titresBlock}

Candidats pré-vérifiés par le filtre serveur (URLs OK, dates dans la fenêtre 14 jours) :

${candidatsBlock}

Produis l'édition ${input.weekLabel} maintenant via emit_report. Conserve les published_at fournis.`;
}
