<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { SOURCE_CARDS, type EntrepriseSource } from './source-meta';
	import type { PublicCandidate } from '$lib/server/prospection/candidate';

	let {
		candidates,
		source,
		pending = false,
		onimport,
	}: {
		candidates: PublicCandidate[];
		source: EntrepriseSource;
		pending?: boolean;
		onimport?: (selected: PublicCandidate[]) => void;
	} = $props();

	const meta = $derived(SOURCE_CARDS[source]);

	// Sélection par source_id (SvelteSet : réactif sur mutation, cohérent feedback_svelteset_parallel_by_id).
	const selected = new SvelteSet<string>();

	// À chaque nouvelle liste de candidats : pré-cocher tous les importables (new/known_zefix),
	// laisser les doublons (exists/dismissed) décochés. Clé = identité du tableau (nouvelle recherche).
	$effect(() => {
		const list = candidates;
		selected.clear();
		for (const c of list) if (c.importable) selected.add(c.source_id);
	});

	const importables = $derived(candidates.filter((c) => c.importable));
	const allImportablesChecked = $derived(importables.length > 0 && importables.every((c) => selected.has(c.source_id)));
	const selectedCount = $derived(candidates.filter((c) => c.importable && selected.has(c.source_id)).length);

	function toggle(c: PublicCandidate) {
		if (!c.importable) return;
		if (selected.has(c.source_id)) selected.delete(c.source_id);
		else selected.add(c.source_id);
	}

	function toggleAll() {
		if (allImportablesChecked) {
			for (const c of importables) selected.delete(c.source_id);
		} else {
			for (const c of importables) selected.add(c.source_id);
		}
	}

	function doImport() {
		if (selectedCount === 0 || pending) return;
		onimport?.(candidates.filter((c) => c.importable && selected.has(c.source_id)));
	}

	function initials(name: string): string {
		const parts = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}

	function statusLabel(s: PublicCandidate['status_hint']): { text: string; tone: 'new' | 'known' | 'muted' } | null {
		switch (s) {
			case 'new': return { text: 'Nouveau', tone: 'new' };
			case 'known_zefix': return { text: 'Déjà au registre', tone: 'known' };
			case 'exists': return { text: 'Déjà dans le CRM', tone: 'muted' };
			case 'dismissed': return { text: 'Déjà traité', tone: 'muted' };
			default: return null;
		}
	}

	// Domaine nu d'un site web (affichage compact, sans protocole ni chemin).
	function bareDomain(url: string): string {
		return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
	}
</script>

<div class="results rounded-xl border border-border bg-white overflow-hidden" style="--c: var({meta.cssVar}); --c-bg: var({meta.bgVar}); --c-border: var({meta.borderVar}); --c-deep: var({meta.deepVar});">
	<div class="res-head flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
		<div class="min-w-0">
			<p class="text-[14px] font-bold text-text leading-tight">
				<b style="color: var({meta.cssVar})">{candidates.length}</b> entreprise{candidates.length > 1 ? 's' : ''} trouvée{candidates.length > 1 ? 's' : ''}
			</p>
			<p class="text-[12px] text-text-muted leading-tight">Cochez celles à importer{#if meta.paid} - le quota est déjà payé, tout afficher est gratuit{/if}.</p>
		</div>
		<div class="ml-auto flex items-center gap-3 flex-shrink-0">
			{#if importables.length > 0}
				<button type="button" class="sel-all inline-flex items-center gap-2 text-[12.5px] font-semibold text-text-body cursor-pointer" onclick={toggleAll}>
					<span class="cbx {allImportablesChecked ? 'on' : ''}" aria-hidden="true"><Icon name="check" size={12} strokeWidth={3} /></span>
					{allImportablesChecked ? 'Tout décocher' : 'Tout cocher'}
				</button>
			{/if}
			<button type="button" class="btn-import" onclick={doImport} disabled={selectedCount === 0 || pending}>
				<Icon name={pending ? 'progress_activity' : 'add'} size={16} class={pending ? 'spin' : ''} />
				{pending ? 'Import…' : 'Importer'}<span class="n">{selectedCount}</span>
			</button>
		</div>
	</div>

	<ul class="rows" aria-label="Résultats de recherche">
		{#each candidates as c (c.tempId)}
			{@const checked = c.importable && selected.has(c.source_id)}
			{@const badge = statusLabel(c.status_hint)}
			<li class="row flex items-center gap-3 px-4 py-2.5 {checked ? 'checked' : ''} {c.importable ? '' : 'disabled'}">
				<button
					type="button"
					class="cbx {checked ? 'on' : ''}"
					aria-pressed={checked}
					aria-label={c.importable ? `Sélectionner ${c.raison_sociale}` : `${c.raison_sociale} déjà présente`}
					disabled={!c.importable}
					onclick={() => toggle(c)}
				><Icon name="check" size={12} strokeWidth={3} /></button>

				<span class="avatar" aria-hidden="true">{initials(c.raison_sociale)}</span>

				<div class="main min-w-0 flex-1">
					<div class="name flex items-center gap-2 flex-wrap">
						<span class="text-[14px] font-semibold text-text truncate">{c.raison_sociale}</span>
						{#if badge}<span class="tag tag-{badge.tone}">{badge.text}</span>{/if}
					</div>
					<div class="meta mt-1 flex flex-wrap gap-x-3 gap-y-1">
						{#if c.telephone}<span class="m-pill tel"><Icon name="phone_forwarded" size={12} />{c.telephone}</span>{/if}
						{#if c.site_web}<span class="m-pill"><Icon name="language" size={12} />{bareDomain(c.site_web)}</span>{/if}
						{#if c.secteur_detecte}<span class="m-pill"><Icon name="sell" size={12} />{c.secteur_detecte}</span>{/if}
						{#if !c.telephone && !c.site_web && !c.secteur_detecte}<span class="m-pill text-text-muted/70">Coordonnées limitées</span>{/if}
					</div>
				</div>

				{#if c.localite || c.canton}
					<span class="loc flex-shrink-0"><Icon name="location_on" size={12} />{c.localite ?? c.canton}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.btn-import {
		height: 38px;
		padding: 0 16px;
		border: 0;
		border-radius: 9px;
		background: var(--color-primary);
		color: #fff;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.18);
		transition: background 0.2s cubic-bezier(0.32, 0.72, 0, 1), transform 0.15s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.btn-import:hover:not(:disabled) { background: var(--color-primary-hover); }
	.btn-import:active:not(:disabled) { transform: scale(0.98); }
	.btn-import:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-import .n {
		background: rgba(255, 255, 255, 0.22);
		border-radius: 999px;
		padding: 1px 8px;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.rows {
		max-height: 46vh;
		overflow-y: auto;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.row { border-bottom: 1px solid var(--color-surface-alt); transition: background 0.2s cubic-bezier(0.32, 0.72, 0, 1); }
	.row:last-child { border-bottom: 0; }
	.row:hover:not(.disabled) { background: #fcfcfd; }
	.row.checked { background: linear-gradient(90deg, var(--c-bg) 0%, #fff 16%); }
	.row.disabled { opacity: 0.55; }
	.cbx {
		width: 20px;
		height: 20px;
		border-radius: 6px;
		border: 1.5px solid var(--color-border-strong);
		background: #fff;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		cursor: pointer;
		padding: 0;
		transition: background 0.2s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.2s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.cbx :global(svg) { color: #fff; opacity: 0; transform: scale(0.5); transition: opacity 0.2s, transform 0.2s; }
	.cbx.on { background: var(--c); border-color: var(--c); }
	.cbx.on :global(svg) { opacity: 1; transform: scale(1); }
	.cbx:disabled { cursor: not-allowed; background: var(--color-surface-alt); border-color: var(--color-border); }
	.sel-all .cbx { width: 18px; height: 18px; }
	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 700;
		flex-shrink: 0;
		background: var(--c-bg);
		color: var(--c-deep);
		box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.6);
		font-variant-numeric: tabular-nums;
	}
	.tag {
		font-size: 9.5px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 1px 7px;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.tag-new { color: var(--c-deep); background: var(--c-bg); border: 1px solid var(--c-border); }
	.tag-known { color: var(--color-text-body); background: var(--color-surface-alt); border: 1px solid var(--color-border); }
	.tag-muted { color: var(--color-text-muted); background: var(--color-surface-alt); border: 1px solid var(--color-border); }
	.m-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.m-pill :global(svg) { color: var(--color-text-muted); flex-shrink: 0; }
	.m-pill.tel { color: var(--color-text-body); font-weight: 500; }
	.m-pill.tel :global(svg) { color: var(--c-deep); }
	.loc {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-body);
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		padding: 4px 10px;
		border-radius: 999px;
	}
	.loc :global(svg) { color: var(--color-text-muted); flex-shrink: 0; }
	:global(.spin) { animation: rc-spin 0.9s linear infinite; }
	@keyframes rc-spin { to { transform: rotate(360deg); } }
</style>
