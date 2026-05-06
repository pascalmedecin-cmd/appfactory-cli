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
 */
export function normalizeTerm(s: string): string {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

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
 */
export type SearchChEntry = {
	/** Raison sociale (depuis <title> ou <tel:name>). Obligatoire pour insertion. */
	name: string;
	telephone: string | null;
	adresse: string | null;
	npa: string | null;
	localite: string | null;
	occupation: string | null;
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
// (jamais user-controlled). Un escape regex full n'est pas nécessaire, mais on garde un
// échappement conservateur sur le `:` du namespace tel: pour les variantes de moteur regex
// (en pratique `:` n'est pas un méta-caractère, c'est cosmétique mais explicite).
function extractTag(xml: string, tag: string): string | null {
	const re = new RegExp(`<${tag}>([^<]+)<\\/${tag}>`);
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
 * Parse le flux Atom search.ch tel et extrait toutes les entrées entreprises.
 * Robuste aux entrées partielles : skip silencieusement les entries sans `name`.
 */
export function parseSearchChImportFeed(xml: string): SearchChEntry[] {
	if (!xml || typeof xml !== 'string') return [];

	const entries: SearchChEntry[] = [];

	// Découpe par bloc <entry>...</entry>. Robust aux variantes de whitespace/attributs.
	const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/g;
	let match: RegExpExecArray | null;

	while ((match = entryRe.exec(xml)) !== null) {
		const block = match[1];

		// Nom : <tel:name> en priorité (forme courte canonique entreprise),
		// fallback sur <title> qui contient parfois "Name | Activité | Lieu".
		let name = extractTag(block, 'tel:name');
		if (!name) {
			const titleRaw = extractTag(block, 'title');
			if (titleRaw) {
				// Titre search.ch typique : "Vitrerie Dupont SA, Genève" ou "Nom | Pro | Canton".
				name = titleRaw.split(/[|,]/)[0].trim();
			}
		}
		if (!name || name.length < 2) continue;

		const telephone = extractTag(block, 'tel:phone');
		const street = extractTag(block, 'tel:street');
		const streetNo = extractTag(block, 'tel:streetno');
		const npa = extractTag(block, 'tel:zip');
		const localite = extractTag(block, 'tel:city');
		const occupation = extractTag(block, 'tel:occupation');

		const adresse = street ? (streetNo ? `${street} ${streetNo}` : street) : null;

		entries.push({
			name,
			telephone,
			adresse,
			npa,
			localite,
			occupation,
		});
	}

	return entries;
}

/**
 * Génère un source_id déterministe pour dédup intra-source.
 * Format : `{name_normalized}|{npa_or_unknown}` tronqué à 80 chars.
 *
 * Note : search.ch n'expose pas d'UID stable, donc cette clé synthétique est nécessaire.
 * Risque résiduel : 2 entreprises homonymes même NPA → fusionnées (acceptable, cas rare).
 */
export function buildSourceId(entry: { name: string; npa: string | null }): string {
	const normName = normalizeTerm(entry.name).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	const normNpa = entry.npa?.replace(/\D/g, '').slice(0, 10) || 'unknown';
	return `${normName}|${normNpa}`.slice(0, 80);
}

/**
 * Détecte un secteur métier depuis le nom + occupation search.ch.
 * Réutilise les keywords d'enrichissement Zefix (cf. zefix endpoint).
 */
const SECTEURS_KEYWORDS: Record<string, string[]> = {
	construction: ['construction', 'batiment', 'bau', 'genie civil'],
	architecture: ['architecte', 'architecture', 'architektur'],
	hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung'],
	electricite: ['electricite', 'elektro', 'electricien'],
	renovation: ['renovation', 'transformation', 'umbau'],
	menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei', 'vitrerie', 'vitre'],
	ingenieur: ['ingenieur', 'bureau technique', 'ingenieurbüro'],
	regie: ['regie', 'facility', 'immobilier', 'verwaltung'],
};

export function detectSecteurFromEntry(entry: { name: string; occupation: string | null }): string | null {
	const haystack = normalizeTerm([entry.name, entry.occupation ?? ''].join(' '));
	for (const [secteur, kws] of Object.entries(SECTEURS_KEYWORDS)) {
		if (kws.some((kw) => haystack.includes(kw))) return secteur;
	}
	return null;
}
