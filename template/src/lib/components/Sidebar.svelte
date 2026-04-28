<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { config } from '$lib/config';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { collapsed = $bindable(false), currentPath = '', unreadIntelligence = 0 }: { collapsed?: boolean; currentPath?: string; unreadIntelligence?: number } = $props();

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

	<nav class="flex-1 px-3 py-1 overflow-y-auto space-y-0.5 md:space-y-1.5">
		{#each navItems as item}
			{@const badge = item.href === '/veille' && unreadIntelligence > 0 ? unreadIntelligence : 0}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2 min-h-11 md:min-h-0 text-sm rounded-lg transition-colors relative
					{isActive(item.href) ? 'bg-white/15 text-white font-medium shadow-xs' : 'text-white/65 hover:bg-white/8 hover:text-white'}"
				title={collapsed ? item.label + (badge > 0 ? ` (${badge} non lus)` : '') : undefined}
			>
				<span class="shrink-0 relative">
					<Icon name={item.icon} size={20} />
					{#if collapsed && badge > 0}
						<span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-primary-dark text-[10px] font-bold flex items-center justify-center">{badge}</span>
					{/if}
				</span>
				{#if !collapsed}
					<span class="flex-1">{item.label}</span>
					{#if badge > 0}
						<span class="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-primary-dark text-xs font-bold flex items-center justify-center">{badge}</span>
					{/if}
				{/if}
			</a>
		{/each}
	</nav>

	<div class="border-t border-white/8 px-3 py-2 space-y-0.5">
		{#each secondaryItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2 min-h-11 md:min-h-0 text-sm rounded-lg transition-colors
					{isActive(item.href) ? 'bg-white/15 text-white font-medium' : 'text-white/65 hover:bg-white/8 hover:text-white'}"
				title={collapsed ? item.label : undefined}
			>
				<Icon name={item.icon} class="shrink-0" />
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}

		<button
			onclick={() => collapsed = !collapsed}
			class="flex items-center gap-3 px-3 py-2 min-h-11 md:min-h-0 text-sm rounded-lg text-white/65 hover:bg-white/8 hover:text-white transition-colors w-full cursor-pointer"
		>
			<Icon name={collapsed ? 'chevron_right' : 'chevron_left'} class="shrink-0" />
			{#if !collapsed}
				<span>Réduire</span>
			{/if}
		</button>

		<button
			onclick={signOut}
			class="flex items-center gap-3 px-3 py-2 min-h-11 md:min-h-0 text-sm rounded-lg text-white/50 hover:bg-white/8 hover:text-danger transition-colors w-full cursor-pointer"
			title={collapsed ? 'Déconnexion' : undefined}
		>
			<Icon name="logout" class="shrink-0" />
			{#if !collapsed}
				<span>Déconnexion</span>
			{/if}
		</button>
	</div>
</aside>
