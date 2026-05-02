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

	function handleMobileChange(e: Event) {
		const target = e.currentTarget as HTMLSelectElement;
		onSelect(target.value as ProspectionTabKey);
	}
</script>

<div class="tabs-bar" role="tablist" aria-label="Filtrer la prospection par nature">
	{#each tabs as tab (tab.key)}
		<button
			type="button"
			role="tab"
			aria-selected={active === tab.key}
			class="tab"
			class:tab--active={active === tab.key}
			class:tab--empty={tab.count === 0}
			onclick={() => onSelect(tab.key)}
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
	<label class="visually-hidden" for="tabs-mobile-select">Onglet actif</label>
	<select id="tabs-mobile-select" value={active} onchange={handleMobileChange}>
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
		font-size: 15px;
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
		gap: 10px;
		padding: 16px 22px;
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
		border-radius: 7px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: transform 150ms ease;
	}
	.tab--active .tab-icon-wrap {
		transform: scale(1.02);
	}

	/* Couleurs par nature d'onglet (subtiles, premium) */
	.tab-icon-wrap[data-color='simap'] {
		background: var(--color-tab-simap-bg);
		color: var(--color-tab-simap);
	}
	.tab-icon-wrap[data-color='regbl'] {
		background: var(--color-tab-regbl-bg);
		color: var(--color-tab-regbl);
	}
	.tab-icon-wrap[data-color='entreprises'] {
		background: var(--color-tab-entreprises-bg);
		color: var(--color-tab-entreprises);
	}
	.tab-icon-wrap[data-color='terrain'] {
		background: var(--color-tab-terrain-bg);
		color: var(--color-tab-terrain);
	}
	.tab--empty .tab-icon-wrap :global(svg) {
		stroke-width: 2.2;
	}

	.tab-count {
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	.tab--active .tab-count {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
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
