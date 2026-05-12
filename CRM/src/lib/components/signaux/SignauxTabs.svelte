<script lang="ts">
	import type { Snippet } from 'svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import type { SignauxTab } from '$lib/utils/signauxFormat';

	type TabSpec = {
		key: SignauxTab;
		label: string;
		count: number;
	};

	type Props = {
		active: SignauxTab;
		tabs: TabSpec[];
		onSelect: (tab: SignauxTab) => void;
		actions?: Snippet;
	};

	let { active, tabs, onSelect, actions }: Props = $props();
</script>

<Tabs {tabs} {active} {onSelect} ariaLabel="Filtrer les signaux" countNoun="signaux" {actions} />
