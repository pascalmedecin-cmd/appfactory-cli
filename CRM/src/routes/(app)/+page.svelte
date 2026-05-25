<script lang="ts">
	/**
	 * Dashboard CRM /  refonte v9 (S175 Bloc #1).
	 * 6 sections Bento asymétrique : greeting hero, KPIs Bento, TriageQueue vedette,
	 * duo activité+relances 60/40, alertes strip, quick actions footer.
	 *
	 * Identité éditoriale propre : « inbox du matin du fondateur ».
	 * Spec figée : notes/refonte-dashboard-2026-05-06/spec-implementation.md
	 */
	import LeadExpress from '$lib/components/prospection/LeadExpress.svelte';
	import LeadSlideOut from '$lib/components/prospection/LeadSlideOut.svelte';
	import TriageQueue from '$lib/components/dashboard/TriageQueue.svelte';
	import SectionGreeting from '$lib/components/dashboard/SectionGreeting.svelte';
	import KpisBento from '$lib/components/dashboard/KpisBento.svelte';
	import ActiviteTimeline from '$lib/components/dashboard/ActiviteTimeline.svelte';
	import RelancesList from '$lib/components/dashboard/RelancesList.svelte';
	import AlertesStrip from '$lib/components/dashboard/AlertesStrip.svelte';
	import QuickActionsFooter from '$lib/components/dashboard/QuickActionsFooter.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { PageData } from './$types';

	$pageSubtitle = "Vue d'ensemble";

	let { data }: { data: PageData } = $props();
	let leadExpressOpen = $state(false);

	// Slide-out détail lead : ouvert depuis TriageQueue, sans switch de page.
	let slideOutOpen = $state(false);
	let slideOutLead = $state<(typeof data.triage.leads)[number] | null>(null);
	let slideOutImportResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	function handleLeadOpen(lead: (typeof data.triage.leads)[number]) {
		slideOutLead = lead;
		slideOutOpen = true;
	}

	const todayIso = $derived(new Date().toISOString().split('T')[0]);

	const relancesRetard = $derived(
		data.relances.filter((r) => {
			if (!r.date_relance_prevue) return false;
			return r.date_relance_prevue < todayIso;
		}).length
	);

	const relancesData = $derived({
		total: data.relances.length,
		retard: relancesRetard,
	});
</script>

<div class="dash">

	<!-- Section 1 : greeting hero -->
	<div class="stagger" style="--i: 0;">
		<SectionGreeting
			firstName={data.firstName}
			triageTotal={data.triage.total}
			signauxCount={data.stats.signaux}
			relancesCount={data.relances.length}
		/>
	</div>

	<!-- Section 2 : KPIs Bento asymétrique 12 cols -->
	<div class="stagger" style="--i: 1;">
		<KpisBento
			triageTotal={data.triage.total}
			triageVisible={data.triage.leads.length}
			signauxCount={data.stats.signaux}
			relances={relancesData}
		/>
	</div>

	<!-- Lead express (mobile + tablette uniquement) -->
	<button
		type="button"
		onclick={() => (leadExpressOpen = true)}
		class="lead-express-mobile lg:hidden"
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

	<!-- Section 3 : TriageQueue vedette -->
	<div class="stagger" style="--i: 2;">
		<TriageQueue leads={data.triage.leads} total={data.triage.total} onLeadOpen={handleLeadOpen} />
	</div>

	<!-- Section 4 : duo activité + relances 60/40 -->
	<div class="duo stagger" style="--i: 3;">
		<ActiviteTimeline activites={data.activitesRecentes} />
		<RelancesList relances={data.relances} />
	</div>

	<!-- Section 5 : alertes strip (masqué si aucun signal) -->
	{#if data.stats.signaux > 0 || data.alertes.length > 0}
		<div class="stagger" style="--i: 4;">
			<AlertesStrip signauxCount={data.stats.signaux} alertes={data.alertes} />
		</div>
	{/if}

	<!-- Section 6 : quick actions footer -->
	<div class="stagger" style="--i: 5;">
		<QuickActionsFooter />
	</div>

</div>

<LeadExpress bind:open={leadExpressOpen} redirectAfterCreate={true} />

<LeadSlideOut
	bind:open={slideOutOpen}
	bind:lead={slideOutLead}
	bind:importResult={slideOutImportResult}
	leads={data.triage.leads}
/>

<style>
	.dash {
		display: flex;
		flex-direction: column;
		gap: 48px; /* audit 360 V3b L-21 : sur la grille 8px (était 56px) */
	}
	.dash > :global(*) { display: block; }

	@media (max-width: 768px) {
		.dash { gap: 32px; }
	}

	.stagger {
		opacity: 0;
		animation: fadeUp 700ms var(--ease-out-expo) forwards;
		animation-delay: calc(var(--i, 0) * 60ms);
	}
	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(16px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.duo {
		display: grid;
		grid-template-columns: 1.5fr 1fr;
		gap: 24px; /* audit 360 V3b L-21 : sur la grille 8px (était 20px) */
	}
	@media (max-width: 1024px) {
		.duo { grid-template-columns: 1fr; }
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
		transition: background 200ms var(--ease-out-expo), transform 200ms var(--ease-out-expo);
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
	.lead-express-body { flex: 1; min-width: 0; }
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

	@media (prefers-reduced-motion: reduce) {
		.stagger {
			opacity: 1;
			animation: none;
		}
		.lead-express-mobile { transition: none; }
		.lead-express-mobile:hover { transform: none; }
	}
	@media (max-width: 1023.98px) {
		.stagger {
			opacity: 1;
			animation: none;
		}
	}
</style>
