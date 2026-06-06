<!--
  Shell de l'outil « Découpe Films ». Coquille propre et sobre (ton atelier) :
  - PortailHeader réutilisé (logo = retour portail, avatar, déconnexion) → cohérence portail.
  - Barre outil sticky : identité « Découpe Films » + navigation interne (Chantiers / Base produit).
  - <Toast /> pour les retours des form actions (succès / erreur).
  Layout structurel en <style> scoped (doctrine styling S180). Tokens projet uniquement.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import PortailHeader from '$lib/components/portail/PortailHeader.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import '$lib/styles/workspace.css';
	import '$lib/styles/decoupe.css';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const nav = [
		{ href: '/decoupe', label: 'Chantiers', exact: true },
		{ href: '/decoupe/produits', label: 'Base produit', exact: false }
	];

	function isActive(item: { href: string; exact: boolean }): boolean {
		return item.exact ? page.url.pathname === item.href : page.url.pathname.startsWith(item.href);
	}
</script>

<div class="decoupe-shell">
	<PortailHeader user={data.user} />

	<div class="decoupe-toolbar">
		<div class="toolbar-inner">
			<div class="tool-id">
				<span class="tool-icon" aria-hidden="true">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="6" cy="6" r="3" />
						<path d="M8.12 8.12 12 12" />
						<path d="M20 4 8.12 15.88" />
						<circle cx="6" cy="18" r="3" />
						<path d="M14.8 14.8 20 20" />
					</svg>
				</span>
				<span class="tool-name">Découpe Films</span>
			</div>

			<nav class="tool-nav" aria-label="Sections Découpe Films">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="tool-nav-link"
						class:active={isActive(item)}
						aria-current={isActive(item) ? 'page' : undefined}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	</div>

	<main class="decoupe-main">
		{@render children()}
	</main>
</div>

<Toast />

<style>
	.decoupe-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--color-surface-alt);
	}

	.decoupe-toolbar {
		position: sticky;
		top: 0;
		z-index: 15;
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		backdrop-filter: saturate(180%) blur(8px);
		-webkit-backdrop-filter: saturate(180%) blur(8px);
		border-bottom: 1px solid var(--color-border);
	}
	.toolbar-inner {
		width: 100%;
		padding: 0 24px;
		height: 56px;
		display: flex;
		align-items: center;
		gap: 28px;
	}

	.tool-id {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		flex: 0 0 auto;
	}
	.tool-icon {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-lg);
		display: grid;
		place-items: center;
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.tool-name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text);
	}

	.tool-nav {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	.tool-nav-link {
		position: relative;
		display: inline-flex;
		align-items: center;
		height: 56px;
		padding: 0 4px;
		margin: 0 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color 200ms var(--ease-out-expo);
	}
	.tool-nav-link::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		border-radius: 2px 2px 0 0;
		background: var(--color-primary);
		transform: scaleX(0);
		transition: transform 220ms var(--ease-out-expo);
	}
	.tool-nav-link:hover {
		color: var(--color-text-body);
	}
	.tool-nav-link.active {
		color: var(--color-primary);
		font-weight: 600;
	}
	.tool-nav-link.active::after {
		transform: scaleX(1);
	}

	.decoupe-main {
		flex: 1;
		width: 100%;
		padding: 28px 24px 64px;
	}

	@media (max-width: 640px) {
		.toolbar-inner {
			padding: 0 16px;
			gap: 16px;
		}
		.decoupe-main {
			padding: 20px 16px 88px;
		}
		.tool-nav-link {
			margin: 0 4px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tool-nav-link,
		.tool-nav-link::after {
			transition: none;
		}
	}
</style>
