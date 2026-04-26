<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const MONTH_LABELS: Record<string, string> = {
		'01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
		'07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc'
	};

	function formatMonth(key: string): string {
		const [, mm] = key.split('-');
		return MONTH_LABELS[mm] ?? key;
	}

	function formatCHF(n: number): string {
		return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n);
	}

	function maxOf(values: number[]): number {
		return values.length ? Math.max(...values, 1) : 1;
	}

	// Dimensions SVG
	const BAR_WIDTH = 36;
	const BAR_GAP = 8;
	const CHART_HEIGHT = 140;
	const CHART_PADDING_TOP = 20;

	const monthlyMax = $derived(maxOf(data.monthlyPipeline.map((m) => m.count)));
	const monthlyWidth = $derived(data.monthlyPipeline.length * (BAR_WIDTH + BAR_GAP));

	const pipelineMax = $derived(maxOf(data.pipelineEtape.map((p) => p.count)));
	const pipelineWidth = $derived(data.pipelineEtape.length * (BAR_WIDTH + BAR_GAP));
</script>

<svelte:head>
	<title>Reporting - FilmPro CRM</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-2xl font-semibold text-text">Reporting</h1>
		<p class="text-sm text-text-muted mt-1">Métriques d'activité et de pipeline.</p>
	</header>

	<!-- KPIs -->
	<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-white border border-border rounded-lg p-4 shadow-xs">
			<div class="text-xs uppercase tracking-wide text-text-muted">Pipeline actif</div>
			<div class="text-2xl font-semibold mt-1">{formatCHF(data.pipelineActifTotal)}</div>
			<div class="text-xs text-text-muted mt-1">Montants hors gagné/perdu</div>
		</div>
		<div class="bg-white border border-border rounded-lg p-4 shadow-xs">
			<div class="text-xs uppercase tracking-wide text-text-muted">Conversion leads</div>
			<div class="text-2xl font-semibold mt-1">{data.conversion.taux_pct}%</div>
			<div class="text-xs text-text-muted mt-1">
				{data.conversion.opportunites_depuis_lead} / {data.conversion.total_leads} transférés
			</div>
		</div>
		<div class="bg-white border border-border rounded-lg p-4 shadow-xs">
			<div class="text-xs uppercase tracking-wide text-text-muted">Contacts créés 30j</div>
			<div class="text-2xl font-semibold mt-1">{data.activityContacts.last_30_days}</div>
			<div class="text-xs text-text-muted mt-1">{data.activityContacts.last_90_days} sur 90j</div>
		</div>
		<div class="bg-white border border-border rounded-lg p-4 shadow-xs">
			<div class="text-xs uppercase tracking-wide text-text-muted">Opportunités 30j</div>
			<div class="text-2xl font-semibold mt-1">{data.activityOpportunites.last_30_days}</div>
			<div class="text-xs text-text-muted mt-1">{data.activityOpportunites.last_90_days} sur 90j</div>
		</div>
	</section>

	<!-- Pipeline actuel par étape -->
	<section class="bg-white border border-border rounded-lg p-5 shadow-xs">
		<h2 class="text-sm font-semibold text-text mb-1">Pipeline par étape</h2>
		<p class="text-xs text-text-muted mb-4">Nombre d'opportunités par étape actuelle.</p>

		{#if data.pipelineEtape.length === 0}
			<div class="text-sm text-text-muted py-8 text-center">Aucune opportunité enregistrée.</div>
		{:else}
			<div class="overflow-x-auto">
				<svg width={pipelineWidth} height={CHART_HEIGHT + 50} aria-label="Graphique pipeline par étape">
					{#each data.pipelineEtape as stat, i}
						{@const h = (stat.count / pipelineMax) * CHART_HEIGHT}
						{@const x = i * (BAR_WIDTH + BAR_GAP)}
						{@const y = CHART_PADDING_TOP + (CHART_HEIGHT - h)}
						<rect x={x} y={y} width={BAR_WIDTH} height={h} class="fill-primary" rx="3" />
						<text x={x + BAR_WIDTH / 2} y={y - 6} text-anchor="middle" class="text-[11px] fill-text font-medium">
							{stat.count}
						</text>
						<text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + CHART_PADDING_TOP + 16} text-anchor="middle" class="text-[11px] fill-text-muted">
							{stat.etape}
						</text>
					{/each}
				</svg>
			</div>

			<table class="w-full mt-4 text-sm">
				<thead>
					<tr class="text-left text-xs uppercase text-text-muted border-b border-border">
						<th class="py-2 pr-4">Étape</th>
						<th class="py-2 pr-4 text-right">Count</th>
						<th class="py-2 text-right">Montant total</th>
					</tr>
				</thead>
				<tbody>
					{#each data.pipelineEtape as stat}
						<tr class="border-b border-border/50">
							<td class="py-2 pr-4">{stat.etape}</td>
							<td class="py-2 pr-4 text-right">{stat.count}</td>
							<td class="py-2 text-right">{formatCHF(stat.montant_total)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<!-- Évolution mensuelle -->
	<section class="bg-white border border-border rounded-lg p-5 shadow-xs">
		<h2 class="text-sm font-semibold text-text mb-1">Opportunités créées : 12 derniers mois</h2>
		<p class="text-xs text-text-muted mb-4">Nombre d'opportunités ouvertes par mois.</p>

		<div class="overflow-x-auto">
			<svg width={monthlyWidth} height={CHART_HEIGHT + 50} aria-label="Graphique opportunités par mois">
				{#each data.monthlyPipeline as stat, i}
					{@const h = (stat.count / monthlyMax) * CHART_HEIGHT}
					{@const x = i * (BAR_WIDTH + BAR_GAP)}
					{@const y = CHART_PADDING_TOP + (CHART_HEIGHT - h)}
					<rect
						x={x}
						y={y}
						width={BAR_WIDTH}
						height={h || 2}
						class="fill-accent"
						rx="3"
					/>
					<text x={x + BAR_WIDTH / 2} y={y - 6} text-anchor="middle" class="text-[11px] fill-text font-medium">
						{stat.count || ''}
					</text>
					<text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + CHART_PADDING_TOP + 16} text-anchor="middle" class="text-[11px] fill-text-muted">
						{formatMonth(stat.month)}
					</text>
				{/each}
			</svg>
		</div>
	</section>

	<!-- Export CSV -->
	<section class="bg-white border border-border rounded-lg p-5 shadow-xs">
		<h2 class="text-sm font-semibold text-text mb-1">Exporter les données</h2>
		<p class="text-xs text-text-muted mb-4">Télécharge un CSV complet pour utilisation externe.</p>

		<div class="flex flex-wrap gap-2">
			<a href="/api/export/contacts" class="inline-flex items-center gap-2 px-3 py-2 text-sm bg-surface hover:bg-border/40 border border-border rounded-md transition-colors">
				<Icon name="download" size={18} />
				Contacts
			</a>
			<a href="/api/export/entreprises" class="inline-flex items-center gap-2 px-3 py-2 text-sm bg-surface hover:bg-border/40 border border-border rounded-md transition-colors">
				<Icon name="download" size={18} />
				Entreprises
			</a>
			<a href="/api/export/leads" class="inline-flex items-center gap-2 px-3 py-2 text-sm bg-surface hover:bg-border/40 border border-border rounded-md transition-colors">
				<Icon name="download" size={18} />
				Leads
			</a>
		</div>
	</section>
</div>
