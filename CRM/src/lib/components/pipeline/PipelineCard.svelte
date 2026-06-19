<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SourcePill from '$lib/components/SourcePill.svelte';
	import { formatRelancePipeline, formatMontantCompact, etapeAccent, entrepriseInitials } from '$lib/utils/pipelineFormat';
	import { sourceMetaFor } from '$lib/utils/entreprisesFormat';

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
		source_officielle?: string | null;
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
		/** Vague 2 (flag ffCrmListesV2) : carte premium (accent d'étape + logo + source). OFF → carte actuelle. */
		premium?: boolean;
		onClick: (opp: Opp) => void;
		onDragStart: (e: DragEvent, opp: Opp) => void;
		onDragEnd: () => void;
	};

	let { opp, dragging, index = 0, premium = false, onClick, onDragStart, onDragEnd }: Props = $props();

	const relance = $derived(formatRelancePipeline(opp.date_relance_prevue));
	const amountLabel = $derived(formatMontantCompact(opp.montant_estime));
	const company = $derived(opp.entreprises?.raison_sociale ?? '');

	// Vague 2 : accent palette workflow de l'étape + initiales logo + source réelle (signal lié).
	// Tout dérive de champs chargés — aucune invention (etapeAccent/sourceMetaFor renvoient null si inconnu).
	const accent = $derived(etapeAccent(opp.etape_pipeline));
	const logoInitials = $derived(entrepriseInitials(company));
	const src = $derived(sourceMetaFor(opp.signaux_affaires?.source_officielle));
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
	class:premium
	role="listitem"
	tabindex="0"
	draggable="true"
	style="--i:{staggerIndex}"
	aria-label={ariaLabel}
	data-dragging={dragging ? 'true' : null}
	data-accent={premium ? accent : null}
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
	{#if premium}
		<div class="card-head">
			<span class="card-logo" aria-hidden="true">{logoInitials}</span>
			<div class="card-head-id">
				<div class="card-title">{opp.titre ?? 'Opportunité sans titre'}</div>
				<div class="card-company">{company}</div>
			</div>
		</div>
	{:else}
		<div class="card-title">{opp.titre ?? 'Opportunité sans titre'}</div>
		{#if company}
			<div class="card-company">{company}</div>
		{/if}
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

	{#if premium || contactName || hasSignal}
		<div class="card-footer">
			{#if contactName}
				<span class="card-avatar" aria-hidden="true">{initials}</span>
				<span class="card-contact">{contactName}</span>
			{:else}
				<span class="card-contact">&nbsp;</span>
			{/if}
			{#if premium}
				{#if src}
					<span class="card-src"><SourcePill label={src.label} variant={src.variant} /></span>
				{/if}
			{:else if hasSignal}
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
		color: var(--color-danger-deep);
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
		color: var(--color-info-deep);
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
		color: var(--color-warning-deep);
		flex-shrink: 0;
		display: grid;
		place-items: center;
	}

	/* ====== Vague 2 (flag ffCrmListesV2) : carte premium ======
	   Accent de couleur d'etape (gauche, palette workflow) + logo initiales +
	   hauteur egale (titre 2 lignes + entreprise 1 ligne reservees). OFF (pas de
	   classe .premium) -> aucune de ces regles ne s'applique : carte identique. */
	.card.premium {
		padding-left: 16px;
		overflow: hidden; /* clippe l'accent dans le border-radius */
	}
	.card.premium::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--accent, var(--color-border-strong));
	}
	.card.premium[data-accent='import'] { --accent: var(--color-prosp-import); }
	.card.premium[data-accent='enrich'] { --accent: var(--color-prosp-enrich); }
	.card.premium[data-accent='qualify'] { --accent: var(--color-prosp-qualify); }
	.card.premium[data-accent='convert'] { --accent: var(--color-prosp-convert); }

	.card-head {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 11px;
	}
	.card-logo {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-md);
		flex-shrink: 0;
		display: grid;
		place-items: center;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 700;
		font-size: 12px;
		box-shadow: inset 0 0 0 1px rgba(47, 90, 158, 0.10);
	}
	.card-head-id {
		min-width: 0;
		flex: 1;
	}
	/* Hauteur egale : titre 2 lignes + entreprise 1 ligne toujours reserves. */
	.card.premium .card-title {
		min-height: 2.6em;
		margin-bottom: 2px;
	}
	.card.premium .card-company {
		min-height: 1.3em;
		margin-bottom: 0;
	}
	.card-src {
		flex-shrink: 0;
		display: inline-flex;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			animation: none;
			transition: none;
		}
	}
</style>
