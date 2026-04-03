<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/state';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);

	// Fermer le menu mobile sur navigation
	$effect(() => {
		page.url.pathname;
		mobileMenuOpen = false;
	});
</script>

<!-- Mobile overlay -->
{#if mobileMenuOpen}
	<button
		class="fixed inset-0 bg-black/40 z-40 md:hidden cursor-default"
		onclick={() => mobileMenuOpen = false}
		onkeydown={(e) => e.key === 'Escape' && (mobileMenuOpen = false)}
		tabindex="-1"
		aria-label="Fermer le menu"
	></button>
{/if}

<!-- Sidebar desktop -->
<div class="hidden md:block">
	<Sidebar bind:collapsed={sidebarCollapsed} currentPath={page.url.pathname} />
</div>

<!-- Sidebar mobile (slide-in) -->
<div class="md:hidden fixed top-0 left-0 z-50 transition-transform duration-200 {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}">
	<Sidebar collapsed={false} currentPath={page.url.pathname} />
</div>

<Header user={data.user} {sidebarCollapsed} onMenuToggle={() => mobileMenuOpen = !mobileMenuOpen} />

<main
	class="pt-(--header-height) min-h-screen bg-surface transition-all duration-200"
	style="padding-left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="p-4 md:p-6">
		{@render children()}
	</div>
</main>

<style>
	@media (max-width: 767px) {
		main {
			padding-left: 0 !important;
		}
	}
</style>
