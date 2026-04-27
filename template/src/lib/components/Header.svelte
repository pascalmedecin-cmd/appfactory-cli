<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { User } from '@supabase/supabase-js';

	let { user, sidebarCollapsed = false, onMenuToggle, pageTitle = '' }: { user: User | null; sidebarCollapsed?: boolean; onMenuToggle?: () => void; pageTitle?: string } = $props();

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
		align-items: baseline;
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
