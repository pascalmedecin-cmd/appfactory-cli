<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { ProspectionTabKey } from '$lib/prospection-utils';
	import type { Snippet } from 'svelte';

	export type ProspectionTab = {
		key: ProspectionTabKey;
		label: string;
		icon: string;
		count: number;
		colorVar: string; // ex: 'simap' → utilise --color-tab-simap / --color-tab-simap-bg
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
				<span class="tab-inner">
					<span class="tab-icon" aria-hidden="true">
						<Icon name={tab.icon} size={16} />
					</span>
					<span class="tab-label">{tab.label}</span>
					<span class="tab-count" aria-label="{tab.count} entrées">{tab.count}</span>
				</span>
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
		overflow: visible;
		min-height: 64px;
	}

	.tabs-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px;
		flex-shrink: 0;
	}

	/* TAB : design distinctif premium pattern Linear/Attio.
	   Repos : icône colorée source-color (signal d'identité), label muted, count discret. Pas de wrap.
	   Actif : underline 2px source-color + label primary-dark + count plus contrasté. Pas de fond cellule.
	   L'icône colorée porte l'identité au repos comme à l'actif (cohérence). */
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
		transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.tab-inner {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px;
	}
	.tab-label {
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	.tab:hover {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-surface-alt) 50%, transparent);
	}

	/* Icône : couleur source-color au repos (identité visible immédiatement) et à l'actif.
	   Pas de wrap coloré, pas de fond. L'icône Lucide est le seul marqueur d'identité chromatique. */
	.tab-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: color 150ms ease;
	}
	.tab[data-color='simap'] .tab-icon { color: var(--color-tab-simap); }
	.tab[data-color='regbl'] .tab-icon { color: var(--color-tab-regbl); }
	.tab[data-color='entreprises'] .tab-icon { color: var(--color-tab-entreprises); }
	.tab[data-color='terrain'] .tab-icon { color: var(--color-tab-terrain); }

	/* ACTIF : underline 2px source-color + label primary-dark. Pas de fond cellule. */
	.tab--active {
		font-weight: 600;
		color: var(--color-primary-dark);
	}
	.tab--active[data-color='simap'] { border-bottom-color: var(--color-tab-simap); }
	.tab--active[data-color='regbl'] { border-bottom-color: var(--color-tab-regbl); }
	.tab--active[data-color='entreprises'] { border-bottom-color: var(--color-tab-entreprises); }
	.tab--active[data-color='terrain'] { border-bottom-color: var(--color-tab-terrain); }
	.tab--active .tab-label { color: var(--color-primary-dark); }

	/* Empty tab : icône en gris muted (signal "rien à voir ici"). */
	.tab--empty .tab-icon { color: var(--color-text-muted); }
	.tab--empty .tab-icon :global(svg) { stroke-width: 1.8; opacity: 0.6; }

	.tab-count {
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	.tab--active .tab-count {
		background: var(--color-primary-light);
		color: var(--color-primary-dark);
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
