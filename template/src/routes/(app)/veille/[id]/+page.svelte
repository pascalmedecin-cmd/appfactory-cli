<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type {
		IntelligenceItem,
		ImpactFilmpro
	} from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		$pageSubtitle = `Édition ${data.report.week_label}`;
	});

	const items = $derived(data.report.items as IntelligenceItem[]);
	const impacts = $derived(data.report.impacts_filmpro as ImpactFilmpro[]);
	const aggregatedChips = $derived(data.aggregatedChips ?? []);

	let chipLoading = $state<number | null>(null);

	const KIND_LABELS: Record<string, string> = {
		simap: 'SIMAP',
		zefix: 'Zefix',
		regbl: 'RegBL'
	};

	const KIND_ICONS: Record<string, string> = {
		simap: 'gavel',
		zefix: 'business',
		regbl: 'construction'
	};

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
		'OK FilmPro': 'bg-success-light text-success border-success/20',
		'Adjacent pertinent': 'bg-info-light text-info border-info/20',
		'À surveiller': 'bg-warning-light text-warning border-warning/20',
		'Non exploitable': 'bg-surface-alt text-text-muted border-border'
	};

	const MATURITY_STYLES: Record<string, string> = {
		etabli: 'bg-success-light text-success',
		emergent: 'bg-warning-light text-warning',
		speculatif: 'bg-surface-alt text-text-muted'
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

	async function copyTerm(term: string) {
		try {
			await navigator.clipboard.writeText(term);
			toasts.success('Terme copié');
		} catch {
			toasts.error('Copie impossible');
		}
	}

	async function copyAllTerms() {
		const text = aggregatedChips.map((a) => a.chip.query).join('\n');
		try {
			await navigator.clipboard.writeText(text);
			toasts.success(`${aggregatedChips.length} termes copiés`);
		} catch {
			toasts.error('Copie impossible');
		}
	}

	async function runChipSearch(idx: number) {
		if (chipLoading !== null) return;
		const entry = aggregatedChips[idx];
		if (!entry) return;
		chipLoading = idx;
		try {
			const resp = await fetch('/api/prospection/from-intelligence', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chip: entry.chip,
					report_id: data.report.id,
					item_rank: entry.item_rank
				})
			});
			const result = await resp.json();
			if (!resp.ok) {
				toasts.error(`Échec import : ${result?.error ?? resp.statusText}`);
				return;
			}
			goto(result.redirect, { invalidateAll: true });
		} catch (err) {
			toasts.error(`Erreur réseau : ${String(err)}`);
		} finally {
			chipLoading = null;
		}
	}
</script>

<div class="max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-12">
	<div class="mb-6">
		<a
			href="/veille"
			class="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
		>
			<Icon name="arrow_back" size={16} />
			Retour au flux
		</a>
	</div>

	<!-- Masthead éditorial -->
	<header class="pb-6 md:pb-8 mb-10 md:mb-14 border-b-2 border-primary-dark">
		<div class="mag-kicker text-primary mb-3">Veille sectorielle FilmPro</div>
		<div class="flex items-end justify-between gap-6 flex-wrap">
			<h1 class="mag-display text-[40px] md:text-6xl text-primary-dark max-w-3xl">
				Édition n° {editionNumber(data.report.week_label)}
			</h1>
			<div class="text-right shrink-0 hidden md:block">
				<div class="mag-kicker text-text-muted">Publiée le</div>
				<div class="text-sm font-semibold text-text mt-1">
					{formatDate(data.report.generated_at)}
				</div>
			</div>
		</div>
		<p class="mag-body text-text-body mt-4 max-w-3xl text-base md:text-[17px]">
			{data.report.week_label} · panorama hebdomadaire des marchés bâtiment, films
			solaires, vitrages et réglementation pour servir vos décisions commerciales.
		</p>
	</header>

	<!-- HERO COUVERTURE : aside navy + synthèse -->
	<section class="mb-14 md:mb-20">
		<div class="flex items-end gap-3 mb-6">
			<div class="mag-kicker text-primary">Couverture éditoriale</div>
			<div class="h-px flex-1 bg-border mb-2"></div>
		</div>

		<article
			class="bg-white rounded-xl border border-border shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12"
		>
			<!-- Aside : couverture du numéro -->
			<aside
				class="bg-primary-dark text-white p-8 lg:p-10 lg:col-span-4 flex flex-col justify-between gap-8 relative overflow-hidden"
			>
				<div
					class="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/[0.04] pointer-events-none"
				></div>
				<div
					class="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none"
				></div>
				<div class="relative">
					<div class="mag-kicker text-white/55 mb-2">Édition n°</div>
					<div
						class="mag-display text-[88px] md:text-[112px] lg:text-[104px] xl:text-[120px] text-white leading-[0.85] tabular-nums"
					>
						{editionNumber(data.report.week_label)}
					</div>
					<div class="mt-6 text-sm text-white/85 font-semibold">
						{data.report.week_label}
					</div>
					<div class="text-xs text-white/55 mt-1">
						{formatDate(data.report.generated_at)}
					</div>
				</div>
				<div class="relative space-y-3">
					<span
						class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border {COMPLIANCE_STYLES[
							data.report.compliance_tag
						] ?? 'bg-white/10 text-white border-white/20'}"
					>
						{data.report.compliance_tag}
					</span>
					<dl class="grid grid-cols-3 gap-3 text-white pt-2">
						<div>
							<dt class="mag-kicker text-white/55 text-[9px]">Signaux</dt>
							<dd class="mag-display text-2xl tabular-nums leading-none mt-1">
								{items.length}
							</dd>
						</div>
						<div>
							<dt class="mag-kicker text-white/55 text-[9px]">Impacts</dt>
							<dd class="mag-display text-2xl tabular-nums leading-none mt-1">
								{impacts.length}
							</dd>
						</div>
						<div>
							<dt class="mag-kicker text-white/55 text-[9px]">Termes</dt>
							<dd class="mag-display text-2xl tabular-nums leading-none mt-1">
								{aggregatedChips.length}
							</dd>
						</div>
					</dl>
				</div>
			</aside>

			<!-- Corps : synthèse de la semaine -->
			<div class="lg:col-span-8 p-6 md:p-8 lg:p-10 flex flex-col">
				<div class="mag-kicker text-primary mb-3">Synthèse de la semaine</div>
				<p class="mag-body text-text-body">{data.report.executive_summary}</p>
			</div>
		</article>
	</section>

	<!-- SIGNAUX -->
	{#if items.length > 0}
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-8 md:mb-10">
				<div>
					<div class="mag-kicker text-primary">Les signaux</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl text-primary-dark mt-1">
						{items.length} mouvement{items.length > 1 ? 's' : ''} de la semaine
					</h2>
				</div>
				<div class="h-px flex-1 bg-border mb-2"></div>
			</div>

			<div class="space-y-12 md:space-y-16">
				{#each items as item, i}
					<article class="grid grid-cols-12 gap-4 md:gap-6">
						<!-- Numéro éditorial -->
						<div class="col-span-12 md:col-span-1">
							<span
								class="mag-display text-[56px] md:text-[64px] text-primary-dark/15 leading-none tabular-nums block"
							>
								{String(item.rank).padStart(2, '0')}
							</span>
						</div>
						<div class="col-span-12 md:col-span-11">
							<div
								class="flex items-center gap-2 text-xs text-text-muted mb-3 flex-wrap"
							>
								<span class="mag-kicker text-primary"
									>{THEME_LABELS[item.theme] ?? item.theme}</span
								>
								<span aria-hidden="true">·</span>
								<span>{GEO_LABELS[item.geo_scope] ?? item.geo_scope}</span>
								<span
									class="px-2 py-0.5 rounded {MATURITY_STYLES[
										item.maturity
									]} text-[10px] font-semibold"
								>
									{MATURITY_LABELS[item.maturity]}
								</span>
							</div>
							<h3
								class="mag-display-3 text-xl md:text-[26px] mb-3 text-primary-dark"
							>
								{item.title}
							</h3>
							<p class="mag-body text-text-body mb-4">{item.summary}</p>
							<div
								class="border-l-4 border-warning bg-warning-light pl-4 py-3 mb-4 rounded-r"
							>
								<div class="mag-kicker text-warning mb-1">Pour FilmPro</div>
								<p class="text-sm text-text-body leading-relaxed">
									{item.filmpro_relevance}
								</p>
							</div>
							{#if item.deep_dive}
								<p class="text-sm text-text-body italic mb-4 leading-relaxed">
									{item.deep_dive}
								</p>
							{/if}
							<div
								class="flex items-center gap-3 text-xs text-text-muted flex-wrap pt-3 border-t border-border"
							>
								<span class="font-semibold text-text">{item.source.name}</span>
								<span aria-hidden="true">·</span>
								<span>{formatDate(item.source.published_at)}</span>
								<a
									href={item.source.url}
									target="_blank"
									rel="noopener noreferrer"
									class="ml-auto text-primary font-semibold hover:underline inline-flex items-center gap-1.5 group"
								>
									Lire l'article
									<Icon
										name="open_in_new"
										size={14}
										class="transition-transform group-hover:translate-x-0.5"
									/>
								</a>
							</div>
						</div>
					</article>
					{#if i < items.length - 1}
						<hr class="border-border" />
					{/if}
				{/each}
			</div>
		</section>
	{/if}

	<!-- IMPACTS FILMPRO -->
	{#if impacts.length > 0}
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-8 md:mb-10">
				<div>
					<div class="mag-kicker text-primary">Impact stratégique</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl text-primary-dark mt-1">
						Ce que ça change pour FilmPro
					</h2>
				</div>
				<div class="h-px flex-1 bg-border mb-2"></div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
				{#each impacts as impact}
					<div
						class="bg-white border border-border border-l-4 border-l-primary rounded-lg shadow-xs hover:shadow-md transition-shadow px-6 md:px-8 py-6 md:py-8"
					>
						<div class="mag-kicker text-primary mb-3">
							Axe {IMPACT_LABELS[impact.axis] ?? impact.axis}
						</div>
						<p
							class="mag-display-3 text-lg md:text-xl text-primary-dark leading-snug"
						>
							« {impact.note} »
						</p>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- TERMES DE RECHERCHE -->
	{#if aggregatedChips.length > 0}
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-8 md:mb-10 flex-wrap">
				<div>
					<div class="mag-kicker text-primary">Termes générés</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl text-primary-dark mt-1">
						À lancer dans Prospection
					</h2>
				</div>
				<div class="h-px flex-1 bg-border mb-2 min-w-8"></div>
				<button
					type="button"
					onclick={copyAllTerms}
					class="inline-flex items-center gap-2 h-10 px-4 box-border rounded-lg border border-border bg-white hover:border-primary hover:bg-surface-alt text-sm font-semibold text-text-body transition-colors"
				>
					<Icon name="content_copy" size={16} />
					Copier les {aggregatedChips.length}
				</button>
			</div>

			<ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each aggregatedChips as entry, idx (entry.chip.label)}
					{@const chip = entry.chip}
					{@const isLoading = chipLoading === idx}
					<li
						class="bg-white border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap mb-2">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10px] font-bold uppercase tracking-wider">
										{KIND_LABELS[chip.kind] ?? chip.kind}
									</span>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-alt text-text-muted text-[10px] font-semibold uppercase tracking-wider border border-border">
										{chip.canton}
									</span>
									<span class="text-[10px] text-text-muted">
										depuis signal #{entry.item_rank}
									</span>
								</div>
								<p class="text-sm font-semibold text-primary-dark leading-snug break-words">
									{chip.query}
								</p>
							</div>
							<button
								type="button"
								onclick={() => copyTerm(chip.query)}
								class="shrink-0 p-2 rounded-lg hover:bg-surface-alt text-text-muted hover:text-primary transition-colors"
								title="Copier le terme"
								aria-label="Copier le terme"
							>
								<Icon name="content_copy" size={16} />
							</button>
						</div>
						<button
							type="button"
							disabled={chipLoading !== null}
							onclick={() => runChipSearch(idx)}
							class="self-start inline-flex items-center gap-2 h-10 px-4 box-border rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors group cursor-pointer"
							title="Auto-exécuter la recherche dans Prospection"
						>
							<Icon
								name={isLoading ? 'progress_activity' : KIND_ICONS[chip.kind] ?? 'search'}
								size={16}
								class={isLoading ? 'animate-spin' : ''}
							/>
							{isLoading ? 'Lancement…' : 'Lancer la recherche'}
							{#if !isLoading}
								<Icon
									name="arrow_forward"
									size={14}
									class="transition-transform group-hover:translate-x-0.5"
								/>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<footer
		class="mt-16 md:mt-20 pt-6 border-t border-border flex items-center justify-between text-xs text-text-muted"
	>
		<div>
			Veille FilmPro · Édition {data.report.week_label}
		</div>
		<div class="font-semibold text-text">FilmPro</div>
	</footer>
</div>
