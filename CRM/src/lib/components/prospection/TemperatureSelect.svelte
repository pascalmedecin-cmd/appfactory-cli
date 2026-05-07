<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let {
		value = $bindable(''),
		options,
	}: {
		value: string;
		options: { value: string; label: string; dotColor: string }[];
	} = $props();

	let open = $state(false);
	let buttonEl = $state<HTMLButtonElement>();

	const selectedOption = $derived(options.find(o => o.value === value));

	function toggle() {
		open = !open;
	}

	function select(val: string) {
		value = val;
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			buttonEl?.focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.temperature-select')) {
			open = false;
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div class="temperature-select relative" onkeydown={handleKeydown}>
	<button
		bind:this={buttonEl}
		type="button"
		onclick={toggle}
		class="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg bg-surface-alt cursor-pointer transition-colors hover:border-primary/40"
	>
		{#if selectedOption?.dotColor}
			<span class="w-2 h-2 rounded-full {selectedOption.dotColor}"></span>
		{/if}
		<span>{selectedOption?.label ?? 'Toute température'}</span>
		<Icon name="expand_more" size={16} class="text-text-muted transition-transform {open ? 'rotate-180' : ''}" />
	</button>

	{#if open}
		<div
			class="absolute top-full left-0 mt-1 min-w-48 bg-white border border-border rounded-lg shadow-md z-50 py-1"
		>
			{#each options as opt}
				<button
					type="button"
					onclick={() => select(opt.value)}
					class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left cursor-pointer transition-colors
						{opt.value === value ? 'bg-primary-light text-primary font-medium' : 'text-text hover:bg-surface-alt'}"
				>
					{#if opt.dotColor}
						<span class="w-2 h-2 rounded-full {opt.dotColor}"></span>
					{:else}
						<span class="w-2"></span>
					{/if}
					{opt.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
