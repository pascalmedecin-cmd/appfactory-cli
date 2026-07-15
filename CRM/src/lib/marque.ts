/**
 * Atelier 209 Run 2 : cloisonnement bi-marque (FilmPro / LED Studio).
 *
 * Source UNIQUE du type `Marque` et de ses gardes, partagée client + serveur (le type sert
 * aux props de chrome comme aux filtres de requête). La marque est un FILTRE DE VUE applicatif
 * (la RLS reste mono-tenant plate) : `filmpro` par défaut = non-régression stricte.
 *
 *  - `parseMarque` COERCE toute valeur absente/inconnue vers `'filmpro'` (lecture d'un cookie
 *    ou d'un locals douteux : jamais d'exception, toujours un défaut sûr).
 *  - `isMarque` est une GARDE stricte (rejette l'inconnu) : pour valider une entrée API où une
 *    valeur invalide doit être un 400, pas un silencieux repli filmpro.
 */
export type Marque = 'filmpro' | 'led';

export const MARQUES: readonly Marque[] = ['filmpro', 'led'] as const;

/** Garde stricte : true seulement pour 'filmpro' | 'led'. */
export function isMarque(value: unknown): value is Marque {
	return value === 'filmpro' || value === 'led';
}

/** Coercition sûre : toute valeur hors périmètre retombe sur 'filmpro' (non-régression). */
export function parseMarque(value: unknown): Marque {
	return value === 'led' ? 'led' : 'filmpro';
}
