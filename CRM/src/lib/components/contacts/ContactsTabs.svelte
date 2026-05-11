<script lang="ts">
	import Tabs from '$lib/components/Tabs.svelte';
	import type { ContactsTab } from '$lib/utils/contactsFormat';

	type TabSpec = {
		key: ContactsTab;
		label: string;
		count: number;
	};

	type Props = {
		active: ContactsTab;
		tabs: TabSpec[];
		onSelect: (tab: ContactsTab) => void;
	};

	let { active, tabs, onSelect }: Props = $props();
</script>

<Tabs {tabs} {active} {onSelect} ariaLabel="Filtrer les contacts" density="compact" />
