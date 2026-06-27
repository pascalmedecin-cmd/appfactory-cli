<script lang="ts">
	/**
	 * Bouton « lead express » (terrain, mobile + tablette). Bloc D : factorisé depuis
	 * DashboardTemporel.svelte et crm/+page.svelte qui en dupliquaient le markup + ~50 lignes
	 * de CSS à l'identique. `class` passe les utilitaires Tailwind du parent (ex. `lg:hidden`,
	 * et la coquille d'animation `stagger` côté DashboardTemporel via un wrapper).
	 */
	import Icon from '$lib/components/Icon.svelte';

	let { onclick, class: klass = '' }: { onclick: () => void; class?: string } = $props();
</script>

<button
	type="button"
	{onclick}
	class="lead-express-mobile {klass}"
	aria-label="Saisir un nouveau lead express depuis le terrain"
>
	<span class="lead-express-icon">
		<Icon name="bolt" size={20} strokeWidth={1.75} />
	</span>
	<span class="lead-express-body">
		<span class="lead-express-title">Nouveau lead express</span>
		<span class="lead-express-sub">Saisie rapide post-RDV : entreprise + contact + tél + note</span>
	</span>
	<Icon name="arrow_forward" size={16} strokeWidth={2.5} />
</button>

<style>
	.lead-express-mobile {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius-xl);
		background: var(--color-primary);
		color: white;
		border: 0;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--color-primary) 30%, transparent);
		transition:
			background 200ms var(--ease-out-expo),
			transform 200ms var(--ease-out-expo);
	}
	.lead-express-mobile:hover {
		background: var(--color-primary-hover);
		transform: translateY(-1px);
	}
	.lead-express-mobile:focus-visible {
		outline: 2px solid var(--color-primary-light);
		outline-offset: 2px;
	}
	.lead-express-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.15);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.lead-express-body {
		flex: 1;
		min-width: 0;
	}
	.lead-express-title {
		display: block;
		font-size: 14px;
		font-weight: 600;
	}
	.lead-express-sub {
		display: block;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.lead-express-mobile {
			transition: none;
		}
		.lead-express-mobile:hover {
			transform: none;
		}
	}
</style>
