<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Select from '$lib/components/Select.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import {
		signauxIndicators,
		signauxCountsByTab,
		filterSignauxByTab,
		emptyMessageForTab,
		formatTypeLabel,
		typeIcon,
		formatDate,
		formatRelative,
		scoreStyle,
		statutLabel,
		statutVariant,
		clampDisplayScore,
		type SignauxTab,
	} from '$lib/utils/signauxFormat';
	import SignauxIndicators from '$lib/components/signaux/SignauxIndicators.svelte';
	import SignauxTabs from '$lib/components/signaux/SignauxTabs.svelte';
	import SignauxCards from '$lib/components/signaux/SignauxCards.svelte';
	import SignauxKeywordsPanel from '$lib/components/signaux/SignauxKeywordsPanel.svelte';
	import { KW_SEARCH_MIN_LEN } from '$lib/scoring/keywords';
	import { normalizeNFD } from '$lib/utils/text-normalize';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { matchesAnyField, SEARCH_DEBOUNCE_MS } from '$lib/utils/searchMatch';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Signal = (typeof data.signaux)[number];

	// UI state — V4 (S189) : tab défaut "nouveau" (= inbox métier). L'onglet "Tous"
	// est retiré : la page commence sur ce que l'utilisateur DOIT trier, pas sur
	// l'intégralité d'un dataset croissant qui dilue l'attention.
	let activeTab: SignauxTab = $state('nouveau');
	let slideOutOpen = $state(false);
	let selectedSignal = $state<Signal | null>(null);
	let modalOpen = $state(false);
	let saving = $state(false);
	let convertModalOpen = $state(false);
	let confirmDeleteOpen = $state(false);
	let deleting = $state(false);
	let deleteFormEl: HTMLFormElement | null = $state(null);
	let selectMode = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
	let batchDeleting = $state(false);
	let batchDeleteConfirmOpen = $state(false);
	let batchDeleteFormEl: HTMLFormElement | null = $state(null);

	// Filtres secondaires (canton ; type retiré en Vague 1).
	// `filterType` conservé dormant (toujours '') : Signaux est mono-type (`appel_offres`)
	// depuis V5, le <select> Type a été retiré (cohérence, SPEC_VAGUE1_COHERENCE § 3).
	// Réintroduction sans dette si une source rouvre d'autres types : re-ajouter un
	// <select bind:value={filterType}> dérivé de `config.signaux.types` dans les actions
	// de SignauxTabs (cf. § 8 date d'expiration 2026-09-18).
	let filterType = $state('');
	let filterCanton = $state('');

	// V2 : tri + toggle hors-scope (persistance localStorage).
	// V4 (S189) : `panelCollapsed` retiré — l'ancien panneau sticky est devenu un
	// drawer overlay déclenché à la demande via le bouton « Mots-clés » de la toolbar.
	type SortKey = 'pertinence' | 'date';
	let sortKey: SortKey = $state('pertinence');
	let hideOutOfScope = $state(false);
	let keywordsDrawerOpen = $state(false);

	// V3 (S188 spec § 4 C5-C9) : recherche client + debounce 200ms + persistance.
	let search = $state('');
	let searchDebounced = $state('');

	onMount(() => {
		try {
			const s = localStorage.getItem('signaux.sort');
			if (s === 'pertinence' || s === 'date') sortKey = s;
			hideOutOfScope = localStorage.getItem('signaux.hideOutOfScope') === '1';
			const sv = localStorage.getItem('signaux.search') ?? '';
			if (sv) {
				search = sv;
				searchDebounced = sv; // appliqué immédiatement au mount (pas de débounce d'entrée)
			}
		} catch {
			// localStorage indisponible (mode privé, quota) : on garde les défauts.
		}
	});

	// Debounce SEARCH_DEBOUNCE_MS (250ms, contrat commun Vague 1) + persistance localStorage
	// (clé `signaux.search`). Se relance à chaque frappe ; cleanup auto via $effect quand
	// search re-change avant la fin du timer.
	$effect(() => {
		const value = search;
		const t = setTimeout(() => {
			searchDebounced = value;
			try {
				if (value) localStorage.setItem('signaux.search', value);
				else localStorage.removeItem('signaux.search');
			} catch {
				// ignore
			}
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(t);
	});

	function clearSearch() {
		search = '';
		searchDebounced = '';
		try {
			localStorage.removeItem('signaux.search');
		} catch {
			// ignore
		}
	}

	function setSort(k: SortKey) {
		sortKey = k;
		try {
			localStorage.setItem('signaux.sort', k);
		} catch {
			// ignore
		}
	}
	function setHideOutOfScope(v: boolean) {
		hideOutOfScope = v;
		try {
			localStorage.setItem('signaux.hideOutOfScope', v ? '1' : '0');
		} catch {
			// ignore
		}
	}

	// Form fields
	let type_signal = $state('');
	let description_projet = $state('');
	let maitre_ouvrage = $state('');
	let architecte_bureau = $state('');
	let canton = $state('');
	let commune = $state('');
	let source_officielle = $state('');
	let date_publication = $state('');
	let notes_libres = $state('');
	let responsable_filmpro = $state('');
	let statut_traitement = $state('nouveau');

	// Convert form
	let opp_titre = $state('');
	let opp_entreprise_id = $state('');

	const TYPE_SIGNAL_OPTIONS = config.signaux.types.map((t) => ({ value: t.key, label: t.label }));

	const indicators = $derived(signauxIndicators(data.signaux));
	const counts = $derived(signauxCountsByTab(data.signaux));

	// V4 (S189) : tab "Tous" retiré. La page commence sur "Nouveau" (cf. activeTab
	// default). L'intégralité est lisible en cumulant les autres tabs si besoin.
	const tabsSpec = $derived([
		{ key: 'nouveau' as SignauxTab, label: 'Nouveau', count: counts.nouveau },
		{ key: 'en_analyse' as SignauxTab, label: 'En analyse', count: counts.en_analyse },
		{ key: 'interesse' as SignauxTab, label: 'Intéressé', count: counts.interesse },
		{ key: 'converti' as SignauxTab, label: 'Converti', count: counts.converti },
		{ key: 'ecarte' as SignauxTab, label: 'Écarté', count: counts.ecarte },
	]);

	// V5 : en vue « archivées » on affiche toutes les fiches chargées (toutes statut=archive),
	// les onglets par statut ne s'appliquent pas. Sinon filtrage par onglet habituel.
	const filteredByTab = $derived(data.showArchived ? data.signaux : filterSignauxByTab(data.signaux, activeTab));

	// V4 (S189) : on isole la chaîne « tab + type + canton + search » dans une derived
	// dédiée pour pouvoir calculer le compteur `outOfScopeCount` (= nombre de signaux
	// que le toggle « Cacher les hors-scope » retirerait dans la sélection courante).
	// Sans ça, le toggle est invisible quand tous les signaux affichés ont déjà score > 0.
	const filteredBeforeScope = $derived.by(() => {
		let out = filteredByTab;
		if (filterType) out = out.filter((s: Signal) => s.type_signal === filterType);
		if (filterCanton) out = out.filter((s: Signal) => s.canton === filterCanton);
		// V3 spec § 4 C6 : filtre search client (case + accent insensitive) sur 3 champs.
		// Vague 1 : matching factorisé dans `matchesAnyField` (searchMatch.ts, source unique).
		const searchNorm = normalizeNFD(searchDebounced.trim());
		if (searchNorm.length >= KW_SEARCH_MIN_LEN) {
			out = out.filter((s: Signal) =>
				matchesAnyField([s.description_projet, s.maitre_ouvrage, s.commune], searchDebounced)
			);
		}
		return out;
	});

	const outOfScopeCount = $derived(
		filteredBeforeScope.filter((s: Signal) => (s.score_pertinence ?? 0) <= 0).length
	);

	const filteredSignaux = $derived.by(() => {
		let out = filteredBeforeScope;
		if (hideOutOfScope) out = out.filter((s: Signal) => (s.score_pertinence ?? 0) > 0);
		if (sortKey === 'pertinence') {
			// Tri par score desc ; NULLs en queue de liste ; tie-break sur date_detection desc.
			out = [...out].sort((a, b) => {
				const sa = a.score_pertinence;
				const sb = b.score_pertinence;
				if (sa == null && sb == null) return 0;
				if (sa == null) return 1;
				if (sb == null) return -1;
				if (sb !== sa) return sb - sa;
				const da = a.date_detection ? new Date(a.date_detection).getTime() : 0;
				const db = b.date_detection ? new Date(b.date_detection).getTime() : 0;
				return db - da;
			});
		}
		// sortKey === 'date' : on garde l'ordre du load (date_detection DESC côté serveur).
		return out;
	});

	// V5 (file courte) : sur l'onglet « Nouveau » sans filtre, la page ouvre sur la tête de file
	// triée par score (les chaudes / à décider), pas sur les centaines de fiches froides. Le bouton
	// « Voir plus » déplie le reste. Toute recherche / filtre / autre onglet / vue archivées
	// désactive le cap (on montre tout le sous-ensemble). queueCap = config.scoring.triage.
	const QUEUE_CAP = config.scoring.triage.queueCap;
	let queueExpanded = $state(false);
	const queueCapActive = $derived(
		!data.showArchived &&
		activeTab === 'nouveau' &&
		!queueExpanded &&
		!searchDebounced.trim() &&
		!filterType &&
		!filterCanton &&
		!hideOutOfScope &&
		filteredSignaux.length > QUEUE_CAP
	);
	const visibleSignaux = $derived(queueCapActive ? filteredSignaux.slice(0, QUEUE_CAP) : filteredSignaux);
	const queueHiddenCount = $derived(filteredSignaux.length - visibleSignaux.length);

	const cantons = $derived(
		[...new Set(data.signaux.map((s: Signal) => s.canton).filter(Boolean) as string[])].sort()
	);

	$effect(() => {
		const total = filteredSignaux.length;
		$pageSubtitle = total === 0 ? 'Aucun signal' : `${total} ${total > 1 ? 'signaux' : 'signal'}`;
	});

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function toggleSelectAll() {
		// V5 : sélectionne ce qui est visible (file courte capée), pas les fiches masquées.
		if (selectedIds.size === visibleSignaux.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(visibleSignaux.map((s: Signal) => s.id));
		}
	}

	function exitSelectMode() {
		selectMode = false;
		selectedIds = new Set();
		batchDeleteConfirmOpen = false;
	}

	function openDetail(signal: Signal) {
		selectedSignal = signal;
		slideOutOpen = true;
	}

	function openEdit() {
		if (!selectedSignal) return;
		type_signal = selectedSignal.type_signal ?? '';
		description_projet = selectedSignal.description_projet ?? '';
		maitre_ouvrage = selectedSignal.maitre_ouvrage ?? '';
		architecte_bureau = selectedSignal.architecte_bureau ?? '';
		canton = selectedSignal.canton ?? '';
		commune = selectedSignal.commune ?? '';
		source_officielle = selectedSignal.source_officielle ?? '';
		date_publication = selectedSignal.date_publication ?? '';
		notes_libres = selectedSignal.notes_libres ?? '';
		responsable_filmpro = selectedSignal.responsable_filmpro ?? '';
		statut_traitement = selectedSignal.statut_traitement ?? 'nouveau';
		slideOutOpen = false;
		modalOpen = true;
	}

	function openConvertModal() {
		if (!selectedSignal) return;
		opp_titre = selectedSignal.description_projet ?? selectedSignal.type_signal ?? '';
		opp_entreprise_id = '';
		convertModalOpen = true;
	}

	function resetForm() {
		type_signal = '';
		description_projet = '';
		maitre_ouvrage = '';
		architecte_bureau = '';
		canton = '';
		commune = '';
		source_officielle = '';
		date_publication = '';
		notes_libres = '';
		responsable_filmpro = '';
		statut_traitement = 'nouveau';
	}
</script>

<div class="ws-page">
	<div class="ws-page-actions">
		{#if data.signaux.length > 0}
			{#if selectMode}
				<button type="button" class="ws-btn ws-btn-secondary" onclick={exitSelectMode}>
					Annuler
				</button>
			{:else}
				<button type="button" class="ws-btn ws-btn-secondary" onclick={() => (selectMode = true)}>
					<Icon name="checklist" size={18} />
					Sélectionner
				</button>
			{/if}
		{/if}
		<!-- V5 : accès aux fiches archivées (Zefix soft-archivées), masquées de la file par défaut. -->
		{#if !data.showArchived && data.archivedCount > 0}
			<button type="button" class="ws-btn ws-btn-secondary" onclick={() => goto('?vue=archivees')}>
				<Icon name="inventory_2" size={18} />
				Archivées ({data.archivedCount})
			</button>
		{/if}
	</div>

	<!-- V5 : bannière de la vue archivées (lecture/consultation, restaurables côté admin). -->
	{#if data.showArchived}
		<div class="archive-banner" role="status">
			<Icon name="inventory_2" size={18} />
			<span>Vue des signaux archivés ({data.archivedCount}) — hors de la file de triage par défaut.</span>
			<button type="button" class="ws-btn-ghost" onclick={() => goto('?')}>
				<Icon name="arrow_back" size={16} />
				Retour aux signaux actifs
			</button>
		</div>
	{/if}

	<SignauxIndicators values={indicators} />

	{#if !data.showArchived}
	<SignauxTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)}>
		{#snippet actions()}
			<!-- Vague 1 (SPEC_VAGUE1_COHERENCE § 3) : filtre Type retiré (Signaux mono-type
			     `appel_offres` depuis V5 ; les 6 autres types venaient de sources coupées).
			     Seul Canton discrimine réellement. Réintroduction : re-ajouter ici un
			     <select bind:value={filterType}> dérivé de `config.signaux.types`. -->
			<select
				bind:value={filterCanton}
				class="ws-filter-select"
				aria-label="Filtrer par canton"
			>
				<option value="">Tous les cantons</option>
				{#each cantons as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
			{#if filterCanton}
				<button
					type="button"
					class="ws-btn-ghost"
					onclick={() => {
						filterCanton = '';
					}}
				>
					Effacer
				</button>
			{/if}
		{/snippet}
	</SignauxTabs>
	{/if}

	<div class="signaux-search-wrap">
		<SearchInput
			value={search}
			oninput={(v) => (search = v)}
			onclear={clearSearch}
			placeholder="Rechercher dans description, maître d'ouvrage, commune…"
			ariaLabel="Rechercher dans les signaux"
		/>
	</div>

	<div class="signaux-toolbar">
		<div class="sort-group" role="group" aria-label="Tri des signaux">
			<button
				type="button"
				class="sort-btn"
				class:active={sortKey === 'pertinence'}
				onclick={() => setSort('pertinence')}
				aria-pressed={sortKey === 'pertinence'}
			>
				<Icon name="bolt" size={14} /> Pertinence
			</button>
			<button
				type="button"
				class="sort-btn"
				class:active={sortKey === 'date'}
				onclick={() => setSort('date')}
				aria-pressed={sortKey === 'date'}
			>
				<Icon name="schedule" size={14} /> Date
			</button>
		</div>
		<div class="toolbar-right">
		<button
			type="button"
			class="kw-trigger desktop-only-inline"
			onclick={() => (keywordsDrawerOpen = true)}
			aria-haspopup="dialog"
			aria-expanded={keywordsDrawerOpen}
		>
			<Icon name="tune" size={16} />
			<span>Mots-clés</span>
			<span class="kw-trigger-count tabular-nums">{data.keywords.length}</span>
		</button>
		<label class="toggle-out" class:disabled={outOfScopeCount === 0}>
			<input
				type="checkbox"
				checked={hideOutOfScope}
				disabled={outOfScopeCount === 0 && !hideOutOfScope}
				onchange={(e) => setHideOutOfScope((e.currentTarget as HTMLInputElement).checked)}
			/>
			<span>
				Cacher les hors-scope
				<span class="toggle-out-count" class:has-out={outOfScopeCount > 0}>
					{outOfScopeCount > 0 ? `(${outOfScopeCount} masqué${outOfScopeCount > 1 ? 's' : ''})` : '(0)'}
				</span>
			</span>
		</label>
		</div>
	</div>

	<div
		class="ws-content"
		role="tabpanel"
		id={`panel-${activeTab}`}
		aria-labelledby={`tab-${activeTab}`}
	>
		{#if data.signaux.length === 0}
			<div class="empty-simple">
				<Icon name="schedule" size={32} class="empty-simple-icon" />
				<p>Pas encore de signaux. Le radar SIMAP (marchés publics construction Romandie) remplit cette page chaque matin à 6 h.</p>
			</div>
		{:else}
			{#if selectMode}
				<div class="batch-bar">
					<button
						type="button"
						class="batch-link"
						onclick={toggleSelectAll}
					>
						<Icon name={selectedIds.size === visibleSignaux.length ? 'deselect' : 'select_all'} size={18} />
						{selectedIds.size === visibleSignaux.length ? 'Tout désélectionner' : 'Tout sélectionner'}
					</button>
					<span class="batch-count">
						{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
					</span>
					<div class="batch-spacer"></div>
					<form
						bind:this={batchDeleteFormEl}
						method="POST"
						action="?/deleteBatch"
						use:enhance={() => {
							batchDeleting = true;
							return async ({ result, update }) => {
								batchDeleting = false;
								batchDeleteConfirmOpen = false;
								if (result.type === 'success') {
									toasts.success(`${selectedIds.size} ${selectedIds.size > 1 ? 'signaux supprimés' : 'signal supprimé'}`);
									exitSelectMode();
								} else {
									toasts.error('Erreur lors de la suppression');
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="ids" value={[...selectedIds].join(',')} />
						<button
							type="button"
							class="ws-btn ws-btn-danger"
							onclick={() => (batchDeleteConfirmOpen = true)}
							disabled={selectedIds.size === 0 || batchDeleting}
						>
							<Icon name="delete" size={16} />
							{batchDeleting ? 'Suppression…' : `Supprimer (${selectedIds.size})`}
						</button>
					</form>
				</div>
			{/if}

			<SignauxCards
				signaux={visibleSignaux}
				{selectMode}
				{selectedIds}
				onSelect={openDetail}
				onToggleSelect={toggleSelect}
				emptyMessage={emptyMessageForTab(activeTab)}
				keywords={data.keywords}
				searchTerm={searchDebounced}
			/>
			{#if queueCapActive && queueHiddenCount > 0}
				<button type="button" class="queue-more" onclick={() => (queueExpanded = true)}>
					<Icon name="expand_more" size={18} />
					Voir les {queueHiddenCount} autre{queueHiddenCount > 1 ? 's' : ''} signal{queueHiddenCount > 1 ? 'aux' : ''} (score plus faible)
				</button>
			{:else if queueExpanded && activeTab === 'nouveau' && !searchDebounced.trim() && !filterType && !filterCanton && !hideOutOfScope && filteredSignaux.length > QUEUE_CAP}
				<button type="button" class="queue-more" onclick={() => (queueExpanded = false)}>
					<Icon name="expand_less" size={18} />
					Réduire à la file courte (tête de file)
				</button>
			{/if}
		{/if}
	</div>
</div>

<SignauxKeywordsPanel
	keywords={data.keywords}
	canEdit={data.canEditKeywords}
	open={keywordsDrawerOpen}
	onClose={() => (keywordsDrawerOpen = false)}
/>

<!-- SlideOut détail signal -->
<SlideOut bind:open={slideOutOpen} title="Signal d'affaires">
	{#if selectedSignal}
		{@const sStyle = scoreStyle(selectedSignal.score_pertinence)}
		<div class="space-y-6">
			<!-- En-tête : type + statut + score -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<span class="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-light">
						<Icon name={typeIcon(selectedSignal.type_signal)} size={28} class="text-primary" />
					</span>
					<div>
						<p class="font-semibold text-text">{formatTypeLabel(selectedSignal.type_signal)}</p>
						<Badge label={statutLabel(selectedSignal.statut_traitement)} variant={statutVariant(selectedSignal.statut_traitement)} />
					</div>
				</div>
				<span class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold {sStyle.bgClass} {sStyle.colorClass}">
					<Icon name={sStyle.icon} size={18} />
					{clampDisplayScore(selectedSignal.score_pertinence, config.scoring.maxPoints)}/{config.scoring.maxPoints} : {sStyle.label}
				</span>
			</div>

			{#if selectedSignal.description_projet}
				<div class="text-sm">
					<span class="text-text-muted">Description du projet</span>
					<p class="font-medium text-text whitespace-pre-wrap">{selectedSignal.description_projet}</p>
				</div>
			{/if}

			<!-- Section : Acteurs -->
			<div class="space-y-3">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Acteurs</h3>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Maître d'ouvrage</span>
						<p class="font-medium text-text">{selectedSignal.maitre_ouvrage ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Architecte / Bureau</span>
						<p class="font-medium text-text">{selectedSignal.architecte_bureau ?? '–'}</p>
					</div>
					{#if selectedSignal.contacts}
						<div>
							<span class="text-text-muted">Contact lié</span>
							<a href="/crm/contacts" class="block font-medium text-primary hover:underline">
								{selectedSignal.contacts.prenom ?? ''} {selectedSignal.contacts.nom ?? ''}
							</a>
						</div>
					{/if}
					<div>
						<span class="text-text-muted">Responsable</span>
						<p class="font-medium text-text">{selectedSignal.responsable_filmpro ?? '–'}</p>
					</div>
				</div>
			</div>

			<!-- Section : Localisation -->
			<div class="space-y-3">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Localisation</h3>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Canton</span>
						<p class="font-medium text-text">{selectedSignal.canton ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Commune</span>
						<p class="font-medium text-text">{selectedSignal.commune ?? '–'}</p>
					</div>
				</div>
			</div>

			<!-- Section : Source & Dates -->
			<div class="space-y-3">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Source & dates</h3>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Source</span>
						<p class="font-medium text-text uppercase">{selectedSignal.source_officielle ?? '–'}</p>
					</div>
					<div>
						<span class="text-text-muted">Date publication</span>
						<p class="font-medium text-text">{formatDate(selectedSignal.date_publication)}</p>
					</div>
					<div>
						<span class="text-text-muted">Détecté</span>
						<p class="font-medium text-text">{formatRelative(selectedSignal.date_detection)}</p>
					</div>
				</div>
			</div>

			{#if selectedSignal.notes_libres}
				<div class="space-y-3">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Scoring</h3>
					<div class="flex flex-wrap gap-2">
						{#each selectedSignal.notes_libres.split(', ') as critere}
							<span class="px-2 py-1 text-xs rounded-lg bg-surface-alt/60 text-text">{critere}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if selectedSignal.opportunite_associee_id}
				<div class="text-sm p-3 bg-success/10 rounded-lg">
					<span class="text-success-deep font-medium">Converti en opportunité</span>
					<a href="/crm/pipeline" class="block text-primary hover:underline text-sm mt-1">Voir dans le pipeline</a>
				</div>
			{/if}

			<div class="flex flex-wrap gap-3 pt-4 border-t border-border">
				<button
					type="button"
					onclick={openEdit}
					class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
				>
					<Icon name="edit" size={16} />
					Modifier
				</button>

				{#if selectedSignal.statut_traitement !== 'converti' && selectedSignal.statut_traitement !== 'ecarte'}
					<button
						type="button"
						onclick={openConvertModal}
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-primary bg-primary-light hover:bg-primary/20 rounded-lg cursor-pointer"
					>
						<Icon name="arrow_forward" size={16} />
						Créer opportunité
					</button>

					<form
						method="POST"
						action="?/updateStatut"
						use:enhance={() => {
							return async ({ result, update }) => {
								slideOutOpen = false;
								selectedSignal = null;
								if (result.type === 'success') toasts.success('Signal écarté');
								else toasts.error('Erreur lors de la mise à jour');
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={selectedSignal.id} />
						<input type="hidden" name="statut_traitement" value="ecarte" />
						<button
							type="submit"
							class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-danger-deep cursor-pointer"
						>
							<Icon name="close" size={16} />
							Écarter
						</button>
					</form>
				{/if}

				<form
					bind:this={deleteFormEl}
					method="POST"
					action="?/delete"
					use:enhance={() => {
						deleting = true;
						return async ({ result, update }) => {
							deleting = false;
							slideOutOpen = false;
							selectedSignal = null;
							if (result.type === 'success') toasts.success('Signal supprimé');
							else toasts.error('Erreur lors de la suppression');
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={selectedSignal.id} />
					<button
						type="button"
						onclick={() => (confirmDeleteOpen = true)}
						disabled={deleting}
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-danger-deep hover:bg-danger/5 rounded-lg cursor-pointer disabled:opacity-50"
					>
						<Icon name="delete" size={16} />
						{deleting ? 'Suppression…' : 'Supprimer'}
					</button>
				</form>
			</div>
		</div>
	{/if}
</SlideOut>

<!-- Modal édition signal (création supprimée 2026-05-13 : décision Pascal, scan auto suffit) -->
<ModalForm
	bind:open={modalOpen}
	title="Modifier le signal"
	{saving}
>
	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
				if (result.type === 'success') toasts.success('Signal modifié');
				else toasts.error("Erreur lors de l'enregistrement");
				await update();
			};
		}}
	>
		{#if selectedSignal}
			<input type="hidden" name="id" value={selectedSignal.id} />
		{/if}

		<div class="space-y-4">
			<Select
				id="type_signal"
				label="Type de signal"
				required
				placeholder="-- Choisir --"
				bind:value={type_signal}
				options={TYPE_SIGNAL_OPTIONS}
			/>
			<FormField label="Description du projet" type="textarea" bind:value={description_projet} />
			<div class="grid grid-cols-2 gap-4">
				<CantonSelect bind:value={canton} />
				<FormField label="Maître d'ouvrage" bind:value={maitre_ouvrage} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<FormField label="Architecte / Bureau" bind:value={architecte_bureau} />
				<FormField label="Commune" bind:value={commune} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Source officielle" bind:value={source_officielle} />
				<FormField label="Date publication" type="date" bind:value={date_publication} />
			</div>
			<FormField label="Notes" type="textarea" bind:value={notes_libres} />
		</div>

		<input type="hidden" name="type_signal" value={type_signal} />
		<input type="hidden" name="description_projet" value={description_projet} />
		<input type="hidden" name="maitre_ouvrage" value={maitre_ouvrage} />
		<input type="hidden" name="architecte_bureau" value={architecte_bureau} />
		<input type="hidden" name="canton" value={canton} />
		<input type="hidden" name="commune" value={commune} />
		<input type="hidden" name="source_officielle" value={source_officielle} />
		<input type="hidden" name="date_publication" value={date_publication} />
		<input type="hidden" name="notes_libres" value={notes_libres} />
		<input type="hidden" name="responsable_filmpro" value={responsable_filmpro} />

		<div class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				onclick={() => (modalOpen = false)}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
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

<!-- Modal conversion signal -> opportunité -->
<ModalForm
	bind:open={convertModalOpen}
	title="Créer une opportunité depuis ce signal"
	{saving}
>
	{#if selectedSignal}
		<form
			method="POST"
			action="?/createOpportunite"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					convertModalOpen = false;
					slideOutOpen = false;
					selectedSignal = null;
					if (result.type === 'success') {
						toasts.success('Opportunité créée');
						await goto('/crm/pipeline');
					} else {
						toasts.error('Erreur lors de la conversion');
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="signal_id" value={selectedSignal.id} />

			<div class="space-y-4">
				<div class="p-3 bg-surface-alt/50 rounded-lg text-sm">
					<p class="text-text-muted">Signal source</p>
					<p class="font-medium text-text">{formatTypeLabel(selectedSignal.type_signal)} : {selectedSignal.maitre_ouvrage ?? ''}</p>
				</div>

				<FormField label="Titre de l'opportunité" bind:value={opp_titre} required />

				<input type="hidden" name="titre" value={opp_titre} />
				<input type="hidden" name="entreprise_id" value={opp_entreprise_id} />
			</div>

			<div class="flex justify-end gap-3 pt-4">
				<button
					type="button"
					onclick={() => (convertModalOpen = false)}
					class="h-11 px-4 box-border text-sm text-text-muted hover:text-text rounded-lg cursor-pointer"
				>
					Annuler
				</button>
				<button
					type="submit"
					disabled={saving}
					class="h-11 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 cursor-pointer"
				>
					{saving ? 'Création…' : 'Créer et aller au pipeline'}
				</button>
			</div>
		</form>
	{/if}
</ModalForm>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Supprimer ce signal ?"
	message="Cette action est irréversible. Le signal sera définitivement supprimé."
	confirmLabel="Supprimer"
	variant="danger"
	loading={deleting}
	onConfirm={() => {
		confirmDeleteOpen = false;
		deleteFormEl?.requestSubmit();
	}}
/>

<ConfirmModal
	bind:open={batchDeleteConfirmOpen}
	title={`Supprimer ${selectedIds.size} signal${selectedIds.size > 1 ? 's' : ''} ?`}
	message="Cette action est irréversible."
	confirmLabel="Supprimer"
	variant="danger"
	loading={batchDeleting}
	onConfirm={() => {
		batchDeleteConfirmOpen = false;
		batchDeleteFormEl?.requestSubmit();
	}}
/>

<style>
	/* Refonte mobile S191 : drawer Keywords expert-only, masqué en viewport < 1024px. */
	@media (max-width: 1023.98px) {
		.desktop-only-inline {
			display: none;
		}
	}

	/* V4 (S189) : layout 2 colonnes retiré. L'ancien panneau pertinence sticky droit
	 * est devenu un drawer overlay (SignauxKeywordsPanel) déclenché par le bouton
	 * « Mots-clés » de la toolbar. La page utilise désormais le flex column standard
	 * de `.ws-page` sans override, ce qui libère 100 % de la largeur pour les cards. */

	/* Recherche (Vague 1) : la primitive SearchInput porte désormais le style ;
	   ce wrapper ne garde que la marge de séparation avec la toolbar. */
	.signaux-search-wrap {
		margin: 8px 0 0;
	}

	/* Toolbar tri + bouton mots-clés + toggle hors-scope */
	.signaux-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 8px 0 0;
		flex-wrap: wrap;
	}
	.toolbar-right {
		display: inline-flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.kw-trigger {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 36px;
		padding: 0 14px;
		border-radius: var(--radius-full);
		font-size: 13px;
		font-weight: 600;
		font-family: inherit;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
		transition:
			border-color 150ms,
			background 150ms,
			box-shadow 150ms,
			transform 150ms var(--ease-out-expo, ease-out);
	}
	.kw-trigger:hover {
		background: var(--color-primary-light);
		border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
		color: var(--color-primary);
	}
	.kw-trigger:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.kw-trigger:active {
		transform: translateY(1px);
	}
	.kw-trigger-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 20px;
		padding: 0 6px;
		border-radius: var(--radius-full);
		background: var(--color-primary);
		color: white;
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
	}
	.kw-trigger:hover .kw-trigger-count {
		background: var(--color-primary-hover, var(--color-primary));
	}
	.sort-group {
		display: inline-flex;
		gap: 2px;
		background: var(--color-surface-alt);
		border-radius: var(--radius-full);
		padding: 3px;
		border: 1px solid var(--color-border);
	}
	.sort-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 14px;
		border-radius: var(--radius-full);
		font-size: 13px;
		font-weight: 600;
		background: transparent;
		color: var(--color-text-muted);
		border: none;
		cursor: pointer;
		font-family: inherit;
		transition:
			background 150ms,
			color 150ms,
			box-shadow 150ms;
	}
	.sort-btn:hover:not(.active) {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-surface) 60%, transparent);
	}
	.sort-btn.active {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--color-primary) 12%, transparent),
			0 2px 4px -1px rgba(16, 24, 40, 0.08);
	}
	.toggle-out {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--color-text-muted);
		cursor: pointer;
		font-weight: 500;
	}
	.toggle-out input {
		accent-color: var(--color-primary);
		cursor: pointer;
	}
	.toggle-out.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.toggle-out.disabled input {
		cursor: not-allowed;
	}
	.toggle-out-count {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		font-weight: 400;
	}
	.toggle-out-count.has-out {
		color: var(--color-warning-deep);
		font-weight: 600;
	}

	/* Empty state simple (V2 : scan auto remplit la page) */
	.empty-simple {
		padding: 64px 32px;
		text-align: center;
		color: var(--color-text-muted);
		display: grid;
		gap: 12px;
		justify-items: center;
	}
	.empty-simple :global(.empty-simple-icon) {
		opacity: 0.4;
	}
	.empty-simple p {
		font-size: 14px;
		max-width: 420px;
		line-height: 1.5;
		margin: 0;
	}

	/* Batch action bar */
	.batch-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 16px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		margin-bottom: 16px;
	}
	.batch-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		border: none;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-primary);
		cursor: pointer;
	}
	.batch-link:hover {
		text-decoration: underline;
	}
	.batch-count {
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.batch-spacer {
		flex: 1;
	}

	/* V5 : bouton « Voir plus » de la file courte (dépliage de la tête de file). */
	.queue-more {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 12px auto 0;
		padding: 8px 16px;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-body);
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.queue-more:hover {
		background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-alt));
	}

	/* V5 : bannière de la vue archivées. */
	.archive-banner {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-size: 13px;
		color: var(--color-text-body);
	}
	.archive-banner > span {
		flex: 1;
	}

</style>
