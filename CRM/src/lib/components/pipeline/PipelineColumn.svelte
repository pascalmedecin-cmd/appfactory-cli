<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PipelineCard from './PipelineCard.svelte';
	import PipelineEmptyState from './PipelineEmptyState.svelte';
	import PipelineDropPlaceholder from './PipelineDropPlaceholder.svelte';
	import { formatMontantCompact, progressByEtape } from '$lib/utils/pipelineFormat';

	type Etape = {
		key: string;
		label: string;
		icon: string;
	};

	type OppContact = { id: string; nom: string | null; prenom: string | null } | null;
	type OppEntreprise = { id: string; raison_sociale: string } | null;
	type OppSignal = { id: string; type_signal: string | null; description_projet: string | null; source_officielle?: string | null } | null;
	type Opp = {
		id: string;
		titre: string | null;
		etape_pipeline: string | null;
		montant_estime: number | null;
		date_relance_prevue: string | null;
		responsable: string | null;
		contacts: OppContact;
		entreprises: OppEntreprise;
		signaux_affaires: OppSignal;
		signal_affaires_id?: string | null;
	};

	type Props = {
		etape: Etape;
		opps: Opp[];
		total: number;
		dragOver: boolean;
		draggedId: string | null;
		/** Vague 2 (flag ffCrmListesV2) : transmis aux cartes (accent + logo + source). */
		premium?: boolean;
		onCardClick: (opp: Opp) => void;
		onCardDragStart: (e: DragEvent, opp: Opp) => void;
		onCardDragEnd: () => void;
		onColumnDragOver: (e: DragEvent, etapeKey: string) => void;
		onColumnDragLeave: () => void;
		onColumnDrop: (e: DragEvent, etapeKey: string) => void;
		onAddClick: (etapeKey: string) => void;
	};

	let {
		etape,
		opps,
		total,
		dragOver,
		draggedId,
		premium = false,
		onCardClick,
		onCardDragStart,
		onCardDragEnd,
		onColumnDragOver,
		onColumnDragLeave,
		onColumnDrop,
		onAddClick,
	}: Props = $props();

	const totalLabel = $derived(formatMontantCompact(total));
	const showProgress = $derived(progressByEtape(etape.key) > 0);
	const progressPct = $derived(Math.round(progressByEtape(etape.key) * 100));
	const isClosed = $derived(etape.key === 'gagne' || etape.key === 'perdu');
	const showCta = $derived(!isClosed);
	const ariaLabel = $derived(`Colonne ${etape.label}, ${opps.length} ${opps.length === 1 ? 'opportunité' : 'opportunités'}`);
</script>

<section
	class="col col--{etape.key}"
	data-dragover={dragOver ? 'true' : null}
	aria-label={ariaLabel}
	ondragover={(e: DragEvent) => onColumnDragOver(e, etape.key)}
	ondragleave={onColumnDragLeave}
	ondrop={(e: DragEvent) => onColumnDrop(e, etape.key)}
	role="group"
>
	<header class="col-head">
		<div class="col-head-row1">
			<div class="col-icon col-icon--{etape.key}">
				<Icon name={etape.icon} size={20} />
			</div>
			<div class="col-title">{etape.label}</div>
			<div class="col-count tabular-nums">{opps.length}</div>
			{#if showCta}
				<button
					type="button"
					class="col-add"
					aria-label="Ajouter dans {etape.label}"
					onclick={() => onAddClick(etape.key)}
				>
					<Icon name="add" size={14} />
				</button>
			{/if}
		</div>
		{#if showProgress}
			<div class="col-progress" aria-hidden="true">
				<div class="col-progress-bar col-progress-bar--{etape.key}" style="width:{progressPct}%"></div>
			</div>
		{/if}
		{#if totalLabel}
			<div class="col-meta">
				<div class="col-total tabular-nums">{totalLabel}</div>
			</div>
		{/if}
	</header>

	<div class="col-body" role={opps.length > 0 ? 'list' : undefined}>
		{#if opps.length === 0}
			<PipelineEmptyState {etape} onAdd={showCta ? onAddClick : undefined} />
		{:else}
			{#each opps as opp, i (opp.id)}
				<PipelineCard
					{opp}
					{premium}
					dragging={draggedId === opp.id}
					index={i}
					onClick={onCardClick}
					onDragStart={onCardDragStart}
					onDragEnd={onCardDragEnd}
				/>
			{/each}
			{#if dragOver}
				<PipelineDropPlaceholder />
			{/if}
		{/if}
	</div>

	{#if showCta && opps.length > 0}
		<div class="col-foot">
			<button class="col-foot-add" type="button" onclick={() => onAddClick(etape.key)}>
				<Icon name="add" size={14} />
				Ajouter dans {etape.label}
			</button>
		</div>
	{/if}
</section>

<style>
	.col {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-2xl);
		display: flex;
		flex-direction: column;
		min-width: 280px;
		transition: background 180ms ease, border-color 180ms ease, box-shadow 220ms var(--ease-out-expo);
		overflow: hidden;
	}
	.col[data-dragover='true'] {
		background: var(--color-primary-light);
		border-color: var(--color-primary);
		box-shadow: var(--shadow-card);
	}

	.col-head {
		padding: 18px 16px 14px;
		border-bottom: 1px solid rgba(17, 24, 39, 0.05);
	}
	.col-head-row1 {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	.col-icon {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-lg);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.col-icon--identification {
		background: var(--color-info-light);
		color: var(--color-info-deep);
	}
	.col-icon--qualification {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.col-icon--proposition {
		background: var(--color-warning-light);
		color: var(--color-warning-deep);
	}
	.col-icon--negociation {
		background: var(--color-success-light);
		color: var(--color-success-deep);
	}
	.col-icon--gagne {
		background: var(--color-success-light);
		color: var(--color-success-deep);
	}
	.col-icon--perdu {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
	}

	.col-title {
		flex: 1;
		min-width: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.01em;
		line-height: 1.2;
	}
	.col-count {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		border-radius: var(--radius-full);
	}
	.col-add {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		background: transparent;
		border: none;
		cursor: pointer;
		display: grid;
		place-items: center;
		color: var(--color-text-muted);
		transition: background 180ms ease, color 180ms ease;
	}
	.col-add:hover {
		background: var(--color-surface-alt);
		color: var(--color-primary);
	}
	.col-add:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.col-progress {
		height: 3px;
		background: var(--color-surface-alt);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-bottom: 8px;
	}
	.col-progress-bar {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width 320ms var(--ease-out-expo);
	}
	.col-progress-bar--identification {
		background: var(--color-info);
	}
	.col-progress-bar--qualification {
		background: var(--color-primary);
	}
	.col-progress-bar--proposition {
		background: var(--color-warning);
	}
	.col-progress-bar--negociation {
		background: var(--color-success);
	}

	.col-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.col-total {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.005em;
	}

	.col-body {
		padding: 12px;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 100px;
		overflow-y: auto;
	}

	.col-foot {
		padding: 0 12px 12px;
	}
	.col-foot-add {
		width: 100%;
		height: 36px;
		padding: 0 12px;
		background: var(--color-surface-alt);
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		color: var(--color-text-muted);
		font-family: inherit;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
	}
	.col-foot-add:hover {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: rgba(47, 90, 158, 0.25);
	}
	.col-foot-add:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
