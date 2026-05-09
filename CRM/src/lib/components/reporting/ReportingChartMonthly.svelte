<script lang="ts">
	import type { MonthlyPipelineStat } from '$lib/server/reporting';
	import { formatMonth } from '$lib/utils/reportingFormat';

	type Props = {
		stats: MonthlyPipelineStat[];
	};

	let { stats }: Props = $props();

	const BAR_WIDTH = 36;
	const BAR_GAP = 12;
	const CHART_HEIGHT = 160;
	const CHART_PADDING_TOP = 24;
	const LABEL_GAP = 22;

	const maxCount = $derived(stats.length ? Math.max(...stats.map((s) => s.count), 1) : 1);
	const chartWidth = $derived(stats.length * (BAR_WIDTH + BAR_GAP));
	const totalHeight = CHART_HEIGHT + CHART_PADDING_TOP + LABEL_GAP;
	const allEmpty = $derived(stats.every((s) => s.count === 0));
</script>

{#if allEmpty}
	<div class="empty">
		<p>Aucune opportunité créée sur les 12 derniers mois.</p>
	</div>
{:else}
	<div class="chart-wrap">
		<svg
			width="100%"
			viewBox="0 0 {chartWidth} {totalHeight}"
			preserveAspectRatio="xMinYMid meet"
			role="img"
			aria-label="Graphique opportunités créées par mois sur 12 mois"
		>
			{#each stats as stat, i (stat.month)}
				{@const h = (stat.count / maxCount) * CHART_HEIGHT}
				{@const x = i * (BAR_WIDTH + BAR_GAP)}
				{@const y = CHART_PADDING_TOP + (CHART_HEIGHT - h)}
				<rect x={x} y={y} width={BAR_WIDTH} height={h || 2} rx="4" class="bar" />
				{#if stat.count > 0}
					<text x={x + BAR_WIDTH / 2} y={y - 8} text-anchor="middle" class="bar-value">
						{stat.count}
					</text>
				{/if}
				<text
					x={x + BAR_WIDTH / 2}
					y={CHART_HEIGHT + CHART_PADDING_TOP + LABEL_GAP - 4}
					text-anchor="middle"
					class="bar-label"
				>
					{formatMonth(stat.month)}
				</text>
			{/each}
		</svg>
	</div>
{/if}

<style>
	.chart-wrap {
		width: 100%;
		overflow-x: auto;
		scrollbar-width: thin;
	}
	.empty {
		text-align: center;
		padding: 40px 16px;
		color: var(--color-text-muted);
		font-size: 13px;
	}
	.bar {
		fill: var(--color-primary);
		opacity: 0.92;
		transition: opacity 180ms ease;
	}
	.bar:hover {
		opacity: 1;
	}
	.bar-value {
		font-size: 11px;
		fill: var(--color-primary-dark);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.bar-label {
		font-size: 11px;
		fill: var(--color-text-muted);
	}
</style>
