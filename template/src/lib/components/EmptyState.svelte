<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let {
		icon = 'inbox',
		title = 'Aucune donnée',
		description = '',
		actionLabel = '',
		onAction,
	}: {
		icon?: string;
		title?: string;
		description?: string;
		actionLabel?: string;
		onAction?: () => void;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
	<Icon name={icon} size={48} class="text-text-muted/40 mb-3" />
	<h3 class="text-base font-medium text-text">{title}</h3>
	{#if description}
		<p class="mt-1 text-sm text-text-muted max-w-sm">{description}</p>
	{/if}
	{#if actionLabel && onAction}
		<button
			onclick={onAction}
			class="mt-4 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
		>
			{actionLabel}
		</button>
	{/if}
</div>
