<script lang="ts">
	/**
	 * MobileEntityCard - Carte universelle mobile pour entités CRM (prospect, contact,
	 * entreprise, signal). Spec : CRM/.product-architect/DESIGN.md § Composants.
	 *
	 * Design hérité du pattern SignauxCards V4 (S189) : band 3px optionnel, hover translateY,
	 * focus-visible, prefers-reduced-motion. Tap targets >= 44x44 sur les actions footer.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import {
		actionVariant,
		scorePillClass,
		scorePillTitle,
		shouldInvokeOnClick,
		type DominantBand,
		type MobileEntityCardAction,
		type MobileEntityCardBadge,
		type ScorePillLabel,
	} from './mobile-entity-card.helpers';

	type Props = {
		title: string;
		subtitle?: string;
		badges?: MobileEntityCardBadge[];
		/** Pastille score affichée à droite du titre. Réutilise les classes globales `.signal-score-pill--*`. */
		scorePill?: { label: ScorePillLabel; value: number };
		/** Bandeau coloré 3px en haut de la carte. Coeur=success, bonus=primary, eviter=danger, neutral=transparent. */
		dominant?: DominantBand;
		/** Métadonnées affichées en footer (canton, source, montant, etc.). */
		footerItems?: Array<{ icon: string; text: string }>;
		/** Actions tactiles >= 44x44px. Maximum 3 recommandé pour ne pas surcharger. */
		actions?: MobileEntityCardAction[];
		/** Callback tap sur le corps de la carte (ouvre slide-out détail). */
		onTap: () => void;
		/** Label aria décrivant la carte entière (lecteur écran). */
		ariaLabel: string;
		/** Mode sélection multiple (checkbox sur l'icône). */
		selected?: boolean;
	};

	let {
		title,
		subtitle,
		badges = [],
		scorePill,
		dominant = 'neutral',
		footerItems = [],
		actions = [],
		onTap,
		ariaLabel,
		selected = false,
	}: Props = $props();

	function handleAction(e: Event, action: MobileEntityCardAction) {
		e.stopPropagation();
		if (shouldInvokeOnClick(action)) action.onClick?.();
	}
</script>

<article class="mobile-card" class:selected data-dominant={dominant}>
	<span class="mobile-card-band" aria-hidden="true"></span>
	<button type="button" class="mobile-card-body" onclick={onTap} aria-label={ariaLabel}>
		<div class="mobile-card-head">
			<div class="mobile-card-titles">
				<h3 class="mobile-card-title">{title}</h3>
				{#if subtitle}
					<p class="mobile-card-subtitle">{subtitle}</p>
				{/if}
			</div>
			{#if scorePill}
				<span class={scorePillClass(scorePill.label)} title={scorePillTitle(scorePill.value)}>
					<span class="tabular-nums">{scorePill.value}</span>
				</span>
			{/if}
		</div>

		{#if badges.length > 0}
			<div class="mobile-card-badges">
				{#each badges as badge}
					<Badge label={badge.label} variant={badge.variant} />
				{/each}
			</div>
		{/if}

		{#if footerItems.length > 0}
			<div class="mobile-card-footer">
				{#each footerItems as item}
					<span class="mobile-card-foot-item">
						<Icon name={item.icon} size={14} />
						<span>{item.text}</span>
					</span>
				{/each}
			</div>
		{/if}
	</button>

	{#if actions.length > 0}
		<div class="mobile-card-actions">
			{#each actions as action}
				{#if action.href}
					<a
						href={action.href}
						class="mobile-card-action"
						data-variant={actionVariant(action.variant)}
						aria-label={action.label}
						onclick={(e) => e.stopPropagation()}
					>
						<Icon name={action.icon} size={20} />
					</a>
				{:else}
					<button
						type="button"
						class="mobile-card-action"
						data-variant={actionVariant(action.variant)}
						aria-label={action.label}
						onclick={(e) => handleAction(e, action)}
					>
						<Icon name={action.icon} size={20} />
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</article>

<style>
	.mobile-card {
		position: relative;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition:
			transform 200ms var(--ease-out-expo),
			box-shadow 200ms var(--ease-out-expo);
	}
	.mobile-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-card-hover);
	}
	.mobile-card.selected {
		box-shadow: 0 0 0 2px var(--color-primary), 0 8px 20px -12px color-mix(in srgb, var(--color-text) 10%, transparent);
		background: var(--color-primary-light);
	}
	.mobile-card-band {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: transparent;
		z-index: 1;
	}
	.mobile-card[data-dominant='coeur'] .mobile-card-band {
		background: linear-gradient(90deg, var(--color-success) 0%, color-mix(in srgb, var(--color-success) 70%, white) 100%);
	}
	.mobile-card[data-dominant='bonus'] .mobile-card-band {
		background: linear-gradient(90deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, white) 100%);
	}
	.mobile-card[data-dominant='eviter'] .mobile-card-band {
		background: linear-gradient(90deg, var(--color-danger) 0%, color-mix(in srgb, var(--color-danger) 70%, white) 100%);
	}
	.mobile-card-body {
		width: 100%;
		text-align: left;
		border: none;
		background: transparent;
		font-family: inherit;
		padding: 20px;
		padding-top: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		cursor: pointer;
		min-height: 44px;
	}
	.mobile-card-body:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
		border-radius: var(--radius-xl);
	}
	.mobile-card-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.mobile-card-titles {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.mobile-card-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.3;
		margin: 0;
		overflow-wrap: break-word;
	}
	.mobile-card-subtitle {
		font-size: 14px;
		color: var(--color-text-muted);
		line-height: 1.4;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.mobile-card-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.mobile-card-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		padding-top: 8px;
		border-top: 1px solid rgba(17, 24, 39, 0.05);
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.mobile-card-foot-item {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	.mobile-card-foot-item span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mobile-card-foot-item :global(svg) {
		opacity: 0.7;
		flex-shrink: 0;
	}
	.mobile-card-actions {
		display: flex;
		gap: 8px;
		padding: 12px 16px 16px;
		border-top: 1px solid rgba(17, 24, 39, 0.05);
		padding-bottom: max(16px, env(safe-area-inset-bottom));
	}
	.mobile-card-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 10px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		text-decoration: none;
		transition: background 150ms var(--ease-out-expo), border-color 150ms var(--ease-out-expo);
	}
	.mobile-card-action:hover {
		background: var(--color-primary-light);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.mobile-card-action:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.mobile-card-action[data-variant='primary'] {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}
	.mobile-card-action[data-variant='primary']:hover {
		background: var(--color-primary-hover, var(--color-primary));
	}
	.mobile-card-action[data-variant='danger'] {
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
	}
	.mobile-card-action[data-variant='danger']:hover {
		background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		border-color: var(--color-danger);
	}
	@media (prefers-reduced-motion: reduce) {
		.mobile-card,
		.mobile-card:hover {
			transform: none;
			transition: none;
		}
	}
</style>
