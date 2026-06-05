<!--
  PlanDecoupeSvg : plan de placement d'un produit (brief §6.6). Bande horizontale
  laize × longueur consommée (échelle réelle, mm). Chaque pièce = rectangle placé,
  coloré par vitre. Repères verticaux tous les 1 m. role="img" + aria-label résumé ;
  la table de repli (PlanDecoupeTable) reste la source exécutable accessible (AC-017).
-->
<script lang="ts">
	import type { PlanProduit } from '$lib/decoupe/types';

	let {
		plan,
		colorOf,
		ariaLabel
	}: { plan: PlanProduit; colorOf: (vitreId: string) => string; ariaLabel: string } = $props();

	// Repères d'échelle verticaux tous les 1 m le long du rouleau.
	const reperes = $derived.by(() => {
		const out: number[] = [];
		for (let x = 1000; x < plan.longueur_consommee_mm; x += 1000) out.push(x);
		return out;
	});
</script>

<div class="plan-wrap">
	<svg
		class="plan-svg"
		viewBox={`0 0 ${plan.longueur_consommee_mm} ${plan.laize_mm}`}
		preserveAspectRatio="xMinYMin meet"
		role="img"
		aria-label={ariaLabel}
	>
		<!-- Rouleau (laize × longueur) -->
		<rect
			x="0"
			y="0"
			width={plan.longueur_consommee_mm}
			height={plan.laize_mm}
			class="plan-roll"
			vector-effect="non-scaling-stroke"
		/>

		<!-- Repères d'échelle (1 m) -->
		{#each reperes as r (r)}
			<line
				x1={r}
				y1="0"
				x2={r}
				y2={plan.laize_mm}
				class="plan-grid"
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- Pièces placées : x = position le long du rouleau (y_mm), y = position en travers (x_mm) -->
		{#each plan.placements as pl, i (`${pl.vitre_id}-${pl.piece_index}-${pl.les_index ?? 0}-${i}`)}
			<rect
				x={pl.y_mm}
				y={pl.x_mm}
				width={pl.hauteur_placee_mm}
				height={pl.largeur_placee_mm}
				rx="6"
				fill={colorOf(pl.vitre_id)}
				class="plan-piece"
				vector-effect="non-scaling-stroke"
			>
				<title
					>{pl.hauteur_placee_mm} × {pl.largeur_placee_mm} mm{pl.pivotee
						? ' (pivotée)'
						: ''}{pl.les_index !== undefined ? ` · lé ${pl.les_index + 1}` : ''}</title
				>
			</rect>
		{/each}
	</svg>
</div>

<style>
	.plan-wrap {
		width: 100%;
		max-height: 64vh;
		overflow: auto;
		border-radius: var(--radius-lg);
		background:
			linear-gradient(var(--color-surface-alt), var(--color-surface-alt)) padding-box;
		padding: 10px;
	}
	.plan-svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.plan-roll {
		fill: var(--color-surface);
		stroke: var(--color-border-strong);
		stroke-width: 1.5;
	}
	.plan-grid {
		stroke: var(--color-border);
		stroke-width: 1;
		stroke-dasharray: 4 5;
	}
	.plan-piece {
		stroke: #ffffff;
		stroke-width: 1.5;
		transition: fill-opacity 160ms var(--ease-out-expo);
	}
	.plan-piece:hover {
		fill-opacity: 0.82;
	}
	@media (prefers-reduced-motion: reduce) {
		.plan-piece {
			transition: none;
		}
	}
</style>
