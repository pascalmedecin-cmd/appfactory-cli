<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { keyboard, type Command } from './store.svelte.js';
	import Icon from '$lib/components/Icon.svelte';

	let query = $state('');
	let highlightIdx = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	// Filtre fuzzy simple : tous les caractères de la query (NFD lowercased) doivent
	// apparaître dans l'ordre dans le label OU les keywords. Pattern Linear/VSCode.
	function normalize(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	}
	function fuzzyMatch(haystack: string, needle: string): boolean {
		if (!needle) return true;
		const h = normalize(haystack);
		const n = normalize(needle);
		let i = 0;
		for (const c of h) {
			if (c === n[i]) i++;
			if (i === n.length) return true;
		}
		return false;
	}
	function matches(cmd: Command, q: string): boolean {
		if (!q) return true;
		if (fuzzyMatch(cmd.label, q)) return true;
		if (cmd.keywords?.some(k => fuzzyMatch(k, q))) return true;
		return false;
	}

	const filtered = $derived(keyboard.commands.filter(c => matches(c, query)));

	$effect(() => {
		if (keyboard.commandPaletteOpen) {
			query = '';
			highlightIdx = 0;
			queueMicrotask(() => inputEl?.focus());
		}
	});

	$effect(() => {
		// Reset highlight quand la liste change (filtre)
		void filtered.length;
		highlightIdx = 0;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			keyboard.closeCommandPalette();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlightIdx = Math.min(highlightIdx + 1, filtered.length - 1);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlightIdx = Math.max(highlightIdx - 1, 0);
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const cmd = filtered[highlightIdx];
			if (cmd) {
				keyboard.closeCommandPalette();
				void cmd.run();
			}
			return;
		}
	}

	function selectCommand(cmd: Command) {
		keyboard.closeCommandPalette();
		void cmd.run();
	}
</script>

{#if keyboard.commandPaletteOpen}
	<button
		class="cmd-overlay"
		aria-label="Fermer la palette de commandes"
		onclick={() => keyboard.closeCommandPalette()}
		transition:fade={{ duration: 120 }}
	></button>

	<div
		class="cmd-modal"
		role="dialog"
		aria-modal="true"
		aria-label="Palette de commandes"
		transition:scale={{ start: 0.96, duration: 180 }}
	>
		<div class="cmd-search">
			<Icon name="search" size={18} />
			<input
				bind:this={inputEl}
				bind:value={query}
				type="text"
				placeholder="Tape une commande ou une page…"
				aria-label="Rechercher une commande"
				onkeydown={handleKeydown}
			/>
			<span class="cmd-shortcut">Esc</span>
		</div>

		<div class="cmd-list" role="listbox">
			{#if filtered.length === 0}
				<div class="cmd-empty">Aucune commande trouvée</div>
			{:else}
				{#each filtered as cmd, i (cmd.id)}
					<button
						type="button"
						role="option"
						aria-selected={i === highlightIdx}
						class="cmd-item"
						class:cmd-item--highlighted={i === highlightIdx}
						onmouseenter={() => highlightIdx = i}
						onclick={() => selectCommand(cmd)}
					>
						{#if cmd.icon}
							<span class="cmd-item-icon" aria-hidden="true">
								<Icon name={cmd.icon} size={16} />
							</span>
						{/if}
						<span class="cmd-item-label">
							{#if cmd.hint}<span class="cmd-item-hint">{cmd.hint}</span>{/if}
							{cmd.label}
						</span>
						{#if i === highlightIdx}
							<span class="cmd-item-enter" aria-hidden="true">↵</span>
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<div class="cmd-footer">
			<span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
			<span><kbd>↵</kbd> exécuter</span>
			<span><kbd>Esc</kbd> fermer</span>
		</div>
	</div>
{/if}

<style>
	.cmd-overlay {
		position: fixed;
		inset: 0;
		background: rgba(10, 22, 40, 0.40);
		backdrop-filter: blur(2px);
		z-index: 100;
		border: none;
		padding: 0;
		cursor: default;
	}
	.cmd-modal {
		position: fixed;
		top: 12vh;
		left: 50%;
		transform: translateX(-50%);
		width: min(560px, calc(100vw - 32px));
		background: white;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: var(--shadow-2xl);
		z-index: 101;
		display: flex;
		flex-direction: column;
		max-height: 70vh;
		overflow: hidden;
	}
	.cmd-search {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}
	.cmd-search input {
		flex: 1;
		border: none;
		outline: none;
		font: inherit;
		font-size: 15px;
		color: var(--color-text);
		background: transparent;
	}
	.cmd-search input::placeholder { color: var(--color-text-muted); }
	.cmd-shortcut {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		background: var(--color-surface-alt);
		padding: 2px 6px;
		border-radius: 4px;
	}
	.cmd-list {
		flex: 1;
		overflow-y: auto;
		padding: 6px;
	}
	.cmd-empty {
		padding: 24px 16px;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 14px;
	}
	.cmd-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 10px 12px;
		border: none;
		background: transparent;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		font: inherit;
		font-size: 14px;
		color: var(--color-text);
	}
	.cmd-item--highlighted {
		background: var(--color-primary-light);
		color: var(--color-primary-dark);
	}
	.cmd-item-icon {
		display: inline-flex;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.cmd-item--highlighted .cmd-item-icon { color: var(--color-primary); }
	.cmd-item-label {
		flex: 1;
		display: flex;
		align-items: baseline;
		gap: 6px;
	}
	.cmd-item-hint {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}
	.cmd-item-enter {
		font-size: 13px;
		color: var(--color-primary);
		font-weight: 600;
	}
	.cmd-footer {
		display: flex;
		gap: 16px;
		padding: 10px 16px;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-alt);
		font-size: 11px;
		color: var(--color-text-muted);
	}
	kbd {
		font-family: inherit;
		background: white;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 1px 5px;
		margin-right: 4px;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-text);
	}
</style>
