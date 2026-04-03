<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Signal = (typeof data.signaux)[number];

	let slideOutOpen = $state(false);
	let selectedSignal = $state<Signal | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let convertModalOpen = $state(false);

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

	// Filters
	let filterType = $state('');
	let filterCanton = $state('');
	let filterStatut = $state('');

	const TYPES_SIGNAL = [
		'appel_offres', 'permis_construire', 'creation_entreprise',
		'demenagement', 'expansion', 'fusion_acquisition', 'autre',
	];

	const STATUTS = [
		{ key: 'nouveau', label: 'Nouveau', variant: 'warning' as const },
		{ key: 'en_analyse', label: 'En analyse', variant: 'accent' as const },
		{ key: 'interesse', label: 'Interesse', variant: 'success' as const },
		{ key: 'ecarte', label: 'Ecarte', variant: 'muted' as const },
		{ key: 'converti', label: 'Converti', variant: 'default' as const },
	];

	const filteredSignaux = $derived.by(() => {
		let result = data.signaux;
		if (filterType) result = result.filter(s => s.type_signal === filterType);
		if (filterCanton) result = result.filter(s => s.canton === filterCanton);
		if (filterStatut) result = result.filter(s => s.statut_traitement === filterStatut);
		return result;
	});

	const cantons = $derived([...new Set(data.signaux.map(s => s.canton).filter(Boolean))].sort());

	const columns = [
		{ key: 'type_signal', label: 'Type', sortable: true, class: 'w-32' },
		{ key: 'description_projet', label: 'Description', sortable: true },
		{ key: 'maitre_ouvrage', label: 'Maitre d\'ouvrage', sortable: true },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-20' },
		{ key: 'date_detection', label: 'Detection', sortable: true, class: 'w-24' },
		{ key: 'statut_traitement', label: 'Statut', sortable: true, class: 'w-28' },
	];

	function formatDate(d: string | null): string {
		if (!d) return '--';
		return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
	}

	function formatTypeSignal(type: string | null): string {
		if (!type) return '--';
		return type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
	}

	function statutVariant(statut: string | null): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		const found = STATUTS.find(s => s.key === statut);
		return found?.variant ?? 'muted';
	}

	function openDetail(signal: Signal) {
		selectedSignal = signal;
		slideOutOpen = true;
	}

	function openCreate() {
		editMode = false;
		resetForm();
		modalOpen = true;
	}

	function openEdit() {
		if (!selectedSignal) return;
		editMode = true;
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
		type_signal = ''; description_projet = ''; maitre_ouvrage = '';
		architecte_bureau = ''; canton = ''; commune = ''; source_officielle = '';
		date_publication = ''; notes_libres = ''; responsable_filmpro = '';
		statut_traitement = 'nouveau';
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-text">Signaux d'affaires</h1>
			<p class="text-sm text-text-muted">{filteredSignaux.length} signal{filteredSignaux.length > 1 ? 'ux' : ''}</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			Ajouter
		</button>
	</div>

	<!-- Filters -->
	<div class="flex gap-3 flex-wrap">
		<select
			bind:value={filterType}
			class="px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
		>
			<option value="">Tous les types</option>
			{#each TYPES_SIGNAL as t}
				<option value={t}>{formatTypeSignal(t)}</option>
			{/each}
		</select>
		<select
			bind:value={filterCanton}
			class="px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
		>
			<option value="">Tous les cantons</option>
			{#each cantons as c}
				<option value={c}>{c}</option>
			{/each}
		</select>
		<select
			bind:value={filterStatut}
			class="px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
		>
			<option value="">Tous les statuts</option>
			{#each STATUTS as s}
				<option value={s.key}>{s.label}</option>
			{/each}
		</select>
		{#if filterType || filterCanton || filterStatut}
			<button
				onclick={() => { filterType = ''; filterCanton = ''; filterStatut = ''; }}
				class="px-3 py-1.5 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Effacer filtres
			</button>
		{/if}
	</div>

	{#if data.signaux.length === 0}
		<EmptyState
			icon="notifications"
			title="Aucun signal d'affaires"
			description="Les signaux detectes depuis les sources publiques apparaitront ici."
			actionLabel="Ajouter manuellement"
			onAction={openCreate}
		/>
	{:else}
		<DataTable
			data={filteredSignaux}
			{columns}
			onRowClick={openDetail}
			searchPlaceholder="Rechercher un signal..."
		>
			{#snippet row(signal, _i)}
				<td class="px-4 py-2.5 w-32">
					<Badge label={formatTypeSignal(signal.type_signal)} variant="default" />
				</td>
				<td class="px-4 py-2.5 text-text">
					<span class="line-clamp-1">{signal.description_projet ?? '--'}</span>
				</td>
				<td class="px-4 py-2.5 text-text">{signal.maitre_ouvrage ?? '--'}</td>
				<td class="px-4 py-2.5 text-text w-20">{signal.canton ?? '--'}</td>
				<td class="px-4 py-2.5 text-text-muted w-24">{formatDate(signal.date_detection)}</td>
				<td class="px-4 py-2.5 w-28">
					<Badge label={signal.statut_traitement ?? 'nouveau'} variant={statutVariant(signal.statut_traitement)} />
				</td>
			{/snippet}
		</DataTable>
	{/if}
</div>

<!-- SlideOut detail signal -->
<SlideOut bind:open={slideOutOpen} title="Signal d'affaires">
	{#if selectedSignal}
		<div class="space-y-5">
			<div class="flex items-center gap-2">
				<Badge label={formatTypeSignal(selectedSignal.type_signal)} variant="default" />
				<Badge label={selectedSignal.statut_traitement ?? 'nouveau'} variant={statutVariant(selectedSignal.statut_traitement)} />
			</div>

			{#if selectedSignal.description_projet}
				<div class="text-sm">
					<span class="text-text-muted">Description du projet</span>
					<p class="font-medium text-text whitespace-pre-wrap">{selectedSignal.description_projet}</p>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Maitre d'ouvrage</span>
					<p class="font-medium text-text">{selectedSignal.maitre_ouvrage ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Architecte / Bureau</span>
					<p class="font-medium text-text">{selectedSignal.architecte_bureau ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Canton</span>
					<p class="font-medium text-text">{selectedSignal.canton ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Commune</span>
					<p class="font-medium text-text">{selectedSignal.commune ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Source</span>
					<p class="font-medium text-text">{selectedSignal.source_officielle ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Date publication</span>
					<p class="font-medium text-text">{formatDate(selectedSignal.date_publication)}</p>
				</div>
				<div>
					<span class="text-text-muted">Date detection</span>
					<p class="font-medium text-text">{formatDate(selectedSignal.date_detection)}</p>
				</div>
				<div>
					<span class="text-text-muted">Responsable</span>
					<p class="font-medium text-text">{selectedSignal.responsable_filmpro ?? '--'}</p>
				</div>
			</div>

			{#if selectedSignal.contacts}
				<div class="text-sm">
					<span class="text-text-muted">Contact maitre d'ouvrage</span>
					<a href="/contacts" class="block font-medium text-accent hover:underline">
						{selectedSignal.contacts.prenom ?? ''} {selectedSignal.contacts.nom ?? ''}
					</a>
				</div>
			{/if}

			{#if selectedSignal.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedSignal.notes_libres}</p>
				</div>
			{/if}

			{#if selectedSignal.opportunite_associee_id}
				<div class="text-sm p-3 bg-success/10 rounded-lg">
					<span class="text-success font-medium">Converti en opportunite</span>
					<a href="/pipeline" class="block text-accent hover:underline text-sm mt-1">Voir dans le pipeline</a>
				</div>
			{/if}

			<div class="flex flex-wrap gap-3 pt-4 border-t border-border">
				<button
					onclick={openEdit}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">edit</span>
					Modifier
				</button>

				{#if selectedSignal.statut_traitement !== 'converti' && selectedSignal.statut_traitement !== 'ecarte'}
					<button
						onclick={openConvertModal}
						class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
						Creer opportunite
					</button>

					<form method="POST" action="?/updateStatut" use:enhance={() => {
						return async ({ update }) => {
							slideOutOpen = false;
							selectedSignal = null;
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedSignal.id} />
						<input type="hidden" name="statut_traitement" value="ecarte" />
						<button
							type="submit"
							class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-danger cursor-pointer"
						>
							<span class="material-symbols-outlined text-[16px]">close</span>
							Ecarter
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</SlideOut>

<!-- Modal creation/edition signal -->
<ModalForm
	bind:open={modalOpen}
	title={editMode ? 'Modifier le signal' : 'Nouveau signal'}
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
		{#if editMode && selectedSignal}
			<input type="hidden" name="id" value={selectedSignal.id} />
		{/if}

		<div class="space-y-4">
			<div class="space-y-1">
				<label for="type_signal" class="block text-sm font-medium text-text">Type de signal</label>
				<select
					id="type_signal"
					bind:value={type_signal}
					class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
				>
					<option value="">-- Choisir --</option>
					{#each TYPES_SIGNAL as t}
						<option value={t}>{formatTypeSignal(t)}</option>
					{/each}
				</select>
			</div>
			<FormField label="Description du projet" type="textarea" bind:value={description_projet} />
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Maitre d'ouvrage" bind:value={maitre_ouvrage} />
				<FormField label="Architecte / Bureau" bind:value={architecte_bureau} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Canton" bind:value={canton} placeholder="GE, VD, VS..." />
				<FormField label="Commune" bind:value={commune} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Source officielle" bind:value={source_officielle} />
				<FormField label="Date publication" type="date" bind:value={date_publication} />
			</div>
			<FormField label="Notes" type="textarea" bind:value={notes_libres} />
		</div>

		<!-- Hidden fields -->
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
				{saving ? 'Enregistrement...' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>

<!-- Modal conversion signal -> opportunite -->
<ModalForm
	bind:open={convertModalOpen}
	title="Creer une opportunite depuis ce signal"
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
						await goto('/pipeline');
					} else {
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="signal_id" value={selectedSignal.id} />

			<div class="space-y-4">
				<div class="p-3 bg-surface-alt/50 rounded-lg text-sm">
					<p class="text-text-muted">Signal source</p>
					<p class="font-medium text-text">{formatTypeSignal(selectedSignal.type_signal)} -- {selectedSignal.maitre_ouvrage ?? ''}</p>
				</div>

				<FormField label="Titre de l'opportunite" bind:value={opp_titre} required />

				<input type="hidden" name="titre" value={opp_titre} />
				<input type="hidden" name="entreprise_id" value={opp_entreprise_id} />
			</div>

			<div class="flex justify-end gap-3 pt-4">
				<button
					type="button"
					onclick={() => convertModalOpen = false}
					class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
				>
					Annuler
				</button>
				<button
					type="submit"
					disabled={saving}
					class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer"
				>
					{saving ? 'Creation...' : 'Creer et aller au pipeline'}
				</button>
			</div>
		</form>
	{/if}
</ModalForm>
