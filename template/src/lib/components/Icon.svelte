<script lang="ts">
	import { ICON_MAP, FALLBACK_ICON } from './icon-map';

	type Props = {
		name: string;
		size?: number;
		class?: string;
		strokeWidth?: number;
	};

	let { name, size = 20, class: klass = '', strokeWidth = 2 }: Props = $props();

	const Cmp = $derived(ICON_MAP[name] ?? FALLBACK_ICON);
</script>

<Cmp {size} class={klass} {strokeWidth} />
