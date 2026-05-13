<script lang="ts">
	// Spec : notes/page-log-2026-05-13/spec.md § 6.2 + § 7.1.
	// Form de saisie réutilisable. Pose les champs Type / Sévérité (si bug) / Page / Description
	// + capture context auto en hidden input. Submit via SvelteKit form action `/log?/create`.
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toasts } from '$lib/stores/toast';
	import { FEEDBACK_TYPES, FEEDBACK_SEVERITIES, TYPE_LABELS, SEVERITY_LABELS, TYPE_ICONS } from '$lib/feedback/options';
	import { buildPageOptions, pagesForUrl } from '$lib/feedback/pages';
	import { errorCapture } from '$lib/feedback/error-capture';
	import type { FeedbackType, FeedbackSeverity, FeedbackContext } from '$lib/feedback/types';
	import Icon from '$lib/components/Icon.svelte';

	let {
		onSuccess,
		onCancel,
		compact = false,
	}: {
		onSuccess?: () => void;
		onCancel?: () => void;
		compact?: boolean;
	} = $props();

	const pageOptions = buildPageOptions();

	let type = $state<FeedbackType>('bug');
	let severity = $state<FeedbackSeverity | ''>('');
	let pageHref = $state<string>('');
	let description = $state<string>('');
	let submitting = $state(false);

	// Pré-remplir Page depuis l'URL active au montage. `page.url.pathname` est dispo
	// dès le render mais on attend le mount pour s'assurer que la nav est prête.
	onMount(() => {
		pageHref = pagesForUrl(page.url.pathname).href;
		errorCapture.install();
	});

	// Severity reset si on quitte type=bug (anti incohérence schema-side).
	$effect(() => {
		if (type !== 'bug' && severity) severity = '';
	});

	function buildContextPayload(): string {
		const ctx: FeedbackContext = {
			url: typeof window !== 'undefined' ? window.location.href : '',
			viewport: {
				w: typeof window !== 'undefined' ? window.innerWidth : 0,
				h: typeof window !== 'undefined' ? window.innerHeight : 0,
			},
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 1000) : '',
			recentErrors: errorCapture.read(),
		};
		return JSON.stringify(ctx);
	}

	const canSubmit = $derived(
		!submitting &&
			pageHref.length > 0 &&
			description.trim().length >= 10 &&
			description.length <= 1000 &&
			(type !== 'bug' || severity.length > 0)
	);

	const descLength = $derived(description.length);
</script>

<form
	method="POST"
	action="/log?/create"
	class="feedback-form"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') {
				toasts.success('Retour envoyé, merci');
				type = 'bug';
				severity = '';
				description = '';
				await update({ reset: true });
				onSuccess?.();
			} else if (result.type === 'failure') {
				const msg = (result.data as { error?: string } | undefined)?.error ?? 'Envoi impossible, réessayez.';
				toasts.error(msg);
				await update({ reset: false });
			} else {
				await update();
			}
		};
	}}
>
	<input type="hidden" name="context" value={buildContextPayload()} />

	<!-- Type -->
	<fieldset class="space-y-2">
		<legend class="text-sm font-semibold text-text">Type de retour</legend>
		<div class="grid grid-cols-3 gap-2">
			{#each FEEDBACK_TYPES as t}
				<label class="type-card" class:active={type === t}>
					<input
						type="radio"
						name="type"
						value={t}
						bind:group={type}
						class="sr-only"
						required
					/>
					<Icon name={TYPE_ICONS[t]} size={18} />
					<span class="text-sm font-medium">{TYPE_LABELS[t]}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<!-- Sévérité (visible ssi type=bug) -->
	{#if type === 'bug'}
		<fieldset class="space-y-2 mt-4">
			<legend class="text-sm font-semibold text-text">Sévérité</legend>
			<div class="grid grid-cols-3 gap-2">
				{#each FEEDBACK_SEVERITIES as s}
					<label class="sev-card sev-{s}" class:active={severity === s}>
						<input
							type="radio"
							name="severity"
							value={s}
							bind:group={severity}
							class="sr-only"
							required
						/>
						<span class="text-sm font-medium">{SEVERITY_LABELS[s]}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<!-- Page concernée -->
	<div class="mt-4">
		<label for="feedback-page" class="block text-sm font-semibold text-text mb-1">Page concernée</label>
		<select
			id="feedback-page"
			name="page"
			bind:value={pageHref}
			class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
			required
		>
			{#each pageOptions as opt}
				<option value={opt.href}>{opt.label}</option>
			{/each}
		</select>
	</div>

	<!-- Description -->
	<div class="mt-4">
		<label for="feedback-desc" class="block text-sm font-semibold text-text mb-1">Description</label>
		<textarea
			id="feedback-desc"
			name="description"
			bind:value={description}
			rows={compact ? 3 : 4}
			minlength={10}
			maxlength={1000}
			placeholder="Décris en 1 à 3 phrases ce qui s'est passé ou ce qui manque."
			class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
			required
		></textarea>
		<div class="mt-1 flex justify-between text-xs text-text-muted">
			<span class:text-danger={descLength > 0 && descLength < 10}>
				{descLength < 10 ? `${10 - descLength} caractère(s) min restants` : 'Longueur OK'}
			</span>
			<span class:text-danger={descLength > 1000}>{descLength}/1000</span>
		</div>
	</div>

	<!-- Boutons -->
	<div class="mt-6 flex gap-3 justify-end">
		{#if onCancel}
			<button
				type="button"
				onclick={() => onCancel?.()}
				disabled={submitting}
				class="px-4 py-2 text-sm font-medium text-text-muted bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
			>
				Annuler
			</button>
		{/if}
		<button
			type="submit"
			disabled={!canSubmit}
			class="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
		>
			{submitting ? 'Envoi...' : 'Envoyer'}
		</button>
	</div>
</form>

<style>
	.type-card,
	.sev-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.625rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.625rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
		text-align: center;
	}
	.type-card:hover,
	.sev-card:hover {
		border-color: var(--color-primary);
	}
	.type-card.active {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
	}
	.sev-card.active.sev-bloquant {
		border-color: var(--color-danger);
		background: var(--color-danger-light);
	}
	.sev-card.active.sev-genant {
		border-color: var(--color-warning);
		background: var(--color-warning-light);
	}
	.sev-card.active.sev-mineur {
		border-color: var(--color-text-muted);
		background: var(--color-surface-secondary);
	}
</style>
