<script lang="ts">
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { PageData } from './$types';
	import type { IntelligenceItem, ImpactFilmpro, SearchTerm } from '$lib/server/intelligence/schema';

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

	const COMPLIANCE_STYLES: Record<string, string> = {
		'OK FilmPro': 'bg-emerald-50 text-emerald-700 border-emerald-200',
		'Adjacent pertinent': 'bg-sky-50 text-sky-700 border-sky-200',
		'À surveiller': 'bg-amber-50 text-amber-700 border-amber-200',
		'Non exploitable': 'bg-slate-50 text-slate-600 border-slate-200'
	};

	const MATURITY_STYLES: Record<string, string> = {
		etabli: 'bg-emerald-50 text-emerald-700',
		emergent: 'bg-amber-50 text-amber-700',
		speculatif: 'bg-slate-100 text-slate-600'
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatShortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long'
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

	function editionNumber(weekLabel: string): string {
		const match = weekLabel.match(/W(\d+)/);
		return match ? match[1] : weekLabel;
	}

	const latest = $derived(data.reports[0]);
	const archives = $derived(data.reports.slice(1));
	const latestItems = $derived(latest ? (latest.items as IntelligenceItem[]) : []);
	const latestImpacts = $derived(latest ? (latest.impacts_filmpro as ImpactFilmpro[]) : []);
	const latestTerms = $derived(latest ? (latest.search_terms as SearchTerm[]) : []);

	const SEGMENT_LABELS: Record<string, string> = {
		tertiaire: 'tertiaire',
		residentiel: 'résidentiel',
		commerces: 'commerces',
		erp: 'erp',
		partenaires: 'partenaires'
	};
</script>

{#if !latest}
	<div class="max-w-3xl mx-auto mt-8 bg-white rounded-xl border border-slate-200 p-10 text-center">
		<span class="material-symbols-outlined text-5xl text-slate-400">radar</span>
		<h2 class="mt-4 text-lg font-semibold text-slate-900">Aucune édition publiée</h2>
		<p class="mt-2 text-sm text-slate-600">
			La veille sectorielle est générée automatiquement chaque vendredi matin. La première édition apparaîtra ici dès qu'elle sera disponible.
		</p>
	</div>
{:else}
	{@const isUnread = !readSet.has(latest.id)}
	{@const lead = latestItems[0]}
	{@const others = latestItems.slice(1, 3)}
	{@const pullquote = latestImpacts[0]}

	<div class="max-w-[1100px] mx-auto px-2 md:px-8 py-6 md:py-10">
		<!-- Masthead -->
		<header class="flex items-end justify-between pb-6 border-b-2 border-primary-dark gap-6 flex-wrap">
			<div>
				<div class="mag-kicker text-primary">Veille sectorielle FilmPro</div>
				<h1 class="mag-display text-4xl md:text-5xl mt-2 text-primary-dark">La semaine du vitrage</h1>
				<p class="text-sm text-slate-500 mt-2">Signaux, tendances et mouvements du marché — chaque vendredi</p>
			</div>
			<div class="text-right text-xs text-slate-500">
				<div class="font-semibold text-slate-900">Édition n° {editionNumber(latest.week_label)}</div>
				<div>{formatDate(latest.generated_at)}</div>
				<div class="mt-2 flex items-center gap-2 justify-end">
					{#if isUnread}
						<span class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider">Non lu</span>
					{/if}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border {COMPLIANCE_STYLES[latest.compliance_tag] ?? ''}">
						{latest.compliance_tag}
					</span>
				</div>
			</div>
		</header>

		<!-- Édition sans signaux -->
		{#if !lead}
			<section class="mt-8 md:mt-10 bg-white rounded-lg border border-slate-200 p-8 md:p-12 text-center">
				<div class="mag-kicker text-primary mb-3">Synthèse de la semaine</div>
				<p class="mag-body text-slate-700 max-w-2xl mx-auto">{latest.executive_summary}</p>
				<div class="mt-6 inline-flex items-center gap-2 text-sm text-slate-500">
					<span class="material-symbols-outlined text-base">inbox</span>
					Aucun signal exploitable cette semaine
				</div>
			</section>
		{/if}

		<!-- HERO -->
		{#if lead}
			<article class="mt-8 md:mt-10">
				<div class="grid grid-cols-12 gap-6 md:gap-8">
					<div class="col-span-12 lg:col-span-7">
						<a
							href="/veille/{latest.id}"
							onclick={() => isUnread && markAsRead(latest.id)}
							class="block relative overflow-hidden rounded-lg group"
						>
							{#if lead.image_url}
								<img src={lead.image_url} alt="" class="w-full h-[280px] md:h-[420px] object-cover group-hover:scale-[1.02] transition-transform duration-500" />
							{:else}
								<div class="w-full h-[280px] md:h-[420px] bg-gradient-to-br from-primary via-accent to-primary-dark"></div>
							{/if}
							<div class="absolute top-4 left-4">
								<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-[11px] font-semibold text-slate-900 shadow-sm">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
									{latest.compliance_tag} · {latestItems.length} signaux
								</span>
							</div>
						</a>
					</div>

					<div class="col-span-12 lg:col-span-5 flex flex-col justify-center">
						<div class="mag-kicker text-primary mb-3">Synthèse de la semaine</div>
						<h2 class="mag-display-2 text-[32px] md:text-[44px] mb-4 text-primary-dark">
							{lead.title}
						</h2>
						<p class="mag-body text-slate-700 mb-4">{latest.executive_summary}</p>
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-3 border-t border-slate-200">
							<span>{latestItems.length} signaux analysés</span>
							<span>·</span>
							<span>{latestImpacts.length} impacts stratégiques</span>
							<span>·</span>
							<span>{latestTerms.length} termes Zefix / SIMAP</span>
							<a
								href="/veille/{latest.id}"
								onclick={() => isUnread && markAsRead(latest.id)}
								class="ml-auto text-primary font-semibold hover:text-accent"
							>
								Lire l'édition →
							</a>
						</div>
					</div>
				</div>

				<!-- Top 3 -->
				{#if lead || others.length > 0}
					<section class="mt-12 md:mt-14 pt-8 border-t-2 border-primary-dark">
						<div class="flex items-end justify-between mb-6 md:mb-8 gap-4 flex-wrap">
							<div>
								<div class="mag-kicker text-primary">À la une</div>
								<h3 class="mag-display-3 text-2xl md:text-3xl mt-1 text-primary-dark">
									Les {Math.min(3, latestItems.length)} signaux à retenir
								</h3>
							</div>
							<a
								href="/veille/{latest.id}"
								onclick={() => isUnread && markAsRead(latest.id)}
								class="text-sm font-semibold text-primary hover:text-accent"
							>
								Voir les {latestItems.length} signaux →
							</a>
						</div>

						<div class="grid grid-cols-12 gap-6 md:gap-8">
							<!-- Featured -->
							{#if lead}
								<article class="col-span-12 md:col-span-7 group">
									<a href={lead.source.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg mb-4">
										{#if lead.image_url}
											<img src={lead.image_url} alt="" class="w-full h-[220px] md:h-[280px] object-cover group-hover:scale-[1.02] transition-transform duration-500" />
										{:else}
											<div class="w-full h-[220px] md:h-[280px] bg-gradient-to-br from-primary-light to-accent-light"></div>
										{/if}
									</a>
									<div class="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
										<span class="mag-kicker text-primary">{THEME_LABELS[lead.theme] ?? lead.theme}</span>
										<span>·</span>
										<span>{GEO_LABELS[lead.geo_scope] ?? lead.geo_scope}</span>
										<span class="px-2 py-0.5 rounded {MATURITY_STYLES[lead.maturity]} text-[10px] font-semibold">
											{MATURITY_LABELS[lead.maturity]}
										</span>
									</div>
									<h4 class="mag-display-3 text-[22px] md:text-[26px] mb-3 text-primary-dark">{lead.title}</h4>
									<p class="mag-body text-slate-700 mb-4">{lead.summary}</p>
									<div class="border-l-4 border-amber-500 bg-amber-50/50 pl-4 py-3 mb-4 rounded-r">
										<div class="mag-kicker text-amber-700 mb-1">Pour FilmPro</div>
										<p class="text-sm text-slate-900 leading-relaxed">{lead.filmpro_relevance}</p>
									</div>
									<div class="flex items-center gap-3 text-xs text-slate-500">
										<span class="font-semibold text-slate-900">{lead.source.name}</span>
										<span>·</span>
										<span>{formatShortDate(lead.source.published_at)}</span>
										<a href={lead.source.url} target="_blank" rel="noopener noreferrer" class="ml-auto text-primary font-semibold hover:underline inline-flex items-center gap-1">
											Lire l'article
											<span class="material-symbols-outlined text-[14px]">open_in_new</span>
										</a>
									</div>
								</article>
							{/if}

							<!-- Stacked side -->
							{#if others.length > 0}
								<div class="col-span-12 md:col-span-5 space-y-6 md:space-y-8">
									{#each others as item}
										<article class="group">
											<a href={item.source.url} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg mb-3">
												{#if item.image_url}
													<img src={item.image_url} alt="" class="w-full h-[160px] md:h-[180px] object-cover group-hover:scale-[1.02] transition-transform duration-500" />
												{:else}
													<div class="w-full h-[160px] md:h-[180px] bg-gradient-to-br from-accent-light to-primary-light"></div>
												{/if}
											</a>
											<div class="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
												<span class="mag-kicker text-primary">{THEME_LABELS[item.theme] ?? item.theme}</span>
												<span>·</span>
												<span>{GEO_LABELS[item.geo_scope] ?? item.geo_scope}</span>
												<span class="px-1.5 py-0.5 rounded {MATURITY_STYLES[item.maturity]} text-[10px] font-semibold ml-1">
													{MATURITY_LABELS[item.maturity]}
												</span>
											</div>
											<h4 class="mag-display-3 text-lg md:text-xl mb-2 text-primary-dark">{item.title}</h4>
											<p class="text-sm text-slate-700 leading-relaxed mb-2">{item.summary}</p>
											<div class="text-xs text-slate-500">
												<span class="font-semibold text-slate-900">{item.source.name}</span> · {formatShortDate(item.source.published_at)}
											</div>
										</article>
									{/each}
								</div>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Pullquote -->
				{#if pullquote}
					<section class="my-12 md:my-16 px-6 md:px-10 py-8 md:py-10 bg-white border-l-4 border-primary rounded-r-lg shadow-sm">
						<div class="mag-kicker text-primary mb-3">Impact stratégique</div>
						<p class="mag-display-3 text-xl md:text-2xl text-primary-dark leading-snug">
							« {pullquote.note} »
						</p>
						<div class="mt-4 text-xs text-slate-500 font-medium uppercase tracking-wider">
							Axe {pullquote.axis} · Édition {latest.week_label}
						</div>
					</section>
				{/if}

				<!-- Search terms -->
				{#if latestTerms.length > 0}
					<section class="my-10 md:my-12 pt-8 border-t border-slate-200">
						<div class="flex items-baseline justify-between mb-5 md:mb-6 gap-4 flex-wrap">
							<div>
								<div class="mag-kicker text-primary">Termes de recherche générés</div>
								<h3 class="mag-display-3 text-xl md:text-2xl mt-1 text-primary-dark">À lancer dans Prospection</h3>
							</div>
							<span class="text-xs text-slate-500">{latestTerms.length} termes · mis à jour hebdo</span>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each latestTerms.slice(0, 5) as term}
								<a
									href={prospectionLink(term, latest.id)}
									class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:border-primary hover:bg-accent-light text-sm font-medium text-slate-700 transition-colors"
								>
									<span class="material-symbols-outlined text-[16px] text-primary">search</span>
									{term.term}
									<span class="text-[10px] text-slate-500 ml-1 font-normal">{SEGMENT_LABELS[term.segment] ?? term.segment}</span>
								</a>
							{/each}
							{#if latestTerms.length > 5}
								<a
									href="/veille/{latest.id}"
									onclick={() => isUnread && markAsRead(latest.id)}
									class="inline-flex items-center px-4 py-2 text-sm text-slate-500 hover:text-primary"
								>
									+ {latestTerms.length - 5} autres
								</a>
							{/if}
						</div>
					</section>
				{/if}
			</article>
		{/if}

		<!-- ARCHIVES -->
		{#if archives.length > 0}
			<section class="mt-16 md:mt-20 pt-8 md:pt-10 border-t-2 border-primary-dark">
				<div class="flex items-end justify-between mb-6 md:mb-8 gap-4 flex-wrap">
					<div>
						<div class="mag-kicker text-primary">Archives</div>
						<h3 class="mag-display-3 text-2xl md:text-3xl mt-1 text-primary-dark">Éditions précédentes</h3>
					</div>
					<span class="text-sm text-slate-500">{archives.length} édition{archives.length > 1 ? 's' : ''}</span>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
					{#each archives as report}
						{@const archItems = report.items as IntelligenceItem[]}
						{@const firstItem = archItems[0]}
						{@const archUnread = !readSet.has(report.id)}
						<a
							href="/veille/{report.id}"
							onclick={() => archUnread && markAsRead(report.id)}
							class="mag-archive-card group"
						>
							<div class="overflow-hidden rounded-lg mb-4">
								{#if firstItem?.image_url}
									<img src={firstItem.image_url} alt="" class="w-full h-[180px] md:h-[200px] object-cover group-hover:scale-[1.02] transition-transform duration-500" />
								{:else}
									<div class="w-full h-[180px] md:h-[200px] bg-gradient-to-br from-primary-light via-accent-light to-primary-light"></div>
								{/if}
							</div>
							<div class="flex items-center gap-2 text-xs text-slate-500 mb-2">
								<span class="mag-kicker text-primary">Édition {editionNumber(report.week_label)}</span>
								<span>·</span>
								<span>{formatShortDate(report.generated_at)}</span>
								{#if archUnread}
									<span class="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-semibold uppercase tracking-wider">Non lu</span>
								{/if}
							</div>
							<h4 class="mag-display-3 text-lg md:text-xl mag-archive-title mb-2 transition-colors text-primary-dark">
								{firstItem?.title ?? `Édition ${report.week_label}`}
							</h4>
							<p class="text-sm text-slate-700 leading-relaxed">{report.executive_summary}</p>
							<div class="mt-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border {COMPLIANCE_STYLES[report.compliance_tag] ?? ''}">
									{report.compliance_tag}
								</span>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<footer class="mt-16 md:mt-20 pt-8 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
			<div>Veille FilmPro · Généré par Claude Sonnet chaque vendredi</div>
			<div class="font-semibold">FilmPro</div>
		</footer>
	</div>
{/if}
