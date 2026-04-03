<script lang="ts">
	let { collapsed = $bindable(false), currentPath = '' }: { collapsed?: boolean; currentPath?: string } = $props();

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: 'dashboard' },
		{ href: '/contacts', label: 'Contacts', icon: 'contacts' },
		{ href: '/entreprises', label: 'Entreprises', icon: 'business' },
		{ href: '/pipeline', label: 'Pipeline', icon: 'filter_list' },
		{ href: '/prospection', label: 'Prospection', icon: 'search' },
		{ href: '/signaux', label: 'Signaux', icon: 'notifications' },
	];

	const secondaryItems = [
		{ href: '/aide', label: 'Aide', icon: 'help_outline' },
	];

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<aside
	class="fixed top-0 left-0 h-full bg-primary text-white flex flex-col transition-all duration-200 z-30"
	style="width: {collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}"
>
	<div class="h-(--header-height) flex items-center px-4 border-b border-white/10 shrink-0">
		{#if !collapsed}
			<span class="font-bold text-lg tracking-tight">FilmPro</span>
		{:else}
			<span class="font-bold text-lg">F</span>
		{/if}
	</div>

	<nav class="flex-1 py-2 overflow-y-auto">
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
	</div>
</aside>
