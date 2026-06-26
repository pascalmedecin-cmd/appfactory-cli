<script lang="ts">
	/**
	 * DashboardTemporel (Vague 3.3, flag ffCrmListesV2) : accueil « façon Capsule ».
	 * Ouvre sur « ce qui presse » organisé dans le temps (en retard / aujourd'hui /
	 * cette semaine) + « ce qui s'est passé », au lieu d'un mur de chiffres.
	 * Source des tâches = relances dues sur opportunités (ADR-0005, données réelles).
	 */
	import KpiStrip, { type KpiItem } from '$lib/components/KpiStrip.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import UrgencyGroup from './UrgencyGroup.svelte';
	import ActivityFeed from './ActivityFeed.svelte';
	import { bucketTaches, type TacheDue } from '$lib/utils/dashboardTemporel';

	type Activite = {
		id: string;
		type_activite: string | null;
		resume_contenu: string | null;
		date_heure: string | null;
		contact_id: string | null;
	};

	let {
		firstName,
		todayIso,
		taches,
		activites,
		opportunitesCount,
		signauxCount,
		onLeadExpress,
	}: {
		firstName: string | null;
		todayIso: string;
		taches: TacheDue[];
		activites: Activite[];
		opportunitesCount: number;
		signauxCount: number;
		/** Ouvre la saisie rapide « lead express » (terrain). Si absent, le bouton mobile n'est pas rendu. */
		onLeadExpress?: () => void;
	} = $props();

	const buckets = $derived(bucketTaches(taches, todayIso));
	const totalActions = $derived(buckets.late.length + buckets.today.length + buckets.week.length);

	const dateLabel = $derived(formatDateLong(todayIso));
	const subtitle = $derived(buildSubtitle(buckets.late.length, buckets.today.length));

	const kpis = $derived<KpiItem[]>([
		{ icon: 'schedule', value: buckets.late.length, label: 'Relances en retard', tone: 'danger' },
		{ icon: 'calendar_today', value: buckets.today.length, label: "À faire aujourd'hui", tone: 'primary' },
		{ icon: 'trending_up', value: opportunitesCount, label: 'Affaires en cours', tone: 'convert' },
		{ icon: 'radar', value: signauxCount, label: 'Signaux à trier', tone: 'warn' },
	]);

	function formatDateLong(iso: string): string {
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
		if (!m) return '';
		const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
		const s = d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function buildSubtitle(late: number, today: number): string {
		if (late === 0 && today === 0) return "Rien d'urgent aujourd'hui. Tout est sous contrôle.";
		const parts: string[] = [];
		if (late > 0) parts.push(`${late} relance${late > 1 ? 's' : ''} en retard`);
		parts.push(`${today} à faire aujourd'hui`);
		return parts.join(', ') + '.';
	}
</script>

<div class="dt">
	<!-- Hero -->
	<div class="dt-hero stagger" style="--i: 0;">
		<h1>Bonjour{firstName ? ` ${firstName}` : ''}</h1>
		<p>{dateLabel}{dateLabel ? ' - ' : ''}{subtitle}</p>
	</div>

	<!-- Chips KPI compacts -->
	<div class="stagger" style="--i: 1;">
		<KpiStrip items={kpis} ariaLabel="Indicateurs de la journée" />
	</div>

	<!-- Saisie rapide « lead express » (mobile + tablette uniquement) -->
	{#if onLeadExpress}
		<button
			type="button"
			onclick={onLeadExpress}
			class="lead-express-mobile lg:hidden stagger"
			style="--i: 2;"
			aria-label="Saisir un nouveau lead express depuis le terrain"
		>
			<span class="lead-express-icon">
				<Icon name="bolt" size={20} strokeWidth={1.75} />
			</span>
			<span class="lead-express-body">
				<span class="lead-express-title">Nouveau lead express</span>
				<span class="lead-express-sub">Saisie rapide post-RDV : entreprise + contact + tél + note</span>
			</span>
			<Icon name="arrow_forward" size={16} strokeWidth={2.5} />
		</button>
	{/if}

	<!-- Grille : À faire | (fil + pipeline) -->
	<div class="dt-grid stagger" style="--i: 3;">
		<!-- colonne gauche : à faire, par urgence temporelle -->
		<section class="panel" aria-label="À faire">
			<div class="panel-h">
				<span class="hdot" style="background: var(--color-primary);"></span>
				<h3>À faire</h3>
				<span class="pcount">{totalActions} action{totalActions > 1 ? 's' : ''}</span>
			</div>
			{#if totalActions === 0}
				<div class="warm">
					<Icon name="check_circle" size={20} strokeWidth={1.9} />
					<div>
						<div class="wt">Rien d'urgent</div>
						<div class="ws">Aucune relance due cette semaine. Profitez-en pour prospecter.</div>
					</div>
				</div>
			{:else}
				<div class="urg">
					<UrgencyGroup kind="late" label="En retard" taches={buckets.late} {todayIso} />
					<UrgencyGroup kind="today" label="Aujourd'hui" taches={buckets.today} {todayIso} />
					<UrgencyGroup kind="week" label="Cette semaine" taches={buckets.week} {todayIso} />
				</div>
			{/if}
		</section>

		<!-- colonne droite : fil d'activité + pipeline -->
		<div class="dt-side">
			<ActivityFeed {activites} />

			<a class="panel pipe" href="/crm/pipeline" data-sveltekit-preload-data="hover">
				<div class="panel-h">
					<span class="hdot" style="background: var(--color-prosp-qualify);"></span>
					<h3>Pipeline</h3>
					<span class="pcount">{opportunitesCount} affaire{opportunitesCount > 1 ? 's' : ''}</span>
				</div>
				<div class="warm pipe-warm">
					<Icon name="trending_up" size={20} strokeWidth={1.9} />
					<div>
						{#if opportunitesCount === 0}
							<div class="wt">Aucune affaire en cours</div>
							<div class="ws">Convertissez un signal ou un prospect pour démarrer le suivi.</div>
						{:else}
							<div class="wt">{opportunitesCount} affaire{opportunitesCount > 1 ? 's' : ''} en cours</div>
							<div class="ws">Suivez leur avancement dans le Pipeline.</div>
						{/if}
					</div>
				</div>
			</a>
		</div>
	</div>
</div>

<style>
	.dt {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.dt-hero {
		padding: 4px 0 8px;
	}
	.dt-hero h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.025em;
		color: var(--color-primary-dark);
		text-wrap: balance;
	}
	.dt-hero p {
		margin: 5px 0 0;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.dt-grid {
		display: grid;
		grid-template-columns: 1.55fr 1fr;
		gap: 18px;
		align-items: start;
		margin-top: 8px;
	}
	@media (max-width: 980px) {
		.dt-grid {
			grid-template-columns: 1fr;
		}
	}

	.dt-side {
		display: grid;
		gap: 18px;
	}

	.panel {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.panel-h {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 18px 12px;
	}
	.panel-h h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.01em;
	}
	.panel-h .pcount {
		margin-left: auto;
		font-size: 12px;
		font-weight: 700;
		color: var(--color-text-muted);
	}
	.panel-h .hdot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.urg {
		padding: 0 8px 8px;
	}

	.warm {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 4px 8px 12px;
		padding: 14px 16px;
		border-radius: var(--radius-lg);
		background: var(--color-success-light);
	}
	.warm :global(svg) {
		color: var(--color-success-deep);
		flex-shrink: 0;
	}
	.warm .wt {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-success-deep);
	}
	.warm .ws {
		font-size: 12px;
		color: var(--color-success-deep);
		opacity: 0.85;
	}

	.pipe {
		display: block;
		text-decoration: none;
		transition:
			box-shadow 220ms var(--ease-out-expo),
			transform 220ms var(--ease-out-expo);
	}
	.pipe:hover {
		box-shadow: var(--shadow-card-hover);
		transform: translateY(-1px);
	}
	.pipe:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.pipe-warm {
		background: var(--color-surface-alt);
		margin: 4px 12px 14px;
	}
	.pipe-warm :global(svg) {
		color: var(--color-prosp-qualify-deep);
	}
	.pipe-warm .wt {
		color: var(--color-text);
	}
	.pipe-warm .ws {
		color: var(--color-text-muted);
		opacity: 1;
	}

	.lead-express-mobile {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius-xl);
		background: var(--color-primary);
		color: white;
		border: 0;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--color-primary) 30%, transparent);
		transition:
			background 200ms var(--ease-out-expo),
			transform 200ms var(--ease-out-expo);
	}
	.lead-express-mobile:hover {
		background: var(--color-primary-hover);
		transform: translateY(-1px);
	}
	.lead-express-mobile:focus-visible {
		outline: 2px solid var(--color-primary-light);
		outline-offset: 2px;
	}
	.lead-express-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.15);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.lead-express-body {
		flex: 1;
		min-width: 0;
	}
	.lead-express-title {
		display: block;
		font-size: 14px;
		font-weight: 600;
	}
	.lead-express-sub {
		display: block;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 2px;
	}

	.stagger {
		opacity: 0;
		animation: dtFadeUp 700ms var(--ease-out-expo) forwards;
		animation-delay: calc(var(--i, 0) * 70ms);
	}
	@keyframes dtFadeUp {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stagger {
			opacity: 1;
			animation: none;
		}
		.pipe,
		.lead-express-mobile {
			transition: none;
		}
		.pipe:hover,
		.lead-express-mobile:hover {
			transform: none;
		}
	}
	@media (max-width: 1023.98px) {
		.stagger {
			opacity: 1;
			animation: none;
		}
	}
</style>
