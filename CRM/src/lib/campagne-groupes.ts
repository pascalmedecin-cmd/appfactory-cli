/**
 * Groupes de prospects PAR campagne - logique PURE partagée client + serveur (2026-07-02).
 *
 * Un groupe appartient à UNE campagne ; un prospect appartient à AU PLUS UN groupe par
 * campagne (colonne `groupe_id` sur le lien N-N `prospect_lead_campagnes`). Ce module porte
 * les bornes (source unique, alignées sur le CHECK SQL + le Zod des endpoints) et la logique
 * du panneau : compteurs, filtre, tri, suggestions de pré-remplissage par type Google.
 *
 * `GROUPE_NOM_MAX = 24` n'est PAS arbitraire : borne fixée par stress test de rendu de
 * l'étiquette de transition (Outfit Bold 15 pt, 1 ligne, largeur utile Avery 6122 = 175.75 pt,
 * avances réelles mesurées via jsPDF, 2026-07-02). La changer = refaire le stress test.
 */
import type { Database } from '$lib/database.types';
import type { ProspectCampagne } from '$lib/campagnes';
import { sourceLabel } from '$lib/prospection-utils';

export type CampagneGroupe = Database['public']['Tables']['campagne_groupes']['Row'];

/** Borne du nom de groupe (UI maxlength + Zod + CHECK SQL). Voir en-tête : stress-testée. */
export const GROUPE_NOM_MAX = 24;
/** Garde DoS des assignations bulk (cohérent avec l'échelle mono-tenant du CRM). */
export const MAX_GROUPE_LEAD_IDS = 1000;

/** Filtre de groupe du panneau : id de groupe, 'none' (sans groupe), null (tous). */
export type GroupeFilter = string | 'none' | null;

/** Libellé unique des prospects hors groupe (intercalaire étiquettes + section PDF liste). */
export const SANS_GROUPE_LABEL = 'Sans groupe';

/** « real_estate_agency » -> « Real estate agency » (lisible, sans inventer de traduction). */
export function humanizeGoogleType(t: string): string {
	const s = t.replace(/_/g, ' ').trim();
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Type Google principal d'un prospect (1er de la colonne structurée), ou null. */
export function typePrincipal(p: Pick<ProspectCampagne, 'google_types'>): string | null {
	return p.google_types && p.google_types.length > 0 ? p.google_types[0] : null;
}

/** Tri stable des groupes : alphabétique fr insensible à la casse (même ordre partout : panneau, étiquettes, PDF). */
export function sortGroupes<T extends { nom: string }>(groupes: readonly T[]): T[] {
	return [...groupes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
}

/** Compteurs par groupe (id -> n) + nombre de prospects sans groupe. */
export function groupeCounts(prospects: readonly ProspectCampagne[]): {
	byId: Map<string, number>;
	none: number;
} {
	const byId = new Map<string, number>();
	let none = 0;
	for (const p of prospects) {
		if (p.groupe_id) byId.set(p.groupe_id, (byId.get(p.groupe_id) ?? 0) + 1);
		else none++;
	}
	return { byId, none };
}

/** Applique le filtre de groupe (null = tous ; 'none' = sans groupe). Pur, ordre préservé. */
export function filterByGroupe(list: readonly ProspectCampagne[], filter: GroupeFilter): ProspectCampagne[] {
	if (filter === null) return [...list];
	if (filter === 'none') return list.filter((p) => !p.groupe_id);
	return list.filter((p) => p.groupe_id === filter);
}

/**
 * Suggestion de pré-remplissage du mini-formulaire « + Groupe » : une caractéristique externe
 * détectée parmi les prospects SANS GROUPE de la campagne (type Google principal, ou source
 * d'import pour les non-Google), avec compteur et la liste des leads concernés.
 */
export interface GroupeSuggestion {
	/** Clé stable de la suggestion (`type:real_estate_agency` ou `source:zefix`). */
	key: string;
	/** Libellé humain (« Real estate agency », « Zefix »). */
	label: string;
	count: number;
	leadIds: string[];
}

/**
 * Détecte les suggestions parmi les prospects SANS groupe (le pré-remplissage ne déplace
 * jamais un prospect déjà classé : il partitionne le restant). Tri : compteur décroissant,
 * puis libellé (déterministe). Prospect Google sans types -> compté sous sa source.
 */
export function groupeSuggestions(prospects: readonly ProspectCampagne[]): GroupeSuggestion[] {
	const map = new Map<string, GroupeSuggestion>();
	for (const p of prospects) {
		if (p.groupe_id) continue;
		const type = typePrincipal(p);
		const key = type ? `type:${type}` : `source:${p.source}`;
		const label = type ? humanizeGoogleType(type) : sourceLabel(p.source);
		const s = map.get(key);
		if (s) {
			s.count++;
			s.leadIds.push(p.id);
		} else {
			map.set(key, { key, label, count: 1, leadIds: [p.id] });
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
}
