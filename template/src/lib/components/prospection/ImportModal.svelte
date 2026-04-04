<script lang="ts">
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { config } from '$lib/config';
	import { invalidateAll } from '$app/navigation';

	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];
	const cantonNoms: Record<string, string> = { GE: 'Geneve', VD: 'Vaud', VS: 'Valais', NE: 'Neuchatel', FR: 'Fribourg', JU: 'Jura' };

	let { open = $bindable(false), importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null) }: {
		open: boolean;
		importResult: { message: string; type: 'success' | 'error' } | null;
	} = $props();

	let importing = $state(false);
	let importCanton = $state('GE');
	let importKeywords = $state('construction, architecte, batiment');
	let importLimit = $state('100');
	let importZefixName = $state('');
	let importSimapSearch = $state('');
	let importSimapDays = $state('30');

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

	function importLindas() {
		const keywords = importKeywords.split(',').map((k) => k.trim()).filter(Boolean);
		return importFromSource('/api/prospection/lindas', {
			canton: importCanton,
			keywords,
			limit: Number(importLimit) || 100,
		});
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
	title="Importer des leads"
	saving={importing}
>
	<div class="space-y-5">
		<!-- LINDAS -->
		<div class="p-4 bg-surface rounded-lg border border-border">
			<div class="flex items-center gap-2 mb-3">
				<span class="material-symbols-outlined text-[20px] text-accent">database</span>
				<h3 class="font-semibold text-text">LINDAS — Registre du commerce</h3>
			</div>
			<p class="text-xs text-text-muted mb-3">
				Import d'entreprises depuis le registre federal (donnees ouvertes). Filtrage par canton et mots-cles dans le but social.
			</p>
			<div class="grid grid-cols-2 gap-3 mb-3">
				<div>
					<label class="block text-sm font-medium text-text mb-1">Canton</label>
					<select bind:value={importCanton} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						{#each cantons as c}
							<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Limite</label>
					<select bind:value={importLimit} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="50">50 resultats</option>
						<option value="100">100 resultats</option>
						<option value="200">200 resultats</option>
						<option value="500">500 resultats</option>
					</select>
				</div>
			</div>
			<div class="mb-3">
				<label class="block text-sm font-medium text-text mb-1">Mots-cles (separes par des virgules)</label>
				<input
					type="text"
					bind:value={importKeywords}
					placeholder="construction, architecte, batiment..."
					class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white"
				/>
			</div>
			<button
				onclick={importLindas}
				disabled={importing}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer"
			>
				<span class="material-symbols-outlined text-[16px]">cloud_download</span>
				{importing ? 'Import en cours...' : 'Importer depuis LINDAS'}
			</button>
		</div>

		<!-- Zefix REST -->
		<div class="p-4 bg-surface rounded-lg border border-border">
			<div class="flex items-center gap-2 mb-3">
				<span class="material-symbols-outlined text-[20px] text-accent">business</span>
				<h3 class="font-semibold text-text">Zefix REST — Registre du commerce (complet)</h3>
			</div>
			<p class="text-xs text-text-muted mb-3">
				Donnees completes : but social, capital nominal, publications FOSC. Necessite les credentials (env vars ZEFIX_USERNAME + ZEFIX_PASSWORD).
			</p>
			<div class="grid grid-cols-2 gap-3 mb-3">
				<div>
					<label class="block text-sm font-medium text-text mb-1">Canton</label>
					<select bind:value={importCanton} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						{#each cantons as c}
							<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Limite</label>
					<select bind:value={importLimit} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="50">50 resultats</option>
						<option value="100">100 resultats</option>
						<option value="200">200 resultats</option>
						<option value="500">500 resultats</option>
					</select>
				</div>
			</div>
			<div class="mb-3">
				<label class="block text-sm font-medium text-text mb-1">Nom d'entreprise (optionnel)</label>
				<input
					type="text"
					bind:value={importZefixName}
					placeholder="Filtrer par nom..."
					class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white"
				/>
			</div>
			<button
				onclick={importZefix}
				disabled={importing}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer"
			>
				<span class="material-symbols-outlined text-[16px]">cloud_download</span>
				{importing ? 'Import en cours...' : 'Importer depuis Zefix'}
			</button>
		</div>

		<!-- SIMAP -->
		<div class="p-4 bg-surface rounded-lg border border-border">
			<div class="flex items-center gap-2 mb-3">
				<span class="material-symbols-outlined text-[20px] text-accent">gavel</span>
				<h3 class="font-semibold text-text">SIMAP — Marches publics construction</h3>
			</div>
			<p class="text-xs text-text-muted mb-3">
				Appels d'offres publics construction. Leads chauds avec budgets et delais.
			</p>
			<div class="grid grid-cols-2 gap-3 mb-3">
				<div>
					<label class="block text-sm font-medium text-text mb-1">Canton</label>
					<select bind:value={importCanton} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						{#each cantons as c}
							<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Periode</label>
					<select bind:value={importSimapDays} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="7">7 derniers jours</option>
						<option value="30">30 derniers jours</option>
						<option value="90">90 derniers jours</option>
					</select>
				</div>
			</div>
			<div class="mb-3">
				<label class="block text-sm font-medium text-text mb-1">Recherche (optionnel, min. 3 car.)</label>
				<input
					type="text"
					bind:value={importSimapSearch}
					placeholder="renovation, facade..."
					class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white"
				/>
			</div>
			<button
				onclick={importSimap}
				disabled={importing}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer"
			>
				<span class="material-symbols-outlined text-[16px]">cloud_download</span>
				{importing ? 'Import en cours...' : 'Importer depuis SIMAP'}
			</button>
		</div>

		<!-- search.ch info -->
		<div class="p-4 bg-surface rounded-lg border border-border opacity-60">
			<div class="flex items-center gap-2 mb-2">
				<span class="material-symbols-outlined text-[20px] text-text-muted">phone</span>
				<h3 class="font-semibold text-text">search.ch — Enrichissement telephone</h3>
			</div>
			<p class="text-xs text-text-muted">
				Cle API en attente. Utilisez le bouton "Enrichir telephone" sur chaque lead une fois la cle configuree.
			</p>
		</div>

		{#if importResult}
			<div class="p-3 rounded-lg text-sm {importResult.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
				{importResult.message}
			</div>
		{/if}

		<div class="flex justify-end pt-2">
			<button
				type="button"
				onclick={() => { open = false; importResult = null; }}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Fermer
			</button>
		</div>
	</div>
</ModalForm>
