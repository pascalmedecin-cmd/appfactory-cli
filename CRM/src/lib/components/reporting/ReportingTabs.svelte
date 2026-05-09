<script lang="ts">
	import type { ReportingTab, ReportingTabSpec } from '$lib/utils/reportingFormat';

	type Props = {
		active: ReportingTab;
		tabs: ReportingTabSpec[];
		onSelect: (tab: ReportingTab) => void;
	};

	let { active, tabs, onSelect }: Props = $props();
</script>

<div class="tabs-bar">
	<div role="tablist" aria-label="Sections du reporting">
		{#each tabs as tab (tab.key)}
			<button
				role="tab"
				type="button"
				aria-selected={active === tab.key}
				aria-controls={`panel-${tab.key}`}
				id={`tab-${tab.key}`}
				class="tab"
				onclick={() => onSelect(tab.key)}
			>
				{tab.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.tabs-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 32px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		gap: 24px;
		position: sticky;
		top: var(--header-height, 56px);
		z-index: 8;
	}
	[role='tablist'] {
		display: flex;
		gap: 4px;
	}
	.tab {
		height: 48px;
		padding: 0 16px;
		border: none;
		background: transparent;
		border-bottom: 2px solid transparent;
		font-family: inherit;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		transition: color 180ms ease, border-color 180ms ease;
		margin-bottom: -1px;
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab[aria-selected='true'] {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: 4px;
	}

	@media (max-width: 768px) {
		.tabs-bar {
			padding: 0 16px;
		}
		[role='tablist'] {
			min-width: max-content;
			overflow-x: auto;
			scrollbar-width: none;
		}
		[role='tablist']::-webkit-scrollbar {
			display: none;
		}
	}
</style>
