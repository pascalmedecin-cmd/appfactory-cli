<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';

	let {
		selectedIds = $bindable(new Set<string>()),
		enrichBatchIds = $bindable<string[]>([]),
		enrichBatchOpen = $bindable(false),
	}: {
		selectedIds?: Set<string>;
		enrichBatchIds?: string[];
		enrichBatchOpen?: boolean;
	} = $props();
</script>

{#if selectedIds.size > 0}
	<div class="flex flex-wrap items-center gap-2 md:gap-3 p-3 rounded-xl border shadow-xs" style="background: linear-gradient(to right, var(--color-prosp-import-bg), var(--color-prosp-enrich-bg)); border-color: color-mix(in srgb, var(--color-prosp-import-border), transparent 75%)">
		<span class="text-sm font-semibold text-text w-full md:w-auto">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
		<form method="POST" action="?/batchStatut" use:enhance={() => {
			const count = selectedIds.size;
			return async ({ result, update }) => {
				selectedIds = new Set();
				if (result.type === 'success') toasts.success(`${count} prospect${count > 1 ? 's' : ''} marqué${count > 1 ? 's' : ''} intéressé${count > 1 ? 's' : ''}`);
				else toasts.error('Erreur lors de la mise à jour');
				await update();
			};
		}}>
			<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
			<input type="hidden" name="statut" value="interesse" />
			<button type="submit" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 cursor-pointer transition-colors">
				<Icon name="thumb_up" size={16} />
				Marquer intéressé
			</button>
		</form>
		<form method="POST" action="?/batchStatut" use:enhance={() => {
			const count = selectedIds.size;
			return async ({ result, update }) => {
				selectedIds = new Set();
				if (result.type === 'success') toasts.success(`${count} prospect${count > 1 ? 's' : ''} écarté${count > 1 ? 's' : ''}`);
				else toasts.error('Erreur lors de la mise à jour');
				await update();
			};
		}}>
			<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
			<input type="hidden" name="statut" value="ecarte" />
			<button type="submit" class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors">
				<Icon name="block" size={16} />
				Écarter
			</button>
		</form>
		<button
			onclick={() => { enrichBatchIds = [...selectedIds]; enrichBatchOpen = true; }}
			class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg cursor-pointer transition-colors text-prosp-enrich border-prosp-enrich hover:bg-prosp-enrich/10"
		>
			<Icon name="auto_fix_high" size={16} />
			Enrichir
		</button>
		<button
			onclick={() => selectedIds = new Set()}
			class="md:ml-auto text-sm text-text-muted hover:text-text cursor-pointer"
		>
			Désélectionner
		</button>
	</div>
{/if}
