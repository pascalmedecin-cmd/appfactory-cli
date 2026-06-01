<script lang="ts">
	/** EntrepriseResultRow — résultat de recherche (DESIGN.md § 4.6). Même
	 * grammaire visuelle qu'AFaireRow : une ligne = une entité = un tap. */
	import Icon from '$lib/components/Icon.svelte';

	type Props = { href: string; raisonSociale: string; canton: string | null };
	let { href, raisonSociale, canton }: Props = $props();
</script>

<a {href} class="row">
	<div class="info">
		<span class="text-[18px] leading-6 font-semibold text-[var(--color-text)] truncate block">
			{raisonSociale}
		</span>
		{#if canton}
			<span class="text-base text-[var(--color-text-muted)] truncate block">{canton}</span>
		{/if}
	</div>
	<Icon name="chevron_right" size={22} class="chevron" />
</a>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 64px;
		padding: 12px 14px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-2xl);
		text-decoration: none;
	}
	.row:active {
		background: var(--color-surface-alt);
	}
	.info {
		min-width: 0;
		flex: 1 1 auto;
	}
	.row :global(.chevron) {
		flex: 0 0 auto;
		color: var(--color-text-muted);
	}
</style>
