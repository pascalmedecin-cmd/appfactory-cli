<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Select from '$lib/components/Select.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import {
		formatMontantCompact,
		etapesVisibleForTab,
		pipelineIndicators,
		totalsByEtape,
		type PipelineTab,
	} from '$lib/utils/pipelineFormat';
	import PipelineIndicators from '$lib/components/pipeline/PipelineIndicators.svelte';
	import PipelineTabs from '$lib/components/pipeline/PipelineTabs.svelte';
	import PipelineColumn from '$lib/components/pipeline/PipelineColumn.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Opp = (typeof data.opportunites)[number];

	const ETAPES = config.pipeline.etapes;
	const ETAPE_OPTIONS = ETAPES.map((e) => ({ value: e.key, label: e.label }));
	const ETAPE_BY_KEY = Object.fromEntries(ETAPES.map((e) => [e.key, e]));

	const entrepriseOptions = $derived(data.entreprises.map((e) => ({ value: e.id, label: e.raison_sociale })));
	const contactOptions = $derived(
		data.contacts.map((c) => ({
			value: c.id,
			label: `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() || '(sans nom)',
		}))
	);

	// UI state
	let activeTab: PipelineTab = $state('en-cours');
	let slideOutOpen = $state(false);
	let selectedOpp = $state<Opp | null>(null);
	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let archiving = $state(false);
	let confirmArchiveOpen = $state(false);
	let archiveFormEl: HTMLFormElement | null = $state(null);
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

	const totals = $derived(totalsByEtape(data.opportunites));
	const indicators = $derived(pipelineIndicators(data.opportunites));

	const tabsSpec = $derived([
		{
			key: 'en-cours' as PipelineTab,
			label: 'En cours',
			count: indicators.active,
		},
		{
			key: 'closed' as PipelineTab,
			label: 'Closed',
			count: (totals['gagne']?.count ?? 0) + (totals['perdu']?.count ?? 0),
		},
		{
			key: 'toutes' as PipelineTab,
			label: 'Toutes',
			count: data.opportunites.length,
		},
	]);

	const etapesVisible = $derived(
		etapesVisibleForTab(activeTab)
			.map((k) => ETAPE_BY_KEY[k])
			.filter(Boolean)
	);

	$effect(() => {
		const total = data.opportunites.length;
		const value = formatMontantCompact(indicators.valueActive);
		const valueLabel = value ? ` · ${value} en cours` : '';
		$pageSubtitle = total === 0 ? 'Aucune opportunité' : `${total} opportunité${total > 1 ? 's' : ''}${valueLabel}`;
	});

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
		titre = '';
		contact_id = '';
		entreprise_id = '';
		montant_estime = '';
		etape_pipeline = 'identification';
		date_relance_prevue = '';
		notes_libres = '';
		responsable = '';
	}

	function etapeBadgeVariant(etape: string | null): 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (etape) {
			case 'identification':
				return 'muted';
			case 'qualification':
				return 'default';
			case 'proposition':
				return 'info';
			case 'negociation':
				return 'warning';
			case 'gagne':
				return 'success';
			case 'perdu':
				return 'danger';
			default:
				return 'muted';
		}
	}

	function etapeLabel(key: string | null): string {
		if (!key) return '';
		return ETAPE_BY_KEY[key]?.label ?? key;
	}

	// Drag & drop
	function onCardDragStart(e: DragEvent, opp: Opp) {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', opp.id);
		draggedId = opp.id;
	}

	function onColumnDragOver(e: DragEvent, etape: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverEtape = etape;
	}

	function onColumnDragLeave() {
		dragOverEtape = null;
	}

	function onColumnDrop(e: DragEvent, etape: string) {
		e.preventDefault();
		dragOverEtape = null;
		const id = e.dataTransfer?.getData('text/plain');
		if (!id) return;
		draggedId = null;

		const form = document.getElementById('move-form') as HTMLFormElement | null;
		if (!form) return;
		const idInput = form.querySelector('[name="id"]') as HTMLInputElement | null;
		const etapeInput = form.querySelector('[name="etape_pipeline"]') as HTMLInputElement | null;
		if (!idInput || !etapeInput) return;
		idInput.value = id;
		etapeInput.value = etape;
		form.requestSubmit();
	}

	function onCardDragEnd() {
		draggedId = null;
		dragOverEtape = null;
	}
</script>

<!-- Hidden form for drag & drop moves -->
<form
	id="move-form"
	method="POST"
	action="?/move"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'success') toasts.success('Opportunité déplacée');
			else if (result.type === 'failure') toasts.error('Erreur lors du déplacement');
			await update();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="id" value="" />
	<input type="hidden" name="etape_pipeline" value="" />
</form>

<div class="page">
	<div class="page-actions">
		<button
			type="button"
			class="btn btn-primary"
			onclick={() => openCreate()}
		>
			<Icon name="add" size={18} />
			Nouvelle opportunité
		</button>
	</div>

	<PipelineIndicators values={indicators} />

	<PipelineTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)} />

	<div
		class="kanban-wrap"
		role="tabpanel"
		id={`panel-${activeTab}`}
		aria-labelledby={`tab-${activeTab}`}
	>
		<div class="kanban kanban--{activeTab}">
			{#each etapesVisible as etape (etape.key)}
				{@const opps = oppsByEtape[etape.key] ?? []}
				{@const total = totals[etape.key]?.sum ?? 0}
				<PipelineColumn
					{etape}
					{opps}
					{total}
					dragOver={dragOverEtape === etape.key}
					{draggedId}
					onCardClick={openDetail}
					{onCardDragStart}
					{onCardDragEnd}
					{onColumnDragOver}
					{onColumnDragLeave}
					{onColumnDrop}
					onAddClick={(k) => openCreate(k)}
				/>
			{/each}
		</div>
	</div>
</div>

<button
	type="button"
	class="fab"
	aria-label="Nouvelle opportunité"
	onclick={() => openCreate()}
>
	<Icon name="add" size={20} />
</button>

<!-- SlideOut detail opportunité -->
<SlideOut bind:open={slideOutOpen} title={selectedOpp?.titre ?? ''}>
	{#if selectedOpp}
		<div class="space-y-6">
			<Badge label={etapeLabel(selectedOpp.etape_pipeline)} variant={etapeBadgeVariant(selectedOpp.etape_pipeline)} />

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Entreprise</span>
					{#if selectedOpp.entreprises?.raison_sociale}
						<a href="/entreprises" class="block font-medium text-primary hover:underline">
							{selectedOpp.entreprises.raison_sociale}
						</a>
					{:else}
						<p class="font-medium text-text">--</p>
					{/if}
				</div>
				<div>
					<span class="text-text-muted">Contact</span>
					{#if selectedOpp.contacts}
						<a href="/contacts" class="block font-medium text-primary hover:underline">
							{selectedOpp.contacts.prenom ?? ''} {selectedOpp.contacts.nom ?? ''}
						</a>
					{:else}
						<p class="font-medium text-text">--</p>
					{/if}
				</div>
				<div>
					<span class="text-text-muted">Montant estimé</span>
					<p class="font-medium text-text tabular-nums">{formatMontantCompact(selectedOpp.montant_estime) ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Relance prévue</span>
					<p class="font-medium text-text">
						{selectedOpp.date_relance_prevue
							? new Date(selectedOpp.date_relance_prevue).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
							: '--'}
					</p>
				</div>
				<div>
					<span class="text-text-muted">Responsable</span>
					<p class="font-medium text-text">{selectedOpp.responsable ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Créée le</span>
					<p class="font-medium text-text">
						{selectedOpp.date_creation
							? new Date(selectedOpp.date_creation).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
							: '--'}
					</p>
				</div>
			</div>

			{#if selectedOpp.signaux_affaires}
				<div class="text-sm">
					<span class="text-text-muted">Signal d'affaires lié</span>
					<p class="font-medium text-text">
						{selectedOpp.signaux_affaires.type_signal} -- {selectedOpp.signaux_affaires.description_projet ?? ''}
					</p>
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
					class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
				>
					<Icon name="edit" size={16} />
					Modifier
				</button>
				{#if selectedOpp.etape_pipeline !== 'perdu' && selectedOpp.etape_pipeline !== 'gagne'}
					<form
						bind:this={archiveFormEl}
						method="POST"
						action="?/archive"
						use:enhance={() => {
							archiving = true;
							return async ({ result, update }) => {
								archiving = false;
								slideOutOpen = false;
								selectedOpp = null;
								if (result.type === 'success') toasts.success('Opportunité marquée perdue');
								else toasts.error("Erreur lors de l'archivage");
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={selectedOpp.id} />
						<button
							type="button"
							onclick={() => (confirmArchiveOpen = true)}
							disabled={archiving}
							class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-danger hover:bg-danger/5 rounded-lg cursor-pointer disabled:opacity-50"
						>
							<Icon name="block" size={16} />
							{archiving ? 'En cours…' : 'Marquer perdu'}
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</SlideOut>

<!-- Modal création/édition -->
<ModalForm
	bind:open={modalOpen}
	title={editMode ? "Modifier l'opportunité" : 'Nouvelle opportunité'}
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
				else toasts.error("Erreur lors de l'enregistrement");
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
				<Select id="entreprise_id" label="Entreprise" placeholder="-- Aucune --" bind:value={entreprise_id} options={entrepriseOptions} />
				<Select id="contact_id" label="Contact" placeholder="-- Aucun --" bind:value={contact_id} options={contactOptions} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Montant estimé (CHF)" type="number" bind:value={montant_estime} />
				<Select id="etape_pipeline" label="Étape" bind:value={etape_pipeline} options={ETAPE_OPTIONS} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Date relance" type="date" bind:value={date_relance_prevue} />
				<FormField label="Responsable" bind:value={responsable} />
			</div>
			<FormField label="Notes" type="textarea" bind:value={notes_libres} />
		</div>

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
				{saving ? 'Enregistrement...' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>

<ConfirmModal
	bind:open={confirmArchiveOpen}
	title="Marquer cette opportunité comme perdue ?"
	message="L'opportunité passera en statut perdu. Vous pourrez toujours la consulter dans le pipeline."
	confirmLabel="Marquer perdu"
	variant="warning"
	loading={archiving}
	onConfirm={() => {
		confirmArchiveOpen = false;
		archiveFormEl?.requestSubmit();
	}}
/>

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

	.kanban-wrap {
		flex: 1;
		padding: 20px 32px 40px;
		overflow-x: auto;
	}
	.kanban {
		display: grid;
		gap: 16px;
		min-height: calc(100vh - 360px);
	}
	.kanban--en-cours {
		grid-template-columns: repeat(4, minmax(280px, 1fr));
	}
	.kanban--closed {
		grid-template-columns: repeat(2, minmax(280px, 1fr));
		max-width: 720px;
	}
	.kanban--toutes {
		grid-template-columns: repeat(6, minmax(280px, 1fr));
	}

	@media (max-width: 1280px) {
		.kanban--toutes {
			grid-template-columns: repeat(6, 280px);
		}
	}
	@media (max-width: 1024px) {
		.kanban--en-cours,
		.kanban--toutes {
			grid-template-columns: repeat(2, minmax(280px, 1fr));
		}
		.page-actions {
			padding: 12px 24px;
		}
		.kanban-wrap {
			padding: 16px 24px 32px;
		}
	}
	@media (max-width: 768px) {
		.kanban--en-cours,
		.kanban--closed,
		.kanban--toutes {
			grid-template-columns: 1fr;
		}
		.page-actions {
			display: none;
		}
		.kanban-wrap {
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
