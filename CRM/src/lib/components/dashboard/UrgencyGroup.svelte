<script lang="ts">
	/**
	 * UrgencyGroup (Dashboard temporel, Vague 3.3) : une bande temporelle
	 * (En retard / Aujourd'hui / Cette semaine) + ses tâches dues.
	 * Le rouge ne sert qu'au retard. Chaque tâche pointe vers le Pipeline (où vit l'opportunité).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { etapeLabel } from '$lib/utils/pipelineFormat';
	import { dueLabel, tacheTitre, type TacheDue, type DueKind } from '$lib/utils/dashboardTemporel';

	let {
		kind,
		label,
		taches,
		todayIso,
	}: { kind: DueKind; label: string; taches: TacheDue[]; todayIso: string } = $props();

	function sousTitre(t: TacheDue): string {
		const ent = t.entreprise?.raison_sociale?.trim();
		const etape = etapeLabel(t.etape_pipeline);
		return [ent, etape].filter(Boolean).join(' · ');
	}
</script>

{#if taches.length > 0}
	<div class="urg-band {kind}">
		{label}
		<span class="ub-ct">{taches.length}</span>
	</div>
	{#each taches as t (t.id)}
		{@const due = dueLabel(t.date_relance_prevue, todayIso)}
		{@const sub = sousTitre(t)}
		<a class="task" href="/crm/pipeline" data-sveltekit-preload-data="hover">
			<span class="task-ic" class:late={kind === 'late'} aria-hidden="true">
				<Icon name="schedule" size={17} strokeWidth={1.9} />
			</span>
			<span class="task-main">
				<span class="task-t">{tacheTitre(t)}</span>
				{#if sub}<span class="task-s">{sub}</span>{/if}
			</span>
			<span class="task-due {due.kind}">{due.text}</span>
			<span class="task-cta" aria-hidden="true">
				<Icon name="arrow_forward" size={16} strokeWidth={2} />
			</span>
		</a>
	{/each}
{/if}

<style>
	.urg-band {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 12px 12px 8px;
		font-size: 11.5px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.urg-band.late {
		color: var(--color-danger-deep);
	}
	.urg-band.today {
		color: var(--color-primary);
	}
	.urg-band.week {
		color: var(--color-text-muted);
	}
	.urg-band .ub-ct {
		margin-left: auto;
		font-size: 11px;
		padding: 1px 8px;
		border-radius: var(--radius-full);
	}
	.urg-band.late .ub-ct {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
	}
	.urg-band.today .ub-ct {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.urg-band.week .ub-ct {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}

	.task {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 12px;
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition:
			background 160ms var(--ease-out-expo),
			transform 160ms var(--ease-out-expo);
	}
	.task:hover {
		background: var(--color-surface-alt);
	}
	.task:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.task-ic {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-lg);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.task-ic.late {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
	}
	.task-main {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.task-t {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.task-s {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.task-due {
		font-size: 11.5px;
		font-weight: 700;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.task-due.late {
		color: var(--color-danger-deep);
	}
	.task-due.today {
		color: var(--color-primary);
	}
	.task-due.week {
		color: var(--color-text-muted);
	}
	.task-cta {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: var(--shadow-xs);
		flex-shrink: 0;
		transition: transform 160ms var(--ease-out-expo);
	}
	.task:hover .task-cta {
		transform: translateX(2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.task,
		.task-cta {
			transition: none;
		}
		.task:hover .task-cta {
			transform: none;
		}
	}
</style>
