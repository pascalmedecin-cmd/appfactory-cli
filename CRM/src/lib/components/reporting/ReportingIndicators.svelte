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
	/* Cohérence UI d1 : gouttière portée par le socle (.crm-page-wrap) ; la barre de pouls remet la sienne
	   à 0 (les cellules .indicator gardent leur padding interne). Co-localisé 0-3-0 > base + média (0-1-0).
	   Vertical + bordures pleine largeur préservés. OFF ⇒ .coherence-ui absent ⇒ inerte.
	   d3 : le calibrage vertical du pouls (4/16, aligné KpiStrip) est porté par reporting/+page.svelte, SCOPÉ
	   au cas bandeau-présent (`.pband + .indicators`) — sinon il dégraderait l'état ff_page_bandeau OFF
	   (hero→pouls passerait de 48 à 28, hors échelle). Ici on ne touche QUE la gouttière (d1). */
	:global(.coherence-ui) .indicators {
		padding-inline: 0;
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
		border-radius: var(--radius-md);
		background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: var(--color-primary);
	}
	.indicator.success .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(18, 183, 106, 0.12), rgba(18, 183, 106, 0.02));
		color: var(--color-success-deep);
	}
	.indicator.warning .indicator-icon {
		background: radial-gradient(circle at 30% 30%, rgba(247, 144, 9, 0.12), rgba(247, 144, 9, 0.02));
		color: var(--color-warning-deep);
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
		color: var(--color-success-deep);
	}
	.indicator.warning .indicator-value {
		color: var(--color-warning-deep);
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
