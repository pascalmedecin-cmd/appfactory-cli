<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Entreprise = (typeof data.entreprises)[number];
	type Contact = (typeof data.contacts)[number];

	let slideOutOpen = $state(false);
	let selectedEntreprise = $state<Entreprise | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);

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

	const columns = [
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true },
		{ key: 'secteur_activite', label: 'Secteur', sortable: true },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-20' },
		{ key: 'taille_estimee', label: 'Taille', sortable: true, class: 'w-24' },
		{ key: 'site_web', label: 'Site web' },
		{ key: 'statut_qualification', label: 'Statut', sortable: true, class: 'w-24' },
	];

	const linkedContacts = $derived(
		selectedEntreprise
			? data.contacts.filter((c: Contact) => c.entreprise_id === selectedEntreprise!.id)
			: []
	);

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
		raison_sociale = ''; secteur_activite = ''; canton = ''; taille_estimee = '';
		site_web = ''; numero_ide = ''; adresse_siege = ''; segment_cible = '';
		source = ''; notes_libres = ''; tags = '';
	}

	function statutBadgeVariant(statut: string | null): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'qualifie': return 'success';
			case 'en_cours': return 'accent';
			case 'nouveau': return 'warning';
			default: return 'default';
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-text">Entreprises</h1>
			<p class="text-sm text-text-muted">{data.entreprises.length} entreprise{data.entreprises.length > 1 ? 's' : ''}</p>
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
		data={data.entreprises}
		{columns}
		onRowClick={openDetail}
		searchPlaceholder="Rechercher une entreprise…"
	>
		{#snippet row(entreprise, _i)}
			<td class="px-4 py-2.5 font-medium text-text">{entreprise.raison_sociale}</td>
			<td class="px-4 py-2.5 text-text">{entreprise.secteur_activite ?? '—'}</td>
			<td class="px-4 py-2.5 text-text w-20">{entreprise.canton ?? '—'}</td>
			<td class="px-4 py-2.5 text-text w-24">{entreprise.taille_estimee ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">
				{#if entreprise.site_web}
					<a href={entreprise.site_web} target="_blank" class="text-accent hover:underline" onclick={(e) => e.stopPropagation()}>
						{entreprise.site_web.replace(/^https?:\/\//, '')}
					</a>
				{:else}
					—
				{/if}
			</td>
			<td class="px-4 py-2.5 w-24">
				<Badge label={entreprise.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(entreprise.statut_qualification)} />
			</td>
		{/snippet}
	</DataTable>
</div>

<!-- SlideOut détail entreprise -->
<SlideOut bind:open={slideOutOpen} title={selectedEntreprise?.raison_sociale ?? ''}>
	{#if selectedEntreprise}
		<div class="space-y-5">
			<Badge label={selectedEntreprise.statut_qualification ?? 'inconnu'} variant={statutBadgeVariant(selectedEntreprise.statut_qualification)} />

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Secteur</span>
					<p class="font-medium text-text">{selectedEntreprise.secteur_activite ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Canton</span>
					<p class="font-medium text-text">{selectedEntreprise.canton ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Taille</span>
					<p class="font-medium text-text">{selectedEntreprise.taille_estimee ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Segment</span>
					<p class="font-medium text-text">{selectedEntreprise.segment_cible ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">IDE</span>
					<p class="font-medium text-text">{selectedEntreprise.numero_ide ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Source</span>
					<p class="font-medium text-text">{selectedEntreprise.source ?? '—'}</p>
				</div>
			</div>

			{#if selectedEntreprise.site_web}
				<div class="text-sm">
					<span class="text-text-muted">Site web</span>
					<p><a href={selectedEntreprise.site_web} target="_blank" class="text-accent hover:underline">{selectedEntreprise.site_web}</a></p>
				</div>
			{/if}

			{#if selectedEntreprise.adresse_siege}
				<div class="text-sm">
					<span class="text-text-muted">Adresse</span>
					<p class="font-medium text-text">{selectedEntreprise.adresse_siege}</p>
				</div>
			{/if}

			{#if selectedEntreprise.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedEntreprise.notes_libres}</p>
				</div>
			{/if}

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
										<span class="text-text-muted"> — {contact.role_fonction}</span>
									{/if}
								</div>
								<a href="/contacts" class="text-accent text-xs hover:underline">Voir</a>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-text-muted">Aucun contact rattaché.</p>
				{/if}
			</div>

			<div class="flex gap-3 pt-4 border-t border-border">
				<button
					onclick={openEdit}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">edit</span>
					Modifier
				</button>
				<form method="POST" action="?/delete" use:enhance={() => {
					return async ({ update }) => {
						slideOutOpen = false;
						selectedEntreprise = null;
						await update();
					};
				}}>
					<input type="hidden" name="id" value={selectedEntreprise.id} />
					<button
						type="submit"
						class="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">delete</span>
						Supprimer
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
			return async ({ update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
				await update();
			};
		}}
	>
		{#if editMode && selectedEntreprise}
			<input type="hidden" name="id" value={selectedEntreprise.id} />
		{/if}

		<div class="space-y-4">
			<FormField label="Raison sociale" bind:value={raison_sociale} required />
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Secteur d'activité" bind:value={secteur_activite} />
				<FormField label="Canton" bind:value={canton} placeholder="GE, VD, VS…" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Taille estimée" bind:value={taille_estimee} placeholder="PME, ETI, GE…" />
				<FormField label="Site web" type="url" bind:value={site_web} />
			</div>
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
