<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		formatCHF,
		formatPercent,
		conversionVariant,
		type ReportingIndicatorsValues,
	} from '$lib/utils/reportingFormat';

	type Props = {
		values: ReportingIndicatorsValues;
	};

	let { values }: Props = $props();

	const conversionVar = $derived(
		conversionVariant(values.conversionPct, values.conversionRatio.denominator)
	);
</script>

<section class="indicators" aria-label="Indicateurs reporting">
	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="payments" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{formatCHF(values.pipelineActifCHF)}</span>
			<div class="indicator-label">Pipeline actif</div>
			<div class="indicator-hint">Hors gagné/perdu</div>
		</div>
	</div>

	<div class="indicator" class:success={conversionVar === 'success'} class:warning={conversionVar === 'warning'}>
		<div class="indicator-icon">
			<Icon name="trending_up" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{formatPercent(values.conversionPct)}</span>
			<div class="indicator-label">Conversion leads</div>
			<div class="indicator-hint">
				{values.conversionRatio.numerator} / {values.conversionRatio.denominator} transférés
			</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="contacts" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.contacts30}</span>
			<div class="indicator-label">Contacts créés 30j</div>
			<div class="indicator-hint">{values.contacts90} sur 90j</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="conversion_path" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.opportunites30}</span>
			<div class="indicator-label">Opportunités 30j</div>
			<div class="indicator-hint">{values.opportunites90} sur 90j</div>
		</div>
	</div>
</section>

<style>
	.indicators {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 32px;
		padding: 24px 32px;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.indicator {
		display: grid;
		grid-template-columns: 40px 1fr;
		gap: 16px;
		align-items: start;
	}
	.indicator-icon {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: radial-gradient(circle at 30% 30%, rgba(47, 90, 158, 0.1), rgba(47, 90, 158, 0.02));
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: var(--color-primary);
	}
	.indicator.success .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(18, 183, 106, 0.12), rgba(18, 183, 106, 0.02));
		color: var(--color-success);
	}
	.indicator.warning .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(247, 144, 9, 0.12), rgba(247, 144, 9, 0.02));
		color: var(--color-warning);
	}
	.indicator-body {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.indicator-value {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.02em;
		line-height: 1.25;
	}
	.indicator.success .indicator-value {
		color: var(--color-success);
	}
	.indicator.warning .indicator-value {
		color: var(--color-warning);
	}
	.indicator-label {
		font-size: 13px;
		color: var(--color-text-muted);
		font-weight: 500;
		line-height: 1.5;
		margin-top: 2px;
	}
	.indicator-hint {
		font-size: 11px;
		color: var(--color-text-muted);
		font-weight: 500;
		opacity: 0.85;
		line-height: 1.5;
	}

	@media (max-width: 1024px) {
		.indicators {
			grid-template-columns: repeat(2, 1fr);
			gap: 24px;
		}
	}
	@media (max-width: 640px) {
		.indicators {
			grid-template-columns: 1fr;
			gap: 16px;
			padding: 16px;
		}
	}
</style>
