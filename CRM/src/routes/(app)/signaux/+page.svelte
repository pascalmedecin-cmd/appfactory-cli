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
		type SignauxTab,
	} from '$lib/utils/signauxFormat';
	import SignauxIndicators from '$lib/components/signaux/SignauxIndicators.svelte';
	import SignauxTabs from '$lib/components/signaux/SignauxTabs.svelte';
	import SignauxCards from '$lib/components/signaux/SignauxCards.svelte';
	import SignauxKeywordsPanel from '$lib/components/signaux/SignauxKeywordsPanel.svelte';
	import { KW_SEARCH_MIN_LEN } from '$lib/scoring/keywords';
	import { normalizeNFD } from '$lib/utils/text-normalize';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Signal = (typeof data.signaux)[number];

	// UI state
	let activeTab: SignauxTab = $state('tous');
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

	// Filtres secondaires (type, canton)
	let filterType = $state('');
	let filterCanton = $state('');

	// V2 : tri + toggle hors-scope + panneau collapsible (persistance localStorage).
	type SortKey = 'pertinence' | 'date';
	let sortKey: SortKey = $state('pertinence');
	let hideOutOfScope = $state(false);
	let panelCollapsed = $state(false);

	// V3 (S188 spec § 4 C5-C9) : recherche client + debounce 200ms + persistance.
	let search = $state('');
	let searchDebounced = $state('');

	onMount(() => {
		try {
			const s = localStorage.getItem('signaux.sort');
			if (s === 'pertinence' || s === 'date') sortKey = s;
			hideOutOfScope = localStorage.getItem('signaux.hideOutOfScope') === '1';
			panelCollapsed = localStorage.getItem('signaux.keywordsPanel') === 'collapsed';
			const sv = localStorage.getItem('signaux.search') ?? '';
			if (sv) {
				search = sv;
				searchDebounced = sv; // appliqué immédiatement au mount (pas de débounce d'entrée)
			}
		} catch {
			// localStorage indisponible (mode privé, quota) : on garde les défauts.
		}
	});

	// Debounce 200ms + persistance localStorage (clé `signaux.search`). Se relance à chaque
	// frappe ; cleanup auto via $effect quand search re-change avant la fin du timer.
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
		}, 200);
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
	function setPanelCollapsed(v: boolean) {
		panelCollapsed = v;
		try {
			localStorage.setItem('signaux.keywordsPanel', v ? 'collapsed' : 'open');
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

	const tabsSpec = $derived([
		{ key: 'tous' as SignauxTab, label: 'Tous', count: counts.tous },
		{ key: 'nouveau' as SignauxTab, label: 'Nouveau', count: counts.nouveau },
		{ key: 'en_analyse' as SignauxTab, label: 'En analyse', count: counts.en_analyse },
		{ key: 'interesse' as SignauxTab, label: 'Intéressé', count: counts.interesse },
		{ key: 'converti' as SignauxTab, label: 'Converti', count: counts.converti },
		{ key: 'ecarte' as SignauxTab, label: 'Écarté', count: counts.ecarte },
	]);

	const filteredByTab = $derived(filterSignauxByTab(data.signaux, activeTab));

	const filteredSignaux = $derived.by(() => {
		let out = filteredByTab;
		if (filterType) out = out.filter((s: Signal) => s.type_signal === filterType);
		if (filterCanton) out = out.filter((s: Signal) => s.canton === filterCanton);
		if (hideOutOfScope) out = out.filter((s: Signal) => (s.score_pertinence ?? 0) > 0);
		// V3 spec § 4 C6 : filtre search client (case + accent insensitive) sur 3 champs.
		const searchNorm = normalizeNFD(searchDebounced.trim());
		if (searchNorm.length >= KW_SEARCH_MIN_LEN) {
			out = out.filter((s: Signal) => {
				const d = normalizeNFD(s.description_projet ?? '');
				const mo = normalizeNFD(s.maitre_ouvrage ?? '');
				const co = normalizeNFD(s.commune ?? '');
				return d.includes(searchNorm) || mo.includes(searchNorm) || co.includes(searchNorm);
			});
		}
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
		if (selectedIds.size === filteredSignaux.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(filteredSignaux.map((s: Signal) => s.id));
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

<div class="ws-page signaux-layout">
	<section class="signaux-main">
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
	</div>

	<SignauxIndicators values={indicators} />

	<SignauxTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)}>
		{#snippet actions()}
			<select
				bind:value={filterType}
				class="ws-filter-select"
				aria-label="Filtrer par type"
			>
				<option value="">Tous les types</option>
				{#each config.signaux.types as t}
					<option value={t.key}>{t.label}</option>
				{/each}
			</select>
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
			{#if filterType || filterCanton}
				<button
					type="button"
					class="ws-btn-ghost"
					onclick={() => {
						filterType = '';
						filterCanton = '';
					}}
				>
					Effacer
				</button>
			{/if}
		{/snippet}
	</SignauxTabs>

	<div class="signaux-search" class:filled={search.length > 0}>
		<Icon name="search" size={16} class="search-icon" />
		<input
			type="search"
			bind:value={search}
			placeholder="Rechercher dans description, maître d'ouvrage, commune…"
			class="search-input"
			aria-label="Rechercher dans les signaux"
		/>
		{#if search.length > 0}
			<button
				type="button"
				class="search-clear"
				onclick={clearSearch}
				aria-label="Effacer la recherche"
			>
				<Icon name="close" size={16} />
			</button>
		{/if}
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
		<label class="toggle-out">
			<input
				type="checkbox"
				checked={hideOutOfScope}
				onchange={(e) => setHideOutOfScope((e.currentTarget as HTMLInputElement).checked)}
			/>
			<span>Cacher les hors-scope</span>
		</label>
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
				<p>Pas encore de signaux. Le scanner Zefix + SIMAP remplit cette page chaque matin à 6 h.</p>
			</div>
		{:else}
			{#if selectMode}
				<div class="batch-bar">
					<button
						type="button"
						class="batch-link"
						onclick={toggleSelectAll}
					>
						<Icon name={selectedIds.size === filteredSignaux.length ? 'deselect' : 'select_all'} size={18} />
						{selectedIds.size === filteredSignaux.length ? 'Tout désélectionner' : 'Tout sélectionner'}
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
				signaux={filteredSignaux}
				{selectMode}
				{selectedIds}
				onSelect={openDetail}
				onToggleSelect={toggleSelect}
				emptyMessage={emptyMessageForTab(activeTab)}
				keywords={data.keywords}
				searchTerm={searchDebounced}
			/>
		{/if}
	</div>
	</section>

	<SignauxKeywordsPanel
		keywords={data.keywords}
		canEdit={data.canEditKeywords}
		collapsed={panelCollapsed}
		onCollapsedChange={setPanelCollapsed}
	/>
</div>

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
					{selectedSignal.score_pertinence ?? 0}/{config.scoring.maxPoints} : {sStyle.label}
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
							<a href="/contacts" class="block font-medium text-primary hover:underline">
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
					<span class="text-success font-medium">Converti en opportunité</span>
					<a href="/pipeline" class="block text-primary hover:underline text-sm mt-1">Voir dans le pipeline</a>
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
							class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-danger cursor-pointer"
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
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-danger hover:bg-danger/5 rounded-lg cursor-pointer disabled:opacity-50"
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
						await goto('/pipeline');
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
	/* Layout 2 colonnes : cards à gauche + panneau pertinence à droite.
	 * `.ws-page` (global) pose `display: flex; flex-direction: column` — on doit
	 * forcer `flex-direction: row` ici, sinon le panneau s'empile en bas. */
	.signaux-layout {
		display: flex !important;
		flex-direction: row !important;
		align-items: stretch;
		gap: 0;
		padding-right: 0 !important;
	}
	.signaux-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	@media (max-width: 1023px) {
		.signaux-layout {
			flex-direction: column !important;
		}
		.signaux-main {
			width: 100%;
		}
	}

	/* Input search V3 (spec § 4 C5-C9) : recherche client sur description / maître / commune. */
	.signaux-search {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 8px 12px;
		gap: 8px;
		margin: 8px 0 0;
		transition: border-color 150ms, box-shadow 150ms;
	}
	.signaux-search:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.signaux-search.filled {
		border-color: var(--color-border-strong);
	}
	.signaux-search :global(.search-icon) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.search-input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-size: 14px;
		color: var(--color-text);
		font-family: inherit;
	}
	.search-input::placeholder {
		color: var(--color-text-muted);
	}
	/* Retire la croix native du type=search (WebKit) car on a notre propre bouton clear. */
	.search-input::-webkit-search-decoration,
	.search-input::-webkit-search-cancel-button,
	.search-input::-webkit-search-results-button,
	.search-input::-webkit-search-results-decoration {
		appearance: none;
	}
	.search-clear {
		background: none;
		border: none;
		padding: 4px;
		border-radius: var(--radius-full);
		color: var(--color-text-muted);
		cursor: pointer;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		font-family: inherit;
	}
	.search-clear:hover {
		color: var(--color-text);
		background: var(--color-surface-alt);
	}

	/* Toolbar tri + toggle hors-scope */
	.signaux-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 8px 0 0;
		flex-wrap: wrap;
	}
	.sort-group {
		display: inline-flex;
		gap: 0;
		background: var(--color-surface-alt);
		border-radius: var(--radius-full);
		padding: 2px;
		border: 1px solid var(--color-border);
	}
	.sort-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 12px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 500;
		background: transparent;
		color: var(--color-text-muted);
		border: none;
		cursor: pointer;
		font-family: inherit;
	}
	.sort-btn.active {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: var(--shadow-card);
	}
	.toggle-out {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.toggle-out input {
		accent-color: var(--color-primary);
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

	/* Empty state grid 2 cards */
	.empty-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}
	.empty-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 24px;
		display: grid;
		gap: 16px;
	}
	.empty-card-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.empty-card-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.empty-card-icon.primary {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.empty-card-icon.warning {
		background: color-mix(in srgb, var(--color-warning) 10%, transparent);
		color: var(--color-warning);
	}
	.empty-card h2 {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}
	.empty-card p {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
		margin: 0;
	}
	.empty-card-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.empty-card-list li {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.empty-card-list li :global(svg) {
		color: var(--color-success);
		flex-shrink: 0;
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

</style>
