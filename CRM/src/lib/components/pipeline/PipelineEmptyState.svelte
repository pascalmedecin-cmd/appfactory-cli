<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	type Etape = {
		key: string;
		label: string;
		icon: string;
	};

	type Props = {
		etape: Etape;
		onAdd?: (etapeKey: string) => void;
	};

	let { etape, onAdd }: Props = $props();

	function description(key: string): string {
		switch (key) {
			case 'identification':
				return 'Créez la première opportunité ou importez depuis un signal.';
			case 'qualification':
			case 'proposition':
			case 'negociation':
				return 'Glissez une opportunité depuis l\'étape précédente.';
			case 'gagne':
				return 'Aucune opportunité gagnée pour l\'instant.';
			case 'perdu':
				return 'Aucune perte sur la période.';
			default:
				return 'Pas d\'opportunité dans cette étape.';
		}
	}

	const showCta = $derived(etape.key !== 'gagne' && etape.key !== 'perdu');
</script>

<div class="col-empty">
	<div class="col-empty-icon">
		<Icon name={etape.icon} size={20} />
	</div>
	<h2 class="col-empty-title">Aucune opportunité</h2>
	<p class="col-empty-desc">{description(etape.key)}</p>
	{#if showCta && onAdd}
		<button
			type="button"
			class="col-empty-cta"
			onclick={() => onAdd?.(etape.key)}
		>
			<Icon name="add" size={12} />
			Ajouter dans {etape.label}
		</button>
	{/if}
</div>

<style>
	.col-empty {
		text-align: center;
		padding: 32px 16px;
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.col-empty-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		display: grid;
		place-items: center;
		color: var(--color-text-muted);
		margin-bottom: 4px;
	}
	.col-empty-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-body);
		margin: 0;
	}
	.col-empty-desc {
		font-size: 12px;
		color: var(--color-text-muted);
		line-height: 1.4;
		max-width: 220px;
		margin: 0;
	}
	.col-empty-cta {
		margin-top: 4px;
		height: 28px;
		padding: 0 10px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-primary);
		background: transparent;
		border: 1px solid var(--color-primary-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition: background 180ms ease, border-color 180ms ease;
	}
	.col-empty-cta:hover {
		background: var(--color-primary-light);
		border-color: rgba(47, 90, 158, 0.3);
	}
	.col-empty-cta:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
