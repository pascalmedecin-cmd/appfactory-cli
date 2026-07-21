<!--
  AtelierShell : coquille « Heure bleue » partagée par la connexion (/login) et le
  portail (/). Photo hero (néon « ATELIER 209 » + Jet d'Eau) en fond haut, dissoute par
  un MASQUE vertical long dans le béton (aucune ligne de démarcation) ; le contenu est
  ancré en bas et son haut (eyebrow/titre) mord proprement sur le fondu, le corps reste
  sur le béton plein. Réf design validée Pascal 2026-07-21 :
  .atelier-209/accueil-maquettes/accueil.html (image upscalée fal.ai + layout 60/40).

  Layout fluide : image = 60% de la hauteur, PLAFONNÉE sur écran court (min(60vh,
  100dvh-380px)) pour toujours réserver la place du formulaire → il ne se retrouve jamais
  sur le néon plein, au pire il mord sur le fondu, sinon la page défile. Photo en fond
  absolu (hors flux) ; header absolu au-dessus du contenu (reste cliquable).

  Tokens posés sur `.a209` (héritent au contenu slotté). Primitives partagées (eyebrow,
  head, display, subtitle, reveal) stylées ici en `:global` contenu sous `.a209` ; les
  primitives propres à chaque écran (btn/field pour la connexion, tool pour le portail)
  vivent dans leur composant. Reveal = animation CSS au chargement (aucun JS, GPU-safe).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { header, children }: { header?: Snippet; children: Snippet } = $props();
</script>

<section class="a209 screen">
	<div class="banner">
		<img
			class="banner-photo"
			src="/atelier209/hero-1184.webp"
			srcset="/atelier209/hero-480.webp 480w, /atelier209/hero-768.webp 768w, /atelier209/hero-1184.webp 1184w, /atelier209/hero-1600.webp 1600w, /atelier209/hero-2368.webp 2368w"
			sizes="100vw"
			width="2368"
			height="1728"
			fetchpriority="high"
			alt="Atelier 209 : enseigne néon crème « ATELIER 209 » sur béton brut, baie vitrée à montants noirs, Jet d'Eau de Genève à l'heure bleue."
		/>
		<div class="banner-scrim" aria-hidden="true"></div>
	</div>

	{#if header}
		<header class="app-header">{@render header()}</header>
	{/if}

	<div class="stage">
		<div class="col">
			{@render children()}
		</div>
	</div>
</section>

<style>
	.a209 {
		--concrete-950: #121315;
		--concrete-900: #17181a;
		--concrete-850: #1e1f22;
		--concrete-800: #232529;
		--shade-0: 8, 9, 10;
		--ink: #ece7dc;
		--ink-muted: #b4aea2;
		--ink-faint: #928d82;
		--cream: #f0e4c2;
		--cream-bright: #fbf4df;
		--blue-hour: #2a3a52;
		--blue-glow: #4c6e9e;
		--a209-ease: cubic-bezier(0.22, 0.61, 0.14, 1);
		--a209-ease-soft: cubic-bezier(0.32, 0.72, 0, 1);
		font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}

	/* Écran : une page (100dvh). min-height (pas height) : si le contenu dépasse (petit écran,
	   fort zoom, formulaire empilé mobile), la page défile au lieu de rogner le formulaire. */
	.screen {
		position: relative;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--concrete-900);
		color: var(--ink);
		line-height: 1.5;
	}

	/* Bandeau image = 60% de la hauteur, en FOND (absolu, hors flux). Plafonné sur écran court
	   (min(60vh, 100dvh - 380px)) pour toujours réserver >= 380px au contenu. Béton EXACT en fond
	   (pas de lueur) : l'image se dissout dans le même béton que la zone contenu = zéro ligne. */
	.banner {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: min(60vh, calc(100dvh - 380px));
		min-height: 300px;
		overflow: hidden;
		z-index: 0;
		background: var(--concrete-900);
	}
	/* Fondu VERTICAL long et TRÈS progressif par MASQUE sur la photo (7 paliers, ~40% de la hauteur) :
	   opaque sous le néon, puis dissolution jusqu'à transparent → béton. Zéro coupure, zéro ligne. */
	.banner-photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 40%;
		display: block;
		-webkit-mask-image: linear-gradient(
			180deg,
			#000 0%,
			#000 60%,
			rgba(0, 0, 0, 0.85) 70%,
			rgba(0, 0, 0, 0.6) 78%,
			rgba(0, 0, 0, 0.36) 85%,
			rgba(0, 0, 0, 0.18) 90%,
			rgba(0, 0, 0, 0.06) 95%,
			transparent 99%
		);
		mask-image: linear-gradient(
			180deg,
			#000 0%,
			#000 60%,
			rgba(0, 0, 0, 0.85) 70%,
			rgba(0, 0, 0, 0.6) 78%,
			rgba(0, 0, 0, 0.36) 85%,
			rgba(0, 0, 0, 0.18) 90%,
			rgba(0, 0, 0, 0.06) 95%,
			transparent 99%
		);
	}
	.banner-scrim {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 30%;
		background: linear-gradient(
			180deg,
			rgba(var(--shade-0), 0.5) 0%,
			rgba(var(--shade-0), 0.13) 55%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 1;
	}

	.app-header {
		position: absolute;
		z-index: 5;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 20px clamp(20px, 5vw, 60px);
		/* Le header est pleine largeur mais son seul contenu interactif est à droite : on rend la
		   bande transparente non-cliquable pour ne pas capter le hit-test du haut du portail (le
		   `.stage` plein écran passe alors dessous), et on réactive les vrais boutons. */
		pointer-events: none;
	}
	.app-header > :global(*) {
		pointer-events: auto;
	}

	/* Béton = le reste de l'écran. Fond TRANSPARENT (le béton vient de .screen) : sinon il couvrirait
	   le fondu de l'image. Contenu ancré en BAS (justify-content:flex-end) ; padding-top = réserve qui
	   maintient le haut du contenu dans le fondu (jamais sur le néon plein). flex:1 0 auto = si le
	   contenu dépasse, la page grandit et défile (jamais rogné). */
	.stage {
		position: relative;
		z-index: 2;
		flex: 1 0 auto;
		background: transparent;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding: min(39vh, calc(100dvh - 430px)) clamp(22px, 6vw, 60px) clamp(30px, 4.5vh, 56px);
	}
	.stage::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background:
			radial-gradient(52% 40% at 50% 64%, rgba(240, 228, 194, 0.05), transparent 66%),
			radial-gradient(80% 55% at 50% 118%, rgba(76, 110, 158, 0.1), transparent 72%);
	}
	.col {
		position: relative;
		z-index: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(22px, 2.9vh, 36px);
		text-align: center;
	}

	/* ---- Primitives partagées (contenu slotté, contenu sous .a209) ---- */
	.a209 :global(.eyebrow) {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 7px 15px 7px 13px;
		border-radius: 999px;
		background: rgba(240, 228, 194, 0.07);
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--cream);
		/* Emphase dédiée eyebrow -> titre (décision Pascal 2026-07-21) : s'ajoute au gap du .col
		   pour que l'eyebrow respire nettement au-dessus du titre, sans sur-espacer le reste. */
		margin-bottom: clamp(6px, 1.5vh, 16px);
	}
	.a209 :global(.eyebrow)::before {
		content: '';
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--cream);
		box-shadow: 0 0 9px rgba(240, 228, 194, 0.75);
	}
	.a209 :global(.head) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(6px, 1.2vw, 14px);
	}
	.a209 :global(.display) {
		font-weight: 800;
		letter-spacing: -0.038em;
		line-height: 1;
		color: var(--ink);
		text-shadow: 0 3px 40px rgba(0, 0, 0, 0.45);
		text-wrap: balance;
	}
	.a209 :global(.subtitle) {
		font-size: clamp(15px, 1.6vw, 18px);
		font-weight: 400;
		color: var(--ink-muted);
		letter-spacing: -0.005em;
		max-width: 42ch;
	}

	/* ---- Reveal (fade-up au chargement, GPU-safe, sans JS) ----
	   Le @keyframes a209-reveal est défini globalement dans app.css : un keyframe déclaré
	   dans un <style> Svelte serait hashé et introuvable depuis ce sélecteur :global. */
	.a209 :global(.reveal) {
		opacity: 0;
		animation: a209-reveal 0.9s var(--a209-ease-soft) var(--d, 0s) both;
	}

	@media (prefers-reduced-motion: reduce) {
		.a209 :global(.reveal) {
			animation: none;
			opacity: 1;
		}
	}
</style>
