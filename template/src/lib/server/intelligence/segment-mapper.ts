/**
 * Mapping titre/summary → segment media_library (11 segments).
 *
 * Heuristique keyword-based pour choisir l'image fallback la plus pertinente
 * en fonction du contenu rédactionnel d'un item Veille, plutôt que de se
 * contenter du segment Veille générique (5 segments trop larges).
 *
 * Chaque segment a ses keywords (FR + EN). Score = nb keywords matchés.
 * On retourne le segment au plus haut score, ou null si aucun match.
 */

export type LibSegment =
	| 'securite'
	| 'confort-thermique'
	| 'controle-solaire'
	| 'esthetique'
	| 'discretion'
	| 'confidentialite'
	| 'facade'
	| 'pourquoi-filmpro'
	| 'a-propos'
	| 'partenaires'
	| 'accueil';

/**
 * Keywords par segment. Casse-insensible. Boundaries ignorées (regex \b).
 * Ordre = importance (impacte égalités au tie-break).
 */
const SEGMENT_KEYWORDS: Record<LibSegment, string[]> = {
	securite: [
		'sécurité',
		'securite',
		'anti-vol',
		'antivol',
		'effraction',
		'intrusion',
		'cambriolage',
		'vandalisme',
		'bris de glace',
		'brise glace',
		'sécuritaire',
		'sécurisation',
		'protection mécanique',
		'safety',
		'security',
		'burglary',
		'break-in',
		'shatterproof'
	],
	'confort-thermique': [
		'thermique',
		'isolation',
		'surchauffe',
		'chaleur',
		'climatisation',
		'consommation énergétique',
		'consommation energetique',
		'économies énergie',
		'economies energie',
		'efficacité énergétique',
		'efficacite energetique',
		'thermal',
		'insulation',
		'energy efficiency',
		'overheating',
		'cooling load',
		'roi retrofit',
		'minergie'
	],
	'controle-solaire': [
		'film solaire',
		'films solaires',
		'contrôle solaire',
		'controle solaire',
		'rayonnement',
		'rayons uv',
		'uv',
		'éblouissement',
		'eblouissement',
		'lumière directe',
		'ensoleillement',
		'solar control',
		'sun control',
		'glare',
		'solar film'
	],
	esthetique: [
		'esthétique',
		'esthetique',
		'design',
		'décoratif',
		'decoratif',
		'décoration',
		'décor',
		'ambiance',
		'aspect visuel',
		'aesthetic',
		'decorative',
		'finish'
	],
	discretion: [
		'discrétion',
		'discretion',
		'vis-à-vis',
		'vis a vis',
		'intimité',
		'intimite',
		'opacité',
		'opacite',
		'opaque',
		'dépoli',
		'depoli',
		'voilé',
		'voile',
		'privacy',
		'frosted',
		'opaque film'
	],
	confidentialite: [
		'confidentialité',
		'confidentialite',
		'salle de réunion',
		'salle de reunion',
		'données sensibles',
		'donnees sensibles',
		'rgpd',
		'lpd',
		'protection des données',
		'protection des donnees',
		'confidentiality',
		'confidential',
		'data protection',
		'meeting room'
	],
	facade: [
		'façade',
		'facade',
		'immeuble',
		'bâtiment',
		'batiment',
		'tour de bureaux',
		'gratte-ciel',
		'gratte ciel',
		'rénovation façade',
		'renovation facade',
		'curtain wall',
		'building',
		'high-rise',
		'highrise',
		'skyscraper',
		'office tower'
	],
	'pourquoi-filmpro': [
		'roi',
		'retour sur investissement',
		'amortissement',
		'rentabilité',
		'rentabilite',
		'économies',
		'economies',
		'investissement',
		'certification',
		'certifié',
		'norme',
		'sia',
		'minergie',
		'cost saving',
		'payback',
		'investment'
	],
	'a-propos': [
		'expertise',
		'savoir-faire',
		'savoir faire',
		'équipe',
		'equipe',
		'entreprise',
		'fondateur',
		'historique société',
		'historique societe',
		'expérience métier',
		'experience metier',
		'about us',
		'company',
		'team'
	],
	partenaires: [
		'partenariat',
		'partenaire',
		'collaboration',
		'distributeur',
		'distribution',
		'agréé',
		'agree',
		'certifié partenaire',
		'certifie partenaire',
		'3m',
		'sun-tek',
		'suntek',
		'llumar',
		'partnership',
		'authorized dealer',
		'partner network'
	],
	accueil: [
		'hall d\'accueil',
		'hall accueil',
		'lobby',
		'vitrine commerciale',
		'devanture',
		'entrée',
		'entree',
		'réception',
		'reception',
		'showroom',
		'storefront',
		'shopfront',
		'entrance'
	]
};

/**
 * Normalisation : lowercase, NFD, suppression diacritiques.
 */
function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

/**
 * Compte les occurrences de keywords (matching word-boundary friendly) dans un texte normalisé.
 */
function countMatches(normalizedText: string, keywords: string[]): number {
	let total = 0;
	for (const kw of keywords) {
		const normKw = normalize(kw);
		// Word boundary : on évite de matcher "uv" dans "vue" mais on accepte espaces/punct autour.
		const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'g');
		const m = normalizedText.match(re);
		if (m) total += m.length;
	}
	return total;
}

/**
 * Inférence segment lib depuis titre + summary. Retourne le segment au plus
 * haut score ou null si aucun keyword ne match.
 *
 * Tie-break : ordre de déclaration dans SEGMENT_KEYWORDS (priorité aux segments
 * "métier" sur les segments "marque" pour un contenu hybride).
 */
export function inferSegmentFromText(title: string, summary = ''): LibSegment | null {
	const text = normalize(`${title}\n${summary}`);
	if (!text.trim()) return null;

	let bestSeg: LibSegment | null = null;
	let bestScore = 0;

	for (const [seg, keywords] of Object.entries(SEGMENT_KEYWORDS) as [LibSegment, string[]][]) {
		const score = countMatches(text, keywords);
		if (score > bestScore) {
			bestScore = score;
			bestSeg = seg;
		}
	}

	return bestSeg;
}
