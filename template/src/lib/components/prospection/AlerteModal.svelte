<script lang="ts">
	import { enhance } from '$app/forms';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import MultiSelectDropdown from '$lib/components/MultiSelectDropdown.svelte';
	import { toasts } from '$lib/stores/toast';
	import { sourceOptions, cantonOptions, temperatureOptions } from '$lib/prospection-utils';

	let {
		open = $bindable(false),
	}: {
		open?: boolean;
	} = $props();

	let nom = $state('');
	let sources = $state<string[]>([]);
	let cantons = $state<string[]>([]);
	let temperatures = $state<string[]>([]);
	let frequence = $state('quotidien');
	let motsCles = $state<string[]>([]);
	let motCleInput = $state('');
	let saving = $state(false);

	function reset() {
		nom = '';
		sources = [];
		cantons = [];
		temperatures = [];
		motsCles = [];
		motCleInput = '';
		frequence = 'quotidien';
	}

	function addMotCle() {
		const mot = motCleInput.trim();
		if (mot && !motsCles.includes(mot)) {
			motsCles = [...motsCles, mot];
		}
		motCleInput = '';
	}

	function removeMotCle(mot: string) {
		motsCles = motsCles.filter(m => m !== mot);
	}

	$effect(() => {
		if (!open) reset();
	});
</script>

<ModalForm
	bind:open
	title="Créer une alerte"
	icon="notifications_active"
	headerVariant="accent"
	maxWidth="max-w-lg"
>
	<form
		method="POST"
		action="?/saveRecherche"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') {
					open = false;
					toasts.success('Alerte créée');
				} else {
					toasts.error('Erreur lors de la création');
				}
				await update();
			};
		}}
	>
		<div class="space-y-5">
			<div class="flex items-start gap-3 p-3.5 rounded-lg bg-accent/5 border border-accent/10">
				<span class="material-symbols-outlined text-[20px] text-accent mt-0.5">info</span>
				<p class="text-sm text-text-body">Recevez une notification lorsque de nouveaux prospects correspondent à vos critères.</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-text mb-1.5">Nom de l'alerte</label>
				<input
					type="text"
					name="nom"
					bind:value={nom}
					placeholder="Ex : Construction Genève chauds"
					required
					class="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent"
				/>
			</div>

			<div class="p-4 rounded-lg bg-surface-alt space-y-4">
				<p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Critères de filtrage</p>
				<MultiSelectDropdown
					bind:selected={sources}
					options={sourceOptions}
					icon="database"
					label="Sources"
					tooltip="Registres et bases de données à surveiller"
				/>
				<MultiSelectDropdown
					bind:selected={cantons}
					options={cantonOptions}
					icon="location_on"
					label="Cantons"
					tooltip="Zones géographiques à surveiller"
				/>
				<MultiSelectDropdown
					bind:selected={temperatures}
					options={temperatureOptions}
					icon="thermostat"
					label="Température"
					tooltip="Niveau d'intérêt estimé du prospect"
				/>
			</div>

			<div class="p-4 rounded-lg bg-surface-alt">
				<label class="block text-sm font-medium text-text mb-1">
					<span class="inline-flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[16px] text-accent">sell</span>
						Mots-clés
					</span>
				</label>
				<p class="text-xs text-text-muted mb-3">Insensible aux accents : « fenetre » trouvera aussi « fenêtre »</p>
				{#if motsCles.length > 0}
					<div class="flex flex-wrap gap-2 mb-3">
						{#each motsCles as mot}
							<span class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs rounded-full bg-accent/10 text-accent font-medium border border-accent/15">
								{mot}
								<button type="button" onclick={() => removeMotCle(mot)} class="flex items-center justify-center w-4 h-4 rounded-full hover:bg-accent/20 text-accent/60 hover:text-accent cursor-pointer transition-colors" aria-label="Supprimer {mot}">
									<span class="text-[10px] leading-none font-bold">&times;</span>
								</button>
							</span>
						{/each}
					</div>
				{/if}
				<input
					type="text"
					bind:value={motCleInput}
					placeholder="Taper un mot-clé puis Entrée"
					class="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent"
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMotCle(); } }}
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-text mb-1.5">
					<span class="inline-flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[16px] text-text-muted">schedule</span>
						Fréquence
					</span>
				</label>
				<select name="frequence_alerte" bind:value={frequence} class="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg bg-white">
					<option value="quotidien">Quotidienne</option>
					<option value="hebdomadaire">Hebdomadaire</option>
				</select>
			</div>
		</div>

		<!-- Hidden fields -->
		<input type="hidden" name="sources" value={sources.length > 0 ? JSON.stringify(sources) : ''} />
		<input type="hidden" name="cantons" value={cantons.length > 0 ? JSON.stringify(cantons) : ''} />
		<input type="hidden" name="temperatures" value={temperatures.length > 0 ? JSON.stringify(temperatures) : ''} />
		<input type="hidden" name="mots_cles" value={motsCles.length > 0 ? JSON.stringify(motsCles) : ''} />
		<input type="hidden" name="alerte_active" value="true" />

		<div class="flex justify-end gap-3 pt-5 border-t border-border mt-2">
			<button
				type="button"
				onclick={() => open = false}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving || !nom}
				class="px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
			>
				{saving ? 'Création…' : 'Créer l\'alerte'}
			</button>
		</div>
	</form>
</ModalForm>
