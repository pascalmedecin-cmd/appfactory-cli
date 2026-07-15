<!--
  Layout du groupe portail. Depuis la refonte Atelier 209 (Run 1), la page rend elle-même
  la coquille plein écran (AtelierShell : bandeau + header transparent + béton). Ce layout
  est donc un simple passe-plat : aucun chrome global à ce niveau.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

{@render children()}
