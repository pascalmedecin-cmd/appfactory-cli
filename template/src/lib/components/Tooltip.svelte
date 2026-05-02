<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		content: string;
		anchor?: 'center' | 'start';
		width?: number;
		children: Snippet;
	};

	let { content, anchor = 'center', width = 280, children }: Props = $props();

	let id = $props.id();

	// V2.8 audit S160 : Escape dismiss un tooltip ouvert (WCAG 1.4.13).
	// On marque le host comme "dismissed" temporairement, au prochain hover/focus le state se réinitialise.
	let hostRef = $state<HTMLSpanElement | null>(null);
	let dismissed = $state(false);

	function handleHostKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && hostRef?.matches(':hover, :focus-within')) {
			e.stopPropagation();
			dismissed = true;
		}
	}

	function resetDismissed() {
		dismissed = false;
	}
</script>

<svelte:window onkeydown={handleHostKeydown} />

<span
	bind:this={hostRef}
	class="tip-host"
	class:tip-host--dismissed={dismissed}
	onmouseleave={resetDismissed}
	onfocusout={resetDismissed}
	role="presentation"
>
	{@render children()}
	<span
		class="tip"
		class:tip--start={anchor === 'start'}
		role="tooltip"
		id="tooltip-{id}"
		style="--tip-w: {width}px;"
	>
		{content}
	</span>
</span>

<style>
	.tip-host {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	.tip {
		position: absolute;
		top: calc(100% + 10px);
		left: 50%;
		transform: translate(-50%, -4px);
		width: var(--tip-w, 280px);
		padding: 10px 14px;
		background: white;
		color: var(--color-text-body);
		font-size: 12px;
		font-weight: 400;
		line-height: 1.5;
		text-transform: none;
		letter-spacing: 0;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		box-shadow: 0 6px 20px rgba(15, 23, 41, 0.10), 0 1px 3px rgba(15, 23, 41, 0.05);
		opacity: 0;
		visibility: hidden;
		transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
		z-index: 30;
		pointer-events: none;
		text-align: left;
		white-space: normal;
	}
	.tip::before {
		content: '';
		position: absolute;
		top: -5px;
		left: 50%;
		margin-left: -5px;
		width: 9px;
		height: 9px;
		background: white;
		border-top: 1px solid var(--color-border);
		border-left: 1px solid var(--color-border);
		transform: rotate(45deg);
	}
	.tip--start {
		left: 0;
		transform: translate(-12px, -4px);
	}
	.tip--start::before {
		left: 22px;
		margin-left: 0;
	}
	.tip-host:hover .tip,
	.tip-host:focus-within .tip {
		opacity: 1;
		visibility: visible;
		transform: translate(-50%, 0);
	}
	.tip-host:hover .tip--start,
	.tip-host:focus-within .tip--start {
		transform: translate(-12px, 0);
	}
	/* V2.8 audit S160 : Escape force la fermeture, override hover/focus-within. */
	.tip-host--dismissed .tip,
	.tip-host--dismissed .tip--start {
		opacity: 0 !important;
		visibility: hidden !important;
	}
</style>
