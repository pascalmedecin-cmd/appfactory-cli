<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	let {
		open = $bindable(false),
		title = '',
		saving = false,
		maxWidth = 'max-w-lg',
		icon = '',
		headerVariant = 'default',
		onSave,
		onDelete,
		children,
		extra,
	}: {
		open?: boolean;
		title?: string;
		saving?: boolean;
		maxWidth?: string;
		icon?: string;
		headerVariant?: 'default' | 'accent';
		onSave?: () => void;
		onDelete?: () => void;
		children?: Snippet;
		extra?: Snippet;
	} = $props();

	let showExtra = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	$effect(() => {
		if (!open) showExtra = false;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 bg-black/30 z-50 cursor-default"
		onclick={() => open = false}
		tabindex="-1"
		aria-label="Fermer"
		transition:fade={{ duration: 150 }}
	></button>

	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
		<div
			class="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full {maxWidth} pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden {headerVariant === 'accent' ? '' : 'border border-border/30'}"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<div class="flex items-center justify-between px-6 py-4 {headerVariant === 'accent' ? 'bg-accent text-white' : 'border-b border-border'}">
				<div class="flex items-center gap-2.5">
					{#if icon}
						<span class="material-symbols-outlined text-[22px] {headerVariant === 'accent' ? 'text-white/80' : 'text-accent'}">{icon}</span>
					{/if}
					<h2 class="text-lg font-semibold {headerVariant === 'accent' ? 'text-white' : 'text-text'}">{title}</h2>
				</div>
				<button onclick={() => open = false} class="{headerVariant === 'accent' ? 'text-white/70 hover:text-white' : 'text-text-muted hover:text-text'} cursor-pointer">
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>

			<div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
				{#if children}
					{@render children()}
				{/if}

				{#if extra}
					<button
						type="button"
						class="flex items-center gap-1 text-sm text-accent hover:text-accent-dark cursor-pointer"
						onclick={() => showExtra = !showExtra}
					>
						<span class="material-symbols-outlined text-[16px]">
							{showExtra ? 'expand_less' : 'expand_more'}
						</span>
						{showExtra ? 'Moins de détails' : 'Plus de détails'}
					</button>
					{#if showExtra}
						{@render extra()}
					{/if}
				{/if}
			</div>

			{#if onSave || onDelete}
				<div class="flex items-center justify-between px-6 py-4 border-t border-border">
					<div>
						{#if onDelete}
							<button
								type="button"
								onclick={onDelete}
								disabled={saving}
								class="text-sm text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50"
							>
								Supprimer
							</button>
						{/if}
					</div>
					{#if onSave}
						<div class="flex items-center gap-3">
							<button
								type="button"
								onclick={() => open = false}
								class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
							>
								Annuler
							</button>
							<button
								type="button"
								onclick={onSave}
								disabled={saving}
								class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
							>
								{saving ? 'Enregistrement…' : 'Enregistrer'}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
