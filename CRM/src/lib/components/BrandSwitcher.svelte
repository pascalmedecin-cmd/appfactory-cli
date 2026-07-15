<script lang="ts">
	/**
	 * Atelier 209 Run 2 : sélecteur d'environnement (FilmPro / LED Studio), en tête du menu.
	 * Remplace l'ancien logo-lien du sidebar (le retour portail passe désormais par une entrée
	 * du menu déroulant). Bascule = POST /api/marque (cookie httpOnly par-appareil) puis
	 * `invalidateAll()` : tous les `load` re-tournent, le chrome se re-teinte et les données se
	 * re-filtrent, sans reload dur. Environnements étanches : un prospect FilmPro n'apparaît
	 * jamais côté LED (cloisonnement applicatif + garde-fous FK composites en base).
	 */
	import { invalidateAll } from '$app/navigation';

	let { marque = 'filmpro', collapsed = false }: { marque?: 'filmpro' | 'led'; collapsed?: boolean } = $props();

	type Env = { key: 'filmpro' | 'led'; name: string; initials: string; color: string; logo: string };
	// Couleurs FIXES d'identité de chaque environnement (les pastilles du menu montrent
	// toujours les 2 marques, indépendamment de l'environnement actif).
	const ENVS: Env[] = [
		{ key: 'filmpro', name: 'FilmPro', initials: 'FP', color: '#2F5A9E', logo: '/FilmPro_logo_white.svg' },
		{ key: 'led', name: 'LED Studio', initials: 'LS', color: '#FF05A8', logo: '/atelier209/ledstudio-magenta.svg' }
	];

	const active = $derived(ENVS.find((e) => e.key === marque) ?? ENVS[0]);

	let open = $state(false);
	let switching = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();

	async function choose(target: 'filmpro' | 'led') {
		open = false;
		if (target === marque || switching) return;
		switching = true;
		try {
			const res = await fetch('/api/marque', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ marque: target })
			});
			if (res.ok) await invalidateAll();
		} finally {
			switching = false;
		}
	}

	function onWindowClick(e: MouseEvent) {
		if (!open) return;
		if (rootEl && !rootEl.contains(e.target as Node)) open = false;
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			triggerEl?.focus();
		}
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

<div class="brandswitch" class:collapsed bind:this={rootEl}>
	<button
		bind:this={triggerEl}
		type="button"
		class="bs-trigger"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Changer d'environnement ({active.name} actif)"
		onclick={() => (open = !open)}
	>
		{#if collapsed}
			<span class="bs-badge-mini" style="background:{active.color}">{active.initials}</span>
		{:else}
			<img class="bs-logo" src={active.logo} alt={active.name} />
			<svg class="bs-chev" class:up={open} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
		{/if}
	</button>

	{#if open}
		<div class="bs-menu" role="menu">
			<div class="grp">Environnement</div>
			{#each ENVS as env}
				<button
					type="button"
					role="menuitem"
					class="bs-opt"
					class:active={env.key === marque}
					onclick={() => choose(env.key)}
				>
					<span class="bs-badge" style="background:{env.color}">{env.initials}</span>
					<span class="t"><span class="nm">{env.name}</span></span>
					{#if env.key === marque}
						<svg class="bs-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
					{/if}
				</button>
			{/each}
			<a class="bs-portail" href="/" role="menuitem">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>
				Retour au portail
			</a>
			<div class="bs-foot">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
				Environnements étanches - les données ne se croisent jamais
			</div>
		</div>
	{/if}
</div>

<style>
	.brandswitch {
		position: relative;
		margin: 12px 12px 6px;
	}
	.brandswitch.collapsed {
		margin: 12px 8px 6px;
		display: flex;
		justify-content: center;
	}

	.bs-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 9px 10px;
		border-radius: var(--radius-lg);
		background: rgba(255, 255, 255, 0.05);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
		cursor: pointer;
		border: none;
		color: inherit;
		text-align: left;
		transition: background 0.2s var(--ease-out-expo);
	}
	.brandswitch.collapsed .bs-trigger {
		width: auto;
		padding: 6px;
		justify-content: center;
	}
	.bs-trigger:hover {
		background: rgba(255, 255, 255, 0.09);
	}

	.bs-logo {
		height: 22px;
		width: auto;
		display: block;
	}
	.bs-chev {
		color: rgba(255, 255, 255, 0.66);
		flex-shrink: 0;
		margin-left: auto;
		transition: transform 0.2s var(--ease-out-expo);
	}
	.bs-chev.up {
		transform: rotate(180deg);
	}
	.bs-badge-mini {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.bs-menu {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 8px);
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-menu);
		padding: 7px;
		z-index: 40;
		color: var(--color-text);
	}
	.brandswitch.collapsed .bs-menu {
		left: 0;
		right: auto;
		width: 220px;
	}
	.grp {
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		font-weight: 600;
		padding: 6px 9px 4px;
	}
	.bs-opt {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		padding: 9px;
		border-radius: var(--radius-md);
		cursor: pointer;
		border: none;
		background: none;
		color: var(--color-text);
		text-align: left;
		transition: background 0.15s var(--ease-out-expo);
	}
	.bs-opt:hover {
		background: var(--color-surface-alt);
	}
	.bs-opt.active {
		background: var(--color-primary-light);
	}
	.bs-badge {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.02em;
		box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.06);
	}
	.bs-opt .t {
		flex: 1;
		min-width: 0;
	}
	.bs-opt .t .nm {
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.bs-check {
		color: var(--color-primary-hover);
		flex-shrink: 0;
	}
	.bs-portail {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 9px;
		margin-top: 3px;
		border-radius: var(--radius-md);
		color: var(--color-text-body);
		text-decoration: none;
		font-size: 12.5px;
		font-weight: 500;
		transition: background 0.15s var(--ease-out-expo);
	}
	.bs-portail:hover {
		background: var(--color-surface-alt);
	}
	.bs-foot {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 9px 5px;
		margin-top: 3px;
		border-top: 1px solid var(--color-hairline);
		color: var(--color-text-muted);
		font-size: 11.5px;
		line-height: 1.35;
	}
	.bs-foot svg {
		flex-shrink: 0;
	}
</style>
