// Store global raccourcis clavier CRM. Pattern Svelte 5 module-scoped $state.
// Réutilisable cross-pages via import depuis n'importe quel composant.

export type Command = {
	id: string;
	label: string;
	hint?: string; // ex: "Aller à"
	icon?: string; // nom icône Lucide (icon-map)
	keywords?: string[]; // mots additionnels pour le filtre fuzzy
	run: () => void | Promise<void>;
};

class KeyboardStore {
	commandPaletteOpen = $state(false);
	cheatsheetOpen = $state(false);
	commands = $state<Command[]>([]);

	openCommandPalette() {
		this.cheatsheetOpen = false;
		this.commandPaletteOpen = true;
	}
	closeCommandPalette() {
		this.commandPaletteOpen = false;
	}
	openCheatsheet() {
		this.commandPaletteOpen = false;
		this.cheatsheetOpen = true;
	}
	closeCheatsheet() {
		this.cheatsheetOpen = false;
	}
	closeAll() {
		this.commandPaletteOpen = false;
		this.cheatsheetOpen = false;
	}
	setCommands(cmds: Command[]) {
		this.commands = cmds;
	}
}

export const keyboard = new KeyboardStore();
