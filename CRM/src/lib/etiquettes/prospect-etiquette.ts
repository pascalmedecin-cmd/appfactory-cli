/**
 * Mapping PUR (client + serveur) : prospect d'une campagne -> entrée d'étiquette d'adresse.
 *
 * Source unique de la logique « adresse postale complète » : utilisée à la fois par le panneau
 * de sélection (afficher le badge + cocher par défaut) ET par la construction du PDF (mêmes
 * lignes affichées). Aucune dépendance serveur ici -> importable des deux côtés (doctrine projet
 * « métier en .ts pur testé »).
 *
 * Complétude postale : une enveloppe a besoin d'un nom (toujours présent : `raison_sociale` est
 * NOT NULL), d'une rue ET d'une localité (la ville). Le NPA est souhaitable mais non bloquant
 * (« Genève » seul s'achemine ; il est ajouté au cp/ville s'il existe). Un prospect sans rue ou
 * sans localité est signalé `complete:false` + `manque` -> décoché par défaut côté UI.
 */

/** Adresse d'un prospect telle qu'exposée par l'endpoint Campagnes -> étiquettes. */
export interface ProspectAdresse {
	id: string;
	raison_sociale: string;
	adresse: string | null;
	npa: string | null;
	localite: string | null;
}

/** Les 3 lignes rendues sur une étiquette physique (nom en gras, puis rue, puis cp + ville). */
export interface EtiquetteEntry {
	nom: string;
	rue: string;
	cpVille: string;
}

/** Verdict de complétude postale d'un prospect (pour le badge + la sélection par défaut). */
export interface AdresseStatut {
	complete: boolean;
	/** Champs manquants en clair (« rue », « localité ») pour l'info-bulle du badge. */
	manque: string[];
}

function clean(v: string | null | undefined): string {
	return (v ?? '').trim();
}

/** Verdict de complétude : rue + localité requises ; NPA optionnel. */
export function adresseStatut(p: ProspectAdresse): AdresseStatut {
	const manque: string[] = [];
	if (!clean(p.adresse)) manque.push('rue');
	if (!clean(p.localite)) manque.push('localité');
	return { complete: manque.length === 0, manque };
}

/** Convertit un prospect en entrée d'étiquette (3 lignes). cpVille = « NPA Ville » compacté. */
export function toEtiquetteEntry(p: ProspectAdresse): EtiquetteEntry {
	return {
		nom: clean(p.raison_sociale),
		rue: clean(p.adresse),
		cpVille: `${clean(p.npa)} ${clean(p.localite)}`.replace(/\s+/g, ' ').trim()
	};
}
