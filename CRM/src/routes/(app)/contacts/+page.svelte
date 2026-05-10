<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import {
		contactsIndicators,
		contactsCountsByTab,
		filterContactsByTab,
		type ContactsTab,
	} from '$lib/utils/contactsFormat';
	import ContactsIndicators from '$lib/components/contacts/ContactsIndicators.svelte';
	import ContactsTabs from '$lib/components/contacts/ContactsTabs.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Contact = (typeof data.contacts)[number];
	type Entreprise = { id: string; raison_sociale: string; site_web: string | null };

	// UI state
	let activeTab: ContactsTab = $state('tous');
	let slideOutOpen = $state(false);
	let selectedContact = $state<Contact | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let archiving = $state(false);
	let confirmArchiveOpen = $state(false);
	let archiveFormEl: HTMLFormElement | null = $state(null);

	// Form fields
	let nom = $state('');
	let prenom = $state('');
	let email_professionnel = $state('');
	let telephone = $state('');
	let role_fonction = $state('');
	let entreprise_id = $state('');
	let entreprise_nom = $state('');
	let canton = $state('');
	let segment = $state('');
	let source = $state('');
	let notes_libres = $state('');
	let adresse = $state('');
	let tags = $state('');

	let showSuggestions = $state(false);

	// Audit 360 V2b H-06 : autocomplete async via /api/entreprises/search.
	// Avant : pré-fetch full list dans data.entreprises + filter client. Maintenant :
	// fetch debounced à chaque keystroke (250 ms), max 20 résultats, ilike trigram.
	let filteredSuggestions = $state<Entreprise[]>([]);
	let suggestionsLoading = $state(false);
	let searchSeq = 0;
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	const SEARCH_DEBOUNCE_MS = 250;

	const indicators = $derived(contactsIndicators(data.contacts));
	const counts = $derived(contactsCountsByTab(data.contacts));
	const filteredContacts = $derived(filterContactsByTab(data.contacts, activeTab));

	const tabsSpec = $derived([
		{ key: 'tous' as ContactsTab, label: 'Tous', count: counts.tous },
		{ key: 'prescripteurs' as ContactsTab, label: 'Prescripteurs', count: counts.prescripteurs },
		{ key: 'a-qualifier' as ContactsTab, label: 'À qualifier', count: counts['a-qualifier'] },
		{ key: 'sans-entreprise' as ContactsTab, label: 'Sans entreprise', count: counts['sans-entreprise'] },
	]);

	async function searchEntreprises(query: string): Promise<void> {
		const seq = ++searchSeq;
		if (!query || query.trim().length < 2) {
			filteredSuggestions = [];
			suggestionsLoading = false;
			return;
		}
		suggestionsLoading = true;
		try {
			const url = `/api/entreprises/search?q=${encodeURIComponent(query.trim())}`;
			const resp = await fetch(url);
			// Drop la réponse si une nouvelle frappe est arrivée entre-temps.
			if (seq !== searchSeq) return;
			if (!resp.ok) {
				filteredSuggestions = [];
				return;
			}
			const json = (await resp.json()) as { results?: Entreprise[] };
			if (seq !== searchSeq) return;
			filteredSuggestions = json.results ?? [];
		} catch {
			if (seq === searchSeq) filteredSuggestions = [];
		} finally {
			if (seq === searchSeq) suggestionsLoading = false;
		}
	}

	function scheduleSearch(query: string) {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void searchEntreprises(query), SEARCH_DEBOUNCE_MS);
	}

	$effect(() => {
		const total = data.contacts.length;
		$pageSubtitle = total === 0 ? 'Aucun contact' : `${total} contact${total > 1 ? 's' : ''}`;
	});

	function selectEntreprise(e: Entreprise) {
		entreprise_id = e.id;
		entreprise_nom = e.raison_sociale;
		showSuggestions = false;
	}

	function clearEntreprise() {
		entreprise_id = '';
		entreprise_nom = '';
	}

	function logoUrl(siteWeb: string | null): string | null {
		if (!siteWeb) return null;
		try {
			const domain = new URL(siteWeb).hostname;
			return `https://logo.clearbit.com/${domain}`;
		} catch {
			return null;
		}
	}

	function entrepriseForContact(contact: Contact): Entreprise | null {
		// Audit 360 V2b H-06 : on lit l'entreprise jointe (`entreprises(id,
		// raison_sociale, site_web)`) directement sur le contact, plus besoin de
		// la liste pré-fetchée.
		const ent = (contact as { entreprises?: Entreprise | null }).entreprises;
		return ent ?? null;
	}

	const columns = [
		{ key: 'nom', label: 'Nom', sortable: true, class: 'w-[12%]' },
		{ key: 'prenom', label: 'Prénom', sortable: true, class: 'w-[10%] hidden md:table-cell' },
		{
			key: 'entreprise',
			label: 'Entreprise',
			sortable: true,
			class: 'w-[15%]',
			render: (r: Contact) => r.entreprises?.raison_sociale ?? '–',
		},
		{ key: 'role_fonction', label: 'Fonction', sortable: true, class: 'w-[12%] hidden lg:table-cell' },
		{ key: 'email_professionnel', label: 'Email', class: 'w-[20%] hidden lg:table-cell' },
		{ key: 'telephone', label: 'Téléphone', class: 'w-[15%] whitespace-nowrap hidden lg:table-cell' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[6%] hidden md:table-cell' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[10%]' },
	];

	function rowAriaLabelFor(c: Contact): string {
		const fullname = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() || 'Contact sans nom';
		const company = c.entreprises?.raison_sociale ?? 'sans entreprise';
		const statut = c.statut_qualification ?? 'inconnu';
		const presc = c.est_prescripteur ? ', prescripteur' : '';
		return `${fullname}, ${company}, statut ${statut}${presc}`;
	}

	function emptyMessageFor(tab: ContactsTab): string {
		switch (tab) {
			case 'prescripteurs':
				return 'Aucun prescripteur identifié pour le moment.';
			case 'a-qualifier':
				return 'Aucun contact à qualifier — tout est traité.';
			case 'sans-entreprise':
				return 'Tous les contacts sont rattachés à une entreprise.';
			case 'tous':
			default:
				return 'Aucun contact dans ce filtre.';
		}
	}

	function openDetail(contact: Contact) {
		selectedContact = contact;
		slideOutOpen = true;
	}

	function openCreate() {
		editMode = false;
		resetForm();
		modalOpen = true;
	}

	function openEdit() {
		if (!selectedContact) return;
		editMode = true;
		nom = selectedContact.nom ?? '';
		prenom = selectedContact.prenom ?? '';
		email_professionnel = selectedContact.email_professionnel ?? '';
		telephone = selectedContact.telephone ?? '';
		role_fonction = selectedContact.role_fonction ?? '';
		entreprise_id = selectedContact.entreprise_id ?? '';
		entreprise_nom = selectedContact.entreprises?.raison_sociale ?? '';
		canton = selectedContact.canton ?? '';
		segment = selectedContact.segment ?? '';
		source = selectedContact.source ?? '';
		notes_libres = selectedContact.notes_libres ?? '';
		adresse = selectedContact.adresse ?? '';
		tags = selectedContact.tags ?? '';
		slideOutOpen = false;
		modalOpen = true;
	}

	function resetForm() {
		nom = '';
		prenom = '';
		email_professionnel = '';
		telephone = '';
		role_fonction = '';
		entreprise_id = '';
		entreprise_nom = '';
		canton = '';
		segment = '';
		source = '';
		notes_libres = '';
		adresse = '';
		tags = '';
		showSuggestions = false;
	}

	function statutBadgeVariant(statut: string | null): 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'qualifie':
				return 'success';
			case 'en_cours':
				return 'info';
			case 'nouveau':
				return 'warning';
			case 'archive':
				return 'muted';
			default:
				return 'default';
		}
	}
</script>

<div class="page">
	<div class="page-actions">
		<button type="button" class="btn btn-primary" onclick={openCreate}>
			<Icon name="add" size={18} />
			Ajouter
		</button>
	</div>

	<ContactsIndicators values={indicators} />

	<ContactsTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)} />

	<div
		class="table-wrap"
		role="tabpanel"
		id={`panel-${activeTab}`}
		aria-labelledby={`tab-${activeTab}`}
	>
		{#if data.contacts.length === 0}
			<EmptyState
				icon="contacts"
				title="Aucun contact"
				description="Ajoutez votre premier contact pour commencer à construire votre réseau."
				actionLabel="Ajouter un contact"
				onAction={openCreate}
			/>
		{:else}
			<DataTable
				data={filteredContacts}
				{columns}
				onRowClick={openDetail}
				searchPlaceholder="Rechercher un contact…"
				stickyLeftCols={2}
				rowAriaLabel={rowAriaLabelFor}
				emptyMessage={emptyMessageFor(activeTab)}
			>
				{#snippet row(contact, _i)}
					<td class="px-4 py-3 font-medium text-text">{contact.nom ?? '–'}</td>
					<td class="px-4 py-3 text-text hidden md:table-cell">{contact.prenom ?? '–'}</td>
					<td class="px-4 py-3 text-text">{contact.entreprises?.raison_sociale ?? '–'}</td>
					<td class="px-4 py-3 text-text hidden lg:table-cell">{contact.role_fonction ?? '–'}</td>
					<td class="px-4 py-3 text-text hidden lg:table-cell">{contact.email_professionnel ?? '–'}</td>
					<td class="px-4 py-3 text-text hidden lg:table-cell">{contact.telephone ?? '–'}</td>
					<td class="px-4 py-3 text-text w-20 hidden md:table-cell">{contact.canton ?? '–'}</td>
					<td class="px-4 py-3 w-24">
						<Badge label={contact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(contact.statut_qualification)} />
					</td>
				{/snippet}
			</DataTable>
		{/if}
	</div>
</div>

<button
	type="button"
	class="fab"
	aria-label="Ajouter un contact"
	onclick={openCreate}
>
	<Icon name="add" size={20} />
</button>

<!-- SlideOut détail contact -->
<SlideOut bind:open={slideOutOpen} title="{selectedContact?.prenom ?? ''} {selectedContact?.nom ?? ''}">
	{#if selectedContact}
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<Badge label={selectedContact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(selectedContact.statut_qualification)} />
				{#if selectedContact.est_prescripteur}
					<Badge label="Prescripteur" variant="default" />
				{/if}
			</div>

			{#if entrepriseForContact(selectedContact) || selectedContact.entreprises?.raison_sociale}
				{@const ent = entrepriseForContact(selectedContact)}
				<div class="flex items-center gap-3 p-3 bg-surface rounded-lg">
					{#if logoUrl(ent?.site_web ?? null)}
						<img
							src={logoUrl(ent?.site_web ?? null)}
							alt=""
							class="w-10 h-10 rounded-md object-contain bg-white border border-border"
							onerror={(e) => {
								(e.currentTarget as HTMLElement).style.display = 'none';
							}}
						/>
					{:else}
						<span class="flex items-center justify-center w-10 h-10 rounded-md bg-primary-light text-primary font-bold text-sm">
							{(selectedContact.entreprises?.raison_sociale ?? '?')[0].toUpperCase()}
						</span>
					{/if}
					<div>
						<p class="font-medium text-text">{selectedContact.entreprises?.raison_sociale ?? '–'}</p>
						<p class="text-xs text-text-muted">{selectedContact.role_fonction ?? 'Fonction non renseignée'}</p>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				{#if !selectedContact.entreprises?.raison_sociale}
					<div>
						<span class="text-text-muted">Fonction</span>
						<p class="font-medium text-text">{selectedContact.role_fonction ?? '–'}</p>
					</div>
				{/if}
				<div>
					<span class="text-text-muted">Email</span>
					<p class="font-medium text-text">{selectedContact.email_professionnel ?? '–'}</p>
				</div>
				<div>
					<span class="text-text-muted">Téléphone</span>
					<p class="font-medium text-text">{selectedContact.telephone ?? '–'}</p>
				</div>
				<div>
					<span class="text-text-muted">Canton</span>
					<p class="font-medium text-text">{selectedContact.canton ?? '–'}</p>
				</div>
				<div>
					<span class="text-text-muted">Segment</span>
					<p class="font-medium text-text">{selectedContact.segment ?? '–'}</p>
				</div>
				<div>
					<span class="text-text-muted">Source</span>
					<p class="font-medium text-text">{selectedContact.source ?? '–'}</p>
				</div>
				<div>
					<span class="text-text-muted">Score</span>
					<p class="font-medium text-text">{selectedContact.score_priorite ?? '–'}</p>
				</div>
			</div>

			{#if selectedContact.adresse}
				<div class="text-sm">
					<span class="text-text-muted">Adresse</span>
					<p class="font-medium text-text">{selectedContact.adresse}</p>
				</div>
			{/if}

			{#if selectedContact.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedContact.notes_libres}</p>
				</div>
			{/if}

			{#if selectedContact.tags}
				<div class="text-sm">
					<span class="text-text-muted">Tags</span>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each selectedContact.tags.split(',') as tag}
							<Badge label={tag.trim()} variant="muted" />
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex gap-3 pt-4 border-t border-border">
				<button
					onclick={openEdit}
					class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
				>
					<Icon name="edit" size={16} />
					Modifier
				</button>
				<form
					bind:this={archiveFormEl}
					method="POST"
					action="?/delete"
					use:enhance={() => {
						archiving = true;
						return async ({ result, update }) => {
							archiving = false;
							slideOutOpen = false;
							selectedContact = null;
							if (result.type === 'success') toasts.success('Contact archivé');
							else toasts.error("Erreur lors de l'archivage");
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={selectedContact.id} />
					<button
						type="button"
						onclick={() => (confirmArchiveOpen = true)}
						disabled={archiving}
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-medium text-danger rounded-lg hover:bg-danger/5 cursor-pointer disabled:opacity-50 transition-colors"
					>
						<Icon name="archive" size={16} />
						{archiving ? 'Archivage…' : 'Archiver'}
					</button>
				</form>
			</div>
		</div>
	{/if}
</SlideOut>

<ConfirmModal
	bind:open={confirmArchiveOpen}
	title="Archiver ce contact ?"
	message="Cette action est irréversible. Le contact sera définitivement archivé."
	confirmLabel="Archiver"
	variant="danger"
	loading={archiving}
	onConfirm={() => {
		confirmArchiveOpen = false;
		archiveFormEl?.requestSubmit();
	}}
/>

<!-- Modal création/édition -->
<ModalForm
	bind:open={modalOpen}
	title={editMode ? 'Modifier le contact' : 'Nouveau contact'}
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
				if (result.type === 'success') toasts.success(editMode ? 'Contact modifié' : 'Contact créé');
				else toasts.error("Erreur lors de l'enregistrement");
				await update();
			};
		}}
	>
		{#if editMode && selectedContact}
			<input type="hidden" name="id" value={selectedContact.id} />
		{/if}

		<div class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Nom" bind:value={nom} required />
				<FormField label="Prénom" bind:value={prenom} />
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Email" type="email" bind:value={email_professionnel} />
				<FormField label="Téléphone" type="tel" bind:value={telephone} />
			</div>

			<div class="space-y-1 relative">
				<label for="entreprise_nom" class="block text-sm font-medium text-text">Entreprise</label>
				<div class="flex gap-2">
					<input
						id="entreprise_nom"
						type="text"
						bind:value={entreprise_nom}
						onfocus={() => {
							showSuggestions = true;
							if (entreprise_nom.length >= 2) scheduleSearch(entreprise_nom);
						}}
						oninput={(e) => {
							entreprise_id = '';
							showSuggestions = true;
							scheduleSearch((e.currentTarget as HTMLInputElement).value);
						}}
						placeholder="Tapez pour chercher ou créer…"
						autocomplete="off"
						class="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
					{#if entreprise_nom}
						<button type="button" onclick={clearEntreprise} class="px-2 text-text-muted hover:text-text cursor-pointer">
							<Icon name="close" size={18} />
						</button>
					{/if}
				</div>
				{#if showSuggestions && filteredSuggestions.length > 0}
					<div class="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
						{#each filteredSuggestions as sug}
							<button
								type="button"
								onclick={() => selectEntreprise(sug)}
								class="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface cursor-pointer {entreprise_id === sug.id ? 'bg-primary-light font-medium' : ''}"
							>
								{#if logoUrl(sug.site_web)}
									<img
										src={logoUrl(sug.site_web)}
										alt=""
										class="w-5 h-5 rounded object-contain"
										onerror={(e) => {
											(e.currentTarget as HTMLElement).style.display = 'none';
										}}
									/>
								{:else}
									<span class="flex items-center justify-center w-5 h-5 rounded bg-primary-light text-primary text-[10px] font-bold">
										{sug.raison_sociale[0]}
									</span>
								{/if}
								{sug.raison_sociale}
							</button>
						{/each}
						{#if entreprise_nom.length >= 2 && !entreprise_id}
							<div class="px-3 py-2 text-xs text-text-muted border-t border-border">
								<Icon name="add" size={12} class="align-middle" />
								« {entreprise_nom} » sera créée automatiquement
							</div>
						{/if}
					</div>
				{/if}
				{#if entreprise_nom && entreprise_nom.length >= 2 && !filteredSuggestions.length && showSuggestions}
					<p class="text-xs text-text-muted mt-1">
						<Icon name="add" size={12} class="align-middle" />
						« {entreprise_nom} » sera créée automatiquement
					</p>
				{/if}
			</div>

			<FormField label="Fonction" bind:value={role_fonction} />
			<FormField label="Adresse" bind:value={adresse} placeholder="Rue, NPA, Ville" />
			<CantonSelect bind:value={canton} />
		</div>

		<input type="hidden" name="nom" value={nom} />
		<input type="hidden" name="prenom" value={prenom} />
		<input type="hidden" name="email_professionnel" value={email_professionnel} />
		<input type="hidden" name="telephone" value={telephone} />
		<input type="hidden" name="role_fonction" value={role_fonction} />
		<input type="hidden" name="entreprise_id" value={entreprise_id} />
		<input type="hidden" name="entreprise_nom" value={entreprise_nom} />
		<input type="hidden" name="canton" value={canton} />
		<input type="hidden" name="segment" value={segment} />
		<input type="hidden" name="source" value={source} />
		<input type="hidden" name="notes_libres" value={notes_libres} />
		<input type="hidden" name="adresse" value={adresse} />
		<input type="hidden" name="tags" value={tags} />

		<div class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				onclick={() => (modalOpen = false)}
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

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - var(--header-height, 56px));
	}
	.page-actions {
		display: flex;
		justify-content: flex-end;
		padding: 12px 32px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 8px 16px;
		border-radius: 10px;
		font-family: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		border: none;
		box-sizing: border-box;
		transition: background 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.btn-primary {
		background: var(--color-primary);
		color: white;
	}
	.btn-primary:hover {
		background: var(--color-primary-hover);
	}
	.btn-primary:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.table-wrap {
		flex: 1;
		padding: 20px 32px 40px;
	}

	@media (max-width: 1024px) {
		.page-actions {
			padding: 12px 24px;
		}
		.table-wrap {
			padding: 16px 24px 32px;
		}
	}
	@media (max-width: 768px) {
		.page-actions {
			display: none;
		}
		.table-wrap {
			padding: 12px 16px 96px;
		}
	}

	.fab {
		display: none;
	}

	@media (max-width: 768px) {
		.fab {
			display: grid;
			place-items: center;
			position: fixed;
			right: 20px;
			bottom: 20px;
			width: 56px;
			height: 56px;
			border-radius: 9999px;
			background: var(--color-primary);
			color: white;
			border: none;
			cursor: pointer;
			box-shadow: 0 8px 24px -6px rgba(47, 90, 158, 0.45);
			transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), background 220ms cubic-bezier(0.16, 1, 0.3, 1);
			z-index: 20;
		}
		.fab:hover {
			transform: translateY(-2px);
			background: var(--color-primary-hover);
		}
		.fab:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}
</style>
