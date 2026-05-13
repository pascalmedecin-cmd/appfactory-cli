<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';
	import { POIDS_PAR_CATEGORIE, type KeywordRow, type KeywordCategorie } from '$lib/scoring/keywords';

	type Props = {
		keywords: KeywordRow[];
		canEdit: boolean;
		// Persistance UI (collapsed) lue côté parent via localStorage.
		collapsed?: boolean;
		onCollapsedChange?: (v: boolean) => void;
	};

	let { keywords, canEdit, collapsed = false, onCollapsedChange }: Props = $props();

	type CategorieConfig = {
		key: KeywordCategorie;
		label: string;
		hint: string;
	};

	// Poids = source unique `POIDS_PAR_CATEGORIE` depuis lib (cf. audit contracts M-1 S186).
	const CATEGORIES: CategorieConfig[] = [
		{ key: 'coeur', label: 'Cœur métier', hint: 'vitrage, film, vernis…' },
		{ key: 'bonus', label: 'Bonus', hint: 'régie, architecte…' },
		{ key: 'eviter', label: 'À éviter', hint: 'route, voirie…' },
	];

	const groupedByCat = $derived.by(() => {
		const out: Record<KeywordCategorie, KeywordRow[]> = { coeur: [], bonus: [], eviter: [] };
		for (const kw of keywords) {
			if (out[kw.categorie]) out[kw.categorie].push(kw);
		}
		// Tri alpha pour stabilité visuelle (independent de cree_le).
		for (const cat of Object.keys(out) as KeywordCategorie[]) {
			out[cat].sort((a, b) => a.terme.localeCompare(b.terme, 'fr'));
		}
		return out;
	});

	// État d'édition par catégorie : laquelle a son input ouvert ?
	let addingFor: KeywordCategorie | null = $state(null);
	let addInputValue = $state('');
	let addInputEl: HTMLInputElement | null = $state(null);
	let submitting = $state(false);

	function openAdd(cat: KeywordCategorie) {
		addingFor = cat;
		addInputValue = '';
		// Focus à la frame suivante quand l'input est monté.
		queueMicrotask(() => addInputEl?.focus());
	}

	function cancelAdd() {
		addingFor = null;
		addInputValue = '';
	}

	function onInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelAdd();
		}
	}

	function toggleCollapsed() {
		const next = !collapsed;
		onCollapsedChange?.(next);
	}
</script>

<aside class="kw-panel" class:collapsed aria-label="Panneau de pertinence">
	<header class="kw-panel-head">
		<button
			type="button"
			class="kw-collapse-btn"
			onclick={toggleCollapsed}
			aria-label={collapsed ? 'Déplier le panneau pertinence' : 'Replier le panneau pertinence'}
			aria-expanded={!collapsed}
		>
			<Icon name={collapsed ? 'chevron_left' : 'chevron_right'} size={20} />
		</button>
		{#if !collapsed}
			<h2 class="kw-panel-title">Pertinence</h2>
		{:else}
			<span class="kw-collapsed-label" aria-hidden="true">PERTINENCE</span>
		{/if}
	</header>

	{#if !collapsed}
		<div class="kw-panel-body">
			{#each CATEGORIES as cat (cat.key)}
				{@const items = groupedByCat[cat.key]}
				<section class="kw-section kw-section-{cat.key}">
					<header class="kw-section-head">
						<h3 class="kw-section-title">
							{cat.label}
							<span class="kw-section-count">({items.length})</span>
						</h3>
						<span class="kw-section-weight" title="Poids par match">
							{POIDS_PAR_CATEGORIE[cat.key] > 0 ? `+${POIDS_PAR_CATEGORIE[cat.key]}` : POIDS_PAR_CATEGORIE[cat.key]}
						</span>
					</header>

					<ul class="kw-chips">
						{#each items as kw (kw.id)}
							<li class="kw-chip">
								<span class="kw-chip-text">{kw.terme}</span>
								{#if canEdit}
									<form
										method="POST"
										action="?/removeKeyword"
										use:enhance={() => {
											submitting = true;
											return async ({ result, update }) => {
												submitting = false;
												if (result.type === 'failure') {
													toasts.error('Suppression impossible');
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="id" value={kw.id} />
										<button
											type="submit"
											class="kw-chip-remove"
											aria-label={`Retirer ${kw.terme}`}
											disabled={submitting}
										>
											<Icon name="close" size={12} />
										</button>
									</form>
								{/if}
							</li>
						{/each}

						{#if canEdit}
							{#if addingFor === cat.key}
								<li class="kw-chip kw-chip-input-wrap">
									<form
										method="POST"
										action="?/addKeyword"
										use:enhance={() => {
											submitting = true;
											return async ({ result, update }) => {
												submitting = false;
												if (result.type === 'failure') {
													const data = result.data as { error?: string } | undefined;
													toasts.error(data?.error ?? 'Ajout impossible');
												} else {
													toasts.success(`« ${addInputValue} » ajouté`);
													cancelAdd();
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="categorie" value={cat.key} />
										<input
											bind:this={addInputEl}
											bind:value={addInputValue}
											name="terme"
											type="text"
											class="kw-chip-input"
											placeholder={cat.hint}
											maxlength="50"
											required
											onkeydown={onInputKeydown}
										/>
									</form>
									<button
										type="button"
										class="kw-chip-remove"
										onclick={cancelAdd}
										aria-label="Annuler"
									>
										<Icon name="close" size={12} />
									</button>
								</li>
							{:else}
								<li>
									<button
										type="button"
										class="kw-chip-add"
										onclick={() => openAdd(cat.key)}
										aria-label={`Ajouter un mot-clé ${cat.label}`}
										disabled={submitting}
									>
										<Icon name="add" size={14} /> ajouter
									</button>
								</li>
							{/if}
						{/if}
					</ul>
				</section>
			{/each}

			{#if !canEdit}
				<p class="kw-readonly-note">
					Édition réservée aux admins FilmPro.
				</p>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.kw-panel {
		width: 320px;
		flex-shrink: 0;
		background: var(--color-surface);
		border-left: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		transition: width 200ms var(--ease-out-expo);
	}
	.kw-panel.collapsed {
		width: 48px;
	}
	.kw-panel-head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 12px;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.kw-panel.collapsed .kw-panel-head {
		flex-direction: column;
		padding: 16px 4px;
		gap: 12px;
	}
	.kw-collapse-btn {
		background: none;
		border: none;
		padding: 4px;
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--color-text-muted);
		display: grid;
		place-items: center;
	}
	.kw-collapse-btn:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.kw-panel-title {
		font-size: 14px;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.kw-collapsed-label {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 1px;
		color: var(--color-text-muted);
		writing-mode: vertical-rl;
		transform: rotate(180deg);
	}
	.kw-panel-body {
		padding: 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.kw-section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.kw-section-title {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
		color: var(--color-text);
	}
	.kw-section-count {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.kw-section-weight {
		font-size: 12px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		padding: 1px 6px;
		border-radius: var(--radius-full);
	}
	.kw-section-coeur .kw-section-weight {
		background: var(--color-success-light);
		color: var(--color-success);
	}
	.kw-section-bonus .kw-section-weight {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.kw-section-eviter .kw-section-weight {
		background: var(--color-danger-light);
		color: var(--color-danger);
	}
	.kw-chips {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.kw-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 4px 4px 10px;
		border-radius: var(--radius-full);
		font-size: 12px;
		line-height: 1.2;
		font-weight: 500;
		background: var(--color-surface-alt);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.kw-section-coeur .kw-chip {
		background: var(--color-success-light);
		color: var(--color-success);
		border-color: color-mix(in srgb, var(--color-success) 20%, transparent);
	}
	.kw-section-bonus .kw-chip {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: color-mix(in srgb, var(--color-primary) 20%, transparent);
	}
	.kw-section-eviter .kw-chip {
		background: var(--color-danger-light);
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
	}
	.kw-chip-text {
		white-space: nowrap;
	}
	.kw-chip-remove {
		background: none;
		border: none;
		padding: 2px;
		border-radius: var(--radius-full);
		cursor: pointer;
		display: grid;
		place-items: center;
		color: inherit;
		opacity: 0.6;
		transition: opacity 150ms;
	}
	.kw-chip-remove:hover {
		opacity: 1;
	}
	.kw-chip-remove:disabled {
		cursor: not-allowed;
	}
	.kw-chip-add {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 500;
		background: transparent;
		color: var(--color-text-muted);
		border: 1px dashed var(--color-border-strong);
		cursor: pointer;
		font-family: inherit;
	}
	.kw-chip-add:hover {
		color: var(--color-text);
		border-color: var(--color-text-muted);
	}
	.kw-chip-add:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.kw-chip-input-wrap {
		padding: 4px 4px 4px 6px;
	}
	.kw-chip-input-wrap form {
		display: inline-flex;
	}
	.kw-chip-input {
		font-size: 12px;
		border: none;
		background: transparent;
		outline: none;
		width: 120px;
		color: inherit;
		font-family: inherit;
	}
	.kw-readonly-note {
		margin: 8px 0 0;
		padding: 8px 12px;
		font-size: 11px;
		color: var(--color-text-muted);
		background: var(--color-surface-alt);
		border-radius: var(--radius-md);
		text-align: center;
	}
</style>
