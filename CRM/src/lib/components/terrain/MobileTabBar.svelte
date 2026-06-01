<script lang="ts">
	/**
	 * MobileTabBar — navigation racine terrain (DESIGN.md § 4.2).
	 * EXACTEMENT 2 onglets (À faire / Rechercher). Aucun burger, aucun 3e onglet
	 * (anti-pattern § 6.2/6.3). Barre fixe bas, cible tactile pleine cellule ≥ 44px.
	 */
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';

	const TABS = [
		{ href: '/terrain', label: 'À faire', icon: 'checklist', match: (p: string) => p === '/terrain' },
		{
			href: '/terrain/rechercher',
			label: 'Rechercher',
			icon: 'search',
			match: (p: string) => p.startsWith('/terrain/rechercher'),
		},
	] as const;

	const current = $derived($page.url.pathname);
</script>

<nav class="tabbar" aria-label="Navigation terrain">
	{#each TABS as tab (tab.href)}
		{@const active = tab.match(current)}
		<a
			href={tab.href}
			class="cell"
			class:active
			aria-current={active ? 'page' : undefined}
		>
			<span class="indicator" aria-hidden="true"></span>
			<Icon name={tab.icon} size={24} strokeWidth={active ? 2.25 : 2} />
			<span class="label">{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: calc(var(--mobile-tabbar-h) + var(--mobile-safe-bottom));
		padding-bottom: var(--mobile-safe-bottom);
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}

	.cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 44px;
		color: var(--color-text-muted);
		text-decoration: none;
	}
	.cell.active {
		color: var(--color-primary);
	}
	.cell:active {
		background: var(--color-surface-alt);
	}

	.indicator {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 32px;
		height: 2px;
		border-radius: 0 0 2px 2px;
		background: transparent;
	}
	.cell.active .indicator {
		background: var(--color-primary);
	}

	.label {
		font-size: 13px;
		font-weight: 600;
		line-height: 1;
	}
</style>
