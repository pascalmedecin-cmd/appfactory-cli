<script lang="ts">
	/**
	 * Timeline activité récente : 5 derniers items, icône contextuelle selon type_activite,
	 * dates relatives compactes (HH:MM / Hier / Lun. / DD/MM).
	 *
	 * Empty state si vide : surface neutre + invitation à démarrer (pas de doublon avec onboarding).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { formatRelativeDate } from '$lib/utils/dateFormat';

	type Activite = {
		id: string;
		type_activite: string | null;
		resume_contenu: string | null;
		date_heure: string | null;
		contact_id: string | null;
	};

	type Props = {
		activites: Activite[];
	};

	let { activites }: Props = $props();

	type IconKind = 'default' | 'success' | 'warning' | 'info';

	function iconForType(type: string | null): { name: string; kind: IconKind } {
		switch (type) {
			case 'appel': return { name: 'call', kind: 'default' };
			case 'email': return { name: 'mail', kind: 'info' };
			case 'reunion': return { name: 'groups', kind: 'info' };
			case 'note': return { name: 'note', kind: 'warning' };
			default: return { name: 'edit_note', kind: 'default' };
		}
	}

	function labelForType(type: string | null): string {
		switch (type) {
			case 'appel': return 'Appel';
			case 'email': return 'Email';
			case 'reunion': return 'Réunion';
			case 'note': return 'Note';
			default: return type ?? 'Activité';
		}
	}
</script>

<article class="panel">
	<div class="panel-head">
		<div>
			<div class="panel-meta">Activité récente</div>
			<div class="panel-title">Dernières interactions</div>
		</div>
	</div>
	<div class="panel-body">
		{#if activites.length === 0}
			<div class="empty">
				<p class="empty-title">Rien pour le moment</p>
				<p class="empty-body">Les appels, emails et notes que vous enregistrerez apparaîtront ici.</p>
			</div>
		{:else}
			<div class="timeline">
				{#each activites as activite (activite.id)}
					{@const ico = iconForType(activite.type_activite)}
					<div class="timeline-item">
						<div class="timeline-icon timeline-icon-{ico.kind}">
							<Icon name={ico.name} size={14} strokeWidth={1.75} />
						</div>
						<div class="timeline-content">
							<p class="timeline-title">{labelForType(activite.type_activite)}</p>
							<p class="timeline-desc">{activite.resume_contenu ?? '—'}</p>
						</div>
						<span class="timeline-time tabular-nums">{formatRelativeDate(activite.date_heure)}</span>
					</div>
				{/each}
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
	.panel-body { padding: 4px 0 16px; }

	.empty {
		padding: 32px 24px 24px;
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

	.timeline { position: relative; }
	.timeline-item {
		display: grid;
		grid-template-columns: 36px 1fr auto;
		align-items: start;
		gap: 12px;
		padding: 12px 24px;
		position: relative;
	}
	.timeline-item:not(:last-child)::after {
		content: "";
		position: absolute;
		top: 38px;
		bottom: -10px;
		left: 41px;
		width: 1px;
		background: var(--color-hairline);
	}
	.timeline-icon {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
		position: relative;
		flex-shrink: 0;
	}
	.timeline-icon-success { background: var(--color-success-light); color: var(--color-success-deep); }
	.timeline-icon-warning { background: var(--color-warning-light); color: var(--color-warning-deep); }
	.timeline-icon-info { background: var(--color-info-light); color: var(--color-info-deep); }

	.timeline-content { min-width: 0; }
	.timeline-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.timeline-desc {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.timeline-time {
		font-size: 11px;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
