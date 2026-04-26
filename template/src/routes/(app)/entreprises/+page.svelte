<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';

	$effect(() => { $pageSubtitle = `${data.entreprises.length} entreprise${data.entreprises.length > 1 ? 's' : ''}`; });
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Entreprise = (typeof data.entreprises)[number];
	type Contact = (typeof data.contacts)[number];

	let slideOutOpen = $state(false);
	let selectedEntreprise = $state<Entreprise | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let confirmDeleteOpen = $state(false);
	let deleteFormEl: HTMLFormElement | null = $state(null);
	let enriching = $state(false);
	let searchQuery = $state('');

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

	const filteredEntreprises = $derived.by(() => {
		if (!searchQuery) return data.entreprises;
		const q = searchQuery.toLowerCase();
		return data.entreprises.filter((e: Entreprise) =>
			e.raison_sociale.toLowerCase().includes(q) ||
			(e.secteur_activite ?? '').toLowerCase().includes(q) ||
			(e.canton ?? '').toLowerCase().includes(q)
		);
	});

	const linkedContacts = $derived(
		selectedEntreprise
			? data.contacts.filter((c: Contact) => c.entreprise_id === selectedEntreprise!.id)
			: []
	);

	function logoUrl(siteWeb: string | null): string | null {
		if (!siteWeb) return null;
		try {
			const domain = new URL(siteWeb).hostname;
			return `https://logo.clearbit.com/${domain}`;
		} catch { return null; }
	}

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

<div class="space-y-5">
	<div class="flex items-center justify-end">
		<button
			onclick={openCreate}
			class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
		>
			<Icon name="add" size={18} />
			Ajouter
		</button>
	</div>

	{#if data.entreprises.length === 0}
		<EmptyState
			icon="business"
			title="Aucune entreprise"
			description="Les entreprises apparaissent ici automatiquement quand vous les rattachez à un contact, ou ajoutez-en une manuellement."
			actionLabel="Ajouter une entreprise"
			onAction={openCreate}
		/>
	{:else}
		<!-- Recherche -->
		<div class="relative">
			<Icon name="search" size={18} class="text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Rechercher une entreprise…"
				class="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
			/>
		</div>

		<!-- Cards grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each filteredEntreprises as entreprise (entreprise.id)}
				{@const logo = logoUrl(entreprise.site_web)}
				{@const contactCount = data.contacts.filter((c: Contact) => c.entreprise_id === entreprise.id).length}
				<button
					onclick={() => openDetail(entreprise)}
					class="bg-white rounded-lg border border-border p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer text-left w-full"
				>
					<div class="flex items-start gap-3">
						{#if logo}
							<img src={logo} alt="" class="w-12 h-12 rounded-lg object-contain bg-white border border-border flex-shrink-0" onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
						{:else}
							<span class="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
								{entreprise.raison_sociale[0].toUpperCase()}
							</span>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold text-text truncate">{entreprise.raison_sociale}</p>
							{#if entreprise.secteur_activite}
								<p class="text-xs text-text-muted truncate">{entreprise.secteur_activite}</p>
							{/if}
						</div>
						<Badge label={entreprise.statut_qualification ?? 'nouveau'} variant={statutBadgeVariant(entreprise.statut_qualification)} />
					</div>

					<div class="mt-3 space-y-1.5 text-xs text-text-muted">
						{#if entreprise.canton}
							<span class="flex items-center gap-1">
								<Icon name="location_on" size={14} />
								{entreprise.canton}{#if entreprise.adresse_siege} : {entreprise.adresse_siege}{/if}
							</span>
						{/if}
						{#if entreprise.site_web}
							<span class="flex items-center gap-1 truncate">
								<Icon name="language" size={14} />
								{entreprise.site_web.replace(/^https?:\/\//, '').replace(/\/$/, '')}
							</span>
						{/if}
						<span class="flex items-center gap-1">
							<Icon name="people" size={14} />
							{contactCount} contact{contactCount > 1 ? 's' : ''}
						</span>
					</div>
				</button>
			{/each}
		</div>

		{#if filteredEntreprises.length === 0}
			<div class="text-center py-8">
				<Icon name="filter_alt_off" size={48} class="text-text-muted/30" />
				<p class="mt-2 text-sm text-text-muted">Aucune entreprise ne correspond à la recherche.</p>
			</div>
		{/if}
	{/if}
</div>

<!-- SlideOut détail entreprise -->
<SlideOut bind:open={slideOutOpen} title={selectedEntreprise?.raison_sociale ?? ''}>
	{#if selectedEntreprise}
		{@const logo = logoUrl(selectedEntreprise.site_web)}
		<div class="space-y-5">
			<!-- En-tête avec logo -->
			<div class="flex items-center gap-4">
				{#if logo}
					<img src={logo} alt="" class="w-16 h-16 rounded-lg object-contain bg-white border border-border" onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
				{:else}
					<span class="flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary font-bold text-2xl">
						{selectedEntreprise.raison_sociale[0].toUpperCase()}
					</span>
				{/if}
				<div>
					<p class="font-semibold text-lg text-text">{selectedEntreprise.raison_sociale}</p>
					<Badge label={selectedEntreprise.statut_qualification ?? 'nouveau'} variant={statutBadgeVariant(selectedEntreprise.statut_qualification)} />
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
						<a href={maps} target="_blank" class="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
							<Icon name="map" size={14} />
							Voir sur Google Maps
						</a>
					{/if}
				</div>
			{/if}

			{#if selectedEntreprise.site_web}
				<div class="text-sm">
					<span class="text-text-muted">Site web</span>
					<p><a href={selectedEntreprise.site_web} target="_blank" class="text-primary hover:underline">{selectedEntreprise.site_web}</a></p>
				</div>
			{/if}

			{#if selectedEntreprise.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Description / Notes</span>
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
						class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg cursor-pointer disabled:opacity-50"
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
						class="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50"
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
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving}
				class="h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 cursor-pointer"
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
