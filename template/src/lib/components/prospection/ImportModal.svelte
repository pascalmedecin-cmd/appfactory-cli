<script lang="ts">
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { config } from '$lib/config';
	import { invalidateAll } from '$app/navigation';
	import { API_LIMITS } from '$lib/api-limits';
	import { cantonNoms } from '$lib/prospection-utils';

	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];

	let { open = $bindable(false), importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null) }: {
		open: boolean;
		importResult: { message: string; type: 'success' | 'error' } | null;
	} = $props();

	let importing = $state(false);
	let activeTab = $state<'zefix' | 'simap' | 'fosc' | 'regbl' | 'minergie'>('zefix');
	let importCanton = $state('GE');
	let importLimit = $state('50');
	let importZefixName = $state('');
	let importSimapSearch = $state('');
	let importSimapDays = $state('30');
	let importFoscDays = $state('7');
	let importFoscCantons = $state<string[]>(['GE', 'VD']);
	let importRegblCantons = $state<string[]>(['GE', 'VD']);
	let importMinergieCantons = $state<string[]>(['GE', 'VD']);
	let importMinergiePremium = $state(false);

	const zefixMaxResults = API_LIMITS.zefix.maxResultsPerQuery;

	const tabs = [
		{ key: 'zefix' as const, label: 'Registre du commerce', icon: 'business', desc: 'RC' },
		{ key: 'simap' as const, label: 'Marchés publics', icon: 'gavel', desc: 'SIMAP' },
		{ key: 'fosc' as const, label: 'Feuille officielle', icon: 'newspaper', desc: 'FOSC' },
		{ key: 'regbl' as const, label: 'Registre des bâtiments', icon: 'apartment', desc: 'RegBL' },
		{ key: 'minergie' as const, label: 'Minergie', icon: 'eco', desc: 'Minergie' },
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

	function importFosc() {
		return importFromSource('/api/prospection/fosc', {
			cantons: importFoscCantons,
			daysBack: Number(importFoscDays) || 7,
		});
	}

	function importRegbl() {
		return importFromSource('/api/prospection/regbl', {
			cantons: importRegblCantons,
			limit: Number(importLimit) || 50,
		});
	}

	function importMinergie() {
		return importFromSource('/api/prospection/minergie', {
			cantons: importMinergieCantons,
			limit: Number(importLimit) || 50,
			premiumOnly: importMinergiePremium,
		});
	}

	function toggleCanton(list: string[], canton: string): string[] {
		return list.includes(canton) ? list.filter(c => c !== canton) : [...list, canton];
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
		<div class="flex flex-wrap gap-1.5">
			{#each tabs as tab}
				<button
					onclick={() => activeTab = tab.key}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer {activeTab === tab.key ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-muted hover:text-text hover:bg-surface-alt border border-transparent'}"
				>
					<span class="material-symbols-outlined text-[16px]">{tab.icon}</span>
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
						<strong>Registre du commerce</strong> - Entreprises suisses avec but social, capital nominal et publications FOSC.
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
							<option value="20">20 (ciblé)</option>
							<option value="50">50 (recommandé)</option>
							<option value="100">100</option>
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
						<strong>SIMAP - Marchés publics construction</strong> - Appels d'offres publics avec budgets et délais. Les résultats sont déjà filtrés par secteur construction.
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

		<!-- FOSC -->
		{#if activeTab === 'fosc'}
			<div class="space-y-4">
				<div class="p-4 rounded-lg bg-accent/5 border border-accent/10">
					<p class="text-sm text-text-body">
						<strong>FOSC - Feuille officielle suisse du commerce</strong> - Nouvelles inscriptions au registre du commerce, filtrées par secteur construction/bâtiment.
					</p>
					<p class="text-xs text-text-muted mt-1.5">
						<span class="material-symbols-outlined text-[13px] align-text-bottom">lightbulb</span>
						Signal chaud : une nouvelle entreprise du bâtiment a besoin de tout au démarrage. Les publications sont mises à jour quotidiennement.
					</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-text mb-1">Cantons</label>
						<div class="flex flex-wrap gap-2">
							{#each cantons as c}
								<button
									onclick={() => importFoscCantons = toggleCanton(importFoscCantons, c)}
									class="px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors {importFoscCantons.includes(c) ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted hover:text-text'}"
								>
									{cantonNoms[c] ?? c}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-text mb-1">Période</label>
						<select bind:value={importFoscDays} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							<option value="7">7 derniers jours</option>
							<option value="14">14 derniers jours</option>
							<option value="30">30 derniers jours</option>
						</select>
					</div>
				</div>
				<button
					onclick={importFosc}
					disabled={importing || importFoscCantons.length === 0}
					class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">cloud_download</span>
					{importing ? 'Import en cours…' : 'Lancer l\'import'}
				</button>
			</div>
		{/if}

		<!-- RegBL -->
		{#if activeTab === 'regbl'}
			<div class="space-y-4">
				<div class="p-4 rounded-lg bg-accent/5 border border-accent/10">
					<p class="text-sm text-text-body">
						<strong>RegBL - Registre fédéral des bâtiments</strong> - Bâtiments en phase de construction (autorisés ou en chantier) en Suisse romande.
					</p>
					<p class="text-xs text-text-muted mt-1.5">
						<span class="material-symbols-outlined text-[13px] align-text-bottom">lightbulb</span>
						Signal chaud : un bâtiment au statut « autorisé » ou « en construction » = chantier actif. Croisez ensuite avec Zefix pour identifier le maître d'ouvrage.
					</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-text mb-1">Cantons</label>
						<div class="flex flex-wrap gap-2">
							{#each cantons as c}
								<button
									onclick={() => importRegblCantons = toggleCanton(importRegblCantons, c)}
									class="px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors {importRegblCantons.includes(c) ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted hover:text-text'}"
								>
									{cantonNoms[c] ?? c}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-text mb-1">Nombre de résultats</label>
						<select bind:value={importLimit} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							<option value="20">20 (ciblé)</option>
							<option value="50">50 (recommandé)</option>
							<option value="100">100</option>
						</select>
					</div>
				</div>
				<button
					onclick={importRegbl}
					disabled={importing || importRegblCantons.length === 0}
					class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">cloud_download</span>
					{importing ? 'Import en cours…' : 'Lancer l\'import'}
				</button>
			</div>
		{/if}

		<!-- Minergie -->
		{#if activeTab === 'minergie'}
			<div class="space-y-4">
				<div class="p-4 rounded-lg bg-accent/5 border border-accent/10">
					<p class="text-sm text-text-body">
						<strong>Minergie - Bâtiments certifiés</strong> - Projets haut de gamme avec label énergétique (Minergie, P, A, ECO). Architectes sensibles à la performance.
					</p>
					<p class="text-xs text-text-muted mt-1.5">
						<span class="material-symbols-outlined text-[13px] align-text-bottom">lightbulb</span>
						Les labels Minergie-P et Minergie-A indiquent des projets premium, cibles idéales pour les films de protection solaire et thermique.
					</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-text mb-1">Cantons</label>
						<div class="flex flex-wrap gap-2">
							{#each cantons as c}
								<button
									onclick={() => importMinergieCantons = toggleCanton(importMinergieCantons, c)}
									class="px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors {importMinergieCantons.includes(c) ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted hover:text-text'}"
								>
									{cantonNoms[c] ?? c}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-text mb-1">Nombre de résultats</label>
						<select bind:value={importLimit} class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
							<option value="20">20 (ciblé)</option>
							<option value="50">50 (recommandé)</option>
							<option value="100">100</option>
						</select>
					</div>
				</div>
				<div>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={importMinergiePremium} class="rounded border-border" />
						<span class="text-sm text-text">Labels premium uniquement (P, A, ECO)</span>
					</label>
				</div>
				<button
					onclick={importMinergie}
					disabled={importing || importMinergieCantons.length === 0}
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
