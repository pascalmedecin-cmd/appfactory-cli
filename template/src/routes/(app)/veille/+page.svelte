<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { PageData } from './$types';
	import type { Actionability, Segment } from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		const n = data.editions.length;
		$pageSubtitle =
			n === 0
				? 'Aucune édition'
				: `${n} édition${n > 1 ? 's' : ''} récente${n > 1 ? 's' : ''}`;
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
		partenaires: 'bg-primary-light text-primary border-primary'
	};

	function formatDateLong(iso: string): string {
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

	const featured = $derived(data.editions[0] ?? null);
	const archives = $derived(data.editions.slice(1));
</script>

<div class="max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-12">
	<!-- Masthead éditorial -->
	<header class="pb-6 md:pb-8 mb-10 md:mb-14 border-b-2 border-primary-dark">
		<div class="mag-kicker text-primary mb-3">Veille sectorielle FilmPro</div>
		<div class="flex items-end justify-between gap-6 flex-wrap">
			<h1 class="mag-display text-[40px] md:text-6xl text-primary-dark max-w-3xl">
				Le pouls hebdomadaire des films FilmPro
			</h1>
			{#if featured}
				<div class="text-right shrink-0 hidden md:block">
					<div class="mag-kicker text-text-muted">Dernière édition</div>
					<div class="text-sm font-semibold text-text mt-1">
						{formatDateLong(featured.generated_at)}
					</div>
				</div>
			{/if}
		</div>
		<p class="mag-body text-text-body mt-4 max-w-3xl text-base md:text-[17px]">
			Le panorama hebdomadaire des marchés bâtiment, films solaires, vitrages et
			réglementation, lu et synthétisé chaque vendredi pour servir vos décisions
			commerciales.
		</p>
	</header>

	{#if data.editions.length === 0}
		<div class="bg-white rounded-xl border border-border p-12 text-center">
			<Icon name="radar" class="text-5xl text-text-muted" />
			<h2 class="mt-4 text-lg font-semibold text-text">Aucune édition publiée</h2>
			<p class="mt-2 text-sm text-text-muted">
				La veille sectorielle est générée automatiquement chaque vendredi matin.
			</p>
		</div>
	{:else if featured}
		<!-- ÉDITION À LA UNE -->
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-6">
				<div class="mag-kicker text-primary">À la une cette semaine</div>
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
							{editionNumber(featured.week_label)}
						</div>
						<div class="mt-6 text-sm text-white/85 font-semibold">
							{featured.week_label}
						</div>
						<div class="text-xs text-white/55 mt-1">
							{formatDateLong(featured.generated_at)}
						</div>
					</div>
					<div class="relative flex flex-wrap items-center gap-2">
						{#if featured.is_unread}
							<span
								class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning text-white text-[11px] font-bold uppercase tracking-wider"
							>
								<span
									class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"
								></span>
								Nouveau
							</span>
						{/if}
						<span
							class="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold border border-white/20"
						>
							{featured.items_total} signal{featured.items_total > 1 ? 's' : ''}
						</span>
					</div>
				</aside>

				<!-- Corps : synthèse + à retenir + CTA -->
				<div class="lg:col-span-8 p-6 md:p-8 lg:p-10 flex flex-col">
					<div class="mag-kicker text-primary mb-3">Synthèse de la semaine</div>
					<p class="mag-body text-text-body mb-8 line-clamp-5">
						{featured.executive_summary}
					</p>

					{#if featured.preview.length > 0}
						<div class="mag-kicker text-primary mb-4">À retenir</div>
						<ol class="space-y-6 mb-8">
							{#each featured.preview as item, idx (item.rank)}
								<li class="flex items-start gap-4">
									<span
										class="mag-display text-[28px] md:text-[32px] text-primary-dark/20 leading-none w-10 shrink-0 text-right tabular-nums"
									>
										{String(idx + 1).padStart(2, '0')}
									</span>
									<div class="flex-1 min-w-0">
										<a
											href={`/veille/item/${featured.id}-${item.rank}`}
											class="text-base font-semibold text-text hover:text-primary transition-colors leading-snug block"
										>
											{item.title}
										</a>
										<div class="flex flex-wrap gap-1.5 mt-2">
											<span
												class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium {SEGMENT_STYLES[
													item.segment
												]}"
											>
												{SEGMENT_LABELS[item.segment]}
											</span>
											<span
												class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold {ACTIONABILITY_STYLES[
													item.actionability
												]}"
											>
												{ACTIONABILITY_LABELS[item.actionability]}
											</span>
											{#if item.is_update}
												<span
													class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium bg-info-light text-info border-info/20"
													title="Mise à jour d'un sujet déjà couvert"
												>
													Mise à jour
												</span>
											{/if}
										</div>
									</div>
								</li>
							{/each}
						</ol>
					{/if}

					<a
						href={`/veille/${featured.id}`}
						class="inline-flex self-start items-center gap-2 h-11 px-4 box-border rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors mt-auto group"
					>
						Lire l'édition complète
						<Icon
							name="arrow_forward"
							size={16}
							class="transition-transform group-hover:translate-x-0.5"
						/>
					</a>
				</div>
			</article>
		</section>

		<!-- ARCHIVES -->
		{#if archives.length > 0}
			<section>
				<div class="flex items-end gap-3 mb-6 md:mb-8">
					<h2
						class="mag-display-3 text-xl md:text-2xl text-primary-dark"
					>
						Numéros précédents
					</h2>
					<div class="h-px flex-1 bg-border mb-2"></div>
					<span class="text-xs text-text-muted shrink-0 mb-1"
						>{archives.length} édition{archives.length > 1 ? 's' : ''}</span
					>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each archives as ed (ed.id)}
						<article
							class="mag-archive-card bg-white rounded-xl border border-border shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col group"
						>
							<header
								class="p-6 border-b border-border flex items-start gap-4"
							>
								<div
									class="text-center shrink-0 px-3 py-2 bg-primary-light rounded-lg min-w-[58px]"
								>
									<div
										class="mag-kicker text-primary text-[9px] leading-none"
									>
										N°
									</div>
									<div
										class="mag-display text-[26px] text-primary-dark leading-none tabular-nums mt-1"
									>
										{editionNumber(ed.week_label)}
									</div>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="mag-archive-title text-sm font-semibold text-text transition-colors"
											>{ed.week_label}</span
										>
										{#if ed.is_unread}
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-warning text-white text-[9px] font-bold uppercase tracking-wider"
											>
												Nouveau
											</span>
										{/if}
									</div>
									<div class="text-xs text-text-muted mt-1">
										{formatDateLong(ed.generated_at)}
									</div>
									<div class="text-xs text-text-muted mt-1">
										{ed.items_total} signal{ed.items_total > 1 ? 's' : ''}
									</div>
								</div>
							</header>
							<div class="p-6 flex-1 flex flex-col gap-4">
								<p
									class="text-sm text-text-body leading-relaxed line-clamp-3"
								>
									{ed.executive_summary}
								</p>
								{#if ed.preview.length > 0}
									<div>
										<div class="mag-kicker text-primary text-[9px] mb-2">
											À retenir
										</div>
										<ul class="space-y-2">
											{#each ed.preview as item (item.rank)}
												<li
													class="flex items-start gap-2 text-sm text-text leading-snug"
												>
													<span
														class="text-primary-dark/40 font-semibold shrink-0 mt-px"
														aria-hidden="true">·</span
													>
													<span class="line-clamp-2">{item.title}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
							<footer
								class="px-6 py-4 border-t border-border bg-surface-alt rounded-b-xl"
							>
								<a
									href={`/veille/${ed.id}`}
									class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-primary-hover transition-colors"
								>
									Lire cette édition
									<Icon
										name="arrow_forward"
										size={14}
										class="transition-transform group-hover:translate-x-0.5"
									/>
								</a>
							</footer>
						</article>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
