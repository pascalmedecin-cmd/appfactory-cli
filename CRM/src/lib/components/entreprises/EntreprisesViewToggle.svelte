<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { EntreprisesView } from '$lib/utils/entreprisesFormat';

	type Props = {
		view: EntreprisesView;
		onChange: (view: EntreprisesView) => void;
	};

	let { view, onChange }: Props = $props();
</script>

<div class="view-toggle" role="group" aria-label="Choisir la vue">
	<button
		type="button"
		aria-pressed={view === 'table'}
		aria-label="Vue tableau"
		title="Vue tableau"
		onclick={() => onChange('table')}
	>
		<Icon name="table_rows" size={16} />
	</button>
	<button
		type="button"
		aria-pressed={view === 'cards'}
		aria-label="Vue cartes"
		title="Vue cartes"
		onclick={() => onChange('cards')}
	>
		<Icon name="grid_view" size={16} />
	</button>
</div>

<style>
	.view-toggle {
		display: inline-flex;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 2px;
		gap: 2px;
		height: 32px;
	}
	button {
		width: 32px;
		height: 100%;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 4px;
		display: grid;
		place-items: center;
		color: var(--color-text-muted);
		transition: background 150ms ease, color 150ms ease;
	}
	button:hover {
		color: var(--color-text);
	}
	button[aria-pressed='true'] {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: 0 1px 2px rgba(17, 24, 39, 0.08);
	}
	button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
