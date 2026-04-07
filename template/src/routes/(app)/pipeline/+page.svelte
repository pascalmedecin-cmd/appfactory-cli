<script lang="ts">
	import { enhance } from '$app/forms';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Opp = (typeof data.opportunites)[number];

	const ETAPES = config.pipeline.etapes;

	let slideOutOpen = $state(false);
	let selectedOpp = $state<Opp | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let archiving = $state(false);
	let draggedId = $state<string | null>(null);
	let dragOverEtape = $state<string | null>(null);

	// Form fields
	let titre = $state('');
	let contact_id = $state('');
	let entreprise_id = $state('');
	let montant_estime = $state('');
	let etape_pipeline = $state('identification');
	let date_relance_prevue = $state('');
	let notes_libres = $state('');
	let responsable = $state('');

	const oppsByEtape = $derived.by(() => {
		const map: Record<string, Opp[]> = {};
		for (const e of ETAPES) map[e.key] = [];
		for (const opp of data.opportunites) {
			const key = opp.etape_pipeline ?? 'identification';
			if (map[key]) map[key].push(opp);
			else map['identification'].push(opp);
		}
		return map;
	});

	const totalByEtape = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const e of ETAPES) {
			map[e.key] = (oppsByEtape[e.key] ?? []).reduce((sum, o) => sum + (o.montant_estime ?? 0), 0);
		}
		return map;
	});

	function formatMontant(n: number | null): string {
		if (n == null || n === 0) return '';
		return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n);
	}

	function formatDate(d: string | null): string {
		if (!d) return '';
		return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' });
	}

	function isOverdue(d: string | null): boolean {
		if (!d) return false;
		return new Date(d) < new Date(new Date().toISOString().split('T')[0]);
	}

	function openDetail(opp: Opp) {
		selectedOpp = opp;
		slideOutOpen = true;
	}

	function openCreate(etape?: string) {
		editMode = false;
		resetForm();
		if (etape) etape_pipeline = etape;
		modalOpen = true;
	}

	function openEdit() {
		if (!selectedOpp) return;
		editMode = true;
		titre = selectedOpp.titre ?? '';
		contact_id = selectedOpp.contact_id ?? '';
		entreprise_id = selectedOpp.entreprise_id ?? '';
		montant_estime = selectedOpp.montant_estime?.toString() ?? '';
		etape_pipeline = selectedOpp.etape_pipeline ?? 'identification';
		date_relance_prevue = selectedOpp.date_relance_prevue ?? '';
		notes_libres = selectedOpp.notes_libres ?? '';
		responsable = selectedOpp.responsable ?? '';
		slideOutOpen = false;
		modalOpen = true;
	}

	function resetForm() {
		titre = ''; contact_id = ''; entreprise_id = ''; montant_estime = '';
		etape_pipeline = 'identification'; date_relance_prevue = ''; notes_libres = ''; responsable = '';
	}

	function etapeBadgeVariant(etape: string | null): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (etape) {
			case 'identification': return 'muted';
			case 'qualification': return 'default';
			case 'proposition': return 'accent';
			case 'negociation': return 'warning';
			case 'gagne': return 'success';
			case 'perdu': return 'danger';
			default: return 'muted';
		}
	}

	// Drag & drop
	function onDragStart(e: DragEvent, opp: Opp) {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', opp.id);
		draggedId = opp.id;
	}

	function onDragOver(e: DragEvent, etape: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverEtape = etape;
	}

	function onDragLeave() {
		dragOverEtape = null;
	}

	function onDrop(e: DragEvent, etape: string) {
		e.preventDefault();
		dragOverEtape = null;
		const id = e.dataTransfer?.getData('text/plain');
		if (!id) return;
		draggedId = null;

		// Submit move via hidden form
		const form = document.getElementById('move-form') as HTMLFormElement;
		const idInput = form.querySelector('[name="id"]') as HTMLInputElement;
		const etapeInput = form.querySelector('[name="etape_pipeline"]') as HTMLInputElement;
		idInput.value = id;
		etapeInput.value = etape;
		form.requestSubmit();
	}

	function onDragEnd() {
		draggedId = null;
		dragOverEtape = null;
	}
</script>

<!-- Hidden form for drag & drop moves -->
<form id="move-form" method="POST" action="?/move" use:enhance={() => {
	return async ({ update }) => { await update(); };
}} class="hidden">
	<input type="hidden" name="id" value="" />
	<input type="hidden" name="etape_pipeline" value="" />
</form>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-text">Pipeline</h1>
			<p class="text-sm text-text-muted">{data.opportunites.length} opportunité{data.opportunites.length > 1 ? 's' : ''}</p>
		</div>
		<button
			onclick={() => openCreate()}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			Nouvelle opportunité
		</button>
	</div>

	<!-- Kanban board -->
	<div class="flex gap-3 overflow-x-auto pb-4" style="min-height: calc(100vh - 200px);">
		{#each ETAPES as etape}
			{@const opps = oppsByEtape[etape.key] ?? []}
			{@const total = totalByEtape[etape.key] ?? 0}
			<div
				class="flex-shrink-0 w-64 flex flex-col bg-surface-alt/30 rounded-lg border border-border/50 {dragOverEtape === etape.key ? 'ring-2 ring-accent/40 bg-accent/5' : ''}"
				ondragover={(e: DragEvent) => onDragOver(e, etape.key)}
				ondragleave={onDragLeave}
				ondrop={(e: DragEvent) => onDrop(e, etape.key)}
				role="group"
				aria-label="Colonne {etape.label}"
			>
				<!-- Column header -->
				<div class="px-3 py-2.5 border-b border-border/50">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px] {etape.color}">{etape.icon}</span>
							<span class="text-sm font-semibold text-text">{etape.label}</span>
							<span class="text-xs text-text-muted bg-surface-alt rounded-full px-1.5 py-0.5">{opps.length}</span>
						</div>
						{#if etape.key !== 'gagne' && etape.key !== 'perdu'}
							<button
								onclick={() => openCreate(etape.key)}
								class="text-text-muted hover:text-accent cursor-pointer"
								title="Ajouter dans {etape.label}"
							>
								<span class="material-symbols-outlined text-[18px]">add</span>
							</button>
						{/if}
					</div>
					{#if total > 0}
						<p class="text-xs text-text-muted mt-1">{formatMontant(total)}</p>
					{/if}
				</div>

				<!-- Cards -->
				<div class="flex-1 p-2 space-y-2 overflow-y-auto">
					{#each opps as opp (opp.id)}
						<div
							class="bg-white rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer {draggedId === opp.id ? 'opacity-40' : ''}"
							draggable="true"
							ondragstart={(e: DragEvent) => onDragStart(e, opp)}
							ondragend={onDragEnd}
							onclick={() => openDetail(opp)}
							onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') openDetail(opp); }}
							role="button"
							tabindex="0"
						>
							<p class="text-sm font-medium text-text line-clamp-2">{opp.titre}</p>
							{#if opp.entreprises?.raison_sociale}
								<p class="text-xs text-text-muted mt-1 truncate">{opp.entreprises.raison_sociale}</p>
							{/if}
							<div class="flex items-center justify-between mt-2">
								{#if opp.montant_estime}
									<span class="text-xs font-medium text-primary">{formatMontant(opp.montant_estime)}</span>
								{:else}
									<span></span>
								{/if}
								{#if opp.date_relance_prevue}
									<span class="text-xs {isOverdue(opp.date_relance_prevue) ? 'text-danger font-medium' : 'text-text-muted'}">
										{formatDate(opp.date_relance_prevue)}
									</span>
								{/if}
							</div>
							{#if opp.contacts}
								<p class="text-xs text-text-muted mt-1 truncate">
									{opp.contacts.prenom ?? ''} {opp.contacts.nom ?? ''}
								</p>
							{/if}
						</div>
					{/each}

					{#if opps.length === 0}
						<div class="text-center py-6 text-xs text-text-muted">
							Aucune opportunité
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- SlideOut detail opportunite -->
<SlideOut bind:open={slideOutOpen} title={selectedOpp?.titre ?? ''}>
	{#if selectedOpp}
		<div class="space-y-5">
			<Badge label={selectedOpp.etape_pipeline ?? 'identification'} variant={etapeBadgeVariant(selectedOpp.etape_pipeline)} />

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Entreprise</span>
					{#if selectedOpp.entreprises?.raison_sociale}
						<a href="/entreprises" class="block font-medium text-accent hover:underline">{selectedOpp.entreprises.raison_sociale}</a>
					{:else}
						<p class="font-medium text-text">--</p>
					{/if}
				</div>
				<div>
					<span class="text-text-muted">Contact</span>
					{#if selectedOpp.contacts}
						<a href="/contacts" class="block font-medium text-accent hover:underline">{selectedOpp.contacts.prenom ?? ''} {selectedOpp.contacts.nom ?? ''}</a>
					{:else}
						<p class="font-medium text-text">--</p>
					{/if}
				</div>
				<div>
					<span class="text-text-muted">Montant estimé</span>
					<p class="font-medium text-text">{formatMontant(selectedOpp.montant_estime) || '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Relance prévue</span>
					<p class="font-medium {isOverdue(selectedOpp.date_relance_prevue) ? 'text-danger' : 'text-text'}">
						{selectedOpp.date_relance_prevue ? formatDate(selectedOpp.date_relance_prevue) : '--'}
					</p>
				</div>
				<div>
					<span class="text-text-muted">Responsable</span>
					<p class="font-medium text-text">{selectedOpp.responsable ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Créée le</span>
					<p class="font-medium text-text">{formatDate(selectedOpp.date_creation)}</p>
				</div>
			</div>

			{#if selectedOpp.signaux_affaires}
				<div class="text-sm">
					<span class="text-text-muted">Signal d'affaires lié</span>
					<p class="font-medium text-text">{selectedOpp.signaux_affaires.type_signal} -- {selectedOpp.signaux_affaires.description_projet ?? ''}</p>
				</div>
			{/if}

			{#if selectedOpp.motif_perte}
				<div class="text-sm">
					<span class="text-text-muted">Motif de perte</span>
					<p class="font-medium text-danger">{selectedOpp.motif_perte}</p>
				</div>
			{/if}

			{#if selectedOpp.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedOpp.notes_libres}</p>
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
				{#if selectedOpp.etape_pipeline !== 'perdu' && selectedOpp.etape_pipeline !== 'gagne'}
					<form method="POST" action="?/archive" use:enhance={({ cancel }) => {
						if (!confirm('Marquer cette opportunité comme perdue ?')) { cancel(); return; }
						archiving = true;
						return async ({ result, update }) => {
							archiving = false;
							slideOutOpen = false;
							selectedOpp = null;
							if (result.type === 'success') toasts.success('Opportunité marquée perdue');
							else toasts.error('Erreur lors de l\'archivage');
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedOpp.id} />
						<button
							type="submit"
							disabled={archiving}
							class="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50"
						>
							<span class="material-symbols-outlined text-[16px]">block</span>
							{archiving ? 'En cours…' : 'Marquer perdu'}
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</SlideOut>

<!-- Modal creation/edition -->
<ModalForm
	bind:open={modalOpen}
	title={editMode ? 'Modifier l\'opportunité' : 'Nouvelle opportunité'}
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
				if (result.type === 'success') toasts.success(editMode ? 'Opportunité modifiée' : 'Opportunité créée');
				else toasts.error('Erreur lors de l\'enregistrement');
				await update();
			};
		}}
	>
		{#if editMode && selectedOpp}
			<input type="hidden" name="id" value={selectedOpp.id} />
		{/if}

		<div class="space-y-4">
			<FormField label="Titre" bind:value={titre} required />
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-1">
					<label for="entreprise_id" class="block text-sm font-medium text-text">Entreprise</label>
					<select
						id="entreprise_id"
						bind:value={entreprise_id}
						class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
					>
						<option value="">-- Aucune --</option>
						{#each data.entreprises as e}
							<option value={e.id}>{e.raison_sociale}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label for="contact_id" class="block text-sm font-medium text-text">Contact</label>
					<select
						id="contact_id"
						bind:value={contact_id}
						class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
					>
						<option value="">-- Aucun --</option>
						{#each data.contacts as c}
							<option value={c.id}>{c.prenom ?? ''} {c.nom ?? ''}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Montant estimé (CHF)" type="number" bind:value={montant_estime} />
				<div class="space-y-1">
					<label for="etape_pipeline" class="block text-sm font-medium text-text">Etape</label>
					<select
						id="etape_pipeline"
						bind:value={etape_pipeline}
						class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
					>
						{#each ETAPES as e}
							<option value={e.key}>{e.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Date relance" type="date" bind:value={date_relance_prevue} />
				<FormField label="Responsable" bind:value={responsable} />
			</div>
			<FormField label="Notes" type="textarea" bind:value={notes_libres} />
		</div>

		<!-- Hidden fields for form submission -->
		<input type="hidden" name="titre" value={titre} />
		<input type="hidden" name="contact_id" value={contact_id} />
		<input type="hidden" name="entreprise_id" value={entreprise_id} />
		<input type="hidden" name="montant_estime" value={montant_estime} />
		<input type="hidden" name="etape_pipeline" value={etape_pipeline} />
		<input type="hidden" name="date_relance_prevue" value={date_relance_prevue} />
		<input type="hidden" name="notes_libres" value={notes_libres} />
		<input type="hidden" name="responsable" value={responsable} />

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
