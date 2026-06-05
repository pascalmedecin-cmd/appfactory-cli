<!--
  Découpe Films - Écran de résultat (le cœur visuel). Langage PREMIUM porté du golden v4
  validé (étape 3bis-b, benchmark métier CutTool/CutList/marker textile) :
   - bandeau KPI mis en scène (taux roi color-codé + arc + économie vs pose séquentielle),
   - cartes film avec strip de remplissage compact (code couleur par pièce) + pastille de chute,
   - liste de coupe ordonnée (cœur opérationnel atelier, source lisible sans le strip),
   - alertes jamais masquées, commande fournisseur, consolidation suggérée, « Lancer ».
  Calculs UI extraits en helpers purs testés (src/lib/decoupe/presenter.ts, doctrine .svelte=e2e).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import {
		FAMILLE_LABEL,
		RAISON_LABEL,
		familleColor,
		alerteTitre,
		formatMetres,
		formatMetresCourt,
		formatM2,
		formatPct,
		makeColorOf,
		cutGroups,
		synthese,
		filmMetrics,
		stripGeometry,
		chuteSpark,
		chuteColorVar
	} from '$lib/decoupe/presenter';
	import type { PageData } from './$types';
	import type { DecoupePdfInput } from '$lib/decoupe/pdf-export';

	let { data }: { data: PageData } = $props();

	// Vues dérivées (toutes pures, recalculées si `data` change).
	const synth = $derived(data.ok ? synthese(data.resultat) : null);
	const spark = $derived(synth ? chuteSpark(synth.chuteMoy) : null);
	const colorOf = $derived(makeColorOf(data.ok ? Object.keys(data.vitresInfo) : []));

	function refOf(pid: string): string {
		return data.ok ? (data.produitsInfo[pid]?.reference ?? '—') : '—';
	}
	function nomOf(pid: string): string {
		return data.ok ? (data.produitsInfo[pid]?.nom ?? '') : '';
	}
	function fabricantOf(pid: string): string {
		return data.ok ? (data.produitsInfo[pid]?.fabricant ?? '') : '';
	}
	function familleOf(pid: string): string {
		return data.ok ? (data.produitsInfo[pid]?.famille ?? 'securite') : 'securite';
	}
	function vitreLabel(vid: string): string {
		if (!data.ok) return '';
		const v = data.vitresInfo[vid];
		return v ? `${v.largeur_mm} × ${v.hauteur_mm} mm` : '';
	}

	const titre = $derived(
		data.ok
			? data.selection.length === 1
				? data.selection[0].nom
				: `${data.selection.length} chantiers consolidés`
			: ''
	);
	const backHref = $derived(
		data.ok && data.selection.length === 1 ? `/decoupe/chantiers/${data.ids[0]}` : '/decoupe'
	);
	const backLabel = $derived(data.ok && data.selection.length === 1 ? data.selection[0].nom : 'Chantiers');

	let confirmLancerOpen = $state(false);
	let lancing = $state(false);
	let lancerEl: HTMLFormElement | null = $state(null);

	// Export PDF (ADR-0005, vectoriel, côté client). Le moteur de flux + jsPDF/svg2pdf + polices
	// sont chargés en dynamic import → hors bundle initial (perf LCP). Cf. src/lib/decoupe/pdf-export.ts.
	let exporting = $state(false);
	async function exporterPdf() {
		const d = data;
		if (!d.ok || exporting) return;
		const input: DecoupePdfInput = {
			titre,
			dateLabel: `${new Date().toLocaleDateString('fr-CH')} à ${d.calculeA}`,
			nbVitres: d.nbVitres,
			resultat: d.resultat,
			produitsInfo: d.produitsInfo,
			vitresInfo: d.vitresInfo,
			vitreOrder: Object.keys(d.vitresInfo)
		};
		exporting = true;
		try {
			const { exportDecoupePdf } = await import('$lib/decoupe/pdf-export');
			await exportDecoupePdf(input);
		} catch (e) {
			console.error('Export PDF Découpe échoué :', e);
			toasts.error('Export PDF impossible. Réessayez.');
		} finally {
			exporting = false;
		}
	}
</script>

<svelte:head><title>Résultat · Découpe Films</title></svelte:head>

<!-- Icônes Lucide inline (stroke 1.75 / 2), décoratives → aria-hidden -->
{#snippet icScissors(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
{/snippet}
{#snippet icRuler(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>
{/snippet}
{#snippet icLayers(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
{/snippet}
{#snippet icTruck(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
{/snippet}
{#snippet icBox(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
{/snippet}
{#snippet icAlert(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
{/snippet}
{#snippet icCheck(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></svg>
{/snippet}
{#snippet icRotate(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
{/snippet}
{#snippet icChevron(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
{/snippet}
{#snippet icDownload(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
{/snippet}

<a href={backHref} class="df-back"><span class="df-back-chevron">{@render icChevron(15)}</span>{backLabel}</a>

{#if !data.ok}
	<EmptyState
		icon="warning"
		title="Aucun chantier à optimiser"
		description="Le lien d'optimisation ne référence aucun chantier valide. Repartez de la liste des chantiers."
		actionLabel="Voir les chantiers"
		onAction={() => (window.location.href = '/decoupe')}
	/>
{:else if synth}
	<div class="df-pagehead">
		<div class="df-pagehead-l">
			<div class="df-kicker">Résultat de l'optimisation</div>
			<h1 class="df-title-xl">{titre}</h1>
			<div class="df-page-meta">
				<span>{data.nbVitres} vitre{data.nbVitres > 1 ? 's' : ''} saisie{data.nbVitres > 1 ? 's' : ''}</span>
				<span class="df-dot-sep"></span>
				<span>{synth.nbFilms} film{synth.nbFilms > 1 ? 's' : ''} · {synth.nbCommandes} à commander</span>
				<span class="df-dot-sep"></span>
				<span class="df-num">calculé à {data.calculeA}</span>
			</div>
		</div>
		<div class="df-pagehead-r">
			{#if synth.statutOk}
				<span class="df-statepill df-statepill--ok">{@render icCheck(15)} Prêt à découper</span>
			{:else}
				<span class="df-statepill df-statepill--warn">{@render icAlert(15)} À vérifier</span>
			{/if}
			{#if data.resultat.plans.length > 0 || data.resultat.commandes_fournisseur.length > 0}
				<button type="button" class="ws-btn ws-btn-secondary" onclick={exporterPdf} disabled={exporting} aria-busy={exporting}>
					{@render icDownload(16)} {exporting ? 'Génération…' : 'Exporter en PDF'}
				</button>
			{/if}
			{#if data.resultat.plans.length > 0}
				{#if data.toutesLancees}
					<span class="df-statepill df-statepill--ok">{@render icCheck(15)} Découpe lancée</span>
				{:else}
					<button type="button" class="ws-btn ws-btn-primary" onclick={() => (confirmLancerOpen = true)}>
						<Icon name="check_circle" size={17} /> Lancer la découpe
					</button>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Bandeau KPI -->
	<div class="df-kpis">
		<div class="df-kpi df-kpi--chute" style="--df-kpi-c:{chuteColorVar(synth.chuteMoy)}">
			<svg class="df-kpi-spark" viewBox="0 0 46 46" aria-hidden="true">
				<circle cx="23" cy="23" r="18" fill="none" stroke="var(--df-surface-sunken)" stroke-width="5" />
				{#if spark}<circle cx="23" cy="23" r="18" fill="none" stroke={spark.colorVar} stroke-width="5" stroke-linecap="round" stroke-dasharray="{spark.dash} {spark.gap}" transform="rotate(-90 23 23)" />{/if}
			</svg>
			<div class="df-kpi-lbl">{@render icScissors(14)} Taux de chute</div>
			<div class="df-kpi-val df-num">{formatPct(synth.chuteMoy)} <span class="df-kpi-unit">%</span></div>
			<div class="df-kpi-sub">
				remplissage <b class="df-num">{formatPct(synth.remplMoy)} %</b> · <span class="df-num">{formatM2(synth.pieceSurf)}</span> utiles sur <span class="df-num">{formatM2(synth.rollSurf)}</span>
			</div>
		</div>
		<div class="df-kpi" style="--df-kpi-c:var(--color-primary)">
			<div class="df-kpi-lbl">{@render icRuler(14)} Film à découper</div>
			<div class="df-kpi-val df-num">{formatMetresCourt(synth.totalLong)} <span class="df-kpi-unit">m</span></div>
			<div class="df-kpi-sub">
				{#if synth.economieLong > 0}
					<b class="df-num">{formatMetresCourt(synth.economieLong)} m économisés</b> vs pose séquentielle
				{:else}
					aucun regroupement possible
				{/if}
			</div>
		</div>
		<div class="df-kpi" style="--df-kpi-c:var(--color-primary)">
			<div class="df-kpi-lbl">{@render icLayers(14)} Films · pièces</div>
			<div class="df-kpi-val df-num">{synth.nbFilms} <span class="df-kpi-unit">film{synth.nbFilms > 1 ? 's' : ''}</span></div>
			<div class="df-kpi-sub"><b class="df-num">{synth.nbPieces} pièce{synth.nbPieces > 1 ? 's' : ''}</b> posée{synth.nbPieces > 1 ? 's' : ''} en découpe interne</div>
		</div>
		<div class="df-kpi" style="--df-kpi-c:var(--df-amber-tx)">
			<div class="df-kpi-lbl">{@render icTruck(14)} À commander</div>
			<div class="df-kpi-val df-num">{synth.nbCommandes} <span class="df-kpi-unit">pièce{synth.nbCommandes > 1 ? 's' : ''}</span></div>
			<div class="df-kpi-sub">sur-mesure ou produit non nestable</div>
		</div>
	</div>

	<!-- Consolidation suggérée -->
	{#if data.suggestions.length > 0}
		<div class="df-suggest">
			{@render icLayers(18)}
			<div class="df-suggest-body">
				<p class="df-suggest-title">Consolidation possible</p>
				<p class="df-suggest-text">
					Ces chantiers en saisie partagent un film avec votre sélection. Les optimiser ensemble réduit les chutes :
				</p>
				<div class="df-suggest-links">
					{#each data.suggestions as s (s.id)}
						<a class="df-suggest-chip" href={`/decoupe/optimisation?chantiers=${[...data.ids, s.id].join(',')}`}>
							<span class="df-suggest-chip-nom">{s.nom}</span>
							<span class="df-suggest-chip-ref">{s.produits.join(', ')}</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Alertes (jamais masquées) -->
	{#if data.resultat.alertes.length > 0}
		{@const hasNonPlacable = data.resultat.alertes.some((a) => a.type === 'piece_non_placable')}
		<div class="df-callout" class:df-callout--high={hasNonPlacable}>
			<span class="df-callout-ico">{@render icAlert(19)}</span>
			<div class="df-callout-body">
				<div class="df-callout-title">
					{data.resultat.alertes.length} point{data.resultat.alertes.length > 1 ? 's' : ''} à vérifier avant de lancer
				</div>
				<ul class="df-callout-list">
					{#each data.resultat.alertes as a, i (`${a.vitre_id}-${a.type}-${i}`)}
						<li>
							<b>{alerteTitre(a.type)}</b> — {a.message}{#if vitreLabel(a.vitre_id)}<span class="df-tagvit">{vitreLabel(a.vitre_id)}</span>{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- Commande fournisseur -->
	{#if data.resultat.commandes_fournisseur.length > 0}
		<h2 class="df-sec-h">À commander chez le fournisseur<span class="df-sec-count">· {data.resultat.commandes_fournisseur.length}</span></h2>
		<div class="df-ordercard">
			{#each data.resultat.commandes_fournisseur as cmd, i (`${cmd.vitre_id}-${i}`)}
				{@const pid = data.vitresInfo[cmd.vitre_id]?.produit_id ?? ''}
				<div class="df-order-row">
					<span class="df-order-ico" style="background:{familleColor(familleOf(pid))}">{@render icBox(18)}</span>
					<div class="df-order-main">
						<div class="df-order-ref">{refOf(pid)}<span class="df-order-nom">{nomOf(pid)}</span></div>
						<div class="df-order-dim">{vitreLabel(cmd.vitre_id)}</div>
					</div>
					<span class="df-chip">{RAISON_LABEL[cmd.raison] ?? cmd.raison}</span>
				</div>
			{/each}
			<div class="df-order-foot">Ces pièces sortent de la découpe interne (sur-mesure ou produit non nestable).</div>
		</div>
	{/if}

	{#if data.resultat.plans.length === 0 && data.resultat.commandes_fournisseur.length === 0}
		<EmptyState
			icon="layers"
			title="Rien à optimiser"
			description="Aucune vitre exploitable dans cette sélection. Ajoutez des vitres au chantier puis relancez."
		/>
	{/if}

	<!-- Découpe interne : un plan par film -->
	{#if data.resultat.plans.length > 0}
		<h2 class="df-sec-h">Découpe interne<span class="df-sec-count">· {data.resultat.plans.length} film{data.resultat.plans.length > 1 ? 's' : ''}</span></h2>
		{#each data.resultat.plans as plan (plan.produit_id)}
			{@const fam = familleOf(plan.produit_id)}
			{@const fm = filmMetrics(plan)}
			{@const geo = stripGeometry(plan, colorOf)}
			{@const groups = cutGroups(plan)}
			<article class="df-film">
				<div class="df-film-head">
					<span class="df-film-tile" style="background:{familleColor(fam)}">{@render icScissors(22)}</span>
					<div class="df-film-id">
						<div class="df-film-ref">{refOf(plan.produit_id)}{#if fabricantOf(plan.produit_id)}<span class="df-film-fab">{fabricantOf(plan.produit_id)}</span>{/if}</div>
						<div class="df-film-sub">
							<span class="df-film-nom">{nomOf(plan.produit_id)}</span>
							<span class="df-pastille df-pastille--{fam}">{FAMILLE_LABEL[fam] ?? fam}</span>
						</div>
					</div>
					<span class="df-chute df-chute--{fm.classe}">{@render icScissors(15)}<span class="df-chute-big">{formatPct(plan.taux_chute)} %</span> de chute</span>
				</div>

				<div class="df-strip-wrap">
					<div class="df-strip-top">
						<span class="df-strip-verdict">À découper&nbsp;&nbsp;<b>Laize {plan.laize_mm} mm × {formatMetres(plan.longueur_consommee_mm)}</b></span>
						<span class="df-strip-fill">remplissage {formatPct(fm.remplissage)} %</span>
					</div>
					<div class="df-strip">
						<svg viewBox="0 0 {geo.width} {geo.height + 1}" preserveAspectRatio="xMinYMin meet" role="img" aria-label={`Plan de remplissage du film ${refOf(plan.produit_id)} : laize ${plan.laize_mm} mm sur ${formatMetres(plan.longueur_consommee_mm)}. Détail dans la liste de coupe ci-dessous.`}>
							<defs>
								<pattern id={`df-hatch-${plan.produit_id}`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
									<rect width="6" height="6" fill="#fff" />
									<line x1="0" y1="0" x2="0" y2="6" stroke="#EEF0F2" stroke-width="3" />
								</pattern>
							</defs>
							<rect x="0" y="0" width={geo.width} height={geo.height} rx="4" fill={`url(#df-hatch-${plan.produit_id})`} stroke="#E5E7EB" stroke-width="1" />
							{#each geo.rects as r, ri (ri)}
								{@const cx = r.x + r.w / 2}
								{@const cy = r.y + r.h / 2}
								<g>
									<rect x={r.x} y={r.y} width={r.w} height={r.h} rx="2.5" fill={r.color} fill-opacity="0.16" stroke={r.color} stroke-width="1.25" />
									{#if r.label}
										<text x={cx} y={cy} transform={r.labelOrient === 'v' ? `rotate(-90 ${cx} ${cy})` : null} fill={r.color} font-size="9" font-weight="600" text-anchor="middle" dominant-baseline="central" font-family="var(--font-mono)">{r.label}</text>
									{/if}
								</g>
							{/each}
							<line x1="0" y1={geo.height} x2={geo.width} y2={geo.height} stroke="#D1D5DB" stroke-width="1" />
						</svg>
					</div>
					<div class="df-strip-legend">
						<span class="df-lg"><span class="df-sw" style="background:#5A7190;opacity:.35"></span>pièces posées</span>
						<span class="df-lg"><span class="df-sw df-sw--chute"></span>chute</span>
						<span class="df-lg">échelle : la longueur du film est à l'échelle de la consommation</span>
					</div>
				</div>

				<div class="df-film-foot">
					<span class="df-strong">{plan.placements.length} pièce{plan.placements.length > 1 ? 's' : ''}</span>
					<span class="df-dot-sep"></span>
					<span>{formatM2(plan.surface_pieces_mm2)} utiles</span>
					<span class="df-dot-sep"></span>
					<span>{formatM2(fm.chuteSurf)} de chute</span>
				</div>

				<details class="df-cut">
					<summary>
						<span class="df-chev">{@render icChevron(15)}</span>Liste de coupe ordonnée<span class="df-ct df-num">{plan.placements.length}</span>
					</summary>
					<table class="df-cuttable">
						<thead>
							<tr>
								<th scope="col"><span class="sr-only">Couleur</span></th>
								<th scope="col">Qté</th>
								<th scope="col">Dimension de coupe</th>
								<th scope="col">Vitre source</th>
								<th scope="col"><span class="sr-only">Particularités</span></th>
							</tr>
						</thead>
						<tbody>
							{#each groups as g, gi (gi)}
								<tr>
									<td class="df-c-sw"><span class="df-sw" style="background:{colorOf(g.vitre_id)};opacity:.85"></span></td>
									<td class="df-c-qty df-num">×{g.n}</td>
									<td class="df-c-dim df-num">{g.w} × {g.h} mm</td>
									<td class="df-c-src df-num">{vitreLabel(g.vitre_id)}</td>
									<td class="df-c-tag">
										{#if g.pivot}<span class="df-chip df-chip--rot">{@render icRotate(12)} pivotée</span>{/if}
										{#if g.les}<span class="df-chip df-chip--les">{@render icLayers(12)} en lés</span>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</details>
			</article>
		{/each}
	{/if}

	<!-- Form + confirmation « Lancer la découpe » -->
	<form
		bind:this={lancerEl}
		method="POST"
		action="?/lancer"
		use:enhance={() => {
			lancing = true;
			return async ({ result, update }) => {
				lancing = false;
				confirmLancerOpen = false;
				if (result.type === 'success') toasts.success('Découpe lancée. Les chantiers passent en « lancée ».');
				else if (result.type === 'failure') toasts.error((result.data?.error as string) ?? 'Erreur lors du lancement');
				else toasts.error('Erreur lors du lancement');
				await update();
			};
		}}
	>
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
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
