<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { ContactsIndicatorsValues } from '$lib/utils/contactsFormat';

	type Props = {
		values: ContactsIndicatorsValues;
	};

	let { values }: Props = $props();

	const sansEntrepriseWarn = $derived(values.sansEntreprise > 5);
</script>

<section class="indicators" aria-label="Indicateurs contacts">
	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="contacts" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.total}</span>
			<div class="indicator-label">{values.total === 1 ? 'Contact' : 'Contacts'}</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="verified" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.prescripteurs}</span>
			<div class="indicator-label">{values.prescripteurs === 1 ? 'Prescripteur' : 'Prescripteurs'}</div>
		</div>
	</div>

	<div class="indicator">
		<div class="indicator-icon">
			<Icon name="trending_up" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.nouveauxThisMonth}</span>
			<div class="indicator-label">Nouveaux ce mois</div>
		</div>
	</div>

	<div class="indicator" class:warning={sansEntrepriseWarn}>
		<div class="indicator-icon">
			<Icon name="business" size={22} />
		</div>
		<div class="indicator-body">
			<span class="indicator-value tabular-nums">{values.sansEntreprise}</span>
			<div class="indicator-label">Sans entreprise</div>
			{#if sansEntrepriseWarn}
				<div class="indicator-trend warning">À rattacher</div>
			{/if}
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
		color: var(--color-warning);
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
		color: var(--color-warning);
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
