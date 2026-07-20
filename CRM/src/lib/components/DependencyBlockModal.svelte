<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { trapFocus } from '$lib/actions/trapFocus';

	type ContactRef = { id: string; nom?: string | null; prenom?: string | null };
	type OpportuniteRef = { id: string; titre?: string | null };

	let {
		open = $bindable(false),
		entrepriseNom = '',
		contacts = [],
		opportunites = [],
	}: {
		open?: boolean;
		entrepriseNom?: string;
		contacts?: ContactRef[];
		opportunites?: OpportuniteRef[];
	} = $props();

	// Nom accessible du dialog (WCAG 4.1.2) : lie le titre via aria-labelledby
	// (modèle conforme Vague 2 : FeedbackForm / drawer mots-clés Signaux).
	const baseId = $props.id();
	const titleId = `${baseId}-title`;
	const descId = `${baseId}-desc`;

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') open = false;
	}

	function contactLabel(c: ContactRef): string {
		const full = [c.prenom, c.nom].filter(Boolean).join(' ').trim();
		return full || 'Contact sans nom';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 bg-black/30 z-[60]" transition:fade={{ duration: 150 }}></div>

	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
		<div
			class="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-border/30 flex flex-col max-h-[85vh]"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descId}
			use:trapFocus
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<div class="px-6 pt-6 pb-2">
				<div class="flex items-start gap-3">
					<div class="shrink-0 w-10 h-10 rounded-full bg-warning-light flex items-center justify-center">
						<Icon name="warning" size={20} class="text-warning-deep" />
					</div>
					<div class="min-w-0">
						<h3 id={titleId} class="text-lg font-semibold text-text">Suppression bloquée</h3>
						<p id={descId} class="mt-1 text-sm text-text-muted">
							{#if entrepriseNom}
								« {entrepriseNom} » est encore rattachée à des éléments. Détachez-les d'abord, puis réessayez.
							{:else}
								Cette entreprise est encore rattachée à des éléments. Détachez-les d'abord, puis réessayez.
							{/if}
						</p>
					</div>
				</div>
			</div>

			<div class="px-6 py-4 overflow-y-auto space-y-4">
				{#if contacts.length > 0}
					<section aria-label="Contacts rattachés">
						<div class="flex items-center justify-between mb-2">
							<h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted eyebrow">
								Contacts ({contacts.length})
							</h4>
							<a href="/crm/contacts" class="text-primary text-xs font-medium hover:underline">Gérer</a>
						</div>
						<ul class="space-y-1">
							{#each contacts as c (c.id)}
								<li class="flex items-center gap-2 text-sm text-text">
									<Icon name="contacts" size={14} class="text-text-muted shrink-0" />
									<span class="truncate">{contactLabel(c)}</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if opportunites.length > 0}
					<section aria-label="Opportunités rattachées">
						<div class="flex items-center justify-between mb-2">
							<h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted eyebrow">
								Opportunités ({opportunites.length})
							</h4>
							<a href="/crm/pipeline" class="text-primary text-xs font-medium hover:underline">Gérer</a>
						</div>
						<ul class="space-y-1">
							{#each opportunites as o (o.id)}
								<li class="flex items-center gap-2 text-sm text-text">
									<Icon name="trending_up" size={14} class="text-text-muted shrink-0" />
									<span class="truncate">{o.titre || 'Opportunité sans titre'}</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>

			<div class="flex justify-end px-6 pb-6 pt-2 border-t border-border/40">
				<button
					type="button"
					onclick={() => (open = false)}
					class="h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
				>
					Compris
				</button>
			</div>
		</div>
	</div>
{/if}
