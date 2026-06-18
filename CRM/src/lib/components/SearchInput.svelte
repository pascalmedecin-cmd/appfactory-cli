<script lang="ts">
	/**
	 * Primitive de recherche texte des listes CRM (Vague 1 cohérence, 2026-06-18).
	 *
	 * Champ visible et persistant (jamais replié dans les filtres, jamais Cmd+K) :
	 * icône `search` à gauche, bouton clear `X` quand non vide, placeholder explicite,
	 * accessible (`type=search`, aria-label). Composant CONTRÔLÉ : le parent détient la
	 * valeur et la stratégie de données (Prospection = serveur paginé via DataTable,
	 * Signaux = filtrage client borné). Le debounce vit côté parent (SEARCH_DEBOUNCE_MS).
	 *
	 * Source unique du « champ de recherche » nommé dans les primitives partagées du
	 * cadrage refonte CRM. cf. SPEC_VAGUE1_COHERENCE § 1.
	 */
	import Icon from '$lib/components/Icon.svelte';

	let {
		value = '',
		placeholder = 'Rechercher…',
		ariaLabel = placeholder,
		oninput,
		onclear
	}: {
		value?: string;
		placeholder?: string;
		ariaLabel?: string;
		/** Appelé à chaque frappe avec la nouvelle valeur (parent gère état + debounce). */
		oninput?: (value: string) => void;
		/** Appelé au clic sur le bouton clear (sinon `oninput('')`). */
		onclear?: () => void;
	} = $props();

	function handleInput(e: Event) {
		oninput?.((e.target as HTMLInputElement).value);
	}

	function handleClear() {
		if (onclear) onclear();
		else oninput?.('');
	}

	// Null-safety : un appelant futur pourrait passer une valeur nullable ; on borne ici
	// plutôt que de risquer `null.length` (primitive partagée, défense en profondeur).
	const v = $derived(value ?? '');
</script>

<div class="search-input" class:filled={v.length > 0}>
	<Icon name="search" size={16} class="search-input__icon" />
	<input
		type="search"
		value={v}
		oninput={handleInput}
		{placeholder}
		aria-label={ariaLabel}
		class="search-input__field"
	/>
	{#if v.length > 0}
		<button
			type="button"
			class="search-input__clear"
			onclick={handleClear}
			aria-label="Effacer la recherche"
		>
			<Icon name="close" size={16} />
		</button>
	{/if}
</div>

<style>
	.search-input {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 8px 12px;
		gap: 8px;
		transition: border-color 150ms, box-shadow 150ms;
	}
	.search-input:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.search-input.filled {
		border-color: var(--color-border-strong);
	}
	.search-input :global(.search-input__icon) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.search-input__field {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-size: 14px;
		color: var(--color-text);
		font-family: inherit;
	}
	.search-input__field::placeholder {
		color: var(--color-text-muted);
	}
	/* Retire la croix native du type=search (WebKit) : on a notre propre bouton clear. */
	.search-input__field::-webkit-search-decoration,
	.search-input__field::-webkit-search-cancel-button,
	.search-input__field::-webkit-search-results-button,
	.search-input__field::-webkit-search-results-decoration {
		appearance: none;
	}
	.search-input__clear {
		background: none;
		border: none;
		padding: 4px;
		border-radius: var(--radius-full);
		color: var(--color-text-muted);
		cursor: pointer;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		font-family: inherit;
	}
	.search-input__clear:hover {
		color: var(--color-text);
		background: var(--color-surface-alt);
	}
</style>
