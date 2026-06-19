<script module lang="ts">
	export type KpiTone = 'primary' | 'success' | 'convert' | 'warn';
	export type KpiItem = {
		icon: string;
		value: number | string;
		label: string;
		tone?: KpiTone;
		/** colore la valeur en ambre (ex. « sans contact > 0 » à surveiller). */
		highlight?: boolean;
	};
</script>

<script lang="ts">
	/**
	 * Primitive partagée « strip de chips KPI » (refonte Vague 2, flag ffCrmListesV2).
	 * Remplace les bandes d'indicateurs géantes 24px (mal « empilement » du cadrage) par
	 * une strip horizontale sobre. Générique : chaque page lui passe ses items déjà calculés.
	 * Cascade prévue : Entreprises, Contacts, Signaux, Prospection, Pipeline, Dashboard.
	 */
	import Icon from '$lib/components/Icon.svelte';

	let { items, ariaLabel = 'Indicateurs' }: { items: KpiItem[]; ariaLabel?: string } = $props();
</script>

<section class="kpi-strip" aria-label={ariaLabel}>
	{#each items as item (item.label)}
		<div class="kpi" class:warn={item.highlight}>
			<span class="kpi-ic {item.tone ?? 'primary'}"><Icon name={item.icon} size={18} /></span>
			<span class="kpi-body">
				<span class="kpi-val tabular-nums">{item.value}</span>
				<span class="kpi-lab">{item.label}</span>
			</span>
		</div>
	{/each}
</section>

<style>
	.kpi-strip {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		padding: 4px 32px 16px;
	}
	.kpi {
		display: inline-flex;
		align-items: center;
		gap: 11px;
		padding: 9px 16px 9px 10px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		transition:
			box-shadow 220ms var(--ease-out-expo),
			transform 220ms var(--ease-out-expo);
	}
	.kpi:hover {
		box-shadow: var(--shadow-card-hover);
		transform: translateY(-1px);
	}
	.kpi-ic {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.kpi-ic.primary {
		background: radial-gradient(circle at 30% 30%, rgba(47, 90, 158, 0.12), rgba(47, 90, 158, 0.02));
		color: var(--color-primary);
	}
	.kpi-ic.success {
		background: radial-gradient(circle at 30% 30%, rgba(18, 183, 106, 0.14), rgba(18, 183, 106, 0.02));
		color: var(--color-success-deep);
	}
	.kpi-ic.convert {
		background: radial-gradient(circle at 30% 30%, rgba(83, 139, 107, 0.16), rgba(83, 139, 107, 0.02));
		color: var(--color-prosp-convert-deep);
	}
	.kpi-ic.warn {
		background: radial-gradient(circle at 30% 30%, rgba(247, 144, 9, 0.14), rgba(247, 144, 9, 0.02));
		color: var(--color-warning-deep);
	}
	.kpi-body {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
		min-width: 0;
	}
	.kpi-val {
		font-size: 19px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-primary-dark);
	}
	.kpi.warn .kpi-val {
		color: var(--color-warning-deep);
	}
	.kpi-lab {
		font-size: 11.5px;
		color: var(--color-text-muted);
		font-weight: 500;
		margin-top: 2px;
	}

	@media (max-width: 640px) {
		.kpi-strip {
			padding: 4px 16px 12px;
			gap: 8px;
		}
		.kpi {
			flex: 1 1 calc(50% - 4px);
		}
	}
</style>
