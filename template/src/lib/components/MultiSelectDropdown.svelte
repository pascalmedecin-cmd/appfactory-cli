<script lang="ts">
	let {
		selected = $bindable<string[]>([]),
		options,
		icon = '',
		label = '',
		tooltip = '',
	}: {
		selected: string[];
		options: { value: string; label: string; dotColor?: string }[];
		icon?: string;
		label?: string;
		tooltip?: string;
	} = $props();

	let open = $state(false);
	let buttonEl = $state<HTMLButtonElement>();

	const summary = $derived(() => {
		if (selected.length === 0) return 'Tous';
		if (selected.length === 1) {
			const opt = options.find(o => o.value === selected[0]);
			return opt?.label ?? selected[0];
		}
		return `${selected.length} sélectionnés`;
	});

	function toggle() {
		open = !open;
	}

	function toggleOption(val: string) {
		if (selected.includes(val)) {
			selected = selected.filter(v => v !== val);
		} else {
			selected = [...selected, val];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			buttonEl?.focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.multiselect-dropdown')) {
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

<div class="multiselect-dropdown relative w-full" onkeydown={handleKeydown}>
	<button
		bind:this={buttonEl}
		type="button"
		onclick={toggle}
		class="flex items-center gap-2 w-full px-3 py-2 text-sm border border-border rounded-lg bg-white cursor-pointer transition-colors hover:border-accent/40"
		title={tooltip}
	>
		{#if icon}
			<span class="material-symbols-outlined text-[18px] text-text-muted">{icon}</span>
		{/if}
		<span class="font-medium text-text">{label}</span>
		<span class="ml-auto text-text-muted text-xs truncate max-w-[120px]">{summary()}</span>
		<span class="material-symbols-outlined text-[16px] text-text-muted transition-transform {open ? 'rotate-180' : ''}"
			>expand_more</span
		>
	</button>

	{#if open}
		<div
			class="absolute top-full left-0 mt-1 w-full min-w-48 bg-white border border-border rounded-lg shadow-md z-50 py-1"
		>
			{#each options as opt}
				<button
					type="button"
					onclick={() => toggleOption(opt.value)}
					class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left cursor-pointer transition-colors hover:bg-surface-alt"
				>
					<span class="flex items-center justify-center w-4 h-4 border rounded {selected.includes(opt.value) ? 'border-accent bg-accent' : 'border-border-strong'}">
						{#if selected.includes(opt.value)}
							<span class="material-symbols-outlined text-[14px] text-white">check</span>
						{/if}
					</span>
					{#if opt.dotColor}
						<span class="w-2 h-2 rounded-full {opt.dotColor}"></span>
					{/if}
					<span class="text-text">{opt.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
