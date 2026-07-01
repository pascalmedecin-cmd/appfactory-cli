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
