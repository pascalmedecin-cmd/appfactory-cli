<script lang="ts">
	/**
	 * Strip 2 cards 50/50 desktop, 1 col mobile. Border-left coloré 3px + icon tint.
	 * Section masquée si aucun signal ni alerte (AC-13 : pas d'empty state).
	 */
	import Icon from '$lib/components/Icon.svelte';

	type Alerte = {
		nom: string;
		nb_nouveaux: number | null;
		frequence_alerte: string | null;
	};

	type Props = {
		signauxCount: number;
		alertes: Alerte[];
	};

	let { signauxCount, alertes }: Props = $props();

	const showSignaux = $derived(signauxCount > 0);
	const showAlertes = $derived(alertes.length > 0);
	const visible = $derived(showSignaux || showAlertes);

	const alertesSummary = $derived(
		alertes
			.map((a) => `${a.nom}: ${a.nb_nouveaux} nouveau${(a.nb_nouveaux ?? 0) > 1 ? 'x' : ''}`)
			.join(' · ')
	);
</script>

{#if visible}
	<section aria-label="Signaux d'attention">
		<div class="section-head">
			<div class="section-title-block">
				<div class="section-meta">Signaux d'attention</div>
				<h2 class="section-h2">À surveiller</h2>
			</div>
		</div>
		<div class="alerts-strip">
			{#if showSignaux}
				<a href="/signaux" class="alert-card alert-info">
					<span class="alert-icon">
						<Icon name="radar" size={18} strokeWidth={1.75} />
					</span>
					<div class="alert-body">
						<p class="alert-title">
							{signauxCount} {signauxCount === 1 ? "signal d'affaires à traiter" : "signaux d'affaires à traiter"}
						</p>
						<p class="alert-desc">
							Appels d'offres, permis de construire, créations d'entreprises à analyser ou convertir.
						</p>
					</div>
					<span class="alert-arrow" aria-hidden="true">
						<Icon name="arrow_forward" size={16} strokeWidth={2.5} />
					</span>
				</a>
			{/if}
			{#if showAlertes}
				<a href="/prospection" class="alert-card alert-warn">
					<span class="alert-icon">
						<Icon name="notifications_active" size={18} strokeWidth={1.75} />
					</span>
					<div class="alert-body">
						<p class="alert-title">Nouveaux leads détectés</p>
						<p class="alert-desc">{alertesSummary}</p>
					</div>
					<span class="alert-arrow" aria-hidden="true">
						<Icon name="arrow_forward" size={16} strokeWidth={2.5} />
					</span>
				</a>
			{/if}
		</div>
	</section>
{/if}

<style>
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
	.section-meta {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-muted);
	}
	.section-h2 {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--color-primary-dark);
		margin: 0;
	}

	.alerts-strip {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}
	.alert-card {
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		padding: 18px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		text-decoration: none;
		color: inherit;
		box-shadow: var(--shadow-card);
		transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
		overflow: hidden;
	}
	.alert-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-card-hover);
	}
	.alert-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.alert-card::before {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: currentColor;
		opacity: 0.6;
	}
	.alert-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-xl);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: currentColor;
		color: currentColor;
	}
	.alert-icon :global(svg) { color: var(--color-surface); }
	.alert-body { flex: 1; min-width: 0; }
	.alert-title {
		font-size: 13.5px;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.alert-desc {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 4px 0 0;
		line-height: 1.45;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.alert-arrow {
		color: var(--color-text-muted);
		transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms ease;
		display: inline-flex;
	}
	.alert-card:hover .alert-arrow {
		transform: translateX(4px);
		color: currentColor;
	}

	.alert-info {
		color: var(--color-info);
	}
	.alert-info .alert-icon {
		background: var(--color-info-light);
		color: var(--color-info);
	}
	.alert-info .alert-icon :global(svg) { color: var(--color-info); }

	.alert-warn {
		color: var(--color-warning);
	}
	.alert-warn .alert-icon {
		background: var(--color-warning-light);
		color: var(--color-warning);
	}
	.alert-warn .alert-icon :global(svg) { color: var(--color-warning); }

	@media (max-width: 768px) {
		.alerts-strip { grid-template-columns: 1fr; }
	}

	@media (prefers-reduced-motion: reduce) {
		.alert-card, .alert-arrow { transition: none; }
		.alert-card:hover { transform: none; }
		.alert-card:hover .alert-arrow { transform: none; }
	}
</style>
