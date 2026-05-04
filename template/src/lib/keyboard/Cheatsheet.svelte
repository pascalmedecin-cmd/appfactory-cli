<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { keyboard } from './store.svelte.js';

	type Group = {
		title: string;
		shortcuts: Array<{ keys: string[]; label: string }>;
	};

	const groups: Group[] = [
		{
			title: 'Global',
			shortcuts: [
				{ keys: ['⌘', 'K'], label: 'Ouvrir la palette de commandes' },
				{ keys: ['?'], label: 'Afficher cette aide' },
				{ keys: ['Esc'], label: 'Fermer une modale ou un panneau' }
			]
		},
		{
			title: 'Tableaux',
			shortcuts: [
				{ keys: ['J'], label: 'Ligne suivante' },
				{ keys: ['K'], label: 'Ligne précédente' },
				{ keys: ['↵'], label: 'Ouvrir la fiche de la ligne sélectionnée' }
			]
		}
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			keyboard.closeCheatsheet();
		}
	}
</script>

<svelte:window onkeydown={keyboard.cheatsheetOpen ? handleKeydown : undefined} />

{#if keyboard.cheatsheetOpen}
	<button
		class="ch-overlay"
		aria-label="Fermer l'aide raccourcis"
		onclick={() => keyboard.closeCheatsheet()}
		transition:fade={{ duration: 120 }}
	></button>

	<div
		class="ch-modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="cheatsheet-title"
		transition:scale={{ start: 0.96, duration: 180 }}
	>
		<div class="ch-header">
			<h2 id="cheatsheet-title">Raccourcis clavier</h2>
			<button type="button" aria-label="Fermer" class="ch-close" onclick={() => keyboard.closeCheatsheet()}>×</button>
		</div>
		<div class="ch-body">
			{#each groups as group (group.title)}
				<section class="ch-group">
					<h3>{group.title}</h3>
					<dl>
						{#each group.shortcuts as sc (sc.label)}
							<div class="ch-row">
								<dt>
									{#each sc.keys as k (k)}
										<kbd>{k}</kbd>
									{/each}
								</dt>
								<dd>{sc.label}</dd>
							</div>
						{/each}
					</dl>
				</section>
			{/each}
		</div>
	</div>
{/if}

<style>
	.ch-overlay {
		position: fixed;
		inset: 0;
		background: rgba(10, 22, 40, 0.40);
		backdrop-filter: blur(2px);
		z-index: 100;
		border: none;
		padding: 0;
		cursor: default;
	}
	.ch-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(480px, calc(100vw - 32px));
		background: white;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: var(--shadow-2xl);
		z-index: 101;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.ch-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border);
	}
	.ch-header h2 {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}
	.ch-close {
		background: none;
		border: none;
		font-size: 24px;
		line-height: 1;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0 4px;
	}
	.ch-close:hover { color: var(--color-text); }
	.ch-body {
		padding: 16px 20px 20px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.ch-group h3 {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin: 0 0 10px;
	}
	.ch-group dl { margin: 0; }
	.ch-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px dashed var(--color-border);
	}
	.ch-row:last-child { border-bottom: none; }
	.ch-row dt {
		display: flex;
		gap: 4px;
	}
	.ch-row dd {
		margin: 0;
		font-size: 13px;
		color: var(--color-text);
	}
	kbd {
		font-family: inherit;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-bottom-width: 2px;
		border-radius: 4px;
		padding: 2px 6px;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text);
		min-width: 22px;
		text-align: center;
		display: inline-block;
	}
</style>
