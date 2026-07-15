<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance, deserialize } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { SEARCH_DEBOUNCE_MS } from '$lib/utils/searchMatch';
	import type { ActionResult } from '@sveltejs/kit';
	import DataTable from '$lib/components/DataTable.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import VisitsPanel from '$lib/components/VisitsPanel.svelte';
	import PipelineQuickAdvance from '$lib/components/PipelineQuickAdvance.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import DependencyBlockModal from '$lib/components/DependencyBlockModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import {
		emptyMessageForTab,
		readPersistedView,
		persistView,
		contactCountForEntreprise,
		buildActiveStageByEntreprise,
		sourceMetaFor,
		relativeTimeFr,
		type EntreprisesTab,
		type EntreprisesView,
	} from '$lib/utils/entreprisesFormat';
	import EntreprisesIndicators from '$lib/components/entreprises/EntreprisesIndicators.svelte';
	import EntreprisesKpiStrip from '$lib/components/entreprises/EntreprisesKpiStrip.svelte';
	import EntreprisesTabs from '$lib/components/entreprises/EntreprisesTabs.svelte';
	import EntreprisesViewToggle from '$lib/components/entreprises/EntreprisesViewToggle.svelte';
	import EntreprisesCards from '$lib/components/entreprises/EntreprisesCards.svelte';
	import StagePill from '$lib/components/StagePill.svelte';
	import SourcePill from '$lib/components/SourcePill.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Entreprise = (typeof data.entreprises)[number];
	type Contact = (typeof data.contacts)[number];

	// UI state. L'onglet + la recherche + la pagination + le tri vivent dans l'URL (serveur) :
	// `activeTab` reflète `data.tab` (re-load auto sur navigation), `searchQuery` est l'état local
	// du champ (debounce → goto). La vue table/cards reste un choix client (localStorage).
	const activeTab = $derived<EntreprisesTab>(data.tab as EntreprisesTab);
	let view: EntreprisesView = $state('table');
	// svelte-ignore state_referenced_locally
	let searchQuery = $state(data.search);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let slideOutOpen = $state(false);
	let selectedEntreprise = $state<Entreprise | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let confirmDeleteOpen = $state(false);
	let enriching = $state(false);

	// REG-01 : modale « suppression bloquée » alimentée par le payload serveur
	// (contacts/opportunités rattachés) quand la garde dépendances s'active.
	let depsModalOpen = $state(false);
	let depsBlock = $state<{
		nom: string;
		contacts: { id: string; nom?: string | null; prenom?: string | null }[];
		opportunites: { id: string; titre?: string | null }[];
	}>({ nom: '', contacts: [], opportunites: [] });

	// REG-01 + I-2 : suppression en deux temps. Le 1er appel (sans `force`) ne
	// supprime jamais : le serveur renvoie soit `blocked` (contacts/opportunités
	// détachables → DependencyBlockModal), soit `needsConfirm` + le décompte des
	// données terrain effacées en cascade → ConfirmModal qui chiffre la perte. Sur
	// confirmation, on resoumet avec `force=true` (pattern fetch + deserialize, cf.
	// memory feedback_sveltekit_force_resubmit_deserialize).
	let cascadeInfo = $state<{ photos: number; visites: number; suggestions: number }>({
		photos: 0,
		visites: 0,
		suggestions: 0,
	});

	const cascadeMessage = $derived.by(() => {
		const parts: string[] = [];
		if (cascadeInfo.photos > 0) parts.push(`${cascadeInfo.photos} photo${cascadeInfo.photos > 1 ? 's' : ''}`);
		if (cascadeInfo.visites > 0) parts.push(`${cascadeInfo.visites} visite${cascadeInfo.visites > 1 ? 's' : ''} terrain`);
		if (cascadeInfo.suggestions > 0)
			parts.push(`${cascadeInfo.suggestions} suggestion${cascadeInfo.suggestions > 1 ? 's' : ''} de contact`);
		if (parts.length === 0) {
			return "Cette action est irréversible. L'entreprise sera définitivement supprimée.";
		}
		const liste = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : parts[0];
		return `Cette action est irréversible. ${liste} seront aussi définitivement supprimés avec l'entreprise.`;
	});

	async function submitDelete(force: boolean) {
		if (!selectedEntreprise) return;
		const nom = selectedEntreprise.raison_sociale;
		deleting = true;
		try {
			const fd = new FormData();
			fd.set('id', selectedEntreprise.id);
			if (force) fd.set('force', 'true');
			const res = await fetch('?/delete', {
				method: 'POST',
				body: fd,
				headers: { 'x-sveltekit-action': 'true' },
			});
			const result: ActionResult = deserialize(await res.text());

			if (result.type === 'success') {
				confirmDeleteOpen = false;
				slideOutOpen = false;
				selectedEntreprise = null;
				toasts.success('Entreprise supprimée');
				await invalidateAll();
				return;
			}
			if (result.type === 'failure') {
				const d = result.data as
					| {
							blocked?: boolean;
							needsConfirm?: boolean;
							cascade?: { photos: number; visites: number; suggestions: number };
							contacts?: { id: string; nom?: string | null; prenom?: string | null }[];
							opportunites?: { id: string; titre?: string | null }[];
							error?: string;
					  }
					| undefined;
				if (d?.blocked) {
					confirmDeleteOpen = false;
					depsBlock = { nom, contacts: d.contacts ?? [], opportunites: d.opportunites ?? [] };
					depsModalOpen = true;
				} else if (d?.needsConfirm) {
					cascadeInfo = d.cascade ?? { photos: 0, visites: 0, suggestions: 0 };
					confirmDeleteOpen = true;
				} else {
					confirmDeleteOpen = false;
					slideOutOpen = false;
					selectedEntreprise = null;
					toasts.error(d?.error ? String(d.error) : 'Erreur lors de la suppression');
				}
				return;
			}
			toasts.error('Erreur lors de la suppression');
		} catch {
			toasts.error('Erreur lors de la suppression');
		} finally {
			deleting = false;
		}
	}

	// Form fields
	let raison_sociale = $state('');
	let secteur_activite = $state('');
	let canton = $state('');
	let taille_estimee = $state('');
	let site_web = $state('');
	let numero_ide = $state('');
	let adresse_siege = $state('');
	let segment_cible = $state('');
	let source = $state('');
	let notes_libres = $state('');
	let tags = $state('');

	// Persistance vue (localStorage SSR-safe via effect)
	$effect(() => {
		view = readPersistedView(typeof window !== 'undefined' ? window.localStorage : null);
	});
	function setView(v: EntreprisesView) {
		view = v;
		persistView(typeof window !== 'undefined' ? window.localStorage : null, v);
	}

	// Refonte mobile (S190bis) : forçage vue cards en viewport < 1024px si flag ON.
	// Pattern Svelte 5 : `$effect` (jamais `onMount`/`onDestroy`) pour rester safe SSR — cf.
	// `memory/feedback_svelte5_ondestroy_ssr_window_undefined.md` (incident S189 page Signaux V4).
	let isMobileViewport = $state(false);
	$effect(() => {
		const mql = window.matchMedia('(max-width: 1023.98px)');
		const sync = () => (isMobileViewport = mql.matches);
		sync();
		mql.addEventListener('change', sync);
		return () => mql.removeEventListener('change', sync);
	});
	const forceMobileCards = $derived(
		isMobileViewport && data.featureFlags?.ffCrmMobileV2 === true,
	);
	const effectiveView = $derived<EntreprisesView>(forceMobileCards ? 'cards' : view);

	// Vague 2 « listes premium » (réversible par flag JWT). OFF → rendu actuel, zéro régression.
	const premium = $derived(data.featureFlags?.ffCrmListesV2 === true);
	// Map entreprise_id -> étape active la plus avancée (helper pur, O(n) sur les opportunités).
	const stageByEntreprise = $derived(buildActiveStageByEntreprise(data.opportunites));

	// KPI + counts d'onglet : calculés CÔTÉ SERVEUR (requêtes count séparées, sans limit), plus
	// aucun calcul sur la liste partielle de la page. `data.kpi` est un sur-ensemble :
	// EntreprisesIndicators (non-premium) lit {total, qualifiees, avecContact, sansCanton} ;
	// EntreprisesKpiStrip (premium) {total, qualifiees, affairesEnCours, sansContact}.
	const tabsSpec = $derived([
		{ key: 'toutes' as EntreprisesTab, label: 'Toutes', count: data.tabCounts.toutes },
		{ key: 'qualifiees' as EntreprisesTab, label: 'Qualifiées', count: data.tabCounts.qualifiees },
		{ key: 'a-qualifier' as EntreprisesTab, label: 'À qualifier', count: data.tabCounts['a-qualifier'] },
		{ key: 'sans-contact' as EntreprisesTab, label: 'Sans contact', count: data.tabCounts['sans-contact'] },
	]);

	// Pagination serveur. Vue table : footer fourni par DataTable. Vue cards : footer maison
	// (mirror exact du footer DataTable) piloté par `totalPages`.
	const totalPages = $derived(Math.max(1, Math.ceil((data.totalEntreprises || 0) / data.pageSize)));

	// Construit l'URL de page en mergeant des overrides sur l'état serveur courant. Seuls les
	// paramètres non-défaut sont écrits (URL propre) ; le tri par défaut (date desc) n'écrit rien.
	function buildUrl(overrides: Record<string, unknown> = {}): string {
		const params = new URLSearchParams();
		const tab = (overrides.tab as string) ?? data.tab;
		const pg = overrides.page !== undefined ? Number(overrides.page) : data.page;
		const sort = (overrides.sort as string) ?? data.sort;
		const dir = overrides.dir !== undefined ? (overrides.dir as string) : data.sortAsc ? 'asc' : 'desc';
		const qv = overrides.q !== undefined ? (overrides.q as string) : data.search;
		const perPage = overrides.perPage !== undefined ? Number(overrides.perPage) : data.pageSize;

		if (tab && tab !== 'toutes') params.set('tab', tab);
		if (pg > 0) params.set('page', String(pg));
		if (sort && sort !== 'date_derniere_modification') params.set('sort', sort);
		if (dir === 'asc') params.set('dir', 'asc');
		if (qv) params.set('q', qv);
		if (perPage !== 50) params.set('perPage', String(perPage));

		const qs = params.toString();
		return qs ? `?${qs}` : $page.url.pathname;
	}

	// Resync du champ quand data.search change côté serveur (reset, lien externe ?q=). Ne clobbe
	// pas la frappe : ne se redéclenche qu'après navigation (data.search === la valeur tapée).
	$effect(() => { searchQuery = data.search; });
	// Cleanup du timer de recherche à la destruction (clearTimeout est SSR-safe). Évite un goto
	// parasite après que l'utilisateur a quitté la page.
	$effect(() => () => { if (searchTimer) clearTimeout(searchTimer); });

	function onSearchInput(value: string) {
		searchQuery = value;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(buildUrl({ q: value, page: 0 }), { keepFocus: true, noScroll: true });
		}, SEARCH_DEBOUNCE_MS);
	}
	function selectTab(tab: EntreprisesTab) {
		// Annule une recherche debouncée en attente : sinon le goto du timer se déclencherait APRÈS
		// celui de l'onglet (double navigation / écrasement de l'onglet par la recherche en vol).
		if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
		// Changer l'URL réinvoque load() automatiquement (pas d'invalidateAll). On repart page 0.
		goto(buildUrl({ tab, page: 0 }), { keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const total = data.tabCounts.toutes;
		$pageSubtitle = total === 0 ? 'Aucune entreprise' : `${total} entreprise${total > 1 ? 's' : ''}`;
	});

	const linkedContacts = $derived(
		selectedEntreprise
			? data.contacts.filter((c: Contact) => c.entreprise_id === selectedEntreprise!.id)
			: []
	);

	type Opp = (typeof data.opportunites)[number];
	const linkedOpportunites = $derived(
		selectedEntreprise
			? data.opportunites.filter((o: Opp) => o.entreprise_id === selectedEntreprise!.id)
			: []
	);
	const activeOpportunite = $derived<Opp | null>(linkedOpportunites[0] ?? null);

	function mapsUrl(adresse: string | null): string | null {
		if (!adresse) return null;
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
	}

	function openDetail(entreprise: Entreprise) {
		selectedEntreprise = entreprise;
		slideOutOpen = true;
	}

	function openCreate() {
		editMode = false;
		resetForm();
		modalOpen = true;
	}

	function openEdit() {
		if (!selectedEntreprise) return;
		editMode = true;
		raison_sociale = selectedEntreprise.raison_sociale ?? '';
		secteur_activite = selectedEntreprise.secteur_activite ?? '';
		canton = selectedEntreprise.canton ?? '';
		taille_estimee = selectedEntreprise.taille_estimee ?? '';
		site_web = selectedEntreprise.site_web ?? '';
		numero_ide = selectedEntreprise.numero_ide ?? '';
		adresse_siege = selectedEntreprise.adresse_siege ?? '';
		segment_cible = selectedEntreprise.segment_cible ?? '';
		source = selectedEntreprise.source ?? '';
		notes_libres = selectedEntreprise.notes_libres ?? '';
		tags = selectedEntreprise.tags ?? '';
		slideOutOpen = false;
		modalOpen = true;
	}

	function resetForm() {
		raison_sociale = '';
		secteur_activite = '';
		canton = '';
		taille_estimee = '';
		site_web = '';
		numero_ide = '';
		adresse_siege = '';
		segment_cible = '';
		source = '';
		notes_libres = '';
		tags = '';
	}

	function statutBadgeVariant(statut: string | null): 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'qualifie':
				return 'success';
			case 'en_cours':
				return 'info';
			case 'nouveau':
				return 'warning';
			default:
				return 'muted';
		}
	}

	function statutLabel(statut: string | null): string {
		switch (statut) {
			case 'qualifie':
				return 'Qualifiée';
			case 'en_cours':
				return 'En cours';
			case 'nouveau':
				return 'Nouveau';
			default:
				return 'À qualifier';
		}
	}

	function rowAriaLabelFor(e: Entreprise): string {
		const cc = contactCountForEntreprise(e.id, data.contacts);
		const sec = e.secteur_activite ?? 'secteur non renseigné';
		const cant = e.canton ?? 'canton non renseigné';
		return `${e.raison_sociale}, ${sec}, ${cant}, ${cc} contact${cc > 1 ? 's' : ''}, statut ${statutLabel(e.statut_qualification)}`;
	}

	const columns = [
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true, class: 'w-[30%]' },
		{ key: 'secteur_activite', label: 'Secteur', sortable: true, class: 'w-[24%] hidden md:table-cell' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[10%] hidden md:table-cell' },
		{ key: 'contacts', label: 'Contacts', class: 'w-[12%] hidden lg:table-cell' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[14%]' },
	];

	// Vague 2 : colonnes de la ligne riche (logo + identité + signaux). Le nb de colonnes
	// DOIT égaler le nb de <td> du snippet premium (sticky/alignement DataTable).
	const premiumColumns = [
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true, class: 'w-[30%]' },
		{ key: 'localisation', label: 'Localisation', class: 'w-[13%] hidden md:table-cell' },
		{ key: 'contacts', label: 'Contacts', class: 'w-[10%] hidden lg:table-cell' },
		{ key: 'pipeline', label: 'Pipeline', class: 'w-[15%] hidden md:table-cell' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[13%]' },
		{ key: 'source', label: 'Source · activité', srLabel: 'Source et activité', class: 'w-[16%] hidden lg:table-cell' },
		{ key: 'chevron', label: '', srLabel: 'Ouvrir', class: 'w-10' },
	];
</script>

<div class="ws-page">
	<div class="ws-page-actions">
		<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
			<Icon name="add" size={18} />
			Ajouter
		</button>
	</div>

	{#if premium}
		<EntreprisesKpiStrip values={data.kpi} />
	{:else}
		<EntreprisesIndicators values={data.kpi} />
	{/if}

	<EntreprisesTabs active={activeTab} tabs={tabsSpec} onSelect={selectTab}>
		{#snippet actions()}
			<div class="search">
				<SearchInput
					value={searchQuery}
					oninput={onSearchInput}
					placeholder="Rechercher une entreprise…"
					ariaLabel="Rechercher une entreprise"
				/>
			</div>
			{#if !forceMobileCards}
				<EntreprisesViewToggle {view} onChange={setView} />
			{/if}
		{/snippet}
	</EntreprisesTabs>

	<div
		class="ws-content"
		role="tabpanel"
		id={`panel-${activeTab}`}
		aria-labelledby={`tab-${activeTab}`}
	>
		{#if data.tabCounts.toutes === 0}
			<EmptyState
				icon="business"
				title="Aucune entreprise"
				description="Les entreprises apparaissent ici automatiquement quand vous les rattachez à un contact, ou ajoutez-en une manuellement."
				actionLabel="Ajouter une entreprise"
				onAction={openCreate}
			/>
		{:else if effectiveView === 'table'}
			<DataTable
				data={data.entreprises}
				columns={premium ? premiumColumns : columns}
				onRowClick={openDetail}
				searchable={false}
				stickyLeftCols={2}
				rowAriaLabel={rowAriaLabelFor}
				emptyMessage={data.search ? `Aucun résultat pour « ${data.search} »` : emptyMessageForTab(activeTab)}
				serverMode={true}
				totalCount={data.totalEntreprises}
				currentServerPage={data.page}
				serverSortKey={data.sort}
				serverSortAsc={data.sortAsc}
				pageSize={data.pageSize}
				pageSizeOptions={[25, 50, 100]}
				onPageChange={(p) => goto(buildUrl({ page: p }), { keepFocus: true, noScroll: true })}
				onSortChange={(key, asc) => goto(buildUrl({ sort: key, dir: asc ? 'asc' : 'desc', page: 0 }), { keepFocus: true, noScroll: true })}
				onPageSizeChange={(s) => goto(buildUrl({ perPage: s, page: 0 }), { keepFocus: true, noScroll: true })}
			>
				{#snippet row(entreprise, _i)}
					{@const cc = contactCountForEntreprise(entreprise.id, data.contacts)}
					{#if premium}
						{@const stage = stageByEntreprise.get(entreprise.id)}
						{@const src = sourceMetaFor(entreprise.source)}
						{@const activite = relativeTimeFr(entreprise.date_derniere_modification)}
						<td class="px-4 py-3">
							<!-- Avatar + nom dans la MÊME cellule (gap 8px stable), au lieu d'une colonne
							     logo séparée dont l'espacement dépendait de la distribution table-fixed. -->
							<div class="crm-id">
								<span class="logo-cell logo-cell--lg logo-cell--placeholder">{entreprise.raison_sociale[0]?.toUpperCase() ?? '?'}</span>
								<div style="min-width:0">
									<div class="crm-name">{entreprise.raison_sociale}</div>
									{#if entreprise.secteur_activite}<div class="crm-sec">{entreprise.secteur_activite}</div>{/if}
								</div>
							</div>
						</td>
						<td class="px-4 py-3 hidden md:table-cell">
							{#if entreprise.canton}
								<span class="crm-loc"><Icon name="location_on" size={13} />{entreprise.canton}</span>
							{:else}
								<span class="crm-muted">Canton ?</span>
							{/if}
						</td>
						<td class="px-4 py-3 hidden lg:table-cell">
							<span class="crm-contacts" class:zero={cc === 0}><Icon name="people" size={13} />{cc}</span>
						</td>
						<td class="px-4 py-3 hidden md:table-cell">
							{#if stage}
								<StagePill label={stage.label} variant={stage.variant} />
							{:else}
								<span class="crm-muted">Pas d'affaire</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<Badge label={statutLabel(entreprise.statut_qualification)} variant={statutBadgeVariant(entreprise.statut_qualification)} />
						</td>
						<td class="px-4 py-3 hidden lg:table-cell">
							<span class="crm-srcline">
								{#if src}<SourcePill label={src.label} variant={src.variant} />{/if}
								{#if activite}<span class="crm-activity">{activite}</span>{/if}
							</span>
						</td>
						<td class="px-4 py-3 crm-chev-cell"><Icon name="chevron_right" size={18} /></td>
					{:else}
						<td class="px-4 py-3">
							<div class="crm-id">
								<span class="logo-cell logo-cell--placeholder">{entreprise.raison_sociale[0]?.toUpperCase() ?? '?'}</span>
								<span class="font-semibold text-text">{entreprise.raison_sociale}</span>
							</div>
						</td>
						<td class="px-4 py-3 text-text-muted hidden md:table-cell">{entreprise.secteur_activite ?? '–'}</td>
						<td class="px-4 py-3 text-text hidden md:table-cell">{entreprise.canton ?? '–'}</td>
						<td class="px-4 py-3 text-text tabular-nums hidden lg:table-cell">{cc}</td>
						<td class="px-4 py-3">
							<Badge label={statutLabel(entreprise.statut_qualification)} variant={statutBadgeVariant(entreprise.statut_qualification)} />
						</td>
					{/if}
				{/snippet}
			</DataTable>
		{:else}
			<EntreprisesCards
				entreprises={data.entreprises}
				contacts={data.contacts}
				onSelect={openDetail}
				stageByEntreprise={premium ? stageByEntreprise : undefined}
				emptyMessage={data.search ? `Aucun résultat pour « ${data.search} »` : emptyMessageForTab(activeTab)}
			/>
			<!-- Pagination serveur en vue cards (mirror du footer DataTable : mêmes classes/markup). -->
			{#if totalPages > 1 || data.totalEntreprises > 0}
				<div class="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-text-muted shrink-0 gap-2 flex-wrap">
					<div class="flex items-center gap-3">
						<span>{data.totalEntreprises} résultat{data.totalEntreprises > 1 ? 's' : ''}</span>
						<label class="flex items-center gap-2 text-xs">
							<span class="hidden md:inline">Afficher</span>
							<select
								class="h-8 px-2 border border-[var(--color-border-input)] rounded-md bg-white text-text cursor-pointer text-xs"
								value={data.pageSize}
								onchange={(e) => goto(buildUrl({ perPage: Number((e.target as HTMLSelectElement).value), page: 0 }), { keepFocus: true, noScroll: true })}
								aria-label="Nombre d'entrées par page"
							>
								{#each [25, 50, 100] as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
							<span class="hidden md:inline">par page</span>
						</label>
					</div>
					{#if totalPages > 1}
						<div class="flex items-center gap-2">
							<button
								class="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
								disabled={data.page === 0}
								onclick={() => goto(buildUrl({ page: data.page - 1 }), { keepFocus: true, noScroll: true })}
								aria-label="Page précédente"
							>
								<Icon name="arrow_back" size={18} />
							</button>
							<span>{data.page + 1} / {totalPages}</span>
							<button
								class="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
								disabled={data.page >= totalPages - 1}
								onclick={() => goto(buildUrl({ page: data.page + 1 }), { keepFocus: true, noScroll: true })}
								aria-label="Page suivante"
							>
								<Icon name="arrow_forward" size={18} />
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<button
	type="button"
	class="ws-fab"
	aria-label="Ajouter une entreprise"
	onclick={openCreate}
>
	<Icon name="add" size={20} />
</button>

<!-- SlideOut détail entreprise -->
<SlideOut bind:open={slideOutOpen} title={selectedEntreprise?.raison_sociale ?? ''}>
	{#if selectedEntreprise}
		{@const fStage = stageByEntreprise.get(selectedEntreprise.id)}
		{@const fSrc = sourceMetaFor(selectedEntreprise.source)}
		{@const fActivite = relativeTimeFr(selectedEntreprise.date_derniere_modification)}
		<div class="space-y-6">
			<!-- En-tête avec initiales -->
			<div class="flex items-center gap-4">
				<span class="flex items-center justify-center w-16 h-16 rounded-lg bg-primary-light text-primary font-bold text-2xl">
					{selectedEntreprise.raison_sociale[0]?.toUpperCase() ?? '?'}
				</span>
				{#if premium}
					<div class="min-w-0">
						<p class="font-semibold text-lg text-text">{selectedEntreprise.raison_sociale}</p>
						<div class="flex flex-wrap items-center gap-2 mt-1.5">
							<Badge label={statutLabel(selectedEntreprise.statut_qualification)} variant={statutBadgeVariant(selectedEntreprise.statut_qualification)} />
							{#if fStage}<StagePill label={fStage.label} variant={fStage.variant} />{/if}
							{#if fSrc}<SourcePill label={fSrc.label} variant={fSrc.variant} />{/if}
						</div>
						{#if fActivite}<p class="text-xs text-text-muted mt-2">Dernière activité : {fActivite}</p>{/if}
					</div>
				{:else}
					<div>
						<p class="font-semibold text-lg text-text">{selectedEntreprise.raison_sociale}</p>
						<Badge label={statutLabel(selectedEntreprise.statut_qualification)} variant={statutBadgeVariant(selectedEntreprise.statut_qualification)} />
					</div>
				{/if}
			</div>

			{#if premium}
				<div class="crm-facts">
					<div class="crm-fact">
						<div class="crm-fact-k">Secteur</div>
						<div class="crm-fact-v">{selectedEntreprise.secteur_activite ?? '–'}</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Canton</div>
						<div class="crm-fact-v">{selectedEntreprise.canton ?? '–'}</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">Taille</div>
						<div class="crm-fact-v">{selectedEntreprise.taille_estimee ?? '–'}</div>
					</div>
					<div class="crm-fact">
						<div class="crm-fact-k">No IDE</div>
						<div class="crm-fact-v">{selectedEntreprise.numero_ide ?? '–'}</div>
					</div>
					{#if selectedEntreprise.adresse_siege}
						{@const maps = mapsUrl(selectedEntreprise.adresse_siege)}
						<div class="crm-fact crm-fact--wide">
							<div class="crm-fact-k">Adresse</div>
							<div class="crm-fact-v">
								{selectedEntreprise.adresse_siege}
								{#if maps}
									<a href={maps} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 ml-1.5">
										<Icon name="map" size={13} />Voir sur la carte
									</a>
								{/if}
							</div>
						</div>
					{/if}
					{#if selectedEntreprise.site_web}
						<div class="crm-fact crm-fact--wide">
							<div class="crm-fact-k">Site web</div>
							<div class="crm-fact-v"><a href={selectedEntreprise.site_web} target="_blank" rel="noopener noreferrer">{selectedEntreprise.site_web}</a></div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Secteur</span>
						<p class="font-medium text-text">{selectedEntreprise.secteur_activite ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Canton</span>
						<p class="font-medium text-text">{selectedEntreprise.canton ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Taille</span>
						<p class="font-medium text-text">{selectedEntreprise.taille_estimee ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">IDE</span>
						<p class="font-medium text-text">{selectedEntreprise.numero_ide ?? '–'}</p>
					</div>
				</div>

				{#if selectedEntreprise.adresse_siege}
					{@const maps = mapsUrl(selectedEntreprise.adresse_siege)}
					<div class="text-sm">
						<span class="text-text-muted">Adresse</span>
						<p class="font-medium text-text">{selectedEntreprise.adresse_siege}</p>
						{#if maps}
							<a href={maps} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
								<Icon name="map" size={14} />
								Voir sur Google Maps
							</a>
						{/if}
					</div>
				{/if}

				{#if selectedEntreprise.site_web}
					<div class="text-sm">
						<span class="text-text-muted">Site web</span>
						<p><a href={selectedEntreprise.site_web} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">{selectedEntreprise.site_web}</a></p>
					</div>
				{/if}
			{/if}

			{#if selectedEntreprise.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Description / Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedEntreprise.notes_libres}</p>
				</div>
			{/if}

			<!-- Pipeline rapide (V2 mobile F4) -->
			<div class="border-t border-border pt-4">
				{#if activeOpportunite}
					<PipelineQuickAdvance opp={activeOpportunite} />
				{:else}
					<div class="rounded-xl border border-border bg-white p-4 flex items-center justify-between gap-3">
						<div>
							<p class="text-xs uppercase tracking-wide text-text-muted font-semibold">Pipeline</p>
							<p class="text-sm text-text-muted mt-0.5">Aucune opportunité pour cette entreprise.</p>
						</div>
						<a
							href="/crm/pipeline"
							class="h-10 inline-flex items-center gap-2 px-3 box-border text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary-light transition-colors whitespace-nowrap"
						>
							<Icon name="add_circle" size={16} />
							<span>Créer</span>
						</a>
					</div>
				{/if}
			</div>

			<!-- Photos chantier (V2 mobile F1) -->
			<div class="border-t border-border pt-4">
				<PhotoGallery entrepriseId={selectedEntreprise.id} />
			</div>

			<!-- Visites terrain (V2 mobile F2) -->
			<div class="border-t border-border pt-4">
				<VisitsPanel entrepriseId={selectedEntreprise.id} timeline={premium} />
			</div>

			<!-- Contacts rattachés -->
			<div class="border-t border-border pt-4">
				<h3 class="text-sm font-semibold text-text mb-3">
					Contacts rattachés ({linkedContacts.length})
				</h3>
				{#if linkedContacts.length > 0}
					<div class="space-y-2">
						{#each linkedContacts as contact}
							<div class="flex items-center justify-between p-2 rounded-lg bg-surface text-sm">
								<div>
									<span class="font-medium text-text">{contact.prenom} {contact.nom}</span>
									{#if contact.role_fonction}
										<span class="text-text-muted"> : {contact.role_fonction}</span>
									{/if}
								</div>
								<a href="/crm/contacts" class="text-primary text-xs hover:underline">Voir</a>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-text-muted">Aucun contact rattaché.</p>
				{/if}
			</div>

			<div class="flex flex-wrap gap-3 pt-4 border-t border-border">
				<button
					onclick={openEdit}
					class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
				>
					<Icon name="edit" size={16} />
					Modifier
				</button>

				<!-- Enrichir via Zefix -->
				<form method="POST" action="?/enrichir" use:enhance={() => {
					enriching = true;
					return async ({ result, update }) => {
						enriching = false;
						if (result.type === 'success') {
							toasts.success('Entreprise enrichie via Zefix');
							slideOutOpen = false;
							selectedEntreprise = null;
						} else {
							const msg = result.type === 'failure' && result.data?.error ? String(result.data.error) : 'Erreur Zefix';
							toasts.error(msg);
						}
						await update();
					};
				}}>
					<input type="hidden" name="id" value={selectedEntreprise.id} />
					<input type="hidden" name="raison_sociale" value={selectedEntreprise.raison_sociale} />
					<button
						type="submit"
						disabled={enriching}
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-medium text-primary bg-primary-light hover:bg-primary/20 rounded-lg cursor-pointer disabled:opacity-50"
					>
						<Icon name="auto_awesome" size={16} />
						{enriching ? 'Enrichissement…' : 'Enrichir via Zefix'}
					</button>
				</form>

				<button
					type="button"
					onclick={() => submitDelete(false)}
					disabled={deleting}
					class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-danger-deep hover:bg-danger/5 rounded-lg cursor-pointer disabled:opacity-50"
				>
					<Icon name="delete" size={16} />
					{deleting ? 'Suppression…' : 'Supprimer'}
				</button>
			</div>
		</div>
	{/if}
</SlideOut>

<!-- Modal création/édition -->
<ModalForm
	bind:open={modalOpen}
	title={editMode ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
	{saving}
>
	<form
		method="POST"
		action={editMode ? '?/update' : '?/create'}
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
				if (result.type === 'success') toasts.success(editMode ? 'Entreprise modifiée' : 'Entreprise créée');
				else toasts.error('Erreur lors de l\'enregistrement');
				await update();
			};
		}}
	>
		{#if editMode && selectedEntreprise}
			<input type="hidden" name="id" value={selectedEntreprise.id} />
		{/if}

		<div class="space-y-4">
			<FormField label="Raison sociale" bind:value={raison_sociale} required />
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Secteur d'activité" bind:value={secteur_activite} />
				<CantonSelect bind:value={canton} />
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Taille estimée" bind:value={taille_estimee} placeholder="Micro, PME, Grande…" />
				<FormField label="Site web" type="url" bind:value={site_web} />
			</div>
			<FormField label="Adresse siège" bind:value={adresse_siege} placeholder="Rue, NPA, Ville" />
		</div>

		<input type="hidden" name="raison_sociale" value={raison_sociale} />
		<input type="hidden" name="secteur_activite" value={secteur_activite} />
		<input type="hidden" name="canton" value={canton} />
		<input type="hidden" name="taille_estimee" value={taille_estimee} />
		<input type="hidden" name="site_web" value={site_web} />
		<input type="hidden" name="numero_ide" value={numero_ide} />
		<input type="hidden" name="adresse_siege" value={adresse_siege} />
		<input type="hidden" name="segment_cible" value={segment_cible} />
		<input type="hidden" name="source" value={source} />
		<input type="hidden" name="notes_libres" value={notes_libres} />
		<input type="hidden" name="tags" value={tags} />

		<div class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				onclick={() => modalOpen = false}
				class="h-11 px-4 box-border text-sm text-text-muted hover:text-text rounded-lg cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving}
				class="h-11 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 cursor-pointer"
			>
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Supprimer cette entreprise ?"
	message={cascadeMessage}
	confirmLabel="Supprimer"
	variant="danger"
	loading={deleting}
	onConfirm={() => submitDelete(true)}
/>

<DependencyBlockModal
	bind:open={depsModalOpen}
	entrepriseNom={depsBlock.nom}
	contacts={depsBlock.contacts}
	opportunites={depsBlock.opportunites}
/>

<style>
	/* Search input dans tabs-actions */
	.search {
		width: 256px;
	}

	/* Logo cell dans table view */
	:global(.logo-cell) {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border);
		display: block;
	}
	:global(.logo-cell--placeholder) {
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 13px;
	}

	/* Vague 2 : agrandit le logo de la ligne premium (spécifique entreprise).
	   Les primitives partagées .crm-* vivent dans app.css (cascade multi-pages). */
	:global(.logo-cell--lg) {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		font-size: 15px;
	}

	@media (max-width: 1024px) {
		.search {
			width: 200px;
		}
	}
	@media (max-width: 768px) {
		.search {
			flex: 1;
			width: auto;
		}
	}
</style>
