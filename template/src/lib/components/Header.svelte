<script lang="ts">
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
	<div class="flex items-center gap-3">
		<!-- Burger menu mobile -->
		{#if onMenuToggle}
			<button
				onclick={onMenuToggle}
				class="burger-btn flex items-center justify-center w-8 h-8 rounded hover:bg-surface cursor-pointer"
				aria-label="Menu"
			>
				<span class="material-symbols-outlined text-[22px] text-text">menu</span>
			</button>
		{/if}
		{#if pageTitle}
			<span class="header-title font-semibold text-text">{pageTitle}</span>
		{/if}
	</div>

	<div class="flex items-center gap-4">
		{#if $pageSubtitle}
			<span class="header-subtitle text-text-muted">{$pageSubtitle}</span>
		{/if}
		<span class="text-sm text-text-muted hidden sm:inline">{user?.email}</span>
	</div>

</header>

<style>
	.burger-btn {
		display: none;
	}

	.header-title {
		font-size: 0.875rem;
	}

	.header-subtitle {
		font-size: 0.8125rem;
	}

	@media (max-width: 767px) {
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
