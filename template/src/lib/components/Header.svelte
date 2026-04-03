<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';

	let { user, sidebarCollapsed = false, onMenuToggle }: { user: User | null; sidebarCollapsed?: boolean; onMenuToggle?: () => void } = $props();

	const supabase = createSupabaseBrowserClient();

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<header
	class="fixed top-0 right-0 h-(--header-height) bg-white border-b border-border flex items-center justify-between px-4 md:px-6 z-20 transition-all duration-200"
	style="left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="flex items-center gap-2">
		<!-- Burger menu mobile -->
		{#if onMenuToggle}
			<button
				onclick={onMenuToggle}
				class="md:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-surface cursor-pointer"
				aria-label="Menu"
			>
				<span class="material-symbols-outlined text-[22px] text-text">menu</span>
			</button>
		{/if}
	</div>

	<div class="flex items-center gap-4">
		<span class="text-sm text-text-muted hidden sm:inline">{user?.email}</span>
		<button
			onclick={signOut}
			class="text-sm text-text-muted hover:text-danger transition-colors cursor-pointer"
		>
			Deconnexion
		</button>
	</div>
</header>

<style>
	@media (max-width: 767px) {
		header {
			left: 0 !important;
		}
	}
</style>
