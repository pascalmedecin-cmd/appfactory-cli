<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import Badge from '$lib/components/Badge.svelte';
	import ImportModal from '$lib/components/prospection/ImportModal.svelte';
	import LeadSlideOut from '$lib/components/prospection/LeadSlideOut.svelte';
	import LeadExpress from '$lib/components/prospection/LeadExpress.svelte';
	import EnrichBatchModal from '$lib/components/prospection/EnrichBatchModal.svelte';
	import AlerteModal from '$lib/components/prospection/AlerteModal.svelte';
	import BatchActionsBar from '$lib/components/prospection/BatchActionsBar.svelte';
	import RecherchesPanel from '$lib/components/prospection/RecherchesPanel.svelte';
	import MultiSelectDropdown from '$lib/components/MultiSelectDropdown.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import ProspectionTabs from '$lib/components/prospection/ProspectionTabs.svelte';
	import {
		cantonNoms,
		statutLabel, statutBadgeVariant, sourceLabel, relativeDate,
		sourceOptions, cantonOptions, temperatureOptions, statutOptions,
		type ProspectionTabKey,
	} from '$lib/prospection-utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Lead = (typeof data.leads)[number];

	$effect(() => { $pageSubtitle = `${data.totalLeads} prospect${data.totalLeads > 1 ? 's' : ''}`; });

	let slideOutOpen = $state(false);
	let selectedLead = $state<Lead | null>(null);
	let importModalOpen = $state(false);
	let importResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let selectedIds = $state<Set<string>>(new Set());
	let selectAllLoading = $state(false);
	let selectAllNotice = $state<{ message: string; type: 'info' | 'error' } | null>(null);
	let enrichBatchOpen = $state(false);
	let enrichBatchIds = $state<string[]>([]);
	let alerteModalOpen = $state(false);
	let recherchesOpen = $state(false);
	let mobileFiltersOpen = $state(false);
	let mobileMenuOpen = $state(false);
	let mobileMenuRef = $state<HTMLDivElement | null>(null);
	let leadExpressOpen = $state(false);

	const showSelectAllBanner = $derived(
		selectedIds.size > 0
		&& selectedIds.size === data.leads.length
		&& data.leads.length > 0
		&& data.totalLeads > data.leads.length
		&& selectedIds.size < data.totalLeads
	);

	// Reset notice quand la sélection retombe à zéro
	$effect(() => {
		if (selectedIds.size === 0 && selectAllNotice) selectAllNotice = null;
	});

	async function selectAllMatching() {
		selectAllLoading = true;
		try {
			const res = await fetch(`/api/prospection/all-ids${$page.url.search}`);
			if (!res.ok) {
				selectAllNotice = { message: 'Impossible de récupérer la sélection complète.', type: 'error' };
				return;
			}
			const payload = await res.json() as { ids: string[]; total: number; capped: boolean };
			selectedIds = new Set(payload.ids);
			if (payload.capped) {
				selectAllNotice = {
					message: `Sélection limitée à ${payload.ids.length} prospects (cap technique). Affinez les filtres pour traiter le reste.`,
					type: 'info',
				};
			} else {
				selectAllNotice = null;
			}
		} catch {
			selectAllNotice = { message: 'Erreur réseau. Réessayez.', type: 'error' };
		} finally {
			selectAllLoading = false;
		}
	}

	function closeMobileMenuOnOutside(event: MouseEvent) {
		if (mobileMenuRef && !mobileMenuRef.contains(event.target as Node)) {
			mobileMenuOpen = false;
		}
	}

	$effect(() => {
		if (mobileMenuOpen) {
			document.addEventListener('click', closeMobileMenuOnOutside);
			return () => document.removeEventListener('click', closeMobileMenuOnOutside);
		}
	});

	// Filtres synchronisés avec les URL params du serveur
	let filterSources = $state<string[]>(data.filters.sources);
	let filterCantons = $state<string[]>(data.filters.cantons);
	let filterStatuts = $state<string[]>(data.filters.statuts);
	let filterTemperatures = $state<string[]>(data.filters.temperatures);
	// Phase 0 : toggle "afficher les transférés" persistant via URL ?showTransferred=1
	let showTransferred = $state<boolean>(data.showTransferred);

	const activeFilterCount = $derived(
		(filterStatuts.length > 0 ? 1 : 0) +
		(filterTemperatures.length > 0 ? 1 : 0) +
		(filterCantons.length > 0 ? 1 : 0) +
		(filterSources.length > 0 ? 1 : 0)
	);

	function buildUrl(overrides: Record<string, string | string[] | number | boolean | undefined> = {}) {
		const params = new URLSearchParams();
		const sources = overrides.source !== undefined ? overrides.source as string[] : filterSources;
		const cantons = overrides.canton !== undefined ? overrides.canton as string[] : filterCantons;
		const statuts = overrides.statut !== undefined ? overrides.statut as string[] : filterStatuts;
		const temps = overrides.temp !== undefined ? overrides.temp as string[] : filterTemperatures;
		const showTr = overrides.showTransferred !== undefined ? overrides.showTransferred as boolean : showTransferred;
		const pg = overrides.page !== undefined ? overrides.page as number : data.page;
		const sort = (overrides.sort as string) ?? data.sort;
		const dir = overrides.dir !== undefined ? overrides.dir as string : (data.sortAsc ? 'asc' : 'desc');
		const q = overrides.q !== undefined ? overrides.q as string : data.search;
		const tab = (overrides.tab as string) ?? data.tab;
		const perPage = overrides.perPage !== undefined ? Number(overrides.perPage) : data.pageSize;

		if (tab && tab !== 'simap') params.set('tab', tab);
		if (pg > 0) params.set('page', String(pg));
		if (sort !== 'score_pertinence') params.set('sort', sort);
		if (dir === 'asc') params.set('dir', 'asc');
		if (q) params.set('q', q);
		if (perPage !== 25) params.set('perPage', String(perPage));
		sources.forEach(s => params.append('source', s));
		cantons.forEach(c => params.append('canton', c));
		statuts.forEach(s => params.append('statut', s));
		temps.forEach(t => params.append('temp', t));
		if (showTr) params.set('showTransferred', '1');

		const qs = params.toString();
		return qs ? `?${qs}` : $page.url.pathname;
	}

	function applyFilters() {
		goto(buildUrl({ page: 0 }), { keepFocus: true, noScroll: true });
	}

	// Réagir aux changements de filtres (skip le premier run au mount)
	let filterDebounce: ReturnType<typeof setTimeout> | null = null;
	let filterMounted = false;
	$effect(() => {
		// Tracker les valeurs
		filterSources; filterCantons; filterStatuts; filterTemperatures; showTransferred;
		if (!filterMounted) { filterMounted = true; return; }
		if (filterDebounce) clearTimeout(filterDebounce);
		filterDebounce = setTimeout(() => applyFilters(), 200);
	});

	// Phase 2 2026-05-01 : columns par onglet (colonne signature distincte par nature de signal).
	const PRIORITY_TOOLTIP = 'Score 0-12 calculé automatiquement à partir du canton, du secteur, de la source, de la récence et du montant. ≥ 7 = prioritaire · 4-6 = à qualifier · ≤ 3 = faible signal.';

	const baseColumns = [
		{ key: 'score_pertinence', label: 'Priorité', shortLabel: 'Prio.', sortable: true, infoTooltip: PRIORITY_TOOLTIP, defaultWidth: 130, minWidth: 110 },
		{ key: 'raison_sociale', label: 'Entreprise', sortable: true, defaultWidth: 240, minWidth: 160 },
	];

	const columnsByTab: Record<ProspectionTabKey, Array<{ key: string; label: string; shortLabel?: string; sortable: boolean; class?: string; infoTooltip?: string; defaultWidth?: number; minWidth?: number }>> = {
		simap: [
			...baseColumns,
			{ key: 'montant', label: 'Montant estimé', sortable: true, defaultWidth: 140, minWidth: 110 },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70, class: 'hidden md:table-cell' },
			{ key: 'date_publication', label: 'Publié le', sortable: true, defaultWidth: 110, minWidth: 100, class: 'hidden lg:table-cell' },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
			{ key: 'date_import', label: 'Ajouté', sortable: true, defaultWidth: 100, minWidth: 90, class: 'hidden lg:table-cell' },
		],
		regbl: [
			...baseColumns,
			{ key: 'description', label: 'Type de travaux', sortable: false, defaultWidth: 220, minWidth: 160 },
			{ key: 'localite', label: 'Adresse', sortable: true, defaultWidth: 200, minWidth: 140, class: 'hidden md:table-cell' },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70 },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
			{ key: 'date_import', label: 'Ajouté', sortable: true, defaultWidth: 100, minWidth: 90, class: 'hidden lg:table-cell' },
		],
		entreprises: [
			...baseColumns,
			{ key: 'localite', label: 'Localité', sortable: true, defaultWidth: 160, minWidth: 120, class: 'hidden md:table-cell' },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70 },
			{ key: 'source', label: 'Source', sortable: true, defaultWidth: 140, minWidth: 110, class: 'hidden lg:table-cell' },
			{ key: 'date_publication', label: 'Inscription', sortable: true, defaultWidth: 110, minWidth: 100, class: 'hidden lg:table-cell' },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
		],
		terrain: [
			...baseColumns,
			{ key: 'description', label: 'Note terrain', sortable: false, defaultWidth: 240, minWidth: 160 },
			{ key: 'telephone', label: 'Téléphone', sortable: false, defaultWidth: 140, minWidth: 110, class: 'hidden md:table-cell' },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70 },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
			{ key: 'date_import', label: 'Ajouté', sortable: true, defaultWidth: 100, minWidth: 90, class: 'hidden lg:table-cell' },
		],
	};

	const columns = $derived(columnsByTab[data.tab as ProspectionTabKey] ?? columnsByTab.simap);

	// Configuration des onglets (icônes Lucide via icon-map, tooltips pédagogiques)
	const tabsConfig = $derived([
		{
			key: 'simap' as ProspectionTabKey,
			label: 'Marchés publics',
			icon: 'landmark',
			count: data.tabCounts.simap,
			tooltip: "Appels d'offres SIMAP publiés par les collectivités publiques (cantons, communes, hôpitaux). Signal d'achat explicite avec montant estimé et date de clôture.",
			colorVar: 'simap',
		},
		{
			key: 'regbl' as ProspectionTabKey,
			label: 'Chantiers RegBL',
			icon: 'construction',
			count: data.tabCounts.regbl,
			tooltip: 'Permis de construire et autorisations bâtiment du registre fédéral. Signal indirect de besoin vitrage (transformation, rénovation, neuf).',
			colorVar: 'regbl',
		},
		{
			key: 'entreprises' as ProspectionTabKey,
			label: 'Entreprises',
			icon: 'business',
			count: data.tabCounts.entreprises,
			tooltip: "Inscriptions du registre du commerce (Zefix) et fiches search.ch. Pour prospection à froid ciblée par canton et secteur.",
			colorVar: 'entreprises',
		},
		{
			key: 'terrain' as ProspectionTabKey,
			label: 'Terrain',
			icon: 'smartphone',
			count: data.tabCounts.terrain,
			tooltip: 'Saisies rapides en RDV chantier (lead express) et signaux issus de la veille sectorielle. Vos opportunités captées sur le terrain.',
			colorVar: 'terrain',
		},
	]);

	function selectTab(tab: ProspectionTabKey) {
		// Pas besoin d'invalidateAll : changer l'URL réinvoque load() automatiquement.
		// noScroll préserve la position de l'utilisateur (sinon scroll-to-top sur switch).
		goto(buildUrl({ tab, page: 0 }), { keepFocus: true, noScroll: true });
	}

	function openDetail(lead: Lead) {
		selectedLead = lead;
		slideOutOpen = true;
	}

	// Ouverture auto du SlideOut quand on arrive depuis dashboard avec ?slideOut=<id>
	// (workflow F3 lead express : redirect post-création vers fiche pour enrichissement).
	// On nettoie l'URL même si le lead n'est pas (encore) trouvé pour éviter une réouverture
	// post-fermeture rapide ou au reload navigateur.
	$effect(() => {
		const targetId = $page.url.searchParams.get('slideOut');
		if (!targetId || slideOutOpen) return;
		const lead = data.leads.find(l => l.id === targetId);
		const url = new URL($page.url);
		url.searchParams.delete('slideOut');
		goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
		if (lead) {
			selectedLead = lead;
			slideOutOpen = true;
		}
	});

	type Recherche = (typeof data.recherches)[number];

	function chargerRecherche(r: Recherche) {
		filterSources = r.sources ?? [];
		filterCantons = r.cantons ?? [];
		filterTemperatures = r.temperatures ?? [];
		filterStatuts = [];
		recherchesOpen = false;
	}

	function resetFilters() {
		filterSources = [];
		filterCantons = [];
		filterStatuts = [];
		filterTemperatures = [];
		showTransferred = false;
	}
</script>

<div class="flex flex-col gap-3 md:gap-5 md:h-[calc(100dvh-var(--header-height)-3rem)]">
	<!-- Phase 0 : 3 indicateurs honnêtes (remplacent le funnel décoratif 4 cartes
	     Importer/Enrichir/Qualifier/Convertir qui mentait + suggérait un parcours linéaire qui n'existe pas). -->
	<div class="md:hidden flex items-center gap-2 text-xs leading-tight tabular-nums" aria-label="Indicateurs prospection">
		<span class="font-semibold text-text">{data.leadsActifsCount} actif{data.leadsActifsCount > 1 ? 's' : ''}</span>
		<span class="text-border">·</span>
		<span class="text-text-muted">{data.marchesOuvertsCount} marché{data.marchesOuvertsCount > 1 ? 's' : ''}</span>
		<span class="text-border">·</span>
		<span class="text-text-muted">{data.transferresMoisCount} transféré{data.transferresMoisCount > 1 ? 's' : ''} ce mois</span>
	</div>
	<div class="hidden md:grid grid-cols-3 gap-0 border-y border-border">
		<div class="flex items-center gap-4 px-7 py-7">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl shrink-0" style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));">
				<Icon name="users" size={22} class="text-info" />
			</div>
			<div class="flex flex-col gap-0.5 min-w-0">
				<span class="text-[36px] leading-none font-bold tabular-nums text-primary-dark tracking-tight">{data.leadsActifsCount}</span>
				<span class="text-[13px] font-medium text-text-muted">Leads actifs</span>
			</div>
		</div>
		<div class="flex items-center gap-4 px-7 py-7 border-l border-border">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl shrink-0" style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));">
				<Icon name="landmark" size={22} class="text-info" />
			</div>
			<div class="flex flex-col gap-0.5 min-w-0">
				<span class="text-[36px] leading-none font-bold tabular-nums text-primary-dark tracking-tight">{data.marchesOuvertsCount}</span>
				<span class="text-[13px] font-medium text-text-muted">Marchés publics ouverts</span>
			</div>
		</div>
		<div class="flex items-center gap-4 px-7 py-7 border-l border-border">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl shrink-0" style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));">
				<Icon name="repeat" size={22} class="text-info" />
			</div>
			<div class="flex flex-col gap-0.5 min-w-0">
				<span class="text-[36px] leading-none font-bold tabular-nums text-primary-dark tracking-tight">{data.transferresMoisCount}</span>
				<span class="text-[13px] font-medium text-text-muted">Transférés ce mois</span>
			</div>
		</div>
	</div>

	<!-- Actions principales -->
	{#if data.totalLeads > 0}
	{@const enrichablesCount = data.leads.filter(l => l.statut !== 'transfere').length}
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="hidden md:flex items-center gap-3">
			{#if data.recherches.length > 0}
				<button
					onclick={() => recherchesOpen = !recherchesOpen}
					class="flex items-center gap-2 h-10 px-3 text-sm font-medium text-text border border-border rounded-lg box-border hover:bg-surface-alt cursor-pointer transition-colors"
				>
					<Icon name="bookmarks" size={18} />
					<span>Mes recherches</span>
					<span class="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">{data.recherches.length}</span>
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-2 ml-auto">
			<button
				onclick={() => { enrichBatchIds = data.leads.filter(l => l.statut !== 'transfere').map(l => l.id); enrichBatchOpen = true; }}
				class="hidden md:flex items-center gap-2 h-10 px-4 text-sm font-medium border rounded-lg box-border cursor-pointer transition-colors text-prosp-enrich border-prosp-enrich/20"
				disabled={enrichablesCount === 0}
				title="Enrichit uniquement les {enrichablesCount} leads de cette page"
			>
				<Icon name="auto_fix_high" size={18} />
				<span>Enrichir cette page</span>
				<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-prosp-enrich/10 text-prosp-enrich">{enrichablesCount}</span>
			</button>
			<button
				type="button"
				onclick={() => leadExpressOpen = true}
				class="md:hidden flex items-center gap-2 h-11 px-3 text-sm font-semibold text-primary border border-primary rounded-lg box-border bg-white hover:bg-primary-light cursor-pointer transition-colors"
				aria-label="Créer un lead express"
			>
				<Icon name="bolt" size={18} />
				<span>Lead express</span>
			</button>
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 h-11 md:h-10 px-4 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg box-border cursor-pointer shadow-md transition-colors"
			>
				<Icon name="cloud_download" size={18} />
				<span>Importer<span class="hidden sm:inline">&nbsp;des prospects</span></span>
			</button>
			<!-- Kebab mobile : actions secondaires -->
			<div class="md:hidden relative" bind:this={mobileMenuRef}>
				<button
					onclick={(e) => { e.stopPropagation(); mobileMenuOpen = !mobileMenuOpen; }}
					class="flex items-center justify-center h-11 w-11 rounded-lg border border-border bg-white hover:bg-surface-alt cursor-pointer transition-colors"
					aria-label="Plus d'actions"
					aria-haspopup="menu"
					aria-expanded={mobileMenuOpen}
				>
					<Icon name="more_vert" size={20} />
				</button>
				{#if mobileMenuOpen}
					<div role="menu" class="absolute right-0 top-full mt-1 w-60 rounded-lg border border-border bg-white shadow-lg z-30 overflow-hidden">
						{#if data.recherches.length > 0}
							<button
								role="menuitem"
								onclick={() => { recherchesOpen = true; mobileMenuOpen = false; }}
								class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-surface-alt cursor-pointer text-left"
							>
								<Icon name="bookmarks" size={18} class="text-text-muted" />
								<span class="flex-1">Mes recherches</span>
								<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">{data.recherches.length}</span>
							</button>
						{/if}
						<button
							role="menuitem"
							onclick={() => { enrichBatchIds = data.leads.filter(l => l.statut !== 'transfere').map(l => l.id); enrichBatchOpen = true; mobileMenuOpen = false; }}
							class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-surface-alt cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={enrichablesCount === 0}
						>
							<Icon name="auto_fix_high" size={18} class="text-prosp-enrich" />
							<span class="flex-1">Enrichir cette page</span>
							<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-prosp-enrich/10 text-prosp-enrich">{enrichablesCount}</span>
						</button>
						<button
							role="menuitem"
							onclick={() => { alerteModalOpen = true; mobileMenuOpen = false; }}
							class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-surface-alt cursor-pointer text-left"
						>
							<Icon name="notifications_active" size={18} class="text-primary" />
							<span class="flex-1">Créer une alerte</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
	{/if}

	<!-- Filtres : drawer mobile collapsible, grid permanent desktop -->
	<!-- Bouton mobile "Filtres" -->
	<div class="md:hidden flex items-center gap-2">
		<button
			onclick={() => mobileFiltersOpen = !mobileFiltersOpen}
			class="flex items-center gap-2 h-11 px-3 text-sm font-medium text-text border border-border rounded-lg box-border bg-white hover:bg-surface-alt cursor-pointer transition-colors"
			aria-expanded={mobileFiltersOpen}
			aria-controls="filtres-mobile-panel"
		>
			<Icon name="filter_list" size={18} />
			<span>Filtres</span>
			{#if activeFilterCount > 0}
				<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">{activeFilterCount}</span>
			{/if}
			<Icon name={mobileFiltersOpen ? 'expand_less' : 'expand_more'} size={18} class="text-text-muted" />
		</button>
		{#if activeFilterCount > 0}
			<span class="text-xs text-text-muted">{data.totalLeads} résultat{data.totalLeads > 1 ? 's' : ''}</span>
			<button onclick={resetFilters} class="flex items-center gap-1 ml-auto px-2 py-2 text-xs text-text-muted hover:text-danger cursor-pointer transition-colors">
				<Icon name="close" size={14} />
				Réinitialiser
			</button>
		{/if}
	</div>
	{#if mobileFiltersOpen}
		<div id="filtres-mobile-panel" class="md:hidden rounded-xl border border-border bg-white shadow-xs">
			<div class="grid grid-cols-2 gap-3 p-3">
				<MultiSelectDropdown bind:selected={filterStatuts} options={statutOptions} icon="checklist" label="Statut" tooltip="Filtrer par statut de traitement" />
				<MultiSelectDropdown bind:selected={filterTemperatures} options={temperatureOptions} icon="thermostat" label="Température" tooltip="Niveau d'intérêt estimé du prospect" />
				<MultiSelectDropdown bind:selected={filterCantons} options={cantonOptions} icon="location_on" label="Canton" tooltip="Zones géographiques" />
				<MultiSelectDropdown bind:selected={filterSources} options={sourceOptions} icon="database" label="Source" tooltip="Registres et bases de données" />
			</div>
		</div>
	{/if}
	<!-- Bloc filtres desktop -->
	<div class="hidden md:block rounded-xl border border-border bg-white shadow-xs">
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3">
			<MultiSelectDropdown bind:selected={filterStatuts} options={statutOptions} icon="checklist" label="Statut" tooltip="Filtrer par statut de traitement" />
			<MultiSelectDropdown bind:selected={filterTemperatures} options={temperatureOptions} icon="thermostat" label="Température" tooltip="Niveau d'intérêt estimé du prospect" />
			<MultiSelectDropdown bind:selected={filterCantons} options={cantonOptions} icon="location_on" label="Canton" tooltip="Zones géographiques" />
			<MultiSelectDropdown bind:selected={filterSources} options={sourceOptions} icon="database" label="Source" tooltip="Registres et bases de données" />
		</div>
		<div class="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0">
			<!-- Phase 0 : toggle "Afficher les transférés" off par défaut, persistant via URL ?showTransferred=1 -->
			<label class="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
				<input
					type="checkbox"
					bind:checked={showTransferred}
					class="h-3.5 w-3.5 cursor-pointer accent-primary"
				/>
				<span>Afficher aussi les leads transférés</span>
			</label>
			<div class="flex items-center gap-2 ml-auto">
				{#if activeFilterCount > 0}
					<span class="text-xs text-text-muted">{data.totalLeads} résultat{data.totalLeads > 1 ? 's' : ''}</span>
					<button onclick={resetFilters} class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-danger cursor-pointer transition-colors">
						<Icon name="close" size={14} />
						Réinitialiser
					</button>
				{/if}
				<button
					onclick={() => alerteModalOpen = true}
					class="flex items-center gap-2 h-10 px-3 text-sm font-medium text-primary border border-primary rounded-lg box-border hover:bg-primary/5 cursor-pointer transition-colors"
				>
					<Icon name="notifications_active" size={16} />
					Créer une alerte
				</button>
			</div>
		</div>
	</div>

	<!-- Recherches sauvegardées -->
	<RecherchesPanel bind:open={recherchesOpen} recherches={data.recherches} onCharger={chargerRecherche} />

	<!-- Notification import/enrichissement -->
	{#if importResult}
		<div class="flex items-center justify-between p-3 rounded-xl border shadow-xs {importResult.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}">
			<div class="flex items-center gap-2">
				<Icon name={importResult.type === 'success' ? 'check_circle' : 'error'} size={18} />
				<span class="text-sm font-medium">{importResult.message}</span>
			</div>
			<button onclick={() => importResult = null} class="text-sm opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Bannière sélection globale (Gmail/Notion pattern) -->
	{#if showSelectAllBanner}
		<div class="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary-light text-sm">
			<Icon name="checklist" size={16} class="text-primary shrink-0" />
			<span class="text-text">
				Les <strong>{selectedIds.size}</strong> prospects de cette page sont sélectionnés.
			</span>
			<button
				onclick={selectAllMatching}
				disabled={selectAllLoading}
				class="font-semibold text-primary hover:text-primary-hover underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{selectAllLoading ? 'Chargement…' : `Sélectionner les ${data.totalLeads} prospects qui correspondent aux filtres`}
			</button>
		</div>
	{/if}
	{#if selectAllNotice}
		<div class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm {selectAllNotice.type === 'error' ? 'border-danger/30 bg-danger-light text-danger' : 'border-primary/20 bg-primary-light text-text'}">
			<div class="flex items-center gap-2">
				<Icon name={selectAllNotice.type === 'error' ? 'error' : 'info'} size={16} class="shrink-0" />
				<span>{selectAllNotice.message}</span>
			</div>
			<button onclick={() => (selectAllNotice = null)} class="text-xs opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Barre actions batch -->
	<BatchActionsBar bind:selectedIds bind:enrichBatchIds bind:enrichBatchOpen />

	<div class="flex-1 min-h-0 flex flex-col">
	<!-- Empty state global UNIQUEMENT si tous les onglets sont vides (système jamais peuplé).
	     Sinon les onglets restent visibles (sinon impossible de revenir sur SIMAP depuis Terrain à 0). -->
	{#if data.tabCounts.simap === 0 && data.tabCounts.regbl === 0 && data.tabCounts.entreprises === 0 && data.tabCounts.terrain === 0 && activeFilterCount === 0}
		<div class="flex flex-col items-center justify-center py-16 px-6">
			<div class="flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style="background: linear-gradient(135deg, var(--color-prosp-import-bg), var(--color-prosp-enrich-bg))">
				<Icon name="search" size={32} class="text-prosp-import" />
			</div>
			<h3 class="text-lg font-semibold text-text mb-2">Trouvez vos premiers prospects</h3>
			<p class="text-sm text-text-muted text-center max-w-lg mb-6">
				Importez des entreprises depuis les sources publiques suisses (registre du commerce, marchés publics, registre des bâtiments). Qualifiez-les, puis convertissez les plus pertinentes en entreprises dans votre CRM.
			</p>
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer shadow-md transition-colors"
			>
				<Icon name="cloud_download" size={18} />
				Lancer un import
			</button>
		</div>
	{:else}
	<!-- Phase 2 : onglets par nature de signal collés au DataTable (1 shell visuel cohérent) -->
	<div class="bg-white rounded-xl border border-border shadow-sm flex flex-col min-h-0 overflow-visible">
		<ProspectionTabs tabs={tabsConfig} active={data.tab as ProspectionTabKey} onSelect={selectTab} />
		{#if data.sourceFilterIncompatible}
			<div class="flex items-start gap-2 px-4 py-3 border-b border-warning/30 bg-warning-light text-warning text-sm" role="status">
				<Icon name="info" size={18} class="shrink-0 mt-0.5" />
				<div class="flex-1">
					<strong class="font-semibold">Filtre source incompatible avec l'onglet actif.</strong>
					Le filtre Source actuel ne contient aucune source liée à <em>{tabsConfig.find(t => t.key === data.tab)?.label}</em>. Aucun résultat à afficher.
				</div>
				<button
					onclick={() => { filterSources = []; }}
					class="font-semibold underline hover:no-underline cursor-pointer"
				>Retirer le filtre Source</button>
			</div>
		{/if}
	<DataTable
		data={data.leads}
		{columns}
		dense={true}
		resizable={true}
		storageKey="prospection-{data.tab}"
		pageSizeOptions={[25, 50, 100]}
		onPageSizeChange={(s) => goto(buildUrl({ perPage: s, page: 0 }), { keepFocus: true, noScroll: true })}
		selectable={true}
		bind:selectedIds
		onRowClick={openDetail}
		searchPlaceholder="Rechercher un prospect…"
		emptyMessage="Aucun prospect correspondant aux filtres."
		serverMode={true}
		totalCount={data.totalLeads}
		currentServerPage={data.page}
		serverSortKey={data.sort}
		serverSortAsc={data.sortAsc}
		serverSearch={data.search}
		pageSize={data.pageSize}
		onPageChange={(p) => goto(buildUrl({ page: p }), { keepFocus: true, noScroll: true })}
		onSortChange={(key, asc) => goto(buildUrl({ sort: key, dir: asc ? 'asc' : 'desc', page: 0 }), { keepFocus: true, noScroll: true })}
		onSearchChange={(q) => goto(buildUrl({ q, page: 0 }), { keepFocus: true, noScroll: true })}
	>
		{#snippet row(lead, _i)}
			{#each columns as col}
				<td class="dt-td {col.class ?? ''}">
					{#if col.key === 'score_pertinence'}
						<ScorePill score={lead.score_pertinence} compact />
					{:else if col.key === 'raison_sociale'}
						<span class="font-medium text-text truncate block" title={lead.raison_sociale}>{lead.raison_sociale}</span>
					{:else if col.key === 'canton'}
						<span class="text-text">{lead.canton ? (cantonNoms[lead.canton] ?? lead.canton) : '–'}</span>
					{:else if col.key === 'localite'}
						<span class="text-text truncate block" title={lead.localite ?? ''}>{lead.localite ?? '–'}</span>
					{:else if col.key === 'source'}
						<span class="text-text-muted text-xs">{sourceLabel(lead.source)}</span>
					{:else if col.key === 'statut'}
						<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
					{:else if col.key === 'date_import' || col.key === 'date_publication'}
						<span class="text-text-muted text-xs">{relativeDate(lead[col.key as 'date_import' | 'date_publication'])}</span>
					{:else if col.key === 'montant'}
						<span class="text-text tabular-nums">{lead.montant != null && lead.montant > 0 ? `${(lead.montant / 1000).toFixed(0)} k CHF` : '—'}</span>
					{:else if col.key === 'description'}
						<span class="text-text-body truncate block" title={lead.description ?? ''}>{lead.description ?? '—'}</span>
					{:else if col.key === 'telephone'}
						<span class="text-text">{lead.telephone ?? '—'}</span>
					{:else}
						<span class="text-text">{lead[col.key as keyof typeof lead] ?? '—'}</span>
					{/if}
				</td>
			{/each}
		{/snippet}
	</DataTable>
	</div>
	{/if}
	</div>
</div>

<!-- Lead detail slide-out -->
<LeadSlideOut bind:open={slideOutOpen} bind:lead={selectedLead} bind:importResult leads={data.leads} />

<!-- Lead express modale (F3 V2 mobile terrain) -->
<LeadExpress bind:open={leadExpressOpen} redirectAfterCreate={false} />

<!-- Modal création alerte -->
<AlerteModal bind:open={alerteModalOpen} />

<!-- Modal import sources -->
<ImportModal bind:open={importModalOpen} bind:importResult fromIntelligence={data.fromIntelligence} fromTerm={data.fromTerm} />

<!-- Modal enrichissement batch -->
<EnrichBatchModal
	bind:open={enrichBatchOpen}
	leadIds={enrichBatchIds}
	onDone={(summary) => {
		selectedIds = new Set();
		if (summary.enriched > 0) {
			importResult = {
				message: `${summary.enriched} prospect${summary.enriched > 1 ? 's' : ''} enrichi${summary.enriched > 1 ? 's' : ''}${summary.errors > 0 ? ` (${summary.errors} erreur${summary.errors > 1 ? 's' : ''})` : ''}`,
				type: summary.errors > 0 ? 'error' : 'success'
			};
		}
	}}
/>
