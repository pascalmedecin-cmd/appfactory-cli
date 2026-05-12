<!--
	Diagrammes SVG sur-mesure de la page d'aide (audit 360 : zéro capture d'écran en V1).

	Chaque diagramme est un schéma boîtes-et-flèches sobre, dessiné avec les tokens du design
	system (couleurs, radius). Pas de gradient, pas de trait pointillé, pas de couleur en dur :
	les couleurs viennent de `var(--color-*)` via les classes CSS ci-dessous.

	A11y : `<svg role="img">` + `<title>` (la légende fournie par le contenu, ou un libellé par défaut).
-->
<script lang="ts">
	import type { AideDiagramName } from '$lib/aide/content';

	let { name, caption }: { name: AideDiagramName; caption?: string } = $props();

	const titles: Record<AideDiagramName, string> = {
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
</script>

<figure class="aide-diagram">
	<svg
		viewBox="0 0 720 360"
		role="img"
		aria-label={label}
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{label}</title>

		<defs>
			<marker id="aide-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
				<path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
			</marker>
		</defs>

		{#if name === 'ecosysteme'}
			<!--
				Vue d'ensemble : où situer chaque écran. Pas de flèches de flux (le texte
				au-dessus explique le parcours) : juste le tableau de bord en haut, puis les
				six écrans rangés en deux familles, chacun avec son rôle en une ligne.
			-->
			<rect x="150" y="14" width="420" height="48" rx="12" class="node node-accent" />
			<text x="360" y="35" class="t-title t-inv">Tableau de bord</text>
			<text x="360" y="51" class="t-sub t-inv">relances dues · leads chauds · alertes du secteur</text>
			<text x="360" y="80" class="t-flow">tu pars d'ici chaque matin ; tout le reste y remonte</text>

			<!-- Famille 1 : tes clients -->
			<rect x="24" y="94" width="336" height="254" rx="14" class="group-panel" />
			<text x="192" y="115" class="t-grouplabel">Tes clients</text>
			{#each [
				['Prospection', 'trouver de nouveaux leads'],
				['Entreprises', 'la fiche de chaque société'],
				['Contacts', 'la fiche de chaque personne'],
				['Pipeline', 'tes affaires en cours']
			] as row, i}
				{@const y = 124 + i * 56}
				<rect x="40" y={y} width="304" height="46" rx="10" class="node" />
				<text x="192" y={y + 20} class="t-node t-sm">{row[0]}</text>
				<text x="192" y={y + 35} class="t-node t-xs">{row[1]}</text>
			{/each}

			<!-- Famille 2 : le marché et le bilan -->
			<rect x="384" y="94" width="312" height="254" rx="14" class="group-panel" />
			<text x="540" y="115" class="t-grouplabel">Le marché et le bilan</text>
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
					<path d={`M${Number(step[1]) + 120} 88 L${Number(step[1]) + 158} 88`} class="link" marker-end="url(#aide-arrow)" />
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
					<path d={`M${step.x + 156} 180 L${step.x + 196} 180`} class="link" marker-end="url(#aide-arrow)" />
				{/if}
			{/each}
			<text x="360" y="56" class="t-flow">une édition par semaine, jamais publiée brute</text>
			<rect x="24" y="280" width="672" height="44" rx="10" class="node node-soft" />
			<text x="360" y="307" class="t-node t-sm">L'écran « Signaux » montre la matière première (étape 1) ; l'écran « Veille » montre l'édition finie (étape 4).</text>

		{:else if name === 'scoring-prospection'}
			<!-- Barres empilées : composition du score sur 12 -->
			<text x="360" y="32" class="t-flow">score de priorité d'un lead, calculé automatiquement (sur 12)</text>
			{#each [
				['Secteur cible (bâtiment, architecte, régie…)', 3, 'node-mid'],
				['Canton prioritaire (GE / VD / VS)', 2, 'node'],
				['Source « chaude » : marché public SIMAP', 2, 'node'],
				['Entreprise identifiée (registre / établissement)', 1, 'node-soft'],
				['Source chantier : registre des bâtiments', 1, 'node-soft'],
				['Canton secondaire (NE / FR / JU)', 1, 'node-soft']
			] as row, i}
				<rect x="24" y={64 + i * 44} width="380" height="36" rx="8" class="node {row[2]}" />
				<text x="40" y={86 + i * 44} class="t-node t-xs t-left">{row[0]}</text>
				<rect x="420" y={64 + i * 44} width={Number(row[1]) * 80} height="36" rx="8" class="bar" />
				<text x={420 + Number(row[1]) * 80 + 14} y={86 + i * 44} class="t-node t-xs t-left">+{row[1]} pt{Number(row[1]) > 1 ? 's' : ''}</text>
			{/each}
			<line x1="420" y1="56" x2="420" y2="332" class="axis" />
			<rect x="24" y="338" width="672" height="0.5" class="axis" />
			<text x="500" y="354" class="t-node t-xs">Pastille : « Prioritaire » ≥ 7 · « À qualifier » 4-6 · « Faible signal » 0-3</text>

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
			<text x="125" y="250" class="t-node t-xs">Auth (magic link)</text>
			<rect x="210" y="190" width="130" height="72" rx="8" class="node node-soft" />
			<text x="275" y="218" class="t-node t-xs">5 crons</text>
			<text x="275" y="234" class="t-node t-xs">signaux · alertes</text>
			<text x="275" y="250" class="t-node t-xs">nettoyage · veille</text>

			<rect x="430" y="150" width="250" height="56" rx="12" class="node node-accent" />
			<text x="555" y="174" class="t-node t-inv t-sm">Base PostgreSQL (Supabase)</text>
			<text x="555" y="190" class="t-node t-inv t-xs">RLS active · migrations versionnées</text>

			<rect x="430" y="240" width="250" height="80" rx="12" class="node node-out" />
			<text x="555" y="262" class="t-node t-sm">Services externes</text>
			<text x="555" y="280" class="t-node t-xs">Zefix · search.ch · SIMAP · RegBL</text>
			<text x="555" y="296" class="t-node t-xs">Google Places · fal.ai · Resend</text>

			<path d="M140 96 L140 148" class="link" marker-end="url(#aide-arrow)" />
			<path d="M360 200 L428 178" class="link" marker-end="url(#aide-arrow)" />
			<path d="M360 240 L428 270" class="link" marker-end="url(#aide-arrow)" />
		{/if}
	</svg>
	{#if caption}
		<figcaption>{caption}</figcaption>
	{/if}
</figure>

<style>
	.aide-diagram {
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
		padding: 16px;
		box-sizing: border-box;
	}
	figcaption {
		margin-top: 8px;
		font-size: 12px;
		line-height: 1.33;
		color: var(--color-text-muted);
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
