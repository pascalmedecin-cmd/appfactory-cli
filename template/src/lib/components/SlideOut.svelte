<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { trapFocus } from '$lib/actions/trapFocus';

	let {
		open = $bindable(false),
		title = '',
		width = '480px',
		children,
	}: {
		open?: boolean;
		title?: string;
		width?: string;
		children?: Snippet;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 bg-black/20 z-40 cursor-default"
		onclick={() => open = false}
		tabindex="-1"
		aria-label="Fermer le panneau"
		transition:fade={{ duration: 150 }}
	></button>

	<!-- Panel -->
	<div
		class="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden w-full md:w-auto border-l border-border/50"
		style="max-width: 100vw; --panel-width: {width}"
		role="dialog"
		aria-modal="true"
		use:trapFocus
		transition:fly={{ x: 300, duration: 250 }}
	>
		<div class="h-(--header-height) flex items-center justify-between gap-4 px-6 border-b border-border shrink-0 bg-white">
			<h2 class="text-lg font-semibold text-text truncate" title={title}>{title}</h2>
			<button
				onclick={() => open = false}
				class="text-text-muted hover:text-text cursor-pointer shrink-0 inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg"
				aria-label="Fermer"
			>
				<span class="material-symbols-outlined text-[20px]">close</span>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}

<style>
	@media (min-width: 768px) {
		div[style*="--panel-width"] {
			width: var(--panel-width, 480px);
		}
	}
</style>
