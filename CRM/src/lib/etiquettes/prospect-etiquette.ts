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

/**
 * Les lignes rendues sur une étiquette physique : nom en gras, puis (optionnel) le destinataire
 * du mailing « à l'attention de » sous le nom, puis rue, puis cp + ville.
 *
 * `destinataire` est saisi dans l'UI de la page (générique tout mailing, ex. « Service technique »
 * ou « Service technique, M. X ») et n'est **jamais persisté** : il vit dans l'état de la page et
 * n'est injecté qu'à la construction du PDF. Absent/vide -> la ligne n'apparaît pas (étiquette
 * classique raison sociale + adresse, aucune ligne en trop).
 */
export interface EtiquetteEntry {
	nom: string;
	destinataire?: string;
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

/**
 * Convertit un prospect en entrée d'étiquette. cpVille = « NPA Ville » compacté. `destinataire`
 * (optionnel, saisi côté UI, non persisté) est nettoyé et n'est ajouté que s'il est non vide ->
 * une entrée sans destinataire reste `{ nom, rue, cpVille }` (rétro-compatible, aucune ligne en trop).
 */
export function toEtiquetteEntry(p: ProspectAdresse, destinataire?: string): EtiquetteEntry {
	const nom = clean(p.raison_sociale);
	const rue = clean(p.adresse);
	const cpVille = `${clean(p.npa)} ${clean(p.localite)}`.replace(/\s+/g, ' ').trim();
	const dest = clean(destinataire);
	return dest ? { nom, destinataire: dest, rue, cpVille } : { nom, rue, cpVille };
}
