<script lang="ts">
	/**
	 * Phase 1 widget triage matin sur dashboard, refonte v9 (charte golden /prospection).
	 * Affiche jusqu'à 12 leads à fort potentiel non touchés ; queue partagée 3 fondateurs.
	 * 4 actions inline par lead (Intéressant / Écarter / Snooze / Détails).
	 *
	 * Refonte v9 (S175 Bloc #1) :
	 * - Section-head externe (kicker + h2 + sub) au-dessus de la card.
	 * - Card radius-3xl + diffusion shadow, plus de count aside (déplacé dans KpisBento).
	 * - Items grid 96px 1fr auto auto pour aligner les noms sur Y indépendamment du badge source.
	 * - Footer dégradé surface→surface-alt avec CTA « Voir tous ».
	 */
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast';
	import { sourceLabel, formatLeadContext } from '$lib/prospection-utils';
	import { config, CRM_BASE } from '$lib/config';
	import type { TriageAction } from '$lib/api/triage-actions';

	type Lead = {
		id: string;
		raison_sociale: string;
		score_pertinence: number | null;
		statut: string;
		source: string;
		source_id: string | null;
		source_url: string | null;
		canton: string | null;
		localite: string | null;
		adresse: string | null;
		npa: string | null;
		telephone: string | null;
		email: string | null;
		nom_contact: string | null;
		site_web: string | null;
		secteur_detecte: string | null;
		description: string | null;
		date_publication: string | null;
		montant: number | null;
	};

	type Props = {
		leads: Lead[];
		total: number;
		visibleLimit?: number;
		/** Callback optionnel : si fourni, ouvre le lead dans un slide-out local
		 *  au lieu de naviguer vers /prospection. */
		onLeadOpen?: (lead: Lead) => void;
	};

	let { leads, total, visibleLimit = 12, onLeadOpen }: Props = $props();

	const visible = $derived(leads.slice(0, visibleLimit));
	const remaining = $derived(Math.max(0, total - visible.length));

	let pendingIds = $state(new Set<string>());

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

	async function onYes(lead: Lead) {
		const ok = await callTriage('oui', lead.id);
		if (ok) {
			if (onLeadOpen) {
				onLeadOpen(lead);
				await invalidateAll();
			} else {
				goto(`${CRM_BASE}/prospection?slideOut=${encodeURIComponent(lead.id)}`, { invalidateAll: true, keepFocus: false });
			}
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

	function onView(lead: Lead) {
		if (onLeadOpen) {
			onLeadOpen(lead);
		} else {
			goto(`${CRM_BASE}/prospection?slideOut=${encodeURIComponent(lead.id)}`, { invalidateAll: false, keepFocus: false });
		}
	}

	function viewQueueAll() {
		goto('/crm/prospection?statut=nouveau', { invalidateAll: true });
	}
</script>

<section class="tq-section" aria-label="Triage des leads à fort potentiel">
	<div class="section-head">
		<div class="section-title-block">
			<div class="kicker">
				<span class="dot" aria-hidden="true"></span>
				Inbox du matin
			</div>
			<h2 class="section-h2">À traiter en premier</h2>
			<p class="section-sub">
				{#if total === 0}
					Votre fond de pipe travaille pour vous. Les nouveaux leads chauds atterriront ici dès le prochain import.
				{:else}
					Leads chauds non touchés, triés par score puis date d'import.
				{/if}
			</p>
		</div>
	</div>

	<div class="tq">
		<div class="tq-list">
			{#if leads.length === 0}
				<div class="tq-empty">
					<p class="tq-empty-title">Rien à trier ce matin</p>
					<p class="tq-empty-body">Toutes les opportunités fraîches sont déjà passées en revue.</p>
				</div>
			{:else}
				{#each visible as lead, i (lead.id)}
					<article class="tq-item" style="--i: {i}" class:is-pending={pendingIds.has(lead.id)}>
						<span class="tq-source-badge">
							<Badge label={sourceLabel(lead.source)} variant="muted" />
						</span>
						<div class="tq-name-block">
							<div class="tq-name" title={lead.raison_sociale}>{lead.raison_sociale}</div>
							<div class="tq-context">{formatLeadContext({ ...lead, montant: lead.montant === null ? null : Number(lead.montant) })}</div>
						</div>
						<span class="tq-score-wrap">
							<ScorePill score={lead.score_pertinence} compact />
						</span>
						<div class="tq-actions">
							<button type="button" class="ab ab-yes" aria-label="Intéressant - marquer + ouvrir la fiche" title="Intéressant" disabled={pendingIds.has(lead.id)} onclick={() => onYes(lead)}>
								<Icon name="check_circle" size={17} strokeWidth={1.75} />
							</button>
							<button type="button" class="ab ab-no" aria-label="Écarter ce lead" title="Écarter" disabled={pendingIds.has(lead.id)} onclick={() => onNo(lead.id)}>
								<Icon name="circle_x" size={17} strokeWidth={1.75} />
							</button>
							<button type="button" class="ab ab-later" aria-label="Snooze 7 j - repousser à 7 jours" title="Snooze 7 j" disabled={pendingIds.has(lead.id)} onclick={() => onLater(lead.id)}>
								<Icon name="schedule" size={17} strokeWidth={1.75} />
							</button>
							<button type="button" class="ab ab-view" aria-label="Détails - voir la fiche en lecture seule" title="Détails" disabled={pendingIds.has(lead.id)} onclick={() => onView(lead)}>
								<Icon name="eye" size={17} strokeWidth={1.75} />
							</button>
						</div>
					</article>
				{/each}
			{/if}
		</div>

		{#if leads.length > 0}
			<div class="tq-footer">
				<span>
					Affichage des {visible.length} {visible.length === 1 ? 'premier' : 'premiers'} · {total} {total === 1 ? 'lead en file' : 'leads en file'}
				</span>
				<button type="button" class="tq-footer-cta" onclick={viewQueueAll}>
					{remaining > 0 ? `Voir les ${remaining} ${remaining === 1 ? 'autre' : 'autres'}` : 'Voir tous les leads'}
					<Icon name="arrow_forward" size={13} strokeWidth={2.5} />
				</button>
			</div>
		{/if}
	</div>
</section>

<style>
	.tq-section { display: block; }

	.section-head {
		display: flex;
		align-items: end;
		justify-content: space-between;
		margin-bottom: 20px;
		padding-bottom: 4px;
	}
	.section-title-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.section-h2 {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--color-primary-dark);
		margin: 0;
	}
	.section-sub {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
		max-width: 720px;
	}

	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-text-muted);
	}
	.kicker .dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--color-success);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 15%, transparent);
	}

	.tq {
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.tq-list {
		padding: 4px 0;
		display: flex;
		flex-direction: column;
	}

	.tq-empty {
		padding: 48px 32px;
		text-align: center;
	}
	.tq-empty-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 6px;
	}
	.tq-empty-body {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.55;
		max-width: 420px;
		margin-left: auto;
		margin-right: auto;
	}

	.tq-item {
		display: grid;
		grid-template-columns: 96px 1fr auto auto;
		align-items: center;
		gap: 16px;
		padding: 16px 24px;
		transition: background 220ms var(--ease-out-expo), opacity 200ms ease;
		position: relative;
		animation: fadeUp 280ms ease both;
		animation-delay: calc(var(--i, 0) * 50ms);
	}
	.tq-item:not(:last-child)::after {
		content: "";
		position: absolute;
		bottom: 0;
		left: 24px;
		right: 24px;
		height: 1px;
		background: var(--color-hairline);
	}
	.tq-item:hover { background: var(--color-surface-alt); }
	.tq-item.is-pending { opacity: 0.55; pointer-events: none; }

	.tq-source-badge { justify-self: start; }

	.tq-name-block { min-width: 0; }
	.tq-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tq-context {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tq-score-wrap {
		display: inline-flex;
		align-items: center;
	}

	.tq-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}
	.ab {
		width: 36px;
		height: 36px;
		padding: 0;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 220ms var(--ease-out-expo),
					background 220ms var(--ease-out-expo),
					color 180ms ease,
					box-shadow 220ms var(--ease-out-expo);
		font-family: inherit;
		will-change: transform;
	}
	.ab:hover:not(:disabled) { transform: translateY(-1px); }
	.ab:active:not(:disabled) { transform: scale(0.96) translateY(0); transition-duration: 80ms; }
	.ab:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent);
	}
	.ab:disabled { cursor: wait; opacity: 0.5; transform: none !important; }

	/* Audit 360 V2c H-24 : couleurs ActionButton dérivées des tokens sémantiques
	   (repos = variante atténuée via color-mix, hover = token saturé). Aucun hex hardcodé. */
	.ab-yes { color: color-mix(in srgb, var(--color-success) 62%, var(--color-text-muted)); }
	.ab-no { color: color-mix(in srgb, var(--color-danger) 58%, var(--color-text-muted)); }
	.ab-later { color: var(--color-info-deep); }
	.ab-view { color: color-mix(in srgb, var(--color-primary) 68%, var(--color-text-muted)); }
	.ab-yes:hover:not(:disabled) {
		background: var(--color-success-light);
		color: var(--color-success-deep);
		box-shadow: 0 4px 12px -3px color-mix(in srgb, var(--color-success) 22%, transparent);
	}
	.ab-no:hover:not(:disabled) {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
		box-shadow: 0 4px 12px -3px color-mix(in srgb, var(--color-danger) 22%, transparent);
	}
	.ab-later:hover:not(:disabled) {
		background: var(--color-info-light);
		color: var(--color-info-deep);
		box-shadow: 0 4px 12px -3px color-mix(in srgb, var(--color-info) 20%, transparent);
	}
	.ab-view:hover:not(:disabled) {
		background: var(--color-primary-light);
		color: var(--color-primary);
		box-shadow: 0 4px 12px -3px color-mix(in srgb, var(--color-primary) 22%, transparent);
	}

	.tq-footer {
		padding: 14px 24px;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-alt);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
		color: var(--color-text-muted);
		gap: 12px;
		flex-wrap: wrap;
	}
	.tq-footer-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--color-primary);
		font-weight: 600;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		font-size: 13px;
	}
	.tq-footer-cta:hover { text-decoration: underline; text-underline-offset: 3px; }
	.tq-footer-cta:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Mobile : tags ligne 1 (badge gauche, score droite),
	   nom + contexte ligne 2 sans troncature pleine largeur,
	   actions ligne 3 en grid 2x2 avec labels. */
	@media (max-width: 768px) {
		.tq-item {
			grid-template-columns: 1fr auto;
			grid-template-areas:
				"badge   score"
				"name    name"
				"actions actions";
			row-gap: 8px;
			column-gap: 12px;
			padding: 16px;
		}
		.tq-source-badge { grid-area: badge; justify-self: start; }
		.tq-name-block { grid-area: name; min-width: 0; }
		.tq-score-wrap { grid-area: score; justify-self: end; }
		.tq-name {
			white-space: normal;
			overflow: visible;
			text-overflow: clip;
			max-width: none;
			line-height: 1.3;
		}
		.tq-context {
			white-space: normal;
			overflow: visible;
			text-overflow: clip;
			line-height: 1.4;
			margin-top: 4px;
		}
		.tq-actions {
			grid-area: actions;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
			width: 100%;
			margin-top: 4px;
		}
		.ab {
			width: 100%;
			height: 44px;
			gap: 8px;
			font-size: 13px;
			font-weight: 500;
		}
		.ab-yes::after { content: 'Intéressant'; }
		.ab-no::after { content: 'Écarter'; }
		.ab-later::after { content: 'Snooze 7 j'; }
		.ab-view::after { content: 'Détails'; }
	}

	@media (prefers-reduced-motion: reduce) {
		.tq-item { animation: none; }
		.ab, .tq-item { transition: none; }
		.ab:hover:not(:disabled), .ab:active:not(:disabled) { transform: none; }
	}
</style>
