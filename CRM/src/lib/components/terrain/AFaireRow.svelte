<script lang="ts">
	/**
	 * AFaireRow — une relance due (DESIGN.md § 4.4). Une seule colonne d'info,
	 * une seule cible (la ligne entière). Pas de second bouton, pas de badge/score.
	 * Drill-down vers la fiche entreprise.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { formatRelativeDate } from './relative-date';

	type Props = {
		href: string;
		raisonSociale: string | null;
		titreOpportunite: string | null;
		dateRelance: string | null;
	};
	let { href, raisonSociale, titreOpportunite, dateRelance }: Props = $props();

	const rel = $derived(formatRelativeDate(dateRelance));
	const contexte = $derived(
		[titreOpportunite, rel ? `relance ${rel}` : null].filter(Boolean).join(' · '),
	);
</script>

<a {href} class="row">
	<div class="info">
		<span class="text-[18px] leading-6 font-semibold text-[var(--color-text)] truncate block">
			{raisonSociale ?? 'Entreprise'}
		</span>
		{#if contexte}
			<span class="text-base text-[var(--color-text-muted)] truncate block">{contexte}</span>
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
