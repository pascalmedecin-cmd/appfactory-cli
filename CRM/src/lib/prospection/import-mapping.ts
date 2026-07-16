/**
 * Mapping assisté des colonnes d'un fichier importé → champs CRM (Run 3 Atelier 209, étape 2).
 *
 * Pur, partagé client + serveur. Le client propose une correspondance (auto-reconnaissance des
 * en-têtes, insensible casse/accents/espaces), l'opérateur l'ajuste, PUIS le serveur applique le
 * mapping validé aux lignes. Le canton n'est JAMAIS un champ mappable : il est déduit du NPA
 * (`npa-canton.ts`), le fichier n'ayant pas de colonne canton (cf. vraies listes de Pascal).
 *
 * Reconnaissance = match EXACT sur en-tête normalisé (NFD, minuscule, ponctuation→espace,
 * espaces compactés) contre une table de synonymes. Volontairement strict : « NOTE GOOGLE » ou
 * « PLACE ID » ne matchent rien → colonne ignorée (défaut sûr, pas de faux positif silencieux).
 */
import { normalizeNFD } from '$lib/utils/text-normalize';

/** Clé d'un champ CRM cible de l'import (sous-ensemble de `prospect_leads`). */
export type ImportFieldKey =
	| 'raison_sociale'
	| 'adresse'
	| 'npa'
	| 'localite'
	| 'telephone'
	| 'secteur_detecte'
	| 'site_web'
	| 'email';

export interface ImportFieldDef {
	key: ImportFieldKey;
	/** Libellé affiché dans la colonne « champ CRM » de l'étape 2. */
	label: string;
	required: boolean;
}

/** Champs CRM proposés au mapping, dans l'ordre d'affichage. `raison_sociale` seul est requis. */
export const CRM_IMPORT_FIELDS: readonly ImportFieldDef[] = [
	{ key: 'raison_sociale', label: 'Raison sociale', required: true },
	{ key: 'adresse', label: 'Adresse', required: false },
	{ key: 'npa', label: 'Code postal (NPA)', required: false },
	{ key: 'localite', label: 'Localité', required: false },
	{ key: 'telephone', label: 'Téléphone', required: false },
	{ key: 'secteur_detecte', label: 'Secteur', required: false },
	{ key: 'site_web', label: 'Site web', required: false },
	{ key: 'email', label: 'E-mail', required: false },
];

const IMPORT_FIELD_KEYS = new Set<string>(CRM_IMPORT_FIELDS.map((f) => f.key));

/** true si `k` est une clé de champ CRM importable (garde côté serveur). */
export function isImportFieldKey(k: unknown): k is ImportFieldKey {
	return typeof k === 'string' && IMPORT_FIELD_KEYS.has(k);
}

/** Synonymes d'en-têtes (déjà normalisés) → champ CRM. Match exact sur en-tête normalisé. */
const HEADER_SYNONYMS: Record<ImportFieldKey, readonly string[]> = {
	raison_sociale: [
		'nom', 'raison sociale', 'entreprise', 'societe', 'company', 'company name', 'name',
		'denomination', 'raison', 'nom entreprise', 'nom de l entreprise', 'etablissement',
	],
	adresse: [
		'adresse', 'adresse complete', 'adresse postale', 'rue', 'address', 'street', 'street address',
		'adresse rue',
	],
	npa: ['npa', 'code postal', 'code postal npa', 'np', 'cp', 'zip', 'zip code', 'plz', 'postal code'],
	localite: ['ville', 'localite', 'commune', 'city', 'lieu', 'town', 'localite ville', 'ort'],
	telephone: [
		'telephone', 'tel', 'phone', 'numero', 'numero de telephone', 'mobile', 'phone number',
		'telefon', 'no tel', 'tel fixe',
	],
	secteur_detecte: [
		'categorie', 'secteur', 'type', 'activite', 'category', 'rubrique', 'branche', 'metier',
		'domaine', 'type d activite',
	],
	site_web: ['site web', 'website', 'url', 'site', 'web', 'site internet', 'internet', 'homepage'],
	email: ['email', 'emails', 'e mail', 'courriel', 'mail', 'adresse email', 'adresse e mail', 'e mails'],
};

/** Index inverse en-tête normalisé → champ (construit une fois). */
const SYNONYM_TO_FIELD = new Map<string, ImportFieldKey>();
for (const [field, syns] of Object.entries(HEADER_SYNONYMS) as [ImportFieldKey, readonly string[]][]) {
	for (const s of syns) if (!SYNONYM_TO_FIELD.has(s)) SYNONYM_TO_FIELD.set(s, field);
}

/**
 * Normalise un en-tête pour le matching : NFD (accents retirés), minuscule, ponctuation et
 * séparateurs → espace, espaces compactés, trim. « ADRESSE_COMPLÈTE » → « adresse complete ».
 */
export function normalizeHeader(h: string): string {
	return normalizeNFD(String(h ?? ''))
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

/**
 * Auto-mappe des en-têtes de fichier → champs CRM. Renvoie un tableau ALIGNÉ sur `headers`
 * (index i = champ suggéré pour la colonne i, ou `null` = « ne pas importer »). Un même champ
 * n'est attribué qu'à UNE colonne (la première qui matche ; les colonnes suivantes du même champ
 * → null), pour ne jamais écraser silencieusement une donnée par une colonne homonyme en double.
 */
export function autoMapColumns(headers: readonly string[]): (ImportFieldKey | null)[] {
	const used = new Set<ImportFieldKey>();
	return headers.map((h) => {
		const field = SYNONYM_TO_FIELD.get(normalizeHeader(h));
		if (field && !used.has(field)) {
			used.add(field);
			return field;
		}
		return null;
	});
}

/** Reconstruit un objet-ligne {champ CRM → valeur} depuis une ligne brute + le mapping colonnes. */
export function applyMapping(
	row: readonly string[],
	mapping: readonly (ImportFieldKey | null)[],
): Partial<Record<ImportFieldKey, string>> {
	const out: Partial<Record<ImportFieldKey, string>> = {};
	for (let i = 0; i < mapping.length; i++) {
		const field = mapping[i];
		if (!field) continue;
		const value = (row[i] ?? '').trim();
		// Première colonne non vide gagne (une même cible mappée 2× ne s'écrase pas avec du vide).
		if (value && !out[field]) out[field] = value;
	}
	return out;
}
