/**
 * Mots-clés de secteur - SOURCE UNIQUE, marque-aware (Run 3 Atelier 209, dette D3).
 *
 * Avant : `SECTEURS_KEYWORDS` en 5 copies dont 3 avaient divergé (zefix/+server, searchch/helpers,
 * google-places/helpers), une copie morte (`config.ts secteurKeywords`) et un mirror d'activités
 * dans ImportModal. Le mot cœur « vitrerie » manquait dans 2 des 3 copies runtime, et zefix
 * matchait SANS strip d'accents (bug latent). Après : une seule table par marque + un seul
 * `detectSecteur(text, marque)` qui normalise le haystack via NFD (accents retirés) ; les mots-clés
 * sont donc écrits en ASCII sans accent (le haystack l'est aussi après `normalizeNFD`).
 *
 * FilmPro = super-ensemble nettoyé des 3 copies runtime (google-places était la plus riche),
 * avec le terme « ingenieur » ré-ajouté et « vitrerie/vitre » présents PARTOUT (cœur de métier).
 * Le classement FilmPro doit rester IDENTIQUE à l'avant-fusion : voir le golden `secteurs.test.ts`.
 *
 * LED = secteurs de LED Studio (enseignes lumineuses, stands, signalétique, événementiel, retail),
 * dérivés du brief LED + de la vérification V2 (sourcing). [À VALIDER PASCAL - contenu métier] :
 * valeurs de départ raisonnables et sourcées, à confirmer au fil de l'usage LED.
 */
import { normalizeNFD } from '$lib/utils/text-normalize';
import type { Marque } from '$lib/marque';

/** Mots-clés en ASCII sans accent (le haystack est normalisé NFD avant matching). */
const FILMPRO_SECTEURS: Record<string, readonly string[]> = {
	construction: ['construction', 'batiment', 'bau', 'genie civil', 'general contractor', 'entreprise generale'],
	architecture: ['architecte', 'architecture', 'architekt', 'architektur', 'bureau d etudes'],
	hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung', 'sanitaire', 'plumber', 'plumbing'],
	electricite: ['electricite', 'elektro', 'electricien', 'electrician', 'electrical'],
	peinture: ['peinture', 'platrerie', 'painter', 'painting', 'maler'],
	renovation: ['renovation', 'transformation', 'umbau'],
	menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei', 'vitrerie', 'vitre', 'roofing', 'roofing contractor', 'toiture', 'etancheite', 'couvreur'],
	ingenieur: ['ingenieur', 'bureau technique', 'ingenieurbuero'],
	regie: ['regie', 'facility', 'immobilier', 'verwaltung', 'real estate', 'real estate agency'],
};

/**
 * LED Studio : enseignes/écrans lumineux, stands & événementiel, signalétique, retail lumineux.
 * [À VALIDER PASCAL] - dérivé du brief LED Studio + V2 (agences événementielles, monteurs de
 * stands, signalétique/enseigne). Mots-clés ASCII sans accent.
 */
const LED_SECTEURS: Record<string, readonly string[]> = {
	// `signaletique` AVANT `enseigne` : « signaletique » ne doit pas être happé par un token
	// d'enseigne. Tokens volontairement spécifiques (pas de « sign » anglais, qui matche « design »).
	signaletique: ['signaletique', 'wayfinding', 'habillage', 'covering', 'vitrophanie'],
	enseigne: ['enseigne', 'neon', 'led', 'lumineux', 'lumineuse'],
	ecran_led: ['ecran led', 'mur led', 'mur d images', 'video wall', 'affichage dynamique', 'digital signage', 'ecran geant', 'ecran video'],
	stand: ['stand', 'montage de stand', 'agencement de stand', 'exhibition', 'stand exposition', 'exposant'],
	evenementiel: ['evenementiel', 'evenement', 'event', 'agence evenementielle', 'scenographie', 'production evenementielle'],
	retail: ['retail', 'commerce', 'magasin', 'boutique', 'vitrine', 'point de vente'],
	publicite: ['publicite', 'publicitaire', 'communication visuelle', 'advertising', 'werbetechnik', 'werbung'],
};

export const SECTEUR_KEYWORDS_BY_MARQUE: Record<Marque, Record<string, readonly string[]>> = {
	filmpro: FILMPRO_SECTEURS,
	led: LED_SECTEURS,
};

/**
 * Détecte un secteur métier depuis un texte libre (nom + occupation/types/catégorie), pour la
 * marque active. Normalise le haystack (NFD, minuscule) puis renvoie le PREMIER secteur dont un
 * mot-clé est contenu. `null` si aucun match. Déterministe (ordre d'insertion des clés).
 */
export function detectSecteur(text: string | null | undefined, marque: Marque): string | null {
	const haystack = normalizeNFD(String(text ?? ''));
	if (!haystack) return null;
	const table = SECTEUR_KEYWORDS_BY_MARQUE[marque] ?? FILMPRO_SECTEURS;
	for (const [secteur, kws] of Object.entries(table)) {
		if (kws.some((kw) => haystack.includes(kw))) return secteur;
	}
	return null;
}
