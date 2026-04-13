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

	// Fermer le menu mobile sur navigation (délai pour voir le highlight)
	let prevPath = $state(page.url.pathname);
	$effect(() => {
		const currentPath = page.url.pathname;
		if (currentPath !== prevPath) {
			prevPath = currentPath;
			setTimeout(() => { mobileMenuOpen = false; }, 150);
		}
	});
</script>

<!-- Mobile overlay -->
{#if mobileMenuOpen}
	<button
		class="mobile-overlay"
		onclick={() => mobileMenuOpen = false}
		onkeydown={(e) => e.key === 'Escape' && (mobileMenuOpen = false)}
		tabindex="-1"
		aria-label="Fermer le menu"
	></button>
{/if}

<!-- Sidebar unique : desktop = static, mobile = slide-in -->
<div class="sidebar-wrapper" class:open={mobileMenuOpen}>
	<Sidebar bind:collapsed={sidebarCollapsed} currentPath={page.url.pathname} unreadIntelligence={data.unreadIntelligence} />
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
	/* Desktop : sidebar visible en place */
	.sidebar-wrapper {
		display: contents;
	}

	.mobile-overlay {
		display: none;
	}

	/* Mobile : sidebar masquée, slide-in au toggle */
	@media (max-width: 1023px) {
		main {
			padding-left: 0 !important;
		}

		.sidebar-wrapper {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			width: var(--sidebar-width);
			height: 100%;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
		}

		.sidebar-wrapper.open {
			transform: translateX(0);
		}

		/* Le wrapper gère le fixed+transform, l'aside devient statique */
		.sidebar-wrapper :global(aside) {
			position: static !important;
			z-index: auto !important;
			width: 100% !important;
		}

		.mobile-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 40;
			cursor: default;
			border: none;
			padding: 0;
		}
	}
</style>
