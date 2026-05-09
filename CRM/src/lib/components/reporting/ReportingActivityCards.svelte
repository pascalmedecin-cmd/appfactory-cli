<script lang="ts">
	import type { ActivityStats } from '$lib/server/reporting';

	type Card = {
		title: string;
		stats: ActivityStats;
	};

	type Props = {
		contacts: ActivityStats;
		entreprises: ActivityStats;
		opportunites: ActivityStats;
	};

	let { contacts, entreprises, opportunites }: Props = $props();

	const cards: Card[] = $derived([
		{ title: 'Contacts', stats: contacts },
		{ title: 'Entreprises', stats: entreprises },
		{ title: 'Opportunités', stats: opportunites },
	]);
</script>

<div class="activity-grid">
	{#each cards as card (card.title)}
		<div class="card">
			<h4>{card.title}</h4>
			<div class="big tabular-nums">{card.stats.last_30_days}</div>
			<div class="hint">30 derniers jours</div>
			<div class="row">
				<span class="label">90 derniers jours</span>
				<span class="value tabular-nums">{card.stats.last_90_days}</span>
			</div>
			<div class="row">
				<span class="label">Total</span>
				<span class="value tabular-nums">{card.stats.total}</span>
			</div>
		</div>
	{/each}
</div>

<style>
	.activity-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 24px;
	}
	.card h4 {
		margin: 0;
		font-size: 12px;
		color: var(--color-text-muted);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.big {
		font-size: 32px;
		font-weight: 700;
		color: var(--color-primary-dark);
		letter-spacing: -0.02em;
		line-height: 1.1;
		margin-top: 8px;
	}
	.hint {
		font-size: 11px;
		color: var(--color-text-muted);
		margin-top: 2px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--color-border);
		font-size: 13px;
	}
	.row + .row {
		margin-top: 8px;
		padding-top: 8px;
	}
	.label {
		color: var(--color-text-muted);
	}
	.value {
		font-weight: 600;
		color: var(--color-text);
	}

	@media (max-width: 1024px) {
		.activity-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
