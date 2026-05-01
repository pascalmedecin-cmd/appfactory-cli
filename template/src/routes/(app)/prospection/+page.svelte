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
	import {
		cantonNoms,
		statutLabel, statutBadgeVariant, sourceLabel, relativeDate,
		sourceOptions, cantonOptions, temperatureOptions, statutOptions,
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

		if (pg > 0) params.set('page', String(pg));
		if (sort !== 'score_pertinence') params.set('sort', sort);
		if (dir === 'asc') params.set('dir', 'asc');
		if (q) params.set('q', q);
		sources.forEach(s => params.append('source', s));
		cantons.forEach(c => params.append('canton', c));
		statuts.forEach(s => params.append('statut', s));
		temps.forEach(t => params.append('temp', t));
		if (showTr) params.set('showTransferred', '1');

		const qs = params.toString();
		return qs ? `?${qs}` : $page.url.pathname;
	}

	function applyFilters() {
		goto(buildUrl({ page: 0 }), { invalidateAll: true, keepFocus: true });
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

	const columns = [
		// Phase 0 : "Température" → "Priorité" (terme commercial direct, cohérent pill sémantique).
		{ key: 'score_pertinence', label: 'Priorité', shortLabel: 'Prio.', sortable: true, class: 'w-[28%] md:w-[10%]' },
		// Phase 0 : header vide pour la 1re colonne contenu (pattern Linear / Stripe Dashboard).
		{ key: 'raison_sociale', label: '', sortable: true, class: 'w-[42%] md:w-[20%]' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[8%] hidden md:table-cell' },
		{ key: 'localite', label: 'Localité', sortable: true, class: 'w-[17%] hidden lg:table-cell' },
		{ key: 'source', label: 'Source', sortable: true, class: 'w-[19%] hidden lg:table-cell' },
		{ key: 'statut', label: 'Statut', sortable: true, class: 'w-[30%] md:w-[13%]' },
		{ key: 'date_import', label: 'Ajouté', sortable: true, class: 'w-[10%] hidden lg:table-cell' },
	];

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

<div class="flex flex-col gap-3 md:gap-5 h-[calc(100dvh-var(--header-height)-3rem)]">
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
				<span>Importer<span class="hidden sm:inline"> des prospects</span></span>
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
	{#if data.totalLeads === 0 && activeFilterCount === 0}
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
	<DataTable
		data={data.leads}
		{columns}
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
		onPageChange={(p) => goto(buildUrl({ page: p }), { invalidateAll: true, keepFocus: true })}
		onSortChange={(key, asc) => goto(buildUrl({ sort: key, dir: asc ? 'asc' : 'desc', page: 0 }), { invalidateAll: true, keepFocus: true })}
		onSearchChange={(q) => goto(buildUrl({ q, page: 0 }), { invalidateAll: true, keepFocus: true })}
	>
		{#snippet row(lead, _i)}
			<td class="px-4 py-3 w-[28%] md:w-[10%] overflow-hidden">
				<ScorePill score={lead.score_pertinence} compact />
			</td>
			<td class="px-4 py-3 font-medium text-text w-[42%] md:w-[20%] truncate" title={lead.raison_sociale}>{lead.raison_sociale}</td>
			<td class="px-4 py-3 text-text w-[8%] hidden md:table-cell">{lead.canton ? `${cantonNoms[lead.canton] ?? lead.canton}` : '–'}</td>
			<td class="px-4 py-3 text-text w-[17%] truncate hidden lg:table-cell" title={lead.localite ?? ''}>{lead.localite ?? '–'}</td>
			<td class="px-4 py-3 text-text-muted text-xs w-[19%] truncate hidden lg:table-cell">{sourceLabel(lead.source)}</td>
			<td class="px-4 py-3 w-[30%] md:w-[13%] overflow-hidden">
				<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
			</td>
			<td class="px-4 py-3 text-text-muted text-xs w-[10%] hidden lg:table-cell">{relativeDate(lead.date_import)}</td>
		{/snippet}
	</DataTable>
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
