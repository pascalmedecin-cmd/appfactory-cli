<script lang="ts">
	/**
	 * Layout du shell terrain V3. Frame plein écran + MobileTabBar fixe en bas.
	 * Aucune sidebar/header desktop (isolation totale du CRM, AC-001/AC-013).
	 */
	import MobileTabBar from '$lib/components/terrain/MobileTabBar.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="terrain-root">
	{@render children()}
	<MobileTabBar />
</div>

<style>
	.terrain-root {
		min-height: 100dvh;
		background: var(--color-surface-alt);
		/* Police de texte unique terrain (DESIGN.md § 2). */
		font-family: var(--font-sans);
		color: var(--color-text-body);
	}
</style>
