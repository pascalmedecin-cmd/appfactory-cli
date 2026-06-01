<!--
  ToolCardGrid : grille responsive des ToolCard. Pure mise en page (aucun état).
  ≥720px = 2 colonnes, <720px = 1 colonne. CSS scoped (responsive de layout, pas md:* Tailwind v4).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="tools-grid">
	{@render children()}
</div>

<style>
	.tools-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 24px;
	}
	@media (min-width: 720px) {
		.tools-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
