<script lang="ts">
	/** Onglet « Rechercher » — 1 champ, sans filtre (AC-004). Debounce + appel
	 * GET /api/entreprises/search. États : vide / chargement / résultats / aucun. */
	import MobileShell from '$lib/components/terrain/MobileShell.svelte';
	import EntrepriseResultRow from '$lib/components/terrain/EntrepriseResultRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { EntrepriseSearchResult } from '../../api/entreprises/search/+server';

	let q = $state('');
	let results = $state<EntrepriseSearchResult[]>([]);
	let loading = $state(false);
	let searched = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	async function runSearch(term: string) {
		const trimmed = term.trim();
		if (trimmed.length < 2) {
			results = [];
			searched = false;
			loading = false;
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/entreprises/search?q=${encodeURIComponent(trimmed)}`);
			const body = await res.json();
			results = res.ok ? (body.results ?? []) : [];
		} catch {
			results = [];
		} finally {
			loading = false;
			searched = true;
		}
	}

	function onInput() {
		if (timer) clearTimeout(timer);
		const term = q;
		timer = setTimeout(() => runSearch(term), 300);
	}

	function clear() {
		q = '';
		results = [];
		searched = false;
		if (timer) clearTimeout(timer);
	}
</script>

<MobileShell title="Rechercher">
	<div class="field-wrap">
		<Icon name="search" size={20} class="lead-icon" />
		<input
			class="field"
			type="search"
			inputmode="search"
			autocomplete="off"
			placeholder="Nom d'entreprise"
			bind:value={q}
			oninput={onInput}
			aria-label="Rechercher une entreprise par nom"
		/>
		{#if loading}
			<Icon name="progress_activity" size={18} class="trail-icon spin" />
		{:else if q}
			<button type="button" class="clear-btn" onclick={clear} aria-label="Effacer">
				<Icon name="close" size={18} />
			</button>
		{/if}
	</div>

	{#if results.length > 0}
		<ul class="list">
			{#each results as r (r.id)}
				<li>
					<EntrepriseResultRow
						href={`/terrain/entreprise/${r.id}`}
						raisonSociale={r.raison_sociale}
						canton={r.canton}
					/>
				</li>
			{/each}
		</ul>
	{:else if searched && !loading}
		<p class="empty text-base text-[var(--color-text-muted)]">
			Aucune entreprise pour « {q.trim()} ».
		</p>
	{/if}
</MobileShell>

<style>
	.field-wrap {
		position: relative;
		display: flex;
		align-items: center;
		margin-bottom: var(--mobile-row-gap);
	}
	.field-wrap :global(.lead-icon) {
		position: absolute;
		left: 14px;
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.field {
		width: 100%;
		min-height: 48px;
		padding: 0 44px 0 42px;
		/* Plancher 16px : empêche le zoom auto iOS. */
		font-size: 16px;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
	}
	.field:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: -1px;
	}
	.clear-btn {
		position: absolute;
		right: 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		color: var(--color-text-muted);
		background: transparent;
	}
	.field-wrap :global(.trail-icon) {
		position: absolute;
		right: 16px;
		color: var(--color-text-muted);
	}
	.field-wrap :global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--mobile-row-gap);
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.empty {
		padding: 24px 4px;
		text-align: center;
	}
</style>
