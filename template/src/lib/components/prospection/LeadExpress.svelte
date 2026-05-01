<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { applyAction, deserialize } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast';
	import type { ActionResult } from '@sveltejs/kit';

	let {
		open = $bindable(false),
		redirectAfterCreate = false,
	}: {
		open?: boolean;
		// true : après création, navigue vers /prospection?slideOut=<id> (depuis dashboard).
		// false : reste sur la page courante, toast + invalidate (depuis /prospection).
		redirectAfterCreate?: boolean;
	} = $props();

	type Candidate = { id: string; raison_sociale: string; localite: string | null };

	let raison_sociale = $state('');
	let nom_contact = $state('');
	let telephone = $state('');
	let notes = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	let ambiguousCandidates = $state<Candidate[]>([]);

	function reset() {
		raison_sociale = '';
		nom_contact = '';
		telephone = '';
		notes = '';
		errorMsg = '';
		ambiguousCandidates = [];
	}

	$effect(() => {
		if (!open) reset();
	});

	async function handleResolve(leadId: string) {
		open = false;
		if (redirectAfterCreate) {
			await goto(`/prospection?slideOut=${encodeURIComponent(leadId)}`, { invalidateAll: true });
			toasts.success('Prospect existant ouvert');
		} else {
			toasts.success('Prospect existant ouvert');
			await invalidateAll();
		}
	}

	async function submitForm(force: boolean) {
		saving = true;
		errorMsg = '';
		try {
			const data = new FormData();
			data.set('raison_sociale', raison_sociale);
			data.set('nom_contact', nom_contact);
			data.set('telephone', telephone);
			data.set('notes', notes);
			if (force) data.set('force_create', '1');
			const response = await fetch('/prospection?/createExpress', { method: 'POST', body: data });
			const result: ActionResult = deserialize(await response.text());
			if (result.type === 'success') {
				const payload = (result.data ?? {}) as { id?: string; duplicate?: boolean };
				const leadId = payload.id ?? null;
				const wasDup = payload.duplicate === true;
				open = false;
				if (redirectAfterCreate && leadId) {
					await goto(`/prospection?slideOut=${encodeURIComponent(leadId)}`, { invalidateAll: true });
					toasts.success(wasDup ? 'Prospect existant ouvert' : 'Lead express créé');
				} else {
					toasts.success(wasDup ? 'Prospect déjà présent' : 'Lead express créé');
					await invalidateAll();
				}
			} else if (result.type === 'failure') {
				const payload = (result.data ?? {}) as {
					error?: string;
					ambiguous?: boolean;
					candidates?: Candidate[];
				};
				if (payload.ambiguous && Array.isArray(payload.candidates) && payload.candidates.length > 0) {
					ambiguousCandidates = payload.candidates;
					errorMsg = '';
				} else {
					const msg = payload.error ?? 'Erreur lors de la création';
					errorMsg = msg;
					toasts.error(msg);
				}
			} else {
				await applyAction(result);
			}
		} catch {
			errorMsg = 'Erreur réseau, réessayez.';
			toasts.error(errorMsg);
		} finally {
			saving = false;
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitForm(false);
	}
</script>

<ModalForm
	bind:open
	title="Lead express"
	icon="bolt"
	headerVariant="accent"
	maxWidth="max-w-md"
>
	{#if ambiguousCandidates.length > 0}
		<div class="space-y-4">
			<div class="flex items-start gap-3 p-3 rounded-xl bg-warning-light border border-warning/30">
				<Icon name="warning" size={18} class="text-warning mt-0.5" />
				<p class="text-sm text-text-body leading-snug">
					Plusieurs prospects existent déjà sous ce nom. Choisissez le bon, ou créez quand même un nouveau lead (chaîne, multi-sites).
				</p>
			</div>

			<ul class="space-y-2">
				{#each ambiguousCandidates as c (c.id)}
					<li>
						<button
							type="button"
							onclick={() => handleResolve(c.id)}
							class="w-full text-left px-3.5 py-3 border border-border rounded-lg bg-white hover:border-primary hover:bg-primary-light/40 transition-colors cursor-pointer"
						>
							<div class="text-sm font-semibold text-text">{c.raison_sociale}</div>
							{#if c.localite}
								<div class="text-xs text-text-muted mt-0.5">{c.localite}</div>
							{:else}
								<div class="text-xs text-text-muted mt-0.5 italic">Localité non renseignée</div>
							{/if}
						</button>
					</li>
				{/each}
			</ul>

			<div class="flex items-center justify-between gap-3 pt-2">
				<button
					type="button"
					onclick={() => { ambiguousCandidates = []; }}
					class="min-h-11 inline-flex items-center px-4 text-sm text-text-muted hover:text-text cursor-pointer"
				>
					Retour
				</button>
				<button
					type="button"
					disabled={saving}
					onclick={() => submitForm(true)}
					class="h-11 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
				>
					{saving ? 'Création…' : 'Créer un nouveau lead'}
				</button>
			</div>
		</div>
	{:else}
		<form
			method="POST"
			action="/prospection?/createExpress"
			onsubmit={handleSubmit}
		>
			<div class="space-y-4">
				<div class="flex items-start gap-3 p-3 rounded-xl bg-primary-light border border-primary">
					<Icon name="bolt" size={18} class="text-primary mt-0.5" />
					<p class="text-sm text-text-body leading-snug">
						Saisie rapide post-RDV. L'enrichissement (Zefix, scoring) se fera plus tard depuis la fiche.
					</p>
				</div>

				<div class="space-y-1">
					<label for="lx-raison" class="block text-sm font-medium text-text">
						Entreprise <span class="text-danger">*</span>
					</label>
					<input
						id="lx-raison"
						type="text"
						name="raison_sociale"
						bind:value={raison_sociale}
						placeholder="Ex : Vitrerie Dupond Sàrl"
						autocomplete="organization"
						autocapitalize="words"
						required
						maxlength="500"
						class="w-full h-11 px-3.5 py-2.5 text-base border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>

				<div class="space-y-1">
					<label for="lx-contact" class="block text-sm font-medium text-text">Contact</label>
					<input
						id="lx-contact"
						type="text"
						name="nom_contact"
						bind:value={nom_contact}
						placeholder="Ex : Marc Dubois"
						autocomplete="name"
						autocapitalize="words"
						maxlength="200"
						class="w-full h-11 px-3.5 py-2.5 text-base border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>

				<div class="space-y-1">
					<label for="lx-tel" class="block text-sm font-medium text-text">Téléphone</label>
					<input
						id="lx-tel"
						type="tel"
						name="telephone"
						bind:value={telephone}
						placeholder="+41 79 ..."
						autocomplete="tel"
						inputmode="tel"
						maxlength="30"
						class="w-full h-11 px-3.5 py-2.5 text-base border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>

				<div class="space-y-1">
					<label for="lx-notes" class="block text-sm font-medium text-text">Note</label>
					<input
						id="lx-notes"
						type="text"
						name="notes"
						bind:value={notes}
						placeholder="Ex : RDV 5 mai vitrage SE"
						maxlength="1000"
						class="w-full h-11 px-3.5 py-2.5 text-base border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>

				{#if errorMsg}
					<div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-danger/30 bg-danger-light text-danger text-sm">
						<Icon name="error" size={16} class="shrink-0" />
						<span>{errorMsg}</span>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => open = false}
						class="min-h-11 inline-flex items-center px-4 text-sm text-text-muted hover:text-text cursor-pointer"
					>
						Annuler
					</button>
					<button
						type="submit"
						disabled={saving || !raison_sociale.trim()}
						class="h-11 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
					>
						{saving ? 'Création…' : 'Créer le lead'}
					</button>
				</div>
			</div>
		</form>
	{/if}
</ModalForm>
