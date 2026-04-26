<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { trapFocus } from '$lib/actions/trapFocus';

	let {
		open = $bindable(false),
		title = 'Confirmer',
		message = '',
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		variant = 'danger',
		loading = false,
		onConfirm,
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'warning';
		loading?: boolean;
		onConfirm?: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') open = false;
	}

	const variantClasses = $derived(
		variant === 'danger'
			? 'bg-danger text-white hover:bg-danger/90'
			: 'bg-warning text-white hover:bg-warning/90'
	);

	const iconName = $derived(variant === 'danger' ? 'warning' : 'help');
	const iconColor = $derived(variant === 'danger' ? 'text-danger' : 'text-warning');
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<button
		class="fixed inset-0 bg-black/30 z-[60] cursor-default"
		onclick={() => open = false}
		tabindex="-1"
		aria-label="Fermer"
		transition:fade={{ duration: 150 }}
	></button>

	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
		<div
			class="bg-white rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto border border-border/30"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-title"
			aria-describedby="confirm-message"
			use:trapFocus
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<div class="px-6 pt-6 pb-2 text-center">
				<div class="mx-auto w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
					<Icon name={iconName} size={24} class="{iconColor}" />
				</div>
				<h3 id="confirm-title" class="text-lg font-semibold text-text">{title}</h3>
				<p id="confirm-message" class="mt-2 text-sm text-text-muted">{message}</p>
			</div>

			<div class="flex gap-3 px-6 pb-6 pt-4">
				<button
					type="button"
					onclick={() => open = false}
					disabled={loading}
					class="flex-1 px-4 py-2.5 text-sm font-medium text-text-muted bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={onConfirm}
					disabled={loading}
					class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 transition-colors {variantClasses}"
				>
					{loading ? 'En cours...' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
