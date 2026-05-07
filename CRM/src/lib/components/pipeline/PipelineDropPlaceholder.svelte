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
		border-radius: 12px;
		box-shadow: inset 0 0 0 2px rgba(47, 90, 158, 0.35);
		display: grid;
		place-items: center;
		color: var(--color-primary);
		font-size: 11.5px;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		animation: placeholderPulse 1.6s ease-in-out infinite;
	}

	@keyframes placeholderPulse {
		0%,
		100% {
			background: var(--color-primary-light);
			box-shadow: inset 0 0 0 2px rgba(47, 90, 158, 0.35);
		}
		50% {
			background: rgba(47, 90, 158, 0.12);
			box-shadow: inset 0 0 0 2px rgba(47, 90, 158, 0.55);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drop-placeholder {
			animation: none;
		}
	}
</style>
