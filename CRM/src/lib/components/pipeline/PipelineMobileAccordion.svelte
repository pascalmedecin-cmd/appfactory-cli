<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { formatMontantCompact, formatRelancePipeline } from '$lib/utils/pipelineFormat';
	import {
		createCollapsedState,
		toggleStageExpansion,
		isStageExpanded,
		formatStageCount,
		type AccordionStage,
		type AccordionOpp
	} from './pipeline-mobile-accordion.helpers';

	type Opp = AccordionOpp & {
		titre?: string | null;
	};

	type StageWithOpps = Omit<AccordionStage, 'opportunites'> & {
		opportunites: Opp[];
	};

	type Props = {
		stages: ReadonlyArray<StageWithOpps>;
		onOppTap: (opp: Opp) => void;
	};

	const { stages, onOppTap }: Props = $props();

	let expanded = $state<Set<string>>(createCollapsedState());

	function toggle(key: string) {
		expanded = toggleStageExpansion(expanded, key);
	}

	function handleKey(e: KeyboardEvent, key: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle(key);
		}
	}
</script>

<div class="accordion" role="list">
	{#each stages as stage (stage.key)}
		{@const open = isStageExpanded(expanded, stage.key)}
		{@const regionId = `accordion-region-${stage.key}`}
		{@const montant = formatMontantCompact(stage.montantTotal)}
		<section class="stage" role="listitem">
			<button
				type="button"
				class="header"
				aria-expanded={open}
				aria-controls={regionId}
				onclick={() => toggle(stage.key)}
				onkeydown={(e) => handleKey(e, stage.key)}
			>
				<span class="header-left">
					<Icon name={stage.icon} size={20} />
					<span class="label">{stage.label}</span>
					<span class="count" aria-label={formatStageCount(stage.count)}>{stage.count}</span>
				</span>
				<span class="header-right">
					{#if montant}
						<span class="montant">{montant}</span>
					{/if}
					<span class="chevron" class:open aria-hidden="true">
						<Icon name="expand_more" size={20} />
					</span>
				</span>
			</button>

			<div
				id={regionId}
				class="region"
				class:open
				role="region"
				aria-label={`${stage.label} - ${formatStageCount(stage.count)}`}
				hidden={!open}
			>
				{#if stage.opportunites.length === 0}
					<p class="empty">Aucune opportunité dans cette étape.</p>
				{:else}
					<ul class="opps">
						{#each stage.opportunites as opp (opp.id)}
							{@const relance = formatRelancePipeline(opp.date_relance_prevue)}
							{@const oppMontant = formatMontantCompact(opp.montant_estime)}
							<li>
								<button type="button" class="opp" onclick={() => onOppTap(opp)}>
									<span class="opp-title">{opp.titre ?? 'Opportunité sans titre'}</span>
									<span class="opp-meta">
										{#if oppMontant}<span class="opp-montant">{oppMontant}</span>{/if}
										<span class="opp-relance" class:overdue={relance.overdue}>{relance.label}</span>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{/each}
</div>

<style>
	.accordion {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.stage {
		background: var(--color-card);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 12px 16px;
		background: transparent;
		border: 0;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}
	.header:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}
	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.label {
		font-weight: 600;
	}
	.count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--color-border-soft);
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 600;
	}
	.montant {
		color: var(--color-text-muted);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.chevron {
		display: inline-flex;
		transition: transform 200ms var(--ease-out-expo);
		transform-origin: center;
	}
	.chevron.open {
		transform: rotate(180deg);
	}
	.region {
		transform: scaleY(0);
		transform-origin: top;
		opacity: 0;
		transition: transform 200ms var(--ease-out-expo), opacity 200ms var(--ease-out-expo);
		padding: 0;
	}
	.region.open {
		transform: scaleY(1);
		opacity: 1;
		padding: 0 16px 12px;
		border-top: 1px solid var(--color-border-soft);
	}
	@media (prefers-reduced-motion: reduce) {
		.chevron,
		.region {
			transition: none;
		}
	}
	.empty {
		margin: 12px 0 0;
		padding: 12px;
		color: var(--color-text-muted);
		font-size: 14px;
		text-align: center;
	}
	.opps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.opps li + li {
		border-top: 1px solid var(--color-border-soft);
	}
	.opp {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		min-height: 48px;
		padding: 12px 4px;
		background: transparent;
		border: 0;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}
	.opp:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.opp-title {
		font-weight: 500;
	}
	.opp-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--color-text-muted);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.opp-montant::after {
		content: '·';
		margin-left: 8px;
		color: var(--color-border-soft);
	}
	.opp-relance.overdue {
		color: var(--color-danger);
		font-weight: 500;
	}
</style>
