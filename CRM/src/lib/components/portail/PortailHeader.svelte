<!--
  PortailHeader : enveloppe haute persistante du portail FilmPro.
  - Logo cliquable = retour home (/). Sticky + verre dépoli (backdrop-filter).
  - Avatar à initiales (dérivées de l'email) + lien Déconnexion.
  Layout structurel (sticky + backdrop + max-width) en <style> scoped (doctrine S180).
-->
<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import FilmProLogo from './FilmProLogo.svelte';
	import type { User } from '@supabase/supabase-js';

	let { user }: { user: User | null } = $props();

	const supabase = createSupabaseBrowserClient();

	// Initiales dérivées de l'email (avant @, séparé par . ou -). 2 lettres max.
	const initials = $derived.by(() => {
		const local = user?.email?.split('@')[0] ?? '';
		const parts = local.split(/[.\-_]+/).filter(Boolean);
		const letters = (parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)) || '?';
		return letters.toUpperCase();
	});

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<header class="portail-header">
	<div class="header-inner">
		<a href="/" class="logo-link" aria-label="Accueil portail FilmPro">
			<FilmProLogo class="logo" />
		</a>

		<div class="header-right">
			<span class="avatar" title={user?.email ?? undefined} aria-hidden="true">{initials}</span>
			<button type="button" class="logout" onclick={signOut}>Déconnexion</button>
		</div>
	</div>
</header>

<style>
	.portail-header {
		position: sticky;
		top: 0;
		z-index: 20;
		height: 72px;
		background: color-mix(in srgb, var(--color-surface) 85%, transparent);
		backdrop-filter: saturate(180%) blur(8px);
		-webkit-backdrop-filter: saturate(180%) blur(8px);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
	}

	.header-inner {
		width: 100%;
		max-width: 1120px;
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.logo-link {
		display: inline-flex;
		min-width: 0; /* le logo se compresse avant de pousser le groupe droit hors écran */
		flex: 0 1 auto;
		border-radius: 4px;
	}
	.logo-link:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 3px;
	}

	.logo-link :global(.logo) {
		height: 44px;
		max-width: 100%;
		width: auto;
		display: block;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 0 0 auto; /* jamais clippé : déconnexion toujours visible */
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.02em;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.logout {
		font-size: 13.5px;
		color: var(--color-text-muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		transition: color var(--dur, 250ms) var(--ease-out-expo);
	}
	.logout:hover {
		color: var(--color-text-body);
	}
	.logout:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 3px;
		border-radius: 4px;
	}

	@media (prefers-reduced-motion: reduce) {
		.logout {
			transition: none;
		}
	}

	/* Mobile : le wordmark (ratio ~5.7:1) déborde à 44px de haut. On le réduit et
	   on resserre le header pour garder « Déconnexion » dans l'écran. */
	@media (max-width: 640px) {
		.portail-header {
			height: 60px;
		}
		.header-inner {
			padding: 0 16px;
		}
		.logo-link :global(.logo) {
			height: 32px;
		}
		.header-right {
			gap: 12px;
		}
	}

	/* Très petit écran (iPhone SE) : avatar décoratif masqué pour gagner la place. */
	@media (max-width: 380px) {
		.logo-link :global(.logo) {
			height: 28px;
		}
		.avatar {
			display: none;
		}
	}
</style>
