<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';
	import { invalidateAll } from '$app/navigation';

	let {
		selectedIds = $bindable(new Set<string>()),
		enrichBatchIds = $bindable<string[]>([]),
		enrichBatchOpen = $bindable(false),
	}: {
		selectedIds?: Set<string>;
		enrichBatchIds?: string[];
		enrichBatchOpen?: boolean;
	} = $props();

	// V2.9 audit S160 : ConfirmModal au-dessus de N=10 prospects pour action destructive (Écarter).
	// + Toast undo pendant 5s pour rejouer (statut=nouveau) sur les ids écartés.
	const CONFIRM_THRESHOLD = 10;

	let confirmEcarterOpen = $state(false);
	let ecarterFormRef = $state<HTMLFormElement | null>(null);

	function handleEcarterClick(e: Event) {
		const count = selectedIds.size;
		if (count >= CONFIRM_THRESHOLD) {
			e.preventDefault();
			confirmEcarterOpen = true;
		}
		// Sinon submit normal (count < seuil).
	}

	async function undoBatch(ids: string[]) {
		try {
			const fd = new FormData();
			fd.set('ids', JSON.stringify(ids));
			fd.set('statut', 'nouveau');
			const res = await fetch('?/batchStatut', { method: 'POST', body: fd });
			if (res.ok) {
				toasts.success(`${ids.length} prospect${ids.length > 1 ? 's restaurés' : ' restauré'}`);
				await invalidateAll();
			} else {
				toasts.error('Annulation impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		}
	}
</script>

{#if selectedIds.size > 0}
	<div
		class="flex flex-wrap items-center gap-2 md:gap-3 p-3 rounded-xl border shadow-xs"
		role="toolbar"
		aria-label="Actions sélection"
		style="background: linear-gradient(to right, var(--color-prosp-import-bg), var(--color-prosp-enrich-bg)); border-color: color-mix(in srgb, var(--color-prosp-import-border), transparent 75%)"
	>
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
			<button type="submit" class="inline-flex items-center gap-1.5 h-10 px-4 box-border text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 cursor-pointer transition-colors">
				<Icon name="thumb_up" size={16} />
				Marquer intéressé
			</button>
		</form>
		<form
			method="POST"
			action="?/batchStatut"
			bind:this={ecarterFormRef}
			use:enhance={() => {
				const count = selectedIds.size;
				const ids = [...selectedIds];
				return async ({ result, update }) => {
					selectedIds = new Set();
					if (result.type === 'success') {
						toasts.withAction(
							`${count} prospect${count > 1 ? 's écartés' : ' écarté'}`,
							{ label: 'Annuler', handler: () => undoBatch(ids) },
							'info',
							5000,
						);
					} else {
						toasts.error('Erreur lors de la mise à jour');
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
			<input type="hidden" name="statut" value="ecarte" />
			<button
				type="submit"
				onclick={handleEcarterClick}
				class="inline-flex items-center gap-1.5 h-10 px-4 box-border text-sm text-text-muted border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors"
			>
				<Icon name="block" size={16} />
				Écarter
			</button>
		</form>
		<button
			onclick={() => { enrichBatchIds = [...selectedIds]; enrichBatchOpen = true; }}
			class="inline-flex items-center gap-1.5 h-10 px-4 box-border text-sm font-medium border rounded-lg cursor-pointer transition-colors text-prosp-enrich border-prosp-enrich hover:bg-prosp-enrich/10"
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

<ConfirmModal
	bind:open={confirmEcarterOpen}
	title="Écarter {selectedIds.size} prospects ?"
	message="Cette action peut être annulée pendant 5 secondes via le toast de confirmation."
	confirmLabel="Écarter"
	cancelLabel="Annuler"
	variant="danger"
	onConfirm={() => {
		confirmEcarterOpen = false;
		ecarterFormRef?.requestSubmit();
	}}
/>
