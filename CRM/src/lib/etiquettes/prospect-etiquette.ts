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

/**
 * Particules françaises (et usuelles) laissées en minuscule au milieu d'un nom : « pharmacieplus
 * du rond-point » -> « Pharmacieplus du Rond-Point » (exemple verbatim Pascal 2026-07-03), pas
 * « Pharmacieplus Du Rond-Point ». En tête de nom, la particule prend sa majuscule (« La Finestra »).
 */
const PARTICULES = new Set([
	'du', 'de', 'la', 'le', 'les', 'des', 'au', 'aux', 'et', 'en',
	'sur', 'sous', 'chez', 'von', 'van', 'der', 'di', 'da', 'del', 'della'
]);

function upFirst(s: string): string {
	return s ? s.charAt(0).toLocaleUpperCase('fr') + s.slice(1) : s;
}

/**
 * Capitalisation du NOM d'étiquette (demande Pascal 2026-07-03) : les raisons sociales issues de
 * Google Places arrivent parfois tout en minuscules (« pharmacieplus du rond-point ») - moche sur
 * une enveloppe. Règle : initiale en MAJUSCULE pour chaque mot et chaque segment de mot composé
 * (tiret), particules françaises laissées en minuscule (sauf en tête), élisions « l' »/« d' »
 * conservées en minuscule hors tête (« Fouchault l'Opticien »). On ne minusculise JAMAIS rien :
 * un nom déjà correctement casé (« ACUITIS », « Demi Lune Café ») ressort STRICTEMENT identique.
 * S'applique au nom seulement - l'adresse reste 100 % verbatim Google (décision Pascal).
 */
export function capitalizeNomEtiquette(nom: string): string {
	let wordIndex = 0;
	return nom
		.split(/(\s+)/)
		.map((token) => {
			if (token === '' || /^\s+$/.test(token)) return token;
			const isFirst = wordIndex === 0;
			wordIndex++;
			const lower = token.toLocaleLowerCase('fr');
			// Particule isolée déjà en minuscule, hors tête -> intacte (« du », « de »...).
			if (!isFirst && token === lower && PARTICULES.has(lower)) return token;
			// Élision minuscule hors tête (« l'Opticien », « d'Or ») : garder « l' »/« d' »,
			// capitaliser la suite.
			if (!isFirst && /^[ld]['’]/.test(token)) {
				return token.slice(0, 2) + upFirst(token.slice(2));
			}
			// Mot (composé) : initiale majuscule par segment de tiret, reste du mot intact.
			return token
				.split(/(-)/)
				.map((seg) => (seg === '-' ? seg : upFirst(seg)))
				.join('');
		})
		.join('');
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
	// Nom capitalisé pour l'enveloppe (source Google Places parfois tout-minuscules) ;
	// rue et cp/ville VERBATIM (l'adresse doit rester 100 % Google - Pascal 2026-07-03).
	const nom = capitalizeNomEtiquette(clean(p.raison_sociale));
	const rue = clean(p.adresse);
	const cpVille = `${clean(p.npa)} ${clean(p.localite)}`.replace(/\s+/g, ' ').trim();
	const dest = clean(destinataire);
	return dest ? { nom, destinataire: dest, rue, cpVille } : { nom, rue, cpVille };
}
