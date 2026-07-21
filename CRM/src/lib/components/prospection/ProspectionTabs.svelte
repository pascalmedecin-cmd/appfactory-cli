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
				aria-controls={active === tab.key ? `tabpanel-${tab.key}` : undefined}
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
	/* Fix collision 2026-07-21 : wrap CONTENT-DRIVEN (pas de seuil px). .tabs-shell autorise le wrap ;
	   .tabs-bar ne rétrécit JAMAIS sous son contenu (min-width:max-content) → quand onglets + actions ne
	   tiennent pas sur une ligne, les actions passent d'elles-mêmes à la 2e ligne (au lieu que les onglets,
	   en overflow:visible, peignent par-dessus les CTA). S'adapte à la largeur réelle (sidebar 240px
	   déduite) sans magic number. Robuste pour les 3 onglets rendus aujourd'hui (les onglets tiennent
	   toujours sur leur ligne, les actions wrappent en dessous, et wrappent aussi entre elles si besoin).
	   LIMITE CONNUE (latente) : avec 5 onglets (simap/regbl réactivés) à fenêtre étroite, la .tabs-bar
	   (max-content, nowrap interne) peut déborder la carte horizontalement → à traiter alors par un
	   overflow-x:auto (scroll d'onglets), pas nécessaire tant que simap/regbl sont coupés. */
	.tabs-shell {
		display: flex;
		flex-wrap: wrap;
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
		flex: 0 1 auto;
		min-width: max-content;
		position: relative;
		z-index: 5;
		overflow: visible;
		min-height: 64px;
	}

	.tabs-actions {
		display: flex;
		/* flex-wrap:wrap → si le cluster de boutons dépasse à lui seul la largeur de sa rangée (beaucoup
		   de CTA + fenêtre étroite), les boutons wrappent entre eux AU LIEU de déborder la carte à droite
		   (les CTA desktop sont hidden md:inline-flex → wrap sûr). justify-content:flex-end garde
		   l'alignement à droite quand ils wrappent. Sans effet sur le cas courant (3 boutons tiennent). */
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
		padding: 0 16px;
		flex-shrink: 0;
		/* max-width:100% borne le cluster à la largeur de sa rangée → sur la 2e rangée, un cluster trop
		   large ne déborde plus la carte : il est contraint et ses boutons wrappent (flex-wrap ci-dessus).
		   Sans effet quand le cluster tient (largeur = contenu < 100%). */
		max-width: 100%;
		/* margin-left:auto → actions alignées à droite qu'elles soient sur la ligne des onglets (1 rangée)
		   ou reléguées à la 2e rangée par le wrap content-driven. La séparation verticale de la 2e rangée
		   vient du row-gap de .tabs-shell (16px) ; l'état « wrappé » n'est pas détectable en CSS pur, donc
		   pas de filet conditionnel (le gap suffit). */
		margin-left: auto;
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
	.tab[data-color='maliste'] .tab-icon { color: var(--color-tab-maliste); }

	/* ACTIF : underline 2px source-color + label primary-dark. Pas de fond cellule. */
	.tab--active {
		font-weight: 600;
		color: var(--color-primary-dark);
	}
	.tab--active[data-color='simap'] { border-bottom-color: var(--color-tab-simap); }
	.tab--active[data-color='regbl'] { border-bottom-color: var(--color-tab-regbl); }
	.tab--active[data-color='entreprises'] { border-bottom-color: var(--color-tab-entreprises); }
	.tab--active[data-color='terrain'] { border-bottom-color: var(--color-tab-terrain); }
	.tab--active[data-color='maliste'] { border-bottom-color: var(--color-tab-maliste); }
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

	/* Cohérence UI (increment c, flag ff_ui_coherence) : aligner ce fork sur la primitive
	   Tabs.svelte — rayon tokenisé (999px → --radius-full, rendu identique) et count actif à
	   --color-primary (au lieu de --color-primary-dark, cf. Tabs.svelte:182). Override co-localisé :
	   OFF ⇒ .coherence-ui absent ⇒ inerte. Spec : docs/COHERENCE-UI-BANDEAU.md § increment c
	   (inventory-c #4/#5). Rayon 999px et --radius-full sont visuellement identiques (source-unité).
	   `:not(.tab--empty)` : un onglet actif ET vide (count 0) porte les 2 classes ; sans l'exclusion,
	   l'override (0-3-0) surclasserait `.tab--empty .tab-count{color:border}` (0-2-0) et peindrait le
	   « 0 » en primary au lieu du gris muted OFF (le fond reste transparent). On préserve donc la
	   précédence OFF « vide = fané » (base `.tab--active` reste inoffensive : égalité 0-2-0 avec empty). */
	:global(.coherence-ui) .tab-count {
		border-radius: var(--radius-full);
	}
	:global(.coherence-ui) .tab--active:not(.tab--empty) .tab-count {
		color: var(--color-primary);
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
</style>
