<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { formatMontantCompact, type IndicatorsValues } from '$lib/utils/pipelineFormat';

	type Props = {
		values: IndicatorsValues;
	};

	let { values }: Props = $props();

	const valueActiveLabel = $derived(formatMontantCompact(values.valueActive) ?? '0 CHF');
	const wonValueLabel = $derived(formatMontantCompact(values.wonThisMonthValue) ?? '0 CHF');
	const overdueLabels = $derived(values.overdue > 0 ? `${values.overdue} relance${values.overdue === 1 ? '' : 's'} à rattraper` : 'Tout à jour');
</script>

<section class="indicators" aria-label="Indicateurs pipeline">
	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="business" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.active}</span>
			<div class="indicator-label">{values.active === 1 ? 'Opportunité active' : 'Opportunités actives'}</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="trending_up" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{valueActiveLabel}</span>
			<div class="indicator-label">Valeur pipeline</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="emoji_events" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.wonThisMonthCount}</span>
			{#if values.wonThisMonthCount > 0}
				<span class="indicator-value-secondary">· {wonValueLabel}</span>
			{/if}
			<div class="indicator-label">Gagné ce mois</div>
		</div>
	</div>

	<div class="indicator" class:warning={values.overdue > 0}>
		<div class="indicator-icon">
			<Icon name="schedule" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.overdue}</span>
			<div class="indicator-label">Relances en retard</div>
			<div class="indicator-trend" class:warning={values.overdue > 0} class:muted={values.overdue === 0}>
				{overdueLabels}
			</div>
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
		border-radius: 12px;
		background: radial-gradient(circle at 30% 30%, rgba(47, 90, 158, 0.1), rgba(47, 90, 158, 0.02));
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: var(--color-primary);
	}
	.indicator.warning .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(192, 57, 26, 0.12), rgba(192, 57, 26, 0.02));
		color: var(--color-danger);
	}
	.indicator-body {
		flex: 1;
		min-width: 0;
		padding-top: 2px;
	}
	.indicator-value {
		font-size: 36px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.025em;
		line-height: 1;
	}
	.indicator.warning .indicator-value {
		color: var(--color-danger);
	}
	.indicator-value-secondary {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-left: 8px;
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
	.indicator-trend.warning {
		color: var(--color-warning);
	}
	.indicator-trend.muted {
		color: var(--color-text-muted);
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
