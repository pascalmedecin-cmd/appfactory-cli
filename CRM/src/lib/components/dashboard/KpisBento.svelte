<script lang="ts">
	/**
	 * KPIs Bento asymétrique 12 cols : 1 vedette col-span-6 primary-dark + 2 splits col-span-3.
	 * Jamais 4 cards équivalentes — anti-pattern dashboard générique.
	 */
	import Icon from '$lib/components/Icon.svelte';

	type RelancesData = {
		total: number;
		retard: number;
	};

	type Props = {
		triageTotal: number;
		triageVisible: number;
		signauxCount: number;
		relances: RelancesData;
	};

	let { triageTotal, triageVisible, signauxCount, relances }: Props = $props();

	const remaining = $derived(Math.max(0, triageTotal - triageVisible));
	const triageQueueLink = '/prospection?statut=nouveau';

	const trendSignaux = $derived(signauxCount > 0 ? `${signauxCount} ${signauxCount === 1 ? 'à analyser' : 'à analyser'}` : 'Aucun nouveau');

	type RelanceTrend = { label: string; variant: 'flat' | 'success' | 'warn' };
	const relanceTrend = $derived<RelanceTrend>(
		relances.retard > 0
			? { label: `${relances.retard} en retard`, variant: 'warn' }
			: relances.total === 0
				? { label: 'Tout est suivi', variant: 'success' }
				: { label: `${relances.total} ${relances.total === 1 ? 'prévue' : 'prévues'}`, variant: 'flat' }
	);
</script>

<section class="kpis" aria-label="Indicateurs clés">
	<!-- Vedette : à trier ce matin -->
	<a class="kpi-card kpi-featured" href={triageQueueLink}>
		<div class="kpi-kicker">
			<Icon name="bolt" size={13} />
			À trier ce matin
		</div>
		<div class="kpi-value tabular-nums">{triageTotal}</div>
		<div class="kpi-label">{triageTotal === 1 ? 'lead prioritaire en file' : 'leads prioritaires en file'}</div>
		{#if remaining > 0}
			<span class="kpi-cta">
				Voir les {remaining} {remaining === 1 ? 'autre' : 'autres'} en file
				<Icon name="arrow_forward" size={12} />
			</span>
		{:else if triageTotal > 0}
			<span class="kpi-cta">
				Ouvrir la file
				<Icon name="arrow_forward" size={12} />
			</span>
		{/if}
	</a>

	<!-- Split : marchés ouverts -->
	<a class="kpi-card kpi-split" href="/signaux">
		<div class="kpi-kicker">
			<Icon name="radar" size={13} />
			Signaux ouverts
		</div>
		<div class="kpi-value tabular-nums">{signauxCount}</div>
		<div class="kpi-label">à analyser</div>
		<div class="kpi-trend kpi-trend-flat">
			<Icon name="conversion_path" size={12} />
			{trendSignaux}
		</div>
	</a>

	<!-- Split : relances -->
	<a class="kpi-card kpi-split" href="/pipeline">
		<div class="kpi-kicker">
			<Icon name="schedule" size={13} />
			Relances dues
		</div>
		<div class="kpi-value tabular-nums">{relances.total}</div>
		<div class="kpi-label">{relances.total === 1 ? 'opportunité' : 'opportunités'}</div>
		<div class="kpi-trend kpi-trend-{relanceTrend.variant}">
			{#if relanceTrend.variant === 'warn'}
				<Icon name="notifications_active" size={12} />
			{:else if relanceTrend.variant === 'success'}
				<Icon name="check_circle" size={12} />
			{:else}
				<Icon name="conversion_path" size={12} />
			{/if}
			{relanceTrend.label}
		</div>
	</a>
</section>

<style>
	.kpis {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 16px;
		margin-bottom: 48px;
	}
	.kpi-card {
		background: var(--color-surface);
		border-radius: 24px;
		padding: 24px;
		box-shadow: 0 1px 0 rgba(17, 24, 39, 0.02), 0 0 0 1px rgba(17, 24, 39, 0.04), 0 8px 20px -12px rgba(17, 24, 39, 0.10);
		position: relative;
		overflow: hidden;
		transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1);
		display: block;
		text-decoration: none;
		color: inherit;
	}
	.kpi-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 1px 3px rgba(17, 24, 39, 0.05), 0 20px 40px -15px rgba(17, 24, 39, 0.08);
	}
	.kpi-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.kpi-featured {
		grid-column: span 6;
		background: var(--color-primary-dark);
		color: white;
		padding: 28px;
	}
	.kpi-featured::before {
		content: "";
		position: absolute;
		top: -64px;
		right: -64px;
		width: 280px;
		height: 280px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 60%);
		pointer-events: none;
	}
	.kpi-featured::after {
		content: "";
		position: absolute;
		bottom: -40px;
		left: -40px;
		width: 180px;
		height: 180px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.025);
		pointer-events: none;
	}
	.kpi-split { grid-column: span 3; }

	.kpi-kicker {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-text-muted);
		margin-bottom: 16px;
		position: relative;
	}
	.kpi-featured .kpi-kicker { color: rgba(255, 255, 255, 0.6); }

	.kpi-value {
		font-size: 56px;
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1;
		color: var(--color-primary-dark);
		margin-bottom: 8px;
		position: relative;
	}
	.kpi-featured .kpi-value { color: white; font-size: 76px; }
	.kpi-split .kpi-value { font-size: 40px; }

	.kpi-label {
		font-size: 14px;
		color: var(--color-text-muted);
		font-weight: 500;
		position: relative;
	}
	.kpi-featured .kpi-label {
		color: rgba(255, 255, 255, 0.75);
		font-size: 15px;
	}

	.kpi-trend {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		margin-top: 6px;
	}
	.kpi-trend-flat { color: var(--color-text-muted); }
	.kpi-trend-success { color: var(--color-success); }
	.kpi-trend-warn { color: var(--color-warning); }

	.kpi-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 20px;
		font-size: 13px;
		font-weight: 500;
		color: rgba(220, 234, 247, 0.9);
		text-decoration: underline;
		text-decoration-color: rgba(220, 234, 247, 0.3);
		text-underline-offset: 4px;
		transition: color 200ms ease, text-decoration-color 200ms ease;
		position: relative;
	}
	.kpi-featured:hover .kpi-cta {
		color: white;
		text-decoration-color: rgba(220, 234, 247, 0.6);
	}

	@media (max-width: 768px) {
		.kpis { grid-template-columns: 1fr; gap: 12px; margin-bottom: 32px; }
		.kpi-featured, .kpi-split { grid-column: span 1; }
		.kpi-featured .kpi-value { font-size: 56px; }
		.kpi-split .kpi-value { font-size: 36px; }
	}

	@media (prefers-reduced-motion: reduce) {
		.kpi-card { transition: none; }
		.kpi-card:hover { transform: none; }
	}
</style>
