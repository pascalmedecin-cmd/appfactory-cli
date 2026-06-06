<!--
  Sélecteur produit en cascade (Découpe Films) : Famille → Fabricant → Référence.
  Le NOM de la référence est le critère de choix ; le numéro de réf est un ID secondaire.
  Réutilisé par la saisie rapide ET la modale d'édition de la fiche chantier.
  Liaisons : `famille` / `fabricant` / `produitId` ($bindable). Aucune I/O.
  Langage visuel = golden v5 validé (2026-06-06), tokens projet.
-->
<script lang="ts">
	type ProduitOpt = {
		id: string;
		reference: string;
		nom: string;
		famille: string;
		fabricant: string | null;
		laizes_mm: number[];
	};

	let {
		produits,
		famille = $bindable(null),
		fabricant = $bindable(null),
		produitId = $bindable('')
	}: {
		produits: ProduitOpt[];
		famille?: string | null;
		fabricant?: string | null;
		produitId?: string;
	} = $props();

	const NONE = '__none__';
	const FAMILLES = [
		{ key: 'solaire', label: 'Solaire' },
		{ key: 'securite', label: 'Sécurité' },
		{ key: 'discretion', label: 'Discrétion' }
	] as const;

	function famCount(f: string): number {
		return produits.filter((p) => p.famille === f).length;
	}

	const fabs = $derived.by(() => {
		if (!famille) return [] as { key: string; label: string; n: number }[];
		const m = new Map<string, number>();
		for (const p of produits) {
			if (p.famille !== famille) continue;
			const key = p.fabricant || NONE;
			m.set(key, (m.get(key) ?? 0) + 1);
		}
		return [...m.entries()].map(([key, n]) => ({
			key,
			label: key === NONE ? 'Non précisé' : key,
			n
		}));
	});

	const refs = $derived.by(() => {
		if (!famille || !fabricant) return [] as ProduitOpt[];
		return produits.filter((p) => p.famille === famille && (p.fabricant || NONE) === fabricant);
	});

	const chosen = $derived(produits.find((p) => p.id === produitId) ?? null);
	const famLabel = $derived(FAMILLES.find((f) => f.key === famille)?.label ?? '');

	function pickFam(f: string) {
		famille = f;
		fabricant = null;
		produitId = '';
	}
	function pickFab(k: string) {
		fabricant = k;
		produitId = '';
	}
	function pickRef(id: string) {
		produitId = id;
	}
	function reset() {
		famille = null;
		fabricant = null;
		produitId = '';
	}
	function fabLabel(k: string | null): string {
		if (!k) return '';
		return k === NONE ? 'Non précisé' : k;
	}
</script>

{#snippet famSvg(f: string)}
	{#if f === 'solaire'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
	{:else if f === 'securite'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
	{/if}
{/snippet}

{#snippet scissors()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
{/snippet}

<div class="cascade">
	<!-- 1 - Catégorie -->
	<div class="step" class:done={!!famille}>
		<div class="step-lbl"><span class="step-num">1</span>Catégorie de produit{#if famLabel}<span class="step-pick">{famLabel}</span>{/if}</div>
		<div class="fam-grid">
			{#each FAMILLES as f (f.key)}
				{@const n = famCount(f.key)}
				<button
					type="button"
					class="fam-pill"
					class:sel={famille === f.key}
					data-fam={f.key}
					aria-pressed={famille === f.key}
					onclick={() => pickFam(f.key)}
				>
					<span class="ft">{@render famSvg(f.key)}</span>
					<span class="fl"><span class="fn">{f.label}</span><span class="fc">{n} référence{n > 1 ? 's' : ''}</span></span>
					<span class="fk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
				</button>
			{/each}
		</div>
	</div>

	<!-- 2 - Fabricant -->
	{#if famille}
		<div class="step" class:done={!!fabricant}>
			<div class="step-lbl"><span class="step-num">2</span>Fabricant{#if fabricant}<span class="step-pick">{fabLabel(fabricant)}</span>{/if}</div>
			{#if fabs.length === 0}
				<p class="empty">Aucune référence dans cette catégorie. Ajoutez un produit dans la base.</p>
			{:else}
				<div class="fab-row">
					{#each fabs as fab (fab.key)}
						<button
							type="button"
							class="fab-chip"
							class:sel={fabricant === fab.key}
							aria-pressed={fabricant === fab.key}
							onclick={() => pickFab(fab.key)}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16h.01M16 16h.01M8 16h.01M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 4V8l-7 4V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg>
							{fab.label}<span class="fab-n">{fab.n}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- 3 - Référence -->
	{#if famille && fabricant}
		<div class="step" class:done={!!produitId}>
			<div class="step-lbl"><span class="step-num">3</span>Référence{#if chosen}<span class="step-pick">{chosen.nom}</span>{/if}</div>
			<div class="ref-grid">
				{#each refs as p (p.id)}
					<button
						type="button"
						class="ref-card"
						class:sel={produitId === p.id}
						aria-pressed={produitId === p.id}
						aria-label={`Référence ${p.nom}, numéro ${p.reference}`}
						onclick={() => pickRef(p.id)}
					>
						<span class="rc-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
						<span class="rc-top">
							<span class="rc-tile" data-fam={famille}>{@render scissors()}</span>
							<span class="rc-id-wrap">
								<span class="rc-nom">{p.nom}</span>
								<span class="rc-id"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 7.5h.01" /><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h6a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-6 6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 11Z" /></svg>{p.reference}</span>
							</span>
						</span>
						{#if p.laizes_mm?.length}
							<span class="rc-foot"><span class="lzlbl">Laizes</span>{#each p.laizes_mm as l (l)}<span class="lz">{l}</span>{/each}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Récap produit choisi -->
	{#if chosen}
		<div class="chosen">
			<span class="ct" data-fam={chosen.famille}>{@render scissors()}</span>
			<div class="cmain">
				<div class="cn">{chosen.nom}</div>
				<div class="cm"><span class="fam fam--{chosen.famille}">{famLabel}</span>{#if chosen.fabricant}<span class="sep">·</span>{chosen.fabricant}{/if}<span class="sep">·</span><span class="mid">#{chosen.reference}</span></div>
			</div>
			<button type="button" class="creset" onclick={reset}>Changer</button>
		</div>
	{/if}
</div>

<style>
	.cascade {
		display: flex;
		flex-direction: column;
		gap: 18px;
		container-type: inline-size;
	}
	.step {
		min-width: 0;
	}
	.step-lbl {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--df-text-faint, #6b7280);
		margin-bottom: 11px;
	}
	.step-num {
		width: 19px;
		height: 19px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-size: 11px;
		font-weight: 700;
		display: grid;
		place-items: center;
		flex: none;
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
	.step.done .step-num {
		background: var(--color-primary);
		color: #fff;
		box-shadow: none;
	}
	.step-pick {
		margin-left: auto;
		font-size: 12px;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		color: var(--color-primary);
	}
	.empty {
		font-size: 13px;
		color: var(--df-text-faint, #6b7280);
		padding: 2px;
	}

	/* 1 - Familles */
	.fam-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}
	.fam-pill {
		display: flex;
		align-items: center;
		gap: 13px;
		padding: 14px 16px;
		border-radius: var(--radius-xl);
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: border-color var(--df-dur, 240ms) var(--ease-out-expo), box-shadow var(--df-dur, 240ms) var(--ease-out-expo), background var(--df-dur, 240ms) var(--ease-out-expo), transform var(--df-dur, 240ms) var(--ease-out-expo);
	}
	.fam-pill:hover {
		border-color: var(--color-border-strong);
		transform: translateY(-1px);
		box-shadow: var(--shadow-xs);
	}
	.fam-pill .ft {
		width: 40px;
		height: 40px;
		border-radius: 11px;
		display: grid;
		place-items: center;
		color: #fff;
		flex: none;
		box-shadow: 0 1px 2px rgba(17, 24, 39, 0.18);
	}
	.fam-pill .ft :global(svg) {
		width: 21px;
		height: 21px;
	}
	.fam-pill .fl {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.fam-pill .fn {
		font-size: 14.5px;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1;
	}
	.fam-pill .fc {
		font-size: 12px;
		color: var(--color-text-muted);
		line-height: 1;
	}
	.fam-pill .fk {
		margin-left: auto;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-full);
		display: grid;
		place-items: center;
		flex: none;
		opacity: 0;
		transform: scale(0.6);
		transition: opacity var(--df-dur, 240ms) var(--ease-out-expo), transform var(--df-dur, 240ms) var(--ease-out-expo);
	}
	.fam-pill .fk :global(svg) {
		width: 13px;
		height: 13px;
		color: #fff;
	}
	.fam-pill[data-fam='solaire'] {
		--c: var(--df-fam-solaire, #d98a23);
	}
	.fam-pill[data-fam='solaire'] .ft {
		background: var(--df-fam-solaire, #d98a23);
	}
	.fam-pill[data-fam='securite'] {
		--c: var(--df-fam-securite, #3d6b8a);
	}
	.fam-pill[data-fam='securite'] .ft {
		background: var(--df-fam-securite, #3d6b8a);
	}
	.fam-pill[data-fam='discretion'] {
		--c: var(--df-fam-discretion, #7b6a9a);
	}
	.fam-pill[data-fam='discretion'] .ft {
		background: var(--df-fam-discretion, #7b6a9a);
	}
	.fam-pill.sel {
		border-color: var(--c);
		background: color-mix(in srgb, var(--c) 7%, #fff);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 16%, transparent);
	}
	.fam-pill.sel .fk {
		opacity: 1;
		transform: scale(1);
		background: var(--c);
	}

	/* 2 - Fabricants */
	.fab-row {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
	}
	.fab-chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 15px;
		border-radius: var(--radius-full);
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		font-size: 13.5px;
		font-weight: 500;
		font-family: inherit;
		color: var(--color-text-body);
		cursor: pointer;
		transition: border-color var(--df-dur, 240ms) var(--ease-out-expo), background var(--df-dur, 240ms) var(--ease-out-expo), color var(--df-dur, 240ms) var(--ease-out-expo);
	}
	.fab-chip :global(svg) {
		width: 15px;
		height: 15px;
		color: var(--df-text-faint, #6b7280);
	}
	.fab-chip:hover {
		border-color: var(--color-border-strong);
		background: var(--color-surface-alt);
	}
	.fab-chip.sel {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 600;
	}
	.fab-chip.sel :global(svg) {
		color: var(--color-primary);
	}
	.fab-n {
		display: inline-grid;
		place-items: center;
		min-width: 20px;
		height: 18px;
		padding: 0 6px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}
	.fab-chip.sel .fab-n {
		background: #fff;
		color: var(--color-primary);
	}

	/* 3 - Références */
	.ref-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
	}
	.ref-card {
		position: relative;
		text-align: left;
		padding: 14px 15px;
		border-radius: var(--radius-xl);
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		cursor: pointer;
		font-family: inherit;
		transition: border-color var(--df-dur, 240ms) var(--ease-out-expo), box-shadow var(--df-dur, 240ms) var(--ease-out-expo), transform var(--df-dur, 240ms) var(--ease-out-expo);
	}
	.ref-card:hover {
		border-color: var(--color-border-strong);
		transform: translateY(-1px);
		box-shadow: var(--shadow-xs);
	}
	.ref-card.sel {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
	}
	.rc-top {
		display: flex;
		align-items: flex-start;
		gap: 11px;
	}
	.rc-tile {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		color: #fff;
		flex: none;
	}
	.rc-tile :global(svg) {
		width: 18px;
		height: 18px;
	}
	.rc-tile[data-fam='solaire'] {
		background: var(--df-fam-solaire, #d98a23);
	}
	.rc-tile[data-fam='securite'] {
		background: var(--df-fam-securite, #3d6b8a);
	}
	.rc-tile[data-fam='discretion'] {
		background: var(--df-fam-discretion, #7b6a9a);
	}
	.rc-id-wrap {
		min-width: 0;
	}
	.rc-nom {
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	.rc-id {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 5px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--df-text-faint, #6b7280);
	}
	.rc-id :global(svg) {
		width: 11px;
		height: 11px;
	}
	.rc-foot {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 11px;
		padding-top: 11px;
		border-top: 1px solid var(--color-border);
		flex-wrap: wrap;
	}
	.lzlbl {
		font-size: 11px;
		color: var(--df-text-faint, #6b7280);
	}
	.lz {
		font-size: 11px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-body);
		background: var(--color-surface-alt);
		box-shadow: inset 0 0 0 1px var(--color-border);
		border-radius: var(--radius-sm);
		padding: 2px 7px;
	}
	.rc-check {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-full);
		background: var(--color-primary);
		display: grid;
		place-items: center;
		opacity: 0;
		transform: scale(0.6);
		transition: opacity var(--df-dur, 240ms) var(--ease-out-expo), transform var(--df-dur, 240ms) var(--ease-out-expo);
	}
	.rc-check :global(svg) {
		width: 12px;
		height: 12px;
		color: #fff;
	}
	.ref-card.sel .rc-check {
		opacity: 1;
		transform: scale(1);
	}

	/* Récap */
	.chosen {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 13px 15px;
		border-radius: var(--radius-xl);
		background: var(--color-primary-light);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 14%, transparent);
	}
	.ct {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		color: #fff;
		flex: none;
	}
	.ct :global(svg) {
		width: 18px;
		height: 18px;
	}
	.ct[data-fam='solaire'] {
		background: var(--df-fam-solaire, #d98a23);
	}
	.ct[data-fam='securite'] {
		background: var(--df-fam-securite, #3d6b8a);
	}
	.ct[data-fam='discretion'] {
		background: var(--df-fam-discretion, #7b6a9a);
	}
	.cmain {
		min-width: 0;
		flex: 1;
	}
	.cn {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
	}
	.cm {
		font-size: 12px;
		/* text-body : AA 4.5:1 sur le fond primary-light #f0f4f8 du récap
		   (text-muted #6b7280 y tombe à 4.37, axe serious). */
		color: var(--color-text-body);
		margin-top: 2px;
		display: flex;
		align-items: center;
		gap: 7px;
		flex-wrap: wrap;
	}
	.cm .sep {
		color: var(--color-border-strong);
	}
	.cm .mid {
		font-family: var(--font-mono);
	}
	.fam {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 500;
		color: var(--color-text-body);
	}
	.fam::before {
		content: '';
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--fam-c, var(--color-text-muted));
	}
	.fam--solaire {
		--fam-c: var(--df-fam-solaire, #d98a23);
	}
	.fam--securite {
		--fam-c: var(--df-fam-securite, #3d6b8a);
	}
	.fam--discretion {
		--fam-c: var(--df-fam-discretion, #7b6a9a);
	}
	.creset {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-primary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 6px 8px;
		border-radius: var(--radius-md);
		font-family: inherit;
		flex: none;
	}
	.creset:hover {
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
	}

	/* Réagit à la largeur du conteneur (carte de saisie large = 3 colonnes ;
	   modale d'édition étroite = 1 colonne), pas au viewport. */
	@container (max-width: 540px) {
		.fam-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fam-pill,
		.fam-pill .fk,
		.fab-chip,
		.ref-card,
		.rc-check {
			transition: none;
		}
	}
</style>
