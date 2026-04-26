<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Actionability, Segment, Theme, Maturity } from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		$pageSubtitle = `Édition ${data.report.week_label}`;
	});

	const ACTIONABILITY_LABELS: Record<Actionability, string> = {
		action_directe: 'Action directe',
		veille_active: 'Veille active',
		a_surveiller: 'À surveiller'
	};

	const SEGMENT_LABELS: Record<Segment, string> = {
		tertiaire: 'Tertiaire',
		residentiel: 'Résidentiel',
		commerces: 'Commerces',
		erp: 'ERP',
		partenaires: 'Partenaires'
	};

	const THEME_LABELS: Record<Theme, string> = {
		films_solaires: 'Films solaires',
		films_securite: 'Films sécurité',
		discretion_smartfilm: 'Discrétion',
		batiment_renovation: 'Bâtiment',
		ia_outils: 'IA & outils',
		reglementation: 'Réglementation',
		autre: 'Autre'
	};

	const MATURITY_LABELS: Record<Maturity, string> = {
		emergent: 'Émergent',
		etabli: 'Établi',
		speculatif: 'Spéculatif'
	};

	const ACTIONABILITY_STYLES: Record<Actionability, string> = {
		action_directe: 'bg-danger-light text-danger border-danger/20',
		veille_active: 'bg-warning-light text-warning border-warning/20',
		a_surveiller: 'bg-surface-alt text-text-muted border-border'
	};

	const SEGMENT_STYLES: Record<Segment, string> = {
		tertiaire: 'bg-prosp-import-bg text-prosp-import border-prosp-import/30',
		residentiel: 'bg-prosp-qualify-bg text-prosp-qualify border-prosp-qualify/30',
		commerces: 'bg-prosp-convert-bg text-prosp-convert border-prosp-convert/30',
		erp: 'bg-prosp-enrich-bg text-prosp-enrich border-prosp-enrich/30',
		partenaires: 'bg-primary/10 text-primary border-primary/20'
	};

	function formatDateLong(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// Bloc 4 : auto-exécution prospection depuis chip structuré
	let chipLoading = $state<number | null>(null);

	async function runChipSearch(
		chip: { kind: string; canton: string; query: string; label: string },
		idx: number
	) {
		if (chipLoading !== null) return;
		chipLoading = idx;
		try {
			const resp = await fetch('/api/prospection/from-intelligence', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chip,
					report_id: data.report.id,
					item_rank: data.item.rank
				})
			});
			const result = await resp.json();
			if (!resp.ok) {
				alert(`Échec import : ${result?.error ?? resp.statusText}`);
				return;
			}
			goto(result.redirect, { invalidateAll: true });
		} catch (err) {
			alert(`Erreur réseau : ${String(err)}`);
		} finally {
			chipLoading = null;
		}
	}

	function geoLabel(g: string): string {
		if (g === 'suisse_romande') return 'Romandie';
		if (g === 'suisse') return 'CH';
		return 'Monde';
	}
</script>

<div class="max-w-5xl mx-auto px-4 md:px-12 py-8 md:py-12">
	<!-- Breadcrumb -->
	<a href="/veille" class="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
		<Icon name="arrow_back" size={18} />
		Retour au fil
	</a>

	<!-- Meta -->
	<div class="flex items-center gap-3 text-xs text-text-muted mb-3 flex-wrap">
		<span class="font-semibold text-text">{formatDateLong(data.report.generated_at)}</span>
		<span>·</span>
		<span>Édition {data.report.week_label}</span>
		<span>·</span>
		<span>Rang {data.item.rank}</span>
	</div>

	<!-- Titre -->
	<h1 class="text-2xl md:text-3xl font-bold text-text leading-tight mb-4">
		{data.item.title}
	</h1>

	<!-- Badges -->
	<div class="flex flex-wrap gap-1.5 text-[11px] mb-5">
		<span
			class="inline-flex items-center px-2 py-0.5 rounded-full border font-semibold {ACTIONABILITY_STYLES[data.item.actionability]}"
		>
			{ACTIONABILITY_LABELS[data.item.actionability]}
		</span>
		<span
			class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium {SEGMENT_STYLES[data.item.segment]}"
		>
			{SEGMENT_LABELS[data.item.segment]}
		</span>
		<span
			class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium bg-surface-alt text-text border-border"
		>
			{geoLabel(data.item.geo_scope)}
		</span>
		<span
			class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium bg-accent/8 text-accent border-accent/20"
		>
			{THEME_LABELS[data.item.theme]}
		</span>
		<span
			class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium bg-surface-alt text-text-muted border-border"
		>
			Maturité : {MATURITY_LABELS[data.item.maturity]}
		</span>
	</div>

	<!-- Résumé -->
	<section class="mb-6">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Résumé</h2>
		<p class="text-base text-text-body leading-relaxed">{data.item.summary}</p>
	</section>

	<!-- Pertinence FilmPro -->
	<section class="mb-6 border-l-4 border-accent bg-accent/5 pl-4 py-3 rounded-r">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
			Pertinence FilmPro
		</h2>
		<p class="text-sm text-text-body leading-relaxed">{data.item.filmpro_relevance}</p>
	</section>

	<!-- Deep dive optionnel -->
	{#if data.item.deep_dive}
		<section class="mb-6">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
				Analyse approfondie
			</h2>
			<p class="text-sm text-text-body leading-relaxed">{data.item.deep_dive}</p>
		</section>
	{/if}

	<!-- Source -->
	<section class="mb-6 p-4 rounded-xl border border-border bg-surface-alt/50">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Source</h2>
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold text-text">{data.item.source.name}</span>
				<span class="text-xs text-text-muted">
					Article publié le {formatDateLong(data.item.source.published_at)}
				</span>
			</div>
			<a
				href={data.item.source.url}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10"
			>
				<Icon name="open_in_new" size={16} />
				Ouvrir l'article
			</a>
		</div>
	</section>

	<!-- Search terms -->
	{#if data.item.search_terms && data.item.search_terms.length > 0}
		<section class="mb-6">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
				Prospecter depuis ce signal
			</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.item.search_terms as chip, idx (chip.label ?? idx)}
					{@const isLoading = chipLoading === idx}
					<button
						type="button"
						disabled={chipLoading !== null}
						onclick={() => runChipSearch(chip, idx)}
						title="Auto-exécuter {chip.kind === 'zefix' ? 'Zefix' : 'SIMAP'} · {chip.canton} · {chip.query}"
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-accent/8 text-accent border border-accent/20 hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
					>
						<Icon name={isLoading ? 'progress_activity' : chip.kind === 'zefix' ? 'business' : 'gavel'} size={16} />
						{chip.label}
					</button>
				{/each}
			</div>
			<p class="text-xs text-text-muted mt-2">
				Cliquez pour lancer la recherche et importer les résultats dans Prospection.
			</p>
		</section>
	{/if}
</div>
