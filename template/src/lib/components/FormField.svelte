<script lang="ts">
	let {
		label = '',
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		required = false,
		id = `field-${Math.random().toString(36).slice(2, 8)}`,
	}: {
		label?: string;
		type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'textarea';
		value?: string;
		placeholder?: string;
		required?: boolean;
		id?: string;
	} = $props();
</script>

<div class="space-y-1">
	{#if label}
		<label for={id} class="block text-sm font-medium text-text">
			{label}
			{#if required}<span class="text-danger">*</span>{/if}
		</label>
	{/if}
	{#if type === 'textarea'}
		<textarea
			{id}
			bind:value
			{placeholder}
			{required}
			rows="3"
			class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		></textarea>
	{:else}
		<input
			{id}
			{type}
			bind:value
			{placeholder}
			{required}
			class="w-full h-[34px] px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		/>
	{/if}
</div>
