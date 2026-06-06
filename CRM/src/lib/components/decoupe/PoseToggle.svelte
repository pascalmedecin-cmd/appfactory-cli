<!--
  Choix exclusif du mode de découpe d'une vitre (Découpe Films) :
  « Découpe atelier » (défaut) vs « Sur mesure fournisseur ».
  `value` ($bindable boolean) : true = sur mesure fournisseur (hors nesting),
  false = découpe atelier (entre dans l'optimisation). Mappe 1:1 le champ
  booléen `sur_mesure_fournisseur` existant (zéro changement back/optimiseur).
-->
<script lang="ts">
	let { value = $bindable(false), idPrefix = 'pose' }: { value?: boolean; idPrefix?: string } = $props();
</script>

<div class="seg" role="radiogroup" aria-label="Mode de découpe">
	<button
		type="button"
		class="seg-opt"
		class:sel={!value}
		data-pose="atelier"
		role="radio"
		aria-checked={!value}
		id={`${idPrefix}-atelier`}
		onclick={() => (value = false)}
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
		Découpe atelier
	</button>
	<button
		type="button"
		class="seg-opt"
		class:sel={value}
		data-pose="fournisseur"
		role="radio"
		aria-checked={value}
		id={`${idPrefix}-fournisseur`}
		onclick={() => (value = true)}
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
		Sur mesure fournisseur
	</button>
</div>

<style>
	.seg {
		display: inline-flex;
		padding: 4px;
		border-radius: var(--radius-xl);
		background: var(--df-surface-sunken, #f3f4f6);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
	.seg-opt {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 16px;
		border-radius: var(--radius-lg);
		font-size: 13.5px;
		font-weight: 600;
		font-family: inherit;
		/* text-body (#374151), pas text-muted : AA 4.5:1 sur la piste sunken #f3f4f6
		   (text-muted #6b7280 y tombe à 4.39, axe serious). */
		color: var(--color-text-body);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color var(--df-dur, 240ms) var(--ease-out-expo), background var(--df-dur, 240ms) var(--ease-out-expo), box-shadow var(--df-dur, 240ms) var(--ease-out-expo);
	}
	.seg-opt :global(svg) {
		width: 16px;
		height: 16px;
		flex: none;
	}
	.seg-opt[data-pose='atelier'].sel {
		color: var(--color-primary);
		background: var(--color-surface);
		box-shadow: var(--shadow-xs);
	}
	.seg-opt[data-pose='fournisseur'].sel {
		color: var(--df-amber-tx, #b54708);
		background: var(--color-surface);
		box-shadow: var(--shadow-xs);
	}
	@media (max-width: 560px) {
		.seg {
			width: 100%;
		}
		.seg-opt {
			flex: 1;
			justify-content: center;
			padding: 0 10px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.seg-opt {
			transition: none;
		}
	}
</style>
