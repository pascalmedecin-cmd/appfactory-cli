<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Signal = (typeof data.signaux)[number];

	let slideOutOpen = $state(false);
	let selectedSignal = $state<Signal | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let convertModalOpen = $state(false);
	let deleteConfirm = $state<string | null>(null);

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

	const TYPES_MAP = new Map(config.signaux.types.map(t => [t.key, t.label]));

	const TYPE_ICONS: Record<string, string> = {
		appel_offres: 'gavel',
		permis_construire: 'construction',
		creation_entreprise: 'domain_add',
		demenagement: 'local_shipping',
		expansion: 'trending_up',
		fusion_acquisition: 'merge',
		autre: 'info',
	};

	const STATUTS = [
		{ key: 'nouveau', label: 'Nouveau', variant: 'warning' as const },
		{ key: 'en_analyse', label: 'En analyse', variant: 'accent' as const },
		{ key: 'interesse', label: 'Intéressé', variant: 'success' as const },
		{ key: 'ecarte', label: 'Écarté', variant: 'muted' as const },
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

	const countByStatut = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const s of data.signaux) {
			const st = s.statut_traitement ?? 'nouveau';
			counts[st] = (counts[st] ?? 0) + 1;
		}
		return counts;
	});

	function formatTypeLabel(type: string | null): string {
		if (!type) return '--';
		return TYPES_MAP.get(type as typeof config.signaux.types[number]['key']) ?? type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
	}

	function typeIcon(type: string | null): string {
		return TYPE_ICONS[type ?? ''] ?? 'info';
	}

	function formatDate(d: string | null): string {
		if (!d) return '--';
		return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
	}

	function formatRelative(d: string | null): string {
		if (!d) return '--';
		const diff = Date.now() - new Date(d).getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		if (days === 0) return "Aujourd'hui";
		if (days === 1) return 'Hier';
		if (days < 7) return `Il y a ${days} jours`;
		if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
		return formatDate(d);
	}

	function statutVariant(statut: string | null): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		const found = STATUTS.find(s => s.key === statut);
		return found?.variant ?? 'muted';
	}

	function statutLabel(statut: string | null): string {
		const found = STATUTS.find(s => s.key === statut);
		return found?.label ?? statut ?? 'Nouveau';
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

<div class="space-y-5">
	<!-- Header -->
	<div>
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

		<!-- Bandeau explicatif -->
		<div class="mt-3 flex items-start gap-3 p-4 bg-primary/5 border border-primary/15 rounded-lg">
			<span class="material-symbols-outlined text-[22px] text-primary mt-0.5">radar</span>
			<div>
				<p class="text-sm text-text">
					Détectez les opportunités business avant vos concurrents : appels d'offres, permis de construire, créations d'entreprises.
				</p>
				<p class="text-xs text-text-muted mt-1">
					Ajoutez des signaux manuellement ou laissez la veille automatique vous alerter sur le dashboard.
				</p>
			</div>
		</div>
	</div>

	<!-- Stats rapides -->
	{#if data.signaux.length > 0}
		<div class="flex gap-3 flex-wrap">
			{#each STATUTS as s}
				{@const count = countByStatut[s.key] ?? 0}
				{#if count > 0}
					<button
						onclick={() => filterStatut = filterStatut === s.key ? '' : s.key}
						class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border transition-colors cursor-pointer {filterStatut === s.key ? 'bg-accent/10 border-accent text-accent font-medium' : 'bg-white border-border text-text-muted hover:border-accent/30'}"
					>
						<Badge label={String(count)} variant={s.variant} />
						{s.label}
					</button>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Filters -->
	<div class="flex gap-3 flex-wrap">
		<select
			bind:value={filterType}
			class="px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
		>
			<option value="">Tous les types</option>
			{#each config.signaux.types as t}
				<option value={t.key}>{t.label}</option>
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
		{#if filterType || filterCanton || filterStatut}
			<button
				onclick={() => { filterType = ''; filterCanton = ''; filterStatut = ''; }}
				class="px-3 py-1.5 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Effacer filtres
			</button>
		{/if}
	</div>

	<!-- Contenu -->
	{#if data.signaux.length === 0}
		<!-- État vide -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg border border-border p-6">
				<div class="flex items-center gap-3 mb-3">
					<span class="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10">
						<span class="material-symbols-outlined text-[22px] text-accent">edit_note</span>
					</span>
					<h3 class="font-semibold text-text">Ajout manuel</h3>
				</div>
				<p class="text-sm text-text-muted mb-4">
					Vous avez repéré un appel d'offres, un permis de construire ou une opportunité ? Ajoutez-le comme signal pour le suivre.
				</p>
				<button
					onclick={openCreate}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">add</span>
					Ajouter un signal
				</button>
			</div>

			<div class="bg-white rounded-lg border border-border p-6">
				<div class="flex items-center gap-3 mb-3">
					<span class="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10">
						<span class="material-symbols-outlined text-[22px] text-warning">notifications_active</span>
					</span>
					<h3 class="font-semibold text-text">Veille automatique</h3>
				</div>
				<p class="text-sm text-text-muted mb-2">
					Le système surveille les sources publiques et vous alerte quand de nouveaux signaux apparaissent.
				</p>
				<ul class="text-sm text-text-muted space-y-1.5">
					<li class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
						Scan quotidien des marchés publics (SIMAP)
					</li>
					<li class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
						Alertes sur le Dashboard
					</li>
					<li class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
						Conversion en opportunité en un clic
					</li>
				</ul>
			</div>
		</div>
	{:else}
		<!-- Signal cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each filteredSignaux as signal (signal.id)}
				<button
					onclick={() => openDetail(signal)}
					class="bg-white rounded-lg border border-border p-4 hover:shadow-md hover:border-accent/30 transition-all cursor-pointer text-left w-full"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							<span class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/8">
								<span class="material-symbols-outlined text-[22px] text-primary">{typeIcon(signal.type_signal)}</span>
							</span>
							<div class="min-w-0">
								<p class="text-sm font-semibold text-text truncate">{formatTypeLabel(signal.type_signal)}</p>
								<p class="text-xs text-text-muted">{signal.canton ?? '--'} · {formatRelative(signal.date_detection)}</p>
							</div>
						</div>
						<Badge label={statutLabel(signal.statut_traitement)} variant={statutVariant(signal.statut_traitement)} />
					</div>

					{#if signal.description_projet}
						<p class="mt-3 text-sm text-text line-clamp-2">{signal.description_projet}</p>
					{/if}

					<div class="mt-3 flex items-center gap-3 text-xs text-text-muted">
						{#if signal.maitre_ouvrage}
							<span class="flex items-center gap-1 truncate">
								<span class="material-symbols-outlined text-[14px]">person</span>
								{signal.maitre_ouvrage}
							</span>
						{/if}
						{#if signal.source_officielle}
							<span class="flex items-center gap-1 truncate">
								<span class="material-symbols-outlined text-[14px]">source</span>
								{signal.source_officielle}
							</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		{#if filteredSignaux.length === 0}
			<div class="text-center py-8">
				<span class="material-symbols-outlined text-[48px] text-text-muted/30">filter_alt_off</span>
				<p class="mt-2 text-sm text-text-muted">Aucun signal ne correspond aux filtres.</p>
				<button
					onclick={() => { filterType = ''; filterCanton = ''; filterStatut = ''; }}
					class="mt-2 text-sm text-accent hover:underline cursor-pointer"
				>
					Effacer les filtres
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- SlideOut detail signal -->
<SlideOut bind:open={slideOutOpen} title="Signal d'affaires">
	{#if selectedSignal}
		<div class="space-y-5">
			<!-- Type + statut -->
			<div class="flex items-center gap-3">
				<span class="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/8">
					<span class="material-symbols-outlined text-[28px] text-primary">{typeIcon(selectedSignal.type_signal)}</span>
				</span>
				<div>
					<p class="font-semibold text-text">{formatTypeLabel(selectedSignal.type_signal)}</p>
					<Badge label={statutLabel(selectedSignal.statut_traitement)} variant={statutVariant(selectedSignal.statut_traitement)} />
				</div>
			</div>

			{#if selectedSignal.description_projet}
				<div class="text-sm">
					<span class="text-text-muted">Description du projet</span>
					<p class="font-medium text-text whitespace-pre-wrap">{selectedSignal.description_projet}</p>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Maître d'ouvrage</span>
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
					<span class="text-text-muted">Date détection</span>
					<p class="font-medium text-text">{formatRelative(selectedSignal.date_detection)}</p>
				</div>
				<div>
					<span class="text-text-muted">Responsable</span>
					<p class="font-medium text-text">{selectedSignal.responsable_filmpro ?? '--'}</p>
				</div>
			</div>

			{#if selectedSignal.contacts}
				<div class="text-sm">
					<span class="text-text-muted">Contact maître d'ouvrage</span>
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
					<span class="text-success font-medium">Converti en opportunité</span>
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
						Créer opportunité
					</button>

					<form method="POST" action="?/updateStatut" use:enhance={() => {
						return async ({ result, update }) => {
							slideOutOpen = false;
							selectedSignal = null;
							if (result.type === 'success') toasts.success('Signal écarté');
							else toasts.error('Erreur lors de la mise à jour');
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
							Écarter
						</button>
					</form>
				{/if}

				<!-- Supprimer -->
				{#if deleteConfirm === selectedSignal.id}
					<form method="POST" action="?/delete" use:enhance={() => {
						return async ({ result, update }) => {
							slideOutOpen = false;
							selectedSignal = null;
							deleteConfirm = null;
							if (result.type === 'success') toasts.success('Signal supprimé');
							else toasts.error('Erreur lors de la suppression');
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedSignal.id} />
						<button
							type="submit"
							class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger/80 rounded-lg cursor-pointer"
						>
							<span class="material-symbols-outlined text-[16px]">delete_forever</span>
							Confirmer la suppression
						</button>
					</form>
					<button
						onclick={() => deleteConfirm = null}
						class="px-3 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
					>
						Annuler
					</button>
				{:else}
					<button
						onclick={() => deleteConfirm = selectedSignal?.id ?? null}
						class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-danger cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">delete</span>
						Supprimer
					</button>
				{/if}
			</div>
		</div>
	{/if}
</SlideOut>

<!-- Modal creation/edition signal (allégée en création) -->
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
			return async ({ result, update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
				if (result.type === 'success') toasts.success(editMode ? 'Signal modifié' : 'Signal créé');
				else toasts.error('Erreur lors de l\'enregistrement');
				await update();
			};
		}}
	>
		{#if editMode && selectedSignal}
			<input type="hidden" name="id" value={selectedSignal.id} />
		{/if}

		<div class="space-y-4">
			<div class="space-y-1">
				<label for="type_signal" class="block text-sm font-medium text-text">Type de signal <span class="text-danger">*</span></label>
				<select
					id="type_signal"
					bind:value={type_signal}
					class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
				>
					<option value="">-- Choisir --</option>
					{#each config.signaux.types as t}
						<option value={t.key}>{t.label}</option>
					{/each}
				</select>
			</div>
			<FormField label="Description du projet" type="textarea" bind:value={description_projet} />
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Canton" bind:value={canton} placeholder="GE, VD, VS..." />
				<FormField label="Maître d'ouvrage" bind:value={maitre_ouvrage} />
			</div>

			{#if editMode}
				<div class="grid grid-cols-2 gap-4">
					<FormField label="Architecte / Bureau" bind:value={architecte_bureau} />
					<FormField label="Commune" bind:value={commune} />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<FormField label="Source officielle" bind:value={source_officielle} />
					<FormField label="Date publication" type="date" bind:value={date_publication} />
				</div>
				<FormField label="Notes" type="textarea" bind:value={notes_libres} />
			{/if}
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
					<p class="font-medium text-text">{formatTypeLabel(selectedSignal.type_signal)} — {selectedSignal.maitre_ouvrage ?? ''}</p>
				</div>

				<FormField label="Titre de l'opportunité" bind:value={opp_titre} required />

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
					{saving ? 'Création...' : 'Créer et aller au pipeline'}
				</button>
			</div>
		</form>
	{/if}
</ModalForm>
