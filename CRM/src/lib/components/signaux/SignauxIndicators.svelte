<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { SignauxIndicatorsValues } from '$lib/utils/signauxFormat';

	type Props = {
		values: SignauxIndicatorsValues;
	};

	let { values }: Props = $props();

	const nouveauxWarn = $derived(values.nouveaux > 0);
</script>

<section class="indicators" aria-label="Indicateurs signaux">
	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="radar" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.total}</span>
			<div class="indicator-label">{values.total === 1 ? 'Signal' : 'Signaux'}</div>
		</div>
	</div>

	<div class="indicator" class:warning={nouveauxWarn}>
		<div class="indicator-icon">
			<Icon name="fiber_new" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.nouveaux}</span>
			<div class="indicator-label">{values.nouveaux === 1 ? 'À triager' : 'À triager'}</div>
			{#if nouveauxWarn}
				<div class="indicator-trend warning">Action requise</div>
			{/if}
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="track_changes" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.aConvertir}</span>
			<div class="indicator-label">À convertir</div>
		</div>
	</div>

	<div class="indicator success">
		<div class="indicator-icon">
			<Icon name="check_circle" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.convertis}</span>
			<div class="indicator-label">{values.convertis === 1 ? 'Converti' : 'Convertis'}</div>
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
		background: radial-gradient(circle at 30% 30%, rgba(247, 144, 9, 0.1), rgba(247, 144, 9, 0.02));
		color: var(--color-warning-deep);
	}
	.indicator.success .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02));
		color: var(--color-success-deep);
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
	.indicator-trend.warning {
		color: var(--color-warning-deep);
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
