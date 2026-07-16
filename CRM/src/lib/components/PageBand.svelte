<script lang="ts">
	/**
	 * Bandeau de page in-page (chantier « Cohérence UI », flag ff_page_bandeau).
	 * Discipline de structure reprise de Gouvernance (PageHeader), habillée peau Atelier 209.
	 * En-tête purement typographique : filet de séparation, JAMAIS de carte (ni fond, ni ombre).
	 * Spec : docs/COHERENCE-UI-BANDEAU.md. Mockup validé Pascal 2026-07-16.
	 *
	 * Alignement clé : l'icône occupe la rangée du titre (grille) + align-self:center → son centre
	 * se cale optiquement sur le centre du gros titre. Sa gouttière gauche (32px) s'aligne sur le
	 * bord gauche du contenu sous le bandeau (KpiStrip, tableau) ; le titre est indenté après l'icône.
	 *
	 * Description = TOUJOURS une ligne (décision Pascal) : desktop = `desc`, < 768px = `descMobile`
	 * si fourni, sinon `desc`. Le nowrap + ellipsis est le garde-fou (déborde = trop long).
	 */
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		icon,
		eyebrow,
		title,
		desc,
		descMobile,
		count,
		actions,
	}: {
		/** Nom d'icône ICON_MAP (réutiliser l'icône de nav de la page). */
		icon: string;
		/** Sur-titre imagé (rendu en capitales via CSS). */
		eyebrow: string;
		/** Nom de la page (unique h1 de la page). */
		title: string;
		/** Description desktop, une ligne. */
		desc: string;
		/** Variante courte < 768px (optionnelle). */
		descMobile?: string;
		/** Compteur live (ex. « 8 entreprises »), rendu en pastille. */
		count?: string;
		/** Actions primaires (boutons), rendues à droite. */
		actions?: Snippet;
	} = $props();
</script>

<header class="pband" class:pband--icon={true}>
	<div class="pband__bar">
		<div class="pband__heading">
			<span class="pband__icon" aria-hidden="true"><Icon name={icon} size={44} strokeWidth={1.75} /></span>
			<p class="pband__eyebrow">{eyebrow}</p>
			<h1 class="pband__title">{title}</h1>
		</div>
		{#if count || actions}
			<div class="pband__aside">
				{#if count}<span class="pband__count">{count}</span>{/if}
				{@render actions?.()}
			</div>
		{/if}
	</div>
	<p class="pband__desc">
		{#if descMobile}
			<span class="pband__desc-desk">{desc}</span><span class="pband__desc-mob">{descMobile}</span>
		{:else}
			{desc}
		{/if}
	</p>
</header>

<style>
	.pband {
		--pb-icon: 44px;
		--pb-gap: 16px;
		/* Gouttière 32px = alignée sur le KpiStrip/tableau sous le bandeau (l'icône cale sur leur bord gauche). */
		padding: 4px 32px 16px;
		margin-bottom: 12px;
		border-bottom: 1px solid var(--color-border);
	}
	.pband__bar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
		row-gap: 12px;
	}
	/* Grille (pas flex) : garantit eyebrow (l1) + titre (l2) + icône (col1, rangée du titre) alignés. */
	.pband__heading {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--pb-gap);
		align-items: center;
		min-width: 0;
	}
	.pband__icon {
		grid-column: 1;
		grid-row: 2; /* rangée du titre, pas du bloc entier */
		align-self: center; /* centre optique du titre */
		display: flex;
		color: var(--color-text-muted); /* grise, jamais l'accent */
	}
	.pband__icon :global(svg) {
		width: var(--pb-icon);
		height: var(--pb-icon);
		display: block;
	}
	.pband__eyebrow {
		grid-column: 2;
		grid-row: 1;
		margin: 0 0 3px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-primary); /* couleur de marque : bleu FilmPro / magenta LED */
	}
	.pband__title {
		grid-column: 2;
		grid-row: 2;
		margin: 0;
		font-size: 30px;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.022em;
		color: var(--color-text);
	}
	.pband__aside {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}
	.pband__count {
		display: inline-flex;
		align-items: center;
		height: 30px;
		padding: 0 13px;
		border-radius: var(--radius-full);
		background: var(--color-primary-light);
		color: var(--color-primary-hover);
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	/* Description : hors barre, indentée pile sous le titre, une seule ligne. */
	.pband__desc {
		margin: 9px 0 0;
		margin-left: calc(var(--pb-icon) + var(--pb-gap));
		font-size: 14px;
		line-height: 1.45;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pband__desc-mob {
		display: none;
	}

	@media (max-width: 767.98px) {
		.pband {
			--pb-icon: 38px;
			--pb-gap: 12px;
			padding: 4px 16px 14px;
		}
		.pband__title {
			font-size: 24px;
		}
		.pband__desc-desk {
			display: none;
		}
		.pband__desc-mob {
			display: inline;
		}
	}
</style>
