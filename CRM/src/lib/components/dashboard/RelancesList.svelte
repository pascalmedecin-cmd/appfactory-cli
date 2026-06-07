<script lang="ts">
	/**
	 * Liste relances : 3 premières opportunités avec date_relance_prevue ≤ today.
	 * Badges urgence (Retard Nj rouge / Aujourd'hui warning / Demain neutre).
	 * Lien vers /pipeline (fiche opportunité quand route disponible).
	 */
	import { formatRelanceDate } from '$lib/utils/dateFormat';

	type Relance = {
		id: string;
		titre: string;
		etape_pipeline: string | null;
		date_relance_prevue: string | null;
		entreprise_id: string | null;
	};

	type Props = {
		relances: Relance[];
		visibleLimit?: number;
	};

	let { relances, visibleLimit = 3 }: Props = $props();

	const visible = $derived(relances.slice(0, visibleLimit));
	const remaining = $derived(Math.max(0, relances.length - visible.length));

	function pipelineHref(_id: string): string {
		// Fiche opportunité directe non disponible aujourd'hui : on renvoie sur le pipeline.
		return '/crm/pipeline';
	}
</script>

<article class="panel">
	<div class="panel-head">
		<div>
			<div class="panel-meta">Relances</div>
			<div class="panel-title">{relances.length === 0 ? 'Tout est suivi' : `${relances.length} ${relances.length === 1 ? 'à traiter' : 'à traiter'}`}</div>
		</div>
		{#if relances.length > 0}
			<a class="panel-link" href="/crm/pipeline">Pipeline →</a>
		{/if}
	</div>
	<div class="panel-body">
		{#if relances.length === 0}
			<div class="empty">
				<p class="empty-title">Aucune relance prévue</p>
				<p class="empty-body">Bien joué. Quand une opportunité aura une relance dûe, elle s'affichera ici.</p>
			</div>
		{:else}
			<div class="relances-list">
				{#each visible as relance (relance.id)}
					{@const meta = formatRelanceDate(relance.date_relance_prevue)}
					<a class="relance-card" href={pipelineHref(relance.id)}>
						<div class="relance-text">
							<p class="rel-title">{relance.titre}</p>
							<p class="rel-meta">{relance.etape_pipeline ?? '—'}</p>
						</div>
						<span class="rel-date rel-date-{meta.urgency} tabular-nums">{meta.label}</span>
					</a>
				{/each}
				{#if remaining > 0}
					<a class="relances-more" href="/crm/pipeline">Voir les {remaining} {remaining === 1 ? 'autre' : 'autres'} →</a>
				{/if}
			</div>
		{/if}
	</div>
</article>

<style>
	.panel {
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.panel-head {
		padding: 20px 24px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.panel-meta {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-muted);
	}
	.panel-title {
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.01em;
		margin-top: 4px;
	}
	.panel-link {
		font-size: 13px;
		color: var(--color-primary);
		font-weight: 600;
		text-decoration: none;
	}
	.panel-link:hover { text-decoration: underline; text-underline-offset: 3px; }
	.panel-body { padding: 4px 0 16px; }

	.empty {
		padding: 24px;
		text-align: center;
	}
	.empty-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 4px;
	}
	.empty-body {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.relances-list {
		padding: 0 16px 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.relance-card {
		padding: 12px 14px;
		border-radius: var(--radius-xl);
		background: var(--color-surface-alt);
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
		align-items: center;
		transition: background 200ms var(--ease-out-expo), transform 200ms var(--ease-out-expo);
		text-decoration: none;
		color: inherit;
	}
	.relance-card:hover {
		background: var(--color-primary-light);
		transform: translateX(2px);
	}
	.relance-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.relance-text { min-width: 0; }
	.rel-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rel-meta {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 2px;
	}
	.rel-date {
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.rel-date-retard { color: var(--color-danger); }
	.rel-date-today { color: var(--color-warning); }
	.rel-date-demain { color: var(--color-text-body); }
	.rel-date-futur { color: var(--color-text-muted); }

	.relances-more {
		font-size: 12px;
		color: var(--color-primary);
		font-weight: 600;
		text-decoration: none;
		padding: 8px 14px 0;
		text-align: center;
	}
	.relances-more:hover { text-decoration: underline; text-underline-offset: 3px; }

	@media (prefers-reduced-motion: reduce) {
		.relance-card { transition: none; }
		.relance-card:hover { transform: none; }
	}
</style>
