<!--
  AtelierShell : coquille « Heure bleue » partagée par la connexion (/login) et le
  portail (/). Photo hero en bandeau haut (néon « ATELIER 209 » + Jet d'Eau, jamais
  recouverte de texte), contenu centré sur béton plein dessous. Chaque écran tient sur
  une page. Réf design validée Pascal 2026-07-15 :
  .atelier-209/run1-maquettes/heure-bleue-B-bandeau-dessous.html + image bar-off-1.png.

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
			srcset="/atelier209/hero-480.webp 480w, /atelier209/hero-768.webp 768w, /atelier209/hero-1184.webp 1184w"
			sizes="100vw"
			width="1184"
			height="864"
			fetchpriority="high"
			alt="Atelier 209 : enseigne néon crème « ATELIER 209 » sur béton brut, baie vitrée à montants noirs, Jet d'Eau de Genève à l'heure bleue."
		/>
		<div class="banner-scrim" aria-hidden="true"></div>
		<div class="banner-fade" aria-hidden="true"></div>
		{#if header}
			<header class="app-header">{@render header()}</header>
		{/if}
	</div>

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
		--ink-faint: #837e76;
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

	/* Écran : une page (100dvh). min-height (pas height) + overflow non bridé sur .screen :
	   sur très petit écran ou fort zoom, on préfère laisser défiler que rogner le formulaire. */
	.screen {
		position: relative;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--concrete-900);
		color: var(--ink);
		line-height: 1.5;
	}

	.banner {
		position: relative;
		width: 100%;
		flex: 0 0 42vh;
		min-height: 200px;
		overflow: hidden;
		isolation: isolate;
		background: var(--concrete-950);
	}
	.banner-photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 40%;
		display: block;
	}
	.banner-scrim {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 32%;
		background: linear-gradient(
			180deg,
			rgba(var(--shade-0), 0.52) 0%,
			rgba(var(--shade-0), 0.14) 55%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 1;
	}
	.banner-fade {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 42%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(23, 24, 26, 0.55) 46%,
			var(--concrete-900) 100%
		);
		pointer-events: none;
		z-index: 1;
	}

	.app-header {
		position: absolute;
		z-index: 3;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 20px clamp(20px, 5vw, 60px);
	}

	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
		background: var(--concrete-900);
		padding: clamp(28px, 4.5vh, 60px) clamp(22px, 6vw, 60px);
		overflow: hidden;
		display: flex;
		align-items: stretch;
		justify-content: center;
	}
	.stage::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background:
			radial-gradient(56% 46% at 50% 16%, rgba(240, 228, 194, 0.07), transparent 70%),
			radial-gradient(78% 60% at 50% 108%, rgba(76, 110, 158, 0.12), transparent 72%);
	}
	.col {
		position: relative;
		z-index: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-evenly;
		gap: clamp(18px, 2.4vh, 32px);
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
