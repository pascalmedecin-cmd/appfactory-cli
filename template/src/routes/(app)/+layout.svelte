<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/state';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
	let sidebarCollapsed = $state(false);
</script>

<Sidebar bind:collapsed={sidebarCollapsed} currentPath={page.url.pathname} />
<Header user={data.user} {sidebarCollapsed} />

<main
	class="pt-(--header-height) min-h-screen bg-surface transition-all duration-200"
	style="padding-left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="p-6">
		{@render children()}
	</div>
</main>
