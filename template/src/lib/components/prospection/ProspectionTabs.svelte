<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { ProspectionTabKey } from '$lib/prospection-utils';

	export type ProspectionTab = {
		key: ProspectionTabKey;
		label: string;
		icon: string;
		count: number;
		tooltip: string;
		colorVar: string; // ex: 'simap' → utilise --color-tab-simap / --color-tab-simap-bg
	};

	type Props = {
		tabs: ProspectionTab[];
		active: ProspectionTabKey;
		onSelect: (key: ProspectionTabKey) => void;
	};

	let { tabs, active, onSelect }: Props = $props();

	let tabsBarRef = $state<HTMLDivElement | null>(null);

	function handleMobileChange(e: Event) {
		const target = e.currentTarget as HTMLSelectElement;
		onSelect(target.value as ProspectionTabKey);
	}

	// V2.1 audit S160 : navigation clavier ARIA tablist (WAI-ARIA Authoring Practices).
	// ArrowLeft/Right cycle les tabs avec activation immédiate (automatic activation).
	// Home/End vont au premier/dernier. La tab active reste tabindex=0, les autres tabindex=-1
	// (roving tabindex) pour ne pas piéger le focus sur tablist au Tab clavier.
	function handleTabKeydown(e: KeyboardEvent, currentKey: ProspectionTabKey) {
		const idx = tabs.findIndex(t => t.key === currentKey);
		if (idx < 0) return;
		let nextIdx = idx;
		if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
		else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
		else if (e.key === 'Home') nextIdx = 0;
		else if (e.key === 'End') nextIdx = tabs.length - 1;
		else return;
		e.preventDefault();
		const nextKey = tabs[nextIdx].key;
		onSelect(nextKey);
		// Focus le bouton tab cible après reactivité Svelte (next tick).
		queueMicrotask(() => {
			const next = tabsBarRef?.querySelector<HTMLButtonElement>(`#tab-${nextKey}`);
			next?.focus();
		});
	}
</script>

<div bind:this={tabsBarRef} class="tabs-bar" role="tablist" aria-label="Filtrer la prospection par nature">
	{#each tabs as tab (tab.key)}
		<button
			type="button"
			role="tab"
			id="tab-{tab.key}"
			aria-selected={active === tab.key}
			aria-controls="tabpanel-{tab.key}"
			tabindex={active === tab.key ? 0 : -1}
			class="tab"
			class:tab--active={active === tab.key}
			class:tab--empty={tab.count === 0}
			onclick={() => onSelect(tab.key)}
			onkeydown={(e) => handleTabKeydown(e, tab.key)}
		>
			<Tooltip content={tab.tooltip} width={300}>
				<span class="tab-inner">
					<span class="tab-icon-wrap" data-color={tab.colorVar} aria-hidden="true">
						<Icon name={tab.icon} size={15} />
					</span>
					<span class="tab-label">{tab.label}</span>
					<span class="tab-count" aria-label="{tab.count} entrées">{tab.count}</span>
				</span>
			</Tooltip>
		</button>
	{/each}
</div>

<div class="tabs-mobile">
	<label class="visually-hidden" for="tabs-mobile-select">Filtrer par nature de signal</label>
	<select id="tabs-mobile-select" value={active} aria-label="Filtrer par nature de signal" onchange={handleMobileChange}>
		{#each tabs as tab (tab.key)}
			<option value={tab.key}>{tab.label} ({tab.count})</option>
		{/each}
	</select>
</div>

<style>
	.tabs-bar {
		display: flex;
		flex-wrap: nowrap;
		border-bottom: 1px solid var(--color-border);
		background: white;
		position: relative;
		z-index: 5;
		border-radius: 12px 12px 0 0;
		/* V1.3 audit S160 cause racine : `overflow: auto` (X et Y) + `height: 60px` figé
		   provoquaient un scroll vertical résiduel (scrollHeight 158 > clientHeight 60).
		   Fix : ne scroller QUE en X, laisser Y en visible, et passer en min-height pour
		   accommoder le contenu naturel des tabs (icône + label + count). */
		overflow-x: auto;
		overflow-y: visible;
		min-height: 60px;
		scrollbar-width: thin;
	}
	.tabs-bar::-webkit-scrollbar { height: 4px; }
	.tabs-bar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

	.tab {
		display: inline-flex;
		align-items: stretch;
		padding: 0;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
		border: none;
		background: none;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 150ms ease, border-color 150ms ease;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.tab-inner {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 16px 24px;
	}
	.tab:hover { color: var(--color-text); }
	.tab--active {
		color: var(--color-primary-dark);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
	}

	.tab-icon-wrap {
		width: 26px;
		height: 26px;
		border-radius: 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		/* V3.2 audit S160 (H-20 + L-13) : repos en neutre, pas de transform scale.
		   Couleurs sémantiques uniquement sur tab active = 1 actif coloré vs 3 neutres
		   (pattern Linear/Stripe). Avant : palette terracotta/sauge/prune/pétrole simultanée. */
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		transition: background 150ms ease, color 150ms ease;
	}

	/* Couleurs sémantiques par nature d'onglet, appliquées UNIQUEMENT sur tab active. */
	.tab--active .tab-icon-wrap[data-color='simap'] {
		background: var(--color-tab-simap-bg);
		color: var(--color-tab-simap);
	}
	.tab--active .tab-icon-wrap[data-color='regbl'] {
		background: var(--color-tab-regbl-bg);
		color: var(--color-tab-regbl);
	}
	.tab--active .tab-icon-wrap[data-color='entreprises'] {
		background: var(--color-tab-entreprises-bg);
		color: var(--color-tab-entreprises);
	}
	.tab--active .tab-icon-wrap[data-color='terrain'] {
		background: var(--color-tab-terrain-bg);
		color: var(--color-tab-terrain);
	}
	.tab--empty .tab-icon-wrap :global(svg) {
		stroke-width: 2.2;
	}

	.tab-count {
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	/* V3.2 audit S160 (L-14) : retirer count bg primary-light sur active.
	   Le border-bottom + font-weight + couleur primary-dark suffisent comme signaux
	   de sélection. Évite double signal redondant + dilution palette primary. */
	.tab--empty .tab-count {
		background: transparent;
		color: var(--color-border);
	}

	.tabs-mobile { display: none; }

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 767px) {
		.tabs-bar { display: none; }
		.tabs-mobile {
			display: block;
			padding: 12px;
			border-bottom: 1px solid var(--color-border);
			background: white;
			border-radius: 12px 12px 0 0;
		}
		.tabs-mobile select {
			width: 100%;
			height: 44px;
			padding: 0 12px;
			border: 1px solid var(--color-border);
			border-radius: 8px;
			font-size: 14px;
			font-family: inherit;
			background: white;
			color: var(--color-text);
		}
	}
</style>
