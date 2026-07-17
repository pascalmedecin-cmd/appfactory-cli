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
		info: 'bg-info-light text-info-deep border border-info/15',
		success: 'bg-success-light text-success-deep border border-success/15',
		warning: 'bg-warning-light text-warning-deep border border-warning/15',
		danger: 'bg-danger-light text-danger-deep border border-danger/15',
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

<span class="crm-badge inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium {classes[variant]}">
	{#if dot}
		<span class="w-2 h-2 rounded-full {dotColors[variant]}"></span>
	{/if}
	{label}
</span>

<style>
	/* Cohérence UI (b, INC-3, flag ff_ui_coherence) : le badge d'état rejoint la famille pill
	   (radius-full + poids 600) façon StagePill/SourcePill/.crm-chip. Gated par l'ancêtre .coherence-ui.
	   Hook NAMESPACÉ `crm-badge` (jamais `badge` nu) : la primitive Badge ne doit PAS hériter du
	   `:global(.badge)` de FeedbackTable (règle non-layered qui restylerait TOUS les badges, flag OFF compris). */
	:global(.coherence-ui) .crm-badge {
		border-radius: var(--radius-full);
		font-weight: 600;
	}
</style>
