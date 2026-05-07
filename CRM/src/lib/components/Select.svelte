<script lang="ts">
	type Option = { value: string; label: string };

	let {
		label = '',
		value = $bindable<string>(''),
		options = [],
		placeholder = '',
		required = false,
		id = `select-${Math.random().toString(36).slice(2, 8)}`,
		name = '',
	}: {
		label?: string;
		value?: string;
		options: Option[];
		placeholder?: string;
		required?: boolean;
		id?: string;
		name?: string;
	} = $props();
</script>

<div class="space-y-1">
	{#if label}
		<label for={id} class="block text-sm font-medium text-text">
			{label}
			{#if required}<span class="text-danger">*</span>{/if}
		</label>
	{/if}
	<select
		{id}
		{name}
		bind:value
		{required}
		class="w-full h-[34px] px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
	>
		{#if placeholder}<option value="">{placeholder}</option>{/if}
		{#each options as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</div>
