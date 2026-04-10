<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';

	$effect(() => { $pageSubtitle = `${filteredLeads.length} prospect${filteredLeads.length > 1 ? 's' : ''}`; });
	import Badge from '$lib/components/Badge.svelte';
	import ImportModal from '$lib/components/prospection/ImportModal.svelte';
	import LeadSlideOut from '$lib/components/prospection/LeadSlideOut.svelte';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import type { PageData } from './$types';

	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];
	const { labels: scoreLabels } = config.scoring;
	const sourceEntries = Object.entries(config.prospection.sources);

	const cantonNoms: Record<string, string> = {
		GE: 'Genève', VD: 'Vaud', VS: 'Valais', NE: 'Neuchâtel', FR: 'Fribourg', JU: 'Jura'
	};

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

	// Form fields (saisie manuelle simplifiée)
	let raison_sociale = $state('');
	let canton = $state('');
	let secteur_detecte = $state('');

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

	// Compteurs workflow
	const enrichedCount = $derived(data.leads.filter((l) => l.telephone || l.description || l.adresse).length);
	const qualifiedCount = $derived(data.leads.filter((l) => l.statut === 'interesse').length);
	const convertedCount = $derived(data.leads.filter((l) => l.statut === 'transfere').length);

	const activeFilterCount = $derived(
		(filterStatut !== 'nouveau,interesse' ? 1 : 0) +
		(filterScoreMin ? 1 : 0) +
		(filterCanton ? 1 : 0) +
		(filterSource ? 1 : 0)
	);

	const columns = [
		{ key: 'score_pertinence', label: 'Température', sortable: true, class: 'w-28' },
		{ key: 'raison_sociale', label: 'Raison sociale', sortable: true },
		{ key: 'canton', label: 'Canton', sortable: true, class: 'w-24' },
		{ key: 'secteur_detecte', label: 'Secteur', sortable: true },
		{ key: 'source', label: 'Source', sortable: true, class: 'w-36' },
		{ key: 'statut', label: 'Statut', sortable: true, class: 'w-28' },
		{ key: 'date_import', label: 'Ajouté', sortable: true, class: 'w-24' },
	];

	function scoreLabel(score: number): string {
		if (score >= scoreLabels.chaud) return 'Chaud';
		if (score >= scoreLabels.tiede) return 'Tiède';
		if (score >= scoreLabels.froid) return 'Froid';
		return 'Faible';
	}

	function scoreBadgeVariant(score: number): 'danger' | 'warning' | 'muted' | 'default' {
		if (score >= scoreLabels.chaud) return 'danger';
		if (score >= scoreLabels.tiede) return 'warning';
		if (score >= scoreLabels.froid) return 'muted';
		return 'default';
	}

	function statutLabel(statut: string): string {
		const labels: Record<string, string> = {
			nouveau: 'Nouveau',
			interesse: 'Intéressé',
			ecarte: 'Écarté',
			transfere: 'Converti',
		};
		return labels[statut] ?? statut;
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
		const labels: Record<string, string> = {
			zefix: 'Registre du commerce',
			lindas: 'Registre du commerce',
			simap: 'Marchés publics',
			search_ch: 'Annuaire',
			sitg: 'Géodonnées',
			fosc: 'Feuille officielle',
			manuel: 'Saisie manuelle',
		};
		return labels[s] ?? s;
	}

	function relativeDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return "Aujourd'hui";
		if (diffDays === 1) return 'Hier';
		if (diffDays < 7) return `Il y a ${diffDays} j`;
		if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
		if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
		return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
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
		raison_sociale = '';
		canton = '';
		secteur_detecte = '';
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

	function resetFilters() {
		filterSource = '';
		filterCanton = '';
		filterStatut = 'nouveau,interesse';
		filterScoreMin = '';
	}

	function filterStatutLabel(val: string): string {
		const labels: Record<string, string> = {
			'nouveau,interesse': 'À traiter',
			'nouveau': 'Nouveaux',
			'interesse': 'Intéressés',
			'ecarte': 'Écartés',
			'transfere': 'Convertis',
			'': 'Tous',
		};
		return labels[val] ?? val;
	}

	function filterScoreLabel(val: string): string {
		if (!val) return '';
		if (val === String(scoreLabels.chaud)) return 'Chaud';
		if (val === String(scoreLabels.tiede)) return 'Tiède+';
		if (val === String(scoreLabels.froid)) return 'Froid+';
		return `Score ${val}+`;
	}
</script>

<div class="space-y-5">
	<!-- Bandeau workflow 4 étapes -->
	<div class="flex items-center gap-5 sm:gap-8 py-3">
		<div class="flex flex-col items-center gap-1.5">
			<span class="flex items-center justify-center w-12 h-12 rounded-full bg-primary-light">
				<span class="material-symbols-outlined text-[26px] text-primary">cloud_download</span>
			</span>
			<span class="text-sm font-semibold text-text">Importer</span>
			<span class="text-xs text-text-muted">{data.leads.length} prospect{data.leads.length > 1 ? 's' : ''}</span>
		</div>
		<div class="flex items-center mt-[-22px]">
			<span class="material-symbols-outlined text-[22px] text-border-strong">arrow_forward</span>
		</div>
		<div class="flex flex-col items-center gap-1.5">
			<span class="flex items-center justify-center w-12 h-12 rounded-full bg-accent-light">
				<span class="material-symbols-outlined text-[26px] text-accent">auto_fix_high</span>
			</span>
			<span class="text-sm font-semibold text-text">Enrichir</span>
			<span class="text-xs text-text-muted">{enrichedCount} enrichi{enrichedCount > 1 ? 's' : ''}</span>
		</div>
		<div class="flex items-center mt-[-22px]">
			<span class="material-symbols-outlined text-[22px] text-border-strong">arrow_forward</span>
		</div>
		<div class="flex flex-col items-center gap-1.5">
			<span class="flex items-center justify-center w-12 h-12 rounded-full bg-warning-light">
				<span class="material-symbols-outlined text-[26px] text-warning">filter_list</span>
			</span>
			<span class="text-sm font-semibold text-text">Qualifier</span>
			<span class="text-xs text-text-muted">{qualifiedCount} qualifié{qualifiedCount > 1 ? 's' : ''}</span>
		</div>
		<div class="flex items-center mt-[-22px]">
			<span class="material-symbols-outlined text-[22px] text-border-strong">arrow_forward</span>
		</div>
		<div class="flex flex-col items-center gap-1.5">
			<span class="flex items-center justify-center w-12 h-12 rounded-full bg-success-light">
				<span class="material-symbols-outlined text-[26px] text-success">domain_add</span>
			</span>
			<span class="text-sm font-semibold text-text">Convertir</span>
			<span class="text-xs text-text-muted">{convertedCount} converti{convertedCount > 1 ? 's' : ''}</span>
		</div>
	</div>

	<!-- Actions principales (visibles uniquement quand il y a des prospects) -->
	{#if data.leads.length > 0}
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			{#if data.recherches.length > 0}
				<button
					onclick={() => recherchesOpen = !recherchesOpen}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors"
				>
					<span class="material-symbols-outlined text-[18px]">bookmarks</span>
					<span class="hidden sm:inline">Mes recherches</span>
					<span class="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-accent/10 text-accent">{data.recherches.length}</span>
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={openCreate}
				class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted border border-border hover:bg-surface-alt hover:text-text rounded-lg cursor-pointer transition-colors"
			>
				<span class="material-symbols-outlined text-[18px]">edit_note</span>
				<span class="hidden sm:inline">Saisie manuelle</span>
			</button>
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer shadow-sm transition-colors"
			>
				<span class="material-symbols-outlined text-[18px]">cloud_download</span>
				Importer des prospects
			</button>
		</div>
	</div>
	{/if}

	<!-- Filtres -->
	<div class="rounded-xl border border-border bg-white shadow-xs">
		<div class="flex flex-wrap items-center gap-3 p-3">
			<select bind:value={filterStatut} class="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface-alt font-medium cursor-pointer transition-colors hover:border-accent/40">
				<option value="nouveau,interesse">A traiter</option>
				<option value="nouveau">Nouveaux uniquement</option>
				<option value="interesse">Intéressés uniquement</option>
				<option value="ecarte">Écartés</option>
				<option value="transfere">Déjà convertis</option>
				<option value="">Tout afficher</option>
			</select>
			<select bind:value={filterScoreMin} class="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface-alt cursor-pointer transition-colors hover:border-accent/40">
				<option value="">Toute température</option>
				<option value={String(scoreLabels.chaud)}>Chaud uniquement</option>
				<option value={String(scoreLabels.tiede)}>Tiède et +</option>
				<option value={String(scoreLabels.froid)}>Froid et +</option>
			</select>
			<select bind:value={filterCanton} class="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface-alt cursor-pointer transition-colors hover:border-accent/40">
				<option value="">Tous les cantons</option>
				{#each cantons as c}
					<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
				{/each}
			</select>
			<select bind:value={filterSource} class="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface-alt cursor-pointer transition-colors hover:border-accent/40">
				<option value="">Toutes les sources</option>
				{#each sourceEntries as [key]}
					<option value={key}>{sourceLabel(key)}</option>
				{/each}
				<option value="sitg">{sourceLabel('sitg')}</option>
				<option value="fosc">{sourceLabel('fosc')}</option>
				<option value="manuel">{sourceLabel('manuel')}</option>
			</select>

			<div class="ml-auto flex items-center gap-2">
				{#if activeFilterCount > 0}
					<button
						onclick={resetFilters}
						class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-danger cursor-pointer transition-colors"
					>
						<span class="material-symbols-outlined text-[14px]">close</span>
						Réinitialiser
					</button>
				{/if}
				<button
					onclick={() => saveSearchOpen = !saveSearchOpen}
					class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5 cursor-pointer transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">notifications_active</span>
					Créer une alerte
				</button>
			</div>
		</div>

		<!-- Chips filtres actifs + compteur -->
		{#if activeFilterCount > 0 || filteredLeads.length !== data.leads.length}
			<div class="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0">
				<span class="text-xs font-medium text-text-muted">{filteredLeads.length} sur {data.leads.length} prospects</span>
				{#if filterStatut !== 'nouveau,interesse'}
					<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-accent/8 text-accent font-medium">
						{filterStatutLabel(filterStatut)}
						<button onclick={() => filterStatut = 'nouveau,interesse'} class="hover:text-accent-dark cursor-pointer"><span class="material-symbols-outlined text-[12px]">close</span></button>
					</span>
				{/if}
				{#if filterScoreMin}
					<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-warning/10 text-warning font-medium">
						{filterScoreLabel(filterScoreMin)}
						<button onclick={() => filterScoreMin = ''} class="hover:text-warning cursor-pointer"><span class="material-symbols-outlined text-[12px]">close</span></button>
					</span>
				{/if}
				{#if filterCanton}
					<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-info/10 text-info font-medium">
						{cantonNoms[filterCanton] ?? filterCanton}
						<button onclick={() => filterCanton = ''} class="hover:text-info cursor-pointer"><span class="material-symbols-outlined text-[12px]">close</span></button>
					</span>
				{/if}
				{#if filterSource}
					<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/8 text-primary font-medium">
						{sourceLabel(filterSource)}
						<button onclick={() => filterSource = ''} class="hover:text-primary-dark cursor-pointer"><span class="material-symbols-outlined text-[12px]">close</span></button>
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Formulaire sauvegarde recherche (alerte) -->
	{#if saveSearchOpen}
		<form
			method="POST"
			action="?/saveRecherche"
			class="p-4 bg-gradient-to-r from-accent/5 to-accent/10 rounded-xl border border-accent/20 shadow-xs"
			use:enhance={() => {
				savingSearch = true;
				return async ({ result, update }) => {
					savingSearch = false;
					saveSearchOpen = false;
					saveSearchName = '';
					if (result.type === 'success') toasts.success('Alerte créée');
					else toasts.error('Erreur lors de la création');
					await update();
				};
			}}
		>
			<div class="flex items-center gap-2 mb-3">
				<span class="material-symbols-outlined text-[18px] text-accent">notifications_active</span>
				<span class="text-sm font-semibold text-text">Créer une alerte sur ces filtres</span>
			</div>
			<p class="text-xs text-text-muted mb-3">Vous serez notifié lorsque de nouveaux prospects correspondent à vos critères actuels.</p>
			<div class="flex flex-wrap items-end gap-3">
				<div class="flex-1 min-w-48">
					<label class="block text-xs font-medium text-text mb-1">Nom de l'alerte</label>
					<input
						type="text"
						name="nom"
						bind:value={saveSearchName}
						placeholder="Ex : Construction Genève chauds"
						required
						class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-text mb-1">Fréquence</label>
					<select name="frequence_alerte" bind:value={saveSearchFrequence} class="px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
						<option value="quotidien">Quotidienne</option>
						<option value="hebdomadaire">Hebdomadaire</option>
					</select>
				</div>
				<label class="flex items-center gap-2 text-sm text-text cursor-pointer">
					<input type="checkbox" bind:checked={saveSearchAlerte} class="rounded" />
					Active
				</label>
				<!-- Hidden fields for current filters -->
				<input type="hidden" name="sources" value={filterSource ? JSON.stringify([filterSource]) : ''} />
				<input type="hidden" name="cantons" value={filterCanton ? JSON.stringify([filterCanton]) : ''} />
				<input type="hidden" name="score_minimum" value={filterScoreMin} />
				<input type="hidden" name="alerte_active" value={String(saveSearchAlerte)} />
				<button
					type="submit"
					disabled={savingSearch || !saveSearchName}
					class="px-4 py-1.5 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
				>
					{savingSearch ? 'Création...' : 'Créer l\'alerte'}
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

	<!-- Liste recherches sauvegardées -->
	{#if recherchesOpen}
		<div class="p-4 bg-white rounded-xl border border-border shadow-xs space-y-2">
			<div class="flex items-center justify-between mb-1">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[18px] text-accent">bookmarks</span>
					<h3 class="text-sm font-semibold text-text">Mes recherches sauvegardées</h3>
				</div>
				<button onclick={() => recherchesOpen = false} class="text-sm text-text-muted hover:text-text cursor-pointer">Fermer</button>
			</div>
			{#each data.recherches as rech}
				<div class="flex items-center justify-between p-3 rounded-lg bg-surface-alt/60 border border-border/50 hover:border-accent/20 transition-colors">
					<div class="flex items-center gap-3">
						<button
							onclick={() => chargerRecherche(rech)}
							class="text-sm font-semibold text-accent hover:underline cursor-pointer"
						>
							{rech.nom}
						</button>
						<span class="text-xs text-text-muted">
							{[
								rech.sources?.length ? rech.sources.map((s: string) => sourceLabel(s)).join(', ') : null,
								rech.cantons?.length ? rech.cantons.map((c: string) => cantonNoms[c] ?? c).join(', ') : null,
								rech.score_minimum ? `${scoreLabel(rech.score_minimum)} (${rech.score_minimum}+)` : null,
							].filter(Boolean).join(' · ') || 'Tous les critères'}
						</span>
						{#if rech.alerte_active}
							<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
								<span class="material-symbols-outlined text-[12px]">notifications</span>
								{rech.frequence_alerte === 'quotidien' ? 'Quotidienne' : 'Hebdomadaire'}
							</span>
						{/if}
						{#if rech.nb_nouveaux && rech.nb_nouveaux > 0}
							<span class="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger font-semibold">{rech.nb_nouveaux} nouveau{rech.nb_nouveaux > 1 ? 'x' : ''}</span>
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
						<button type="submit" class="text-text-muted hover:text-danger cursor-pointer transition-colors" title="Supprimer cette recherche">
							<span class="material-symbols-outlined text-[16px]">delete</span>
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Notification import/enrichissement -->
	{#if importResult}
		<div class="flex items-center justify-between p-3 rounded-xl border shadow-xs {importResult.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-[18px]">{importResult.type === 'success' ? 'check_circle' : 'error'}</span>
				<span class="text-sm font-medium">{importResult.message}</span>
			</div>
			<button onclick={() => importResult = null} class="text-sm opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Barre actions batch -->
	{#if selectedIds.size > 0}
		<div class="flex items-center gap-3 p-3 bg-gradient-to-r from-accent/5 to-accent/10 rounded-xl border border-accent/20 shadow-xs">
			<span class="text-sm font-semibold text-text">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
			<form method="POST" action="?/batchStatut" use:enhance={() => {
				const count = selectedIds.size;
				return async ({ result, update }) => {
					selectedIds = new Set();
					if (result.type === 'success') toasts.success(`${count} prospect${count > 1 ? 's' : ''} marqué${count > 1 ? 's' : ''} intéressé${count > 1 ? 's' : ''}`);
					else toasts.error('Erreur lors de la mise à jour');
					await update();
				};
			}}>
				<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
				<input type="hidden" name="statut" value="interesse" />
				<button type="submit" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent/10 cursor-pointer transition-colors">
					<span class="material-symbols-outlined text-[16px]">thumb_up</span>
					Marquer intéressé
				</button>
			</form>
			<form method="POST" action="?/batchStatut" use:enhance={() => {
				const count = selectedIds.size;
				return async ({ result, update }) => {
					selectedIds = new Set();
					if (result.type === 'success') toasts.success(`${count} prospect${count > 1 ? 's' : ''} écarté${count > 1 ? 's' : ''}`);
					else toasts.error('Erreur lors de la mise à jour');
					await update();
				};
			}}>
				<input type="hidden" name="ids" value={JSON.stringify([...selectedIds])} />
				<input type="hidden" name="statut" value="ecarte" />
				<button type="submit" class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors">
					<span class="material-symbols-outlined text-[16px]">block</span>
					Écarter
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
		<div class="flex flex-col items-center justify-center py-16 px-6">
			<div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 mb-5">
				<span class="material-symbols-outlined text-[32px] text-accent">search</span>
			</div>
			<h3 class="text-lg font-semibold text-text mb-2">Trouvez vos premiers prospects</h3>
			<p class="text-sm text-text-muted text-center max-w-lg mb-6">
				Importez des entreprises depuis les sources publiques suisses (registre du commerce, marchés publics, annuaires). Qualifiez-les, puis convertissez les plus pertinentes en entreprises dans votre CRM. Vous pouvez également procéder à une importation manuelle si nécessaire.
			</p>
			<div class="flex flex-col items-center gap-3">
				<button
					onclick={() => importModalOpen = true}
					class="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer shadow-sm transition-colors"
				>
					<span class="material-symbols-outlined text-[18px]">cloud_download</span>
					Lancer un import
				</button>
				<button
					onclick={openCreate}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-muted hover:text-text cursor-pointer transition-colors"
				>
					<span class="material-symbols-outlined text-[18px]">edit_note</span>
					Saisie manuelle
				</button>
			</div>
		</div>
	{:else}
	<DataTable
		data={filteredLeads}
		{columns}
		selectable={true}
		bind:selectedIds
		onRowClick={openDetail}
		searchPlaceholder="Rechercher un prospect…"
		emptyMessage="Aucun prospect correspondant aux filtres."
	>
		{#snippet row(lead, _i)}
			<td class="px-4 py-2.5 w-28">
				<Badge label={scoreLabel(lead.score_pertinence ?? 0)} variant={scoreBadgeVariant(lead.score_pertinence ?? 0)} dot={true} />
			</td>
			<td class="px-4 py-2.5 font-medium text-text">{lead.raison_sociale}</td>
			<td class="px-4 py-2.5 text-text w-24">{lead.canton ? `${cantonNoms[lead.canton] ?? lead.canton}` : '—'}</td>
			<td class="px-4 py-2.5 text-text">{lead.secteur_detecte ?? '—'}</td>
			<td class="px-4 py-2.5 text-text-muted text-xs w-36">{sourceLabel(lead.source)}</td>
			<td class="px-4 py-2.5 w-28">
				<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
			</td>
			<td class="px-4 py-2.5 text-text-muted text-xs w-24">{relativeDate(lead.date_import)}</td>
		{/snippet}
	</DataTable>
	{/if}
</div>

<!-- Lead detail slide-out -->
<LeadSlideOut bind:open={slideOutOpen} bind:lead={selectedLead} bind:importResult leads={data.leads} />

<!-- Modal creation manuelle -->
<ModalForm
	bind:open={modalOpen}
	title="Saisie manuelle d'un prospect"
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
				if (result.type === 'success') toasts.success('Prospect créé');
				else toasts.error('Erreur lors de la création');
				await update();
			};
		}}
	>
		<div class="space-y-4">
			<FormField label="Raison sociale" bind:value={raison_sociale} required />
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-text mb-1">Canton <span class="text-danger">*</span></label>
					<select bind:value={canton} required class="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
						<option value="">Sélectionner…</option>
						{#each cantons as c}
							<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
						{/each}
					</select>
				</div>
				<FormField label="Secteur" bind:value={secteur_detecte} placeholder="construction, architecte…" />
			</div>
			<p class="text-xs text-text-muted">Les autres informations (téléphone, adresse, but social…) seront complétées automatiquement par enrichissement.</p>
		</div>

		<!-- Hidden fields for form submission -->
		<input type="hidden" name="source" value="manuel" />
		<input type="hidden" name="raison_sociale" value={raison_sociale} />
		<input type="hidden" name="canton" value={canton} />
		<input type="hidden" name="secteur_detecte" value={secteur_detecte} />

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
				class="px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
			>
				{saving ? 'Enregistrement...' : 'Créer le prospect'}
			</button>
		</div>
	</form>
</ModalForm>

<!-- Modal import sources -->
<ImportModal bind:open={importModalOpen} bind:importResult />
