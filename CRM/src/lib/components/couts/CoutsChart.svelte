<script lang="ts">
	import { Chart, Svg, Bars, Axis } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import { formatEur, type WeekAggregate } from '$lib/utils/coutsFormat';

	type Props = {
		weeks: WeekAggregate[];
	};

	let { weeks }: Props = $props();

	const data = $derived(
		weeks.map((w) => ({
			weekKey: w.weekKey,
			weekShort: w.weekKey.slice(5),
			veille: w.byFeature.veille,
			signaux: w.byFeature.signaux,
			autre: w.byFeature.autre,
			total: w.totalEur,
			runs: w.runsCount
		}))
	);

	const allEmpty = $derived(data.every((d) => d.total === 0));
	const maxValue = $derived(Math.max(...data.map((d) => d.total), 0.01));
</script>

<div class="chart-container" aria-label="Graphique coûts hebdomadaires sur 12 semaines">
	{#if allEmpty}
		<div class="empty">
			<p>Aucune donnée sur 12 semaines.</p>
			<p class="empty-hint">Les coûts apparaîtront après le premier run veille publié.</p>
		</div>
	{:else}
		<Chart
			{data}
			x="weekShort"
			xScale={scaleBand().padding(0.25)}
			y="total"
			yDomain={[0, maxValue * 1.1]}
			yNice
			padding={{ top: 16, bottom: 32, left: 64, right: 16 }}
		>
			<Svg>
				<Axis placement="left" grid rule format={(v) => formatEur(Number(v))} />
				<Axis placement="bottom" rule />
				<Bars radius={4} class="cost-bar" strokeWidth={0} />
			</Svg>
		</Chart>

		<div class="legend">
			{#each data.filter((d) => d.total > 0) as d (d.weekKey)}
				<div class="legend-item" title="{d.weekKey} : {formatEur(d.total)} ({d.runs} run{d.runs > 1 ? 's' : ''})">
					<span class="legend-dot"></span>
					<span class="legend-label">{d.weekShort}</span>
					<span class="legend-value tabular-nums">{formatEur(d.total)}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chart-container {
		padding: 16px 0;
	}
	:global(.cost-bar) {
		fill: var(--color-primary);
		opacity: 0.85;
		transition: opacity 0.2s ease;
	}
	:global(.cost-bar:hover) {
		opacity: 1;
	}
	.empty {
		height: 240px;
		display: grid;
		place-items: center;
		text-align: center;
		color: var(--color-text-muted);
	}
	.empty p {
		margin: 4px 0;
	}
	.empty-hint {
		font-size: 13px;
		color: var(--color-text-muted);
	}
	:global(.chart-container .layerchart-chart) {
		height: 280px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		padding: 16px 0 0;
		font-size: 12px;
		color: var(--color-text-muted);
		border-top: 1px solid var(--color-border);
		margin-top: 12px;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		background: var(--color-primary);
	}
	.legend-label {
		font-weight: 600;
		color: var(--color-text);
	}
	.legend-value {
		color: var(--color-text-muted);
	}
</style>
