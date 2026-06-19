<script lang="ts">
	/**
	 * Primitive partagee « pill de source » (refonte Vague 2).
	 * Affiche la provenance d'une entreprise/lead (Zefix, Google, Terrain, Veille, ...).
	 * Le mapping label/variant est calcule en amont par `sourceMetaFor` (helper pur teste) :
	 * ce composant ne fait QUE le rendu (jamais d'invention de sens sur une source inconnue).
	 */
	import type { SourceVariant } from '$lib/utils/entreprisesFormat';

	let { label, variant = 'neutral' }: { label: string; variant?: SourceVariant } = $props();
</script>

<span class="src src-{variant}" title={label}>{label}</span>

<style>
	.src {
		display: inline-flex;
		align-items: center;
		padding: 3px 9px;
		border-radius: var(--radius-md);
		font-size: 11.5px;
		font-weight: 600;
		line-height: 1.3;
		white-space: nowrap;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* Contrastes texte AA vérifiés (WCAG 4.5:1) : zefix #3c5840/#eef3ee ≈ 6.7:1,
	   terrain #6f4f6e/#f2ecf1 ≈ 6.7:1 (reprend les teintes tab-entreprises/tab-terrain,
	   assombries pour l'usage texte). google/veille via tokens -deep déjà calibrés AA. */
	.src-zefix {
		background: #eef3ee;
		color: #3c5840;
	}
	.src-google {
		background: var(--color-prosp-place-bg);
		color: var(--color-prosp-place-deep);
	}
	.src-terrain {
		background: #f2ecf1;
		color: #6f4f6e;
	}
	.src-veille {
		background: var(--color-prosp-enrich-bg);
		color: var(--color-prosp-enrich-deep);
	}
	.src-neutral {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
</style>
