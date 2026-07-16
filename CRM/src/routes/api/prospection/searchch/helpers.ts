/**
 * Helpers pour l'import depuis search.ch annuaire pro.
 * Logique pure, testable sans I/O.
 *
 * search.ch tel API : https://tel.search.ch/api/help
 * - 1 000 req/mois (cf. api-limits.ts)
 * - max 20 résultats par requête (paramètre maxnum)
 * - format Atom XML avec namespace tel:
 * - firma=1 filtre les entreprises uniquement (privat=0)
 *
 * Économie quota : terme métier ≥ 3 chars + denylist mots-vides + lieu (canton ou ville) requis.
 */

// Audit 360 H-22 : normalisation NFD centralisée dans `src/lib/utils/text-normalize.ts`.
import { normalizeNFDTrim } from '$lib/utils/text-normalize';
import { detectSecteur } from '$lib/prospection/secteurs';
import type { Marque } from '$lib/marque';

const ALLOWED_CANTONS = new Set(['GE', 'VD', 'VS', 'NE', 'FR', 'JU']);

/**
 * Mots-vides légaux qui retourneraient des milliers de résultats sans valeur métier.
 * Refusés en validation : recherche "SA" sur Genève = ~80 000 entreprises.
 * Liste insensible à la casse + accents normalisés.
 */
const GENERIC_TERM_DENYLIST = new Set([
	'sa', 'sarl', 'sa rl', 'sasu',
	'sàrl', 'srl',
	'gmbh', 'ag', 'kg', 'ohg',
	'ltd', 'llc', 'inc',
	'societe', 'societé', 'company', 'compagnie',
	'entreprise', 'firma',
]);

/**
 * Normalise un terme pour matching denylist : strip accents + lowercase + trim.
 * Alias public de `normalizeNFDTrim` (audit 360 H-22, source unique).
 */
export const normalizeTerm = normalizeNFDTrim;

/**
 * Refuse un terme générique (mot-vide légal) qui ferait exploser le quota.
 * Retourne true si le terme est dans la denylist, false sinon.
 */
export function isGenericTerm(s: string): boolean {
	const norm = normalizeTerm(s);
	return GENERIC_TERM_DENYLIST.has(norm);
}

export type SearchChImportInput = {
	/** Terme métier obligatoire (≥ 3 chars, hors denylist). Cherché par search.ch dans nom + activité. */
	term: string;
	/** Canton CH romand (GE, VD, VS, NE, FR, JU). */
	canton: string;
	/** Ville/NPA optionnelle pour affiner la recherche dans le canton. null si non précisée. */
	ville: string | null;
	/** Trace optionnelle vers l'item Veille source (UUID). null si pas de signal source. */
	from_intelligence: string | null;
	/** Trace optionnelle vers le terme de recherche Veille. null si pas de signal source. */
	from_term: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ValidationResult =
	| { valid: true; input: SearchChImportInput }
	| { valid: false; error: string };

/**
 * Valide le payload d'entrée. Tout passe ou rien (pas de fix-up silencieux).
 */
export function validateSearchChImportInput(body: unknown): ValidationResult {
	if (!body || typeof body !== 'object') {
		return { valid: false, error: 'Payload invalide.' };
	}
	const b = body as Record<string, unknown>;

	const termRaw = typeof b.term === 'string' ? b.term.trim() : '';
	if (termRaw.length < 3) {
		return { valid: false, error: 'Terme requis (au moins 3 caractères).' };
	}
	if (termRaw.length > 100) {
		return { valid: false, error: 'Terme trop long (max 100 caractères).' };
	}
	if (isGenericTerm(termRaw)) {
		return {
			valid: false,
			error: 'Terme trop générique (forme juridique seule). Préciser un secteur (vitrerie, façade, architecte, …).',
		};
	}

	const canton = typeof b.canton === 'string' ? b.canton.toUpperCase() : '';
	if (!ALLOWED_CANTONS.has(canton)) {
		return { valid: false, error: 'Canton requis (GE, VD, VS, NE, FR, JU).' };
	}

	let ville: string | null = null;
	if (typeof b.ville === 'string') {
		const v = b.ville.trim();
		if (v.length > 60) {
			return { valid: false, error: 'Ville trop longue (max 60 caractères).' };
		}
		if (v.length > 0) ville = v;
	}

	const from_intelligence =
		typeof b.from_intelligence === 'string' && UUID_RE.test(b.from_intelligence)
			? b.from_intelligence
			: null;
	const from_term =
		typeof b.from_term === 'string' && b.from_term.length > 0
			? b.from_term.slice(0, 200)
			: null;

	return {
		valid: true,
		input: { term: termRaw, canton, ville, from_intelligence, from_term },
	};
}

/**
 * Construit les query params pour l'API search.ch tel.
 * - was : terme métier (cherché dans nom commercial + occupation)
 * - wo : lieu (ville si fournie, sinon nom canton)
 * - firma=1 : entreprises uniquement
 * - privat=0 : exclut les particuliers
 * - maxnum=20 : cap dur cf. api-limits.ts
 * - lang=fr : noms de canton/ville en français
 */
export function buildSearchChQueryParams(args: {
	term: string;
	canton: string;
	ville: string | null;
	apiKey: string;
}): URLSearchParams {
	const cantonNames: Record<string, string> = {
		GE: 'Genève',
		VD: 'Vaud',
		VS: 'Valais',
		NE: 'Neuchâtel',
		FR: 'Fribourg',
		JU: 'Jura',
	};
	const wo = args.ville ?? cantonNames[args.canton] ?? args.canton;

	return new URLSearchParams({
		was: args.term,
		wo,
		firma: '1',
		privat: '0',
		maxnum: '20',
		lang: 'fr',
		key: args.apiKey,
	});
}

/**
 * Représente une entrée annuaire parsée depuis le flux Atom search.ch.
 * Tous les champs sauf `name` sont optionnels (search.ch ne garantit pas leur présence).
 *
 * Contrat officiel : https://search.ch/tel/api/help
 * - `<tel:id>` : UID stable search.ch (cardinalité 1, ≠ `tel:nopromo` etc.)
 * - `<tel:category>` : rubrique firme, cardinalité N (Vitrerie, Stores, ...)
 * - `<tel:occupation>` : désignation additionnelle (cardinalité 1, rare en firma)
 * - `<tel:extra type="email|website|fax">` : coordonnées additionnelles, cardinalité N
 */
export type SearchChEntry = {
	/** UID stable search.ch (depuis <tel:id>). Null si absent → fallback sur source_id synthétique. */
	telId: string | null;
	/** Raison sociale (depuis <tel:name>, fallback <title>). Obligatoire pour insertion. */
	name: string;
	telephone: string | null;
	adresse: string | null;
	npa: string | null;
	localite: string | null;
	canton: string | null;
	/** Désignation additionnelle (souvent vide en firma=1). */
	occupation: string | null;
	/** Toutes les catégories firme (utilisée pour détection secteur). */
	categories: string[];
	/** Email depuis <tel:extra type="email">. Le suffixe `*` (refus publicité) est strippé. */
	email: string | null;
	/** Website depuis <tel:extra type="website">. Format search.ch : "domain.tld: https://...". */
	website: string | null;
	/** URL page publique search.ch du business. */
	sourceUrl: string | null;
};

/**
 * Décode les entités XML basiques (search.ch n'utilise pas CDATA).
 */
function decodeXmlEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

// Tous les tags utilisés par parseSearchChImportFeed sont des littéraux internes contrôlés
// (jamais user-controlled). Tolérant aux attributs sur le tag d'ouverture (ex: <title type="text">)
// que search.ch publie sur title/link/etc.
function extractTag(xml: string, tag: string): string | null {
	const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]+)<\\/${tag}>`);
	const m = xml.match(re);
	return m ? decodeXmlEntities(m[1]).trim() : null;
}

/**
 * Sanitize la clé API search.ch dans les logs et messages d'erreur.
 * search.ch passe la clé en query string (param `key=`) → toute trace réseau peut leak.
 * Patron stricte : `key=...` jusqu'au prochain & ou whitespace ou fin de string.
 */
export function sanitizeApiKeyInLogs(input: string): string {
	if (!input) return input;
	return input.replace(/key=[^&\s'"]+/gi, 'key=[REDACTED]');
}

/**
 * Extrait toutes les valeurs de toutes les balises de même nom dans un bloc XML.
 * Utilisé pour les éléments cardinalité N : <tel:category>, <tel:extra>.
 */
function extractAllTags(xml: string, tag: string): string[] {
	const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]+)<\\/${tag}>`, 'g');
	const out: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(xml)) !== null) {
		out.push(decodeXmlEntities(m[1]).trim());
	}
	return out;
}

/**
 * Extrait les éléments `<tel:extra type="..."}>VALEUR</tel:extra>` filtrés par type.
 * Retourne la 1re valeur trouvée (cas typique : 1 email, 1 website par firme).
 */
function extractExtra(xml: string, type: string): string | null {
	const re = new RegExp(
		`<tel:extra\\s+type=["']${type}["']\\s*>([^<]+)<\\/tel:extra>`,
		'i',
	);
	const m = xml.match(re);
	return m ? decodeXmlEntities(m[1]).trim() : null;
}

/**
 * Extrait l'URL <link rel="alternate" type="text/html"> du bloc entry.
 * search.ch publie 1 lien `alternate` text/html par entrée pointant vers la page firme.
 */
function extractAlternateLink(xml: string): string | null {
	const re = /<link\s+(?=[^>]*rel=["']alternate["'])(?=[^>]*type=["']text\/html["'])[^>]*href=["']([^"']+)["'][^>]*\/?>/i;
	const m = xml.match(re);
	return m ? decodeXmlEntities(m[1]).trim() : null;
}

/**
 * Nettoie un email search.ch : strip suffixe `*` (= refus publicité, pas un caractère email valide).
 */
function cleanEmail(raw: string | null): string | null {
	if (!raw) return null;
	const cleaned = raw.replace(/\*+$/, '').trim();
	// Validation minimale : présence d'un @ entouré de caractères.
	return /^.+@.+\..+$/.test(cleaned) ? cleaned : null;
}

/**
 * Extrait l'URL canonique d'un champ website search.ch.
 * Format observé : `"www.example.ch: https://www.example.ch"` ou simplement `"https://..."`.
 */
function cleanWebsite(raw: string | null): string | null {
	if (!raw) return null;
	const httpMatch = raw.match(/https?:\/\/[^\s]+/i);
	if (httpMatch) return httpMatch[0].replace(/[*]+$/, '');
	// Pas d'URL absolue → si on a juste un domaine "www.x.tld", on préfixe https://.
	const domainMatch = raw.match(/(?:^|\s)((?:www\.)?[a-z0-9-]+\.[a-z.]{2,})/i);
	return domainMatch ? `https://${domainMatch[1]}` : null;
}

/**
 * Parse le flux Atom search.ch tel et extrait toutes les entrées entreprises.
 * Robuste aux entrées partielles : skip silencieusement les entries sans `name`.
 *
 * Contrat search.ch : voir https://search.ch/tel/api/help
 */
export function parseSearchChImportFeed(xml: string): SearchChEntry[] {
	if (!xml || typeof xml !== 'string') return [];

	const entries: SearchChEntry[] = [];

	// Découpe par bloc <entry>...</entry>. Robuste aux variantes de whitespace/attributs.
	const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/g;
	let match: RegExpExecArray | null;

	while ((match = entryRe.exec(xml)) !== null) {
		const block = match[1];

		// Nom : <tel:name> canonique, fallback <title>.
		let name = extractTag(block, 'tel:name');
		if (!name) {
			const titleRaw = extractTag(block, 'title');
			if (titleRaw) {
				name = titleRaw.split(/[|,]/)[0].trim();
			}
		}
		if (!name || name.length < 2) continue;

		const telId = extractTag(block, 'tel:id');
		const telephone = extractTag(block, 'tel:phone');
		const street = extractTag(block, 'tel:street');
		const streetNo = extractTag(block, 'tel:streetno');
		const npa = extractTag(block, 'tel:zip');
		const localite = extractTag(block, 'tel:city');
		const canton = extractTag(block, 'tel:canton');
		const occupation = extractTag(block, 'tel:occupation');
		const categories = extractAllTags(block, 'tel:category');

		const adresse = street ? (streetNo ? `${street} ${streetNo}` : street) : null;

		const email = cleanEmail(extractExtra(block, 'email'));
		const website = cleanWebsite(extractExtra(block, 'website'));
		const sourceUrl = extractAlternateLink(block);

		entries.push({
			telId,
			name,
			telephone,
			adresse,
			npa,
			localite,
			canton,
			occupation,
			categories,
			email,
			website,
			sourceUrl,
		});
	}

	return entries;
}

/**
 * Génère un source_id déterministe pour dédup intra-source.
 *
 * - Si `telId` est présent (cas nominal API search.ch) → préfixé `id:` pour traçabilité.
 *   tel:id est un UID hex 16 chars stable côté search.ch, c'est la clé canonique de dédup.
 * - Sinon (XML legacy ou tronqué) → fallback synthétique `{name}|{npa}` (acceptable, cas rare).
 *
 * Tronqué à 80 chars (compat colonne source_id PostgreSQL).
 */
export function buildSourceId(entry: { telId?: string | null; name: string; npa: string | null }): string {
	if (entry.telId && /^[a-f0-9]{8,}$/i.test(entry.telId)) {
		return `id:${entry.telId}`.slice(0, 80);
	}
	const normName = normalizeTerm(entry.name).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	const normNpa = entry.npa?.replace(/\D/g, '').slice(0, 10) || 'unknown';
	return `${normName}|${normNpa}`.slice(0, 80);
}

/**
 * Détecte un secteur métier depuis le nom + occupation + catégories search.ch, pour la marque
 * active. Mots-clés = SOURCE UNIQUE marque-aware (`$lib/prospection/secteurs`, dette D3).
 */
export function detectSecteurFromEntry(entry: {
	name: string;
	occupation: string | null;
	categories?: string[];
}, marque: Marque): string | null {
	const parts = [entry.name, entry.occupation ?? '', ...(entry.categories ?? [])];
	return detectSecteur(parts.join(' '), marque);
}
