<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';
	import { POIDS_PAR_CATEGORIE, type KeywordRow, type KeywordCategorie } from '$lib/scoring/keywords';

	type Props = {
		keywords: KeywordRow[];
		canEdit: boolean;
		// V4 (S189) : le panneau devient un drawer overlay déclenché par un bouton
		// dans la toolbar. L'ancienne sidebar sticky 320px squattait l'écran et
		// imposait un layout 2 colonnes ; ici on libère 100 % pour les cards et
		// l'édition reste à 1 clic via le drawer.
		open: boolean;
		onClose: () => void;
	};

	let { keywords, canEdit, open, onClose }: Props = $props();

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

	// Échap ferme le drawer (sauf si un input d'ajout est ouvert : Échap annule d'abord
	// l'ajout, puis ferme le drawer au second Échap).
	// V4 fix (S189) : `$effect` au lieu de `onMount` + `onDestroy`. Raison : `onDestroy`
	// s'exécute aussi côté SSR (cleanup post-render), or `window` y est undefined → 500.
	// `$effect` ne tourne QUE côté client, son cleanup callback aussi. Idiom Svelte 5.
	function onWindowKeydown(e: KeyboardEvent) {
		if (!open || e.key !== 'Escape') return;
		if (addingFor) return; // l'input gère son propre Échap
		onClose();
	}

	$effect(() => {
		window.addEventListener('keydown', onWindowKeydown);
		return () => window.removeEventListener('keydown', onWindowKeydown);
	});
</script>

{#if open}
	<button
		type="button"
		class="kw-backdrop"
		onclick={onClose}
		aria-label="Fermer le panneau pertinence"
	></button>
{/if}

<div
	class="kw-drawer"
	class:open
	role="dialog"
	aria-modal="true"
	aria-labelledby="kw-drawer-title"
	aria-hidden={!open}
	tabindex="-1"
>
	<header class="kw-drawer-head">
		<div class="kw-drawer-head-text">
			<h2 id="kw-drawer-title" class="kw-drawer-title">Mots-clés de pertinence</h2>
			<p class="kw-drawer-subtitle">
				{canEdit ? 'Pilote le scoring SIMAP & Zefix.' : 'Édition réservée aux admins FilmPro.'}
			</p>
		</div>
		<button
			type="button"
			class="kw-drawer-close"
			onclick={onClose}
			aria-label="Fermer"
		>
			<Icon name="close" size={20} />
		</button>
	</header>

	<div class="kw-drawer-body">
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
	</div>
</div>

<style>
	/* Backdrop overlay : assombrit l'écran derrière le drawer, click pour fermer. */
	.kw-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(17, 24, 39, 0.4);
		border: none;
		padding: 0;
		cursor: pointer;
		z-index: 80;
		animation: fadeIn 200ms var(--ease-out-expo, ease-out);
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Drawer principal : slide-in à droite, 440px max, fond surface premium. */
	.kw-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 440px;
		max-width: 100vw;
		background: var(--color-surface);
		box-shadow: -20px 0 60px -20px rgba(16, 24, 40, 0.16),
		            -8px 0 16px -4px rgba(16, 24, 40, 0.08);
		display: flex;
		flex-direction: column;
		z-index: 81;
		transform: translateX(100%);
		transition: transform 240ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
		visibility: hidden;
	}
	.kw-drawer.open {
		transform: translateX(0);
		visibility: visible;
	}
	@media (prefers-reduced-motion: reduce) {
		.kw-drawer {
			transition: none;
		}
		.kw-backdrop {
			animation: none;
		}
	}

	/* Header du drawer : titre + sous-titre + bouton fermeture. */
	.kw-drawer-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 24px 24px 16px;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.kw-drawer-head-text {
		flex: 1;
		min-width: 0;
	}
	.kw-drawer-title {
		font-size: 18px;
		font-weight: 600;
		line-height: 1.2;
		margin: 0 0 4px;
		color: var(--color-text);
	}
	.kw-drawer-subtitle {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.4;
	}
	.kw-drawer-close {
		background: none;
		border: none;
		padding: 8px;
		margin: -8px -8px 0 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--color-text-muted);
		display: grid;
		place-items: center;
		transition: background 150ms, color 150ms;
	}
	.kw-drawer-close:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.kw-drawer-close:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Body scrollable. */
	.kw-drawer-body {
		padding: 24px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.kw-section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	.kw-section-title {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.6px;
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
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}
	.kw-section-coeur .kw-section-weight {
		background: var(--color-success-light);
		color: var(--color-success-deep);
	}
	.kw-section-bonus .kw-section-weight {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.kw-section-eviter .kw-section-weight {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
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
		color: var(--color-success-deep);
		border-color: color-mix(in srgb, var(--color-success) 20%, transparent);
	}
	.kw-section-bonus .kw-chip {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: color-mix(in srgb, var(--color-primary) 20%, transparent);
	}
	.kw-section-eviter .kw-chip {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
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
		transition: color 150ms, border-color 150ms, background 150ms;
	}
	.kw-chip-add:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background: var(--color-primary-light);
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
		width: 140px;
		color: inherit;
		font-family: inherit;
	}
</style>
