<script lang="ts">
	import '../app.css';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import type { Snippet } from 'svelte';

	injectAnalytics({ mode: dev ? 'development' : 'production' });
	injectSpeedInsights();

	let { children }: { children: Snippet } = $props();
</script>

{@render children()}
