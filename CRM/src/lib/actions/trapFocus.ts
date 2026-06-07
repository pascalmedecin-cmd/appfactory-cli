const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(node: HTMLElement) {
	const previouslyFocused = document.activeElement as HTMLElement | null;

	function getFocusable() {
		return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			el => el.offsetParent !== null
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;

		const focusable = getFocusable();
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	// Focus le premier element focusable au mount
	requestAnimationFrame(() => {
		const focusable = getFocusable();
		if (focusable.length > 0) focusable[0].focus();
	});

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			// Restitution du focus au déclencheur (WCAG 2.4.3). Différée d'une frame :
			// Svelte retire le nœud transitionné (fly/scale) autour de ce destroy, ce qui
			// renvoie le focus sur <body> ; une restitution synchrone serait écrasée. Le
			// rAF garantit le retour sur le déclencheur, et seulement s'il est toujours
			// dans le DOM (un re-render à la fermeture peut l'avoir détaché). Bug LIVE-H2.
			const target = previouslyFocused;
			requestAnimationFrame(() => {
				if (target && target.isConnected) target.focus();
			});
		}
	};
}
