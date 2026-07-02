<script lang="ts">
	/**
	 * Contrôle segmenté du statut d'une campagne (En cours / Active) - SOURCE UNIQUE, consommé
	 * par la liste des campagnes ET l'en-tête de la page campagne (mockup v3 golden, 02/07).
	 * Deux moitiés strictement égales (50/50, largeur fixe 176px), un seul remplissage bleu FilmPro
	 * (plus de vert « Active ») : les deux surfaces ne peuvent plus diverger.
	 */
	import { CAMPAGNE_STATUTS, campagneStatutLabel, type CampagneStatut } from '$lib/campagnes';

	// `statut` = valeur brute de la colonne DB (typée `string` ; le CHECK SQL garantit le domaine).
	// Le segment n'allume un bouton que si la valeur matche un statut connu - comportement identique
	// à l'ancien comparatif inline `c.statut === 'en_cours'`.
	let {
		statut,
		busy = false,
		onChange,
		ariaLabel = 'Statut de la campagne',
	}: {
		statut: string;
		busy?: boolean;
		onChange: (s: CampagneStatut) => void;
		ariaLabel?: string;
	} = $props();
</script>

<div class="seg-wrap" role="group" aria-label={ariaLabel}>
	{#each CAMPAGNE_STATUTS as s (s)}
		<button
			type="button"
			class="seg"
			class:on={statut === s}
			aria-pressed={statut === s}
			disabled={busy}
			onclick={() => onChange(s)}
		>{campagneStatutLabel(s)}</button>
	{/each}
</div>

<style>
	.seg-wrap {
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 176px;
		height: 36px;
		padding: 4px;
		gap: 4px;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-sizing: border-box;
	}
	.seg {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 140ms ease, color 140ms ease;
	}
	.seg.on {
		background: var(--color-primary);
		color: #fff;
		font-weight: 600;
		box-shadow: var(--shadow-xs);
	}
	.seg:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.seg:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
</style>
