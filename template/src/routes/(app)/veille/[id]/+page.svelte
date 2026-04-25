<script lang="ts">
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';
	import type {
		IntelligenceItem,
		ImpactFilmpro,
		SearchTerm
	} from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		$pageSubtitle = `Édition ${data.report.week_label}`;
	});

	const items = $derived(data.report.items as IntelligenceItem[]);
	const impacts = $derived(data.report.impacts_filmpro as ImpactFilmpro[]);
	const searchTerms = $derived(data.report.search_terms as SearchTerm[]);

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

	const IMPACT_LABELS: Record<string, string> = {
		diagnostic: 'Diagnostic',
		go_nogo: 'Go / No-go',
		pricing: 'Pricing',
		sourcing: 'Sourcing',
		capacite: 'Capacité',
		qualite: 'Qualité',
		organisation: 'Organisation',
		image: 'Image',
		reglementation: 'Réglementation'
	};

	const SEGMENT_LABELS: Record<string, string> = {
		tertiaire: 'Tertiaire',
		residentiel: 'Résidentiel',
		commerces: 'Commerces',
		erp: 'ERP',
		partenaires: 'Partenaires'
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

	function editionNumber(weekLabel: string): string {
		const match = weekLabel.match(/W(\d+)/);
		return match ? match[1] : weekLabel;
	}

	function prospectionLink(term: SearchTerm): string {
		const params = new URLSearchParams({
			q: term.term,
			from_intelligence: data.report.id,
			from_term: term.term
		});
		return `/prospection?${params.toString()}`;
	}

	async function copyTerm(term: string) {
		try {
			await navigator.clipboard.writeText(term);
			toasts.success('Terme copié');
		} catch {
			toasts.error('Copie impossible');
		}
	}

	async function copyAllTerms() {
		const text = searchTerms.map((t) => t.term).join('\n');
		try {
			await navigator.clipboard.writeText(text);
			toasts.success(`${searchTerms.length} termes copiés`);
		} catch {
			toasts.error('Copie impossible');
		}
	}
</script>

<div class="max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-12">
	<div class="mb-6">
		<a href="/veille" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
			<span class="material-symbols-outlined text-base">arrow_back</span>
			Retour au flux
		</a>
	</div>

	<!-- Masthead -->
	<header class="flex items-end justify-between pb-6 border-b-2 border-primary-dark gap-6 flex-wrap">
		<div>
			<div class="mag-kicker text-primary">Veille sectorielle FilmPro</div>
			<h1 class="mag-display text-4xl md:text-5xl mt-2 text-primary-dark">Édition n° {editionNumber(data.report.week_label)}</h1>
			<p class="text-sm text-slate-500 mt-2">{formatDate(data.report.generated_at)}</p>
		</div>
		<div class="text-right">
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border {COMPLIANCE_STYLES[data.report.compliance_tag] ?? ''}">
				{data.report.compliance_tag}
			</span>
		</div>
	</header>

	<!-- Executive summary -->
	<section class="mt-8 md:mt-10 grid grid-cols-12 gap-6 md:gap-8">
		<div class="col-span-12 lg:col-span-8">
			<div class="mag-kicker text-primary mb-3">Synthèse de la semaine</div>
			<p class="mag-body text-slate-700">{data.report.executive_summary}</p>
		</div>
		<div class="col-span-12 lg:col-span-4 border-l-0 lg:border-l border-slate-200 lg:pl-6">
			<div class="mag-kicker text-primary mb-3">En bref</div>
			<div class="space-y-2 text-sm text-slate-600">
				<div><span class="font-semibold text-slate-900">{items.length}</span> signaux</div>
				<div><span class="font-semibold text-slate-900">{impacts.length}</span> impacts stratégiques</div>
				<div><span class="font-semibold text-slate-900">{searchTerms.length}</span> termes de recherche</div>
			</div>
		</div>
	</section>

	<!-- Signaux -->
	{#if items.length > 0}
		<section class="mt-12 md:mt-14 pt-8 border-t-2 border-primary-dark">
			<div class="mb-8">
				<div class="mag-kicker text-primary">Les signaux</div>
				<h2 class="mag-display-3 text-2xl md:text-3xl mt-1 text-primary-dark">
					{items.length} mouvements de la semaine
				</h2>
			</div>

			<div class="space-y-12 md:space-y-16">
				{#each items as item, i}
					<article class="grid grid-cols-12 gap-6 md:gap-8">
						<div class="col-span-12">
							<div class="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
								<span class="mag-kicker text-primary">#{item.rank}</span>
								<span>·</span>
								<span class="mag-kicker text-primary">{THEME_LABELS[item.theme] ?? item.theme}</span>
								<span>·</span>
								<span>{GEO_LABELS[item.geo_scope] ?? item.geo_scope}</span>
								<span class="px-2 py-0.5 rounded {MATURITY_STYLES[item.maturity]} text-[10px] font-semibold">
									{MATURITY_LABELS[item.maturity]}
								</span>
							</div>
							<h3 class="mag-display-3 text-xl md:text-[26px] mb-3 text-primary-dark">{item.title}</h3>
							<p class="mag-body text-slate-700 mb-4">{item.summary}</p>
							<div class="border-l-4 border-amber-500 bg-amber-50/50 pl-4 py-3 mb-4 rounded-r">
								<div class="mag-kicker text-amber-700 mb-1">Pour FilmPro</div>
								<p class="text-sm text-slate-900 leading-relaxed">{item.filmpro_relevance}</p>
							</div>
							{#if item.deep_dive}
								<p class="text-sm text-slate-700 italic mb-4 leading-relaxed">{item.deep_dive}</p>
							{/if}
							<div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
								<span class="font-semibold text-slate-900">{item.source.name}</span>
								<span>·</span>
								<span>{formatDate(item.source.published_at)}</span>
								<a href={item.source.url} target="_blank" rel="noopener noreferrer" class="ml-auto text-primary font-semibold hover:underline inline-flex items-center gap-1">
									Lire l'article
									<span class="material-symbols-outlined text-[14px]">open_in_new</span>
								</a>
							</div>
						</div>
					</article>
					{#if i < items.length - 1}
						<hr class="border-slate-200" />
					{/if}
				{/each}
			</div>
		</section>
	{/if}

	<!-- Impacts FilmPro -->
	{#if impacts.length > 0}
		<section class="mt-16 md:mt-20 pt-8 border-t-2 border-primary-dark">
			<div class="mb-6 md:mb-8">
				<div class="mag-kicker text-primary">Impact stratégique</div>
				<h2 class="mag-display-3 text-2xl md:text-3xl mt-1 text-primary-dark">Ce que ça change pour FilmPro</h2>
			</div>
			<div class="space-y-6">
				{#each impacts as impact}
					<div class="bg-white border-l-4 border-primary rounded-r-lg shadow-sm px-6 md:px-10 py-6 md:py-8">
						<div class="mag-kicker text-primary mb-2">Axe {IMPACT_LABELS[impact.axis] ?? impact.axis}</div>
						<p class="mag-display-3 text-lg md:text-xl text-primary-dark leading-snug">« {impact.note} »</p>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Search terms -->
	{#if searchTerms.length > 0}
		<section class="mt-16 md:mt-20 pt-8 border-t-2 border-primary-dark">
			<div class="flex items-end justify-between mb-6 md:mb-8 gap-4 flex-wrap">
				<div>
					<div class="mag-kicker text-primary">Termes de recherche générés</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl mt-1 text-primary-dark">À lancer dans Prospection</h2>
				</div>
				<button
					type="button"
					onclick={copyAllTerms}
					class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white hover:border-primary hover:bg-accent-light text-sm font-semibold text-slate-700 transition-colors"
				>
					<span class="material-symbols-outlined text-base">content_copy</span>
					Copier les {searchTerms.length}
				</button>
			</div>

			<ul class="space-y-3">
				{#each searchTerms as term}
					<li class="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-3 hover:border-primary transition-colors">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap mb-1">
								<span class="font-semibold text-primary-dark">{term.term}</span>
								<span class="mag-kicker text-primary">{SEGMENT_LABELS[term.segment] ?? term.segment}</span>
							</div>
							<p class="text-sm text-slate-600 leading-relaxed">{term.rationale}</p>
						</div>
						<div class="flex items-center gap-1 shrink-0">
							<button
								type="button"
								onclick={() => copyTerm(term.term)}
								class="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary"
								title="Copier"
								aria-label="Copier le terme"
							>
								<span class="material-symbols-outlined text-base">content_copy</span>
							</button>
							<a
								href={prospectionLink(term)}
								class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-dark text-white text-sm font-semibold hover:bg-primary transition-colors"
								title="Lancer cette recherche dans Prospection"
							>
								<span class="material-symbols-outlined text-base">search</span>
								Rechercher
							</a>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<footer class="mt-16 md:mt-20 pt-8 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
		<div>Veille FilmPro · Édition {data.report.week_label}</div>
		<div class="font-semibold">FilmPro</div>
	</footer>
</div>
