<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { EntreprisesTab } from '$lib/utils/entreprisesFormat';

	type TabSpec = {
		key: EntreprisesTab;
		label: string;
		count: number;
	};

	type Props = {
		active: EntreprisesTab;
		tabs: TabSpec[];
		onSelect: (tab: EntreprisesTab) => void;
		actions?: Snippet;
	};

	let { active, tabs, onSelect, actions }: Props = $props();
</script>

<div class="tabs-bar">
	<div role="tablist" aria-label="Filtrer les entreprises">
		{#each tabs as tab (tab.key)}
			<button
				role="tab"
				type="button"
				aria-selected={active === tab.key}
				aria-controls={`panel-${tab.key}`}
				id={`tab-${tab.key}`}
				class="tab"
				onclick={() => onSelect(tab.key)}
			>
				{tab.label}
				<span class="tab-count tabular-nums">{tab.count}</span>
			</button>
		{/each}
	</div>
	{#if actions}
		<div class="tabs-actions">
			{@render actions()}
		</div>
	{/if}
</div>

<style>
	.tabs-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 32px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		gap: 24px;
		position: sticky;
		top: var(--header-height, 56px);
		z-index: 8;
	}
	[role='tablist'] {
		display: flex;
		gap: 4px;
	}
	.tab {
		height: 48px;
		padding: 0 16px;
		border: none;
		background: transparent;
		border-bottom: 2px solid transparent;
		font-family: inherit;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		transition: color 180ms ease, border-color 180ms ease;
		margin-bottom: -1px;
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab[aria-selected='true'] {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.tab-count {
		font-size: 12px;
		font-weight: 600;
		padding: 2px 8px;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		border-radius: 9999px;
	}
	.tab[aria-selected='true'] .tab-count {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	/* Séparateur visuel entre filtres data (tabs) et outils de vue (search + toggle).
	   Hairline 1px sur 32px de hauteur — annonce un changement fonctionnel, pas une grille de colonnes. */
	.tabs-actions {
		display: flex;
		align-items: center;
		gap: 16px;
		padding-left: 24px;
		border-left: 1px solid var(--color-border);
		height: 32px;
	}
	@media (max-width: 768px) {
		.tabs-bar {
			flex-direction: column;
			align-items: stretch;
			padding: 0 16px;
			gap: 0;
		}
		[role='tablist'] {
			min-width: max-content;
			overflow-x: auto;
			scrollbar-width: none;
		}
		[role='tablist']::-webkit-scrollbar {
			display: none;
		}
		.tabs-actions {
			width: 100%;
			padding: 8px 0 16px;
			border-left: none;
			height: auto;
			justify-content: space-between;
		}
	}
</style>
