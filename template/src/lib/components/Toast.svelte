<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { fly, fade } from 'svelte/transition';
	import { toasts, type ToastVariant } from '$lib/stores/toast';

	const icons: Record<ToastVariant, string> = {
		success: 'check_circle',
		error: 'error',
		warning: 'warning',
		info: 'info',
	};

	const styles: Record<ToastVariant, string> = {
		success: 'bg-success-light border-success text-success',
		error: 'bg-danger-light border-danger text-danger',
		warning: 'bg-warning-light border-warning text-warning',
		info: 'bg-info-light border-info text-info',
	};
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium max-w-sm {styles[toast.variant]}"
			in:fly={{ x: 80, duration: 250 }}
			out:fade={{ duration: 150 }}
		>
			<Icon name={icons[toast.variant]} />
			<span class="flex-1">{toast.message}</span>
			<button
				onclick={() => toasts.remove(toast.id)}
				class="text-current opacity-50 hover:opacity-100 cursor-pointer"
			>
				<Icon name="close" size={16} />
			</button>
		</div>
	{/each}
</div>
