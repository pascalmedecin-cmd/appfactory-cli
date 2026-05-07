<script lang="ts">
	let {
		variant = 'default',
		label = '',
		dot = false,
	}: {
		variant?: 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted';
		label: string;
		dot?: boolean;
	} = $props();

	const classes: Record<string, string> = {
		default: 'bg-primary-light text-primary border border-primary',
		info: 'bg-info-light text-info border border-info/15',
		success: 'bg-success-light text-success border border-success/15',
		warning: 'bg-warning-light text-warning border border-warning/15',
		danger: 'bg-danger-light text-danger border border-danger/15',
		muted: 'bg-surface-alt text-text-muted border border-border',
	};

	const dotColors: Record<string, string> = {
		default: 'bg-primary',
		info: 'bg-info',
		success: 'bg-success',
		warning: 'bg-warning',
		danger: 'bg-danger',
		muted: 'bg-text-muted',
	};
</script>

<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium {classes[variant]}">
	{#if dot}
		<span class="w-2 h-2 rounded-full {dotColors[variant]}"></span>
	{/if}
	{label}
</span>
