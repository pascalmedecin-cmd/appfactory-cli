<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Contact = (typeof data.contacts)[number];

	let slideOutOpen = $state(false);
	let selectedContact = $state<Contact | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let archiving = $state(false);

	type Entreprise = { id: string; raison_sociale: string; site_web: string | null };

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

	let entrepriseSuggestions = $state<Entreprise[]>([]);
	let showSuggestions = $state(false);

	const entreprises = $derived((data as any).entreprises as Entreprise[] ?? []);

	function normalizeName(name: string): string {
		return name.toLowerCase().trim()
			.replace(/\s+(sa|sàrl|sarl|gmbh|ag|s\.a\.|s\.à\.r\.l\.)$/i, '')
			.replace(/[^a-zà-ü0-9]/g, '');
	}

	const filteredSuggestions = $derived.by(() => {
		if (!entreprise_nom || entreprise_nom.length < 2) return [];
		const qNorm = normalizeName(entreprise_nom);
		return entreprises.filter(e => {
			const nameNorm = normalizeName(e.raison_sociale);
			return nameNorm.includes(qNorm) || qNorm.includes(nameNorm);
		}).slice(0, 8);
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
		} catch { return null; }
	}

	function entrepriseForContact(contact: Contact): Entreprise | null {
		if (!contact.entreprise_id) return null;
		return entreprises.find(e => e.id === contact.entreprise_id) ?? null;
	}

	const columns = [
		{ key: 'nom', label: 'Nom', sortable: true, class: 'w-[12%]' },
		{ key: 'prenom', label: 'Prénom', sortable: true, class: 'w-[10%]' },
		{ key: 'entreprise', label: 'Entreprise', sortable: true, class: 'w-[15%]', render: (r: Contact) => r.entreprises?.raison_sociale ?? '—' },
		{ key: 'role_fonction', label: 'Fonction', sortable: true, class: 'w-[12%]' },
		{ key: 'email_professionnel', label: 'Email', class: 'w-[20%]' },
		{ key: 'telephone', label: 'Téléphone', class: 'w-[15%] whitespace-nowrap' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-[6%]' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-[10%]' },
	];

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
		nom = ''; prenom = ''; email_professionnel = ''; telephone = '';
		role_fonction = ''; entreprise_id = ''; entreprise_nom = ''; canton = ''; segment = '';
		source = ''; notes_libres = ''; adresse = ''; tags = '';
		showSuggestions = false;
	}

	function statutBadgeVariant(statut: string | null): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'qualifie': return 'success';
			case 'en_cours': return 'accent';
			case 'nouveau': return 'warning';
			case 'archive': return 'muted';
			default: return 'default';
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-text">Contacts</h1>
			<p class="text-sm text-text-muted">{data.contacts.length} contact{data.contacts.length > 1 ? 's' : ''}</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			Ajouter
		</button>
	</div>

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
		data={data.contacts}
		{columns}
		onRowClick={openDetail}
		searchPlaceholder="Rechercher un contact…"
	>
		{#snippet row(contact, _i)}
			<td class="px-4 py-2.5 font-medium text-text">{contact.nom ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">{contact.prenom ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">{contact.entreprises?.raison_sociale ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">{contact.role_fonction ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">{contact.email_professionnel ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">{contact.telephone ?? '—'}</td>
			<td class="px-4 py-2.5 text-text w-20">{contact.canton ?? '—'}</td>
			<td class="px-4 py-2.5 w-24">
				<Badge label={contact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(contact.statut_qualification)} />
			</td>
		{/snippet}
	</DataTable>
	{/if}
</div>

<!-- SlideOut détail contact -->
<SlideOut bind:open={slideOutOpen} title="{selectedContact?.prenom ?? ''} {selectedContact?.nom ?? ''}">
	{#if selectedContact}
		<div class="space-y-5">
			<div class="flex items-center justify-between">
				<Badge label={selectedContact.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(selectedContact.statut_qualification)} />
				{#if selectedContact.est_prescripteur}
					<Badge label="Prescripteur" variant="accent" />
				{/if}
			</div>

			<!-- Entreprise avec logo -->
			{#if entrepriseForContact(selectedContact) || selectedContact.entreprises?.raison_sociale}
				{@const ent = entrepriseForContact(selectedContact)}
				<div class="flex items-center gap-3 p-3 bg-surface rounded-lg">
					{#if logoUrl(ent?.site_web ?? null)}
						<img src={logoUrl(ent?.site_web ?? null)} alt="" class="w-10 h-10 rounded-md object-contain bg-white border border-border" onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
					{:else}
						<span class="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary font-bold text-sm">
							{(selectedContact.entreprises?.raison_sociale ?? '?')[0].toUpperCase()}
						</span>
					{/if}
					<div>
						<p class="font-medium text-text">{selectedContact.entreprises?.raison_sociale ?? '—'}</p>
						<p class="text-xs text-text-muted">{selectedContact.role_fonction ?? 'Fonction non renseignée'}</p>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				{#if !selectedContact.entreprises?.raison_sociale}
					<div>
						<span class="text-text-muted">Fonction</span>
						<p class="font-medium text-text">{selectedContact.role_fonction ?? '—'}</p>
					</div>
				{/if}
				<div>
					<span class="text-text-muted">Email</span>
					<p class="font-medium text-text">{selectedContact.email_professionnel ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Téléphone</span>
					<p class="font-medium text-text">{selectedContact.telephone ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Canton</span>
					<p class="font-medium text-text">{selectedContact.canton ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Segment</span>
					<p class="font-medium text-text">{selectedContact.segment ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Source</span>
					<p class="font-medium text-text">{selectedContact.source ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Score</span>
					<p class="font-medium text-text">{selectedContact.score_priorite ?? '—'}</p>
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
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">edit</span>
					Modifier
				</button>
				<form method="POST" action="?/delete" use:enhance={({ cancel }) => {
					if (!confirm('Archiver ce contact ? Cette action est irréversible.')) { cancel(); return; }
					archiving = true;
					return async ({ result, update }) => {
						archiving = false;
						slideOutOpen = false;
						selectedContact = null;
						if (result.type === 'success') toasts.success('Contact archivé');
						else toasts.error('Erreur lors de l\'archivage');
						await update();
					};
				}}>
					<input type="hidden" name="id" value={selectedContact.id} />
					<button
						type="submit"
						disabled={archiving}
						class="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-[16px]">archive</span>
						{archiving ? 'Archivage…' : 'Archiver'}
					</button>
				</form>
			</div>
		</div>
	{/if}
</SlideOut>

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
				else toasts.error('Erreur lors de l\'enregistrement');
				await update();
			};
		}}
	>
		{#if editMode && selectedContact}
			<input type="hidden" name="id" value={selectedContact.id} />
		{/if}

		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Nom" bind:value={nom} required />
				<FormField label="Prénom" bind:value={prenom} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Email" type="email" bind:value={email_professionnel} />
				<FormField label="Téléphone" type="tel" bind:value={telephone} />
			</div>

			<!-- Autocomplete entreprise -->
			<div class="space-y-1 relative">
				<label for="entreprise_nom" class="block text-sm font-medium text-text">Entreprise</label>
				<div class="flex gap-2">
					<input
						id="entreprise_nom"
						type="text"
						bind:value={entreprise_nom}
						onfocus={() => showSuggestions = true}
						oninput={() => { entreprise_id = ''; showSuggestions = true; }}
						placeholder="Tapez pour chercher ou créer…"
						autocomplete="off"
						class="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
					/>
					{#if entreprise_nom}
						<button type="button" onclick={clearEntreprise} class="px-2 text-text-muted hover:text-text cursor-pointer">
							<span class="material-symbols-outlined text-[18px]">close</span>
						</button>
					{/if}
				</div>
				{#if showSuggestions && filteredSuggestions.length > 0}
					<div class="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
						{#each filteredSuggestions as sug}
							<button
								type="button"
								onclick={() => selectEntreprise(sug)}
								class="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface cursor-pointer {entreprise_id === sug.id ? 'bg-accent/10 font-medium' : ''}"
							>
								{#if logoUrl(sug.site_web)}
									<img src={logoUrl(sug.site_web)} alt="" class="w-5 h-5 rounded object-contain" onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
								{:else}
									<span class="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold">{sug.raison_sociale[0]}</span>
								{/if}
								{sug.raison_sociale}
							</button>
						{/each}
						{#if entreprise_nom.length >= 2 && !entreprise_id}
							<div class="px-3 py-2 text-xs text-text-muted border-t border-border">
								<span class="material-symbols-outlined text-[12px] align-middle">add</span>
								« {entreprise_nom} » sera créée automatiquement
							</div>
						{/if}
					</div>
				{/if}
				{#if entreprise_nom && entreprise_nom.length >= 2 && !filteredSuggestions.length && showSuggestions}
					<p class="text-xs text-text-muted mt-1">
						<span class="material-symbols-outlined text-[12px] align-middle">add</span>
						« {entreprise_nom} » sera créée automatiquement
					</p>
				{/if}
			</div>

			<FormField label="Fonction" bind:value={role_fonction} />
			<FormField label="Adresse" bind:value={adresse} placeholder="Rue, NPA, Ville" />
			<CantonSelect bind:value={canton} />
		</div>

		<!-- Champs cachés pour form submission -->
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
				onclick={() => modalOpen = false}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving}
				class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer"
			>
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>
