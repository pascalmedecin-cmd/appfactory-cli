/**
 * Sélecteur de logo de marque pour l'en-tête d'un PDF client (jsPDF + svg2pdf).
 *
 * Retourne le fragment SVG du logo de la marque active. Module de dispatch pur (testable
 * directement) importé en DYNAMIC dans les moteurs PDF pour garder le tracé hors du bundle
 * principal, comme les polices. FilmPro et LED gardent chacun sa source unique verbatim.
 */
import type { Marque } from '$lib/marque';
import { filmproLogoSvg } from './filmpro-logo';
import { ledstudioLogoSvg } from './ledstudio-logo';

/**
 * Fragment SVG du logo de la marque, coin haut-gauche à (x, y), hauteur `h` (points PDF).
 * - `filmpro` : wordmark monochrome à la couleur du document (`filmproColor`).
 * - `led` : logo magenta encadré (couleur de marque, indépendante du document).
 * Défaut d'appel `filmpro` = non-régression stricte des PDF existants.
 */
export function marqueLogoSvg(
	marque: Marque,
	x: number,
	y: number,
	h: number,
	filmproColor: string
): string {
	return marque === 'led'
		? ledstudioLogoSvg(x, y, h)
		: filmproLogoSvg(x, y, h, filmproColor);
}
