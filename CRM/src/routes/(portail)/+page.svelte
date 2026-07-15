<!--
  Portail Atelier 209 - « Par où commencer ? » (direction « Heure bleue », validée Pascal
  2026-07-15). Bandeau photo + header transparent (déconnexion + avatar) via AtelierShell,
  puis les outils posés sur le béton, sans cadre (survol = soulève + éclaire). Le CRM et
  Découpe Films restent inchangés une fois ouverts.
-->
<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import AtelierShell from '$lib/components/atelier209/AtelierShell.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const decoupeActif = $derived(data.featureFlags?.ffDecoupe === true);

	// Initiales dérivées de l'email (avant @, séparé par . - _). 2 lettres max.
	const initials = $derived.by(() => {
		const local = data.user?.email?.split('@')[0] ?? '';
		const parts = local.split(/[.\-_]+/).filter(Boolean);
		return ((parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)) || '?').toUpperCase();
	});

	const supabase = createSupabaseBrowserClient();
	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>Atelier 209</title>
</svelte:head>

<AtelierShell>
	{#snippet header()}
		<div class="header-right">
			<button type="button" class="logout" onclick={signOut}>
				<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
				Déconnexion
			</button>
			<span class="avatar" title={data.user?.email ?? undefined} aria-hidden="true">{initials}</span>
		</div>
	{/snippet}

	<span class="eyebrow reveal" style="--d:.02s">Espace de travail</span>
	<div class="head">
		<h1 class="display portal-title reveal" style="--d:.08s">Par où commencer&nbsp;?</h1>
		<p class="subtitle reveal" style="--d:.14s">Vos outils, au même endroit.</p>
	</div>

	<div class="tools">
		<!-- `reveal` sur la cellule (non-interactive) et non sur `.tool` : sinon le fill:both de
		     l'animation figerait `transform:none` et écraserait le lift au survol de la carte. -->
		<div class="tool-cell reveal" style="--d:.20s">
			<a
				href="/crm"
				class="tool"
				aria-label="Ouvrir le CRM : prospection, pipeline, signaux, veille"
			>
				<span class="tool-icon" aria-hidden="true">
					<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>
				</span>
				<h3>CRM</h3>
				<p>Prospection, pipeline, signaux, veille.</p>
				<span class="status"><span class="dot"></span>Actif</span>
				<span class="tool-open">Ouvrir
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
				</span>
			</a>
		</div>

		<div class="tool-cell reveal" style="--d:.28s">
			{#if decoupeActif}
				<a
					href="/decoupe"
					class="tool"
					aria-label="Ouvrir Découpe Films : optimisez les découpes, limitez les chutes"
				>
					<span class="tool-icon" aria-hidden="true">
						<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
					</span>
					<h3>Découpe Films</h3>
					<p>Optimisez les découpes, limitez les chutes.</p>
					<span class="status"><span class="dot"></span>Actif</span>
					<span class="tool-open">Ouvrir
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
					</span>
				</a>
			{:else}
				<div class="tool tool-soon" aria-label="Découpe Films : bientôt disponible">
					<span class="tool-icon" aria-hidden="true">
						<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
					</span>
					<h3>Découpe Films</h3>
					<p>Optimisez les découpes, limitez les chutes.</p>
					<span class="status muted"><span class="dot"></span>Bientôt</span>
				</div>
			{/if}
		</div>
	</div>

	<footer class="portal-footer reveal" style="--d:.34s">
		Atelier 209 · La Maison Creative Direction SA
	</footer>
</AtelierShell>

<style>
	/* Header dans le bandeau (transparent, posé sur la photo). */
	.header-right {
		display: flex;
		align-items: center;
		gap: 24px;
	}
	.logout {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-family: inherit;
		font-size: 13.5px;
		font-weight: 500;
		color: rgba(236, 231, 220, 0.78);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: color 0.3s var(--a209-ease);
	}
	.logout:hover {
		color: var(--ink);
	}
	.logout:focus-visible {
		outline: 2px solid rgba(240, 228, 194, 0.7);
		outline-offset: 3px;
		border-radius: 4px;
	}
	.logout svg {
		display: block;
	}
	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--cream);
		background: rgba(18, 20, 23, 0.55);
		box-shadow: inset 0 0 0 1px rgba(240, 228, 194, 0.14);
	}

	.portal-title {
		font-size: clamp(42px, 5.4vw, 68px);
	}

	/* Outils : 2 colonnes, sans cadre. Survol = soulève + éclaire (jamais de contour). */
	.tools {
		width: min(760px, 100%);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(20px, 4vw, 40px);
	}
	/* Cellule animée (reveal) ; la carte interactive `.tool` la remplit et garde son lift. */
	.tool-cell {
		display: flex;
	}
	.tool {
		flex: 1;
		position: relative;
		isolation: isolate;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
		padding: clamp(20px, 2.6vw, 30px) clamp(20px, 3vw, 30px);
		border-radius: 22px;
		text-decoration: none;
		color: inherit;
		background: transparent;
		transition:
			transform 0.6s var(--a209-ease-soft),
			background 0.5s var(--a209-ease),
			box-shadow 0.6s var(--a209-ease-soft);
	}
	.tool::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: 22px;
		background: radial-gradient(70% 60% at 50% 22%, rgba(240, 228, 194, 0.1), transparent 68%);
		opacity: 0;
		transition: opacity 0.6s var(--a209-ease);
		pointer-events: none;
	}
	.tool:not(.tool-soon):hover {
		transform: translateY(-8px);
		background: rgba(236, 231, 220, 0.035);
		box-shadow:
			0 40px 90px -46px rgba(0, 0, 0, 0.85),
			0 0 60px -30px rgba(240, 228, 194, 0.28);
	}
	.tool:not(.tool-soon):hover::before {
		opacity: 1;
	}
	.tool:focus-visible {
		outline: none;
		transform: translateY(-4px);
		box-shadow: 0 0 0 2px rgba(240, 228, 194, 0.5);
	}
	.tool-soon {
		cursor: default;
	}
	.tool-soon .tool-icon {
		color: var(--ink-faint);
	}

	.tool-icon {
		position: relative;
		width: 52px;
		height: 52px;
		display: grid;
		place-items: center;
		color: var(--cream);
		transition: transform 0.6s var(--a209-ease-soft);
	}
	.tool-icon::after {
		content: '';
		position: absolute;
		inset: -14px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(240, 228, 194, 0.18), transparent 66%);
		opacity: 0;
		transition: opacity 0.6s var(--a209-ease);
	}
	.tool:not(.tool-soon):hover .tool-icon {
		transform: translateY(-2px);
	}
	.tool:not(.tool-soon):hover .tool-icon::after {
		opacity: 1;
	}
	.tool-icon svg {
		display: block;
	}

	.tool h3 {
		margin-top: 8px;
		font-size: clamp(22px, 2.6vw, 27px);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--ink);
	}
	.tool p {
		font-size: 14.5px;
		color: var(--ink-muted);
		max-width: 26ch;
		line-height: 1.55;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 6px;
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--cream);
	}
	.status .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--cream);
		box-shadow: 0 0 9px rgba(240, 228, 194, 0.75);
	}
	.status.muted {
		color: var(--ink-faint);
	}
	.status.muted .dot {
		background: var(--ink-faint);
		box-shadow: none;
	}

	.tool-open {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		font-size: 12.5px;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--cream);
		opacity: 0;
		transform: translateY(6px);
		transition:
			opacity 0.5s var(--a209-ease),
			transform 0.55s var(--a209-ease-soft);
	}
	.tool:hover .tool-open,
	.tool:focus-visible .tool-open {
		opacity: 1;
		transform: translateY(0);
	}
	.tool-open svg {
		display: block;
		transition: transform 0.55s var(--a209-ease-soft);
	}
	.tool:hover .tool-open svg {
		transform: translate(3px, -3px);
	}

	.portal-footer {
		text-align: center;
		font-size: 12.5px;
		color: var(--ink-faint);
		letter-spacing: 0.02em;
	}

	@media (max-width: 760px) {
		.header-right {
			gap: 16px;
		}
		.tools {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.tool {
			padding: 18px 22px;
			gap: 8px;
		}
		/* Sur mobile (pas de survol), l'affordance d'ouverture reste visible. */
		.tool-open {
			opacity: 1;
			transform: none;
		}
	}
</style>
