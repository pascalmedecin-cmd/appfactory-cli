<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { formatEur, formatPercent, type CostKpi } from '$lib/utils/coutsFormat';

	type Props = {
		kpi: CostKpi;
	};

	let { kpi }: Props = $props();

	const trendKnown = $derived(Number.isFinite(kpi.trend7dRatio));
	const trendVariant = $derived(
		!trendKnown ? 'neutral' : kpi.trend7dRatio > 0.1 ? 'warning' : kpi.trend7dRatio < -0.05 ? 'success' : 'neutral'
	);
	const trendLabel = $derived(trendKnown ? formatPercent(kpi.trend7dRatio) : '—');
</script>

<section class="indicators" aria-label="Indicateurs coûts API">
	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="payments" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{formatEur(kpi.total30dEur)}</span>
			<div class="indicator-label">Coûts 30 jours</div>
			<div class="indicator-trend muted">
				{kpi.runs30d} {kpi.runs30d === 1 ? 'run' : 'runs'}
			</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="bar_chart" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{formatEur(kpi.total12wEur)}</span>
			<div class="indicator-label">Coûts 12 semaines</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="receipt_long" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{formatEur(kpi.avgRunEur)}</span>
			<div class="indicator-label">Coût moyen / run</div>
		</div>
	</div>

	<div class="indicator" class:warning={trendVariant === 'warning'} class:success={trendVariant === 'success'}>
		<div class="indicator-icon">
			<Icon
				name={trendVariant === 'warning' ? 'trending_up' : trendVariant === 'success' ? 'trending_down' : 'trending_flat'}
				size={22}
			/>
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{trendLabel}</span>
			<div class="indicator-label">Tendance 7 jours</div>
			<div class="indicator-trend muted">vs 7j précédents</div>
		</div>
	</div>
</section>

<style>
	.indicators {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0;
		padding: 24px 32px 28px;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.indicator {
		padding: 0 28px 0 0;
		display: flex;
		gap: 16px;
		align-items: flex-start;
		position: relative;
	}
	.indicator + .indicator {
		padding-left: 28px;
	}
	.indicator + .indicator::before {
		content: '';
		position: absolute;
		top: 4px;
		bottom: 4px;
		left: 0;
		width: 1px;
		background: var(--color-border);
	}
	.indicator-icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-xl);
		background: radial-gradient(circle at 30% 30%, rgba(47, 90, 158, 0.1), rgba(47, 90, 158, 0.02));
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: var(--color-primary);
	}
	.indicator.warning .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(247, 144, 9, 0.12), rgba(247, 144, 9, 0.02));
		color: var(--color-warning-deep);
	}
	.indicator.success .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.02));
		color: var(--color-success-deep);
	}
	.indicator-body {
		flex: 1;
		min-width: 0;
		padding-top: 2px;
	}
	.indicator-value {
		font-size: 28px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.025em;
		line-height: 1.1;
	}
	.indicator.warning .indicator-value {
		color: var(--color-warning-deep);
	}
	.indicator.success .indicator-value {
		color: var(--color-success-deep);
	}
	.indicator-label {
		font-size: 13px;
		color: var(--color-text-muted);
		font-weight: 500;
		margin-top: 8px;
	}
	.indicator-trend {
		font-size: 11px;
		font-weight: 600;
		margin-top: 4px;
	}
	.indicator-trend.muted {
		color: var(--color-text-muted);
		font-weight: 500;
	}

	@media (max-width: 1024px) {
		.indicators {
			grid-template-columns: repeat(2, 1fr);
			gap: 24px;
			padding: 20px 24px;
		}
		.indicator {
			padding-right: 0;
		}
		.indicator + .indicator {
			padding-left: 0;
		}
		.indicator + .indicator::before {
			display: none;
		}
	}
	@media (max-width: 640px) {
		.indicators {
			grid-template-columns: 1fr;
			gap: 16px;
		}
	}
</style>
