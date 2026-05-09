<script lang="ts">
	import type { PageData } from './$types';
	import DataTable from '$lib/components/DataTable.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CoutsIndicators from '$lib/components/couts/CoutsIndicators.svelte';
	import CoutsChart from '$lib/components/couts/CoutsChart.svelte';
	import {
		formatEur,
		formatUsd,
		formatTokens,
		formatDuration,
		formatDateTime,
		featureLabel,
		statusLabel,
		filterRunsByFeature,
		type CostRun
	} from '$lib/utils/coutsFormat';

	let { data }: { data: PageData } = $props();

	type FeatureFilter = 'all' | CostRun['feature'];
	let activeFeature = $state<FeatureFilter>('all');

	const filteredRuns = $derived(filterRunsByFeature(data.runs, activeFeature));

	const tabsSpec = $derived([
		{ key: 'all' as FeatureFilter, label: 'Tous', count: data.runs.length },
		{
			key: 'veille' as FeatureFilter,
			label: 'Veille hebdo',
			count: data.runs.filter((r) => r.feature === 'veille').length
		},
		{
			key: 'signaux' as FeatureFilter,
			label: 'Signaux',
			count: data.runs.filter((r) => r.feature === 'signaux').length
		},
		{
			key: 'autre' as FeatureFilter,
			label: 'Autre',
			count: data.runs.filter((r) => r.feature === 'autre').length
		}
	]);

	function onTabKeydown(e: KeyboardEvent, key: FeatureFilter) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activeFeature = key;
		}
	}

	const tableColumns = [
		{ key: 'date', label: 'Date', sortable: true, minWidth: 140 },
		{ key: 'feature', label: 'Feature', sortable: true, minWidth: 120 },
		{ key: 'status', label: 'Statut', sortable: true, minWidth: 100 },
		{ key: 'model', label: 'Modèle', minWidth: 160 },
		{ key: 'duration', label: 'Durée', minWidth: 100 },
		{ key: 'tokens', label: 'Tokens', minWidth: 100 },
		{ key: 'eur', label: 'Coût (€)', sortable: true, minWidth: 100, class: 'text-right' },
		{ key: 'usd', label: 'Coût ($)', minWidth: 100, class: 'text-right' }
	];

	function rowAriaLabelFor(r: CostRun): string {
		return `Run ${r.run_id}, ${featureLabel(r.feature)}, ${statusLabel(r.status).label}, ${formatEur(r.total_eur)}`;
	}

	const emptyMessage = $derived(
		data.runs.length === 0
			? 'Aucun run enregistré. Les coûts apparaîtront après le premier run veille publié.'
			: `Aucun run pour le filtre « ${tabsSpec.find((t) => t.key === activeFeature)?.label ?? 'inconnu'} ».`
	);
</script>

<svelte:head>
	<title>Coûts API · CRM FilmPro</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<div>
			<h1>Coûts API Claude</h1>
			<p class="subtitle">Suivi des dépenses par feature sur 12 semaines glissantes.</p>
		</div>
	</header>

	<CoutsIndicators kpi={data.kpi} />

	<section class="chart-section">
		<header class="section-header">
			<h2>Évolution sur 12 semaines</h2>
			<p class="section-subtitle">Total hebdomadaire toutes features confondues.</p>
		</header>
		<CoutsChart weeks={data.weeks} />
	</section>

	<section class="table-section">
		<header class="section-header">
			<h2>Runs récents</h2>
			<p class="section-subtitle">
				Détail des derniers runs enregistrés. Tri par date décroissante.
			</p>
		</header>

		<div class="tabs-bar" role="tablist" aria-label="Filtre par feature">
			{#each tabsSpec as tab (tab.key)}
				<button
					type="button"
					role="tab"
					aria-selected={activeFeature === tab.key}
					aria-controls="couts-runs-table"
					tabindex={activeFeature === tab.key ? 0 : -1}
					class="tab"
					class:active={activeFeature === tab.key}
					onclick={() => (activeFeature = tab.key)}
					onkeydown={(e) => onTabKeydown(e, tab.key)}
				>
					<span>{tab.label}</span>
					<span class="tab-count tabular-nums">{tab.count}</span>
				</button>
			{/each}
		</div>

		<div id="couts-runs-table" class="table-wrapper">
			<DataTable
				data={filteredRuns}
				columns={tableColumns}
				searchable={false}
				dense
				resizable
				storageKey="crm.couts.table"
				stickyLeftCols={1}
				rowAriaLabel={rowAriaLabelFor}
				{emptyMessage}
			>
				{#snippet row(r: CostRun)}
					{@const sl = statusLabel(r.status)}
					<td>{formatDateTime(r.started_at)}</td>
					<td>{featureLabel(r.feature)}</td>
					<td>
						<Badge variant={sl.variant} label={sl.label} />
					</td>
					<td class="model">{r.model}</td>
					<td class="tabular-nums">{formatDuration(r.duration_seconds)}</td>
					<td class="tabular-nums">
						{formatTokens(
							r.total_input_tokens + r.total_output_tokens + r.total_cache_read_tokens + r.total_cache_creation_tokens
						)}
					</td>
					<td class="text-right tabular-nums">{formatEur(r.total_eur)}</td>
					<td class="text-right tabular-nums muted">{formatUsd(r.total_usd)}</td>
				{/snippet}
			</DataTable>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 1280px;
		margin: 0 auto;
	}
	.page-header {
		padding: 32px 32px 24px;
	}
	.page-header h1 {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.01em;
		margin: 0;
	}
	.subtitle {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 8px 0 0;
	}
	.chart-section,
	.table-section {
		padding: 32px;
	}
	.section-header {
		margin-bottom: 16px;
	}
	.section-header h2 {
		font-size: 16px;
		font-weight: 700;
		color: var(--color-primary-dark);
		margin: 0;
	}
	.section-subtitle {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 4px 0 0;
	}
	.tabs-bar {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0;
		overflow-x: auto;
		scrollbar-width: thin;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		background: transparent;
		border: 0;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: color 0.15s ease, border-color 0.15s ease;
		white-space: nowrap;
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -4px;
		border-radius: 4px;
	}
	.tab-count {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 999px;
		background: var(--color-surface-alt, var(--color-border));
		color: var(--color-text-muted);
	}
	.tab.active .tab-count {
		background: var(--color-primary);
		color: white;
	}
	.table-wrapper {
		margin-top: 0;
	}
	.model {
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.muted {
		color: var(--color-text-muted);
	}
	.text-right {
		text-align: right;
	}

	@media (max-width: 1024px) {
		.page-header,
		.chart-section,
		.table-section {
			padding: 24px;
		}
	}
	@media (max-width: 640px) {
		.page-header,
		.chart-section,
		.table-section {
			padding: 16px;
		}
		.page-header h1 {
			font-size: 20px;
		}
	}
</style>
