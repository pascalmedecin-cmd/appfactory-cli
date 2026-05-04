<script lang="ts">
	import { goto } from '$app/navigation';
	import { keyboard, type Command } from './store.svelte.js';

	// Commandes par défaut : navigation 8 pages CRM. Extensible via keyboard.setCommands.
	const defaultCommands: Command[] = [
		{ id: 'goto-dashboard', label: 'Tableau de bord', hint: 'Aller à', icon: 'dashboard', keywords: ['accueil', 'dashboard'], run: () => goto('/') },
		{ id: 'goto-prospection', label: 'Prospection', hint: 'Aller à', icon: 'search', keywords: ['leads', 'simap', 'regbl'], run: () => goto('/prospection') },
		{ id: 'goto-contacts', label: 'Contacts', hint: 'Aller à', icon: 'people', keywords: ['personnes'], run: () => goto('/contacts') },
		{ id: 'goto-entreprises', label: 'Entreprises', hint: 'Aller à', icon: 'business', keywords: ['sociétés', 'comptes'], run: () => goto('/entreprises') },
		{ id: 'goto-pipeline', label: 'Pipeline', hint: 'Aller à', icon: 'trending_up', keywords: ['opportunités', 'deals'], run: () => goto('/pipeline') },
		{ id: 'goto-signaux', label: 'Signaux', hint: 'Aller à', icon: 'radar', keywords: ['alertes'], run: () => goto('/signaux') },
		{ id: 'goto-veille', label: 'Veille', hint: 'Aller à', icon: 'menu_book', keywords: ['intelligence', 'newsletter'], run: () => goto('/veille') },
		{ id: 'goto-aide', label: 'Aide', hint: 'Aller à', icon: 'help_outline', keywords: ['documentation', 'help'], run: () => goto('/aide') },
		{ id: 'open-cheatsheet', label: 'Voir tous les raccourcis clavier', hint: 'Action', icon: 'help_outline', keywords: ['shortcut', 'kbd'], run: () => keyboard.openCheatsheet() }
	];

	keyboard.setCommands(defaultCommands);

	function isEditableTarget(t: EventTarget | null): boolean {
		if (!(t instanceof HTMLElement)) return false;
		const tag = t.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
		if (t.isContentEditable) return true;
		// ARIA custom inputs (futurs composants non-natifs).
		const role = t.getAttribute('role');
		if (role === 'textbox' || role === 'combobox' || role === 'searchbox') return true;
		return false;
	}

	function focusTableRow(direction: 1 | -1) {
		// Cible les <tr> opérables (DataTable a role=button + tabindex). Scope = page courante.
		const rows = Array.from(document.querySelectorAll<HTMLElement>('tr[role="button"]'));
		if (rows.length === 0) return;
		const focused = document.activeElement;
		const currentIdx = focused instanceof HTMLElement ? rows.indexOf(focused) : -1;
		let nextIdx: number;
		if (currentIdx === -1) {
			nextIdx = direction === 1 ? 0 : rows.length - 1;
		} else {
			nextIdx = (currentIdx + direction + rows.length) % rows.length;
		}
		const next = rows[nextIdx];
		next?.focus();
		next?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent) {
		// Cmd+K / Ctrl+K : palette commandes (toujours actif, même dans un input).
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			if (keyboard.commandPaletteOpen) keyboard.closeCommandPalette();
			else keyboard.openCommandPalette();
			return;
		}

		// Les autres raccourcis sont inactifs si le focus est sur un champ éditable
		// ou si une modale du module est déjà ouverte (la modale gère ses propres keys).
		if (isEditableTarget(e.target)) return;
		if (keyboard.commandPaletteOpen || keyboard.cheatsheetOpen) return;

		// ? : ouvre la cheatsheet (Shift + / sur AZERTY/QWERTY)
		if (e.key === '?') {
			e.preventDefault();
			keyboard.openCheatsheet();
			return;
		}

		// J / K : navigation rows DataTable
		if (e.key === 'j' || e.key === 'J') {
			e.preventDefault();
			focusTableRow(1);
			return;
		}
		if (e.key === 'k' || e.key === 'K') {
			e.preventDefault();
			focusTableRow(-1);
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />
