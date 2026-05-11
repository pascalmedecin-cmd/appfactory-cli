<script lang="ts">
	import type { PageData } from './$types';
	import CoutsIndicators from '$lib/components/couts/CoutsIndicators.svelte';
	import CoutsChart from '$lib/components/couts/CoutsChart.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Coûts API · CRM FilmPro</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<div>
			<!-- Audit 360 V2c H-26 : h2 (le h1 unique de la page est dans Header.svelte). -->
			<h2>Coûts API Claude</h2>
			<p class="subtitle">
				Suivi des dépenses de la veille hebdomadaire sur 12 semaines glissantes.
			</p>
		</div>
	</header>

	<CoutsIndicators kpi={data.kpi} />

	<section class="chart-section">
		<header class="section-header">
			<h2>Évolution sur 12 semaines</h2>
			<p class="section-subtitle">Total hebdomadaire en euros.</p>
		</header>
		<CoutsChart weeks={data.weeks} />
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
	.page-header h2 {
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
	.chart-section {
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

	@media (max-width: 1024px) {
		.page-header,
		.chart-section {
			padding: 24px;
		}
	}
	@media (max-width: 640px) {
		.page-header,
		.chart-section {
			padding: 16px;
		}
		.page-header h2 {
			font-size: 20px;
		}
	}
</style>
