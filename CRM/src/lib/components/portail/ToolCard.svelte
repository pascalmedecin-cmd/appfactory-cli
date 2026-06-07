<!--
  ToolCard : carte d'un outil du portail. Seul composant à machine à états.
  - state="active"  → vrai <a href> navigable (clavier + lecteur d'écran), lift au survol, CTA.
  - state="soon"    → conteneur non interactif (aria-disabled), badge "Bientôt disponible", atténué.
  L'icône est passée en snippet (SVG ligne 24px, stroke 1.75). aria-hidden côté appelant.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		titre,
		sousTitre,
		href = undefined,
		state = 'active',
		ariaLabel,
		icon
	}: {
		titre: string;
		sousTitre: string;
		href?: string;
		state?: 'active' | 'soon';
		ariaLabel: string;
		icon: Snippet;
	} = $props();
</script>

{#if state === 'active'}
	<a {href} class="card card--active" aria-label={ariaLabel}>
		<span class="icon-tile icon-tile--active" aria-hidden="true">{@render icon()}</span>
		<h2 class="card-title">{titre}</h2>
		<p class="card-sub">{sousTitre}</p>
		<span class="card-cta">
			Ouvrir l'outil
			<svg
				class="arrow"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M5 12h14" />
				<path d="m13 6 6 6-6 6" />
			</svg>
		</span>
	</a>
{:else}
	<div class="card card--disabled" role="group" aria-disabled="true" aria-label={ariaLabel}>
		<span class="badge">Bientôt disponible</span>
		<span class="icon-tile icon-tile--muted" aria-hidden="true">{@render icon()}</span>
		<h2 class="card-title">{titre}</h2>
		<p class="card-sub">{sousTitre}</p>
	</div>
{/if}

<style>
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-card);
		padding: 24px;
		min-height: 196px;
		text-decoration: none;
		transition:
			transform var(--dur, 250ms) var(--ease-out-expo),
			box-shadow var(--dur, 250ms) var(--ease-out-expo);
		will-change: transform;
	}

	.card--active {
		cursor: pointer;
	}
	.card--active:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-card-hover), 0 0 0 1px color-mix(in srgb, var(--color-primary) 16%, transparent);
	}
	.card--active:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 3px;
	}
	.card--active:active {
		transform: translateY(-1px);
	}

	.card--disabled {
		opacity: 0.72;
		cursor: not-allowed;
	}

	.icon-tile {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-xl);
		display: grid;
		place-items: center;
		margin-bottom: 18px;
		flex: none;
	}
	.icon-tile--active {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.icon-tile--muted {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
	.icon-tile :global(svg) {
		display: block;
	}

	.card-title {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text);
		margin-bottom: 6px;
	}
	.card-sub {
		font-size: 14.5px;
		line-height: 1.5;
		color: var(--color-text-body);
	}
	.card--disabled .card-sub {
		color: var(--color-text-muted);
	}

	.card-cta {
		margin-top: auto;
		padding-top: 20px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
	}
	.card-cta .arrow {
		transition: transform var(--dur, 250ms) var(--ease-out-expo);
	}
	.card--active:hover .card-cta .arrow,
	.card--active:focus-visible .card-cta .arrow {
		transform: translateX(4px);
	}

	.badge {
		position: absolute;
		top: 20px;
		right: 20px;
		display: inline-flex;
		align-items: center;
		font-size: 11.5px;
		font-weight: 500;
		letter-spacing: 0.01em;
		color: var(--color-info-deep);
		background: var(--color-info-light);
		padding: 4px 10px;
		border-radius: var(--radius-full);
	}

	@media (prefers-reduced-motion: reduce) {
		.card,
		.card-cta .arrow {
			transition: none;
		}
		.card--active:hover {
			transform: none;
		}
	}
</style>
