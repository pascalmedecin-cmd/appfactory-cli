<script lang="ts">
	/**
	 * NativeActionBar — 3 actions natives iOS (DESIGN.md § 4.8) : Appeler /
	 * Itinéraire / Email. Bouton grisé (non masqué) si la donnée est absente
	 * (honnête : « pas de numéro » se voit). AC-005.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { buildNativeActions } from './native-actions';

	type Props = {
		telephone?: string | null;
		adresse?: string | null;
		email?: string | null;
	};
	let { telephone = null, adresse = null, email = null }: Props = $props();

	const actions = $derived(buildNativeActions({ telephone, adresse, email }));
</script>

<div class="bar">
	{#each actions as a (a.kind)}
		{#if a.disabled}
			<span class="act disabled" aria-disabled="true">
				<Icon name={a.icon} size={20} />
				<span class="lbl">{a.label}</span>
			</span>
		{:else}
			<a
				class="act"
				href={a.href}
				rel={a.kind === 'directions' ? 'external' : undefined}
			>
				<Icon name={a.icon} size={20} />
				<span class="lbl">{a.label}</span>
			</a>
		{/if}
	{/each}
</div>

<style>
	.bar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.act {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: 56px;
		border-radius: var(--radius-lg);
		background: var(--color-primary);
		color: var(--color-text-inverse);
		text-decoration: none;
		font-size: 15px;
		font-weight: 600;
	}
	.act:active {
		background: var(--color-primary-hover);
	}
	.act.disabled {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		cursor: not-allowed;
	}
	.lbl {
		line-height: 1;
	}
</style>
