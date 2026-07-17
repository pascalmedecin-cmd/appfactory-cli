<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Select from '$lib/components/Select.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import PageBand from '$lib/components/PageBand.svelte';
	import { page } from '$app/stores';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { isBandeauActive } from '$lib/pageBandeau';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import {
		formatMontantCompact,
		etapesVisibleForTab,
		etapeLabel,
		pipelineIndicators,
		totalsByEtape,
		etapeAccent,
		entrepriseInitials,
		type PipelineTab,
	} from '$lib/utils/pipelineFormat';
	import { formatTypeLabel } from '$lib/utils/signauxFormat';
	import { sourceMetaFor, relativeTimeFr } from '$lib/utils/entreprisesFormat';
	import KpiStrip, { type KpiItem } from '$lib/components/KpiStrip.svelte';
	import SourcePill from '$lib/components/SourcePill.svelte';
	import StagePill from '$lib/components/StagePill.svelte';
	import PipelineIndicators from '$lib/components/pipeline/PipelineIndicators.svelte';
	import PipelineTabs from '$lib/components/pipeline/PipelineTabs.svelte';
	import PipelineColumn from '$lib/components/pipeline/PipelineColumn.svelte';
	import PipelineMobileAccordion from '$lib/components/pipeline/PipelineMobileAccordion.svelte';
	import { buildAccordionStages } from '$lib/components/pipeline/pipeline-mobile-accordion.helpers';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Opp = (typeof data.opportunites)[number];

	const ETAPES = config.pipeline.etapes;
	const ETAPE_OPTIONS = ETAPES.map((e) => ({ value: e.key, label: e.label }));
	const ETAPE_BY_KEY = Object.fromEntries(ETAPES.map((e) => [e.key, e]));

	// Motif de perte : liste fermée adaptée FilmPro (B2B vitrage), jamais « Autre »
	// (feedback_no_autre_in_lists). Le champ libre « précisions » complète la catégorie.
	const MOTIF_PERTE_OPTIONS = [
		{ value: 'Budget / prix', label: 'Budget / prix' },
		{ value: 'Délai / timing', label: 'Délai / timing' },
		{ value: 'Concurrent retenu', label: 'Concurrent retenu' },
		{ value: 'Projet abandonné', label: 'Projet abandonné' },
		{ value: 'Pas de besoin', label: 'Pas de besoin' },
		{ value: 'Sans réponse', label: 'Sans réponse' },
	];

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
	let converting = $state(false);
	let lostModalOpen = $state(false);
	let motifPerteCat = $state('');
	let motifPerteDetail = $state('');
	// motif_perte sérialisé : « Catégorie - précisions », cappé à 500 (max schéma) pour
	// garantir un submit valide sans dépendre d'un maxlength côté input.
	const motifPerteValue = $derived(
		(motifPerteDetail.trim()
			? motifPerteCat
				? `${motifPerteCat} - ${motifPerteDetail.trim()}`
				: motifPerteDetail.trim()
			: motifPerteCat
		).slice(0, 500)
	);
	// Reset idempotent : la saisie vit dans le parent et le modal est réutilisé pour
	// N opportunités. On vide à CHAQUE ouverture (fix racine) + sur toutes les sorties
	// (Annuler / Échap / croix / succès) pour éviter qu'un motif abandonné contamine
	// l'archivage de l'opportunité suivante.
	function resetMotifPerte() {
		motifPerteCat = '';
		motifPerteDetail = '';
	}
	let moveFormEl: HTMLFormElement | null = $state(null);
	let moveFormId = $state('');
	let moveFormEtape = $state('');
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

	// Lot 2 : « Convertir en client » visible seulement pour une opportunité issue
	// d'un prospect (prospect_lead_id non-null), pas encore convertie (sans entreprise_id)
	// et en étape active (ni gagné ni perdu). `prospect_lead_id` n'est pas encore dans les
	// types Database générés (migration 20260701000002) → lecture par cast local.
	const canConvertToClient = $derived.by(() => {
		if (!selectedOpp) return false;
		const leadId = (selectedOpp as { prospect_lead_id?: string | null }).prospect_lead_id;
		return (
			!!leadId &&
			!selectedOpp.entreprise_id &&
			selectedOpp.etape_pipeline !== 'gagne' &&
			selectedOpp.etape_pipeline !== 'perdu'
		);
	});

	// Vague 2 « listes premium » (même flag JWT que les autres pages). OFF → rendu actuel,
	// zéro régression. Delta kanban : bande géante → strip de chips, cartes à accent d'étape
	// + logo, hero fiche premium. Valeurs issues de `pipelineIndicators` (helper pur testé).
	const premium = $derived(data.featureFlags?.ffCrmListesV2 === true);
	// Cohérence UI : bandeau de page in-page (flag ff_page_bandeau). Source unique isBandeauActive,
	// partagée avec le Header → jamais de titre double ni absent. OFF → rendu actuel strict. La valeur
	// « en cours » reste sur la strip KPI ; la pastille du bandeau ne porte que le compte (compact).
	const bandeau = $derived(isBandeauActive(data.featureFlags, $page.url.pathname));
	const bandeauCount = $derived(
		data.opportunites.length === 0
			? 'Aucune opportunité'
			: `${data.opportunites.length} opportunité${data.opportunites.length > 1 ? 's' : ''}`,
	);
	const kpiItems = $derived<KpiItem[]>([
		{ icon: 'business', value: indicators.active, label: indicators.active === 1 ? 'Opportunité active' : 'Opportunités actives', tone: 'primary' },
		{ icon: 'trending_up', value: formatMontantCompact(indicators.valueActive) ?? '0 CHF', label: 'Valeur pipeline', tone: 'convert' },
		{ icon: 'emoji_events', value: indicators.wonThisMonthCount, label: 'Gagné ce mois', tone: 'success' },
		{ icon: 'schedule', value: indicators.overdue, label: 'Relances en retard', tone: 'warn', highlight: indicators.overdue > 0 },
	]);

	const tabsSpec = $derived([
		{
			key: 'en-cours' as PipelineTab,
			label: 'En cours',
			count: indicators.active,
		},
		{
			key: 'closed' as PipelineTab,
			label: 'Conclues',
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

	// Refonte mobile S191 : accordéon en viewport < 1024px si flag ON.
	// Pattern $effect SSR-safe — cf. memory/feedback_svelte5_ondestroy_ssr_window_undefined.md.
	let isMobileViewport = $state(false);
	$effect(() => {
		const mql = window.matchMedia('(max-width: 1023.98px)');
		const sync = () => (isMobileViewport = mql.matches);
		sync();
		mql.addEventListener('change', sync);
		return () => mql.removeEventListener('change', sync);
	});
	const useMobileAccordion = $derived(
		isMobileViewport && data.featureFlags?.ffCrmMobileV2 === true,
	);
	const accordionStages = $derived(
		buildAccordionStages(
			data.opportunites.map((o) => ({
				id: o.id,
				etape_pipeline: o.etape_pipeline,
				montant_estime: o.montant_estime,
				date_relance_prevue: o.date_relance_prevue,
				titre: o.titre,
			})),
			etapesVisible.map((e) => ({ key: e.key, label: e.label, icon: e.icon })),
		),
	);

	$effect(() => {
		const total = data.opportunites.length;
		const value = formatMontantCompact(indicators.valueActive);
		const valueLabel = value ? ` · ${value} en cours` : '';
		$pageSubtitle = total === 0 ? 'Aucune opportunité' : `${total} opportunité${total > 1 ? 's' : ''}${valueLabel}`;
	});

	function openDetail(opp: { id: string }) {
		// Le composant PipelineColumn fournit un Opp minimal (subset). On retrouve
		// le record complet depuis data.opportunites via id pour le slide-out.
		const full = data.opportunites.find((o) => o.id === opp.id);
		if (full) {
			selectedOpp = full;
			slideOutOpen = true;
		}
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

	// Drag & drop
	function onCardDragStart(e: DragEvent, opp: { id: string }) {
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

	async function onColumnDrop(e: DragEvent, etape: string) {
		e.preventDefault();
		dragOverEtape = null;
		const id = e.dataTransfer?.getData('text/plain');
		draggedId = null;
		if (!id) return;
		// Defense in depth : drop externe ou id altéré → ignore silencieusement
		if (!data.opportunites.some((o) => o.id === id)) return;
		moveFormId = id;
		moveFormEtape = etape;
		// Svelte 5 flushe le DOM de façon asynchrone : sans tick(), requestSubmit()
		// sérialiserait les valeurs du rendu précédent (1er drop vide, suivants stale).
		await tick();
		moveFormEl?.requestSubmit();
	}

	function onCardDragEnd() {
		draggedId = null;
		dragOverEtape = null;
	}
</script>

<!-- Hidden form for drag & drop moves (bind:this, no DOM lookup) -->
<form
	bind:this={moveFormEl}
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
	<input type="hidden" name="id" value={moveFormId} />
	<input type="hidden" name="etape_pipeline" value={moveFormEtape} />
</form>

<div class="ws-page">
	{#if bandeau}
		<PageBand
			icon="conversion_path"
			eyebrow="Les affaires"
			title="Pipeline"
			desc="De la première piste au devis signé, où en est chaque opportunité."
			descMobile="De la piste au devis signé."
			count={bandeauCount}
		>
			{#snippet actions()}
				<button
					type="button"
					class="ws-btn ws-btn-primary"
					onclick={() => openCreate()}
				>
					<Icon name="add" size={18} />
					Nouvelle opportunité
				</button>
			{/snippet}
		</PageBand>
	{:else}
		<div class="ws-page-actions">
			<button
				type="button"
				class="ws-btn ws-btn-primary"
				onclick={() => openCreate()}
			>
				<Icon name="add" size={18} />
				Nouvelle opportunité
			</button>
		</div>
	{/if}

	{#if premium}
		<KpiStrip items={kpiItems} ariaLabel="Indicateurs pipeline" />
	{:else}
		<PipelineIndicators values={indicators} />
	{/if}

	<PipelineTabs active={activeTab} tabs={tabsSpec} onSelect={(t) => (activeTab = t)} />

	<div
		class="kanban-wrap"
		role="tabpanel"
		id={`panel-${activeTab}`}
		aria-labelledby={`tab-${activeTab}`}
	>
		{#if useMobileAccordion}
			<PipelineMobileAccordion stages={accordionStages} onOppTap={(o) => openDetail({ id: o.id })} />
		{:else}
			<div class="kanban kanban--{activeTab}">
				{#each etapesVisible as etape (etape.key)}
					{@const opps = oppsByEtape[etape.key] ?? []}
					{@const total = totals[etape.key]?.sum ?? 0}
					<PipelineColumn
						{etape}
						{opps}
						{total}
						{premium}
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
		{/if}
	</div>
</div>

{#if !bandeau}
	<button
		type="button"
		class="ws-fab"
		aria-label="Nouvelle opportunité"
		onclick={() => openCreate()}
	>
		<Icon name="add" size={20} />
	</button>
{/if}

<!-- SlideOut detail opportunité -->
<SlideOut bind:open={slideOutOpen} title={selectedOpp?.titre ?? ''}>
	{#if selectedOpp}
		{@const fStage = etapeAccent(selectedOpp.etape_pipeline)}
		{@const fSrc = sourceMetaFor(selectedOpp.signaux_affaires?.source_officielle)}
		{@const fActivite = relativeTimeFr(selectedOpp.date_derniere_modification)}
		<div class="space-y-6">
			{#if premium}
				<div class="flex items-start gap-4">
					<span class="crm-avatar crm-avatar--lg">{entrepriseInitials(selectedOpp.entreprises?.raison_sociale)}</span>
					<div class="min-w-0">
						<p class="font-semibold text-text">{selectedOpp.titre ?? 'Opportunité'}</p>
						<div class="flex flex-wrap items-center gap-2 mt-1.5">
							{#if fStage}
								<StagePill label={etapeLabel(selectedOpp.etape_pipeline)} variant={fStage} />
							{:else}
								<Badge label={etapeLabel(selectedOpp.etape_pipeline)} variant={etapeBadgeVariant(selectedOpp.etape_pipeline)} />
							{/if}
							{#if fSrc}<SourcePill label={fSrc.label} variant={fSrc.variant} />{/if}
						</div>
						{#if fActivite}<p class="text-xs text-text-muted mt-2">Dernière activité : {fActivite}</p>{/if}
					</div>
				</div>
			{:else}
				<Badge label={etapeLabel(selectedOpp.etape_pipeline)} variant={etapeBadgeVariant(selectedOpp.etape_pipeline)} />
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Entreprise</span>
					<p class="block font-medium text-text">{selectedOpp.entreprises?.raison_sociale ?? '--'}</p>
				</div>
				<div>
					<span class="text-text-muted">Contact</span>
					{#if selectedOpp.contacts}
						<p class="block font-medium text-text">
							{selectedOpp.contacts.prenom ?? ''} {selectedOpp.contacts.nom ?? ''}
						</p>
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
						{formatTypeLabel(selectedOpp.signaux_affaires.type_signal)} -- {selectedOpp.signaux_affaires.description_projet ?? ''}
					</p>
				</div>
			{/if}

			{#if selectedOpp.notes_libres}
				<div class="text-sm">
					<span class="text-text-muted">Notes</span>
					<p class="text-text whitespace-pre-wrap">{selectedOpp.notes_libres}</p>
				</div>
			{/if}

			{#if selectedOpp.etape_pipeline === 'perdu' && selectedOpp.motif_perte}
				<div class="text-sm">
					<span class="text-text-muted">Motif de perte</span>
					<p class="text-text whitespace-pre-wrap">{selectedOpp.motif_perte}</p>
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if selectedOpp}
			<div class="flex gap-3">
				<button
					onclick={openEdit}
					class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
				>
					<Icon name="edit" size={16} />
					Modifier
				</button>
				{#if canConvertToClient}
					<form
						method="POST"
						action="?/convertToClient"
						use:enhance={() => {
							converting = true;
							return async ({ result, update }) => {
								converting = false;
								if (result.type === 'success') {
									toasts.success('Prospect converti en client');
									slideOutOpen = false;
									selectedOpp = null;
								} else {
									toasts.error('Erreur lors de la conversion');
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={selectedOpp.id} />
						<button
							type="submit"
							disabled={converting}
							class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer disabled:opacity-50"
						>
							<Icon name="handshake" size={16} />
							{converting ? 'Conversion…' : 'Convertir en client'}
						</button>
					</form>
				{/if}
				{#if selectedOpp.etape_pipeline !== 'perdu' && selectedOpp.etape_pipeline !== 'gagne'}
					<button
						type="button"
						onclick={() => {
							resetMotifPerte();
							lostModalOpen = true;
						}}
						disabled={archiving}
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-danger-deep hover:bg-danger/5 rounded-lg cursor-pointer disabled:opacity-50"
					>
						<Icon name="block" size={16} />
						{archiving ? 'En cours…' : 'Marquer perdu'}
					</button>
				{/if}
			</div>
		{/if}
	{/snippet}
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

<!-- Modal « Marquer perdu » : capture du motif (liste fermée + précisions) avant archivage. -->
<ModalForm bind:open={lostModalOpen} title="Marquer cette opportunité perdue" icon="block" onClose={resetMotifPerte}>
	<form
		method="POST"
		action="?/archive"
		use:enhance={() => {
			archiving = true;
			return async ({ result, update }) => {
				archiving = false;
				lostModalOpen = false;
				slideOutOpen = false;
				selectedOpp = null;
				resetMotifPerte();
				if (result.type === 'success') toasts.success('Opportunité marquée perdue');
				else toasts.error("Erreur lors de l'archivage");
				await update();
			};
		}}
	>
		{#if selectedOpp}
			<input type="hidden" name="id" value={selectedOpp.id} />
		{/if}
		<input type="hidden" name="motif_perte" value={motifPerteValue} />

		<div class="space-y-4">
			<p class="text-sm text-text-muted">
				L'opportunité passera en statut perdu. Tu pourras toujours la consulter dans le pipeline.
				Indiquer le motif aide à analyser les pertes (facultatif).
			</p>
			<Select
				id="motif_perte_cat"
				label="Motif de perte"
				placeholder="-- Choisir un motif --"
				bind:value={motifPerteCat}
				options={MOTIF_PERTE_OPTIONS}
			/>
			<FormField label="Précisions (facultatif)" type="textarea" bind:value={motifPerteDetail} />
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				onclick={() => {
					lostModalOpen = false;
					resetMotifPerte();
				}}
				class="h-11 px-4 box-border text-sm text-text-muted hover:text-text rounded-lg cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={archiving}
				class="h-11 px-4 box-border text-sm font-semibold text-white bg-danger hover:bg-danger/90 rounded-lg disabled:opacity-50 cursor-pointer"
			>
				{archiving ? 'En cours…' : 'Marquer perdu'}
			</button>
		</div>
	</form>
</ModalForm>

<style>
	.kanban-wrap {
		flex: 1;
		padding: 24px 32px 32px; /* audit 360 V3b L-22 : sur la grille 8px (était 20/.../40) */
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
		.kanban-wrap {
			padding: 16px 16px 96px; /* audit 360 V3b L-25 : sur la grille 8px (était 12px en haut) */
		}
	}
</style>
