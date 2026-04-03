<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';

	let { user, sidebarCollapsed = false }: { user: User | null; sidebarCollapsed?: boolean } = $props();

	const supabase = createSupabaseBrowserClient();

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<header
	class="fixed top-0 right-0 h-(--header-height) bg-white border-b border-border flex items-center justify-between px-6 z-20 transition-all duration-200"
	style="left: {sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div></div>

	<div class="flex items-center gap-4">
		<span class="text-sm text-text-muted">{user?.email}</span>
		<button
			onclick={signOut}
			class="text-sm text-text-muted hover:text-danger transition-colors cursor-pointer"
		>
			Déconnexion
		</button>
	</div>
</header>
