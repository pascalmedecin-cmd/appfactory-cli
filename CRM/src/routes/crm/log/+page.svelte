<script lang="ts">
	// Spec : notes/page-log-2026-05-13/spec.md § 6.3.
	// Page Log : tableau + toolbar (nouveau retour, filtre statut, export admin).
	// Sur viewports < 1024px : encart « Disponible uniquement depuis ordinateur. »
	// (audit mobile CRM différé en entry idée cockpit d068a79d).
	import { fade, scale } from 'svelte/transition';
	import { trapFocus } from '$lib/actions/trapFocus';
	import FeedbackForm from '$lib/components/FeedbackForm.svelte';
	import FeedbackTable from '$lib/components/FeedbackTable.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		FEEDBACK_STATUSES,
		STATUS_LABELS,
	} from '$lib/feedback/options';
	import { toExportJson, exportFilename } from '$lib/feedback/export';
	import type { FeedbackEntry, FeedbackStatus } from '$lib/feedback/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state<'all' | FeedbackStatus>('all');
	let newOpen = $state(false);

	const filtered = $derived.by(() => {
		if (statusFilter === 'all') return data.entries;
		return data.entries.filter((e: FeedbackEntry) => e.status === statusFilter);
	});

	const counts = $derived.by(() => {
		const c = { nouveau: 0, a_actionner: 0, traite: 0, logge: 0 };
		for (const e of data.entries as FeedbackEntry[]) {
			c[e.status]++;
		}
		return c;
	});

	function downloadExport() {
		const toExport = statusFilter === 'all' ? data.entries : filtered;
		const blob = toExportJson(toExport as FeedbackEntry[]);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = exportFilename();
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (newOpen && e.key === 'Escape') newOpen = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Log des retours - FilmPro</title>
</svelte:head>

<!-- Encart mobile : page invisible sauf message d'indisponibilité. -->
<div class="log-mobile-block">
	<div class="max-w-md mx-auto text-center py-12">
		<Icon name="desktop_windows" size={48} class="mx-auto mb-4 text-text-muted" />
		<h2 class="text-lg font-semibold text-text mb-2">Disponible uniquement depuis ordinateur</h2>
		<p class="text-sm text-text-muted">
			La version mobile du CRM sera revue dans un audit dédié.
		</p>
	</div>
</div>

<!-- Contenu desktop : tout le reste. -->
<div class="log-desktop">
	<!-- En-tête (kicker / titre / tagline) -->
	<header class="mb-6">
		<div class="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Retours</div>
		<h1 class="text-2xl font-semibold text-text">Log des retours et améliorations</h1>
		<p class="mt-2 text-sm text-text-muted max-w-2xl">
			Tout ce qui est signalé pendant l'usage du CRM, par toi ou par n'importe quel utilisateur.
			Triable, exportable, traçable jusqu'à la livraison.
		</p>
	</header>

	<!-- Toolbar -->
	<div class="flex flex-wrap items-center gap-3 mb-4">
		<button
			type="button"
			onclick={() => (newOpen = true)}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg cursor-pointer transition-colors"
		>
			<Icon name="add" size={18} />
			Nouveau retour
		</button>

		<div class="flex items-center gap-2">
			<label for="filter-status" class="text-xs text-text-muted">Filtre statut</label>
			<select
				id="filter-status"
				bind:value={statusFilter}
				class="px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
			>
				<option value="all">Tous ({data.entries.length})</option>
				{#each FEEDBACK_STATUSES as st}
					<option value={st}>{STATUS_LABELS[st]} ({counts[st]})</option>
				{/each}
			</select>
		</div>

		{#if data.isAdmin}
			<button
				type="button"
				onclick={downloadExport}
				disabled={data.entries.length === 0}
				class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text bg-white border border-border hover:border-primary rounded-lg cursor-pointer disabled:opacity-50 transition-colors ml-auto"
			>
				<Icon name="download" size={16} />
				Exporter en JSON
			</button>
		{/if}
	</div>

	{#if data.isAdmin}
		<div class="flex flex-wrap gap-2 mb-4 text-xs">
			<span class="badge-counter">Nouveau · {counts.nouveau}</span>
			<span class="badge-counter">À actionner · {counts.a_actionner}</span>
			<span class="badge-counter">Traité · {counts.traite}</span>
			<span class="badge-counter">Loggé · {counts.logge}</span>
		</div>
	{/if}

	<FeedbackTable entries={filtered as FeedbackEntry[]} isAdmin={data.isAdmin} />

	<!-- Modal nouveau retour (depuis bouton « + Nouveau retour ») -->
	{#if newOpen}
		<div class="fixed inset-0 bg-black/30 z-[60]" transition:fade={{ duration: 150 }}></div>

		<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
			<div
				class="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-border/30 max-h-[90vh] overflow-y-auto"
				role="dialog"
				aria-modal="true"
				aria-labelledby="new-feedback-title"
				use:trapFocus
				transition:scale={{ start: 0.95, duration: 200 }}
			>
				<div class="px-6 pt-5 pb-2">
					<h3 id="new-feedback-title" class="text-lg font-semibold text-text">
						Signaler un bug ou une suggestion
					</h3>
				</div>
				<div class="px-6 pb-6">
					<FeedbackForm
						compact={false}
						onSuccess={() => (newOpen = false)}
						onCancel={() => (newOpen = false)}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Spec § 2 critère 15 + § 6.3 : page /log strictement desktop-only.
	   Affichée à la place : encart d'indisponibilité. */
	.log-mobile-block {
		display: none;
	}
	@media (max-width: 1023px) {
		.log-mobile-block {
			display: block;
		}
		.log-desktop {
			display: none;
		}
	}

	.badge-counter {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		background: var(--color-surface-secondary);
		color: var(--color-text);
		font-weight: 600;
		font-size: 0.7rem;
	}
</style>
