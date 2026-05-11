<script lang="ts">
	import Tabs from '$lib/components/Tabs.svelte';
	import type { ReportingTab, ReportingTabSpec } from '$lib/utils/reportingFormat';

	type Props = {
		active: ReportingTab;
		tabs: ReportingTabSpec[];
		onSelect: (tab: ReportingTab) => void;
	};

	let { active, tabs, onSelect }: Props = $props();
</script>

<Tabs {tabs} {active} {onSelect} ariaLabel="Sections du reporting" />
