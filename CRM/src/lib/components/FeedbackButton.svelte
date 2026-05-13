<script lang="ts">
	// Spec : notes/page-log-2026-05-13/spec.md § 2 critère 3 + § 6.1.
	// Bouton flottant global (FAB) qui ouvre une modale de saisie. Masqué sur /log
	// et /login*, et caché en CSS sur viewports < 1024px (audit mobile différé).
	import { fade, scale } from 'svelte/transition';
	import { page } from '$app/state';
	import { trapFocus } from '$lib/actions/trapFocus';
	import FeedbackForm from '$lib/components/FeedbackForm.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let open = $state(false);

	const hidden = $derived.by(() => {
		const path = page.url.pathname;
		return path === '/log' || path.startsWith('/login');
	});

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !hidden}
	<button
		type="button"
		onclick={() => (open = true)}
		aria-label="Signaler un bug ou une suggestion"
		class="feedback-fab"
	>
		<Icon name="bug_report" size={22} />
	</button>
{/if}

{#if open}
	<div class="fixed inset-0 bg-black/30 z-[60]" transition:fade={{ duration: 150 }}></div>

	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
		<div
			class="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-border/30 max-h-[90vh] overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="feedback-modal-title"
			use:trapFocus
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<div class="px-6 pt-5 pb-2">
				<h3 id="feedback-modal-title" class="text-lg font-semibold text-text">
					Signaler un bug ou une suggestion
				</h3>
				<p class="mt-1 text-sm text-text-muted">
					Pris en compte par Pascal et traité dans Claude Code.
				</p>
			</div>
			<div class="px-6 pb-6">
				<FeedbackForm
					compact={true}
					onSuccess={() => (open = false)}
					onCancel={() => (open = false)}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.feedback-fab {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		width: 3rem;
		height: 3rem;
		border-radius: 9999px;
		background: var(--color-primary-dark);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		transition: background 0.15s ease, transform 0.15s ease;
		z-index: 90;
		border: none;
	}
	.feedback-fab:hover {
		background: var(--color-primary);
		transform: translateY(-1px);
	}
	.feedback-fab:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Spec § 2 critère 3 : caché sur viewports < 1024px, audit mobile CRM différé. */
	@media (max-width: 1023px) {
		.feedback-fab {
			display: none !important;
		}
	}
</style>
