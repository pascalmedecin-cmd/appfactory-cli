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

<!-- V2.3 audit S160 : aria-live region pour annoncer les toasts aux lecteurs d'écran (WCAG 4.1.3 A). -->
<div
	class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
	role="region"
	aria-live="polite"
	aria-atomic="false"
	aria-label="Notifications"
>
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium max-w-sm {styles[toast.variant]}"
			role={toast.variant === 'error' ? 'alert' : 'status'}
			in:fly={{ x: 80, duration: 250 }}
			out:fade={{ duration: 150 }}
		>
			<Icon name={icons[toast.variant]} />
			<span class="flex-1">{toast.message}</span>
			{#if toast.action}
				<button
					onclick={async () => {
						const handler = toast.action!.handler;
						toasts.remove(toast.id);
						await handler();
					}}
					class="font-semibold underline hover:no-underline cursor-pointer text-current"
				>
					{toast.action.label}
				</button>
			{/if}
			<button
				onclick={() => toasts.remove(toast.id)}
				aria-label="Fermer la notification"
				class="text-current opacity-50 hover:opacity-100 cursor-pointer"
			>
				<Icon name="close" size={16} />
			</button>
		</div>
	{/each}
</div>
