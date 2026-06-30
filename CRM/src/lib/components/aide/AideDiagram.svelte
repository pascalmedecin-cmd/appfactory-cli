<!--
	Diagrammes SVG sur-mesure de la page d'aide (audit 360 : zéro capture d'écran en V1).

	Chaque diagramme est un schéma boîtes-et-flèches sobre, dessiné avec les tokens du design
	system (couleurs, radius). Pas de gradient, pas de trait pointillé, pas de couleur en dur :
	les couleurs viennent de `var(--color-*)` via les classes CSS ci-dessous.

	A11y : `<svg role="img">` + `<title>` (la légende fournie par le contenu, ou un libellé par défaut).

	Lightbox : bouton « agrandir » top-right ouvre une modal fullscreen ; utile sur mobile où
	les textes du SVG (10-13px) ne sont pas lisibles à l'échelle viewport. Close via Escape ou
	clic backdrop. SVG dupliqué via Svelte snippet pour éviter la triplication markup.
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { AideDiagramName } from '$lib/aide/content';

	let { name, caption }: { name: AideDiagramName; caption?: string } = $props();

	const titles: Record<AideDiagramName, string> = {
		portail: 'Le portail FilmPro et ses outils',
		ecosysteme: 'Les écrans du CRM, rangés par usage',
		'cycle-opportunite': 'Le cycle de vie d\'une opportunité dans le pipeline',
		'veille-hebdo': 'Le déroulé d\'une édition de veille hebdomadaire',
		'scoring-prospection': 'La composition du score de priorité d\'un lead',
		architecture: 'Vue d\'ensemble de l\'architecture du CRM'
	};

	const label = $derived(caption?.trim() || titles[name]);

	const veilleSteps: { name: string; desc: string; x: number }[] = [
		{ name: 'Capter', desc: 'marchés, chantiers…', x: 24 },
		{ name: 'Trier & vérifier', desc: 'étiquette de conformité', x: 196 },
		{ name: 'Mettre en forme', desc: 'génération, puis relecture', x: 368 },
		{ name: 'Lire', desc: '10 min par semaine', x: 540 }
	];

	let expanded = $state(false);

	function openLightbox() {
		expanded = true;
	}

	function closeLightbox() {
		expanded = false;
	}

	// Listener Escape + lock scroll body en SSR-safe via $effect (cf. mémoire
	// feedback_svelte5_ondestroy_ssr_window_undefined.md : ne JAMAIS utiliser
	// onMount+onDestroy pour window/document, $effect renvoie un cleanup safe).
	$effect(() => {
		if (!expanded) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') closeLightbox();
		}
		document.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	});
</script>

<figure class="aide-diagram">
	<svg
		viewBox="0 0 720 360"
		role="img"
		aria-label={label}
		xmlns="http://www.w3.org/2000/svg"
	>
		{@render svgContent()}
	</svg>
	<button
		type="button"
		class="aide-zoom-btn"
		onclick={openLightbox}
		aria-label="Agrandir le diagramme en plein écran"
	>
		<Icon name="open_in_full" size={16} />
	</button>
	{#if caption}
		<figcaption>{caption}</figcaption>
	{/if}
</figure>

{#if expanded}
	<div class="aide-lightbox" role="dialog" aria-modal="true" aria-label={label}>
		<button
			type="button"
			class="aide-lightbox-backdrop"
			onclick={closeLightbox}
			aria-label="Fermer en cliquant le fond"
		></button>
		<div class="aide-lightbox-content">
			<button
				type="button"
				class="aide-lightbox-close"
				onclick={closeLightbox}
				aria-label="Fermer"
			>
				<Icon name="close" size={20} />
			</button>
			<svg
				viewBox="0 0 720 360"
				role="img"
				aria-label={label}
				xmlns="http://www.w3.org/2000/svg"
				class="aide-lightbox-svg"
			>
				{@render svgContent()}
			</svg>
		</div>
	</div>
{/if}

{#snippet svgContent()}
	<title>{label}</title>

	<defs>
		<marker id="aide-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
			<path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
		</marker>
	</defs>

	{#if name === 'portail'}
		<!--
			Le portail FilmPro : un seul accès en haut, deux outils en dessous. Le CRM
			(décrit dans cette aide) est mis en avant ; Découpe Films est le second outil.
		-->
		<rect x="248" y="20" width="224" height="56" rx="14" class="node node-accent" />
		<text x="360" y="44" class="t-title t-inv">Portail FilmPro</text>
		<text x="360" y="61" class="t-sub t-inv">un seul accès, plusieurs outils</text>

		<path d="M320 76 L196 150" class="link" marker-end="url(#aide-arrow)" />
		<path d="M400 76 L524 150" class="link" marker-end="url(#aide-arrow)" />

		<!-- Outil 1 : CRM (mis en avant, « tu es ici ») -->
		<rect x="56" y="152" width="280" height="156" rx="14" class="node node-mid" />
		<rect x="72" y="166" width="120" height="22" rx="11" class="badge-pill" />
		<text x="132" y="177" class="t-pill">tu es ici</text>
		<text x="196" y="216" class="t-node t-sm">CRM</text>
		<text x="196" y="240" class="t-node t-xs">Prospection · Pipeline</text>
		<text x="196" y="258" class="t-node t-xs">Signaux · Veille · Reporting</text>
		<text x="196" y="284" class="t-node t-xs">le suivi commercial du vitrage</text>

		<!-- Outil 2 : Découpe Films -->
		<rect x="384" y="152" width="280" height="156" rx="14" class="node" />
		<text x="524" y="216" class="t-node t-sm">Découpe Films</text>
		<text x="524" y="240" class="t-node t-xs">optimiser les plans de coupe,</text>
		<text x="524" y="258" class="t-node t-xs">limiter les chutes de film</text>
		<text x="524" y="284" class="t-node t-xs">réservé aux fondateurs</text>

		<text x="360" y="334" class="t-flow">le logo de la barre latérale ramène toujours ici</text>

	{:else if name === 'ecosysteme'}
		<!--
			Vue d'ensemble : où situer chaque écran. Pas de flèches de flux (le texte
			au-dessus explique le parcours) : le tableau de bord en haut, puis les écrans
			rangés en deux familles, chacun avec son rôle en une ligne. Campagnes (avancé)
			figure dans « tes clients ».
		-->
		<rect x="150" y="14" width="420" height="48" rx="12" class="node node-accent" />
		<text x="360" y="35" class="t-title t-inv">Tableau de bord</text>
		<text x="360" y="51" class="t-sub t-inv">relances dues · leads chauds · alertes du secteur</text>
		<text x="360" y="80" class="t-flow">tu pars d'ici chaque matin ; tout le reste y remonte</text>

		<!-- Famille 1 : tes clients -->
		<rect x="24" y="94" width="336" height="254" rx="14" class="group-panel" />
		<text x="192" y="114" class="t-grouplabel">Tes clients</text>
		{#each [
			['Prospection', 'trouver de nouveaux leads'],
			['Campagnes', 'regrouper les prospects (avancé)'],
			['Entreprises', 'la fiche de chaque société'],
			['Contacts', 'la fiche de chaque personne'],
			['Pipeline', 'tes affaires en cours']
		] as row, i}
			{@const y = 122 + i * 44}
			<rect x="40" y={y} width="304" height="38" rx="10" class="node" />
			<text x="192" y={y + 16} class="t-node t-sm">{row[0]}</text>
			<text x="192" y={y + 30} class="t-node t-xs">{row[1]}</text>
		{/each}

		<!-- Famille 2 : le marché et le bilan -->
		<rect x="384" y="94" width="312" height="254" rx="14" class="group-panel" />
		<text x="540" y="114" class="t-grouplabel">Le marché et le bilan</text>
		{#each [
			['Signaux', 'les alertes brutes du secteur'],
			['Veille sectorielle', 'le résumé, une fois par semaine'],
			['Reporting', 'tes chiffres consolidés']
		] as row, i}
			{@const y = 126 + i * 74}
			<rect x="400" y={y} width="280" height="56" rx="10" class="node" />
			<text x="540" y={y + 24} class="t-node t-sm">{row[0]}</text>
			<text x="540" y={y + 40} class="t-node t-xs">{row[1]}</text>
		{/each}

	{:else if name === 'cycle-opportunite'}
		<!-- Cycle linéaire à 5 étapes + 2 issues -->
		{#each [['Lead qualifié', 24], ['Contact établi', 158], ['Visite / relevé', 292], ['Soumission', 426], ['Décision', 560]] as step, i}
			<rect x={step[1]} y="60" width="120" height="56" rx="12" class="node {i === 4 ? 'node-mid' : 'node'}" />
			<text x={Number(step[1]) + 60} y="92" class="t-node t-sm">{step[0]}</text>
			{#if i < 4}
				<!-- Fin de flèche au bord gauche de la boîte suivante (les boîtes opaques sont peintes
				     ensuite et masqueraient une pointe placée plus loin). -->
				<path d={`M${Number(step[1]) + 120} 88 L${Number(step[1]) + 132} 88`} class="link" marker-end="url(#aide-arrow)" />
			{/if}
		{/each}
		<!-- step numbers -->
		{#each [24, 158, 292, 426, 560] as x, i}
			<circle cx={x + 18} cy={60} r="13" class="badge" />
			<text x={x + 18} y={60} class="t-badge">{i + 1}</text>
		{/each}

		<!-- issues -->
		<rect x="500" y="200" width="120" height="44" rx="10" class="node node-ok" />
		<text x="560" y="222" class="t-node t-sm">Gagné</text>
		<text x="560" y="236" class="t-node t-xs">soumission acceptée</text>
		<rect x="640" y="200" width="56" height="44" rx="10" class="node node-no" />
		<text x="668" y="222" class="t-node t-sm">Perdu</text>
		<text x="668" y="236" class="t-node t-xs">+ motif</text>
		<path d="M615 116 L575 198" class="link" marker-end="url(#aide-arrow)" />
		<path d="M635 116 L662 198" class="link" marker-end="url(#aide-arrow)" />

		<!-- suite après gagné -->
		<rect x="470" y="288" width="226" height="40" rx="10" class="node node-out" />
		<text x="583" y="312" class="t-node t-sm">Pose suivie sur la fiche entreprise</text>
		<path d="M560 244 L560 286" class="link" marker-end="url(#aide-arrow)" />

		<text x="360" y="32" class="t-flow">on glisse la carte d'une colonne à la suivante</text>

	{:else if name === 'veille-hebdo'}
		<!-- 4 étapes : capter → trier/vérifier → mettre en forme → lire -->
		{#each veilleSteps as step, i (step.x)}
			<rect x={step.x} y="120" width="156" height="120" rx="12" class="node {i === 3 ? 'node-mid' : 'node'}" />
			<circle cx={step.x + 26} cy={146} r="14" class="badge" />
			<text x={step.x + 26} y={146} class="t-badge">{i + 1}</text>
			<text x={step.x + 78} y={186} class="t-node t-sm">{step.name}</text>
			<text x={step.x + 78} y={206} class="t-node t-xs">{step.desc}</text>
			{#if i < 3}
				<!-- Fin de flèche au bord gauche de la boîte suivante (peinte ensuite, opaque). -->
				<path d={`M${step.x + 156} 180 L${step.x + 170} 180`} class="link" marker-end="url(#aide-arrow)" />
			{/if}
		{/each}
		<text x="360" y="56" class="t-flow">une édition par semaine, jamais publiée brute</text>
		<rect x="24" y="280" width="672" height="44" rx="10" class="node node-soft" />
		<text x="360" y="307" class="t-node t-sm">L'écran « Signaux » montre la matière première (étape 1) ; l'écran « Veille » montre l'édition finie (étape 4).</text>

	{:else if name === 'scoring-prospection'}
		<!-- Barres : composition réelle du score (config.scoring + mots-clés). Échelle
			 24px/pt pour que le booster mots-clés Cœur (cap +10) tienne dans la zone. -->
		<text x="360" y="32" class="t-flow">score de priorité d'un lead, calculé automatiquement (sur 10)</text>
		{#each [
			{ name: 'Mots-clés Cœur métier (vitrage, films, vernis…)', pts: 10, cls: 'node-mid' },
			{ name: 'Mots-clés bonus (secteur connexe)', pts: 4, cls: 'node' },
			{ name: 'Secteur cible (bâtiment, architecte, régie…)', pts: 3, cls: 'node' },
			{ name: 'Canton prioritaire (GE / VD / VS)', pts: 2, cls: 'node-soft' },
			{ name: 'Canton secondaire (NE / FR / JU)', pts: 1, cls: 'node-soft' },
			{ name: 'Téléphone, montant ≥ 100k, registre RegBL', pts: 1, cls: 'node-soft', ptLabel: '+1 chacun' }
		] as row, i}
			<rect x="24" y={64 + i * 44} width="380" height="36" rx="8" class="node {row.cls}" />
			<text x="40" y={86 + i * 44} class="t-node t-xs t-left">{row.name}</text>
			<rect x="420" y={64 + i * 44} width={row.pts * 24} height="36" rx="8" class="bar" />
			<text x={420 + row.pts * 24 + 14} y={86 + i * 44} class="t-node t-xs t-left">{row.ptLabel ?? `+${row.pts} pt${row.pts > 1 ? 's' : ''}`}</text>
		{/each}
		<line x1="420" y1="56" x2="420" y2="332" class="axis" />
		<rect x="24" y="338" width="672" height="0.5" class="axis" />
		<text x="40" y="354" class="t-node t-xs t-left">Les mots-clés « à éviter » retirent des points.</text>
		<text x="696" y="354" class="t-node t-xs" text-anchor="end">« Prioritaire » ≥ 7 · « À qualifier » 4-6 · « Faible signal » 0-3</text>

	{:else if name === 'architecture'}
		<!-- 4 couches : navigateur → application → base → services externes -->
		<rect x="40" y="40" width="200" height="56" rx="12" class="node" />
		<text x="140" y="64" class="t-node t-sm">Navigateur</text>
		<text x="140" y="80" class="t-node t-xs">interface SvelteKit (rendu serveur)</text>

		<rect x="40" y="150" width="320" height="120" rx="12" class="node node-mid" />
		<text x="200" y="174" class="t-node t-sm">Application (Vercel)</text>
		<rect x="60" y="190" width="130" height="32" rx="8" class="node node-soft" />
		<text x="125" y="210" class="t-node t-xs">Actions serveur</text>
		<rect x="60" y="230" width="130" height="32" rx="8" class="node node-soft" />
		<text x="125" y="250" class="t-node t-xs">Auth (code e-mail)</text>
		<rect x="210" y="190" width="130" height="72" rx="8" class="node node-soft" />
		<text x="275" y="208" class="t-node t-xs">6 crons</text>
		<text x="275" y="228" class="t-node t-xs">signaux · alertes</text>
		<text x="275" y="244" class="t-node t-xs">e-mails · entretien</text>

		<rect x="430" y="150" width="250" height="56" rx="12" class="node node-accent" />
		<text x="555" y="174" class="t-node t-inv t-sm">Base PostgreSQL (Supabase)</text>
		<text x="555" y="190" class="t-node t-inv t-xs">RLS active · migrations versionnées</text>

		<rect x="430" y="240" width="250" height="80" rx="12" class="node node-out" />
		<text x="555" y="262" class="t-node t-sm">Services externes</text>
		<text x="555" y="280" class="t-node t-xs">Zefix · search.ch · Google Places</text>
		<text x="555" y="296" class="t-node t-xs">fal.ai · Resend</text>

		<path d="M140 96 L140 148" class="link" marker-end="url(#aide-arrow)" />
		<path d="M360 200 L428 178" class="link" marker-end="url(#aide-arrow)" />
		<path d="M360 240 L428 270" class="link" marker-end="url(#aide-arrow)" />

		<text x="360" y="342" class="t-flow">la veille hebdomadaire (IA) tourne en tâche externe, pas en cron Vercel</text>
	{/if}
{/snippet}

<style>
	.aide-diagram {
		position: relative;
		margin: 32px 0;
	}
	.aide-diagram svg {
		display: block;
		width: 100%;
		height: auto;
		max-width: 760px;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		padding: 16px;
		box-sizing: border-box;
	}
	figcaption {
		margin-top: 8px;
		font-size: 12px;
		line-height: 1.33;
		color: var(--color-text-muted);
	}

	/* Bouton zoom top-right, hairline contrast sur fond surface-alt. Tap target >= 44px. */
	.aide-zoom-btn {
		position: absolute;
		top: 24px;
		right: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 150ms var(--ease-out-expo), color 150ms var(--ease-out-expo);
	}
	.aide-zoom-btn:hover {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.aide-zoom-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Lightbox overlay fullscreen. Backdrop blur léger + close button visible.
	   Le SVG agrandit pour remplir 90vw × 80vh, tokens design respectés. */
	.aide-lightbox {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		padding: 24px;
		padding-top: max(24px, env(safe-area-inset-top));
		padding-bottom: max(24px, env(safe-area-inset-bottom));
	}
	.aide-lightbox-backdrop {
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--color-text) 70%, transparent);
		border: none;
		padding: 0;
		cursor: pointer;
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
	}
	.aide-lightbox-content {
		position: relative;
		width: min(96vw, 1400px);
		max-height: 92vh;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.aide-lightbox-close {
		position: absolute;
		top: -8px;
		right: -8px;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		box-shadow: var(--shadow-card);
	}
	.aide-lightbox-close:hover {
		background: var(--color-danger);
		color: var(--color-text-inverse);
		border-color: var(--color-danger);
	}
	.aide-lightbox-close:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.aide-lightbox-svg {
		display: block;
		width: 100%;
		max-width: none;
		max-height: 90vh;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 24px;
		box-sizing: border-box;
	}

	@media (max-width: 640px) {
		.aide-zoom-btn {
			top: 16px;
			right: 16px;
		}
		.aide-lightbox {
			padding: 16px;
		}
		.aide-lightbox-svg {
			padding: 16px;
		}
	}

	/* Nœuds */
	.node {
		fill: var(--color-surface);
		stroke: var(--color-border-strong);
		stroke-width: 1;
	}
	.node-soft {
		fill: var(--color-surface-alt);
		stroke: var(--color-border);
	}
	.node-mid {
		fill: var(--color-primary-light);
		stroke: var(--color-primary);
	}
	.node-accent {
		fill: var(--color-primary);
		stroke: var(--color-primary);
	}
	.node-out {
		fill: var(--color-info-light);
		stroke: var(--color-info);
	}
	.node-ok {
		fill: var(--color-success-light);
		stroke: var(--color-success);
	}
	.node-no {
		fill: var(--color-danger-light);
		stroke: var(--color-danger);
	}
	/* Panneau de regroupement (carte « écosystème ») : fond discret derrière des cartes. */
	.group-panel {
		fill: var(--color-surface-alt);
		stroke: var(--color-border);
		stroke-width: 1;
	}

	/* Liens */
	.link {
		fill: none;
		stroke: var(--color-border-strong);
		stroke-width: 1.5;
	}
	.link-up {
		stroke: var(--color-primary);
	}
	.arrowhead {
		fill: var(--color-border-strong);
	}
	.axis {
		stroke: var(--color-border);
		stroke-width: 1;
		fill: var(--color-border);
	}
	.bar {
		fill: var(--color-primary);
		stroke: none;
		opacity: 0.85;
	}
	.badge {
		fill: var(--color-primary);
		stroke: var(--color-surface);
		stroke-width: 2;
	}
	/* Pastille « tu es ici » (diagramme portail) : pilule pleine accent. */
	.badge-pill {
		fill: var(--color-primary);
		stroke: none;
	}
	.t-pill {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-anchor: middle;
		dominant-baseline: central;
		fill: var(--color-text-inverse);
	}

	/* Textes */
	text {
		font-family: var(--font-sans);
		fill: var(--color-text);
	}
	.t-title {
		font-size: 14px;
		font-weight: 600;
		text-anchor: middle;
	}
	.t-sub {
		font-size: 10px;
		font-weight: 400;
		text-anchor: middle;
	}
	.t-node {
		font-size: 13px;
		font-weight: 600;
		text-anchor: middle;
		fill: var(--color-text);
	}
	.t-node.t-sm {
		font-size: 12px;
		font-weight: 600;
	}
	.t-node.t-xs {
		font-size: 10px;
		font-weight: 400;
		fill: var(--color-text-muted);
	}
	.t-node.t-left {
		text-anchor: start;
	}
	.t-node.t-inv,
	.t-inv {
		fill: var(--color-text-inverse);
	}
	.t-flow {
		font-size: 11px;
		font-weight: 500;
		font-style: italic;
		text-anchor: middle;
		fill: var(--color-text-muted);
	}
	.t-badge {
		font-size: 11px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
		fill: var(--color-text-inverse);
	}
	.t-grouplabel {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-anchor: middle;
		fill: var(--color-text-muted);
	}
</style>
