<script lang="ts">
	/** Onglet « À faire » — liste des relances dues (AC-003). */
	import MobileShell from '$lib/components/terrain/MobileShell.svelte';
	import AFaireRow from '$lib/components/terrain/AFaireRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const count = $derived(data.relances.length);
	const subtitle = $derived(
		count === 0 ? null : count === 1 ? '1 relance' : `${count} relances`,
	);
</script>

<MobileShell title="À faire" {subtitle}>
	{#if data.loadError}
		<div class="state" role="alert">
			<p class="text-base text-[var(--color-text-body)]">Impossible de charger les relances.</p>
			<a href="/terrain" class="retry">Réessayer</a>
		</div>
	{:else if count === 0}
		<div class="state">
			<Icon name="checklist" size={40} class="empty-icon" />
			<p class="text-base text-[var(--color-text-body)] font-medium">Rien à relancer aujourd'hui</p>
			<p class="text-base text-[var(--color-text-muted)]">
				Cherche une entreprise via l'onglet Rechercher.
			</p>
		</div>
	{:else}
		<ul class="list">
			{#each data.relances as r (r.id)}
				<li>
					<AFaireRow
						href={`/terrain/entreprise/${r.entreprise_id}`}
						raisonSociale={r.raison_sociale}
						titreOpportunite={r.titre}
						dateRelance={r.date_relance_prevue}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</MobileShell>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--mobile-row-gap);
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
		padding: 48px 16px;
	}
	.state :global(.empty-icon) {
		color: var(--color-text-muted);
		opacity: 0.7;
		margin-bottom: 4px;
	}
	.retry {
		margin-top: 8px;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		padding: 0 20px;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-text-inverse);
		font-weight: 600;
		text-decoration: none;
	}
</style>
