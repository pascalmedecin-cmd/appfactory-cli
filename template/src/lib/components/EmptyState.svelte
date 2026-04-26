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
			class="mt-4 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
		>
			{actionLabel}
		</button>
	{/if}
</div>
