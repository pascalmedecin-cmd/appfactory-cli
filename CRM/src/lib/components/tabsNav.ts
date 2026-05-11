/**
 * Navigation clavier d'un tablist ARIA (audit 360 V2c H-27, WAI-ARIA Tabs Pattern).
 * Logique pure extraite de Tabs.svelte pour être unit-testable.
 */
export type TabNavKey = 'ArrowRight' | 'ArrowDown' | 'ArrowLeft' | 'ArrowUp' | 'Home' | 'End';

/**
 * Calcule l'index de l'onglet cible pour une touche clavier.
 * - ArrowRight / ArrowDown : onglet suivant (wrap circulaire vers le premier)
 * - ArrowLeft / ArrowUp : onglet précédent (wrap circulaire vers le dernier)
 * - Home : premier onglet ; End : dernier onglet
 * - toute autre touche : null (la touche n'est pas gérée)
 *
 * Retourne null si la liste est vide ou si currentIndex est invalide.
 */
export function nextTabIndex(currentIndex: number, key: string, total: number): number | null {
	if (total <= 0 || currentIndex < 0 || currentIndex >= total) return null;
	switch (key) {
		case 'ArrowRight':
		case 'ArrowDown':
			return (currentIndex + 1) % total;
		case 'ArrowLeft':
		case 'ArrowUp':
			return (currentIndex - 1 + total) % total;
		case 'Home':
			return 0;
		case 'End':
			return total - 1;
		default:
			return null;
	}
}
