<script lang="ts">
	/**
	 * Phase 1 widget triage matin sur dashboard.
	 * Affiche jusqu'à 12 leads à fort potentiel non touchés ; queue partagée 3 fondateurs.
	 * 4 actions inline par lead (Intéressant / Écarter / Snooze / Détails).
	 *
	 * Cohérent design avec /veille S132 (bandeau primary-dark + ornements cercles + tabular-nums).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast';
	import { sourceLabel, formatLeadContext } from '$lib/prospection-utils';
	import { config } from '$lib/config';
	import { TRIAGE_ACTIONS, type TriageAction } from '$lib/api/triage-actions';

	type Lead = {
		id: string;
		raison_sociale: string;
		score_pertinence: number | null;
		source: string;
		canton: string | null;
		localite: string | null;
		adresse: string | null;
		telephone: string | null;
		description: string | null;
		date_publication: string | null;
		montant: number | null;
	};

	type Props = {
		leads: Lead[];
		total: number;
		visibleLimit?: number;
	};

	let { leads, total, visibleLimit = 12 }: Props = $props();

	const visible = $derived(leads.slice(0, visibleLimit));
	const remaining = $derived(Math.max(0, total - visible.length));

	// Loading state par lead pour neutraliser action concurrente (race condition)
	let pendingIds = $state(new Set<string>());

	// Helper réactif pour mutate Set (pattern Svelte 5 : réassigner pour trigger reactivity).
	function setPending(id: string, on: boolean) {
		if (on) pendingIds.add(id);
		else pendingIds.delete(id);
		pendingIds = new Set(pendingIds);
	}

	async function callTriage(action: TriageAction, leadId: string) {
		if (pendingIds.has(leadId)) return;
		setPending(leadId, true);

		try {
			const res = await fetch(`/api/prospection/triage/${action}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ leadId }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toasts.error((body as { error?: string }).error ?? 'Action impossible');
				// Si conflit (lead traité par un autre fondateur), rafraîchir la queue
				if (res.status === 409) await invalidateAll();
				return false;
			}
			return true;
		} catch {
			toasts.error('Réseau indisponible');
			return false;
		} finally {
			setPending(leadId, false);
		}
	}

	async function onYes(leadId: string) {
		const ok = await callTriage('oui', leadId);
		if (ok) {
			// Redirection vers la fiche pour appel immédiat
			goto(`/prospection?slideOut=${encodeURIComponent(leadId)}`, { invalidateAll: true, keepFocus: false });
		}
	}

	async function onNo(leadId: string) {
		const ok = await callTriage('non', leadId);
		if (ok) await invalidateAll();
	}

	async function onLater(leadId: string) {
		const ok = await callTriage('plus-tard', leadId);
		if (ok) {
			toasts.success(`Lead repoussé à ${config.scoring.triage.snoozeDays} jours`);
			await invalidateAll();
		}
	}

	function onView(leadId: string) {
		goto(`/prospection?slideOut=${encodeURIComponent(leadId)}`, { invalidateAll: false, keepFocus: false });
	}

	function viewQueueAll() {
		// Cohérent avec le critère queue côté serveur (statut=nouveau, score>=triage.scoreMin).
		// Pas de filtre temp= pour ne pas masquer les leads tièdes haut (4-6) inclus dans la queue.
		goto('/prospection?statut=nouveau', { invalidateAll: true });
	}
</script>

<article class="triage-card">
	<!-- Bouton natif (vs aside role=button) : a11y native, focus + keydown + role gérés par le navigateur -->
	<button
		type="button"
		class="triage-aside"
		aria-label="Voir la file complète sur /prospection"
		onclick={viewQueueAll}
	>
		<div class="triage-aside-kicker">
			<Icon name="bolt" size={16} />
			<span>À trier ce matin</span>
		</div>
		{#if total === 0}
			<div class="triage-aside-count tabular-nums">0</div>
			<div class="triage-aside-label">file vide</div>
		{:else}
			<div class="triage-aside-count tabular-nums">{visible.length}</div>
			<div class="triage-aside-label">leads à fort potentiel non touchés</div>
			{#if remaining > 0}
				<span class="triage-aside-cta">
					Voir les {remaining} autres en file
					<Icon name="arrow_forward" size={13} />
				</span>
			{/if}
		{/if}
	</button>

	<div class="triage-list">
		{#if leads.length === 0}
			<div class="triage-empty">
				<div class="triage-empty-title">Rien à trier ce matin</div>
				<p class="triage-empty-body">Votre fond de pipe travaille pour vous. Les nouveaux leads chauds atterriront ici dès le prochain import.</p>
			</div>
		{:else}
			{#each visible as lead, i (lead.id)}
				<div class="triage-item" style="--i: {i}" class:is-pending={pendingIds.has(lead.id)}>
					<div class="triage-item-content">
						<div class="triage-item-line1">
							<Badge label={sourceLabel(lead.source)} variant="muted" />
							<span class="triage-item-name" title={lead.raison_sociale}>{lead.raison_sociale}</span>
							<span class="triage-item-score-wrap">
								<ScorePill score={lead.score_pertinence} compact />
							</span>
						</div>
						<div class="triage-item-context">{formatLeadContext(lead)}</div>
					</div>
					<div class="triage-actions">
						<button class="btn-action btn-yes" aria-label="Intéressant - marquer + ouvrir la fiche" title="Intéressant" disabled={pendingIds.has(lead.id)} onclick={() => onYes(lead.id)}>
							<Icon name="check_circle" size={17} />
						</button>
						<button class="btn-action btn-no" aria-label="Écarter ce lead" title="Écarter" disabled={pendingIds.has(lead.id)} onclick={() => onNo(lead.id)}>
							<Icon name="circle_x" size={17} />
						</button>
						<button class="btn-action btn-later" aria-label="Repousser à 7 jours" title="Snooze 7 j" disabled={pendingIds.has(lead.id)} onclick={() => onLater(lead.id)}>
							<Icon name="schedule" size={17} />
						</button>
						<button class="btn-action btn-view" aria-label="Voir la fiche en lecture seule" title="Détails" disabled={pendingIds.has(lead.id)} onclick={() => onView(lead.id)}>
							<Icon name="eye" size={17} />
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</article>

<style>
	.triage-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		overflow: hidden;
		display: grid;
		grid-template-columns: 280px 1fr;
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
	}
	@media (max-width: 1024px) { .triage-card { grid-template-columns: 1fr; } }

	/* Reset button native styles (border, font, background) puis appliquer pattern aside primary-dark. */
	.triage-aside {
		background: var(--color-primary-dark, #0A1628);
		color: white;
		padding: 32px 28px;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 320px;
		cursor: pointer;
		transition: background 180ms ease;
		text-align: left;
		border: 0;
		font: inherit;
		width: 100%;
	}
	.triage-aside:hover { background: #050C18; }
	.triage-aside:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
	@media (max-width: 1024px) {
		.triage-aside {
			flex-direction: row;
			align-items: center;
			min-height: auto;
			padding: 20px 24px;
			gap: 16px;
			flex-wrap: wrap;
		}
	}

	.triage-aside::before {
		content: '';
		position: absolute;
		top: -60px; right: -60px;
		width: 220px; height: 220px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 50%;
		pointer-events: none;
	}
	.triage-aside::after {
		content: '';
		position: absolute;
		bottom: -40px; left: -40px;
		width: 160px; height: 160px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 50%;
		pointer-events: none;
	}

	.triage-aside-kicker {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		position: relative;
	}
	.triage-aside-count {
		font-size: 88px;
		font-weight: 700;
		line-height: 1;
		color: white;
		letter-spacing: -0.04em;
		margin: 16px 0 8px;
		position: relative;
	}
	@media (max-width: 1024px) {
		.triage-aside-count { font-size: 44px; margin: 0; }
	}
	.triage-aside-label {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.75);
		line-height: 1.4;
		position: relative;
	}
	.triage-aside-cta {
		font-size: 12.5px;
		color: rgba(190, 211, 235, 0.95);
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 16px;
		transition: color 180ms ease;
		position: relative;
		letter-spacing: 0.005em;
		width: fit-content;
		padding-bottom: 4px;
		border-bottom: 1px solid rgba(190, 211, 235, 0.30);
	}
	.triage-aside:hover .triage-aside-cta {
		color: #DCEAF7;
		border-bottom-color: rgba(220, 234, 247, 0.55);
	}

	.triage-list { display: flex; flex-direction: column; }

	.triage-empty {
		padding: 48px 32px;
		text-align: center;
		color: var(--color-text-muted);
	}
	.triage-empty-title {
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 8px;
	}
	.triage-empty-body { font-size: 14px; max-width: 420px; margin: 0 auto; line-height: 1.55; }

	.triage-item {
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-border);
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 16px;
		align-items: center;
		transition: background 200ms ease, opacity 200ms ease;
		animation: fadeUp 280ms ease both;
		animation-delay: calc(var(--i, 0) * 50ms);
	}
	.triage-item:hover { background: var(--color-surface-alt); }
	.triage-item:last-child { border-bottom: none; }
	.triage-item.is-pending { opacity: 0.55; pointer-events: none; }

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.triage-item-content {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.triage-item-line1 {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.triage-item-name {
		font-weight: 600;
		font-size: 15px;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 320px;
	}
	.triage-item-score-wrap { margin-left: auto; }
	.triage-item-context {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.45;
	}

	.triage-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}
	/* Pattern Notion / Stripe property buttons.
	   Repos : icône colorée sémantique 40% saturation, pas de bg/border.
	   Hover : bg tinté + saturation max + élévation + tinted shadow. */
	.btn-action {
		width: 36px; height: 36px;
		padding: 0;
		border-radius: 8px;
		font-family: inherit;
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
		transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
					background 220ms cubic-bezier(0.16, 1, 0.3, 1),
					color 180ms ease,
					box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		will-change: transform;
	}
	.btn-action:hover { transform: translateY(-1px); }
	.btn-action:active { transform: scale(0.96) translateY(0); transition-duration: 80ms; }
	.btn-action:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.30);
	}
	.btn-action:disabled { cursor: wait; opacity: 0.5; transform: none !important; }

	.btn-yes { color: #6E9C8F; }
	.btn-no { color: #C28A86; }
	.btn-later { color: #8A95A8; }
	.btn-view { color: #7B8FAE; }
	.btn-yes:hover:not(:disabled) {
		background: #ECFDF3;
		color: #027A48;
		box-shadow: 0 4px 12px -3px rgba(2, 122, 72, 0.22);
	}
	.btn-no:hover:not(:disabled) {
		background: #FFF1EC;
		color: #C0391A;
		box-shadow: 0 4px 12px -3px rgba(192, 57, 26, 0.22);
	}
	.btn-later:hover:not(:disabled) {
		background: var(--color-info-light);
		color: var(--color-info);
		box-shadow: 0 4px 12px -3px rgba(90, 113, 144, 0.20);
	}
	.btn-view:hover:not(:disabled) {
		background: var(--color-primary-light);
		color: var(--color-primary);
		box-shadow: 0 4px 12px -3px rgba(47, 90, 158, 0.22);
	}

	/* Mobile : 4 boutons en grid 2x2 avec label visible (mode lecture) */
	@media (max-width: 768px) {
		.triage-item { grid-template-columns: 1fr; }
		.triage-actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
			width: 100%;
		}
		.btn-action {
			width: 100%;
			height: 44px;
			gap: 8px;
			font-size: 13px;
			font-weight: 500;
		}
		.btn-yes::after { content: 'Intéressant'; }
		.btn-no::after { content: 'Écarter'; }
		.btn-later::after { content: 'Snooze 7 j'; }
		.btn-view::after { content: 'Détails'; }
	}
</style>
