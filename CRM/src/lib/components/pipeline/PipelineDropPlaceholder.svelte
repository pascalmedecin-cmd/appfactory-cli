<script lang="ts">
	type Props = {
		label?: string;
	};
	let { label = 'Déposer ici' }: Props = $props();
</script>

<div class="drop-placeholder" aria-hidden="true">{label}</div>

<style>
	.drop-placeholder {
		height: 88px;
		background: var(--color-primary-light);
		border-radius: var(--radius-xl);
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent);
		display: grid;
		place-items: center;
		color: var(--color-primary);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		animation: placeholderPulse 1.6s ease-in-out infinite;
	}

	@keyframes placeholderPulse {
		0%,
		100% {
			background: var(--color-primary-light);
			box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent);
		}
		50% {
			background: rgba(47, 90, 158, 0.12);
			box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 55%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drop-placeholder {
			animation: none;
		}
	}
</style>
