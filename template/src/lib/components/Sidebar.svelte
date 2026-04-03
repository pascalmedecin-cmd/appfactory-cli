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
			<svg viewBox="130 640 1230 230" class="h-7 w-auto" aria-label="FilmPro">
				<path fill="#FFFFFF" d="M193.419,849.762h-38.175V662.449h119.879v35.163h-81.705v43.793h73.718v34.115h-73.718V849.762z"/>
				<path fill="#FFFFFF" d="M329.33,849.762h-37.651V714.824h37.651V849.762z"/>
				<path fill="#FFFFFF" d="M310.439,696.827c-6.233,0-11.698-2.017-16.244-5.994c-4.624-4.047-6.968-9.442-6.968-16.039c0-6.598,2.344-11.994,6.968-16.039c4.546-3.978,10.011-5.994,16.244-5.994s11.698,2.017,16.244,5.994c4.624,4.045,6.968,9.441,6.968,16.039c0,6.597-2.344,11.992-6.968,16.039C322.137,694.811,316.672,696.827,310.439,696.827z"/>
				<path fill="#FFFFFF" d="M388.383,849.762h-37.651v-192.55h37.651V849.762z"/>
				<path fill="#FFFFFF" d="M627.866,849.762h-37.65v-77.943c0-7.927-2.125-14.379-6.315-19.177c-4.18-4.781-10.24-7.105-18.527-7.105c-5.306,0-10.113,1.171-14.286,3.481c-4.163,2.303-7.481,5.476-9.861,9.429c-2.373,3.941-3.576,8.528-3.576,13.634v77.682H500v-77.943c0-7.927-2.125-14.379-6.315-19.177c-4.18-4.781-10.24-7.105-18.527-7.105c-5.306,0-10.113,1.171-14.286,3.481c-4.163,2.303-7.481,5.476-9.861,9.429c-2.373,3.941-3.576,8.528-3.576,13.634v77.682h-37.651V714.824h37.651v13.59c2.631-3.028,5.519-5.658,8.631-7.854c4.606-3.252,9.602-5.703,14.847-7.287c5.232-1.576,10.581-2.376,15.898-2.376c10.64,0,19.77,2.397,27.137,7.125c6.303,4.048,11.04,9.229,14.122,15.435c5.826-7.831,12.814-13.509,20.81-16.901c8.85-3.755,18.055-5.658,27.361-5.658c12.646,0,22.885,2.535,30.434,7.533c7.549,5.004,13.04,11.517,16.322,19.358c3.231,7.719,4.869,15.908,4.869,24.341V849.762z"/>
				<path fill="#FFFFFF" d="M676.095,847.762V664.449h68.873c13.18,0,24.878,2.292,35.091,6.875c10.214,4.582,18.222,11.194,24.027,19.837c5.805,8.642,8.707,19.03,8.707,31.163c0,12.396-2.684,22.871-8.052,31.425c-5.369,8.556-13.16,15.058-23.373,19.51s-22.609,6.678-37.186,6.678H710.27v67.825H676.095z M710.27,750.999h33.781c10.911,0,19.399-2.269,25.468-6.809c6.066-4.538,9.101-11.608,9.101-21.212c0-9.514-3.122-16.715-9.362-21.604c-6.242-4.888-14.557-7.333-24.943-7.333H710.27V750.999z"/>
				<path fill="#FFFFFF" d="M827.196,847.762V716.824h33.65v17.153c4.538-7.681,10.233-13.137,17.088-16.367c6.852-3.229,14.249-4.845,22.193-4.845c2.793,0,5.368,0.131,7.726,0.393c2.356,0.262,4.626,0.655,6.809,1.179l-4.189,34.567c-2.707-0.872-5.522-1.571-8.446-2.095c-2.925-0.524-5.826-0.786-8.707-0.786c-9.428,0-17.197,2.838-23.307,8.511c-6.111,5.676-9.166,13.532-9.166,23.569v69.658H827.196z"/>
				<path fill="#FFFFFF" d="M982.619,851.689c-13.968,0-26.341-3.165-37.121-9.492c-10.781-6.328-19.248-14.751-25.401-25.271c-6.154-10.518-9.231-22.062-9.231-34.633c0-9.251,1.768-18.069,5.303-26.449s8.511-15.777,14.927-22.193s13.988-11.478,22.718-15.189c8.728-3.709,18.331-5.564,28.807-5.564c13.879,0,26.208,3.143,36.989,9.428c10.78,6.285,19.248,14.688,25.402,25.205c6.154,10.521,9.23,22.108,9.23,34.764c0,9.254-1.768,18.049-5.303,26.384c-3.535,8.337-8.49,15.735-14.861,22.194c-6.373,6.461-13.924,11.545-22.652,15.254C1002.695,849.834,993.093,851.689,982.619,851.689z M982.488,822.36c7.418,0,14.01-1.637,19.771-4.91c5.761-3.273,10.299-7.899,13.617-13.88c3.316-5.979,4.976-13.071,4.976-21.277c0-8.204-1.637-15.319-4.91-21.343c-3.273-6.022-7.813-10.648-13.617-13.879c-5.807-3.229-12.419-4.845-19.837-4.845c-7.333,0-13.902,1.616-19.706,4.845c-5.807,3.23-10.345,7.856-13.618,13.879c-3.273,6.023-4.91,13.139-4.91,21.343c0,8.206,1.657,15.299,4.976,21.277c3.316,5.98,7.856,10.606,13.618,13.88C968.608,820.724,975.155,822.36,982.488,822.36z"/>
				<g opacity="0.24"><rect x="1223.987" y="647.388" fill="#FFFFFF" width="120" height="120"/></g>
				<g opacity="0.62"><rect x="1182.781" y="687.575" fill="#FFFFFF" width="120" height="120"/></g>
				<rect x="1141.575" y="727.762" fill="#FFFFFF" width="120" height="120"/>
			</svg>
		{:else}
			<span class="font-bold text-lg">F</span>
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
			class="flex items-center gap-3 px-4 py-2.5 text-sm text-white/40 hover:bg-white/10 hover:text-red-400 transition-colors w-full cursor-pointer"
			title={collapsed ? 'Déconnexion' : undefined}
		>
			<span class="material-symbols-outlined text-[20px] shrink-0">logout</span>
			{#if !collapsed}
				<span>Déconnexion</span>
			{/if}
		</button>
	</div>
</aside>
