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
		image: 'Image'
	};

	const SEGMENT_LABELS: Record<string, string> = {
		tertiaire: 'Tertiaire',
		residentiel: 'Résidentiel',
		commerces: 'Commerces',
		erp: 'ERP',
		partenaires: 'Partenaires'
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

<div class="max-w-5xl mx-auto space-y-8">
	<div>
		<a href="/veille" class="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
			<span class="material-symbols-outlined text-base">arrow_back</span>
			Retour au flux
		</a>
	</div>

	<header class="bg-white rounded-xl border border-slate-200 px-6 py-5">
		<div class="flex items-center gap-3 flex-wrap">
			<h1 class="text-2xl font-bold text-slate-900">Édition {data.report.week_label}</h1>
			<span class="text-sm text-slate-500">{formatDate(data.report.generated_at)}</span>
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {COMPLIANCE_COLORS[data.report.compliance_tag] ?? ''}">
				{data.report.compliance_tag}
			</span>
		</div>
		<p class="mt-3 text-slate-700 leading-relaxed">{data.report.executive_summary}</p>
	</header>

	<section class="space-y-5">
		<h2 class="text-lg font-semibold text-slate-900">Signaux de la semaine</h2>
		{#each items as item}
			<article class="bg-white rounded-xl border border-slate-200 p-6">
				<div class="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
					<span class="font-bold text-slate-900">#{item.rank}</span>
					<span>•</span>
					<span class="px-2 py-0.5 rounded-full bg-slate-100">{THEME_LABELS[item.theme] ?? item.theme}</span>
					<span class="px-2 py-0.5 rounded-full bg-slate-100">{GEO_LABELS[item.geo_scope] ?? item.geo_scope}</span>
					<span class="px-2 py-0.5 rounded-full bg-slate-100">{MATURITY_LABELS[item.maturity] ?? item.maturity}</span>
				</div>
				<h3 class="text-lg font-semibold text-slate-900">{item.title}</h3>
				<p class="mt-2 text-slate-700">{item.summary}</p>
				<p class="mt-3 text-sm text-slate-800">
					<span class="font-medium">Pour FilmPro :</span>
					{item.filmpro_relevance}
				</p>
				{#if item.deep_dive}
					<p class="mt-3 text-sm text-slate-800 italic bg-amber-50 border-l-4 border-amber-400 pl-3 py-2">
						{item.deep_dive}
					</p>
				{/if}
				<a
					href={item.source.url}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-3 inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"
				>
					{item.source.name} — {formatDate(item.source.published_at)}
					<span class="material-symbols-outlined text-base">open_in_new</span>
				</a>
			</article>
		{/each}
	</section>

	<section class="bg-white rounded-xl border border-slate-200 p-6">
		<h2 class="text-lg font-semibold text-slate-900 mb-4">Impacts FilmPro</h2>
		<ul class="space-y-3">
			{#each impacts as impact}
				<li class="flex gap-3">
					<span class="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs font-medium self-start mt-0.5">
						{IMPACT_LABELS[impact.axis] ?? impact.axis}
					</span>
					<p class="text-slate-700">{impact.note}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="bg-white rounded-xl border border-slate-200 p-6">
		<div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
			<h2 class="text-lg font-semibold text-slate-900">
				Termes de recherche ({searchTerms.length})
			</h2>
			<button
				type="button"
				onclick={copyAllTerms}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
			>
				<span class="material-symbols-outlined text-base">content_copy</span>
				Tout copier
			</button>
		</div>
		<p class="text-sm text-slate-600 mb-4">
			Termes directement exploitables dans Prospection pour trouver de nouveaux leads issus des signaux ci-dessus.
		</p>
		<ul class="space-y-2">
			{#each searchTerms as term}
				<li class="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-medium text-slate-900">{term.term}</span>
							<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs">
								{SEGMENT_LABELS[term.segment] ?? term.segment}
							</span>
						</div>
						<p class="mt-1 text-sm text-slate-600">{term.rationale}</p>
					</div>
					<div class="flex items-center gap-1 shrink-0">
						<button
							type="button"
							onclick={() => copyTerm(term.term)}
							class="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
							title="Copier"
							aria-label="Copier le terme"
						>
							<span class="material-symbols-outlined text-base">content_copy</span>
						</button>
						<a
							href={prospectionLink(term)}
							class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700"
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
</div>
