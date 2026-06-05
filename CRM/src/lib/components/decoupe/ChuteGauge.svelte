<!--
  ChuteGauge : jauge du taux de chute d'un plan de découpe (signal central, brief §6.6).
  Barre + pourcentage, couleur par seuil (bas = bon). Accessible (aria-label chiffré).
-->
<script lang="ts">
	let { taux, compact = false }: { taux: number; compact?: boolean } = $props();

	const pct = $derived(Math.max(0, Math.min(1, taux)) * 100);
	const level = $derived(pct <= 15 ? 'good' : pct <= 30 ? 'mid' : 'high');
	const pctLabel = $derived(pct.toFixed(1).replace('.', ','));
</script>

<div class="gauge" class:gauge--compact={compact}>
	<div class="gauge-head">
		<span class="gauge-label">Taux de chute</span>
		<span class="gauge-value gauge-value--{level}">{pctLabel}&nbsp;%</span>
	</div>
	<div
		class="gauge-track"
		role="img"
		aria-label={`Taux de chute ${pctLabel} pour cent`}
	>
		<div class="gauge-fill gauge-fill--{level}" style="width:{Math.max(pct, 1.5)}%"></div>
	</div>
</div>

<style>
	.gauge {
		min-width: 150px;
	}
	.gauge-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 6px;
	}
	.gauge-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.gauge-value {
		font-size: 19px;
		font-weight: 700;
		letter-spacing: -0.01em;
		font-variant-numeric: tabular-nums;
	}
	.gauge-value--good {
		color: var(--color-success);
	}
	.gauge-value--mid {
		color: #b54708;
	}
	.gauge-value--high {
		color: var(--color-danger);
	}
	.gauge-track {
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		box-shadow: inset 0 0 0 1px var(--color-border);
		overflow: hidden;
	}
	.gauge-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width 420ms var(--ease-out-expo);
	}
	.gauge-fill--good {
		background: linear-gradient(90deg, #2fa56a, var(--color-success));
	}
	.gauge-fill--mid {
		background: linear-gradient(90deg, #f5a33b, var(--color-warning));
	}
	.gauge-fill--high {
		background: linear-gradient(90deg, #f3705f, var(--color-danger));
	}
	.gauge--compact .gauge-value {
		font-size: 16px;
	}

	@media (prefers-reduced-motion: reduce) {
		.gauge-fill {
			transition: none;
		}
	}
</style>
