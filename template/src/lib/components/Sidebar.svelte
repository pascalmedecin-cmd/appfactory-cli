<script lang="ts">
	import { config } from '$lib/config';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { collapsed = $bindable(false), currentPath = '' }: { collapsed?: boolean; currentPath?: string } = $props();

	const navItems = config.navigation.primary;
	const secondaryItems = config.navigation.secondary;
	const supabase = createSupabaseBrowserClient();

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<aside
	class="fixed top-0 left-0 h-full bg-primary-dark text-white flex flex-col transition-all duration-200 z-30"
	style="width: {collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="flex items-center px-3 py-4 shrink-0 overflow-hidden">
		{#if !collapsed}
			{#if config.branding.logoWhite}
				<img src="/{config.branding.logoWhite}" alt={config.app.name} class="h-7 w-auto" />
			{:else if config.branding.logo}
				<img src="/{config.branding.logo}" alt={config.app.name} class="h-7 w-auto" />
			{:else}
				<span class="font-bold text-lg truncate">{config.app.name}</span>
			{/if}
		{:else}
			<span class="font-bold text-lg">{config.app.name[0]}</span>
		{/if}
	</div>

	<div class="border-b border-white/10 mx-3 mb-3"></div>

	<nav class="flex-1 py-0 overflow-y-auto">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
					{isActive(item.href) ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}"
				title={collapsed ? item.label : undefined}
			>
				<span class="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="border-t border-white/10 py-2">
		{#each secondaryItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
					{isActive(item.href) ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}"
				title={collapsed ? item.label : undefined}
			>
				<span class="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}

		<button
			onclick={() => collapsed = !collapsed}
			class="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full cursor-pointer"
		>
			<span class="material-symbols-outlined text-[20px] shrink-0">
				{collapsed ? 'chevron_right' : 'chevron_left'}
			</span>
			{#if !collapsed}
				<span>Réduire</span>
			{/if}
		</button>

		<button
			onclick={signOut}
			class="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-red-400 transition-colors w-full cursor-pointer"
			title={collapsed ? 'Déconnexion' : undefined}
		>
			<span class="material-symbols-outlined text-[20px] shrink-0">logout</span>
			{#if !collapsed}
				<span>Déconnexion</span>
			{/if}
		</button>
	</div>
</aside>
