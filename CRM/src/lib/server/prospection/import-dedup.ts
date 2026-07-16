/**
 * Dédup multi-axes de l'import de liste (Run 3 Atelier 209).
 *
 * Pourquoi : la dédup des sources API (`candidate.ts::fetchDedupSets`) ne mord que sur un
 * `source_id` d'API. Un import de liste (source `manuel`) n'en a pas, et l'index
 * `UNIQUE(marque, source, source_id)` ne contraint rien quand `source_id` est NULL (NULLs
 * distincts en Postgres). De plus `normalizeCompanyName` (contactsFormat.ts) GARDE les accents
 * (« Régie » ≠ « Regie ») alors que l'index entreprises DB les retire. Robustesse insuffisante.
 *
 * Mécanisme : un candidat est un DOUBLON s'il correspond à un lead existant de la MÊME marque
 * (tous sources confondus) OU à un autre candidat du même import, sur AU MOINS UN des 4 axes,
 * chacun sur sa clé normalisée (un axe sans valeur exploitable est ignoré pour cette ligne) :
 *
 *   1. Nom + localité (primaire, porté par le source_id synthétique déterministe)
 *   2. Téléphone (national CH, chiffres seuls)
 *   3. E-mail (minuscule, sans accent)
 *   4. Domaine web (hôte seul, sans protocole/www/chemin)
 *
 * Le `source_id` synthétique = hash de l'axe 1 → l'index DB `UNIQUE(marque,'manuel',source_id)`
 * enforce l'axe 1 au niveau base (ré-import idempotent, même en cas de course). Les axes 2-4
 * sont enforced en couche applicative (sets existants + intra-payload).
 *
 * Toutes les fonctions ci-dessous sont PURES et déterministes (stress-testées :
 * `import-dedup.test.ts`). `fetchLeadDedupSets` (I/O) vit dans `import-dedup-server.ts`.
 */

import { createHash } from 'crypto';
import { normalizeNFD, normalizeNFDTrim } from '$lib/utils/text-normalize';

/** Axe sur lequel un doublon a été détecté (priorité de report décroissante). */
export type DedupAxis = 'name_locality' | 'phone' | 'email' | 'domain';

/** Champs métier lus d'une ligne d'import pour construire ses clés de dédup. */
export interface LeadDedupInput {
	raison_sociale: string;
	localite?: string | null;
	npa?: string | null;
	telephone?: string | null;
	email?: string | null;
	site_web?: string | null;
}

/** Clés de dédup d'une ligne (null = axe non exploitable pour cette ligne). */
export interface LeadDedupKeys {
	/** Clé du nom seul (sans localité). '' si le nom ne contient aucun caractère utile. */
	nameKey: string;
	localityKey: string;
	/** Clé de l'axe 1 = nameKey + '|' + localityKey. null si nameKey vide. */
	nameLoc: string | null;
	phone: string | null;
	email: string | null;
	domain: string | null;
}

/** Ensembles de clés existantes, par axe (marque-scopés à la construction). */
export interface LeadDedupSets {
	nameLoc: Set<string>;
	phone: Set<string>;
	email: Set<string>;
	domain: Set<string>;
}

export function emptyDedupSets(): LeadDedupSets {
	return { nameLoc: new Set(), phone: new Set(), email: new Set(), domain: new Set() };
}

/**
 * Formes juridiques suisses/internationales retirées du nom (tokens entiers, après NFD).
 * On ne retire QUE des formes juridiques - jamais des mots génériques (« société »,
 * « entreprise »...) qui distinguent de vraies raisons sociales et sur-fusionneraient.
 */
const LEGAL_FORMS = new Set([
	'sa', 'sarl', 'sagl', 'srl', 'snc', 'sasu', 'sas',
	'gmbh', 'ag', 'kg', 'ohg', 'kgaa',
	'ltd', 'llc', 'inc', 'plc', 'corp',
	'cie', 'co',
]);

/**
 * Normalise une raison sociale en clé de dédup robuste :
 * NFD (accents retirés) + minuscule + retrait des points d'acronymes (s.a.r.l. → sarl) +
 * découpage sur tout non-alphanumérique + retrait des formes juridiques + concaténation.
 * Retourne '' si aucun token utile ne subsiste (nom dégénéré type « SA » seul).
 *
 * « Régie Naef & Cie SA » → « regienaef » ; « MIROITERIE » → « miroiterie ».
 */
export function normalizeLeadName(raison_sociale: string | null | undefined): string {
	const base = normalizeNFD(String(raison_sociale ?? '')).replace(/\./g, '');
	const tokens = base.split(/[^a-z0-9]+/).filter((t) => t.length > 0 && !LEGAL_FORMS.has(t));
	return tokens.join('');
}

/** Clé de localité : NFD + alphanumérique compact. '' si absente. */
export function normalizeLocalityKey(localite: string | null | undefined, npa?: string | null): string {
	const src = String(localite ?? '').trim() || String(npa ?? '').trim();
	return normalizeNFD(src).replace(/[^a-z0-9]/g, '');
}

/**
 * Téléphone → numéro national suisse canonique (chiffres seuls, préfixes pays/0 retirés).
 * « +41 22 839 39 39 » / « 022 839 39 39 » / « 0228393939 » / « 0041 22 ... » → « 228393939 ».
 * null si < 7 chiffres (trop court pour identifier) OU si c'est un numéro de service mutualisé
 * (0800 gratuit, 084x tarif partagé) : ces numéros sont souvent partagés entre succursales /
 * points de vente d'une même enseigne → pas une identité de dédup (sinon fusion de sites distincts).
 */
export function normalizePhoneCH(telephone: string | null | undefined): string | null {
	let d = String(telephone ?? '').replace(/\D/g, '');
	if (d.startsWith('0041')) d = d.slice(4);
	else if (d.startsWith('41') && d.length > 9) d = d.slice(2);
	else if (d.startsWith('0')) d = d.slice(1);
	if (d.length < 7) return null;
	const nat = d.slice(-9);
	if (/^8(00|4\d)/.test(nat)) return null;
	return nat;
}

/**
 * E-mail → forme canonique (minuscule, sans accent, trim). Prend le PREMIER e-mail valide si
 * la cellule en contient plusieurs (séparés par , ; ou espace). null si aucun e-mail valide.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
	const raw = String(email ?? '').trim();
	if (!raw) return null;
	for (const part of raw.split(/[,;\s]+/)) {
		const e = normalizeNFDTrim(part);
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e;
	}
	return null;
}

/**
 * Domaines de plateforme / réseau social / annuaire mutualisés : un même hôte est partagé par des
 * milliers d'entreprises (page Facebook, site `sites.google.com`, fiche `local.ch`...). Il ne DOIT
 * PAS servir de signal d'identité de dédup, sinon 2 sociétés distinctes fusionnent en faux doublon
 * (et l'une est perdue en silence). Comparaison sur l'hôte exact ou un sous-domaine (`x.facebook.com`).
 */
const SHARED_HOST_DOMAINS: readonly string[] = [
	'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'youtube.com',
	'tiktok.com', 'pinterest.com', 'linktr.ee', 'sites.google.com', 'business.site',
	'wixsite.com', 'wixstudio.com', 'jimdosite.com', 'blogspot.com', 'wordpress.com',
	'google.com', 'goo.gl', 'yelp.com', 'tripadvisor.com', 'local.ch', 'search.ch',
];

/**
 * Site web → domaine hôte canonique (sans protocole, www, chemin, requête, port). Minuscule.
 * « https://www.naef.ch/contact » / « naef.ch » / « http://naef.ch/ » → « naef.ch ».
 * null si pas de point (pas un domaine) OU si l'hôte est une plateforme mutualisée (cf. denylist).
 */
export function normalizeDomain(site_web: string | null | undefined): string | null {
	let s = normalizeNFDTrim(String(site_web ?? ''));
	if (!s) return null;
	s = s.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '');
	s = s.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
	if (!s.includes('.') || s.startsWith('.') || s.endsWith('.')) return null;
	if (SHARED_HOST_DOMAINS.some((p) => s === p || s.endsWith('.' + p))) return null;
	return s;
}

/** `source_id` déterministe d'une ligne `manuel` (porte l'axe 1 → idempotence via l'index DB). */
export function syntheticSourceId(nameKey: string, localityKey: string): string {
	const h = createHash('sha256').update(`${nameKey}|${localityKey}`).digest('hex').slice(0, 24);
	return `manuel_${h}`;
}

/** Construit les 4 clés de dédup d'une ligne. */
export function buildLeadDedupKeys(row: LeadDedupInput): LeadDedupKeys {
	const nameKey = normalizeLeadName(row.raison_sociale);
	const localityKey = normalizeLocalityKey(row.localite, row.npa);
	return {
		nameKey,
		localityKey,
		nameLoc: nameKey ? `${nameKey}|${localityKey}` : null,
		phone: normalizePhoneCH(row.telephone),
		email: normalizeEmail(row.email),
		domain: normalizeDomain(row.site_web),
	};
}

/** Ajoute les clés non nulles d'une ligne aux sets (marquage « vu »). */
export function addKeysToSets(sets: LeadDedupSets, keys: LeadDedupKeys): void {
	if (keys.nameLoc) sets.nameLoc.add(keys.nameLoc);
	if (keys.phone) sets.phone.add(keys.phone);
	if (keys.email) sets.email.add(keys.email);
	if (keys.domain) sets.domain.add(keys.domain);
}

export interface DedupDuplicate<T> {
	row: T;
	axis: DedupAxis;
	/** 'existing' = déjà en base (marque) ; 'inline' = doublon d'une ligne précédente du fichier. */
	against: 'existing' | 'inline';
}
export interface DedupInvalid<T> {
	row: T;
	reason: 'empty_name';
}
export interface DedupResult<T> {
	toImport: Array<{ row: T; sourceId: string }>;
	duplicates: Array<DedupDuplicate<T>>;
	invalid: Array<DedupInvalid<T>>;
	stats: { total: number; toImport: number; duplicates: number; invalid: number };
}

/** Ordre de priorité de report d'un doublon (le 1er axe qui matche gagne). */
const AXIS_ORDER: ReadonlyArray<{ axis: DedupAxis; key: keyof LeadDedupKeys }> = [
	{ axis: 'name_locality', key: 'nameLoc' },
	{ axis: 'phone', key: 'phone' },
	{ axis: 'email', key: 'email' },
	{ axis: 'domain', key: 'domain' },
];

/**
 * Orchestration pure et déterministe : classe chaque ligne en `toImport` / `duplicates` /
 * `invalid`. Un doublon est détecté vs les leads existants (marque) OU vs une ligne précédente
 * du même import, sur le 1er axe (dans l'ordre de priorité) dont la clé est déjà connue.
 * Ne mute PAS `existing` ; maintient ses propres sets intra-payload.
 */
export function dedupCandidates<T extends LeadDedupInput>(
	rows: readonly T[],
	existing: LeadDedupSets,
): DedupResult<T> {
	const seen = emptyDedupSets();
	const toImport: Array<{ row: T; sourceId: string }> = [];
	const duplicates: Array<DedupDuplicate<T>> = [];
	const invalid: Array<DedupInvalid<T>> = [];

	for (const row of rows) {
		const keys = buildLeadDedupKeys(row);
		if (!keys.nameLoc) {
			invalid.push({ row, reason: 'empty_name' });
			continue;
		}

		let hit: DedupDuplicate<T> | null = null;
		for (const { axis, key } of AXIS_ORDER) {
			const value = keys[key] as string | null;
			if (!value) continue;
			if (existing[axisSet(axis)].has(value)) { hit = { row, axis, against: 'existing' }; break; }
			if (seen[axisSet(axis)].has(value)) { hit = { row, axis, against: 'inline' }; break; }
		}

		if (hit) {
			duplicates.push(hit);
			continue;
		}

		toImport.push({ row, sourceId: syntheticSourceId(keys.nameKey, keys.localityKey) });
		addKeysToSets(seen, keys);
	}

	return {
		toImport,
		duplicates,
		invalid,
		stats: { total: rows.length, toImport: toImport.length, duplicates: duplicates.length, invalid: invalid.length },
	};
}

/** Mappe un axe vers la clé de son Set (name_locality → nameLoc). */
function axisSet(axis: DedupAxis): keyof LeadDedupSets {
	return axis === 'name_locality' ? 'nameLoc' : axis;
}
