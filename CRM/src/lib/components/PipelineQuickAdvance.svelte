<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { config } from '$lib/config';
	import { toasts } from '$lib/stores/toast';
	import type { ActionResult } from '@sveltejs/kit';

	type Opp = {
		id: string;
		titre: string;
		etape_pipeline: string | null;
		date_relance_prevue: string | null;
		notes_libres: string | null;
	};

	let {
		opp,
	}: {
		opp: Opp;
	} = $props();

	const ETAPES = config.pipeline.etapes;
	// Étapes terminales : ne plus proposer "étape suivante" une fois gagné/perdu.
	const TERMINAL_KEYS = new Set(['gagne', 'perdu']);

	// Étape courante : si la valeur DB est hors enum (typo, étape supprimée du config),
	// on signale plutôt que de masquer silencieusement avec un fallback identification.
	const currentRawKey = $derived(opp.etape_pipeline);
	const currentIndex = $derived(
		ETAPES.findIndex((e: { key: string }) => e.key === currentRawKey)
	);
	const isUnknownStage = $derived(currentRawKey !== null && currentIndex < 0);
	const currentStage = $derived(currentIndex >= 0 ? ETAPES[currentIndex] : ETAPES[0]);
	const nextStage = $derived(currentIndex >= 0 && currentIndex + 1 < ETAPES.length ? ETAPES[currentIndex + 1] : null);
	const isTerminal = $derived(currentIndex >= 0 && TERMINAL_KEYS.has(currentStage.key));

	let advancing = $state(false);
	let nextActionOpen = $state(false);
	let nextActionDate = $state('');
	let nextActionNotes = $state('');
	let savingNextAction = $state(false);

	// Resync uniquement à la transition fermée → ouverte. Évite d'écraser la saisie
	// utilisateur si l'opp est rafraîchie via invalidateAll concurrent pendant l'édition.
	let prevNextActionOpen = false;
	$effect(() => {
		if (nextActionOpen && !prevNextActionOpen) {
			nextActionDate = opp.date_relance_prevue ?? '';
			nextActionNotes = opp.notes_libres ?? '';
		}
		prevNextActionOpen = nextActionOpen;
	});

	// Optimistic UI : on bascule l'étape immédiatement. Le clear se fait quand le serveur
	// revient avec succès ET que invalidateAll a propagé la nouvelle valeur (cohérence
	// transition atomique : pas de flash visuel).
	let optimisticEtape = $state<string | null>(null);
	const displayedKey = $derived(optimisticEtape ?? currentRawKey ?? 'identification');
	const displayedIndex = $derived(
		ETAPES.findIndex((e: { key: string }) => e.key === displayedKey)
	);
	const displayedSafeIndex = $derived(displayedIndex >= 0 ? displayedIndex : 0);

	// Quand la prop opp.etape_pipeline rattrape la valeur optimistic, on retire l'override.
	$effect(() => {
		if (optimisticEtape !== null && currentRawKey === optimisticEtape) {
			optimisticEtape = null;
		}
	});

	async function advance() {
		if (advancing || !nextStage || isTerminal || isUnknownStage) return;
		advancing = true;
		const target = nextStage.key;
		// Guard idempotent : si la prop rattrape déjà la cible, on ne renvoie pas.
		if (currentRawKey === target) {
			advancing = false;
			return;
		}
		optimisticEtape = target;
		try {
			const data = new FormData();
			data.set('id', opp.id);
			data.set('etape_pipeline', target);
			const response = await fetch('/pipeline?/move', { method: 'POST', body: data });
			const result: ActionResult = deserialize(await response.text());
			if (result.type === 'success') {
				toasts.success(`Pipeline avancé à ${nextStage.label}`);
				await invalidateAll();
				// Le clear de optimisticEtape est géré par le $effect (currentRawKey === target).
			} else if (result.type === 'failure') {
				const msg = (result.data as { error?: string } | undefined)?.error ?? 'Avancement refusé';
				toasts.error(msg);
				optimisticEtape = null;
			} else {
				await applyAction(result);
				optimisticEtape = null;
			}
		} catch {
			toasts.error('Erreur réseau, étape non avancée.');
			optimisticEtape = null;
		} finally {
			advancing = false;
		}
	}

	async function saveNextAction(event: SubmitEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const data = new FormData(form);
		savingNextAction = true;
		try {
			const response = await fetch('/pipeline?/updateNextAction', { method: 'POST', body: data });
			const result: ActionResult = deserialize(await response.text());
			if (result.type === 'success') {
				toasts.success('Prochaine action mise à jour');
				nextActionOpen = false;
				await invalidateAll();
			} else if (result.type === 'failure') {
				const msg = (result.data as { error?: string } | undefined)?.error ?? 'Mise à jour refusée';
				toasts.error(msg);
			} else {
				await applyAction(result);
			}
		} catch {
			toasts.error('Erreur réseau.');
		} finally {
			savingNextAction = false;
		}
	}

	function formatDate(d: string | null): string {
		if (!d) return '';
		return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="rounded-xl border border-border bg-white p-4 space-y-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="text-xs uppercase tracking-wide text-text-muted font-semibold">Pipeline</p>
			<p class="text-sm font-medium text-text mt-0.5 truncate" title={opp.titre}>{opp.titre}</p>
		</div>
		<a
			href="/pipeline"
			class="text-xs text-primary hover:text-primary-hover whitespace-nowrap"
			aria-label="Ouvrir le pipeline complet"
		>
			Voir pipeline
		</a>
	</div>

	<!-- Stepper visuel : 1 segment par étape, courante en primary, faites en success -->
	<div
		class="flex items-center gap-1.5"
		role="progressbar"
		aria-valuemin={1}
		aria-valuemax={ETAPES.length}
		aria-valuenow={displayedSafeIndex + 1}
		aria-valuetext={`${ETAPES[displayedSafeIndex]?.label ?? ''}, étape ${displayedSafeIndex + 1} sur ${ETAPES.length}`}
		aria-label="Étape pipeline"
	>
		{#each ETAPES as e, i}
			{@const done = i < displayedSafeIndex}
			{@const current = i === displayedSafeIndex}
			<span
				aria-hidden="true"
				class="flex-1 h-1.5 rounded-full transition-colors {done ? 'bg-success' : current ? 'bg-primary' : 'bg-border'}"
				title={e.label}
			></span>
		{/each}
	</div>

	{#if isUnknownStage}
		<div class="rounded-lg border border-warning/40 bg-warning-light/60 px-3 py-2 text-sm text-text">
			<div class="flex items-start gap-2">
				<Icon name="error" size={16} class="text-warning mt-0.5 shrink-0" />
				<div>
					<p class="font-medium">Étape inconnue : <code class="font-mono text-xs">{currentRawKey}</code></p>
					<p class="text-xs text-text-muted mt-0.5">Avancement désactivé. Ouvrir le pipeline pour corriger.</p>
				</div>
			</div>
		</div>
	{:else}
		<div>
			<p class="text-xs text-text-muted">Étape actuelle</p>
			<p class="text-base font-semibold text-text mt-0.5">{ETAPES[displayedSafeIndex]?.label ?? currentStage.label}</p>
			{#if nextStage && !isTerminal}
				<p class="text-xs text-text-muted mt-0.5">Suivante : {nextStage.label}</p>
			{/if}
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<button
			type="button"
			onclick={advance}
			disabled={advancing || !nextStage || isTerminal || isUnknownStage}
			class="h-11 w-full inline-flex items-center justify-center gap-2 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
		>
			{#if isUnknownStage}
				<Icon name="error" size={18} />
				<span>Étape inconnue</span>
			{:else if isTerminal}
				<Icon name="check_circle" size={18} />
				<span>Pipeline clôturé</span>
			{:else}
				<span>{advancing ? 'Avancement…' : 'Étape suivante'}</span>
				<Icon name="arrow_forward" size={18} />
			{/if}
		</button>
		<button
			type="button"
			onclick={() => nextActionOpen = true}
			class="h-11 w-full inline-flex items-center justify-center gap-2 px-4 box-border text-sm font-medium text-text border border-border rounded-lg bg-white hover:bg-surface-alt cursor-pointer transition-colors"
		>
			<Icon name="event" size={18} class="text-text-muted" />
			<span>Programmer prochaine action</span>
		</button>
	</div>

	{#if opp.date_relance_prevue || opp.notes_libres}
		<div class="rounded-lg bg-surface px-3 py-2.5">
			<p class="text-xs uppercase tracking-wide text-text-muted font-semibold">Prochaine action</p>
			{#if opp.date_relance_prevue}
				<p class="text-sm font-medium text-text mt-1">{formatDate(opp.date_relance_prevue)}</p>
			{/if}
			{#if opp.notes_libres}
				<p class="text-xs text-text-muted mt-0.5 line-clamp-2">{opp.notes_libres}</p>
			{/if}
		</div>
	{/if}
</div>

<ModalForm
	bind:open={nextActionOpen}
	title="Prochaine action"
	icon="event"
	maxWidth="max-w-md"
>
	<form method="POST" action="/pipeline?/updateNextAction" onsubmit={saveNextAction}>
		<input type="hidden" name="id" value={opp.id} />
		<div class="space-y-4">
			<div class="space-y-1">
				<label for="pqa-date" class="block text-sm font-medium text-text">Date de relance</label>
				<input
					id="pqa-date"
					type="date"
					name="date_relance_prevue"
					bind:value={nextActionDate}
					class="w-full h-11 px-3.5 py-2 text-base border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
				/>
			</div>
			<div class="space-y-1">
				<label for="pqa-notes" class="block text-sm font-medium text-text">Action prévue</label>
				<textarea
					id="pqa-notes"
					name="notes_libres"
					bind:value={nextActionNotes}
					placeholder="Ex : Envoi devis film solaire 80m²"
					rows="3"
					maxlength="5000"
					class="w-full px-3.5 py-2.5 text-base border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
				></textarea>
			</div>
			<div class="flex items-center justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={() => nextActionOpen = false}
					class="min-h-11 inline-flex items-center px-4 text-sm text-text-muted hover:text-text cursor-pointer"
				>
					Annuler
				</button>
				<button
					type="submit"
					disabled={savingNextAction}
					class="h-11 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
				>
					{savingNextAction ? 'Enregistrement…' : 'Enregistrer'}
				</button>
			</div>
		</div>
	</form>
</ModalForm>
