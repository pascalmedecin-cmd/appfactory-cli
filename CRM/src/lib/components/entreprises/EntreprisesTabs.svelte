<script lang="ts">
	import type { Snippet } from 'svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import type { EntreprisesTab } from '$lib/utils/entreprisesFormat';

	type TabSpec = {
		key: EntreprisesTab;
		label: string;
		count: number;
	};

	type Props = {
		active: EntreprisesTab;
		tabs: TabSpec[];
		onSelect: (tab: EntreprisesTab) => void;
		actions?: Snippet;
	};

	let { active, tabs, onSelect, actions }: Props = $props();
</script>

<Tabs {tabs} {active} {onSelect} ariaLabel="Filtrer les entreprises" countNoun="entreprises" {actions} />
