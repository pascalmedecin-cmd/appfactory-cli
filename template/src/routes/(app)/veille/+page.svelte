<script lang="ts">
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import type { FeedItem } from './+page.server';
	import type { Actionability, Segment, Theme } from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		const n = data.feed.length;
		const total = data.facets.total;
		$pageSubtitle =
			n === total ? `${n} signal${n > 1 ? 's' : ''}` : `${n} / ${total} signaux`;
	});

	// Labels
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

	// Classes badges (palette extraite /prospection)
	const ACTIONABILITY_STYLES: Record<Actionability, string> = {
		action_directe: 'bg-danger-light text-danger border-danger/20',
		veille_active: 'bg-warning-light text-warning border-warning/20',
		a_surveiller: 'bg-surface-alt text-text-muted border-border'
	};

	// 5 segments : on mappe sur les 4 couleurs workflow + primary pour partenaires
	const SEGMENT_STYLES: Record<Segment, string> = {
		tertiaire: 'bg-prosp-import-bg text-prosp-import border-prosp-import/30',
		residentiel: 'bg-prosp-qualify-bg text-prosp-qualify border-prosp-qualify/30',
		commerces: 'bg-prosp-convert-bg text-prosp-convert border-prosp-convert/30',
		erp: 'bg-prosp-enrich-bg text-prosp-enrich border-prosp-enrich/30',
		partenaires: 'bg-primary/10 text-primary border-primary/20'
	};

	// Dates
	function formatDateLong(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatDateShort(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'short'
		});
	}

	// Filtres : toggle via URL state, préserve les autres params
	function buildFilterUrl(key: string, value: string | null): string {
		const params = new URLSearchParams(page.url.searchParams);
		const current = params.get(key);
		if (current === value) {
			params.delete(key);
		} else if (value === null) {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		const qs = params.toString();
		return qs ? `?${qs}` : '/veille';
	}

	function toggleBoolFilter(key: string): string {
		const params = new URLSearchParams(page.url.searchParams);
		if (params.get(key) === '1') params.delete(key);
		else params.set(key, '1');
		const qs = params.toString();
		return qs ? `?${qs}` : '/veille';
	}

	function clearFilters(): string {
		const params = new URLSearchParams();
		if (data.filters.archives) params.set('archives', '1');
		const qs = params.toString();
		return qs ? `?${qs}` : '/veille';
	}

	const hasFilters = $derived(
		!!(
			data.filters.pertinence ||
			data.filters.segment ||
			data.filters.geo ||
			data.filters.theme ||
			data.filters.hot ||
			data.filters.recurrent
		)
	);

	async function markAsRead(reportId: string) {
		await fetch('/api/veille/read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ report_id: reportId })
		});
	}

	function itemDetailHref(item: FeedItem): string {
		return `/veille/item/${item.report_id}-${item.rank}`;
	}

	// Bloc 4 : auto-exécution prospection depuis chip structuré.
	// Pendant l'appel API, le chip est disabled + affiche un spinner discret.
	let chipLoading = $state<string | null>(null); // clé "report_id:index"

	async function runChipSearch(
		chip: { kind: string; canton: string; query: string; label: string },
		item: FeedItem,
		index: number
	) {
		const key = `${item.report_id}:${index}`;
		if (chipLoading) return; // un seul clic à la fois
		chipLoading = key;
		try {
			const resp = await fetch('/api/prospection/from-intelligence', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chip, report_id: item.report_id, item_rank: item.rank })
			});
			const data = await resp.json();
			if (!resp.ok) {
				alert(`Échec import : ${data?.error ?? resp.statusText}`);
				return;
			}
			goto(data.redirect, { invalidateAll: true });
		} catch (err) {
			alert(`Erreur réseau : ${String(err)}`);
		} finally {
			chipLoading = null;
		}
	}

	function onImageError(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		// Bloc 6bis : si un fallback media_library est disponible, on l'essaie avant le gradient
		const fb = img.dataset.fallback;
		if (fb && img.src !== fb) {
			img.dataset.fallback = '';
			img.src = fb;
			return;
		}
		img.style.display = 'none';
		const fallback = img.nextElementSibling as HTMLElement | null;
		if (fallback) fallback.style.display = 'block';
	}

	function onImageLoad(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		if (img.naturalWidth > 0 && img.naturalWidth < img.clientWidth * 0.8) {
			// Image suspecte (trop petite rendu vs réel) : tenter fallback avant gradient
			const fb = img.dataset.fallback;
			if (fb && img.src !== fb) {
				img.dataset.fallback = '';
				img.src = fb;
				return;
			}
			img.style.display = 'none';
			const fallback = img.nextElementSibling as HTMLElement | null;
			if (fallback) fallback.style.display = 'block';
		}
	}
</script>

<div class="max-w-[1100px] mx-auto px-3 md:px-6 py-4 md:py-6">
	<!-- Sticky bar filtres -->
	<div
		class="sticky top-0 z-10 -mx-3 md:-mx-6 px-3 md:px-6 py-2 bg-surface/95 backdrop-blur border-b border-border"
	>
		<div class="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs">
			<!-- Total -->
			<a
				href={clearFilters()}
				class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold transition-colors {hasFilters
					? 'border-border bg-white text-text-muted hover:bg-surface-alt'
					: 'border-primary bg-primary/10 text-primary'}"
			>
				Tous <span class="text-text-muted font-normal">[{data.facets.total}]</span>
			</a>

			<span class="text-text-muted/40">|</span>

			<!-- Actionability -->
			{#each ['action_directe', 'veille_active', 'a_surveiller'] as key (key)}
				{@const k = key as Actionability}
				{@const count = data.facets.actionability[k]}
				{@const active = data.filters.pertinence === k}
				<a
					href={buildFilterUrl('pertinence', k)}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium transition-colors {active
						? 'ring-2 ring-primary/40 '
						: ''}{ACTIONABILITY_STYLES[k]}"
				>
					{ACTIONABILITY_LABELS[k]} <span class="opacity-70 font-normal">[{count}]</span>
				</a>
			{/each}

			<span class="text-text-muted/40">|</span>

			<!-- Segments -->
			{#each ['tertiaire', 'residentiel', 'commerces', 'erp', 'partenaires'] as key (key)}
				{@const k = key as Segment}
				{@const count = data.facets.segment[k]}
				{#if count > 0}
					{@const active = data.filters.segment === k}
					<a
						href={buildFilterUrl('segment', k)}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium transition-colors {active
							? 'ring-2 ring-primary/40 '
							: ''}{SEGMENT_STYLES[k]}"
					>
						{SEGMENT_LABELS[k]} <span class="opacity-70 font-normal">[{count}]</span>
					</a>
				{/if}
			{/each}

			<span class="text-text-muted/40">|</span>

			<!-- Geo -->
			{#each Object.entries(data.facets.geo) as [label, count] (label)}
				{@const active = data.filters.geo === label}
				<a
					href={buildFilterUrl('geo', label)}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium transition-colors {active
						? 'border-primary bg-primary/10 text-primary'
						: 'border-border bg-white text-text hover:bg-surface-alt'}"
				>
					{label} <span class="text-text-muted font-normal">[{count}]</span>
				</a>
			{/each}

			<span class="text-text-muted/40">|</span>

			<!-- Conditionnels -->
			{#if data.facets.hot > 0}
				<a
					href={toggleBoolFilter('hot')}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold transition-colors {data
						.filters.hot
						? 'bg-danger text-white border-danger'
						: 'bg-danger-light text-danger border-danger/30 hover:bg-danger-light/80'}"
				>
					<span aria-hidden="true">🔥</span> Signal chaud
					<span class="opacity-70 font-normal">[{data.facets.hot}]</span>
				</a>
			{/if}
			{#if data.facets.recurrent > 0}
				<a
					href={toggleBoolFilter('recurrent')}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold transition-colors {data
						.filters.recurrent
						? 'bg-primary text-white border-primary'
						: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'}"
				>
					×N Récurrent <span class="opacity-70 font-normal">[{data.facets.recurrent}]</span>
				</a>
			{/if}

			<span class="text-text-muted/40 ml-2">|</span>

			<!-- Archives toggle -->
			<a
				href={data.filters.archives ? clearFilters().replace('archives=1', '').replace(/[?&]$/, '') || '/veille' : '?archives=1'}
				class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium transition-colors {data
					.filters.archives
					? 'bg-surface-alt text-text border-border'
					: 'bg-white text-text-muted border-border hover:bg-surface-alt'}"
			>
				<span class="material-symbols-outlined text-[14px]">inventory_2</span>
				{data.filters.archives ? 'Masquer les archives' : 'Afficher les archives'}
			</a>
		</div>
	</div>

	<!-- Fil chronologique -->
	<div class="mt-6 space-y-5">
		{#if data.feed.length === 0}
			<div class="bg-white rounded-xl border border-border p-10 text-center">
				<span class="material-symbols-outlined text-5xl text-text-muted">radar</span>
				<h2 class="mt-4 text-lg font-semibold text-text">
					{hasFilters ? 'Aucun signal ne correspond aux filtres' : 'Aucune édition publiée'}
				</h2>
				{#if hasFilters}
					<a href={clearFilters()} class="mt-4 inline-block text-sm text-primary hover:underline">
						Réinitialiser les filtres
					</a>
				{:else}
					<p class="mt-2 text-sm text-text-muted">
						La veille sectorielle est générée automatiquement chaque vendredi matin.
					</p>
				{/if}
			</div>
		{/if}

		{#each data.feed as item (item.report_id + '-' + item.rank)}
			<article
				class="rounded-xl border border-border bg-white shadow-xs overflow-hidden hover:shadow-sm transition-shadow"
			>
				<div class="grid grid-cols-1 md:grid-cols-[280px_1fr]">
					<!-- Image -->
					<a
						href={itemDetailHref(item)}
						onclick={() => item.is_unread && markAsRead(item.report_id)}
						class="block relative aspect-[1200/630] md:aspect-auto md:h-full bg-gradient-to-br from-primary via-accent to-primary-dark"
					>
						{#if item.image_url || item.generated_image_url || item.fallback_image_url}
							<img
								src={item.image_url ?? item.generated_image_url ?? item.fallback_image_url}
								data-fallback={item.image_url
									? (item.generated_image_url ?? item.fallback_image_url ?? '')
									: item.generated_image_url
										? (item.fallback_image_url ?? '')
										: ''}
								alt=""
								loading="lazy"
								decoding="async"
								onerror={onImageError}
								onload={onImageLoad}
								class="absolute inset-0 w-full h-full object-cover"
							/>
							<span
								class="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-dark"
								style="display: none"
								aria-hidden="true"
							></span>
						{/if}
					</a>

					<!-- Content -->
					<div class="p-4 md:p-5 flex flex-col gap-3">
						<!-- Date principale + semaine + unread -->
						<div class="flex items-center gap-3 text-xs text-text-muted flex-wrap">
							<span class="font-semibold text-text">{formatDateLong(item.report_generated_at)}</span>
							<span>·</span>
							<span>{item.report_week_label}</span>
							{#if item.is_unread}
								<span
									class="px-1.5 py-0.5 rounded-full bg-warning text-white text-[10px] font-semibold uppercase tracking-wider"
								>
									Non lu
								</span>
							{/if}
						</div>

						<!-- Titre -->
						<h3 class="text-lg md:text-xl font-bold text-text leading-tight">
							<a
								href={itemDetailHref(item)}
								onclick={() => item.is_unread && markAsRead(item.report_id)}
								class="hover:text-primary transition-colors"
							>
								{item.title}
							</a>
						</h3>

						<!-- Badges primaires + conditionnels -->
						<div class="flex flex-wrap gap-1.5 text-[11px]">
							<!-- 1. Pertinence -->
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full border font-semibold {ACTIONABILITY_STYLES[
									item.actionability
								]}"
							>
								{ACTIONABILITY_LABELS[item.actionability]}
							</span>
							<!-- 2. Segment -->
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium {SEGMENT_STYLES[
									item.segment
								]}"
							>
								{SEGMENT_LABELS[item.segment]}
							</span>
							<!-- 3. Geo -->
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium bg-surface-alt text-text border-border"
							>
								{item.geo_label}
							</span>
							<!-- 4. Thème -->
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full border font-medium bg-accent/8 text-accent border-accent/20"
							>
								{THEME_LABELS[item.theme]}
							</span>

							<!-- Conditionnels -->
							{#if item.is_hot}
								<span
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold bg-danger text-white border-danger"
								>
									<span aria-hidden="true">🔥</span> Signal chaud
								</span>
							{/if}
							{#if item.recurrence_count >= 2}
								<span
									class="inline-flex items-center px-2 py-0.5 rounded-full border font-semibold bg-primary/10 text-primary border-primary/20"
								>
									×{item.recurrence_count} Récurrent
								</span>
							{/if}

							{#if item.verification && (item.verification.url_ok === false || item.verification.entity_ok === false)}
								<span
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold bg-danger-light text-danger border-danger/30"
									title={item.verification.url_reason ?? 'Entités non vérifiées'}
								>
									Non vérifié
								</span>
							{/if}
						</div>

						<!-- Résumé -->
						<p class="text-sm text-text-body leading-relaxed">{item.summary}</p>

						<!-- Chips search_terms : auto-exécution prospection au clic (Bloc 4) -->
						{#if item.search_terms && item.search_terms.length > 0}
							<div class="flex flex-wrap gap-1.5 pt-1">
								{#each item.search_terms as chip, idx (chip.label ?? idx)}
									{@const loadingKey = `${item.report_id}:${idx}`}
									{@const isLoading = chipLoading === loadingKey}
									<button
										type="button"
										disabled={chipLoading !== null}
										onclick={() => runChipSearch(chip, item, idx)}
										title="Auto-exécuter {chip.kind === 'zefix' ? 'Zefix' : 'SIMAP'} · {chip.canton} · {chip.query}"
										class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-accent/8 text-accent border border-accent/20 hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										<span class="material-symbols-outlined text-[12px]">
											{isLoading ? 'progress_activity' : chip.kind === 'zefix' ? 'business' : 'gavel'}
										</span>
										{chip.label}
									</button>
								{/each}
							</div>
						{/if}

						<!-- Footer : source + date article -->
						<div class="flex items-center gap-2 text-xs text-text-muted pt-2 border-t border-border/60">
							<span class="font-semibold text-text">{item.source.name}</span>
							<span>·</span>
							<a
								href={item.source.url}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/60 text-text-muted hover:text-primary transition-colors"
								title="Ouvrir l'article source ({formatDateLong(item.source.published_at)})"
							>
								<span class="material-symbols-outlined text-[14px]">open_in_new</span>
								{formatDateShort(item.source.published_at)}
							</a>
							<a
								href={itemDetailHref(item)}
								onclick={() => item.is_unread && markAsRead(item.report_id)}
								class="ml-auto font-semibold text-primary hover:text-primary-dark"
							>
								Détail →
							</a>
						</div>
					</div>
				</div>
			</article>
		{/each}
	</div>

	{#if data.feed.length > 0}
		<footer class="mt-10 pt-6 border-t border-border text-xs text-text-muted flex items-center justify-between">
			<div>Veille FilmPro · Généré par Claude chaque vendredi</div>
			<div class="font-semibold">FilmPro</div>
		</footer>
	{/if}
</div>
