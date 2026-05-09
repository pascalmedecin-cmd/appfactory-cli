<script lang="ts">
	import type { PipelineEtapeStat } from '$lib/server/reporting';
	import { formatCHF } from '$lib/utils/reportingFormat';
	import { config } from '$lib/config';

	type Props = {
		stats: PipelineEtapeStat[];
	};

	let { stats }: Props = $props();

	const ETAPE_LABELS: Record<string, string> = Object.fromEntries(
		config.pipeline.etapes.map((e) => [e.key, e.label])
	);

	const totalCount = $derived(stats.reduce((sum, s) => sum + s.count, 0));
	const totalMontant = $derived(stats.reduce((sum, s) => sum + s.montant_total, 0));
</script>

{#if stats.length === 0}
	<div class="empty">Aucune opportunité enregistrée.</div>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Étape</th>
					<th class="num">Opportunités</th>
					<th class="num">Montant total</th>
				</tr>
			</thead>
			<tbody>
				{#each stats as stat (stat.etape)}
					<tr>
						<td>{ETAPE_LABELS[stat.etape] ?? stat.etape}</td>
						<td class="num tabular-nums">{stat.count}</td>
						<td class="num tabular-nums">{formatCHF(stat.montant_total)}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td>Total</td>
					<td class="num tabular-nums">{totalCount}</td>
					<td class="num tabular-nums">{formatCHF(totalMontant)}</td>
				</tr>
			</tfoot>
		</table>
	</div>
{/if}

<style>
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	thead th {
		text-align: left;
		text-transform: uppercase;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		font-weight: 600;
		padding: 12px;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-alt);
	}
	tbody td {
		padding: 12px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
	}
	tbody tr:last-child td {
		border-bottom: 1px solid var(--color-border);
	}
	tfoot td {
		padding: 12px;
		font-weight: 700;
		color: var(--color-primary-dark);
		background: var(--color-surface-alt);
	}
	.num {
		text-align: right;
	}
	.empty {
		text-align: center;
		padding: 24px;
		color: var(--color-text-muted);
		font-size: 13px;
	}
</style>
