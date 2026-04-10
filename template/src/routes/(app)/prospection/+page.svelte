<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ImportModal from '$lib/components/prospection/ImportModal.svelte';
	import LeadSlideOut from '$lib/components/prospection/LeadSlideOut.svelte';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import type { PageData } from './$types';

	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];
	const { labels: scoreLabels } = config.scoring;
	const sourceEntries = Object.entries(config.prospection.sources);

	let { data }: { data: PageData } = $props();

	type Lead = (typeof data.leads)[number];

	let slideOutOpen = $state(false);
	let selectedLead = $state<Lead | null>(null);
	let modalOpen = $state(false);
	let importModalOpen = $state(false);
	let saving = $state(false);
	let importResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let selectedIds = $state<Set<string>>(new Set());
	let saveSearchOpen = $state(false);
	let saveSearchName = $state('');
	let saveSearchAlerte = $state(true);
	let saveSearchFrequence = $state('quotidien');
	let savingSearch = $state(false);
	let recherchesOpen = $state(false);

	// Filters
	let filterSource = $state('');
	let filterCanton = $state('');
	let filterStatut = $state('nouveau,interesse');
	let filterScoreMin = $state('');

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
		if (score >= scoreLabels.chaud) return 'danger';
		if (score >= scoreLabels.tiede) return 'warning';
		if (score >= scoreLabels.froid) return 'muted';
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
		const configSource = (config.prospection.sources as Record<string, { label: string }>)[s];
		if (configSource) return configSource.label.split(' (')[0];
		const extras: Record<string, string> = { sitg: 'SITG', fosc: 'FOSC', manuel: 'Manuel' };
		return extras[s] ?? s;
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
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-text">Prospection</h1>
			<p class="text-sm text-text-muted">{filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''}</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent border border-accent hover:bg-accent/10 rounded-lg cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">cloud_download</span>
				Importer
			</button>
			<button
				onclick={openCreate}
				class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				<span class="hidden sm:inline">Ajouter un lead</span>
				<span class="sm:hidden">Ajouter</span>
			</button>
		</div>
	</div>

	<!-- Filtres -->
	<div class="flex flex-wrap gap-3 p-3 bg-surface rounded-lg border border-border">
		<select bind:value={filterSource} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="">Toutes sources</option>
			{#each sourceEntries as [key, src]}
				<option value={key}>{src.label.split(' (')[0]}</option>
			{/each}
			<option value="sitg">SITG</option>
			<option value="fosc">FOSC</option>
			<option value="manuel">Manuel</option>
		</select>
		<select bind:value={filterCanton} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="">Tous cantons</option>
			{#each cantons as c}
				<option value={c}>{c}</option>
			{/each}
			<option value="Autre">Autre</option>
		</select>
		<select bind:value={filterStatut} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="nouveau,interesse">Nouveau + Intéressé</option>
			<option value="nouveau">Nouveau</option>
			<option value="interesse">Intéressé</option>
			<option value="ecarte">Écarté</option>
			<option value="transfere">Transféré</option>
			<option value="">Tous</option>
		</select>
		<select bind:value={filterScoreMin} class="px-3 py-1.5 text-sm border border-border rounded-md bg-white">
			<option value="">Tout score</option>
			<option value={String(scoreLabels.chaud)}>Chaud ({scoreLabels.chaud}+)</option>
			<option value={String(scoreLabels.tiede)}>Tiède+ ({scoreLabels.tiede}+)</option>
			<option value={String(scoreLabels.froid)}>Froid+ ({scoreLabels.froid}+)</option>
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
				<h3 class="text-sm font-semibold text-text">Recherches sauvegardées</h3>
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
			<span class="text-sm font-medium text-text">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
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
				Désélectionner
			</button>
		</div>
	{/if}

	{#if data.leads.length === 0}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg border border-border p-6">
				<div class="flex items-center gap-3 mb-3">
					<span class="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10">
						<span class="material-symbols-outlined text-[22px] text-accent">cloud_download</span>
					</span>
					<h3 class="font-semibold text-text">Importez vos premiers leads</h3>
				</div>
				<p class="text-sm text-text-muted mb-4">
					Trouvez des prospects B2B depuis les sources publiques suisses : registre du commerce (LINDAS), marchés publics (SIMAP), annuaire (search.ch).
				</p>
				<button
					onclick={() => importModalOpen = true}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">cloud_download</span>
					Lancer un import
				</button>
			</div>

			<div class="bg-white rounded-lg border border-border p-6">
				<div class="flex items-center gap-3 mb-3">
					<span class="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10">
						<span class="material-symbols-outlined text-[22px] text-warning">notifications_active</span>
					</span>
					<h3 class="font-semibold text-text">Alertes automatiques</h3>
				</div>
				<p class="text-sm text-text-muted mb-2">
					Configurez des filtres (source, canton, score) puis sauvegardez votre recherche pour recevoir des alertes automatiques.
				</p>
				<ul class="text-sm text-text-muted space-y-1 mb-4">
					<li class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
						Alerte quotidienne ou hebdomadaire
					</li>
					<li class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
						Notification sur le Dashboard
					</li>
					<li class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
						Compteur de nouveaux leads par recherche
					</li>
				</ul>
				<p class="text-xs text-text-muted">
					Importez d'abord des leads, puis utilisez le bouton <strong class="text-accent">Sauvegarder</strong> dans la barre de filtres.
				</p>
			</div>
		</div>
	{:else}
	<DataTable
		data={filteredLeads}
		{columns}
		selectable={true}
		bind:selectedIds
		onRowClick={openDetail}
		searchPlaceholder="Rechercher un lead…"
		emptyMessage="Aucun lead correspondant aux filtres."
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
	{/if}
</div>

<!-- Lead detail slide-out -->
<LeadSlideOut bind:open={slideOutOpen} bind:lead={selectedLead} bind:importResult leads={data.leads} />

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
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-text mb-1">Source</label>
					<select bind:value={source} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="manuel">Manuel</option>
						{#each sourceEntries as [key, src]}
							<option value={key}>{src.label.split(' (')[0]}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-text mb-1">Canton</label>
					<select bind:value={canton} class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-white">
						<option value="">—</option>
						{#each cantons as c}
							<option value={c}>{c}</option>
						{/each}
						<option value="Autre">Autre</option>
					</select>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Contact" bind:value={nom_contact} />
				<FormField label="Téléphone" type="tel" bind:value={telephone} />
			</div>
			<div class="grid grid-cols-3 gap-4">
				<FormField label="Adresse" bind:value={adresse} />
				<FormField label="NPA" bind:value={npa} />
				<FormField label="Localité" bind:value={localite} />
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Email" type="email" bind:value={email} />
				<FormField label="Site web" bind:value={site_web} />
			</div>
			<FormField label="Secteur" bind:value={secteur_detecte} placeholder="construction, architecte..." />
			<FormField label="Description / But social" bind:value={description} />
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
<ImportModal bind:open={importModalOpen} bind:importResult />
