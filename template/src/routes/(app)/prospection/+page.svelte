<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';
	import { calculerScore } from '$lib/scoring';

	let { data }: { data: PageData } = $props();

	type Lead = (typeof data.leads)[number];

	let slideOutOpen = $state(false);
	let selectedLead = $state<Lead | null>(null);
	let modalOpen = $state(false);
	let importModalOpen = $state(false);
	let saving = $state(false);
	let importing = $state(false);
	let enriching = $state(false);
	let importResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let selectedIds = $state<Set<string>>(new Set());
	let saveSearchOpen = $state(false);
	let saveSearchName = $state('');
	let saveSearchAlerte = $state(true);
	let saveSearchFrequence = $state('quotidien');
	let savingSearch = $state(false);
	let recherchesOpen = $state(false);

	// Import form
	let importCanton = $state('GE');
	let importKeywords = $state('construction, architecte, batiment');
	let importLimit = $state('100');
	let importZefixName = $state('');
	let importSimapSearch = $state('');
	let importSimapDays = $state('30');

	// Filters
	let filterSource = $state('');
	let filterCanton = $state('');
	let filterStatut = $state('nouveau,interesse');
	let filterScoreMin = $state('');

	async function importLindas() {
		importing = true;
		importResult = null;
		try {
			const keywords = importKeywords.split(',').map((k) => k.trim()).filter(Boolean);
			const resp = await fetch('/api/prospection/lindas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					canton: importCanton,
					keywords,
					limit: Number(importLimit) || 100,
				}),
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

	async function importZefix() {
		importing = true;
		importResult = null;
		try {
			const resp = await fetch('/api/prospection/zefix', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					canton: importCanton,
					name: importZefixName || undefined,
					activeOnly: true,
					limit: Number(importLimit) || 100,
				}),
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

	async function importSimap() {
		importing = true;
		importResult = null;
		try {
			const resp = await fetch('/api/prospection/simap', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					canton: importCanton,
					search: importSimapSearch || undefined,
					daysBack: Number(importSimapDays) || 30,
				}),
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

	async function enrichirTelephone(leadId: string) {
		enriching = true;
		try {
			const resp = await fetch('/api/prospection/search-ch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lead_id: leadId }),
			});
			const result = await resp.json();
			if (resp.ok) {
				importResult = { message: result.message, type: result.telephone ? 'success' : 'error' };
				await invalidateAll();
				// Refresh selected lead
				if (selectedLead) {
					const updated = data.leads.find((l) => l.id === selectedLead!.id);
					if (updated) selectedLead = updated;
				}
			} else {
				importResult = { message: result.error || 'Erreur enrichissement', type: 'error' };
			}
		} catch (err) {
			importResult = { message: `Erreur: ${String(err)}`, type: 'error' };
		} finally {
			enriching = false;
		}
	}

	// Form fields
	let source = $state('manuel');
	let source_id = $state('');
	let raison_sociale = $state('');
	let nom_contact = $state('');
	let adresse = $state('');
	let npa = $state('');
	let localite = $state('');
	let canton = $state('');
	let telephone = $state('');
	let site_web = $state('');
	let email = $state('');
	let secteur_detecte = $state('');
	let description = $state('');
	let montant = $state('');
	let date_publication = $state('');

	const filteredLeads = $derived.by(() => {
		let result = data.leads;
		if (filterSource) result = result.filter((l) => l.source === filterSource);
		if (filterCanton) result = result.filter((l) => l.canton === filterCanton);
		if (filterStatut) {
			const statuts = filterStatut.split(',');
			result = result.filter((l) => statuts.includes(l.statut));
		}
		if (filterScoreMin) {
			const min = Number(filterScoreMin);
			result = result.filter((l) => (l.score_pertinence ?? 0) >= min);
		}
		return result;
	});

	const columns = [
		{ key: 'score_pertinence', label: 'Score', sortable: true, class: 'w-16' },
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-20' },
		{ key: 'secteur_detecte', label: 'Secteur', sortable: true },
		{ key: 'source', label: 'Source', sortable: true, class: 'w-24' },
		{ key: 'statut', label: 'Statut', sortable: true, class: 'w-28' },
	];

	function scoreBadgeVariant(score: number): 'danger' | 'warning' | 'muted' | 'default' {
		if (score >= 8) return 'danger';
		if (score >= 5) return 'warning';
		if (score >= 2) return 'muted';
		return 'default';
	}

	function statutBadgeVariant(statut: string): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'nouveau': return 'warning';
			case 'interesse': return 'accent';
			case 'ecarte': return 'muted';
			case 'transfere': return 'success';
			default: return 'default';
		}
	}

	function sourceLabel(s: string): string {
		const map: Record<string, string> = {
			zefix: 'Zefix', lindas: 'LINDAS', simap: 'SIMAP',
			sitg: 'SITG', search_ch: 'search.ch', fosc: 'FOSC', manuel: 'Manuel',
		};
		return map[s] ?? s;
	}

	function openDetail(lead: Lead) {
		selectedLead = lead;
		slideOutOpen = true;
	}

	function openCreate() {
		resetForm();
		modalOpen = true;
	}

	function resetForm() {
		source = 'manuel'; source_id = ''; raison_sociale = ''; nom_contact = '';
		adresse = ''; npa = ''; localite = ''; canton = ''; telephone = '';
		site_web = ''; email = ''; secteur_detecte = ''; description = '';
		montant = ''; date_publication = '';
	}

	type Recherche = (typeof data.recherches)[number];

	function chargerRecherche(r: Recherche) {
		if (r.sources?.length === 1) filterSource = r.sources[0];
		else filterSource = '';
		if (r.cantons?.length === 1) filterCanton = r.cantons[0];
		else filterCanton = '';
		filterScoreMin = r.score_minimum ? String(r.score_minimum) : '';
		filterStatut = '';
		recherchesOpen = false;
	}

	function getScoreDetail(lead: Lead) {
		return calculerScore({
			canton: lead.canton,
			description: lead.description,
			raison_sociale: lead.raison_sociale,
			source: lead.source,
			date_publication: lead.date_publication,
			telephone: lead.telephone,
			montant: lead.montant ? Number(lead.montant) : null,
		});
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-text">Prospection</h1>
			<p class="text-sm text-text-muted">{filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''}</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent border border-accent hover:bg-accent/10 rounded-lg cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">cloud_download</span>
				Importer
			</button>
			<button
				onclick={openCreate}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				Ajouter un lead
			</button>
		</div>
	</div>

	<!-- Filtres -->
	<div class="flex flex-wrap gap-3 p-3 bg-surface rounded-lg border border-border">
		<select bind:value={filterSource} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="">Toutes sources</option>
			<option value="zefix">Zefix</option>
			<option value="lindas">LINDAS</option>
			<option value="simap">SIMAP</option>
			<option value="sitg">SITG</option>
			<option value="fosc">FOSC</option>
			<option value="manuel">Manuel</option>
		</select>
		<select bind:value={filterCanton} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="">Tous cantons</option>
			<option value="GE">GE</option>
			<option value="VD">VD</option>
			<option value="VS">VS</option>
			<option value="NE">NE</option>
			<option value="FR">FR</option>
			<option value="JU">JU</option>
			<option value="Autre">Autre</option>
		</select>
		<select bind:value={filterStatut} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="nouveau,interesse">Nouveau + Interesse</option>
			<option value="nouveau">Nouveau</option>
			<option value="interesse">Interesse</option>
			<option value="ecarte">Ecarte</option>
			<option value="transfere">Transfere</option>
			<option value="">Tous</option>
		</select>
		<select bind:value={filterScoreMin} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="">Tout score</option>
			<option value="8">Chaud (8+)</option>
			<option value="5">Tiede+ (5+)</option>
			<option value="2">Froid+ (2+)</option>
		</select>
		<div class="ml-auto flex items-center gap-2">
			<button
				onclick={() => saveSearchOpen = !saveSearchOpen}
				class="flex items-center gap-1 px-3 py-1.5 text-sm text-accent border border-accent rounded-md hover:bg-accent/10 cursor-pointer"
			>
				<span class="material-symbols-outlined text-[16px]">bookmark_add</span>
				Sauvegarder
			</button>
			{#if data.recherches.length > 0}
				<button
					onclick={() => recherchesOpen = !recherchesOpen}
					class="flex items-center gap-1 px-3 py-1.5 text-sm text-text border border-border rounded-md hover:bg-surface-alt cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">bookmarks</span>
					Recherches ({data.recherches.length})
				</button>
			{/if}
		</div>
	</div>

	<!-- Formulaire sauvegarde recherche -->
	{#if saveSearchOpen}
		<form
			method="POST"
			action="?/saveRecherche"
			class="p-3 bg-accent/5 rounded-lg border border-accent/20"
			use:enhance={() => {
				savingSearch = true;
				return async ({ result, update }) => {
					savingSearch = false;
					saveSearchOpen = false;
					saveSearchName = '';
					if (result.type === 'success') toasts.success('Recherche sauvegardée');
					else toasts.error('Erreur lors de la sauvegarde');
					await update();
				};
			}}
		>
			<div class="flex flex-wrap items-end gap-3">
				<div class="flex-1 min-w-48">
					<label class="block text-xs font-medium text-text mb-1">Nom de la recherche</label>
					<input
						type="text"
						name="nom"
						bind:value={saveSearchName}
						placeholder="Ex: Construction GE score 5+"
						required
						class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-text mb-1">Alerte</label>
					<select name="frequence_alerte" bind:value={saveSearchFrequence} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="quotidien">Quotidienne</option>
						<option value="hebdomadaire">Hebdomadaire</option>
					</select>
				</div>
				<label class="flex items-center gap-2 text-sm text-text cursor-pointer">
					<input type="checkbox" bind:checked={saveSearchAlerte} />
					Alerte active
				</label>
				<!-- Hidden fields for current filters -->
				<input type="hidden" name="sources" value={filterSource ? JSON.stringify([filterSource]) : ''} />
				<input type="hidden" name="cantons" value={filterCanton ? JSON.stringify([filterCanton]) : ''} />
				<input type="hidden" name="score_minimum" value={filterScoreMin} />
				<input type="hidden" name="alerte_active" value={String(saveSearchAlerte)} />
				<button
					type="submit"
					disabled={savingSearch || !saveSearchName}
					class="px-4 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-md disabled:opacity-50 cursor-pointer"
				>
					{savingSearch ? 'Enregistrement...' : 'Enregistrer'}
				</button>
				<button
					type="button"
					onclick={() => saveSearchOpen = false}
					class="px-3 py-1.5 text-sm text-text-muted hover:text-text cursor-pointer"
				>
					Annuler
				</button>
			</div>
		</form>
	{/if}

	<!-- Liste recherches sauvegardees -->
	{#if recherchesOpen}
		<div class="p-3 bg-surface rounded-lg border border-border space-y-2">
			<div class="flex items-center justify-between mb-1">
				<h3 class="text-sm font-semibold text-text">Recherches sauvegardees</h3>
				<button onclick={() => recherchesOpen = false} class="text-sm text-text-muted hover:text-text cursor-pointer">Fermer</button>
			</div>
			{#each data.recherches as rech}
				<div class="flex items-center justify-between p-2 rounded bg-white border border-border/50">
					<div class="flex items-center gap-3">
						<button
							onclick={() => chargerRecherche(rech)}
							class="text-sm font-medium text-accent hover:underline cursor-pointer"
						>
							{rech.nom}
						</button>
						<span class="text-xs text-text-muted">
							{[
								rech.sources?.length ? rech.sources.join(', ') : null,
								rech.cantons?.length ? rech.cantons.join(', ') : null,
								rech.score_minimum ? `score ${rech.score_minimum}+` : null,
							].filter(Boolean).join(' · ') || 'Tous filtres'}
						</span>
						{#if rech.alerte_active}
							<span class="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">{rech.frequence_alerte}</span>
						{/if}
						{#if rech.nb_nouveaux && rech.nb_nouveaux > 0}
							<span class="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">{rech.nb_nouveaux} nouveau{rech.nb_nouveaux > 1 ? 'x' : ''}</span>
						{/if}
					</div>
					<form method="POST" action="?/deleteRecherche" use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') toasts.success('Recherche supprimée');
							else toasts.error('Erreur lors de la suppression');
							await update();
						};
					}}>
						<input type="hidden" name="id" value={rech.id} />
						<button type="submit" class="text-text-muted hover:text-danger cursor-pointer" title="Supprimer">
							<span class="material-symbols-outlined text-[16px]">delete</span>
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Notification import/enrichissement -->
	{#if importResult}
		<div class="flex items-center justify-between p-3 rounded-lg border {importResult.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}">
			<span class="text-sm">{importResult.message}</span>
			<button onclick={() => importResult = null} class="text-sm opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Barre actions batch -->
	{#if selectedIds.size > 0}
		<div class="flex items-center gap-3 p-3 bg-accent/5 rounded-lg border border-accent/20">
			<span class="text-sm font-medium text-text">{selectedIds.size} selectionne{selectedIds.size > 1 ? 's' : ''}</span>
			<form method="POST" action="?/batchStatut" use:enhance={() => {
				const count = selectedIds.size;
				return async ({ result, update }) => {
					selectedIds = new Set();
					if (result.type === 'success') toasts.success(`${count} lead${count > 1 ? 's' : ''} marqué${count > 1 ? 's' : ''} intéressé${count > 1 ? 's' : ''}`);
					else toasts.error('Erreur lors de la mise à jour');
					await update();
				};
			}}>
				<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
				<input type="hidden" name="statut" value="interesse" />
				<button type="submit" class="px-3 py-1 text-sm font-medium text-accent border border-accent rounded hover:bg-accent/10 cursor-pointer">
					Interesse
				</button>
			</form>
			<form method="POST" action="?/batchStatut" use:enhance={() => {
				const count = selectedIds.size;
				return async ({ result, update }) => {
					selectedIds = new Set();
					if (result.type === 'success') toasts.success(`${count} lead${count > 1 ? 's' : ''} écarté${count > 1 ? 's' : ''}`);
					else toasts.error('Erreur lors de la mise à jour');
					await update();
				};
			}}>
				<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
				<input type="hidden" name="statut" value="ecarte" />
				<button type="submit" class="px-3 py-1 text-sm text-text-muted border border-border rounded hover:bg-surface-alt cursor-pointer">
					Ecarter
				</button>
			</form>
			<button
				onclick={() => selectedIds = new Set()}
				class="ml-auto text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Deselectionner
			</button>
		</div>
	{/if}

	<DataTable
		data={filteredLeads}
		{columns}
		selectable={true}
		bind:selectedIds
		onRowClick={openDetail}
		searchPlaceholder="Rechercher un lead..."
		emptyMessage="Aucun lead. Ajoutez-en un manuellement ou importez depuis une source."
	>
		{#snippet row(lead, _i)}
			<td class="px-4 py-2.5 w-16">
				<Badge label={String(lead.score_pertinence ?? 0)} variant={scoreBadgeVariant(lead.score_pertinence ?? 0)} />
			</td>
			<td class="px-4 py-2.5 font-medium text-text">{lead.raison_sociale}</td>
			<td class="px-4 py-2.5 text-text w-20">{lead.canton ?? '—'}</td>
			<td class="px-4 py-2.5 text-text">{lead.secteur_detecte ?? '—'}</td>
			<td class="px-4 py-2.5 text-text w-24">{sourceLabel(lead.source)}</td>
			<td class="px-4 py-2.5 w-28">
				<Badge label={lead.statut} variant={statutBadgeVariant(lead.statut)} />
			</td>
		{/snippet}
	</DataTable>
</div>

<!-- SlideOut detail lead -->
<SlideOut bind:open={slideOutOpen} title={selectedLead?.raison_sociale ?? ''}>
	{#if selectedLead}
		{@const scoreDetail = getScoreDetail(selectedLead)}
		<div class="space-y-5">
			<div class="flex items-center gap-2">
				<Badge label={String(selectedLead.score_pertinence ?? 0)} variant={scoreBadgeVariant(selectedLead.score_pertinence ?? 0)} />
				<Badge label={selectedLead.statut} variant={statutBadgeVariant(selectedLead.statut)} />
				<Badge label={sourceLabel(selectedLead.source)} variant="default" />
			</div>

			{#if selectedLead.source_id}
				<p class="text-xs text-text-muted">ID source : {selectedLead.source_id}</p>
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Adresse</span>
					<p class="font-medium text-text">
						{[selectedLead.adresse, selectedLead.npa, selectedLead.localite].filter(Boolean).join(', ') || '—'}
					</p>
				</div>
				<div>
					<span class="text-text-muted">Canton</span>
					<p class="font-medium text-text">{selectedLead.canton ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Telephone</span>
					<p class="font-medium text-text">{selectedLead.telephone ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Email</span>
					<p class="font-medium text-text">{selectedLead.email ?? '—'}</p>
				</div>
				{#if selectedLead.nom_contact}
					<div>
						<span class="text-text-muted">Contact</span>
						<p class="font-medium text-text">{selectedLead.nom_contact}</p>
					</div>
				{/if}
				{#if selectedLead.site_web}
					<div>
						<span class="text-text-muted">Site web</span>
						<p class="font-medium text-text">{selectedLead.site_web}</p>
					</div>
				{/if}
				{#if selectedLead.secteur_detecte}
					<div>
						<span class="text-text-muted">Secteur</span>
						<p class="font-medium text-text">{selectedLead.secteur_detecte}</p>
					</div>
				{/if}
				{#if selectedLead.montant}
					<div>
						<span class="text-text-muted">Montant</span>
						<p class="font-medium text-text">{Number(selectedLead.montant).toLocaleString('fr-CH')} CHF</p>
					</div>
				{/if}
			</div>

			{#if selectedLead.description}
				<div class="text-sm">
					<span class="text-text-muted">Description</span>
					<p class="text-text whitespace-pre-wrap mt-1">{selectedLead.description}</p>
				</div>
			{/if}

			<!-- Score detail -->
			<div class="text-sm p-3 bg-surface rounded-lg">
				<span class="font-semibold text-text">Scoring ({scoreDetail.total}/13)</span>
				<div class="mt-1 space-y-0.5">
					{#each scoreDetail.criteres as critere}
						<p class="text-text-muted">{critere}</p>
					{/each}
					{#if scoreDetail.criteres.length === 0}
						<p class="text-text-muted">Aucun critere match</p>
					{/if}
				</div>
			</div>

			{#if selectedLead.source_url}
				<a
					href={selectedLead.source_url}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1 text-sm text-accent hover:underline"
				>
					<span class="material-symbols-outlined text-[16px]">open_in_new</span>
					Voir la source
				</a>
			{/if}

			<!-- Enrichissement -->
			{#if !selectedLead.telephone && selectedLead.statut !== 'transfere'}
				<button
					onclick={() => enrichirTelephone(selectedLead!.id)}
					disabled={enriching}
					class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-warning bg-warning-light border border-warning/30 rounded-lg hover:bg-warning-light/80 disabled:opacity-50 cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">phone_forwarded</span>
					{enriching ? 'Recherche...' : 'Enrichir telephone'}
				</button>
			{/if}

			<!-- Actions -->
			{#if selectedLead.statut !== 'transfere'}
				<div class="flex flex-wrap gap-3 pt-4 border-t border-border">
					{#if selectedLead.statut !== 'interesse'}
						<form method="POST" action="?/updateStatut" use:enhance={() => {
							return async ({ result, update }) => {
								slideOutOpen = false;
								selectedLead = null;
								if (result.type === 'success') toasts.success('Lead marqué intéressé');
								else toasts.error('Erreur lors de la mise à jour');
								await update();
							};
						}}>
							<input type="hidden" name="id" value={selectedLead.id} />
							<input type="hidden" name="statut" value="interesse" />
							<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent/10 cursor-pointer">
								<span class="material-symbols-outlined text-[16px]">thumb_up</span>
								Interesse
							</button>
						</form>
					{/if}
					{#if selectedLead.statut !== 'ecarte'}
						<form method="POST" action="?/updateStatut" use:enhance={() => {
							return async ({ result, update }) => {
								slideOutOpen = false;
								selectedLead = null;
								if (result.type === 'success') toasts.success('Lead écarté');
								else toasts.error('Erreur lors de la mise à jour');
								await update();
							};
						}}>
							<input type="hidden" name="id" value={selectedLead.id} />
							<input type="hidden" name="statut" value="ecarte" />
							<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer">
								<span class="material-symbols-outlined text-[16px]">block</span>
								Ecarter
							</button>
						</form>
					{/if}
					<form method="POST" action="?/transferer" use:enhance={() => {
						return async ({ result, update }) => {
							slideOutOpen = false;
							selectedLead = null;
							if (result.type === 'success') toasts.success('Lead transféré vers le CRM');
							else toasts.error('Erreur lors du transfert');
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedLead.id} />
						<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer">
							<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
							Transferer vers CRM
						</button>
					</form>
				</div>
			{:else}
				<div class="flex items-center gap-2 pt-4 border-t border-border text-sm text-success">
					<span class="material-symbols-outlined text-[16px]">check_circle</span>
					Transfere vers le CRM
				</div>
			{/if}
		</div>
	{/if}
</SlideOut>

<!-- Modal creation manuelle -->
<ModalForm
	bind:open={modalOpen}
	title="Nouveau lead"
	{saving}
>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
				if (result.type === 'success') toasts.success('Lead créé');
				else toasts.error('Erreur lors de la création');
				await update();
			};
		}}
	>
		<div class="space-y-4">
			<FormField label="Raison sociale" bind:value={raison_sociale} required />
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-text mb-1">Source</label>
					<select bind:value={source} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="manuel">Manuel</option>
						<option value="zefix">Zefix</option>
						<option value="simap">SIMAP</option>
						<option value="sitg">SITG</option>
						<option value="fosc">FOSC</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Canton</label>
					<select bind:value={canton} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="">—</option>
						<option value="GE">GE</option>
						<option value="VD">VD</option>
						<option value="VS">VS</option>
						<option value="NE">NE</option>
						<option value="FR">FR</option>
						<option value="JU">JU</option>
						<option value="Autre">Autre</option>
					</select>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Contact" bind:value={nom_contact} />
				<FormField label="Telephone" type="tel" bind:value={telephone} />
			</div>
			<div class="grid grid-cols-3 gap-4">
				<FormField label="Adresse" bind:value={adresse} />
				<FormField label="NPA" bind:value={npa} />
				<FormField label="Localite" bind:value={localite} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Email" type="email" bind:value={email} />
				<FormField label="Site web" bind:value={site_web} />
			</div>
			<FormField label="Secteur" bind:value={secteur_detecte} placeholder="construction, architecte..." />
			<FormField label="Description / But social" bind:value={description} />
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Montant (CHF)" type="number" bind:value={montant} />
				<FormField label="Date publication" type="date" bind:value={date_publication} />
			</div>
		</div>

		<!-- Hidden fields for form submission -->
		<input type="hidden" name="source" value={source} />
		<input type="hidden" name="source_id" value={source_id} />
		<input type="hidden" name="raison_sociale" value={raison_sociale} />
		<input type="hidden" name="nom_contact" value={nom_contact} />
		<input type="hidden" name="adresse" value={adresse} />
		<input type="hidden" name="npa" value={npa} />
		<input type="hidden" name="localite" value={localite} />
		<input type="hidden" name="canton" value={canton} />
		<input type="hidden" name="telephone" value={telephone} />
		<input type="hidden" name="site_web" value={site_web} />
		<input type="hidden" name="email" value={email} />
		<input type="hidden" name="secteur_detecte" value={secteur_detecte} />
		<input type="hidden" name="description" value={description} />
		<input type="hidden" name="montant" value={montant} />
		<input type="hidden" name="date_publication" value={date_publication} />

		<div class="flex justify-end gap-3 pt-4">
			<button
				type="button"
				onclick={() => modalOpen = false}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Annuler
			</button>
			<button
				type="submit"
				disabled={saving}
				class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer"
			>
				{saving ? 'Enregistrement...' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>

<!-- Modal import sources -->
<ModalForm
	bind:open={importModalOpen}
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
						<option value="GE">Geneve (GE)</option>
						<option value="VD">Vaud (VD)</option>
						<option value="VS">Valais (VS)</option>
						<option value="NE">Neuchatel (NE)</option>
						<option value="FR">Fribourg (FR)</option>
						<option value="JU">Jura (JU)</option>
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
						<option value="GE">Geneve (GE)</option>
						<option value="VD">Vaud (VD)</option>
						<option value="VS">Valais (VS)</option>
						<option value="NE">Neuchatel (NE)</option>
						<option value="FR">Fribourg (FR)</option>
						<option value="JU">Jura (JU)</option>
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
						<option value="GE">Geneve (GE)</option>
						<option value="VD">Vaud (VD)</option>
						<option value="VS">Valais (VS)</option>
						<option value="NE">Neuchatel (NE)</option>
						<option value="FR">Fribourg (FR)</option>
						<option value="JU">Jura (JU)</option>
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
				onclick={() => { importModalOpen = false; importResult = null; }}
				class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Fermer
			</button>
		</div>
	</div>
</ModalForm>
