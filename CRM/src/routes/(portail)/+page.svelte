<!--
  PortailHome : page d'accueil du portail FilmPro à `/`. Écran statique (aucune donnée live).
  Accroche + grille de cards (CRM actif / Devis bientôt) + footer signature.
  Référence visuelle : .product-architect/portail/golden-standard.html (validé Pascal 2026-06-01).
-->
<script lang="ts">
	import ToolCardGrid from '$lib/components/portail/ToolCardGrid.svelte';
	import ToolCard from '$lib/components/portail/ToolCard.svelte';
</script>

<svelte:head>
	<title>FilmPro</title>
</svelte:head>

<main class="portail-main">
	<section class="welcome">
		<h1>Bonjour, par où commencer ?</h1>
		<p>Vos outils FilmPro, au même endroit.</p>
	</section>

	<ToolCardGrid>
		<ToolCard
			titre="CRM"
			sousTitre="Prospection, pipeline, signaux, veille sectorielle."
			href="/crm"
			state="active"
			ariaLabel="Ouvrir le CRM : prospection, pipeline, signaux, veille sectorielle"
		>
			{#snippet icon()}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="6" height="18" rx="1.5" />
					<rect x="15" y="3" width="6" height="11" rx="1.5" />
				</svg>
			{/snippet}
		</ToolCard>

		<ToolCard
			titre="Devis"
			sousTitre="Chiffrez un traitement de vitrage en quelques clics."
			state="soon"
			ariaLabel="Devis : bientôt disponible"
		>
			{#snippet icon()}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6" />
					<path d="M8 13h8" />
					<path d="M8 17h5" />
				</svg>
			{/snippet}
		</ToolCard>
	</ToolCardGrid>
</main>

<footer class="portail-footer">
	FilmPro - Traitements pour vitrage - Suisse romande
</footer>

<style>
	.portail-main {
		flex: 1;
		width: 100%;
		max-width: 960px;
		margin: 0 auto;
		padding: 64px 24px 48px;
	}

	.welcome {
		text-align: center;
		margin-bottom: 44px;
	}
	.welcome h1 {
		font-size: 30px;
		line-height: 1.2;
		font-weight: 600;
		letter-spacing: -0.025em;
		color: var(--color-text);
	}
	.welcome p {
		margin-top: 10px;
		font-size: 16px;
		color: var(--color-text-muted);
	}

	.portail-footer {
		text-align: center;
		padding: 28px 24px 36px;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	@media (max-width: 420px) {
		.portail-main {
			padding-top: 44px;
		}
		.welcome h1 {
			font-size: 25px;
		}
	}
</style>
