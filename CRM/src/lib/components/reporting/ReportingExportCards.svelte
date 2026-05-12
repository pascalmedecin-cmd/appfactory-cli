<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { ExportEntry } from '$lib/utils/reportingFormat';

	type Props = {
		entries: ExportEntry[];
	};

	let { entries }: Props = $props();

	function formatTotal(n: number): string {
		if (n === 0) return 'Toutes lignes — CSV';
		return `${n} ${n === 1 ? 'ligne' : 'lignes'} — CSV`;
	}
</script>

<div class="export-grid">
	{#each entries as entry (entry.key)}
		<a
			href={entry.href}
			class="export-card"
			aria-label="Télécharger l'export {entry.label} au format CSV"
		>
			<div class="export-card-header">
				<div class="export-card-icon">
					<Icon name={entry.icon} size={22} />
				</div>
				<div class="export-card-title-block">
					<div class="export-card-title">{entry.label}</div>
					<div class="export-card-meta tabular-nums">{formatTotal(entry.total)}</div>
				</div>
			</div>
			<div class="export-card-hint">{entry.hint}</div>
			<div class="export-card-cta">
				<Icon name="download" size={16} />
				<span>Télécharger</span>
			</div>
		</a>
	{/each}
</div>

<style>
	.export-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}
	.export-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		text-decoration: none;
		color: inherit;
		transition: transform 200ms var(--ease-out-expo), box-shadow 200ms ease, border-color 180ms ease;
	}
	.export-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-primary);
	}
	.export-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.export-card-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.export-card-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		background: radial-gradient(circle at 30% 30%, rgba(47, 90, 158, 0.12), rgba(47, 90, 158, 0.02));
		color: var(--color-primary);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.export-card-title-block {
		min-width: 0;
		flex: 1;
	}
	.export-card-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-primary-dark);
	}
	.export-card-meta {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 2px;
	}
	.export-card-hint {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
	.export-card-cta {
		margin-top: auto;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-primary);
	}
	@media (prefers-reduced-motion: reduce) {
		.export-card {
			transition: none;
		}
		.export-card:hover {
			transform: none;
		}
	}
</style>
