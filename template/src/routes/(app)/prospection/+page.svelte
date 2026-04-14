<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import Badge from '$lib/components/Badge.svelte';
	import ImportModal from '$lib/components/prospection/ImportModal.svelte';
	import LeadSlideOut from '$lib/components/prospection/LeadSlideOut.svelte';
	import EnrichBatchModal from '$lib/components/prospection/EnrichBatchModal.svelte';
	import AlerteModal from '$lib/components/prospection/AlerteModal.svelte';
	import BatchActionsBar from '$lib/components/prospection/BatchActionsBar.svelte';
	import RecherchesPanel from '$lib/components/prospection/RecherchesPanel.svelte';
	import MultiSelectDropdown from '$lib/components/MultiSelectDropdown.svelte';
	import {
		cantonNoms, scoreLabel, scoreBadgeVariant,
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
	let enrichBatchOpen = $state(false);
	let enrichBatchIds = $state<string[]>([]);
	let alerteModalOpen = $state(false);
	let recherchesOpen = $state(false);

	// Filtres synchronisés avec les URL params du serveur
	let filterSources = $state<string[]>(data.filters.sources);
	let filterCantons = $state<string[]>(data.filters.cantons);
	let filterStatuts = $state<string[]>(data.filters.statuts);
	let filterTemperatures = $state<string[]>(data.filters.temperatures);

	const activeFilterCount = $derived(
		(filterStatuts.length > 0 ? 1 : 0) +
		(filterTemperatures.length > 0 ? 1 : 0) +
		(filterCantons.length > 0 ? 1 : 0) +
		(filterSources.length > 0 ? 1 : 0)
	);

	function buildUrl(overrides: Record<string, string | string[] | number | undefined> = {}) {
		const params = new URLSearchParams();
		const sources = overrides.source !== undefined ? overrides.source as string[] : filterSources;
		const cantons = overrides.canton !== undefined ? overrides.canton as string[] : filterCantons;
		const statuts = overrides.statut !== undefined ? overrides.statut as string[] : filterStatuts;
		const temps = overrides.temp !== undefined ? overrides.temp as string[] : filterTemperatures;
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
		filterSources; filterCantons; filterStatuts; filterTemperatures;
		if (!filterMounted) { filterMounted = true; return; }
		if (filterDebounce) clearTimeout(filterDebounce);
		filterDebounce = setTimeout(() => applyFilters(), 200);
	});

	const columns = [
		{ key: 'score_pertinence', label: 'Température', sortable: true, class: 'w-[9%]' },
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true, class: 'w-[20%]' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[8%]' },
		{ key: 'localite', label: 'Localité', sortable: true, class: 'w-[17%]' },
		{ key: 'source', label: 'Source', sortable: true, class: 'w-[20%]' },
		{ key: 'statut', label: 'Statut', sortable: true, class: 'w-[13%]' },
		{ key: 'date_import', label: 'Ajouté', sortable: true, class: 'w-[10%]' },
	];

	function openDetail(lead: Lead) {
		selectedLead = lead;
		slideOutOpen = true;
	}

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
	}
</script>

<div class="flex flex-col gap-5 h-[calc(100dvh-var(--header-height)-3rem)]">
	<!-- Workflow 4 étapes -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="flex items-start gap-3 px-4 py-4 rounded-xl shadow-xs bg-prosp-import-bg" style="border: 1px solid color-mix(in srgb, var(--color-prosp-import-border), transparent 85%)">
			<span class="material-symbols-outlined text-[24px] mt-0.5 text-prosp-import">cloud_download</span>
			<div>
				<span class="text-[15px] font-semibold text-text">Importer</span>
				<p class="text-xs font-medium mt-0.5 text-prosp-import">{data.totalLeads} prospect{data.totalLeads > 1 ? 's' : ''}</p>
			</div>
		</div>
		<div class="flex items-start gap-3 px-4 py-4 rounded-xl shadow-xs bg-prosp-enrich-bg" style="border: 1px solid color-mix(in srgb, var(--color-prosp-enrich-border), transparent 85%)">
			<span class="material-symbols-outlined text-[24px] mt-0.5 text-prosp-enrich">auto_fix_high</span>
			<div>
				<span class="text-[15px] font-semibold text-text">Enrichir</span>
				<p class="text-xs font-medium mt-0.5 text-prosp-enrich">{data.enrichedCount} enrichi{data.enrichedCount > 1 ? 's' : ''}</p>
			</div>
		</div>
		<div class="flex items-start gap-3 px-4 py-4 rounded-xl shadow-xs bg-prosp-qualify-bg" style="border: 1px solid color-mix(in srgb, var(--color-prosp-qualify-border), transparent 85%)">
			<span class="material-symbols-outlined text-[24px] mt-0.5 text-prosp-qualify">filter_list</span>
			<div>
				<span class="text-[15px] font-semibold text-text">Qualifier</span>
				<p class="text-xs font-medium mt-0.5 text-prosp-qualify">{data.qualifiedCount} qualifié{data.qualifiedCount > 1 ? 's' : ''}</p>
			</div>
		</div>
		<div class="flex items-start gap-3 px-4 py-4 rounded-xl shadow-xs bg-prosp-convert-bg" style="border: 1px solid color-mix(in srgb, var(--color-prosp-convert-border), transparent 85%)">
			<span class="material-symbols-outlined text-[24px] mt-0.5 text-prosp-convert">domain_add</span>
			<div>
				<span class="text-[15px] font-semibold text-text">Convertir</span>
				<p class="text-xs font-medium mt-0.5 text-prosp-convert">{data.convertedCount} converti{data.convertedCount > 1 ? 's' : ''}</p>
			</div>
		</div>
	</div>

	<!-- Actions principales -->
	{#if data.totalLeads > 0}
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			{#if data.recherches.length > 0}
				<button
					onclick={() => recherchesOpen = !recherchesOpen}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors"
				>
					<span class="material-symbols-outlined text-[18px]">bookmarks</span>
					<span class="hidden sm:inline">Mes recherches</span>
					<span class="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-accent/10 text-accent">{data.recherches.length}</span>
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => { enrichBatchIds = data.leads.filter(l => l.statut !== 'transfere').map(l => l.id); enrichBatchOpen = true; }}
				class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg cursor-pointer transition-colors text-prosp-enrich border-prosp-enrich/20"
				disabled={data.leads.filter(l => l.statut !== 'transfere').length === 0}
				title="Enrichit uniquement les {data.leads.filter(l => l.statut !== 'transfere').length} leads de cette page"
			>
				<span class="material-symbols-outlined text-[18px]">auto_fix_high</span>
				<span class="hidden sm:inline">Enrichir cette page</span>
				<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-prosp-enrich/10 text-prosp-enrich">{data.leads.filter(l => l.statut !== 'transfere').length}</span>
			</button>
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg cursor-pointer shadow-md transition-colors"
			>
				<span class="material-symbols-outlined text-[18px]">cloud_download</span>
				Importer des prospects
			</button>
		</div>
	</div>
	{/if}

	<!-- Filtres -->
	<div class="rounded-xl border border-border bg-white shadow-xs">
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3">
			<MultiSelectDropdown bind:selected={filterStatuts} options={statutOptions} icon="checklist" label="Statut" tooltip="Filtrer par statut de traitement" />
			<MultiSelectDropdown bind:selected={filterTemperatures} options={temperatureOptions} icon="thermostat" label="Température" tooltip="Niveau d'intérêt estimé du prospect" />
			<MultiSelectDropdown bind:selected={filterCantons} options={cantonOptions} icon="location_on" label="Canton" tooltip="Zones géographiques" />
			<MultiSelectDropdown bind:selected={filterSources} options={sourceOptions} icon="database" label="Source" tooltip="Registres et bases de données" />
		</div>
		<div class="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0">
			<div class="flex items-center gap-2 ml-auto">
				{#if activeFilterCount > 0}
					<span class="text-xs text-text-muted">{data.totalLeads} résultat{data.totalLeads > 1 ? 's' : ''}</span>
					<button onclick={resetFilters} class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-danger cursor-pointer transition-colors">
						<span class="material-symbols-outlined text-[14px]">close</span>
						Réinitialiser
					</button>
				{/if}
				<button
					onclick={() => alerteModalOpen = true}
					class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5 cursor-pointer transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">notifications_active</span>
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
				<span class="material-symbols-outlined text-[18px]">{importResult.type === 'success' ? 'check_circle' : 'error'}</span>
				<span class="text-sm font-medium">{importResult.message}</span>
			</div>
			<button onclick={() => importResult = null} class="text-sm opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Barre actions batch -->
	<BatchActionsBar bind:selectedIds bind:enrichBatchIds bind:enrichBatchOpen />

	<div class="flex-1 min-h-0 flex flex-col">
	{#if data.totalLeads === 0 && activeFilterCount === 0}
		<div class="flex flex-col items-center justify-center py-16 px-6">
			<div class="flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style="background: linear-gradient(135deg, var(--color-prosp-import-bg), var(--color-prosp-enrich-bg))">
				<span class="material-symbols-outlined text-[32px] text-prosp-import">search</span>
			</div>
			<h3 class="text-lg font-semibold text-text mb-2">Trouvez vos premiers prospects</h3>
			<p class="text-sm text-text-muted text-center max-w-lg mb-6">
				Importez des entreprises depuis les sources publiques suisses (registre du commerce, marchés publics, registre des bâtiments). Qualifiez-les, puis convertissez les plus pertinentes en entreprises dans votre CRM.
			</p>
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg cursor-pointer shadow-md transition-colors"
			>
				<span class="material-symbols-outlined text-[18px]">cloud_download</span>
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
			<td class="px-4 py-2.5 w-[9%]">
				<Badge label={scoreLabel(lead.score_pertinence ?? 0)} variant={scoreBadgeVariant(lead.score_pertinence ?? 0)} dot={true} />
			</td>
			<td class="px-4 py-2.5 font-medium text-text w-[20%] truncate" title={lead.raison_sociale}>{lead.raison_sociale}</td>
			<td class="px-4 py-2.5 text-text w-[8%]">{lead.canton ? `${cantonNoms[lead.canton] ?? lead.canton}` : '—'}</td>
			<td class="px-4 py-2.5 text-text w-[17%] truncate" title={lead.localite ?? ''}>{lead.localite ?? '—'}</td>
			<td class="px-4 py-2.5 text-text-muted text-xs w-[20%] truncate">{sourceLabel(lead.source)}</td>
			<td class="px-4 py-2.5 w-[13%]">
				<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
			</td>
			<td class="px-4 py-2.5 text-text-muted text-xs w-[10%]">{relativeDate(lead.date_import)}</td>
		{/snippet}
	</DataTable>
	{/if}
	</div>
</div>

<!-- Lead detail slide-out -->
<LeadSlideOut bind:open={slideOutOpen} bind:lead={selectedLead} bind:importResult leads={data.leads} />

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
