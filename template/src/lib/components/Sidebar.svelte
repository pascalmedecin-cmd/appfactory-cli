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
	<div class="flex items-center px-4 py-5 shrink-0 overflow-hidden">
		{#if !collapsed}
			{#if config.branding.logoWhite}
				<img src="/{config.branding.logoWhite}" alt={config.app.name} class="h-7 w-auto" />
			{:else if config.branding.logo}
				<img src="/{config.branding.logo}" alt={config.app.name} class="h-7 w-auto" />
			{:else}
				<span class="font-bold text-lg tracking-tight truncate">{config.app.name}</span>
			{/if}
		{:else}
			<span class="font-bold text-lg">{config.app.name[0]}</span>
		{/if}
	</div>

	<nav class="flex-1 px-3 py-1 overflow-y-auto space-y-0.5">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
					{isActive(item.href) ? 'bg-white/15 text-white font-medium shadow-xs' : 'text-white/65 hover:bg-white/8 hover:text-white'}"
				title={collapsed ? item.label : undefined}
			>
				<span class="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="border-t border-white/8 px-3 py-2 space-y-0.5">
		{#each secondaryItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
					{isActive(item.href) ? 'bg-white/15 text-white font-medium' : 'text-white/65 hover:bg-white/8 hover:text-white'}"
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
			class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-white/65 hover:bg-white/8 hover:text-white transition-colors w-full cursor-pointer"
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
			class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-white/50 hover:bg-white/8 hover:text-danger transition-colors w-full cursor-pointer"
			title={collapsed ? 'Déconnexion' : undefined}
		>
			<span class="material-symbols-outlined text-[20px] shrink-0">logout</span>
			{#if !collapsed}
				<span>Déconnexion</span>
			{/if}
		</button>
	</div>
</aside>
