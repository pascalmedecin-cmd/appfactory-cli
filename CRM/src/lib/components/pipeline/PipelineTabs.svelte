<script lang="ts">
	import Tabs from '$lib/components/Tabs.svelte';
	import type { PipelineTab } from '$lib/utils/pipelineFormat';

	type TabSpec = {
		key: PipelineTab;
		label: string;
		count: number;
	};

	type Props = {
		active: PipelineTab;
		tabs: TabSpec[];
		onSelect: (tab: PipelineTab) => void;
	};

	let { active, tabs, onSelect }: Props = $props();
</script>

<Tabs {tabs} {active} {onSelect} ariaLabel="Filtrer le pipeline" density="compact" countNoun="opportunités" />
