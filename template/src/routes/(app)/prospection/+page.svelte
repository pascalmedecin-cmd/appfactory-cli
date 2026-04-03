<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import type { PageData, ActionData } from './$types';
	import { calculerScore } from '$lib/scoring';

	let { data, form: actionResult }: { data: PageData; form: ActionData } = $props();

	type Lead = (typeof data.leads)[number];

	let slideOutOpen = $state(false);
	let selectedLead = $state<Lead | null>(null);
	let modalOpen = $state(false);
	let saving = $state(false);
	let selectedIds = $state<Set<string>>(new Set());

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
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			Ajouter un lead
		</button>
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
	</div>

	<!-- Barre actions batch -->
	{#if selectedIds.size > 0}
		<div class="flex items-center gap-3 p-3 bg-accent/5 rounded-lg border border-accent/20">
			<span class="text-sm font-medium text-text">{selectedIds.size} selectionne{selectedIds.size > 1 ? 's' : ''}</span>
			<form method="POST" action="?/batchStatut" use:enhance={() => {
				return async ({ update }) => {
					selectedIds = new Set();
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
				return async ({ update }) => {
					selectedIds = new Set();
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

			<!-- Actions -->
			{#if selectedLead.statut !== 'transfere'}
				<div class="flex flex-wrap gap-3 pt-4 border-t border-border">
					{#if selectedLead.statut !== 'interesse'}
						<form method="POST" action="?/updateStatut" use:enhance={() => {
							return async ({ update }) => {
								slideOutOpen = false;
								selectedLead = null;
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
							return async ({ update }) => {
								slideOutOpen = false;
								selectedLead = null;
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
						return async ({ update }) => {
							slideOutOpen = false;
							selectedLead = null;
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
			return async ({ update }) => {
				saving = false;
				modalOpen = false;
				resetForm();
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
