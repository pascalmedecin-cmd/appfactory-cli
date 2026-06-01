<script lang="ts">
	/**
	 * MobileShell — conteneur racine d'un écran terrain (DESIGN.md § 4.1).
	 * Colonne flex à hauteur fixe (viewport moins tabbar) : header sticky en haut,
	 * `main` scrollable au milieu, `footer` optionnel collé en bas (CTA dominant)
	 * SANS position:sticky (flex column = pattern robuste, cf. watch sticky-footer).
	 */
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		/** Affiche le bouton retour (chevron) à gauche du titre. */
		back?: boolean;
		/** Destination du retour. Sans href → history.back(). */
		backHref?: string | null;
		/** Compteur discret affiché sous le titre (ex. « 4 relances »). */
		subtitle?: string | null;
		children: Snippet;
		footer?: Snippet;
	};

	let { title, back = false, backHref = null, subtitle = null, children, footer }: Props = $props();

	let scrolled = $state(false);

	function onScroll(e: Event) {
		scrolled = (e.currentTarget as HTMLElement).scrollTop > 4;
	}

	function handleBack() {
		if (backHref) goto(backHref);
		else if (typeof history !== 'undefined') history.back();
	}
</script>

<section class="shell">
	<header class="shell-header" class:scrolled>
		{#if back}
			<button type="button" class="back-btn" onclick={handleBack} aria-label="Retour">
				<Icon name="chevron_left" size={24} />
			</button>
		{/if}
		<div class="titles">
			<h1 class="text-[22px] leading-7 font-bold text-[var(--color-text)] truncate">{title}</h1>
			{#if subtitle}
				<p class="text-base text-[var(--color-text-muted)] leading-5">{subtitle}</p>
			{/if}
		</div>
	</header>

	<main class="shell-main" onscroll={onScroll}>
		{@render children()}
	</main>

	{#if footer}
		<footer class="shell-footer">
			{@render footer()}
		</footer>
	{/if}
</section>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		/* Hauteur = viewport dynamique moins la tabbar fixe (+ encoche). */
		height: calc(100dvh - var(--mobile-tabbar-h) - var(--mobile-safe-bottom));
		background: var(--color-surface-alt);
	}

	.shell-header {
		flex: 0 0 auto;
		position: sticky;
		top: 0;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 12px var(--mobile-gutter);
		background: var(--color-surface);
		border-bottom: 1px solid transparent;
		transition: box-shadow 160ms var(--ease-out-expo), border-color 160ms var(--ease-out-expo);
	}
	.shell-header.scrolled {
		border-bottom-color: var(--color-border);
		box-shadow: var(--shadow-sm);
	}

	.titles {
		min-width: 0;
		flex: 1 1 auto;
	}

	.back-btn {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-left: -8px;
		border-radius: var(--radius-md);
		color: var(--color-text);
		background: transparent;
	}
	.back-btn:active {
		background: var(--color-surface-alt);
	}

	.shell-main {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: var(--mobile-gutter);
	}

	.shell-footer {
		flex: 0 0 auto;
		padding: 12px var(--mobile-gutter);
		padding-bottom: calc(12px + var(--mobile-safe-bottom));
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}
</style>
