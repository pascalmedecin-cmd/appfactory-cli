<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { User } from '@supabase/supabase-js';

	let { user, sidebarCollapsed = false, onMenuToggle, pageTitle = '', marque = 'filmpro' }: { user: User | null; sidebarCollapsed?: boolean; onMenuToggle?: () => void; pageTitle?: string; marque?: 'filmpro' | 'led' } = $props();

	const marqueLabel = $derived(marque === 'led' ? 'LED Studio' : 'FilmPro');

	const supabase = createSupabaseBrowserClient();

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<header
	class="fixed top-0 right-0 h-(--header-height) bg-white/80 backdrop-blur-sm border-b border-border/80 flex items-center justify-between px-4 md:px-6 z-20 transition-all duration-200"
	style="left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="header-left">
		<!-- Burger menu mobile -->
		{#if onMenuToggle}
			<button
				onclick={onMenuToggle}
				class="burger-btn flex items-center justify-center w-11 h-11 rounded hover:bg-surface cursor-pointer"
				aria-label="Menu"
			>
				<Icon name="menu" size={22} class="text-text" />
			</button>
		{/if}
		{#if pageTitle}
			<h1 class="header-title font-semibold text-text">{pageTitle}</h1>
		{/if}
		{#if $pageSubtitle}
			<span class="header-subtitle text-text-muted">{$pageSubtitle}</span>
		{/if}
	</div>

	<div class="header-right">
		<!-- Atelier 209 Run 2 : pastille d'environnement actif (teintée par la marque). -->
		<span class="marque-pill" aria-label="Environnement actif : {marqueLabel}">
			<span class="marque-dot" aria-hidden="true"></span>{marqueLabel}
		</span>
		<span class="header-email text-text-muted hidden sm:inline">{user?.email}</span>
	</div>

</header>

<style>
	.header-left {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* Atelier 209 Run 2 : filet d'accent en tête du header, teinté par la marque active
	   (bleu FilmPro / magenta LED via --color-primary). Repère d'environnement discret. */
	header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 2px;
		background: var(--color-primary);
		opacity: 0.9;
	}

	.marque-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 4px 11px 4px 9px;
		border-radius: var(--radius-full);
		background: var(--color-primary-light);
		color: var(--color-primary-hover);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: -0.005em;
		white-space: nowrap;
	}
	.marque-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--color-primary);
	}

	.burger-btn {
		display: none;
	}

	.header-title {
		font-size: 1.375rem;
		line-height: 1;
		letter-spacing: -0.01em;
	}

	.header-subtitle {
		font-size: 0.8125rem;
		line-height: 1;
	}

	.header-email {
		font-size: 0.8125rem;
		line-height: 1;
	}

	@media (max-width: 1023px) {
		header {
			left: 0 !important;
		}

		.burger-btn {
			display: flex;
		}

		.header-title {
			font-size: 1.125rem;
		}

		.header-subtitle {
			font-size: 0.9375rem;
		}
	}
</style>
