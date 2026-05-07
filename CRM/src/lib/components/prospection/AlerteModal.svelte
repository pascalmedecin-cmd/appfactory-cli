<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
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
		<div class="space-y-6">
			<div class="flex items-start gap-3 p-3 rounded-xl" style="background: var(--color-prosp-qualify-bg); border: 1px solid color-mix(in srgb, var(--color-prosp-qualify-border), transparent 70%)">
				<span class="mt-0.5" style="color: var(--color-prosp-qualify)"><Icon name="notifications_active" size={20} /></span>
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
					class="w-full h-10 px-3 text-sm box-border border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
				/>
			</div>

			<div class="p-4 rounded-xl space-y-4" style="background: var(--color-prosp-import-bg); border: 1px solid color-mix(in srgb, var(--color-prosp-import-border), transparent 80%)">
				<div class="flex items-center gap-2">
					<span style="color: var(--color-prosp-import)"><Icon name="tune" size={16} /></span>
					<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-prosp-import)">Critères de filtrage</p>
				</div>
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

			<div class="p-4 rounded-xl" style="background: var(--color-prosp-enrich-bg); border: 1px solid color-mix(in srgb, var(--color-prosp-enrich-border), transparent 80%)">
				<label class="block text-sm font-medium text-text mb-1">
					<span class="inline-flex items-center gap-1.5">
						<span style="color: var(--color-prosp-enrich)"><Icon name="sell" size={16} /></span>
						Mots-clés
					</span>
				</label>
				<p class="text-xs text-text-muted mb-3">Insensible aux accents : « fenetre » trouvera aussi « fenêtre »</p>
				{#if motsCles.length > 0}
					<div class="flex flex-wrap gap-2 mb-3">
						{#each motsCles as mot}
							<span class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs rounded-full font-medium bg-prosp-enrich/12 text-prosp-enrich border border-prosp-enrich-border/40">
								{mot}
								<button type="button" onclick={() => removeMotCle(mot)} class="flex items-center justify-center w-4 h-4 rounded-full cursor-pointer transition-colors text-prosp-enrich/60" aria-label="Supprimer {mot}">
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
					class="w-full h-10 px-3 text-sm box-border border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMotCle(); } }}
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-text mb-1.5">
					<span class="inline-flex items-center gap-1.5">
						<Icon name="schedule" size={16} class="text-text-muted" />
						Fréquence
					</span>
				</label>
				<select name="frequence_alerte" bind:value={frequence} class="w-full h-10 px-3 text-sm box-border border border-border rounded-lg bg-white">
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
				class="inline-flex items-center h-10 px-4 box-border text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving || !nom}
				class="inline-flex items-center h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
			>
				{saving ? 'Création…' : 'Créer l\'alerte'}
			</button>
		</div>
	</form>
</ModalForm>
