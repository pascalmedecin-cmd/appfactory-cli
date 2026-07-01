<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';
	import { invalidateAll } from '$app/navigation';
	import { isProspectionFeatureEnabled } from '$lib/prospection-flags';

	// V5 (2026-06-07) : enrichissement par lot désactivé (acquisition de masse coupée).
	const batchEnrichEnabled = isProspectionFeatureEnabled('batchEnrichment');

	let {
		selectedIds = $bindable(new Set<string>()),
		enrichBatchIds = $bindable<string[]>([]),
		enrichBatchOpen = $bindable(false),
		showDismissed = false,
	}: {
		selectedIds?: Set<string>;
		enrichBatchIds?: string[];
		enrichBatchOpen?: boolean;
		// Lot 2 : en vue « Écartés » (showDismissed), la liste ne contient que des leads déjà
		// écartés -> le bouton devient « Réactiver » (statut=vide) au lieu de « Écarter » (no-op).
		showDismissed?: boolean;
	} = $props();

	// V2.9 audit S160 : ConfirmModal au-dessus de N=10 prospects pour action destructive (Écarter).
	// + Toast undo pendant 5s pour rejouer l'action inverse sur les ids traités.
	const CONFIRM_THRESHOLD = 10;

	let confirmEcarterOpen = $state(false);
	let ecarterFormRef = $state<HTMLFormElement | null>(null);

	// Statut appliqué par l'action principale (Réactiver=vide en vue écartés, Écarter=ecarte sinon).
	const mainStatut = $derived(showDismissed ? 'vide' : 'ecarte');

	function handleEcarterClick(e: Event) {
		// Confirmation réservée à l'action destructive « Écarter » (jamais pour « Réactiver »).
		if (!showDismissed && selectedIds.size >= CONFIRM_THRESHOLD) {
			e.preventDefault();
			confirmEcarterOpen = true;
		}
		// Sinon submit normal.
	}

	async function undoBatch(ids: string[], statut: string) {
		try {
			const fd = new FormData();
			fd.set('ids', JSON.stringify(ids));
			fd.set('statut', statut);
			const res = await fetch('?/batchStatut', { method: 'POST', body: fd });
			if (res.ok) {
				const msg = statut === 'ecarte'
					? `${ids.length} prospect${ids.length > 1 ? 's écartés' : ' écarté'}`
					: `${ids.length} prospect${ids.length > 1 ? 's restaurés' : ' restauré'}`;
				toasts.success(msg);
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
		class="flex flex-wrap items-center gap-2 md:gap-3 p-3 rounded-xl border border-prosp-import-border/25 shadow-xs"
		role="toolbar"
		aria-label="Actions sélection"
		style="background: var(--color-prosp-import-bg)"
	>
		<span class="text-sm font-semibold text-text w-full md:w-auto">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
		<form
			method="POST"
			action="?/batchStatut"
			bind:this={ecarterFormRef}
			use:enhance={() => {
				const count = selectedIds.size;
				const ids = [...selectedIds];
				// Capturer la vue au moment du submit (showDismissed peut changer à la navigation).
				const wasDismissed = showDismissed;
				return async ({ result, update }) => {
					selectedIds = new Set();
					if (result.type === 'success') {
						const label = wasDismissed
							? `${count} prospect${count > 1 ? 's réactivés' : ' réactivé'}`
							: `${count} prospect${count > 1 ? 's écartés' : ' écarté'}`;
						toasts.withAction(
							label,
							{ label: 'Annuler', handler: () => undoBatch(ids, wasDismissed ? 'ecarte' : 'vide') },
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
			<input type="hidden" name="statut" value={mainStatut} />
			<button
				type="submit"
				onclick={handleEcarterClick}
				class="inline-flex items-center gap-1.5 h-10 px-4 box-border text-sm text-text-muted border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors"
			>
				<Icon name={showDismissed ? 'unarchive' : 'block'} size={16} />
				{showDismissed ? 'Réactiver' : 'Écarter'}
			</button>
		</form>
		{#if batchEnrichEnabled}
		<button
			onclick={() => { enrichBatchIds = [...selectedIds]; enrichBatchOpen = true; }}
			class="inline-flex items-center gap-1.5 h-10 px-4 box-border text-sm font-medium border rounded-lg cursor-pointer transition-colors text-prosp-enrich-deep border-prosp-enrich hover:bg-prosp-enrich/10"
		>
			<Icon name="auto_fix_high" size={16} />
			Enrichir
		</button>
		{/if}
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
