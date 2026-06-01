<!--
  Layout du portail FilmPro : header persistant (sans sidebar CRM) + fond éditorial.
  Reçoit `user` du +layout.server.ts racine. La page fournit <main> + <footer>.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import PortailHeader from '$lib/components/portail/PortailHeader.svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<div class="portail-shell">
	<PortailHeader user={data.user} />
	{@render children()}
</div>

<style>
	.portail-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: radial-gradient(
			1200px 600px at 50% -10%,
			var(--color-surface) 0%,
			var(--color-surface-alt) 55%,
			var(--color-surface-alt) 100%
		);
	}
</style>
