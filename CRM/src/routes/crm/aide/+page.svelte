<!--
	Centre d'aide CRM FilmPro - orchestrateur (audit 360 H-28 / M-29).

	Refonte from scratch : remplace l'ancien HTML monolithe de 1443 lignes (hors charte,
	`getElementById`, recherche bidon). Contenu désormais data-driven (`$lib/aide/content.ts`),
	recherche full-text pure (`$lib/aide/search.ts`), composants de rendu réutilisables.

	Structure : onglets (primitive `Tabs`) = 3 niveaux · sommaire sticky à gauche ·
	contenu au centre · « sur cette page » à droite (IntersectionObserver, replié en mobile).
	Deep-link `?tab=X&section=Y` (replaceState, noScroll). Ancres `id` propres, zéro `getElementById`.
	Conformité GOLDEN v9 : tokens couleur, échelle 8px, pas de gradient/dashed, primitive Tabs réutilisée.
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Tabs from '$lib/components/Tabs.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageBand from '$lib/components/PageBand.svelte';
	import AideBlock from '$lib/components/aide/AideBlock.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { isBandeauActive } from '$lib/pageBandeau';
	import { isCoherenceActive } from '$lib/ui/coherence';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { aideContent, levelByKey, type AideLevelKey, type AideSection } from '$lib/aide/content';
	import { searchAide, type AideSearchResult } from '$lib/aide/search';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tabSpecs = aideContent.map((l) => ({ key: l.key, label: l.label }));

	let activeKey = $state<AideLevelKey>(levelByKey($page.url.searchParams.get('tab')).key);
	const activeLevel = $derived(levelByKey(activeKey));
	// Cohérence UI : bandeau de page in-page (flag ff_page_bandeau). Source unique isBandeauActive.
	// OFF → en-tête `.aide-head` actuel (titre = niveau actif). ON → bandeau standard « Aide » ; le
	// niveau actif reste porté par les onglets ci-dessous.
	const bandeau = $derived(isBandeauActive(data.featureFlags, $page.url.pathname));
	// Cohérence UI (b, flag ff_ui_coherence, INC-5) : recherche legacy `.aide-search` routée vers la
	// primitive SearchInput (kbd « / » via snippet trailing, focus via bind:this). OFF ⇒ champ legacy.
	const coherence = $derived(isCoherenceActive(data.featureFlags));

	let query = $state('');
	const results = $derived<AideSearchResult[]>(searchAide(query));
	const searching = $derived(query.trim().length > 0);

	// Champ de recherche + raccourci « / » pour le focaliser (pattern docs Linear/Vercel). Le bind:this
	// sert les DEUX branches (input legacy OU instance SearchInput) : chacune expose focus().
	let searchInput = $state<HTMLInputElement | { focus: () => void }>();
	$effect(() => {
		if (typeof document === 'undefined') return;
		function onKey(e: KeyboardEvent) {
			if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
			const t = e.target as HTMLElement | null;
			if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
			e.preventDefault();
			searchInput?.focus();
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	// Section visible (mise à jour par l'IntersectionObserver) - pilote le « sur cette page ».
	let activeSectionId = $state<string>('');

	// Registre des éléments de section (remplace getElementById, audit 360 M-29).
	const sectionEls = new Map<string, HTMLElement>();
	function registerSection(node: HTMLElement, id: string) {
		sectionEls.set(id, node);
		return { destroy: () => sectionEls.delete(id) };
	}

	$effect(() => {
		$pageSubtitle = activeLevel.label;
		return () => {
			$pageSubtitle = '';
		};
	});

	function syncUrl(tab: AideLevelKey, section?: string) {
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		if (section) url.searchParams.set('section', section);
		else url.searchParams.delete('section');
		goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function selectTab(key: string) {
		activeKey = key as AideLevelKey;
		activeSectionId = '';
		query = '';
		syncUrl(activeKey);
	}

	function scrollToSection(id: string) {
		const el = sectionEls.get(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeSectionId = id;
		}
	}

	function goToResult(r: AideSearchResult) {
		query = '';
		if (r.levelKey !== activeKey) {
			activeKey = r.levelKey;
			activeSectionId = r.sectionId;
			syncUrl(activeKey, r.sectionId);
			// laisser le DOM du nouveau niveau se monter avant de scroller
			queueMicrotask(() => requestAnimationFrame(() => scrollToSection(r.sectionId)));
		} else {
			syncUrl(activeKey, r.sectionId);
			scrollToSection(r.sectionId);
		}
	}

	// Au montage : si l'URL pointe une section, on y va.
	$effect(() => {
		const target = $page.url.searchParams.get('section');
		if (!target) return;
		requestAnimationFrame(() => scrollToSection(target));
	});

	// IntersectionObserver : suit la section en cours de lecture (recréé quand le niveau change).
	$effect(() => {
		void activeLevel.sections.length;
		void activeKey;
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeSectionId = entry.target.id;
				}
			},
			{ rootMargin: '-72px 0px -65% 0px', threshold: 0 }
		);
		const raf = requestAnimationFrame(() => {
			for (const sec of activeLevel.sections) {
				const el = sectionEls.get(sec.id);
				if (el) observer.observe(el);
			}
		});
		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	});

	function sectionAnchor(section: AideSection): string {
		return section.id;
	}
</script>

<svelte:head><title>Aide · FilmPro</title></svelte:head>

<div class="aide">
	{#if bandeau}
		<PageBand
			icon="help_outline"
			eyebrow="Le mode d'emploi"
			title="Aide"
			desc="Comment l'outil marche, section par section."
			descMobile="Section par section."
		/>
	{:else}
		<!-- En-tête de page (le H1 « Aide » est porté par Header.svelte ; ici on ouvre en H2). -->
		<header class="aide-head">
			<div class="aide-head-text">
				<p class="aide-kicker">Centre d'aide</p>
				<h2 class="aide-title">{activeLevel.label}</h2>
				<p class="aide-tagline">{activeLevel.tagline}</p>
			</div>
			<div class="aide-head-badge" aria-hidden="true">
				<Icon name={activeLevel.icon} size={26} strokeWidth={2} />
			</div>
		</header>
	{/if}

	<!-- Onglets de niveau + recherche. -->
	<div class="aide-bar">
		<Tabs
			tabs={tabSpecs}
			active={activeKey}
			onSelect={selectTab}
			ariaLabel="Niveaux d'aide"
			density="comfortable"
			tabIdPrefix="aide-tab"
			panelIdPrefix="aide-panel"
		>
			{#snippet actions()}
				{#if coherence}
					<div class="coh-search">
						<SearchInput
							bind:this={searchInput}
							value={query}
							oninput={(v) => (query = v)}
							placeholder="Rechercher dans l'aide…"
							ariaLabel="Rechercher dans l'aide"
						>
							{#snippet trailing()}
								<kbd class="aide-kbd-coh" aria-hidden="true">/</kbd>
							{/snippet}
						</SearchInput>
					</div>
				{:else}
					<div class="aide-search">
						<Icon name="search" size={16} strokeWidth={2} class="aide-search-icon" />
						<input
							type="search"
							placeholder="Rechercher dans l'aide…"
							bind:value={query}
							bind:this={searchInput}
							aria-label="Rechercher dans l'aide"
						/>
						{#if !searching}
							<kbd class="aide-search-kbd" aria-hidden="true">/</kbd>
						{/if}
					</div>
				{/if}
			{/snippet}
		</Tabs>
	</div>

	{#if searching}
		<!-- Résultats de recherche (toutes sections, tous niveaux). -->
		<div class="aide-results" role="region" aria-label="Résultats de recherche">
			{#if results.length === 0}
				<p class="aide-results-empty">Aucune section ne contient « {query} ».</p>
			{:else}
				<p class="aide-results-count">{results.length} section{results.length > 1 ? 's' : ''}</p>
				<ul>
					{#each results as r (r.levelKey + r.sectionId)}
						<li>
							<button type="button" class="aide-result" onclick={() => goToResult(r)}>
								<span class="aide-result-icon"><Icon name={r.sectionIcon} size={16} strokeWidth={2} /></span>
								<span class="aide-result-text">
									<span class="aide-result-title">{r.sectionTitle}</span>
									<span class="aide-result-level">{r.levelLabel}</span>
								</span>
								<Icon name="arrow_forward" size={14} strokeWidth={2} />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<!-- Corps : sommaire / contenu / « sur cette page ». -->
	<div
		class="aide-body"
		id={`aide-panel-${activeKey}`}
		role="tabpanel"
		aria-labelledby={`aide-tab-${activeKey}`}
		tabindex="-1"
	>
		<!-- Sommaire à gauche (sticky). -->
		<nav class="aide-toc" aria-label="Sommaire du niveau">
			<p class="aide-toc-title">Sommaire</p>
			<ul>
				{#each activeLevel.sections as sec (sec.id)}
					<li>
						<a
							href={`#${sectionAnchor(sec)}`}
							class="aide-toc-link"
							class:active={activeSectionId === sec.id}
							aria-current={activeSectionId === sec.id ? 'location' : undefined}
							onclick={(e) => {
								e.preventDefault();
								syncUrl(activeKey, sec.id);
								scrollToSection(sec.id);
							}}
						>
							<Icon name={sec.icon} size={16} strokeWidth={2} />
							<span>{sec.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- Contenu central. -->
		<div class="aide-content">
			{#each activeLevel.sections as sec (sec.id)}
				<section id={sec.id} use:registerSection={sec.id} class="aide-section" aria-labelledby={`h-${sec.id}`}>
					<div class="aide-section-head">
						<span class="aide-section-icon"><Icon name={sec.icon} size={20} strokeWidth={2} /></span>
						<div>
							<h2 id={`h-${sec.id}`} class="aide-section-title">{sec.title}</h2>
							<p class="aide-section-lead">{sec.lead}</p>
						</div>
					</div>
					<div class="aide-section-body">
						{#each sec.blocks as block, i (i)}
							<AideBlock {block} />
						{/each}
					</div>
				</section>
			{/each}
		</div>

		<!-- « Sur cette page » à droite (sticky, replié en mobile). -->
		<nav class="aide-onthispage" aria-label="Sur cette page">
			<p class="aide-onthispage-title">Sur cette page</p>
			<ul>
				{#each activeLevel.sections as sec (sec.id)}
					<li>
						<a
							href={`#${sectionAnchor(sec)}`}
							class:active={activeSectionId === sec.id}
							onclick={(e) => {
								e.preventDefault();
								syncUrl(activeKey, sec.id);
								scrollToSection(sec.id);
							}}>{sec.title}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</div>

<style>
	.aide {
		max-width: 1280px;
		margin: 0 auto;
	}

	/* En-tête */
	.aide-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding: 8px 0 32px;
	}
	.aide-head-text {
		min-width: 0;
	}
	.aide-head-badge {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: var(--radius-xl);
		background: var(--color-primary-light);
		color: var(--color-primary);
		box-shadow: var(--shadow-xs);
	}
	.aide-kicker {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 0 0 8px;
	}
	.aide-title {
		/* 24px = échelle éditoriale dashboard du golden (§3.2bis), pas l'échelle universelle :
		   titre de page « display », au-dessus des titres de section (18px = h2 universel). */
		font-size: 24px;
		font-weight: 600;
		line-height: 1.12;
		letter-spacing: -0.015em;
		color: var(--color-text);
		margin: 0 0 8px;
	}
	/* Cohérence UI (b, INC-9, flag ff_ui_coherence) : titre de page workspace unifié à font-weight 700
	   (600 → 700, aligné sur cp-title et reporting h2). Co-localisé + gaté ⇒ OFF strictement inchangé. */
	:global(.coherence-ui) .aide-title {
		font-weight: 700;
	}
	.aide-tagline {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text-muted);
		max-width: 56ch;
		margin: 0;
		text-wrap: pretty;
	}

	/* Barre onglets + recherche : on neutralise le sticky de la primitive Tabs ici. */
	.aide-bar :global(.tabs-bar) {
		position: static;
		padding: 0;
		border-bottom: 1px solid var(--color-border);
	}
	.aide-bar :global(.tabs-actions) {
		border-left: none;
		padding-left: 0;
	}
	.aide-search {
		position: relative;
		display: flex;
		align-items: center;
	}
	.aide-search :global(.aide-search-icon) {
		position: absolute;
		left: 10px;
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.aide-search input {
		height: 36px;
		width: 252px;
		max-width: 100%;
		padding: 6px 34px 6px 32px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 14px;
		color: var(--color-text);
		background: var(--color-surface);
		transition: border-color 150ms var(--ease-out-expo), box-shadow 150ms var(--ease-out-expo);
	}
	.aide-search input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.aide-search input::placeholder {
		color: var(--color-text-muted);
	}
	/* Indice clavier « / » : pilule discrète à droite, masquée dès qu'on tape. */
	.aide-search-kbd {
		position: absolute;
		right: 9px;
		top: 50%;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1;
		pointer-events: none;
	}
	/* Cohérence UI (b, flag ff_ui_coherence, INC-5) : wrapper de la recherche routée vers SearchInput.
	   Classes ON-only (absentes du DOM OFF) ⇒ zéro régression OFF par construction. Largeur alignée sur
	   le champ legacy (252px) ; hauteur 40px héritée de `:global(.coherence-ui) .search-input`. */
	.coh-search {
		width: 252px;
		max-width: 100%;
	}
	.coh-search :global(.search-input) {
		width: 100%;
	}
	/* Indice clavier « / » en enfant flex de SearchInput (pas absolute) : cohabite avec le bouton clear,
	   mutuellement exclusif (le snippet trailing n'est rendu que quand le champ est vide). Tokens = legacy. */
	.aide-kbd-coh {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1;
		flex-shrink: 0;
		pointer-events: none;
	}
	.aide-search input:focus + .aide-search-kbd {
		opacity: 0;
	}

	/* Résultats de recherche */
	.aide-results {
		margin: 16px 0 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 12px 16px;
		background: var(--color-surface-alt);
	}
	.aide-results-empty {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0;
	}
	.aide-results-count {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		margin: 0 0 8px;
	}
	.aide-results ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.aide-result {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		color: var(--color-text);
	}
	.aide-result:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
	}
	.aide-result-icon {
		display: inline-flex;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.aide-result-text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.aide-result-title {
		font-size: 14px;
		font-weight: 600;
	}
	.aide-result-level {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	/* Corps 3 colonnes */
	.aide-body {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr) 200px;
		gap: 32px;
		margin-top: 24px;
	}
	.aide-body:focus {
		outline: none;
	}

	/* Sommaire gauche + « sur cette page » droite */
	.aide-toc,
	.aide-onthispage {
		align-self: start;
		position: sticky;
		top: 16px;
	}
	.aide-toc-title,
	.aide-onthispage-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0 0 8px;
	}
	/* Cohérence UI (b, flag ff_ui_coherence, INC-8) : titres de colonnes latérales alignés .eyebrow
	   (700/0.12em). Complète l'INC-9 aide de lot 2A (aide-title/aide-section-title). Size/couleur déjà
	   conformes. OFF ⇒ .coherence-ui absent ⇒ 600/0.06em préservé. */
	:global(.coherence-ui) .aide-toc-title,
	:global(.coherence-ui) .aide-onthispage-title {
		font-weight: 700;
		letter-spacing: 0.12em;
	}
	.aide-toc ul,
	.aide-onthispage ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.aide-toc-link {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 7px 11px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-decoration: none;
		line-height: 1.3;
		transition: background 150ms var(--ease-out-expo), color 150ms var(--ease-out-expo);
	}
	.aide-toc-link :global(svg) {
		flex-shrink: 0;
		color: var(--color-text-muted);
		transition: color 150ms var(--ease-out-expo);
	}
	.aide-toc-link:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.aide-toc-link.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 600;
		box-shadow: inset 2px 0 0 var(--color-primary);
	}
	.aide-toc-link.active :global(svg) {
		color: var(--color-primary);
	}

	.aide-onthispage a {
		display: block;
		padding: 4px 8px;
		border-left: 2px solid var(--color-border);
		font-size: 12px;
		color: var(--color-text-muted);
		text-decoration: none;
		line-height: 1.35;
	}
	.aide-onthispage a:hover {
		color: var(--color-text);
		border-left-color: var(--color-border-strong);
	}
	.aide-onthispage a.active {
		color: var(--color-primary);
		border-left-color: var(--color-primary);
		font-weight: 600;
	}

	/* Contenu */
	.aide-content {
		min-width: 0;
	}
	.aide-section {
		padding: 32px 0 48px;
		border-bottom: 1px solid var(--color-border);
		scroll-margin-top: 16px;
	}
	.aide-section:first-child {
		padding-top: 4px;
	}
	.aide-section:last-child {
		border-bottom: none;
	}
	.aide-section-head {
		display: flex;
		gap: 14px;
		margin-bottom: 24px;
		align-items: flex-start;
	}
	.aide-section-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		background: var(--color-primary-light);
		color: var(--color-primary);
		box-shadow: var(--shadow-xs);
		flex-shrink: 0;
	}
	.aide-section-title {
		font-size: 18px;
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: -0.01em;
		color: var(--color-text);
		margin: 3px 0 6px;
		text-wrap: balance;
	}
	/* Cohérence UI (b, INC-9, flag ff_ui_coherence) : titre de section unifié à font-weight 700
	   (600 → 700, aligné sur reporting h2 18px/700). Co-localisé + gaté ⇒ OFF strictement inchangé. */
	:global(.coherence-ui) .aide-section-title {
		font-weight: 700;
	}
	.aide-section-lead {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text-muted);
		max-width: 64ch;
		margin: 0;
		text-wrap: pretty;
	}
	.aide-section-body {
		max-width: 700px;
	}

	/* Responsive : on replie les deux colonnes latérales. */
	@media (max-width: 1024px) {
		.aide-body {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.aide-onthispage {
			display: none;
		}
		.aide-toc {
			position: static;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			padding: 12px;
		}
	}
	@media (max-width: 640px) {
		.aide-search input {
			width: 100%;
		}
		.aide-section-body {
			max-width: none;
		}
	}
</style>
