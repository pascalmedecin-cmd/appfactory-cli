<script lang="ts">
	import type { PageData } from './$types';
	import PageBand from '$lib/components/PageBand.svelte';
	import { page } from '$app/stores';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { isBandeauActive } from '$lib/pageBandeau';
	import { marqueLabel } from '$lib/marque';
	import {
		reportingIndicators,
		reportingTabs,
		exportEntries,
		type ReportingTab,
		type ReportingData,
	} from '$lib/utils/reportingFormat';
	import ReportingIndicators from '$lib/components/reporting/ReportingIndicators.svelte';
	import ReportingTabs from '$lib/components/reporting/ReportingTabs.svelte';
	import ReportingChartPipeline from '$lib/components/reporting/ReportingChartPipeline.svelte';
	import ReportingChartMonthly from '$lib/components/reporting/ReportingChartMonthly.svelte';
	import ReportingPipelineTable from '$lib/components/reporting/ReportingPipelineTable.svelte';
	import ReportingActivityCards from '$lib/components/reporting/ReportingActivityCards.svelte';
	import ReportingExportCards from '$lib/components/reporting/ReportingExportCards.svelte';

	let { data }: { data: PageData } = $props();

	// Cohérence UI : bandeau de page in-page (flag ff_page_bandeau). Source unique isBandeauActive,
	// partagée avec le Header → jamais de titre double ni absent. OFF → hero actuel strict.
	const bandeau = $derived(isBandeauActive(data.featureFlags, $page.url.pathname));

	let activeTab: ReportingTab = $state('synthese');

	const reporting: ReportingData = $derived({
		pipelineActifTotal: data.pipelineActifTotal,
		conversion: data.conversion,
		activityContacts: data.activityContacts,
		activityEntreprises: data.activityEntreprises,
		activityOpportunites: data.activityOpportunites,
	});

	const indicators = $derived(reportingIndicators(reporting));
	const tabs = reportingTabs();
	const exports = $derived(exportEntries(reporting));

	$effect(() => {
		$pageSubtitle = "Métriques d'activité et de pipeline";
	});

	function setTab(tab: ReportingTab) {
		activeTab = tab;
	}
</script>

<svelte:head>
	<title>Reporting · {marqueLabel(data.marqueActive)}</title>
</svelte:head>

<div class="page">
	{#if bandeau}
		<PageBand
			icon="bar_chart"
			eyebrow="Les chiffres"
			title="Reporting"
			desc="Métriques d'activité et de pipeline."
		/>
	{:else}
		<header class="hero">
			<!-- Audit 360 V2c H-26 : h2 (le h1 unique de la page est dans Header.svelte). -->
			<h2>Reporting</h2>
			<p>Synthèse opérationnelle {marqueLabel(data.marqueActive)} - pipeline, conversion, activité.</p>
		</header>
	{/if}

	<ReportingIndicators values={indicators} />

	<ReportingTabs active={activeTab} {tabs} onSelect={setTab} />

	<div class="content">
		{#if activeTab === 'synthese'}
			<div role="tabpanel" id="panel-synthese" aria-labelledby="tab-synthese">
				<div class="grid-2">
					<section class="panel">
						<header class="panel-header">
							<h2>Pipeline par étape</h2>
							<span class="panel-hint">Compte d'opportunités</span>
						</header>
						<ReportingChartPipeline stats={data.pipelineEtape} />
					</section>

					<section class="panel">
						<header class="panel-header">
							<h2>Évolution mensuelle</h2>
							<span class="panel-hint">Opportunités créées · 12 mois</span>
						</header>
						<ReportingChartMonthly stats={data.monthlyPipeline} />
					</section>
				</div>

				<section class="panel mt-24">
					<header class="panel-header">
						<h2>Activité</h2>
						<span class="panel-hint">Création de contacts, entreprises, opportunités</span>
					</header>
					<ReportingActivityCards
						contacts={data.activityContacts}
						entreprises={data.activityEntreprises}
						opportunites={data.activityOpportunites}
					/>
				</section>
			</div>
		{:else if activeTab === 'pipeline'}
			<div role="tabpanel" id="panel-pipeline" aria-labelledby="tab-pipeline">
				<section class="panel">
					<header class="panel-header">
						<h2>Pipeline détaillé par étape</h2>
						<span class="panel-hint">Compte et montants par étape pipeline</span>
					</header>
					<ReportingChartPipeline stats={data.pipelineEtape} />
					<div class="mt-24 desktop-only">
						<ReportingPipelineTable stats={data.pipelineEtape} />
					</div>
				</section>
			</div>
		{:else if activeTab === 'activite'}
			<div role="tabpanel" id="panel-activite" aria-labelledby="tab-activite">
				<section class="panel">
					<header class="panel-header">
						<h2>Évolution mensuelle des opportunités</h2>
						<span class="panel-hint">12 derniers mois</span>
					</header>
					<ReportingChartMonthly stats={data.monthlyPipeline} />
				</section>

				<section class="panel mt-24">
					<header class="panel-header">
						<h2>Activité 30 / 90 jours</h2>
						<span class="panel-hint">Création de fiches</span>
					</header>
					<ReportingActivityCards
						contacts={data.activityContacts}
						entreprises={data.activityEntreprises}
						opportunites={data.activityOpportunites}
					/>
				</section>
			</div>
		{:else if activeTab === 'export'}
			<div role="tabpanel" id="panel-export" aria-labelledby="tab-export">
				<section class="panel desktop-only">
					<header class="panel-header">
						<h2>Export CSV</h2>
						<span class="panel-hint">Données complètes pour utilisation externe</span>
					</header>
					<ReportingExportCards entries={exports} />
				</section>
				<div class="mobile-only-banner">
					<p>Export CSV optimisé pour ordinateur. Ouvrez le CRM depuis un ordinateur pour télécharger les fichiers.</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Refonte mobile S191 : masquer ReportingPipelineTable + Export CSV en viewport < 1024px. */
	.mobile-only-banner {
		display: none;
		margin: 24px;
		padding: 20px;
		border: 1px solid var(--color-border-soft);
		border-radius: var(--radius-card);
		background: var(--color-card);
		color: var(--color-text-muted);
		text-align: center;
		font-size: 14px;
		line-height: 1.5;
	}
	@media (max-width: 1023.98px) {
		.desktop-only {
			display: none;
		}
		.mobile-only-banner {
			display: block;
		}
	}

	.page {
		display: flex;
		flex-direction: column;
	}
	.hero {
		padding: 32px 32px 24px;
		background: var(--color-surface);
	}
	.hero h2 {
		font-size: 22px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.01em;
		margin: 0;
	}
	.hero p {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 8px 0 0;
	}
	.content {
		padding: 32px;
	}
	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}
	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 24px;
	}
	/* Cohérence UI (b, INC-6, flag ff_ui_coherence) : le panneau reporting était le seul panneau de contenu
	   sans ombre → shadow-card, aligné sur les autres surfaces. Co-localisé + gaté ⇒ OFF strictement inchangé. */
	:global(.coherence-ui) .panel {
		box-shadow: var(--shadow-card);
	}
	/* Cohérence UI d1 : la gouttière horizontale est portée par le socle (.crm-page-wrap) ; le hero et
	   la zone de contenu remettent la leur à 0. padding-inline seul → vertical (32/24 hero, 32 content,
	   + paliers 24/16) préservé. Co-localisé 0-3-0 > base + médias 0-1-0. OFF ⇒ inerte. */
	:global(.coherence-ui) .hero {
		padding-inline: 0;
	}
	:global(.coherence-ui) .content {
		padding-inline: 0;
	}
	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 16px;
	}
	.panel-header h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-primary-dark);
	}
	.panel-hint {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.mt-24 {
		margin-top: 24px;
	}

	@media (max-width: 1024px) {
		.hero {
			padding: 24px;
		}
		.content {
			padding: 24px;
		}
		.grid-2 {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 640px) {
		.hero {
			padding: 16px;
		}
		.hero h2 {
			font-size: 20px;
		}
		.content {
			padding: 16px;
		}
		.panel {
			padding: 16px;
		}
	}
</style>
