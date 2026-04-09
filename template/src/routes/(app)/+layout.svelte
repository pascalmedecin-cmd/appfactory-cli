<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { config } from '$lib/config';
	import { page } from '$app/state';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);

	const pageTitle = $derived(() => {
		const path = page.url.pathname;
		const all = [...config.navigation.primary, ...config.navigation.secondary];
		const match = all.find(item => item.href === '/' ? path === '/' : path.startsWith(item.href));
		return match?.label ?? '';
	});

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
<div class="sidebar-desktop">
	<Sidebar bind:collapsed={sidebarCollapsed} currentPath={page.url.pathname} />
</div>

<!-- Sidebar mobile (slide-in) -->
<div class="sidebar-mobile {mobileMenuOpen ? 'open' : ''}">
	<Sidebar collapsed={false} currentPath={page.url.pathname} />
</div>

<Header user={data.user} {sidebarCollapsed} onMenuToggle={() => mobileMenuOpen = !mobileMenuOpen} pageTitle={pageTitle()} />

<main
	class="pt-(--header-height) min-h-screen bg-surface transition-all duration-200"
	style="padding-left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="p-4 md:p-6">
		{@render children()}
	</div>
</main>

<Toast />

<style>
	.sidebar-desktop {
		display: block;
	}

	.sidebar-mobile {
		display: none;
	}

	@media (max-width: 767px) {
		main {
			padding-left: 0 !important;
		}

		.sidebar-desktop {
			display: none !important;
		}

		.sidebar-mobile {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
		}

		.sidebar-mobile.open {
			transform: translateX(0);
		}
	}
</style>
