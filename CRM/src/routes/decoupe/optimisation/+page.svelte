<!--
  Découpe Films - Écran d'optimisation (écran 4, le cœur visuel). Orienté action :
  lire le plan, commander le sur-mesure, lancer la découpe. Par produit : plan SVG +
  jauge de taux de chute + légende + table de repli accessible. Plus : liste de
  commande fournisseur, alertes (jamais masquées), consolidation suggérée, « Lancer ».
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ChuteGauge from '$lib/components/decoupe/ChuteGauge.svelte';
	import PlanDecoupeSvg from '$lib/components/decoupe/PlanDecoupeSvg.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const FAMILLE_LABEL: Record<string, string> = {
		solaire: 'Solaire',
		securite: 'Sécurité',
		discretion: 'Discrétion'
	};
	const RAISON_LABEL: Record<string, string> = {
		sur_mesure_fournisseur: 'Sur-mesure fournisseur',
		non_nestable: 'Produit non nestable'
	};

	// Palette stable par vitre (cohérente SVG / légende / table).
	const PALETTE = ['#5A7190', '#917548', '#538B6B', '#7B6A9A', '#3F7C82', '#A8674B', '#6B7DA8', '#B5926A'];
	const colorMap = new Map<string, string>();
	function colorOf(vitreId: string): string {
		let c = colorMap.get(vitreId);
		if (!c) {
			c = PALETTE[colorMap.size % PALETTE.length];
			colorMap.set(vitreId, c);
		}
		return c;
	}

	function metres(mm: number): string {
		return (mm / 1000).toFixed(2).replace('.', ',') + ' m';
	}
	function refOf(produitId: string): string {
		return data.ok ? (data.produitsInfo[produitId]?.reference ?? '—') : '—';
	}
	function nomOf(produitId: string): string {
		return data.ok ? (data.produitsInfo[produitId]?.nom ?? '') : '';
	}
	function vitreLabel(vitreId: string): string {
		if (!data.ok) return '';
		const v = data.vitresInfo[vitreId];
		if (!v) return '';
		return `${v.largeur_mm} × ${v.hauteur_mm} mm · ×${v.quantite}`;
	}

	let confirmLancerOpen = $state(false);
	let lancing = $state(false);
	let lancerEl: HTMLFormElement | null = $state(null);
</script>

<svelte:head><title>Optimisation · Découpe Films</title></svelte:head>

<a href="/decoupe" class="back-link">
	<Icon name="expand_more" size={16} class="back-chevron" />
	Chantiers
</a>

{#if !data.ok}
	<EmptyState
		icon="warning"
		title="Aucun chantier à optimiser"
		description="Le lien d'optimisation ne référence aucun chantier valide. Repartez de la liste des chantiers."
		actionLabel="Voir les chantiers"
		onAction={() => (window.location.href = '/decoupe')}
	/>
{:else}
	<section class="opt-head">
		<div>
			<h1 class="df-page-title">Optimisation</h1>
			<p class="df-page-sub">
				{data.selection.map((c) => c.nom).join(', ')} · {data.nbVitres} vitre{data.nbVitres > 1 ? 's' : ''}
			</p>
		</div>
		{#if data.resultat.plans.length > 0}
			{#if data.toutesLancees}
				<span class="lancee-pill"><Icon name="check_circle" size={16} /> Découpe lancée</span>
			{:else}
				<button type="button" class="ws-btn ws-btn-primary" onclick={() => (confirmLancerOpen = true)}>
					<Icon name="check_circle" size={16} />
					Lancer la découpe
				</button>
			{/if}
		{/if}
	</section>

	<!-- Consolidation suggérée -->
	{#if data.suggestions.length > 0}
		<div class="suggest">
			<Icon name="layers" size={18} />
			<div class="suggest-body">
				<p class="suggest-title">Consolidation possible</p>
				<p class="suggest-text">
					Ces chantiers en saisie partagent un film avec votre sélection. Les optimiser ensemble réduit les chutes :
				</p>
				<div class="suggest-links">
					{#each data.suggestions as s (s.id)}
						<a class="suggest-chip" href={`/decoupe/optimisation?chantiers=${[...data.ids, s.id].join(',')}`}>
							<span class="suggest-chip-nom">{s.nom}</span>
							<span class="suggest-chip-ref">{s.produits.join(', ')}</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Alertes (jamais masquées) -->
	{#if data.resultat.alertes.length > 0}
		<div class="alertes">
			{#each data.resultat.alertes as a, i (`${a.vitre_id}-${a.type}-${i}`)}
				<div class="alerte" class:alerte--high={a.type === 'piece_non_placable'}>
					<Icon name="warning" size={18} />
					<div>
						<p class="alerte-msg">{a.message}</p>
						{#if vitreLabel(a.vitre_id)}<p class="alerte-vitre">{vitreLabel(a.vitre_id)}</p>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if data.resultat.plans.length === 0 && data.resultat.commandes_fournisseur.length === 0}
		<EmptyState
			icon="layers"
			title="Rien à optimiser"
			description="Aucune vitre exploitable dans cette sélection. Ajoutez des vitres au chantier puis relancez."
		/>
	{/if}

	<!-- Plans par produit -->
	{#each data.resultat.plans as plan (plan.produit_id)}
		{@const vitresDuPlan = [...new Set(plan.placements.map((p) => p.vitre_id))]}
		<article class="plan-card">
			<header class="plan-card-head">
				<div class="plan-id">
					<span class="df-pastille df-pastille--{data.produitsInfo[plan.produit_id]?.famille ?? 'solaire'}">
						{refOf(plan.produit_id)}
					</span>
					<span class="plan-nom">{nomOf(plan.produit_id)}</span>
				</div>
				<div class="plan-metrics">
					<div class="metric">
						<span class="metric-label">Laize</span>
						<span class="metric-value df-num">{plan.laize_mm} mm</span>
					</div>
					<div class="metric">
						<span class="metric-label">Longueur</span>
						<span class="metric-value df-num">{metres(plan.longueur_consommee_mm)}</span>
					</div>
					<ChuteGauge taux={plan.taux_chute} />
				</div>
			</header>

			<PlanDecoupeSvg
				{plan}
				{colorOf}
				ariaLabel={`Plan ${refOf(plan.produit_id)} : laize ${plan.laize_mm} mm, longueur ${metres(plan.longueur_consommee_mm)}, ${plan.placements.length} pièce(s), taux de chute ${(plan.taux_chute * 100).toFixed(1)} pour cent. Détail dans la table ci-dessous.`}
			/>

			<!-- Légende couleur → vitre -->
			<div class="legend">
				{#each vitresDuPlan as vid (vid)}
					<span class="legend-item">
						<span class="legend-swatch" style="background:{colorOf(vid)}"></span>
						{vitreLabel(vid)}
					</span>
				{/each}
			</div>

			<!-- Table de repli accessible (source exécutable, AC-017) -->
			<details class="repli">
				<summary>Table des pièces (exécutable atelier)</summary>
				<div class="repli-table-wrap">
					<table class="repli-table">
						<thead>
							<tr>
								<th scope="col">#</th>
								<th scope="col">Vitre</th>
								<th scope="col">Coupe (mm)</th>
								<th scope="col">Position x · y (mm)</th>
								<th scope="col">Orientation</th>
								<th scope="col">Lé</th>
							</tr>
						</thead>
						<tbody>
							{#each plan.placements as pl, i (`${pl.vitre_id}-${pl.piece_index}-${pl.les_index ?? 0}-${i}`)}
								<tr>
									<td class="df-num">{i + 1}</td>
									<td>
										<span class="legend-swatch legend-swatch--inline" style="background:{colorOf(pl.vitre_id)}"></span>
										{vitreLabel(pl.vitre_id)}
									</td>
									<td class="df-num">{pl.hauteur_placee_mm} × {pl.largeur_placee_mm}</td>
									<td class="df-num">{pl.x_mm} · {pl.y_mm}</td>
									<td>{pl.pivotee ? 'Pivotée 90°' : 'Standard'}</td>
									<td>{pl.les_index !== undefined ? `Lé ${pl.les_index + 1}` : '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>
		</article>
	{/each}

	<!-- Liste de commande fournisseur -->
	{#if data.resultat.commandes_fournisseur.length > 0}
		<section class="commande">
			<h2 class="section-title">
				<Icon name="archive" size={18} />
				Liste de commande fournisseur
				<span class="df-count">{data.resultat.commandes_fournisseur.length}</span>
			</h2>
			<div class="df-card">
				<table class="cmd-table">
					<thead>
						<tr><th scope="col">Produit</th><th scope="col">Vitre</th><th scope="col">Raison</th></tr>
					</thead>
					<tbody>
						{#each data.resultat.commandes_fournisseur as cmd, i (`${cmd.vitre_id}-${i}`)}
							{@const pid = data.vitresInfo[cmd.vitre_id]?.produit_id ?? ''}
							<tr>
								<td>
									<span class="df-pastille df-pastille--{data.produitsInfo[pid]?.famille ?? 'solaire'}">{refOf(pid)}</span>
									<span class="cmd-nom">{nomOf(pid)}</span>
								</td>
								<td class="df-num">{vitreLabel(cmd.vitre_id)}</td>
								<td><span class="df-chip df-chip--warn">{RAISON_LABEL[cmd.raison] ?? cmd.raison}</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- Form + confirmation « Lancer la découpe » -->
	<form bind:this={lancerEl} method="POST" action="?/lancer" use:enhance={() => {
		lancing = true;
		return async ({ result, update }) => {
			lancing = false;
			confirmLancerOpen = false;
			if (result.type === 'success') toasts.success('Découpe lancée. Les chantiers passent en « lancée ».');
			else if (result.type === 'failure') toasts.error((result.data?.error as string) ?? 'Erreur lors du lancement');
			else toasts.error('Erreur lors du lancement');
			await update();
		};
	}}>
		<input type="hidden" name="chantiers" value={data.ids.join(',')} />
	</form>

	<ConfirmModal
		bind:open={confirmLancerOpen}
		title="Lancer la découpe ?"
		message="Les chantiers sélectionnés passeront en statut « lancée » et seront exclus des futures consolidations suggérées. Le plan reste recalculable."
		confirmLabel="Lancer la découpe"
		variant="warning"
		loading={lancing}
		onConfirm={() => lancerEl?.requestSubmit()}
	/>
{/if}

<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-decoration: none;
		margin-bottom: 14px;
		transition: color 180ms var(--ease-out-expo);
	}
	.back-link:hover {
		color: var(--color-primary);
	}
	.back-link :global(.back-chevron) {
		transform: rotate(90deg);
	}

	.opt-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
	}
	.lancee-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: var(--radius-full);
		background: var(--color-success-light);
		color: var(--color-success);
		font-size: 13.5px;
		font-weight: 600;
	}

	.suggest {
		display: flex;
		gap: 12px;
		padding: 16px 18px;
		border-radius: var(--radius-xl);
		background: var(--color-primary-light);
		color: var(--color-primary);
		margin-bottom: 18px;
	}
	.suggest-body {
		flex: 1;
	}
	.suggest-title {
		font-weight: 600;
		font-size: 14px;
		color: var(--color-text);
	}
	.suggest-text {
		font-size: 13px;
		color: var(--color-text-body);
		margin: 3px 0 10px;
	}
	.suggest-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.suggest-chip {
		display: inline-flex;
		flex-direction: column;
		gap: 1px;
		padding: 7px 12px;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-xs);
		text-decoration: none;
		transition: box-shadow 180ms var(--ease-out-expo), transform 180ms var(--ease-out-expo);
	}
	.suggest-chip:hover {
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
	}
	.suggest-chip-nom {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}
	.suggest-chip-ref {
		font-size: 11.5px;
		color: var(--color-text-muted);
	}

	.alertes {
		display: grid;
		gap: 10px;
		margin-bottom: 18px;
	}
	.alerte {
		display: flex;
		gap: 10px;
		padding: 13px 16px;
		border-radius: var(--radius-lg);
		background: var(--color-warning-light);
		color: #b54708;
	}
	.alerte--high {
		background: var(--color-danger-light);
		color: var(--color-danger);
	}
	.alerte-msg {
		font-size: 14px;
		font-weight: 500;
	}
	.alerte-vitre {
		font-size: 12.5px;
		opacity: 0.85;
		margin-top: 2px;
		font-variant-numeric: tabular-nums;
	}

	.plan-card {
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-card);
		padding: 22px;
		margin-bottom: 20px;
	}
	.plan-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
		margin-bottom: 18px;
	}
	.plan-id {
		display: flex;
		align-items: baseline;
		gap: 10px;
		min-width: 0;
	}
	.plan-nom {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
	}
	.plan-metrics {
		display: flex;
		align-items: center;
		gap: 28px;
	}
	.metric {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.metric-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.metric-value {
		font-size: 17px;
		font-weight: 600;
		color: var(--color-text);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 18px;
		margin-top: 14px;
	}
	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 12.5px;
		color: var(--color-text-body);
		font-variant-numeric: tabular-nums;
	}
	.legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		flex: none;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
	}
	.legend-swatch--inline {
		display: inline-block;
		margin-right: 6px;
		vertical-align: -1px;
	}

	.repli {
		margin-top: 16px;
		border-top: 1px solid var(--color-border);
		padding-top: 12px;
	}
	.repli summary {
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-primary);
		list-style: none;
	}
	.repli summary::-webkit-details-marker {
		display: none;
	}
	.repli summary::before {
		content: '▸';
		display: inline-block;
		margin-right: 7px;
		transition: transform 180ms var(--ease-out-expo);
	}
	.repli[open] summary::before {
		transform: rotate(90deg);
	}
	.repli-table-wrap {
		overflow-x: auto;
		margin-top: 12px;
	}
	.repli-table,
	.cmd-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	.repli-table th,
	.cmd-table th {
		text-align: left;
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
		padding: 8px 12px;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
	.repli-table td,
	.cmd-table td {
		padding: 9px 12px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-body);
	}
	.repli-table tr:last-child td,
	.cmd-table tr:last-child td {
		border-bottom: none;
	}

	.commande {
		margin-top: 6px;
	}
	.section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 12px;
	}
	.cmd-nom {
		margin-left: 8px;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	@media (max-width: 640px) {
		.opt-head,
		.plan-card-head {
			flex-direction: column;
			align-items: flex-start;
		}
		.plan-metrics {
			gap: 18px;
		}
	}
</style>
