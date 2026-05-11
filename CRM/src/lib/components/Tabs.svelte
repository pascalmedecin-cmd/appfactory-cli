<!--
	Tabs ARIA underline — primitive partagée (audit 360 V2c H-27).

	Pattern figé GOLDEN_STANDARD § 5.12 + WAI-ARIA Tabs Pattern :
	- roving tabindex : l'onglet actif porte tabindex=0, les autres tabindex=-1
	- navigation clavier sur le tablist : ArrowLeft/ArrowUp ← précédent, ArrowRight/ArrowDown → suivant
	  (avec wrap), Home → premier, End → dernier ; activation automatique (l'onglet ciblé devient actif)
	- aria-selected, aria-controls, id figés sur le schéma `{tabIdPrefix}-{key}` / `{panelIdPrefix}-{key}`

	Consommée par ContactsTabs / EntreprisesTabs / SignauxTabs / PipelineTabs / ReportingTabs.
-->
<script lang="ts" generics="K extends string">
	import type { Snippet } from 'svelte';
	import { nextTabIndex } from './tabsNav';

	type TabSpec = { key: K; label: string; count?: number };

	type Props = {
		tabs: TabSpec[];
		active: K;
		onSelect: (key: K) => void;
		ariaLabel: string;
		/** comfortable = 48px / padding-x 32px ; compact = 44px / padding-x 24px */
		density?: 'comfortable' | 'compact';
		tabIdPrefix?: string;
		panelIdPrefix?: string;
		/** Outils de vue à droite (search, toggle...). Sépare data filters et display tools (GOLDEN § 7). */
		actions?: Snippet;
	};

	let {
		tabs,
		active,
		onSelect,
		ariaLabel,
		density = 'comfortable',
		tabIdPrefix = 'tab',
		panelIdPrefix = 'panel',
		actions
	}: Props = $props();

	let tablistEl = $state<HTMLDivElement>();

	function focusTabAt(index: number) {
		const buttons = tablistEl?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
		buttons?.[index]?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		const currentIndex = tabs.findIndex((t) => t.key === active);
		const nextIndex = nextTabIndex(currentIndex, e.key, tabs.length);
		if (nextIndex === null) return;
		e.preventDefault();
		onSelect(tabs[nextIndex].key);
		focusTabAt(nextIndex);
	}
</script>

<div class="tabs-bar" class:compact={density === 'compact'} class:has-actions={!!actions}>
	<div role="tablist" aria-label={ariaLabel} bind:this={tablistEl}>
		{#each tabs as tab (tab.key)}
			<button
				role="tab"
				type="button"
				aria-selected={active === tab.key}
				aria-controls={`${panelIdPrefix}-${tab.key}`}
				id={`${tabIdPrefix}-${tab.key}`}
				tabindex={active === tab.key ? 0 : -1}
				class="tab"
				onclick={() => onSelect(tab.key)}
				onkeydown={onKeydown}
			>
				{tab.label}
				{#if tab.count !== undefined}
					<span class="tab-count tabular-nums">{tab.count}</span>
				{/if}
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
	.tabs-bar.compact {
		padding: 0 24px;
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
		white-space: nowrap;
		transition:
			color 180ms ease,
			border-color 180ms ease;
		margin-bottom: -1px;
	}
	.tabs-bar.compact .tab {
		height: 44px;
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
		border-radius: var(--radius-sm);
	}
	.tab-count {
		font-size: 12px;
		font-weight: 600;
		padding: 2px 8px;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		border-radius: var(--radius-full);
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

	@media (max-width: 1024px) {
		.tabs-bar:not(.compact) {
			padding: 0 24px;
		}
	}
	/* Sans bloc d'actions : la barre scrolle horizontalement sur mobile. */
	@media (max-width: 768px) {
		.tabs-bar:not(.has-actions) {
			padding: 0 16px;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.tabs-bar:not(.has-actions)::-webkit-scrollbar {
			display: none;
		}
		.tabs-bar:not(.has-actions) [role='tablist'] {
			min-width: max-content;
		}
	}
	/* Avec bloc d'actions : empilement vertical (tabs scrollables au-dessus, actions en dessous). */
	@media (max-width: 768px) {
		.tabs-bar.has-actions {
			flex-direction: column;
			align-items: stretch;
			padding: 0 16px;
			gap: 0;
		}
		.tabs-bar.has-actions [role='tablist'] {
			min-width: max-content;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.tabs-bar.has-actions [role='tablist']::-webkit-scrollbar {
			display: none;
		}
		.tabs-bar.has-actions .tabs-actions {
			width: 100%;
			padding: 8px 0 16px;
			border-left: none;
			height: auto;
			justify-content: space-between;
			flex-wrap: wrap;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tab {
			transition: none;
		}
	}
</style>
