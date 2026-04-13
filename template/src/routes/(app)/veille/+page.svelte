<script lang="ts">
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { PageData } from './$types';
	import type { IntelligenceItem, SearchTerm } from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	const readSet = $derived(new Set(data.readIds));

	$effect(() => {
		const n = data.reports.length;
		$pageSubtitle = n === 0 ? 'Aucune édition' : `${n} édition${n > 1 ? 's' : ''}`;
	});

	const THEME_LABELS: Record<string, string> = {
		films_solaires: 'Films solaires',
		films_securite: 'Films sécurité',
		discretion_smartfilm: 'Discrétion / smart film',
		batiment_renovation: 'Bâtiment / rénovation',
		ia_outils: 'IA & outils',
		reglementation: 'Réglementation',
		autre: 'Autre'
	};

	const MATURITY_LABELS: Record<string, string> = {
		emergent: 'Émergent',
		etabli: 'Établi',
		speculatif: 'Spéculatif'
	};

	const GEO_LABELS: Record<string, string> = {
		suisse_romande: 'Suisse romande',
		suisse: 'Suisse',
		monde: 'Monde'
	};

	const COMPLIANCE_COLORS: Record<string, string> = {
		'OK FilmPro': 'bg-emerald-100 text-emerald-800 border-emerald-200',
		'Adjacent pertinent': 'bg-sky-100 text-sky-800 border-sky-200',
		'À surveiller': 'bg-amber-100 text-amber-800 border-amber-200',
		'Non exploitable': 'bg-slate-100 text-slate-600 border-slate-200'
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	async function markAsRead(reportId: string) {
		await fetch('/api/veille/read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ report_id: reportId })
		});
	}

	function prospectionLink(term: SearchTerm, reportId: string): string {
		const params = new URLSearchParams({
			q: term.term,
			from_intelligence: reportId,
			from_term: term.term
		});
		return `/prospection?${params.toString()}`;
	}
</script>

<div class="max-w-5xl mx-auto space-y-8">
	{#if data.reports.length === 0}
		<div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
			<span class="material-symbols-outlined text-5xl text-slate-400">radar</span>
			<h2 class="mt-4 text-lg font-semibold text-slate-900">Aucune édition publiée</h2>
			<p class="mt-2 text-sm text-slate-600">
				La veille sectorielle est générée automatiquement chaque vendredi matin. La première édition apparaîtra ici dès qu'elle sera disponible.
			</p>
		</div>
	{:else}
		{#each data.reports as report, index}
			{@const isLatest = index === 0}
			{@const isUnread = !readSet.has(report.id)}
			{@const items = report.items as IntelligenceItem[]}
			{@const searchTerms = report.search_terms as SearchTerm[]}

			<article class="bg-white rounded-xl border border-slate-200 overflow-hidden {isUnread ? 'ring-2 ring-amber-400' : ''}">
				<header class="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
					<div>
						<div class="flex items-center gap-3">
							<h2 class="text-xl font-bold text-slate-900">Édition {report.week_label}</h2>
							{#if isUnread}
								<span class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold">Non lu</span>
							{/if}
							<span class="text-sm text-slate-500">{formatDate(report.generated_at)}</span>
						</div>
						<div class="mt-1.5">
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {COMPLIANCE_COLORS[report.compliance_tag] ?? ''}">
								{report.compliance_tag}
							</span>
						</div>
					</div>
					<a
						href="/veille/{report.id}"
						onclick={() => isUnread && markAsRead(report.id)}
						class="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
					>
						Voir le détail
						<span class="material-symbols-outlined text-base">arrow_forward</span>
					</a>
				</header>

				<div class="px-6 py-5 space-y-5">
					<p class="text-slate-700 leading-relaxed">{report.executive_summary}</p>

					{#if isLatest}
						<div class="space-y-4">
							<h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wide">
								Top {Math.min(3, items.length)} signaux
							</h3>
							{#each items.slice(0, 3) as item}
								<div class="border-l-4 border-slate-900 pl-4 py-1">
									<div class="flex items-center gap-2 text-xs text-slate-500 mb-1">
										<span class="font-bold text-slate-900">#{item.rank}</span>
										<span>•</span>
										<span>{THEME_LABELS[item.theme] ?? item.theme}</span>
										<span>•</span>
										<span>{GEO_LABELS[item.geo_scope] ?? item.geo_scope}</span>
										<span>•</span>
										<span>{MATURITY_LABELS[item.maturity] ?? item.maturity}</span>
									</div>
									<h4 class="font-semibold text-slate-900">{item.title}</h4>
									<p class="mt-1 text-sm text-slate-600">{item.summary}</p>
									<p class="mt-2 text-sm text-slate-700">
										<span class="font-medium">Pour FilmPro :</span>
										{item.filmpro_relevance}
									</p>
									<a
										href={item.source.url}
										target="_blank"
										rel="noopener noreferrer"
										class="mt-2 inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
									>
										{item.source.name} — {formatDate(item.source.published_at)}
										<span class="material-symbols-outlined text-[14px]">open_in_new</span>
									</a>
								</div>
							{/each}
						</div>

						{#if searchTerms.length > 0}
							<div class="pt-4 border-t border-slate-100">
								<h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
									Termes de recherche de la semaine
								</h3>
								<div class="flex flex-wrap gap-2">
									{#each searchTerms.slice(0, 5) as term}
										<a
											href={prospectionLink(term, report.id)}
											class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-800 text-sm transition-colors"
											title="Rechercher : {term.term}"
										>
											<span class="material-symbols-outlined text-base">search</span>
											{term.term}
										</a>
									{/each}
									{#if searchTerms.length > 5}
										<a href="/veille/{report.id}" class="inline-flex items-center px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
											+ {searchTerms.length - 5} autres
										</a>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</article>
		{/each}
	{/if}
</div>
