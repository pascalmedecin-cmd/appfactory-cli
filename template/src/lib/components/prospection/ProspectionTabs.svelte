<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { ProspectionTabKey } from '$lib/prospection-utils';
	import type { Snippet } from 'svelte';

	export type ProspectionTab = {
		key: ProspectionTabKey;
		label: string;
		icon: string;
		count: number;
		tooltip: string;
		colorVar: string; // ex: 'simap' → utilise --color-tab-simap / --color-tab-simap-bg
		tagline?: string; // F-V4-07 : sub-line métier visible sur tab actif (signal "vue distincte")
	};

	type Props = {
		tabs: ProspectionTab[];
		active: ProspectionTabKey;
		onSelect: (key: ProspectionTabKey) => void;
		actions?: Snippet; // F-V4-07 : slot actions à droite de la tabs-bar (Importer / Enrichir / Mes recherches)
	};

	let { tabs, active, onSelect, actions }: Props = $props();

	let tabsBarRef = $state<HTMLDivElement | null>(null);

	function handleMobileChange(e: Event) {
		const target = e.currentTarget as HTMLSelectElement;
		onSelect(target.value as ProspectionTabKey);
	}

	// V2.1 audit S160 : navigation clavier ARIA tablist (WAI-ARIA Authoring Practices).
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
		queueMicrotask(() => {
			const next = tabsBarRef?.querySelector<HTMLButtonElement>(`#tab-${nextKey}`);
			next?.focus();
		});
	}
</script>

<div class="tabs-shell">
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
				data-color={tab.colorVar}
				onclick={() => onSelect(tab.key)}
				onkeydown={(e) => handleTabKeydown(e, tab.key)}
			>
				<Tooltip content={tab.tooltip} width={300}>
					<span class="tab-inner">
						<span class="tab-icon-wrap" aria-hidden="true">
							<Icon name={tab.icon} size={16} />
						</span>
						<span class="tab-text">
							<span class="tab-label">{tab.label}</span>
							{#if tab.tagline && active === tab.key}
								<span class="tab-tagline">{tab.tagline}</span>
							{/if}
						</span>
						<span class="tab-count" aria-label="{tab.count} entrées">{tab.count}</span>
					</span>
				</Tooltip>
			</button>
		{/each}
	</div>

	{#if actions}
		<div class="tabs-actions">
			{@render actions()}
		</div>
	{/if}
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
	/* F-V4-07 : shell horizontal avec tabs à gauche + actions à droite, même hauteur.
	   Permet de descendre les boutons "Importer / Enrichir / Mes recherches" sur la même ligne
	   que les onglets pour signaler "actions du contexte courant" et libérer la zone header. */
	.tabs-shell {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);
		background: white;
		border-radius: 12px 12px 0 0;
		gap: 16px;
	}

	.tabs-bar {
		display: flex;
		flex-wrap: nowrap;
		flex: 1;
		min-width: 0;
		position: relative;
		z-index: 5;
		overflow-x: auto;
		overflow-y: visible;
		min-height: 64px;
		scrollbar-width: thin;
	}
	.tabs-bar::-webkit-scrollbar { height: 4px; }
	.tabs-bar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

	.tabs-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px;
		flex-shrink: 0;
	}

	/* TAB : design distinctif premium par source.
	   Repos : icône colorée subtile (data-color tinted), label muted, count discret.
	   Actif : bordure-bottom 3px source-color + bg light source-tinted + label primary-dark + tagline visible.
	   Pattern Linear/Attio : 1 actif richement coloré vs 3 répos colorés (pas tout-grey-monocolor). */
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
		border-bottom: 3px solid transparent;
		margin-bottom: -1px;
		transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.tab-inner {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 14px 20px;
	}
	.tab-text {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		text-align: left;
		line-height: 1.2;
	}
	.tab-label {
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.tab-tagline {
		font-size: 11px;
		font-weight: 400;
		color: var(--color-text-muted);
		letter-spacing: 0;
		font-style: normal;
	}

	.tab:hover {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-surface-alt) 50%, transparent);
	}

	/* Repos : icône-wrap colorée subtile par source (signal d'identité dès le repos).
	   Couleur source à 14% saturation = tinted distinctif sans crier. */
	.tab-icon-wrap {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 150ms ease, color 150ms ease, transform 150ms ease;
	}
	.tab[data-color='simap'] .tab-icon-wrap {
		background: color-mix(in srgb, var(--color-tab-simap) 12%, transparent);
		color: color-mix(in srgb, var(--color-tab-simap) 70%, var(--color-text-muted));
	}
	.tab[data-color='regbl'] .tab-icon-wrap {
		background: color-mix(in srgb, var(--color-tab-regbl) 12%, transparent);
		color: color-mix(in srgb, var(--color-tab-regbl) 70%, var(--color-text-muted));
	}
	.tab[data-color='entreprises'] .tab-icon-wrap {
		background: color-mix(in srgb, var(--color-tab-entreprises) 12%, transparent);
		color: color-mix(in srgb, var(--color-tab-entreprises) 70%, var(--color-text-muted));
	}
	.tab[data-color='terrain'] .tab-icon-wrap {
		background: color-mix(in srgb, var(--color-tab-terrain) 12%, transparent);
		color: color-mix(in srgb, var(--color-tab-terrain) 70%, var(--color-text-muted));
	}

	/* ACTIF : couleur source pleine + bordure 3px + bg subtle + label primary-dark + tagline. */
	.tab--active {
		font-weight: 600;
	}
	.tab--active[data-color='simap'] {
		border-bottom-color: var(--color-tab-simap);
		background: var(--color-tab-simap-bg);
	}
	.tab--active[data-color='regbl'] {
		border-bottom-color: var(--color-tab-regbl);
		background: var(--color-tab-regbl-bg);
	}
	.tab--active[data-color='entreprises'] {
		border-bottom-color: var(--color-tab-entreprises);
		background: var(--color-tab-entreprises-bg);
	}
	.tab--active[data-color='terrain'] {
		border-bottom-color: var(--color-tab-terrain);
		background: var(--color-tab-terrain-bg);
	}
	.tab--active[data-color='simap'] .tab-icon-wrap {
		background: var(--color-tab-simap);
		color: white;
	}
	.tab--active[data-color='regbl'] .tab-icon-wrap {
		background: var(--color-tab-regbl);
		color: white;
	}
	.tab--active[data-color='entreprises'] .tab-icon-wrap {
		background: var(--color-tab-entreprises);
		color: white;
	}
	.tab--active[data-color='terrain'] .tab-icon-wrap {
		background: var(--color-tab-terrain);
		color: white;
	}
	.tab--active[data-color='simap'] .tab-label { color: var(--color-tab-simap); }
	.tab--active[data-color='regbl'] .tab-label { color: var(--color-tab-regbl); }
	.tab--active[data-color='entreprises'] .tab-label { color: var(--color-tab-entreprises); }
	.tab--active[data-color='terrain'] .tab-label { color: var(--color-tab-terrain); }

	/* Empty tab : icône stroke renforcé pour différencier visuellement. */
	.tab--empty .tab-icon-wrap :global(svg) { stroke-width: 2.2; }

	.tab-count {
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	.tab--active .tab-count {
		background: white;
		color: inherit;
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
		.tabs-shell { display: none; }
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

	/* Cap responsive : si tabs-actions dépasse, on autorise le wrap sous tablet,
	   les actions descendent sous la tabs-bar. Évite tronquage sur écran moyen. */
	@media (min-width: 768px) and (max-width: 1023px) {
		.tabs-shell { flex-wrap: wrap; }
		.tabs-actions {
			border-top: 1px solid var(--color-border);
			width: 100%;
			justify-content: flex-end;
			padding: 8px 16px;
		}
	}
</style>
