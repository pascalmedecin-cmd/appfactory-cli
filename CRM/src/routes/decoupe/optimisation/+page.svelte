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
		makeVitreRef,
		cutGroups,
		synthese,
		filmMetrics,
		diagramFilms,
		pieceTextColor,
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
	const vitreRefOf = $derived(makeVitreRef(data.ok ? Object.keys(data.vitresInfo) : []));
	// Diagrammes à échelle partagée (1 par film, alignés sur l'ordre de data.resultat.plans).
	const diagrams = $derived(data.ok ? diagramFilms(data.resultat.plans, colorOf, vitreRefOf) : []);

	// Hub « Découpe » (onglet atelier, URL sans sélection). Listes dérivées pour l'affichage.
	const hubEnSaisie = $derived(data.hub ? data.hub.chantiers.filter((c) => c.statut === 'en_saisie') : []);
	const hubLancees = $derived(data.hub ? data.hub.chantiers.filter((c) => c.statut === 'lancee') : []);

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
		data.ok && data.selection.length === 1 ? `/decoupe/chantiers/${data.ids[0]}` : '/decoupe/optimisation'
	);
	const backLabel = $derived(data.ok && data.selection.length === 1 ? data.selection[0].nom : 'Découpe');

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
{#snippet icPlan(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><rect width="6" height="6" x="7" y="7" rx="1" /><rect width="5" height="9" x="13" y="9" rx="1" /></svg>
{/snippet}
{#snippet icScale(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 3 21" /><path d="M21 8V3h-5" /><path d="M3 16v5h5" /></svg>
{/snippet}

{#if !data.hub}
	<a href={backHref} class="df-back"><span class="df-back-chevron">{@render icChevron(15)}</span>{backLabel}</a>
{/if}

{#if data.hub}
	<!-- Onglet « Découpe » : hub atelier (consolidations suggérées + accès direct par chantier). -->
	<div class="df-pagehead">
		<div class="df-pagehead-l">
			<div class="df-kicker">Découpe Films</div>
			<h1 class="df-title-xl">Optimisation atelier</h1>
			<div class="df-page-meta">
				<span>{hubEnSaisie.length} chantier{hubEnSaisie.length > 1 ? 's' : ''} à optimiser</span>
				{#if data.hub.groupes.length > 0}
					<span class="df-dot-sep"></span>
					<span>{data.hub.groupes.length} consolidation{data.hub.groupes.length > 1 ? 's' : ''} suggérée{data.hub.groupes.length > 1 ? 's' : ''}</span>
				{/if}
			</div>
		</div>
	</div>

	{#if data.hub.chantiers.length === 0}
		<EmptyState
			icon="layers"
			title="Aucun chantier"
			description="Créez un chantier et saisissez des vitres pour préparer une découpe."
			actionLabel="Voir les chantiers"
			onAction={() => (window.location.href = '/decoupe')}
		/>
	{:else}
		{#if data.hub.groupes.length > 0}
			<h2 class="df-sec-h">Consolidations suggérées<span class="df-sec-count">· {data.hub.groupes.length}</span></h2>
			{#each data.hub.groupes as g (g.produit_id)}
				<article class="df-consol">
					<span class="df-consol-tile" style="background:{familleColor(g.famille)}">{@render icLayers(20)}</span>
					<div class="df-consol-main">
						<div class="df-film-ref">{g.reference}<span class="df-film-fab">{g.nom}</span></div>
						<div class="df-consol-sub">
							<span class="df-pastille df-pastille--{g.famille}">{FAMILLE_LABEL[g.famille] ?? g.famille}</span>
							<span class="df-consol-text">{g.chantiers.length} chantiers partagent ce film</span>
						</div>
						<div class="df-consol-chantiers">
							{#each g.chantiers as c (c.id)}<span class="df-consol-chip">{c.nom}</span>{/each}
						</div>
					</div>
					<a class="ws-btn ws-btn-primary df-consol-cta" href={`/decoupe/optimisation?chantiers=${g.chantiers.map((c) => c.id).join(',')}`}>
						{@render icScissors(16)} Optimiser ensemble
					</a>
				</article>
			{/each}
		{/if}

		{#if hubEnSaisie.length > 0}
			<h2 class="df-sec-h">Chantiers à optimiser<span class="df-sec-count">· {hubEnSaisie.length}</span></h2>
			{#each hubEnSaisie as c (c.id)}
				<a class="df-chrow" href={`/decoupe/optimisation?chantiers=${c.id}`}>
					<span class="df-chrow-tile" style="background:{c.familles.length ? familleColor(c.familles[0]) : 'var(--df-fam-securite)'}">{@render icScissors(18)}</span>
					<div class="df-chrow-main">
						<div class="df-chrow-nom">{c.nom}{#if c.client}<span class="df-chrow-client">{c.client}</span>{/if}</div>
						<div class="df-chrow-meta">
							<span class="df-num">{c.nb_vitres} vitre{c.nb_vitres > 1 ? 's' : ''}</span>
							{#if c.familles.length > 0}
								<span class="df-dot-sep"></span>
								{#each c.familles as f (f)}<span class="df-pastille df-pastille--{f}">{FAMILLE_LABEL[f] ?? f}</span>{/each}
							{/if}
						</div>
					</div>
					<span class="df-chrow-chev">{@render icChevron(16)}</span>
				</a>
			{/each}
		{/if}

		{#if hubLancees.length > 0}
			<h2 class="df-sec-h">Déjà lancés<span class="df-sec-count">· {hubLancees.length}</span></h2>
			{#each hubLancees as c (c.id)}
				<a class="df-chrow df-chrow--done" href={`/decoupe/optimisation?chantiers=${c.id}`}>
					<span class="df-chrow-tile" style="background:{c.familles.length ? familleColor(c.familles[0]) : 'var(--df-fam-securite)'}">{@render icScissors(18)}</span>
					<div class="df-chrow-main">
						<div class="df-chrow-nom">{c.nom}{#if c.client}<span class="df-chrow-client">{c.client}</span>{/if}</div>
						<div class="df-chrow-meta">
							<span class="df-num">{c.nb_vitres} vitre{c.nb_vitres > 1 ? 's' : ''}</span>
							<span class="df-dot-sep"></span>
							<span>plan recalculable</span>
						</div>
					</div>
					<span class="df-chrow-chev">{@render icChevron(16)}</span>
				</a>
			{/each}
		{/if}
	{/if}
{:else if !data.ok}
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
		{#if data.resultat.plans.length > 1}
			<p class="df-plan-note">{@render icScale(14)} Tous les plans sont à la même échelle : laizes et longueurs directement comparables d'un film à l'autre.</p>
		{/if}
		{#each data.resultat.plans as plan, pi (plan.produit_id)}
			{@const fam = familleOf(plan.produit_id)}
			{@const fm = filmMetrics(plan)}
			{@const dgm = diagrams[pi]}
			{@const groups = cutGroups(plan)}
			{@const legend = groups.filter((g, i, a) => a.findIndex((x) => x.vitre_id === g.vitre_id) === i)}
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

				<div class="df-dgm">
					<div class="df-dgm-top">
						<div class="df-dgm-tt">
							<div class="df-dgm-title">{@render icPlan(15)} Plan de découpe</div>
							<div class="df-dgm-sub">
								<span class="df-mono">laize {plan.laize_mm} mm</span>
								<span class="df-dot-sep"></span>
								<span class="df-mono">longueur {formatMetres(plan.longueur_consommee_mm)}</span>
								<span class="df-dot-sep"></span>
								<span>{plan.placements.length} pièce{plan.placements.length > 1 ? 's' : ''}</span>
							</div>
						</div>
						<span class="df-dgm-fill"><b class="df-num">{formatPct(fm.remplissage)} %</b>&nbsp;rempli</span>
					</div>
					{#if dgm}
						<svg class="df-dgm-band" style="max-width:{dgm.renderMaxWidthPx}px" viewBox="0 0 {dgm.viewBoxW} {dgm.viewBoxH}" role="img" aria-label={`Plan de remplissage du film ${refOf(plan.produit_id)} : laize ${plan.laize_mm} mm sur ${formatMetres(plan.longueur_consommee_mm)}, ${plan.placements.length} pièces, ${formatPct(plan.taux_chute)} % de chute. Détail exact dans la liste de coupe ci-dessous.`}>
							<defs>
								<pattern id={`df-hx-${plan.produit_id}`} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
									<rect width="7" height="7" fill="#fbfcfd" />
									<line x1="0" y1="0" x2="0" y2="7" stroke="#E8EAED" stroke-width="3.4" />
								</pattern>
							</defs>
							<!-- bande (le fond visible = chute) -->
							<rect x={dgm.band.x} y={dgm.band.y} width={dgm.band.w} height={dgm.band.h} rx="7" fill={`url(#df-hx-${plan.produit_id})`} stroke="#D8DCE2" stroke-width="1" />
							<!-- cote de laize (rail gauche : band.x - 16) -->
							<line x1={dgm.band.x - 16} y1={dgm.band.y + 0.5} x2={dgm.band.x - 16} y2={dgm.band.y + dgm.band.h + 0.5} stroke="#9CA3AF" stroke-width="1.2" />
							<line x1={dgm.band.x - 21} y1={dgm.band.y + 0.5} x2={dgm.band.x - 6} y2={dgm.band.y + 0.5} stroke="#9CA3AF" stroke-width="1.2" />
							<line x1={dgm.band.x - 21} y1={dgm.band.y + dgm.band.h + 0.5} x2={dgm.band.x - 6} y2={dgm.band.y + dgm.band.h + 0.5} stroke="#9CA3AF" stroke-width="1.2" />
							<text x={dgm.band.x - 31} y={dgm.coteMidY} transform={`rotate(-90 ${dgm.band.x - 31} ${dgm.coteMidY})`} fill="#6B7280" font-size="10" font-weight="500" text-anchor="middle" font-family="var(--font-mono)">{dgm.coteLabel}</text>
							<!-- pièces -->
							{#each dgm.rects as r, ri (ri)}
								{@const rcx = r.x + r.w / 2}
								{@const rcy = r.y + r.h / 2}
								{@const tx = pieceTextColor(r.color)}
								<g>
									<rect x={r.x + 1.5} y={r.y + 1.5} width={Math.max(1, r.w - 3)} height={Math.max(1, r.h - 3)} rx="4.5" fill={r.color} fill-opacity="0.18" stroke={r.color} stroke-width="1.4" />
									{#if r.w > 22 && r.h > 18}
										<text x={r.x + 8} y={r.y + 14} fill={tx} font-size="8" font-weight="600" font-family="var(--font-mono)" opacity="0.75">{r.vitreRef}</text>
									{/if}
									{#if r.label}
										<text x={rcx} y={rcy} transform={r.labelOrient === 'v' ? `rotate(-90 ${rcx} ${rcy})` : null} fill={tx} font-size="9.5" font-weight="600" text-anchor="middle" dominant-baseline="central" font-family="var(--font-mono)">{r.label}</text>
										{#if r.pivot && r.labelOrient === 'h' && r.h >= 56}
											<g transform={`translate(${rcx} ${rcy + 24})`}>
												<rect x="-25" y="-7.5" width="50" height="15" rx="7.5" fill="#fff" stroke={r.color} stroke-width="0.9" opacity="0.92" />
												<text x="0" y="0.5" fill={tx} font-size="7.5" font-weight="500" text-anchor="middle" dominant-baseline="central" font-family="var(--font-mono)">pivotée</text>
											</g>
										{/if}
									{/if}
								</g>
							{/each}
							<!-- étiquette chute -->
							{#if dgm.chute}
								<text x={dgm.chute.x} y={dgm.chute.y} fill="#9CA3AF" font-size="8.5" font-weight="500" text-anchor="middle" font-family="var(--font-mono)">{dgm.chute.label}</text>
							{/if}
							<!-- règle de longueur -->
							<line x1={dgm.band.x} y1={dgm.rulerY} x2={dgm.band.x + dgm.band.w} y2={dgm.rulerY} stroke="#D1D5DB" stroke-width="1" />
							{#each dgm.ticks as t, ti (ti)}
								<line x1={t.x} y1={dgm.rulerY - 4} x2={t.x} y2={dgm.rulerY + 4} stroke="#D1D5DB" stroke-width="1" />
								<text x={t.x} y={dgm.rulerY + 16} fill="#9CA3AF" font-size="8.5" text-anchor="middle" font-family="var(--font-mono)">{t.label}</text>
							{/each}
							<line x1={dgm.totalX} y1={dgm.rulerY - 4} x2={dgm.totalX} y2={dgm.rulerY + 4} stroke="#D1D5DB" stroke-width="1" />
							<text x={dgm.totalX} y={dgm.rulerY + 16} fill="#6B7280" font-size="8.5" font-weight="500" text-anchor="end" font-family="var(--font-mono)">{dgm.totalLabel}</text>
							<!-- Titre d'axe : seulement si la bande est assez large (sinon il déborderait du viewBox étroit d'un film court). -->
							{#if dgm.band.w >= 90}
								<text x={dgm.axisX} y={dgm.rulerY + 34} fill="#6B7280" font-size="8.5" font-weight="500" text-anchor="middle" font-family="var(--font-mono)">longueur du film (m)</text>
							{/if}
						</svg>
					{/if}
					<div class="df-dgm-legend">
						{#each legend as g (g.vitre_id)}
							<span class="df-lg"><span class="df-sw" style="background:{colorOf(g.vitre_id)};box-shadow:inset 0 0 0 1.4px {pieceTextColor(colorOf(g.vitre_id))}"></span><span class="df-vref">{vitreRefOf(g.vitre_id)}</span> {g.w}×{g.h}{#if g.pivot} · pivotée{/if}</span>
						{/each}
						<span class="df-lg"><span class="df-sw df-sw--chute"></span>chute</span>
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
						<span class="df-chev">{@render icChevron(15)}</span>Liste de coupe ordonnée<span class="df-ct df-num">{groups.length}</span>
					</summary>
					<table class="df-cuttable">
						<thead>
							<tr>
								<th scope="col"><span class="sr-only">Couleur</span></th>
								<th scope="col">Qté</th>
								<th scope="col">Dimension de coupe</th>
								<th scope="col">Vitre source</th>
								<th scope="col"><span class="sr-only">Pose</span></th>
							</tr>
						</thead>
						<tbody>
							{#each groups as g, gi (gi)}
								<tr>
									<td class="df-c-sw"><span class="df-sw" style="background:{colorOf(g.vitre_id)};opacity:.85"></span></td>
									<td class="df-c-qty df-num">×{g.n}</td>
									<td class="df-c-dim df-num">{g.w} × {g.h} mm</td>
									<td class="df-c-src"><span class="df-vref">{vitreRefOf(g.vitre_id)}</span> · {g.pivot ? 'pivotée' : 'à plat'}</td>
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
