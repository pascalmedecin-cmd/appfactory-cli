<script lang="ts">
	let {
		variant = 'default',
		label = '',
		dot = false,
	}: {
		variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';
		label: string;
		dot?: boolean;
	} = $props();

	const classes: Record<string, string> = {
		default: 'bg-primary/8 text-primary border border-primary/15',
		accent: 'bg-accent/8 text-accent border border-accent/15',
		success: 'bg-success-light text-success border border-success/15',
		warning: 'bg-warning-light text-warning border border-warning/15',
		danger: 'bg-danger-light text-danger border border-danger/15',
		muted: 'bg-surface-alt text-text-muted border border-border',
	};

	const dotColors: Record<string, string> = {
		default: 'bg-primary',
		accent: 'bg-accent',
		success: 'bg-success',
		warning: 'bg-warning',
		danger: 'bg-danger',
		muted: 'bg-text-muted',
	};
</script>

<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium {classes[variant]}">
	{#if dot}
		<span class="w-1.5 h-1.5 rounded-full {dotColors[variant]}"></span>
	{/if}
	{label}
</span>
