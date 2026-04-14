// Verification Zefix des entites suisses revendiquees dans un item.
//
// Sprint 2 P1 anti-hallucination : cas type "Plattix SA" (entreprise inventee
// mais nommee dans un item Suisse). On extrait les candidats entite via un
// heuristique "nom + suffixe corporate suisse" (SA, Sarl, Sarl, GmbH, AG, SAgl,
// Cooperative, Fondation, Association), on interroge Zefix REST, et on flag
// l'item si le candidat est absent de Zefix.
//
// Defensif : si credentials Zefix manquants ou API down, on retourne
// entity_ok=null (inconnu) au lieu de bloquer. Aucun faux positif ne doit
// degrader une edition qui passerait autrement.

import { env } from '$env/dynamic/private';

const ZEFIX_BASE = 'https://www.zefix.admin.ch/ZefixPublicREST/api/v1';
const VERIFY_TIMEOUT_MS = 8000;

// Suffixes corporate suisses (ordre insensible a la casse, frontiere de mot).
// Capture un groupe de 1 a 4 mots Capitalises en amont.
// Base : un mot Capitalise, suivi de 0 a 3 segments "connecteur-optionnel + Mot-Capitalise".
// Connecteurs autorises en minuscules : du, de, des, la, le, d' (pour "Ateliers du Verre SA").
// "et" n'est PAS connecteur : on veut decouper "Acme SA et Beta Sarl" en 2 matches.
const ENTITY_NAME_RE =
	/\b([A-ZÀ-Ü][\p{L}&'.-]+(?:\s+(?:du|de|des|la|le|d')\s+[A-ZÀ-Ü][\p{L}&'.-]+|\s+[A-ZÀ-Ü][\p{L}&'.-]+){0,3})\s+(SA|S\.A\.|Sàrl|Sarl|S\.à\s?r\.l\.|GmbH|AG|SAgl|Coopérative|Cooperative|Fondation|Association)\b/gu;

// Mots-clefs a exclure (bruit : administrations, generiques)
const ENTITY_STOPWORDS = new Set([
	'Confederation',
	'Confédération',
	'Etat',
	'État',
	'Canton',
	'Commune',
	'Ville',
	'Office',
	'Departement',
	'Département',
	'Service'
]);

export interface EntityVerifyResult {
	entity_ok: boolean | null; // null = non teste (creds absents / erreur)
	unverified_entities: string[];
	verified_entities: string[];
}

export function extractEntityCandidates(text: string): string[] {
	const found = new Set<string>();
	for (const match of text.matchAll(ENTITY_NAME_RE)) {
		const base = match[1]?.trim();
		const suffix = match[2]?.trim();
		if (!base || !suffix) continue;
		const firstWord = base.split(/\s+/)[0];
		if (ENTITY_STOPWORDS.has(firstWord)) continue;
		// On normalise le nom complet pour Zefix (nom + suffixe)
		found.add(`${base} ${suffix}`);
	}
	return [...found];
}

async function zefixSearch(
	name: string,
	authHeader: string
): Promise<{ found: boolean; ok: boolean }> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
	try {
		const resp = await fetch(`${ZEFIX_BASE}/company/search`, {
			method: 'POST',
			signal: controller.signal,
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader,
				Accept: 'application/json'
			},
			body: JSON.stringify({ name, activeOnly: false, maxEntries: 5 })
		});
		if (!resp.ok) {
			return { found: false, ok: false };
		}
		const data = (await resp.json()) as unknown;
		const count = Array.isArray(data) ? data.length : 0;
		return { found: count > 0, ok: true };
	} catch {
		return { found: false, ok: false };
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Verifie qu'un texte (title + summary + deep_dive) mentionnant des entites
 * suisses correspond bien a des entites reellement inscrites a Zefix.
 *
 * Retour :
 *  - entity_ok = true  : toutes les entites candidates existent dans Zefix
 *  - entity_ok = false : au moins une entite candidate est absente
 *  - entity_ok = null  : creds manquants ou API indisponible, pas de verdict
 *  - aucune entite candidate detectee : entity_ok = true (rien a verifier)
 */
export async function verifyEntitiesInText(text: string): Promise<EntityVerifyResult> {
	const candidates = extractEntityCandidates(text);
	if (candidates.length === 0) {
		return { entity_ok: true, unverified_entities: [], verified_entities: [] };
	}

	const username = env.ZEFIX_USERNAME;
	const password = env.ZEFIX_PASSWORD;
	if (!username || !password) {
		return { entity_ok: null, unverified_entities: [], verified_entities: [] };
	}

	const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

	const unverified: string[] = [];
	const verified: string[] = [];
	let anyApiError = false;

	for (const candidate of candidates) {
		const { found, ok } = await zefixSearch(candidate, authHeader);
		if (!ok) {
			anyApiError = true;
			continue;
		}
		if (found) verified.push(candidate);
		else unverified.push(candidate);
	}

	// Verdict : si aucune entite verifiee cote API et des erreurs -> null (inconnu)
	if (verified.length === 0 && unverified.length === 0 && anyApiError) {
		return { entity_ok: null, unverified_entities: [], verified_entities: [] };
	}

	return {
		entity_ok: unverified.length === 0,
		unverified_entities: unverified,
		verified_entities: verified
	};
}
