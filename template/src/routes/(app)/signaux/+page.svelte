<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import CantonSelect from '$lib/components/CantonSelect.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import { calculerScore } from '$lib/scoring';
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
	let selectMode = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
	let batchDeleting = $state(false);
	let batchDeleteConfirm = $state(false);

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
			selectedIds = new Set(filteredSignaux.map(s => s.id));
		}
	}

	function exitSelectMode() {
		selectMode = false;
		selectedIds = new Set();
		batchDeleteConfirm = false;
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

	const SCORE_STYLES: Record<string, { icon: string; color: string; bg: string; label: string }> = {
		chaud: { icon: 'local_fire_department', color: 'text-danger', bg: 'bg-danger/10', label: 'Chaud' },
		tiede: { icon: 'thermostat', color: 'text-warning', bg: 'bg-warning/10', label: 'Tiède' },
		froid: { icon: 'ac_unit', color: 'text-accent', bg: 'bg-accent/10', label: 'Froid' },
		non_qualifie: { icon: 'remove', color: 'text-text-muted', bg: 'bg-surface', label: 'Non qualifié' },
	};

	function scoreLabel(score: number | null): string {
		if (score == null) return 'non_qualifie';
		if (score >= config.scoring.labels.chaud) return 'chaud';
		if (score >= config.scoring.labels.tiede) return 'tiede';
		if (score >= config.scoring.labels.froid) return 'froid';
		return 'non_qualifie';
	}

	function scoreStyle(score: number | null) {
		return SCORE_STYLES[scoreLabel(score)] ?? SCORE_STYLES.non_qualifie;
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
				<p class="text-sm text-text-muted">{filteredSignaux.length} {filteredSignaux.length > 1 ? 'signaux' : 'signal'}</p>
			</div>
			<div class="flex items-center gap-2">
				{#if data.signaux.length > 0}
					{#if selectMode}
						<button
							onclick={exitSelectMode}
							class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
						>
							Annuler
						</button>
					{:else}
						<button
							onclick={() => selectMode = true}
							class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text border border-border rounded-lg cursor-pointer"
						>
							<span class="material-symbols-outlined text-[18px]">checklist</span>
							Sélectionner
						</button>
					{/if}
				{/if}
				<button
					onclick={openCreate}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">add</span>
					Ajouter
				</button>
			</div>
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
		<!-- Barre actions batch -->
		{#if selectMode}
			<div class="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border">
				<button
					onclick={toggleSelectAll}
					class="flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">{selectedIds.size === filteredSignaux.length ? 'deselect' : 'select_all'}</span>
					{selectedIds.size === filteredSignaux.length ? 'Tout désélectionner' : 'Tout sélectionner'}
				</button>
				<span class="text-sm text-text-muted">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
				<div class="flex-1"></div>
				{#if batchDeleteConfirm}
					<form method="POST" action="?/deleteBatch" use:enhance={() => {
						batchDeleting = true;
						return async ({ result, update }) => {
							batchDeleting = false;
							batchDeleteConfirm = false;
							if (result.type === 'success') {
								toasts.success(`${selectedIds.size} signal/signaux supprimé(s)`);
								exitSelectMode();
							} else {
								toasts.error('Erreur lors de la suppression');
							}
							await update();
						};
					}}>
						<input type="hidden" name="ids" value={[...selectedIds].join(',')} />
						<button
							type="submit"
							disabled={batchDeleting}
							class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger/80 rounded-lg cursor-pointer disabled:opacity-50"
						>
							<span class="material-symbols-outlined text-[16px]">delete_forever</span>
							{batchDeleting ? 'Suppression…' : `Confirmer (${selectedIds.size})`}
						</button>
					</form>
					<button onclick={() => batchDeleteConfirm = false} class="text-sm text-text-muted hover:text-text cursor-pointer">Annuler</button>
				{:else}
					<button
						onclick={() => batchDeleteConfirm = true}
						disabled={selectedIds.size === 0}
						class="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="material-symbols-outlined text-[16px]">delete</span>
						Supprimer ({selectedIds.size})
					</button>
				{/if}
			</div>
		{/if}

		<!-- Signal cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each filteredSignaux as signal (signal.id)}
				<button
					onclick={() => selectMode ? toggleSelect(signal.id) : openDetail(signal)}
					class="bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer text-left w-full {selectMode && selectedIds.has(signal.id) ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'}"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							{#if selectMode}
								<span class="flex items-center justify-center w-10 h-10 rounded-lg {selectedIds.has(signal.id) ? 'bg-accent text-white' : 'bg-surface border border-border'}">
									<span class="material-symbols-outlined text-[22px]">{selectedIds.has(signal.id) ? 'check' : 'check_box_outline_blank'}</span>
								</span>
							{:else}
								<span class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/8">
									<span class="material-symbols-outlined text-[22px] text-primary">{typeIcon(signal.type_signal)}</span>
								</span>
							{/if}
							<div class="min-w-0">
								<p class="text-sm font-semibold text-text truncate">{formatTypeLabel(signal.type_signal)}</p>
								<p class="text-xs text-text-muted">{signal.canton ?? '--'} · {formatRelative(signal.date_detection)}</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<span class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {scoreStyle(signal.score_pertinence).bg} {scoreStyle(signal.score_pertinence).color}" title="Score {signal.score_pertinence ?? 0}/{config.scoring.maxPoints}">
								<span class="material-symbols-outlined text-[14px]">{scoreStyle(signal.score_pertinence).icon}</span>
								{signal.score_pertinence ?? 0}
							</span>
							<Badge label={statutLabel(signal.statut_traitement)} variant={statutVariant(signal.statut_traitement)} />
						</div>
					</div>

					<div class="mt-3 flex items-center gap-3 text-xs text-text-muted">
						{#if signal.maitre_ouvrage}
							<span class="flex items-center gap-1 truncate">
								<span class="material-symbols-outlined text-[14px]">person</span>
								{signal.maitre_ouvrage}
							</span>
						{/if}
						{#if signal.source_officielle}
							<span class="flex items-center gap-1 uppercase truncate">
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
		{@const sStyle = scoreStyle(selectedSignal.score_pertinence)}
		<div class="space-y-5">
			<!-- En-tête : type + statut + score -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<span class="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/8">
						<span class="material-symbols-outlined text-[28px] text-primary">{typeIcon(selectedSignal.type_signal)}</span>
					</span>
					<div>
						<p class="font-semibold text-text">{formatTypeLabel(selectedSignal.type_signal)}</p>
						<Badge label={statutLabel(selectedSignal.statut_traitement)} variant={statutVariant(selectedSignal.statut_traitement)} />
					</div>
				</div>
				<span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold {sStyle.bg} {sStyle.color}">
					<span class="material-symbols-outlined text-[18px]">{sStyle.icon}</span>
					{selectedSignal.score_pertinence ?? 0}/{config.scoring.maxPoints} — {sStyle.label}
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
				<h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Acteurs</h4>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Maître d'ouvrage</span>
						<p class="font-medium text-text">{selectedSignal.maitre_ouvrage ?? '--'}</p>
					</div>
					<div>
						<span class="text-text-muted">Architecte / Bureau</span>
						<p class="font-medium text-text">{selectedSignal.architecte_bureau ?? '--'}</p>
					</div>
					{#if selectedSignal.contacts}
						<div>
							<span class="text-text-muted">Contact lié</span>
							<a href="/contacts" class="block font-medium text-accent hover:underline">
								{selectedSignal.contacts.prenom ?? ''} {selectedSignal.contacts.nom ?? ''}
							</a>
						</div>
					{/if}
					<div>
						<span class="text-text-muted">Responsable</span>
						<p class="font-medium text-text">{selectedSignal.responsable_filmpro ?? '--'}</p>
					</div>
				</div>
			</div>

			<!-- Section : Localisation -->
			<div class="space-y-3">
				<h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Localisation</h4>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Canton</span>
						<p class="font-medium text-text">{selectedSignal.canton ?? '--'}</p>
					</div>
					<div>
						<span class="text-text-muted">Commune</span>
						<p class="font-medium text-text">{selectedSignal.commune ?? '--'}</p>
					</div>
				</div>
			</div>

			<!-- Section : Source & Dates -->
			<div class="space-y-3">
				<h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Source & dates</h4>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-text-muted">Source</span>
						<p class="font-medium text-text uppercase">{selectedSignal.source_officielle ?? '--'}</p>
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

			<!-- Section : Scoring -->
			{#if selectedSignal.notes_libres}
				<div class="space-y-3">
					<h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Scoring</h4>
					<div class="flex flex-wrap gap-2">
						{#each selectedSignal.notes_libres.split(', ') as critere}
							<span class="px-2 py-1 text-xs rounded-md bg-surface-alt/60 text-text">{critere}</span>
						{/each}
					</div>
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
				<CantonSelect bind:value={canton} />
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
