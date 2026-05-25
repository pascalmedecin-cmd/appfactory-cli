<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import VisitsPanel from '$lib/components/VisitsPanel.svelte';
	import PipelineQuickAdvance from '$lib/components/PipelineQuickAdvance.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import {
		entreprisesIndicators,
		entreprisesCountsByTab,
		filterEntreprisesByTab,
		emptyMessageForTab,
		readPersistedView,
		persistView,
		logoUrlForSite,
		contactCountForEntreprise,
		type EntreprisesTab,
		type EntreprisesView,
	} from '$lib/utils/entreprisesFormat';
	import EntreprisesIndicators from '$lib/components/entreprises/EntreprisesIndicators.svelte';
	import EntreprisesTabs from '$lib/components/entreprises/EntreprisesTabs.svelte';
	import EntreprisesViewToggle from '$lib/components/entreprises/EntreprisesViewToggle.svelte';
	import EntreprisesCards from '$lib/components/entreprises/EntreprisesCards.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Entreprise = (typeof data.entreprises)[number];
	type Contact = (typeof data.contacts)[number];

	// UI state
	let activeTab: EntreprisesTab = $state('toutes');
	let view: EntreprisesView = $state('table');
	let searchQuery = $state('');
	let slideOutOpen = $state(false);
	let selectedEntreprise = $state<Entreprise | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let confirmDeleteOpen = $state(false);
	let deleteFormEl: HTMLFormElement | null = $state(null);
	let enriching = $state(false);

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

	const indicators = $derived(entreprisesIndicators(data.entreprises, data.contacts));
	const counts = $derived(entreprisesCountsByTab(data.entreprises, data.contacts));

	const tabsSpec = $derived([
		{ key: 'toutes' as EntreprisesTab, label: 'Toutes', count: counts.toutes },
		{ key: 'qualifiees' as EntreprisesTab, label: 'Qualifiées', count: counts.qualifiees },
		{ key: 'a-qualifier' as EntreprisesTab, label: 'À qualifier', count: counts['a-qualifier'] },
		{ key: 'sans-contact' as EntreprisesTab, label: 'Sans contact', count: counts['sans-contact'] },
	]);

	const filteredByTab = $derived(filterEntreprisesByTab(data.entreprises, data.contacts, activeTab));

	const filteredEntreprises = $derived.by(() => {
		if (!searchQuery.trim()) return filteredByTab;
		const q = searchQuery.toLowerCase();
		return filteredByTab.filter((e: Entreprise) =>
			e.raison_sociale.toLowerCase().includes(q) ||
			(e.secteur_activite ?? '').toLowerCase().includes(q) ||
			(e.canton ?? '').toLowerCase().includes(q)
		);
	});

	$effect(() => {
		const total = data.entreprises.length;
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
		{ key: 'logo', label: '', srLabel: 'Logo', class: 'w-14' },
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true, class: 'w-[24%]' },
		{ key: 'secteur_activite', label: 'Secteur', sortable: true, class: 'w-[22%] hidden md:table-cell' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[8%] hidden md:table-cell' },
		{ key: 'contacts', label: 'Contacts', class: 'w-[10%] hidden lg:table-cell' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[12%]' },
	];
</script>

<div class="ws-page">
	<div class="ws-page-actions">
		<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
			<Icon name="add" size={18} />
			Ajouter
		</button>
	</div>

	<EntreprisesIndicators values={indicators} />

	<EntreprisesTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)}>
		{#snippet actions()}
			<div class="search">
				<Icon name="search" size={16} class="search-icon" />
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Rechercher une entreprise…"
					aria-label="Rechercher une entreprise"
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
		{#if data.entreprises.length === 0}
			<EmptyState
				icon="business"
				title="Aucune entreprise"
				description="Les entreprises apparaissent ici automatiquement quand vous les rattachez à un contact, ou ajoutez-en une manuellement."
				actionLabel="Ajouter une entreprise"
				onAction={openCreate}
			/>
		{:else if effectiveView === 'table'}
			<DataTable
				data={filteredEntreprises}
				{columns}
				onRowClick={openDetail}
				searchable={false}
				stickyLeftCols={2}
				rowAriaLabel={rowAriaLabelFor}
				emptyMessage={emptyMessageForTab(activeTab)}
			>
				{#snippet row(entreprise, _i)}
					{@const logo = logoUrlForSite(entreprise.site_web)}
					{@const cc = contactCountForEntreprise(entreprise.id, data.contacts)}
					<td class="px-4 py-3">
						{#if logo}
							<img
								class="logo-cell"
								src={logo}
								alt=""
								onerror={(e) => {
									(e.currentTarget as HTMLElement).style.display = 'none';
									(e.currentTarget.nextElementSibling as HTMLElement).style.display = 'grid';
								}}
							/>
							<span class="logo-cell logo-cell--placeholder">
								{entreprise.raison_sociale[0]?.toUpperCase() ?? '?'}
							</span>
						{:else}
							<span class="logo-cell logo-cell--placeholder">
								{entreprise.raison_sociale[0]?.toUpperCase() ?? '?'}
							</span>
						{/if}
					</td>
					<td class="px-4 py-3 font-semibold text-text">{entreprise.raison_sociale}</td>
					<td class="px-4 py-3 text-text-muted hidden md:table-cell">{entreprise.secteur_activite ?? '–'}</td>
					<td class="px-4 py-3 text-text hidden md:table-cell">{entreprise.canton ?? '–'}</td>
					<td class="px-4 py-3 text-text tabular-nums hidden lg:table-cell">{cc}</td>
					<td class="px-4 py-3">
						<Badge label={statutLabel(entreprise.statut_qualification)} variant={statutBadgeVariant(entreprise.statut_qualification)} />
					</td>
				{/snippet}
			</DataTable>
		{:else}
			<EntreprisesCards
				entreprises={filteredEntreprises}
				contacts={data.contacts}
				onSelect={openDetail}
				emptyMessage={emptyMessageForTab(activeTab)}
			/>
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
		{@const logo = logoUrlForSite(selectedEntreprise.site_web)}
		<div class="space-y-6">
			<!-- En-tête avec logo -->
			<div class="flex items-center gap-4">
				{#if logo}
					<img src={logo} alt="" class="w-16 h-16 rounded-lg object-contain bg-white border border-border" onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
				{:else}
					<span class="flex items-center justify-center w-16 h-16 rounded-lg bg-primary-light text-primary font-bold text-2xl">
						{selectedEntreprise.raison_sociale[0].toUpperCase()}
					</span>
				{/if}
				<div>
					<p class="font-semibold text-lg text-text">{selectedEntreprise.raison_sociale}</p>
					<Badge label={statutLabel(selectedEntreprise.statut_qualification)} variant={statutBadgeVariant(selectedEntreprise.statut_qualification)} />
				</div>
			</div>

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
							href="/pipeline"
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
				<VisitsPanel entrepriseId={selectedEntreprise.id} />
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
								<a href="/contacts" class="text-primary text-xs hover:underline">Voir</a>
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

				<form bind:this={deleteFormEl} method="POST" action="?/delete" use:enhance={() => {
					deleting = true;
					return async ({ result, update }) => {
						deleting = false;
						slideOutOpen = false;
						selectedEntreprise = null;
						if (result.type === 'success') toasts.success('Entreprise supprimée');
						else toasts.error(result.type === 'failure' && result.data?.error ? String(result.data.error) : 'Erreur lors de la suppression');
						await update();
					};
				}}>
					<input type="hidden" name="id" value={selectedEntreprise.id} />
					<button
						type="button"
						onclick={() => confirmDeleteOpen = true}
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
				<FormField label="Taille estimée" bind:value={taille_estimee} placeholder="PME, ETI, GE…" />
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
	message="Cette action est irréversible. L'entreprise et toutes ses données seront définitivement supprimées."
	confirmLabel="Supprimer"
	variant="danger"
	loading={deleting}
	onConfirm={() => { confirmDeleteOpen = false; deleteFormEl?.requestSubmit(); }}
/>

<style>
	/* Search input dans tabs-actions */
	.search {
		position: relative;
		width: 256px;
	}
	.search input {
		width: 100%;
		height: 32px;
		padding: 0 12px 0 36px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font: 13px inherit;
		background: var(--color-surface);
		color: var(--color-text);
		font-family: inherit;
	}
	.search input:focus-visible {
		border-color: var(--color-primary);
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent);
	}
	.search :global(.search-icon) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
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
