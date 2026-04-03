<script lang="ts">
	let {
		variant = 'default',
		label = '',
	}: {
		variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';
		label: string;
	} = $props();

	const classes: Record<string, string> = {
		default: 'bg-primary/10 text-primary',
		accent: 'bg-accent/10 text-accent',
		success: 'bg-success/10 text-success',
		warning: 'bg-warning/10 text-warning',
		danger: 'bg-danger/10 text-danger',
		muted: 'bg-surface-alt text-text-muted',
	};
</script>

<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {classes[variant]}">
	{label}
</span>
