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

	<div class="desktop-only">
		<CoutsIndicators kpi={data.kpi} />

		<section class="chart-section">
			<header class="section-header">
				<h2>Évolution sur 12 semaines</h2>
				<p class="section-subtitle">Total hebdomadaire en euros.</p>
			</header>
			<CoutsChart weeks={data.weeks} />
		</section>
	</div>

	<div class="mobile-only-banner">
		<p>Tableau Coûts API optimisé pour ordinateur. Ouvrez le CRM depuis un ordinateur pour consulter le détail des dépenses.</p>
	</div>
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
		font-size: 22px;
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

	/* Refonte mobile : masquer indicateurs + chart < 1024px et afficher bandeau
	   "optimisé desktop" (cohérent avec /reporting tab=export S191). */
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
