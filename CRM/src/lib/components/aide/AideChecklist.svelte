<!--
	Checklist de démarrage interactive (niveau 1 de l'aide).

	État coché persisté dans `localStorage` (clé versionnée) - la logique pure (sérialisation,
	bascule, progression, nettoyage des clés obsolètes) vit dans `$lib/aide/checklist.ts` et est
	testée là-bas (le repo n'a pas de jsdom). Ce composant ne fait que la brancher.

	A11y : chaque ligne est une vraie case à cocher (`<input type="checkbox">`) avec un `<label>`
	associé ; la barre de progression est un `role="progressbar"` avec `aria-valuenow`.
	Pas de bordure pointillée, couleurs via tokens.
-->
<script lang="ts">
	import type { AideStep } from '$lib/aide/content';
	import {
		CHECKLIST_STORAGE_KEY,
		parseChecklistState,
		serializeChecklistState,
		toggleStep,
		pruneChecklistState,
		checklistProgress,
		type ChecklistState
	} from '$lib/aide/checklist';

	let { id, intro, items }: { id: string; intro?: string; items: AideStep[] } = $props();

	const stepKey = (stepId: string) => `${id}:${stepId}`;
	const localIds = $derived(items.map((s) => stepKey(s.id)));

	let state = $state<ChecklistState>(new Set());

	// Hydratation depuis localStorage au montage (côté client uniquement).
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		const loaded = parseChecklistState(localStorage.getItem(CHECKLIST_STORAGE_KEY));
		// On ne touche qu'aux clés de cette checklist pour le nettoyage local, mais on garde
		// les autres clés du store intactes (plusieurs checklists possibles à terme).
		state = loaded;
	});

	function persist(next: ChecklistState) {
		state = next;
		if (typeof localStorage === 'undefined') return;
		// Re-nettoyage défensif des clés de CETTE checklist qui ne seraient plus déclarées.
		const others = new Set([...next].filter((k) => !k.startsWith(`${id}:`)));
		const mine = pruneChecklistState(new Set([...next].filter((k) => k.startsWith(`${id}:`))), localIds);
		const merged = new Set([...others, ...mine]);
		localStorage.setItem(CHECKLIST_STORAGE_KEY, serializeChecklistState(merged));
	}

	function onToggle(stepId: string) {
		persist(toggleStep(state, stepKey(stepId)));
	}

	function reset() {
		const cleared = new Set([...state].filter((k) => !k.startsWith(`${id}:`)));
		persist(cleared);
	}

	const localState = $derived(new Set([...state].filter((k) => k.startsWith(`${id}:`))));
	const progress = $derived(checklistProgress(localState, items.length));
	const allDone = $derived(progress.total > 0 && progress.done === progress.total);
</script>

<div class="aide-checklist">
	{#if intro}<p class="aide-checklist-intro">{intro}</p>{/if}

	<div class="aide-progress">
		<div
			class="aide-progress-track"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={progress.total}
			aria-valuenow={progress.done}
			aria-label="Progression de la checklist de démarrage"
		>
			<div class="aide-progress-fill" style="width: {progress.percent}%"></div>
		</div>
		<span class="aide-progress-label tabular-nums">{progress.done} / {progress.total}</span>
		{#if progress.done > 0}
			<button type="button" class="aide-progress-reset" onclick={reset}>Réinitialiser</button>
		{/if}
	</div>

	<ul class="aide-checklist-items">
		{#each items as step, i}
			{@const checked = state.has(stepKey(step.id))}
			<li class="aide-checklist-item" class:done={checked}>
				<input
					id={`chk-${id}-${step.id}`}
					type="checkbox"
					{checked}
					onchange={() => onToggle(step.id)}
				/>
				<div class="aide-checklist-content">
					<label for={`chk-${id}-${step.id}`}>
						<span class="aide-checklist-num tabular-nums">{i + 1}.</span>
						{step.text}
					</label>
					{#if step.link}
						<a class="aide-checklist-link" href={step.link.href}>{step.link.label}</a>
					{/if}
				</div>
			</li>
		{/each}
	</ul>

	{#if allDone}
		<p class="aide-checklist-done">Checklist terminée. Tu connais le tour de l'outil.</p>
	{/if}
</div>

<style>
	.aide-checklist {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 16px;
		margin: 0 0 12px;
		background: var(--color-surface);
	}
	.aide-checklist-intro {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 12px;
		line-height: 1.5;
	}

	.aide-progress {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}
	.aide-progress-track {
		flex: 1;
		height: 8px;
		background: var(--color-surface-alt);
		border-radius: var(--radius-full);
		overflow: hidden;
	}
	.aide-progress-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: var(--radius-full);
		transition: width 320ms var(--ease-out-expo);
	}
	.aide-progress-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.aide-progress-reset {
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
		padding: 0 4px;
		flex-shrink: 0;
	}
	.aide-progress-reset:hover {
		color: var(--color-text);
		text-decoration: underline;
	}

	.aide-checklist-items {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.aide-checklist-item {
		display: flex;
		gap: 12px;
		padding: 12px 0;
		border-top: 1px solid var(--color-border);
	}
	.aide-checklist-item:first-child {
		border-top: none;
		padding-top: 0;
	}
	.aide-checklist-item input[type='checkbox'] {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		margin-top: 2px;
		accent-color: var(--color-primary);
		cursor: pointer;
	}
	.aide-checklist-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.aide-checklist-content label {
		font-size: 14px;
		line-height: 1.5;
		color: var(--color-text-body);
		cursor: pointer;
	}
	.aide-checklist-num {
		font-weight: 600;
		color: var(--color-text-muted);
		margin-right: 4px;
	}
	.aide-checklist-item.done label {
		color: var(--color-text-muted);
		text-decoration: line-through;
		text-decoration-color: var(--color-border-strong);
	}
	.aide-checklist-link {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
		width: fit-content;
	}
	.aide-checklist-link:hover {
		text-decoration: underline;
	}
	.aide-checklist-done {
		margin: 12px 0 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-success-deep);
	}

	@media (prefers-reduced-motion: reduce) {
		.aide-progress-fill {
			transition: none;
		}
	}
</style>
