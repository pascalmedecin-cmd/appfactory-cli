<script lang="ts">
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { config } from '$lib/config';
	import { invalidateAll } from '$app/navigation';
	import { API_LIMITS } from '$lib/api-limits';

	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];
	const cantonNoms: Record<string, string> = { GE: 'Genève', VD: 'Vaud', VS: 'Valais', NE: 'Neuchâtel', FR: 'Fribourg', JU: 'Jura' };

	let { open = $bindable(false), importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null) }: {
		open: boolean;
		importResult: { message: string; type: 'success' | 'error' } | null;
	} = $props();

	let importing = $state(false);
	let activeTab = $state<'zefix' | 'simap'>('zefix');
	let importCanton = $state('GE');
	let importLimit = $state('50');
	let importZefixName = $state('');
	let importSimapSearch = $state('');
	let importSimapDays = $state('30');

	const zefixMaxResults = API_LIMITS.zefix.maxResultsPerQuery;

	const tabs = [
		{ key: 'zefix' as const, label: 'Registre du commerce', icon: 'business', desc: 'RC' },
		{ key: 'simap' as const, label: 'Marchés publics', icon: 'gavel', desc: 'SIMAP' },
	];

	async function importFromSource(url: string, body: Record<string, unknown>) {
		importing = true;
		importResult = null;
		try {
			const resp = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const result = await resp.json();
			if (resp.ok) {
				importResult = { message: result.message, type: 'success' };
				await invalidateAll();
			} else {
				importResult = { message: result.error || 'Erreur inconnue', type: 'error' };
			}
		} catch (err) {
			importResult = { message: `Erreur: ${String(err)}`, type: 'error' };
		} finally {
			importing = false;
		}
	}

	function importZefix() {
		return importFromSource('/api/prospection/zefix', {
			canton: importCanton,
			name: importZefixName || undefined,
			activeOnly: true,
			limit: Number(importLimit) || 100,
		});
	}

	function importSimap() {
		return importFromSource('/api/prospection/simap', {
			canton: importCanton,
			search: importSimapSearch || undefined,
			daysBack: Number(importSimapDays) || 30,
		});
	}
</script>

<ModalForm
	bind:open
	title="Importer des prospects"
	icon="cloud_download"
	headerVariant="accent"
	saving={importing}
	maxWidth="max-w-2xl"
>
	<div class="space-y-4">
		<!-- Tabs sources -->
		<div class="flex gap-2">
			{#each tabs as tab}
				<button
					onclick={() => activeTab = tab.key}
					class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer {activeTab === tab.key ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-muted hover:text-text hover:bg-surface-alt border border-transparent'}"
				>
					<span class="material-symbols-outlined text-[18px]">{tab.icon}</span>
					<span class="hidden sm:inline">{tab.label}</span>
					<span class="sm:hidden">{tab.desc}</span>
				</button>
			{/each}
		</div>

		<!-- Registre du commerce -->
		{#if activeTab === 'zefix'}
			<div class="space-y-4">
				<div class="p-4 rounded-lg bg-accent/5 border border-accent/10">
					<p class="text-sm text-text-body">
						<strong>Registre du commerce</strong> — Entreprises suisses avec but social, capital nominal et publications FOSC.
					</p>
					<p class="text-xs text-text-muted mt-1.5">
						<span class="material-symbols-outlined text-[13px] align-text-bottom">lightbulb</span>
						Un import ciblé (nom + canton) donne de meilleurs résultats qu'un import large sans filtre. Mieux vaut 50 prospects qualifiés que 500 à trier.
					</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-text mb-1">Canton</label>
						<select bind:value={importCanton} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							{#each cantons as c}
								<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-text mb-1">Nombre de résultats</label>
						<select bind:value={importLimit} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							<option value="25">25 — ciblé</option>
							<option value="50">50 — recommandé</option>
							<option value="100">100</option>
							<option value="200">200</option>
						</select>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Filtrer par nom <span class="font-normal text-text-muted">(recommandé pour des résultats pertinents)</span></label>
					<input
						type="text"
						bind:value={importZefixName}
						placeholder="Ex : construction, rénovation, architecte…"
						class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent"
					/>
				</div>
				<button
					onclick={importZefix}
					disabled={importing}
					class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">cloud_download</span>
					{importing ? 'Import en cours…' : 'Lancer l\'import'}
				</button>
			</div>
		{/if}

		<!-- SIMAP -->
		{#if activeTab === 'simap'}
			<div class="space-y-4">
				<div class="p-4 rounded-lg bg-accent/5 border border-accent/10">
					<p class="text-sm text-text-body">
						<strong>SIMAP — Marchés publics construction</strong> — Appels d'offres publics avec budgets et délais. Les résultats sont déjà filtrés par secteur construction.
					</p>
					<p class="text-xs text-text-muted mt-1.5">
						<span class="material-symbols-outlined text-[13px] align-text-bottom">lightbulb</span>
						Combiner canton + mots-clés précis (ex : « façade », « vitrage ») pour ne remonter que les appels d'offres pertinents.
					</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-text mb-1">Canton</label>
						<select bind:value={importCanton} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							{#each cantons as c}
								<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-text mb-1">Période</label>
						<select bind:value={importSimapDays} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							<option value="7">7 derniers jours</option>
							<option value="30">30 derniers jours</option>
							<option value="90">3 derniers mois</option>
						</select>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Mots-clés <span class="font-normal text-text-muted">(optionnel, min. 3 caractères)</span></label>
					<input
						type="text"
						bind:value={importSimapSearch}
						placeholder="rénovation, façade…"
						class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent"
					/>
				</div>
				<button
					onclick={importSimap}
					disabled={importing}
					class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">cloud_download</span>
					{importing ? 'Import en cours…' : 'Lancer l\'import'}
				</button>
			</div>
		{/if}

		{#if importResult}
			<div class="flex items-center gap-2.5 p-4 rounded-lg text-sm {importResult.type === 'success' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}">
				<span class="material-symbols-outlined text-[20px]">{importResult.type === 'success' ? 'check_circle' : 'error'}</span>
				<span class="font-medium">{importResult.message}</span>
			</div>
		{/if}

		<div class="flex justify-end pt-3 border-t border-border">
			<button
				type="button"
				onclick={() => { open = false; importResult = null; }}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer transition-colors"
			>
				Fermer
			</button>
		</div>
	</div>
</ModalForm>
