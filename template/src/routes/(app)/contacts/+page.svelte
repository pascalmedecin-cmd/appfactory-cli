<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Contact = (typeof data.contacts)[number];

	let slideOutOpen = $state(false);
	let selectedContact = $state<Contact | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);

	// Form fields
	let nom = $state('');
	let prenom = $state('');
	let email_professionnel = $state('');
	let telephone = $state('');
	let role_fonction = $state('');
	let entreprise_id = $state('');
	let canton = $state('');
	let segment = $state('');
	let source = $state('');
	let notes_libres = $state('');
	let adresse = $state('');
	let tags = $state('');

	const columns = [
		{ key: 'nom', label: 'Nom', sortable: true },
		{ key: 'prenom', label: 'Prénom', sortable: true },
		{ key: 'entreprise', label: 'Entreprise', sortable: true, render: (r: Contact) => r.entreprises?.raison_sociale ?? '—' },
		{ key: 'role_fonction', label: 'Fonction', sortable: true },
		{ key: 'email_professionnel', label: 'Email' },
		{ key: 'telephone', label: 'Téléphone' },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-20' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-24' },
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
		role_fonction = ''; entreprise_id = ''; canton = ''; segment = '';
		source = ''; notes_libres = ''; adresse = ''; tags = '';
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

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Fonction</span>
					<p class="font-medium text-text">{selectedContact.role_fonction ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Entreprise</span>
					<p class="font-medium text-text">{selectedContact.entreprises?.raison_sociale ?? '—'}</p>
				</div>
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
				<form method="POST" action="?/delete" use:enhance={() => {
					return async ({ result, update }) => {
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
						class="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">archive</span>
						Archiver
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
			<FormField label="Fonction" bind:value={role_fonction} />
			<FormField label="Canton" bind:value={canton} placeholder="GE, VD, VS…" />
		</div>

		<!-- Champs cachés pour form submission -->
		<input type="hidden" name="nom" value={nom} />
		<input type="hidden" name="prenom" value={prenom} />
		<input type="hidden" name="email_professionnel" value={email_professionnel} />
		<input type="hidden" name="telephone" value={telephone} />
		<input type="hidden" name="role_fonction" value={role_fonction} />
		<input type="hidden" name="entreprise_id" value={entreprise_id} />
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
