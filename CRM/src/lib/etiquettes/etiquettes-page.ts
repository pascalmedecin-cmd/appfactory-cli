/**
 * Logique PURE de la page « Impression d'étiquettes » (client + testable Vitest).
 *
 * Extraite du composant Svelte (doctrine projet : le métier vit en `.ts` pur testé, le `.svelte`
 * n'est couvert qu'en e2e). Ne dépend d'aucun runtime Svelte ni serveur : filtrage de la liste,
 * résumé de campagne (compteurs de la sous-ligne) et construction des entrées d'étiquette avec le
 * destinataire local (non persisté). Réutilise `adresseStatut` / `toEtiquetteEntry` comme source
 * unique de la complétude postale et du mapping.
 */
import {
	adresseStatut,
	toEtiquetteEntry,
	type ProspectAdresse,
	type EtiquetteEntry
} from './prospect-etiquette';
import type { EtiquetteItem } from './pdf-etiquettes';
import { sortGroupes, SANS_GROUPE_LABEL } from '$lib/campagne-groupes';

/** Compteurs affichés dans la sous-ligne (« N prospects · N adresses complètes · N destinataires »). */
export interface EtiquettesSummary {
	total: number;
	completes: number;
	destinataires: number;
}

/**
 * Résume une campagne pour la sous-ligne. `destinataires` = map id -> texte saisi (état local) ;
 * un destinataire n'est compté que s'il est non vide après trim (blanc = pas renseigné).
 */
export function summarize(
	prospects: readonly ProspectAdresse[],
	destinataires: ReadonlyMap<string, string>
): EtiquettesSummary {
	let completes = 0;
	let renseignes = 0;
	for (const p of prospects) {
		if (adresseStatut(p).complete) completes++;
		if ((destinataires.get(p.id) ?? '').trim()) renseignes++;
	}
	return { total: prospects.length, completes, destinataires: renseignes };
}

export interface FilterOpts {
	/** Texte de recherche (raison sociale / adresse / localité / NPA), insensible à la casse. */
	search?: string;
	/** Inclure les prospects à adresse incomplète (défaut : non -> seules les adresses complètes). */
	includeIncomplete?: boolean;
}

/**
 * Filtre la liste pour l'affichage : d'abord la complétude (les incomplètes sont masquées tant que
 * `includeIncomplete` est faux -> vue « prête à imprimer »), puis la recherche plein-texte. L'ordre
 * d'entrée (trié par raison sociale côté serveur) est préservé.
 */
export function filterProspects(
	prospects: readonly ProspectAdresse[],
	opts: FilterOpts = {}
): ProspectAdresse[] {
	const { search = '', includeIncomplete = false } = opts;
	const q = search.trim().toLowerCase();
	return prospects.filter((p) => {
		if (!includeIncomplete && !adresseStatut(p).complete) return false;
		if (!q) return true;
		return [p.raison_sociale, p.adresse, p.localite, p.npa]
			.filter(Boolean)
			.some((v) => String(v).toLowerCase().includes(q));
	});
}

/**
 * Construit les entrées d'étiquette pour une sélection de prospects, en injectant le destinataire
 * local de chaque ligne. Ordre préservé. C'est la seule fonction qui relie sélection UI -> PDF.
 */
export function buildEtiquetteEntries(
	prospects: readonly ProspectAdresse[],
	destinataires: ReadonlyMap<string, string>
): EtiquetteEntry[] {
	return prospects.map((p) => toEtiquetteEntry(p, destinataires.get(p.id)));
}

/** Groupe minimal côté page (id + nom suffisent au tri et aux intercalaires). */
export interface GroupeLite {
	id: string;
	nom: string;
}
/** Prospect d'étiquette porteur (optionnellement) de son groupe dans la campagne. */
export type ProspectAdresseGroupe = ProspectAdresse & { groupe_id?: string | null };

export { SANS_GROUPE_LABEL };

/**
 * Construit le FLUX d'items de la planche, groupé par catégorie (2026-07-02) :
 *  - aucun groupe défini dans la campagne -> adresses seules, ordre d'entrée (sortie IDENTIQUE
 *    à l'historique : zéro intercalaire) ;
 *  - sinon : groupes en ordre alphabétique fr (même ordre que panneau + PDF liste), chaque
 *    groupe NON VIDE précédé d'un intercalaire à son nom ; les sans-groupe EN FIN, précédés
 *    de l'intercalaire « Sans groupe ». Un groupe sans prospect sélectionné n'émet rien.
 *  - flux continu : l'intercalaire occupe 1 cellule, aucune cellule laissée vide entre les
 *    groupes -> le seul « coût » est 1 étiquette par catégorie représentée.
 * L'ordre d'entrée (tri serveur par raison sociale) est préservé À L'INTÉRIEUR d'un groupe.
 * Choix ASSUMÉ (revue 2026-07-02, L4) : l'intercalaire est émis même quand UN SEUL bucket est
 * représenté - il nomme la pile physique (à quoi correspond ce paquet d'étiquettes), ce n'est
 * pas du gaspillage.
 */
export function buildGroupedEtiquetteItems(
	prospects: readonly ProspectAdresseGroupe[],
	groupes: readonly GroupeLite[],
	destinataires: ReadonlyMap<string, string>
): EtiquetteItem[] {
	if (groupes.length === 0) {
		return prospects.map((p) => ({ kind: 'adresse', entry: toEtiquetteEntry(p, destinataires.get(p.id)) }));
	}
	const items: EtiquetteItem[] = [];
	const pushGroup = (nom: string, members: readonly ProspectAdresseGroupe[]) => {
		if (members.length === 0) return;
		items.push({ kind: 'transition', nom });
		for (const p of members) items.push({ kind: 'adresse', entry: toEtiquetteEntry(p, destinataires.get(p.id)) });
	};
	for (const g of sortGroupes(groupes)) {
		pushGroup(
			g.nom,
			prospects.filter((p) => p.groupe_id === g.id)
		);
	}
	pushGroup(
		SANS_GROUPE_LABEL,
		// Sans groupe = pas de groupe OU groupe inconnu de la liste (lien orphelin défensif).
		prospects.filter((p) => !p.groupe_id || !groupes.some((g) => g.id === p.groupe_id))
	);
	return items;
}
