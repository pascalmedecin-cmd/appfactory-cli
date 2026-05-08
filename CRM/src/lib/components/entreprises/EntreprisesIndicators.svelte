<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { EntreprisesIndicatorsValues } from '$lib/utils/entreprisesFormat';

	type Props = {
		values: EntreprisesIndicatorsValues;
	};

	let { values }: Props = $props();

	const sansCantonWarn = $derived(values.sansCanton > 0);
</script>

<section class="indicators" aria-label="Indicateurs entreprises">
	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="business" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.total}</span>
			<div class="indicator-label">{values.total === 1 ? 'Entreprise' : 'Entreprises'}</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="verified" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.qualifiees}</span>
			<div class="indicator-label">Qualifiées</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="people" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.avecContact}</span>
			<div class="indicator-label">Avec contact</div>
		</div>
	</div>

	<div class="indicator" class:warning={sansCantonWarn}>
		<div class="indicator-icon">
			<Icon name="location_off" size={20} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.sansCanton}</span>
			<div class="indicator-label">Sans canton</div>
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
		align-items: center;
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
	.indicator.warning .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(247, 144, 9, 0.12), rgba(247, 144, 9, 0.02));
		color: var(--color-warning);
	}
	.indicator-body {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.indicator-value {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.02em;
		line-height: 1.25;
	}
	.indicator.warning .indicator-value {
		color: var(--color-warning);
	}
	.indicator-label {
		font-size: 13px;
		color: var(--color-text-muted);
		font-weight: 500;
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
