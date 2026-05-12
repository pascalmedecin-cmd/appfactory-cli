<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { formatRelancePipeline, formatMontantCompact } from '$lib/utils/pipelineFormat';

	type OppContact = {
		id: string;
		nom: string | null;
		prenom: string | null;
	} | null;

	type OppEntreprise = {
		id: string;
		raison_sociale: string;
	} | null;

	type OppSignal = {
		id: string;
		type_signal: string | null;
		description_projet: string | null;
	} | null;

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
		opp: Opp;
		dragging: boolean;
		index?: number;
		onClick: (opp: Opp) => void;
		onDragStart: (e: DragEvent, opp: Opp) => void;
		onDragEnd: () => void;
	};

	let { opp, dragging, index = 0, onClick, onDragStart, onDragEnd }: Props = $props();

	const relance = $derived(formatRelancePipeline(opp.date_relance_prevue));
	const amountLabel = $derived(formatMontantCompact(opp.montant_estime));
	const company = $derived(opp.entreprises?.raison_sociale ?? '');
	const contactName = $derived(
		opp.contacts ? `${opp.contacts.prenom ?? ''} ${opp.contacts.nom ?? ''}`.trim() || '(sans nom)' : opp.responsable ?? ''
	);
	const initials = $derived(
		(opp.contacts ? `${opp.contacts.prenom?.[0] ?? ''}${opp.contacts.nom?.[0] ?? ''}` : (opp.responsable ?? '').slice(0, 2))
			.toUpperCase() || '–'
	);
	const hasSignal = $derived(Boolean(opp.signal_affaires_id || opp.signaux_affaires));
	const ariaLabel = $derived(
		[
			opp.titre ?? 'Opportunité',
			company,
			amountLabel ?? 'montant non renseigné',
			relance.overdue ? `relance en retard ${relance.label}` : relance.hasDate ? `relance ${relance.label}` : 'relance à planifier',
		]
			.filter(Boolean)
			.join(', ')
	);
	const staggerIndex = $derived(Math.min(index, 8));
</script>

<article
	class="card"
	role="listitem"
	tabindex="0"
	draggable="true"
	style="--i:{staggerIndex}"
	aria-label={ariaLabel}
	data-dragging={dragging ? 'true' : null}
	onclick={() => onClick(opp)}
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick(opp);
		}
	}}
	ondragstart={(e: DragEvent) => onDragStart(e, opp)}
	ondragend={onDragEnd}
>
	<div class="card-title">{opp.titre ?? 'Opportunité sans titre'}</div>
	{#if company}
		<div class="card-company">{company}</div>
	{/if}

	<div class="card-meta">
		{#if amountLabel}
			<span class="card-amount tabular-nums">{amountLabel}</span>
		{:else}
			<span class="card-amount muted">Montant à définir</span>
		{/if}

		<span class="card-relance" class:overdue={relance.overdue}>
			{#if relance.overdue}
				<Icon name="warning" size={12} />
			{:else}
				<Icon name="schedule" size={12} />
			{/if}
			{relance.label}
		</span>
	</div>

	{#if contactName || hasSignal}
		<div class="card-footer">
			{#if contactName}
				<span class="card-avatar" aria-hidden="true">{initials}</span>
				<span class="card-contact">{contactName}</span>
			{:else}
				<span class="card-contact">&nbsp;</span>
			{/if}
			{#if hasSignal}
				<span class="card-signal" title="Issu d'un signal d'affaires" aria-label="Issu d'un signal">
					<Icon name="bolt" size={14} />
				</span>
			{/if}
		</div>
	{/if}
</article>

<style>
	.card {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		padding: 14px;
		box-shadow: var(--shadow-card);
		cursor: grab;
		position: relative;
		transition: transform 220ms var(--ease-out-expo), box-shadow 220ms var(--ease-out-expo), opacity 200ms ease;
		animation: cardEnter 320ms var(--ease-out-expo) backwards;
		animation-delay: calc(var(--i, 0) * 50ms);
		display: block;
		text-align: left;
	}
	@keyframes cardEnter {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.card:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-card-active);
	}
	.card:active {
		cursor: grabbing;
	}
	.card[data-dragging='true'] {
		opacity: 0.4;
		transform: scale(0.98);
		cursor: grabbing;
	}
	.card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.card-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-bottom: 6px;
	}
	.card-company {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-bottom: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.card-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 8px;
	}
	.card-amount {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
		letter-spacing: -0.005em;
	}
	.card-amount.muted {
		color: var(--color-text-muted);
		font-weight: 500;
		font-size: 12px;
	}
	.card-relance {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.card-relance.overdue {
		color: var(--color-danger);
		font-weight: 600;
	}
	.card-footer {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 10px;
		border-top: 1px solid rgba(17, 24, 39, 0.05);
	}
	.card-avatar {
		width: 18px;
		height: 18px;
		border-radius: var(--radius-full);
		background: var(--color-info-light);
		color: var(--color-info);
		display: grid;
		place-items: center;
		font-size: 9px;
		font-weight: 700;
		flex-shrink: 0;
	}
	.card-contact {
		flex: 1;
		min-width: 0;
		font-size: 12px;
		color: var(--color-text-muted);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.card-signal {
		color: var(--color-warning);
		flex-shrink: 0;
		display: grid;
		place-items: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			animation: none;
			transition: none;
		}
	}
</style>
