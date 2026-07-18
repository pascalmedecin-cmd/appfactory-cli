<script lang="ts">
	/**
	 * Page dédiée d'UNE campagne - le « poste de pilotage » du processus complet (2026-07-02,
	 * décision Pascal) : le fil des 4 étapes est VISIBLE et chaque sortie a sa place.
	 *
	 *   1. Constituer : trouver des prospects (recherche pré-cochée sur la campagne, import).
	 *   2. Organiser  : groupes, retraits manuels, sélection multiple.
	 *   3. Valider    : lien externe (personne sans compte CRM) - progression + « Appliquer ».
	 *   4. Diffuser   : étiquettes Avery, liste PDF, envoi au pipeline (le mailing email
	 *      rejoindra cette carte quand le module existera - pas d'UI morte d'ici là).
	 *
	 * Remplace le panneau latéral CampagneProspectsPanel (un seul chemin, plus deux surfaces).
	 * Données servies par +page.server.ts (vérité serveur) ; chaque mutation invalide et
	 * recharge - pas de jetons anti-course client comme dans l'ex-panneau, la source de vérité
	 * est toujours le load. Le composant est réutilisé entre 2 campagnes sans remount :
	 * l'état local éphémère est réinitialisé quand l'id change
	 * (cf. feedback_sveltekit_page_reuse_reset_local_state).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import StatutSegment from '$lib/components/campagnes/StatutSegment.svelte';
	import EntrepriseSearchModal from '$lib/components/prospection/EntrepriseSearchModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { isCoherenceActive } from '$lib/ui/coherence';
	import { goto, invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import { toasts } from '$lib/stores/toast';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { CRM_BASE } from '$lib/config';
	import { filterEnabledSources } from '$lib/prospection-flags';
	import type { EntrepriseSource } from '$lib/components/prospection/source-meta';
	import { statutLabel, statutBadgeVariant, sourceLabel } from '$lib/prospection-utils';
	import {
		campClass,
		campagneStatutLabel,
		filterProspectsCampagne,
		validationProgress,
		type CampagneStatut,
		type ProspectCampagne,
	} from '$lib/campagnes';
	import {
		GROUPE_NOM_MAX,
		MAX_GROUPE_LEAD_IDS,
		sortGroupes,
		groupeCounts,
		filterByGroupe,
		groupeSuggestions,
		type GroupeFilter,
	} from '$lib/campagne-groupes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const coherence = $derived(isCoherenceActive(data.featureFlags));

	const campagne = $derived(data.campagne);
	// Valeur brute passée au composant StatutSegment (qui la LABELLISE en interne). Intermédiaire
	// nommé pour ne pas ressembler à un rendu d'enum brut (garde no-brute-enum-render).
	const campagneStatut = $derived(campagne.statut);
	const prospects = $derived(data.prospects as ProspectCampagne[]);
	const groupes = $derived(data.groupes);

	$effect(() => {
		$pageSubtitle = campagne.nom;
	});

	// --- État local éphémère, réinitialisé au changement de campagne (réutilisation sans remount) ---
	let search = $state('');
	let groupeFilter = $state<GroupeFilter>(null);
	const sel = new SvelteSet<string>();
	let formOpen = $state(false);
	let formMode = $state<'create' | 'rename'>('create');
	let formNom = $state('');
	const formChecked = new SvelteSet<string>();
	let shareUrl = $state<string | null>(null);
	let shareExpiresAt = $state<string | null>(null);

	let lastId = $state<string | null>(null);
	$effect(() => {
		if (campagne.id === lastId) return;
		lastId = campagne.id;
		search = '';
		groupeFilter = null;
		sel.clear();
		formOpen = false;
		formNom = '';
		formChecked.clear();
		shareUrl = null;
		shareExpiresAt = null;
	});

	// --- Dérivés (mêmes helpers purs que l'ex-panneau) ---
	const sortedGroupes = $derived(sortGroupes(groupes));
	const counts = $derived(groupeCounts(prospects));
	const suggestions = $derived(groupeSuggestions(prospects));
	const groupeById = $derived(new Map(groupes.map((g) => [g.id, g])));
	const activeGroupe = $derived(
		groupeFilter !== null && groupeFilter !== 'none' ? (groupeById.get(groupeFilter) ?? null) : null
	);
	const filtered = $derived(filterByGroupe(filterProspectsCampagne(prospects, search), groupeFilter));
	const allFilteredSelected = $derived(filtered.length > 0 && filtered.every((p) => sel.has(p.id)));
	const formLeadIds = $derived(
		formMode === 'create' ? suggestions.filter((s) => formChecked.has(s.key)).flatMap((s) => s.leadIds) : []
	);

	// --- Validation externe : progression + lien actif + confirmation reçue ---
	const progress = $derived(validationProgress(prospects));
	const lienActif = $derived(data.validationLien);
	const lienDate = $derived(lienActif ? dateHeure(lienActif.expires_at) : null);
	// « Validation reçue » : la personne externe a cliqué « Envoyer la validation » (round courant).
	// Signal informatif - ne bloque ni les étiquettes ni la suite de la campagne.
	const validationRecueAt = $derived(data.validationConfirmedAt);

	// --- Étapes du fil (indicateur, pas un wizard bloquant) ---
	type StepState = 'fait' | 'encours' | 'afaire';
	const steps = $derived([
		{
			key: 'constituer',
			titre: 'Constituer',
			detail: prospects.length > 0 ? `${prospects.length} prospect${prospects.length > 1 ? 's' : ''}` : 'Aucun prospect',
			state: (prospects.length > 0 ? 'fait' : 'afaire') as StepState,
			target: 'sec-prospects',
		},
		{
			key: 'organiser',
			titre: 'Organiser',
			detail:
				groupes.length > 0
					? `${groupes.length} groupe${groupes.length > 1 ? 's' : ''}${counts.none > 0 ? ` · ${counts.none} sans groupe` : ''}`
					: 'Groupes optionnels',
			state: (groupes.length > 0 ? 'fait' : prospects.length > 0 ? 'encours' : 'afaire') as StepState,
			target: 'sec-prospects',
		},
		{
			key: 'valider',
			titre: 'Valider',
			detail:
				progress.verifies === 0 && !lienActif
					? 'Vérification externe optionnelle'
					: progress.verifies === progress.total && progress.total > 0
						? `Terminée · ${progress.retirer} à retirer`
						: `${progress.verifies}/${progress.total} vérifiés`,
			state: (progress.total > 0 && progress.verifies === progress.total
				? 'fait'
				: lienActif || progress.verifies > 0
					? 'encours'
					: 'afaire') as StepState,
			target: 'sec-validation',
		},
		{
			key: 'diffuser',
			titre: 'Diffuser',
			detail: 'Étiquettes · PDF · Pipeline',
			state: 'afaire' as StepState,
			target: 'sec-diffusion',
		},
	]);

	function scrollTo(id: string) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function dateHeure(iso: string): string {
		return new Date(iso).toLocaleString('fr-CH', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
	}
	function adresseCourte(p: ProspectCampagne): string {
		return [p.npa, p.localite].filter(Boolean).join(' ') || '–';
	}

	// --- Statut campagne (mêmes gestes que la liste) ---
	let statutBusy = $state(false);
	async function setStatut(statut: CampagneStatut) {
		if (campagne.statut === statut || statutBusy) return;
		statutBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ statut }),
			});
			if (resp.ok) {
				toasts.success(statut === 'active' ? `« ${campagne.nom} » lancée` : `« ${campagne.nom} » repassée en préparation`);
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Changement de statut impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			statutBusy = false;
		}
	}

	// --- Constituer : recherche pré-cochée sur cette campagne ---
	const PREVIEW_SOURCES: EntrepriseSource[] = ['search_ch', 'google_places', 'zefix'];
	const entrepriseSources = $derived(
		filterEnabledSources(PREVIEW_SOURCES).filter((s): s is EntrepriseSource => PREVIEW_SOURCES.includes(s as EntrepriseSource))
	);
	let searchOpen = $state(false);
	let searchImportResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let importAlert = $state<string | null>(null);
	$effect(() => {
		if (!searchImportResult) return;
		const { message, type } = searchImportResult;
		if (type === 'success') toasts.success(message);
		else importAlert = message;
		searchImportResult = null;
	});

	// --- Organiser : retrait, sélection, groupes (portés de l'ex-panneau, vérité = invalidateAll) ---
	const removeBusy = new SvelteSet<string>();
	async function removeFromCampagne(p: ProspectCampagne) {
		if (removeBusy.has(p.id)) return;
		removeBusy.add(p.id);
		try {
			const resp = await fetch('/api/prospection/lead-campagnes', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ leadId: p.id, campagneId: campagne.id }),
			});
			if (resp.ok) {
				sel.delete(p.id);
				toasts.success(`« ${p.raison_sociale} » retiré de la campagne`);
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Retrait impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			removeBusy.delete(p.id);
		}
	}

	function toggleSel(id: string) {
		if (sel.has(id)) sel.delete(id);
		else sel.add(id);
	}
	function toggleSelectAllFiltered() {
		if (allFilteredSelected) for (const p of filtered) sel.delete(p.id);
		else for (const p of filtered) sel.add(p.id);
	}

	let assignBusy = $state(false);
	async function moveSelection(groupeId: string | null) {
		if (assignBusy || sel.size === 0) return;
		const ids = [...sel];
		if (ids.length > MAX_GROUPE_LEAD_IDS) {
			toasts.error(`Sélection trop grande (max ${MAX_GROUPE_LEAD_IDS}).`);
			return;
		}
		assignBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}/groupes/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groupeId, leadIds: ids }),
			});
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				sel.clear();
				const nom = groupeId ? (groupeById.get(groupeId)?.nom ?? 'le groupe') : null;
				const n = typeof d?.updated === 'number' ? d.updated : ids.length;
				toasts.success(
					groupeId
						? `${n} prospect${n > 1 ? 's' : ''} déplacé${n > 1 ? 's' : ''} vers « ${nom} »`
						: `${n} prospect${n > 1 ? 's' : ''} retiré${n > 1 ? 's' : ''} de leur groupe`
				);
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Déplacement impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			assignBusy = false;
		}
	}
	function onBulkSelect(e: Event) {
		const el = e.currentTarget as HTMLSelectElement;
		const v = el.value;
		el.value = '';
		if (!v) return;
		void moveSelection(v === '__none__' ? null : v);
	}

	let formBusy = $state(false);
	function openCreateForm() {
		formMode = 'create';
		formNom = '';
		formChecked.clear();
		formOpen = true;
	}
	function openRenameForm() {
		if (!activeGroupe) return;
		formMode = 'rename';
		formNom = activeGroupe.nom;
		formOpen = true;
	}
	function closeForm() {
		formOpen = false;
		formNom = '';
		formChecked.clear();
	}
	function toggleSuggestion(key: string) {
		if (formChecked.has(key)) formChecked.delete(key);
		else formChecked.add(key);
	}
	async function submitForm() {
		const nom = formNom.trim();
		if (formBusy || nom.length === 0 || nom.length > GROUPE_NOM_MAX) return;
		formBusy = true;
		try {
			if (formMode === 'create') {
				const leadIds = formLeadIds.slice(0, MAX_GROUPE_LEAD_IDS);
				const resp = await fetch(`/api/campagnes/${campagne.id}/groupes`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ nom, ...(leadIds.length > 0 ? { leadIds } : {}) }),
				});
				const d = await resp.json().catch(() => null);
				if (resp.ok && d?.groupe) {
					groupeFilter = d.groupe.id;
					closeForm();
					if (d.assignWarning) toasts.error(d.assignWarning);
					else
						toasts.success(
							d.assigned > 0
								? `Groupe « ${nom} » créé avec ${d.assigned} prospect${d.assigned > 1 ? 's' : ''}`
								: `Groupe « ${nom} » créé`
						);
					await invalidateAll();
				} else {
					toasts.error(d?.error || 'Création du groupe impossible');
				}
			} else {
				const g = activeGroupe;
				if (!g) return;
				const resp = await fetch(`/api/campagnes/${campagne.id}/groupes/${g.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ nom }),
				});
				const d = await resp.json().catch(() => null);
				if (resp.ok && d?.groupe) {
					closeForm();
					toasts.success(`Groupe renommé en « ${nom} »`);
					await invalidateAll();
				} else {
					toasts.error(d?.error || 'Renommage impossible');
				}
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			formBusy = false;
		}
	}

	let confirmDeleteGroupeOpen = $state(false);
	let deleteGroupeBusy = $state(false);
	async function deleteActiveGroupe() {
		const g = activeGroupe;
		if (!g || deleteGroupeBusy) return;
		deleteGroupeBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}/groupes/${g.id}`, { method: 'DELETE' });
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				groupeFilter = null;
				confirmDeleteGroupeOpen = false;
				toasts.success(`Groupe « ${g.nom} » supprimé (prospects conservés)`);
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Suppression impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			deleteGroupeBusy = false;
		}
	}
	function toggleChip(target: GroupeFilter) {
		groupeFilter = groupeFilter === target ? null : target;
	}

	// --- Valider : lien externe (générer / message / révoquer / appliquer) ---
	let shareOpen = $state(false);
	let genBusy = $state(false);
	async function genererLien() {
		if (genBusy) return;
		genBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}/validation`, { method: 'POST' });
			const d = await resp.json().catch(() => null);
			if (resp.ok && d?.url) {
				shareUrl = d.url;
				shareExpiresAt = d.expiresAt ?? null;
				shareOpen = true;
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Création du lien impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			genBusy = false;
		}
	}

	// Message prêt à envoyer (demande Pascal 02/07 : texte complet SANS le nom, simple, sobre).
	const shareMessage = $derived(
		shareUrl
			? `Bonjour,

Merci de vérifier les prospects de la campagne « ${campagne.nom} » avant l'envoi.

1. Ouvre ce lien : ${shareUrl}
2. Pour chaque prospect, clique sur « Ouvrir sur Google Maps » et vérifie que l'adresse et l'activité correspondent.
3. Choisis « Garder » ou « Retirer ». Tes choix s'enregistrent automatiquement et restent modifiables.
4. Quand tu as terminé, clique « Envoyer la validation » en bas de la page.

Le lien est valable jusqu'au ${shareExpiresAt ? dateHeure(shareExpiresAt) : 'sa date d’expiration'}.
Il peut être ouvert à plusieurs en même temps : sur un même prospect, le dernier choix enregistré remplace le précédent.

Merci !`
			: ''
	);

	let copied = $state<'message' | 'lien' | null>(null);
	async function copier(kind: 'message' | 'lien') {
		const text = kind === 'message' ? shareMessage : (shareUrl ?? '');
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copied = kind;
			setTimeout(() => (copied = null), 2200);
		} catch {
			toasts.error('Copie impossible - sélectionnez le texte manuellement.');
		}
	}

	let confirmRevokeOpen = $state(false);
	let revokeBusy = $state(false);
	async function revoquerLien() {
		if (revokeBusy) return;
		revokeBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}/validation`, { method: 'DELETE' });
			if (resp.ok) {
				confirmRevokeOpen = false;
				shareUrl = null;
				toasts.success('Lien de validation révoqué');
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Révocation impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			revokeBusy = false;
		}
	}

	let confirmApplyOpen = $state(false);
	let applyBusy = $state(false);
	async function appliquerRetraits() {
		if (applyBusy) return;
		applyBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}/validation/appliquer`, { method: 'POST' });
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				confirmApplyOpen = false;
				toasts.success(
					d?.removed > 0
						? `${d.removed} prospect${d.removed > 1 ? 's' : ''} retiré${d.removed > 1 ? 's' : ''} de la campagne`
						: 'Aucun prospect à retirer'
				);
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Application impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			applyBusy = false;
		}
	}

	// --- Diffuser : PDF, étiquettes, pipeline ---
	let pdfBusy = $state(false);
	async function downloadPdf() {
		if (pdfBusy || prospects.length === 0) return;
		const rows = prospects;
		const grps = groupes;
		pdfBusy = true;
		try {
			const { exportListeProspectsPdf } = await import('$lib/campagnes-pdf/pdf-liste-prospects');
			await exportListeProspectsPdf(campagne.nom, rows, grps, data.marqueActive);
		} catch {
			toasts.error('Génération du PDF impossible');
		} finally {
			pdfBusy = false;
		}
	}

	// Envoi au pipeline : depuis la sélection (barre du bas) OU tous les « garder » (carte Diffuser).
	const gardes = $derived(prospects.filter((p) => p.validation_statut === 'garder'));
	let pipelineTarget = $state<'selection' | 'gardes' | null>(null);
	let pipelineBusy = $state(false);
	const pipelineIds = $derived(
		pipelineTarget === 'selection' ? [...sel] : pipelineTarget === 'gardes' ? gardes.map((p) => p.id) : []
	);
	async function envoyerPipeline() {
		if (pipelineBusy || pipelineIds.length === 0) return;
		pipelineBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${campagne.id}/pipeline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ leadIds: pipelineIds }),
			});
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				pipelineTarget = null;
				sel.clear();
				const parts = [
					d.entres > 0 ? `${d.entres} entré${d.entres > 1 ? 's' : ''} au pipeline` : null,
					d.deja > 0 ? `${d.deja} déjà au pipeline` : null,
					d.ignores > 0 ? `${d.ignores} non éligible${d.ignores > 1 ? 's' : ''}` : null,
					d.erreurs > 0 ? `${d.erreurs} en erreur` : null,
				].filter(Boolean);
				(d.erreurs > 0 ? toasts.error : toasts.success)(parts.join(' · ') || 'Aucun changement');
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Envoi au pipeline impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			pipelineBusy = false;
		}
	}
</script>

<div class="cp-bound">
	<!-- En-tête : retour + identité de campagne + statut -->
	<a class="cp-back" href="{CRM_BASE}/campagnes">
		<Icon name="arrow_back" size={15} /> Retour aux campagnes
	</a>

	<header class="cp-head">
		<div class="cp-head-id">
			<span class="camp-chip {campClass(campagne.couleur)}">
				{campagne.archived ? 'Archivée' : campagneStatutLabel(campagne.statut)}
			</span>
			<h2 class="cp-title">{campagne.nom}</h2>
			{#if campagne.description}<p class="cp-desc">{campagne.description}</p>{/if}
		</div>
		{#if !campagne.archived}
			<StatutSegment statut={campagneStatut} busy={statutBusy} onChange={setStatut} />
		{/if}
	</header>

	<!-- Fil des étapes : indicateur cliquable (jamais bloquant) -->
	<nav class="steps" aria-label="Étapes de la campagne">
		{#each steps as s, i (s.key)}
			<button
				type="button"
				class="step"
				class:fait={s.state === 'fait'}
				class:encours={s.state === 'encours'}
				onclick={() => (s.key === 'constituer' && prospects.length === 0 && !campagne.archived ? (searchOpen = true) : scrollTo(s.target))}
			>
				<span class="step-num" aria-hidden="true">
					{#if s.state === 'fait'}<Icon name="check" size={13} strokeWidth={3} />{:else}{i + 1}{/if}
				</span>
				<span class="step-txt">
					<span class="step-t">{s.titre}</span>
					<span class="step-d">{s.detail}</span>
				</span>
			</button>
			{#if i < steps.length - 1}<span class="step-sep" aria-hidden="true"></span>{/if}
		{/each}
	</nav>

	{#if importAlert}
		<div class="import-alert" role="alert">
			<Icon name="warning" size={17} />
			<p>{importAlert}</p>
			<button type="button" class="ia-close" aria-label="Fermer l'alerte" onclick={() => (importAlert = null)}>
				<Icon name="close" size={15} />
			</button>
		</div>
	{/if}

	<div class="cp-grid">
		<!-- ===== Colonne principale : prospects (Constituer + Organiser) ===== -->
		<section id="sec-prospects" class="card" aria-label="Prospects de la campagne">
			<div class="card-head">
				<h3 class="card-t">
					Prospects
					<span class="card-n tabular">{prospects.length}</span>
				</h3>
				{#if !campagne.archived}
					<button type="button" class="ws-btn ws-btn-secondary" onclick={() => (searchOpen = true)}>
						<Icon name="radar" size={15} /> Trouver des prospects
					</button>
				{/if}
			</div>

			{#if prospects.length === 0}
				{#if coherence}
					<EmptyState
						icon="group"
						title="Aucun prospect étiqueté"
						description={campagne.archived
							? "Cette campagne n'a pas encore de prospects."
							: "Cette campagne n'a pas encore de prospects. Lancez une recherche : le lot importé sera étiqueté automatiquement."}
						actionLabel={campagne.archived ? "" : "Trouver des prospects"}
						onAction={() => (searchOpen = true)}
					/>
				{:else}
					<div class="empty">
						<span class="empty-ic"><Icon name="group" size={22} /></span>
						<p class="empty-t">Aucun prospect étiqueté</p>
						<p class="empty-p">
							Cette campagne n'a pas encore de prospects.
							{#if !campagne.archived}Lancez une recherche : le lot importé sera étiqueté automatiquement.{/if}
						</p>
						{#if !campagne.archived}
							<button type="button" class="ws-btn ws-btn-primary" onclick={() => (searchOpen = true)}>
								<Icon name="radar" size={15} /> Trouver des prospects
							</button>
						{/if}
					</div>
				{/if}
			{:else}
				{#if coherence}
					<SearchInput value={search} oninput={(v) => (search = v)} placeholder="Filtrer par nom ou localité…" ariaLabel="Filtrer les prospects de la campagne" />
				{:else}
					<div class="psearch">
						<Icon name="search" size={16} />
						<input type="search" bind:value={search} placeholder="Filtrer par nom ou localité…" aria-label="Filtrer les prospects de la campagne" />
					</div>
				{/if}

				<div class="grp-row" role="group" aria-label="Groupes de prospects de la campagne">
					{#if groupes.length > 0}
						<button type="button" class="grp-chip" class:on={groupeFilter === null} onclick={() => (groupeFilter = null)}>
							Tous <span class="grp-n">{prospects.length}</span>
						</button>
						{#each sortedGroupes as g (g.id)}
							<button type="button" class="grp-chip" class:on={groupeFilter === g.id} aria-pressed={groupeFilter === g.id} onclick={() => toggleChip(g.id)}>
								{g.nom} <span class="grp-n">{counts.byId.get(g.id) ?? 0}</span>
							</button>
						{/each}
						{#if counts.none > 0}
							<button type="button" class="grp-chip grp-chip-none" class:on={groupeFilter === 'none'} aria-pressed={groupeFilter === 'none'} onclick={() => toggleChip('none')}>
								Sans groupe <span class="grp-n">{counts.none}</span>
							</button>
						{/if}
					{/if}
					<button type="button" class="grp-add" onclick={openCreateForm} title="Créer un groupe de prospects (ex. par type Google Maps)">
						<Icon name="add" size={14} /> Groupe
					</button>
					{#if activeGroupe}
						<span class="grp-tools">
							<button type="button" class="grp-tool" onclick={openRenameForm} aria-label={`Renommer le groupe ${activeGroupe.nom}`} title="Renommer ce groupe">
								<Icon name="edit" size={14} />
							</button>
							<button type="button" class="grp-tool grp-tool-danger" onclick={() => (confirmDeleteGroupeOpen = true)} aria-label={`Supprimer le groupe ${activeGroupe.nom}`} title="Supprimer ce groupe (les prospects restent dans la campagne)">
								<Icon name="delete" size={14} />
							</button>
						</span>
					{/if}
				</div>

				{#if formOpen}
					<div class="grp-form">
						<div class="grp-form-head">
							<b>{formMode === 'create' ? 'Nouveau groupe' : `Renommer « ${activeGroupe?.nom ?? ''} »`}</b>
							<span class="grp-form-count tabular">{formNom.trim().length}/{GROUPE_NOM_MAX}</span>
						</div>
						<input
							class="grp-form-input"
							maxlength={GROUPE_NOM_MAX}
							bind:value={formNom}
							placeholder="Nom du groupe (ex. Régies)"
							aria-label="Nom du groupe"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									submitForm();
								}
							}}
						/>
						{#if formMode === 'create' && suggestions.length > 0}
							<p class="grp-form-hint">Pré-remplir avec les prospects sans groupe :</p>
							<div class="grp-sugg" role="group" aria-label="Types détectés parmi les prospects sans groupe">
								{#each suggestions as s (s.key)}
									<label class="grp-sugg-item">
										<input type="checkbox" checked={formChecked.has(s.key)} onchange={() => toggleSuggestion(s.key)} />
										<span class="grp-sugg-label">{s.label}</span>
										<span class="grp-n">{s.count}</span>
									</label>
								{/each}
							</div>
						{/if}
						<div class="grp-form-foot">
							<button type="button" class="ws-btn ws-btn-primary" onclick={submitForm} disabled={formBusy || formNom.trim().length === 0}>
								{#if formMode === 'create'}
									{formLeadIds.length > 0 ? `Créer avec ${formLeadIds.length} prospect${formLeadIds.length > 1 ? 's' : ''}` : 'Créer le groupe'}
								{:else}
									Renommer
								{/if}
							</button>
							<button type="button" class="ws-btn ws-btn-secondary" onclick={closeForm}>Annuler</button>
						</div>
					</div>
				{/if}

				{#if filtered.length === 0}
					<p class="list-empty">
						{#if search.trim()}
							Aucun prospect ne correspond à « {search.trim()} »{activeGroupe ? ` dans « ${activeGroupe.nom} »` : ''}.
						{:else if groupeFilter === 'none'}
							Tous les prospects sont classés dans un groupe.
						{:else}
							Ce groupe est vide : sélectionnez des prospects puis « Déplacer vers… ».
						{/if}
					</p>
				{:else}
					<div class="list-tools">
						<button type="button" class="list-selall" onclick={toggleSelectAllFiltered}>
							<Icon name={allFilteredSelected ? 'deselect' : 'select_all'} size={14} />
							{allFilteredSelected ? 'Tout désélectionner' : `Tout sélectionner (${filtered.length})`}
						</button>
					</div>
					<ul class="plist" aria-label={`Prospects de la campagne ${campagne.nom}`}>
						{#each filtered as p (p.id)}
							<li class="prow" class:rowsel={sel.has(p.id)}>
								<label class="row-cbx-wrap">
									<input type="checkbox" class="row-cbx-input" checked={sel.has(p.id)} onchange={() => toggleSel(p.id)} aria-label={`Sélectionner ${p.raison_sociale}`} />
									<span class="row-cbx" class:on={sel.has(p.id)} aria-hidden="true"><Icon name="check" size={11} strokeWidth={3} /></span>
								</label>
								<div class="min-w-0 flex-1">
									<div class="prow-name" title={p.raison_sociale}>{p.raison_sociale}</div>
									<div class="prow-sub">
										{adresseCourte(p)}<span class="sub-sep">·</span>{sourceLabel(p.source)}
										{#if p.groupe_id && groupeById.get(p.groupe_id)}
											<span class="sub-sep">·</span><span class="grp-tag">{groupeById.get(p.groupe_id)?.nom}</span>
										{/if}
									</div>
								</div>
								<div class="prow-side">
									{#if p.validation_statut}
										<span class="val-chip" class:garder={p.validation_statut === 'garder'} class:retirer={p.validation_statut === 'retirer'} title="Décision de la validation externe">
											<Icon name={p.validation_statut === 'garder' ? 'check' : 'close'} size={11} strokeWidth={3} />
											{p.validation_statut === 'garder' ? 'Garder' : 'Retirer'}
										</span>
									{/if}
									<ScorePill score={p.score_pertinence} compact display="value" />
									<Badge label={statutLabel(p.statut)} variant={statutBadgeVariant(p.statut)} />
									<button
										type="button"
										class="row-remove"
										aria-label={`Retirer ${p.raison_sociale} de la campagne`}
										title="Retirer de la campagne (le prospect reste en Prospection)"
										disabled={removeBusy.has(p.id)}
										onclick={() => removeFromCampagne(p)}
									>
										<Icon name="close" size={15} />
									</button>
								</div>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="card-foot">
					{#if sel.size > 0}
						<div class="bulk" role="region" aria-label="Actions sur la sélection">
							<span class="bulk-count"><span class="bulk-badge tabular">{sel.size}</span> sélectionné{sel.size > 1 ? 's' : ''}</span>
							<select class="bulk-select" value="" disabled={assignBusy} onchange={onBulkSelect} aria-label="Déplacer la sélection vers un groupe">
								<option value="" disabled>Déplacer vers…</option>
								{#each sortedGroupes as g (g.id)}
									<option value={g.id}>{g.nom}</option>
								{/each}
								{#if sortedGroupes.length > 0}
									<option value="__none__">Sans groupe</option>
								{/if}
							</select>
							<button type="button" class="ws-btn ws-btn-secondary" onclick={() => (pipelineTarget = 'selection')}>
								<Icon name="trending_up" size={15} /> Envoyer au pipeline
							</button>
							<button type="button" class="ws-btn ws-btn-secondary" onclick={() => sel.clear()}>Annuler</button>
						</div>
					{:else}
						<a class="foot-link" href="{CRM_BASE}/prospection?campagne={campagne.id}" title="Ouvrir la Prospection filtrée sur cette campagne (tri, statuts, enrichissement)">
							Ouvrir dans la Prospection <Icon name="arrow_forward" size={15} />
						</a>
					{/if}
				</div>
			{/if}
		</section>

		<!-- ===== Colonne latérale : Valider + Diffuser ===== -->
		<div class="side">
			<section id="sec-validation" class="card" aria-label="Validation externe">
				<h3 class="card-t"><Icon name="how_to_reg" size={17} /> Validation externe</h3>
				<p class="card-p">
					Une personne de l'équipe, sans compte CRM, vérifie chaque prospect sur Google Maps et
					marque « garder » ou « retirer ».
				</p>

				{#if progress.verifies > 0}
					<div class="vprog">
						<div class="vprog-top">
							<span class="vprog-count tabular">{progress.verifies}/{progress.total} vérifiés</span>
							<span class="vprog-detail tabular">{progress.garder} à garder · {progress.retirer} à retirer</span>
						</div>
						<div class="vbar" aria-hidden="true">
							<span class="vbar-fill" style="width: {progress.total ? (progress.verifies / progress.total) * 100 : 0}%"></span>
						</div>
					</div>
				{/if}

				{#if validationRecueAt}
					<p class="vrecue" role="status">
						<Icon name="check" size={14} strokeWidth={3} /> Validation reçue le {dateHeure(validationRecueAt)}.
					</p>
				{/if}

				{#if lienActif}
					<p class="vlien">
						<Icon name="link" size={14} /> Lien actif jusqu'au {lienDate}.
						{#if shareUrl}<button type="button" class="lnk" onclick={() => (shareOpen = true)}>Revoir le message</button>{/if}
					</p>
				{:else if progress.verifies === 0}
					<p class="vlien muted">Aucun lien actif.</p>
				{:else}
					<p class="vlien muted">Aucun lien actif - les décisions déjà prises sont conservées.</p>
				{/if}

				<div class="card-actions">
					{#if !campagne.archived}
						<button type="button" class="ws-btn ws-btn-primary" disabled={genBusy || prospects.length === 0} onclick={genererLien} title={prospects.length === 0 ? 'Ajoutez d’abord des prospects à la campagne' : undefined}>
							<Icon name="share" size={15} /> {genBusy ? 'Génération…' : lienActif ? 'Générer un nouveau lien' : 'Partager pour validation'}
						</button>
					{/if}
					{#if progress.retirer > 0}
						<button type="button" class="ws-btn ws-btn-tertiary" onclick={() => (confirmApplyOpen = true)}>
							<Icon name="person_remove" size={15} /> Appliquer les retraits ({progress.retirer})
						</button>
					{/if}
					{#if lienActif}
						<button type="button" class="ws-btn ws-btn-tertiary ws-btn-tertiary-muted" onclick={() => (confirmRevokeOpen = true)}>
							Révoquer le lien
						</button>
					{/if}
				</div>
			</section>

			<section id="sec-diffusion" class="card" aria-label="Diffusion">
				<h3 class="card-t"><Icon name="send" size={17} /> Diffuser</h3>
				<p class="card-p">Les sorties de la campagne, une fois la liste au propre.</p>
				<ul class="difflist">
					<li>
						<button type="button" class="diff-item" disabled={prospects.length === 0} onclick={() => goto(`${CRM_BASE}/campagnes/${campagne.id}/etiquettes`)}>
							<span class="diff-ic"><Icon name="mail" size={17} /></span>
							<span class="diff-txt">
								<span class="diff-t">Étiquettes d'adresses</span>
								<span class="diff-d">Planche Avery pour le publipostage{progress.retirer > 0 ? ' - option « ignorer les Retirer »' : ''}</span>
							</span>
							<Icon name="chevron_right" size={16} />
						</button>
					</li>
					<li>
						<button type="button" class="diff-item" disabled={pdfBusy || prospects.length === 0} onclick={downloadPdf}>
							<span class="diff-ic"><Icon name="download" size={17} /></span>
							<span class="diff-txt">
								<span class="diff-t">{pdfBusy ? 'Génération du PDF…' : 'Liste des prospects (PDF)'}</span>
								<span class="diff-d">A4 paysage, liens Google Maps cliquables</span>
							</span>
							<Icon name="chevron_right" size={16} />
						</button>
					</li>
					<li>
						<button type="button" class="diff-item" disabled={gardes.length === 0} onclick={() => (pipelineTarget = 'gardes')} title={gardes.length === 0 ? 'Disponible quand des prospects sont marqués « garder » par la validation' : undefined}>
							<span class="diff-ic"><Icon name="trending_up" size={17} /></span>
							<span class="diff-txt">
								<span class="diff-t">Envoyer les validés au pipeline{gardes.length > 0 ? ` (${gardes.length})` : ''}</span>
								<span class="diff-d">Les « garder » deviennent des opportunités à contacter</span>
							</span>
							<Icon name="chevron_right" size={16} />
						</button>
					</li>
				</ul>
			</section>
		</div>
	</div>
</div>

<!-- Modale « message prêt à envoyer » : le token n'est affiché qu'ICI, une seule fois. -->
<ModalForm bind:open={shareOpen} title="Lien de validation prêt" icon="share" maxWidth="max-w-lg">
	<p class="share-hint">
		Copiez ce message et envoyez-le (email ou WhatsApp). Le lien est secret : il n'est affiché
		qu'une seule fois - en cas de perte, générez simplement un nouveau lien.
	</p>
	<pre class="share-msg">{shareMessage}</pre>
	<div class="share-actions">
		<button type="button" class="ws-btn ws-btn-primary" onclick={() => copier('message')}>
			<Icon name={copied === 'message' ? 'check' : 'content_copy'} size={15} />
			{copied === 'message' ? 'Message copié' : 'Copier le message'}
		</button>
		<button type="button" class="ws-btn ws-btn-secondary" onclick={() => copier('lien')}>
			<Icon name={copied === 'lien' ? 'check' : 'link'} size={15} />
			{copied === 'lien' ? 'Lien copié' : 'Copier le lien seul'}
		</button>
	</div>
</ModalForm>

<!-- Confirmations -->
<ConfirmModal
	bind:open={confirmApplyOpen}
	title="Appliquer les retraits ?"
	message={`${progress.retirer} prospect${progress.retirer > 1 ? 's' : ''} marqué${progress.retirer > 1 ? 's' : ''} « retirer » ser${progress.retirer > 1 ? 'ont' : 'a'} retiré${progress.retirer > 1 ? 's' : ''} de la campagne. Les prospects eux-mêmes restent en Prospection.`}
	confirmLabel="Retirer de la campagne"
	variant="danger"
	loading={applyBusy}
	onConfirm={appliquerRetraits}
/>

<ConfirmModal
	bind:open={confirmRevokeOpen}
	title="Révoquer le lien de validation ?"
	message="La page de vérification cessera de fonctionner immédiatement. Les décisions déjà enregistrées sont conservées."
	confirmLabel="Révoquer"
	variant="danger"
	loading={revokeBusy}
	onConfirm={revoquerLien}
/>

<ConfirmModal
	open={pipelineTarget !== null}
	title="Envoyer au pipeline ?"
	message={`${pipelineIds.length} prospect${pipelineIds.length > 1 ? 's' : ''} passer${pipelineIds.length > 1 ? 'ont' : 'a'} « à contacter » et entrer${pipelineIds.length > 1 ? 'ont' : 'a'} au pipeline (une opportunité par prospect). Les prospects écartés ou déjà convertis ne sont pas touchés.`}
	confirmLabel="Envoyer au pipeline"
	loading={pipelineBusy}
	onConfirm={envoyerPipeline}
	onClose={() => (pipelineTarget = null)}
/>

<ConfirmModal
	bind:open={confirmDeleteGroupeOpen}
	title="Supprimer le groupe"
	message={`Supprimer le groupe « ${activeGroupe?.nom ?? ''} » ? Ses ${counts.byId.get(activeGroupe?.id ?? '') ?? 0} prospect(s) repassent « sans groupe » et restent dans la campagne.`}
	confirmLabel="Supprimer"
	loading={deleteGroupeBusy}
	onConfirm={deleteActiveGroupe}
/>

<!-- Recherche de prospects pré-cochée sur CETTE campagne -->
<EntrepriseSearchModal
	bind:open={searchOpen}
	bind:importResult={searchImportResult}
	allowedSources={entrepriseSources}
	premium={true}
	campagnes={[{ ...campagne, lead_count: prospects.length }]}
	presetCampagneIds={[campagne.id]}
/>

<style>
	.cp-bound {
		/* Pleine largeur (retour Pascal 16/07) : aligné sur la liste Campagnes et les autres pages
		   CRM (plus de bridage 1160 centré). Gouttières latérales portées par les blocs internes. */
		padding: 8px 0 64px;
	}

	.cp-back {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 10px -8px;
		padding: 6px 10px 6px 8px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-decoration: none;
		transition: background 160ms ease, color 160ms ease;
	}
	.cp-back:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.cp-back:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	.cp-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.cp-title {
		margin: 8px 0 0;
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}
	.cp-desc {
		margin: 4px 0 0;
		font-size: 13.5px;
		color: var(--color-text-muted);
		max-width: 64ch;
	}
	.camp-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 11px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}

	/* Statut segmenté : composant partagé StatutSegment.svelte (source unique liste + page). */

	/* ===== Fil des étapes ===== */
	.steps {
		display: flex;
		align-items: stretch;
		gap: 8px;
		margin-bottom: 16px;
		overflow-x: auto;
		padding-bottom: 2px;
	}
	.step {
		flex: 1;
		min-width: 150px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 13px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xs);
		cursor: pointer;
		text-align: left;
		transition: border-color 160ms ease, background 160ms ease;
	}
	.step:hover {
		border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
	}
	.step:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	.step-num {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		font-size: 12px;
		font-weight: 800;
		color: var(--color-text-muted);
	}
	.step.fait .step-num {
		background: var(--color-success);
		border-color: var(--color-success);
		color: #fff;
	}
	.step.encours .step-num {
		background: var(--color-primary-light);
		border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
		color: var(--color-primary);
	}
	.step-txt {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.step-t {
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text);
	}
	.step-d {
		font-size: 11.5px;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.step-sep {
		align-self: center;
		width: 14px;
		height: 1px;
		flex-shrink: 0;
		background: var(--color-border-strong);
	}

	/* Alerte d'import persistante (même traitement que la liste des campagnes). */
	.import-alert {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		margin-bottom: 14px;
		border: 1px solid color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
		background: var(--color-warning-light);
		border-radius: var(--radius-lg);
		color: var(--color-warning-deep);
	}
	.import-alert p {
		margin: 0;
		font-size: 13px;
		flex: 1;
	}
	.ia-close {
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		padding: 2px;
		border-radius: var(--radius-md);
	}

	/* ===== Grille principale ===== */
	.cp-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 16px;
		align-items: start;
	}
	@media (max-width: 980px) {
		.cp-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
		position: sticky;
		top: 16px;
	}
	@media (max-width: 980px) {
		.side {
			position: static;
		}
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xs);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.card-t {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
	}
	.card-t :global(svg) {
		color: var(--color-primary);
	}
	.card-n {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		padding: 0 7px;
		border-radius: var(--radius-full);
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-size: 12px;
		font-weight: 800;
	}
	.card-p {
		margin: -4px 0 0;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}
	.card-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.card-foot {
		border-top: 1px solid var(--color-hairline);
		padding-top: 12px;
		margin-top: 2px;
	}
	.foot-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
	}
	.foot-link:hover {
		text-decoration: underline;
	}

	/* ===== Validation ===== */
	/* Compteur + barre NUS sur la carte (plus de boîte-dans-boîte, mockup v3). */
	.vprog {
		margin-top: 16px;
	}
	.vprog-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
	}
	.vprog-count {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
	}
	.vprog-detail {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-text-muted);
	}
	/* Barre MONO bleue (un seul accent, plus de bicolore vert + rouge). Remplissage = vérifiés/total. */
	.vbar {
		height: 8px;
		margin-top: 8px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		overflow: hidden;
	}
	.vbar-fill {
		display: block;
		height: 100%;
		background: var(--color-primary);
		transition: width 260ms ease;
	}
	/* Badge « Validation reçue » : confirmation finale de la personne externe (informatif,
	   ne conditionne AUCUNE action - étiquettes et campagne avancent avec ou sans lui). */
	.vrecue {
		margin: 12px 0 0;
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 8px 12px;
		border: 1px solid color-mix(in srgb, var(--color-prosp-convert) 40%, var(--color-border));
		background: var(--color-success-light);
		border-radius: var(--radius-lg);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-prosp-convert);
	}
	.vrecue :global(svg) {
		flex-shrink: 0;
	}

	.vlien {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-text-body);
		flex-wrap: wrap;
	}
	.vlien.muted {
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.vlien :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.lnk {
		border: none;
		background: none;
		padding: 0;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--color-primary);
		cursor: pointer;
		text-decoration: underline;
	}

	/* Chip décision sur la ligne prospect. */
	.val-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 700;
	}
	/* Décisions sourdes golden (mockup v3) : Garde = sauge (--color-prosp-convert #538B6B),
	   Retire = ardoise (--color-info) - JAMAIS de rouge en aplat sur la ligne. */
	.val-chip.garder {
		background: var(--color-success-light);
		color: var(--color-prosp-convert);
	}
	.val-chip.retirer {
		background: var(--color-info-light);
		color: var(--color-info);
	}

	/* ===== Diffusion ===== */
	.difflist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.diff-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 11px 12px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease, background 150ms ease;
	}
	.diff-item:hover:not(:disabled) {
		background: var(--color-surface-alt);
		border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
	}
	.diff-item:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.diff-item:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	.diff-ic {
		width: 34px;
		height: 34px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		border-radius: var(--radius-md);
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.diff-txt {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.diff-t {
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text);
	}
	.diff-d {
		font-size: 11.5px;
		color: var(--color-text-muted);
	}

	/* ===== Modale partage ===== */
	.share-hint {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-body);
	}
	.share-msg {
		margin: 0;
		padding: 13px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface-alt);
		font: 12.5px/1.55 var(--font-sans, inherit);
		color: var(--color-text-body);
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 300px;
		overflow-y: auto;
	}
	.share-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	/* ===== Prospects (styles portés de l'ex-panneau) ===== */
	.psearch {
		position: relative;
	}
	.psearch :global(svg) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.psearch input {
		width: 100%;
		height: 38px;
		padding: 0 13px 0 37px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		font: 13.5px var(--font-sans, inherit);
		color: var(--color-text);
	}
	.psearch input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}

	.grp-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.grp-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-body);
		cursor: pointer;
		transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
	}
	.grp-chip:hover {
		background: var(--color-surface-alt);
	}
	.grp-chip.on {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: #fff;
	}
	.grp-chip.on .grp-n {
		background: rgba(255, 255, 255, 0.22);
		color: #fff;
	}
	.grp-chip-none {
		border-style: dashed;
	}
	.grp-n {
		display: inline-grid;
		place-items: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-size: 11px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.grp-add {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border: 1px dashed color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
		background: transparent;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-primary);
		cursor: pointer;
		transition: background 140ms ease;
	}
	.grp-add:hover {
		background: var(--color-primary-light);
	}
	.grp-chip:focus-visible,
	.grp-add:focus-visible,
	.grp-tool:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	.grp-tools {
		display: inline-flex;
		gap: 2px;
	}
	.grp-tool {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 140ms ease, color 140ms ease;
	}
	.grp-tool:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.grp-tool-danger:hover {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
	}

	.grp-form {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface-alt);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.grp-form-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
		color: var(--color-text);
	}
	.grp-form-count {
		font-size: 11.5px;
		color: var(--color-text-muted);
	}
	.grp-form-input {
		width: 100%;
		height: 36px;
		padding: 0 12px;
		border: 1px solid var(--color-border-input, var(--color-border));
		border-radius: var(--radius-md);
		background: var(--color-surface);
		font: 13.5px var(--font-sans, inherit);
		color: var(--color-text);
	}
	.grp-form-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.grp-form-hint {
		margin: 0;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.grp-sugg {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 168px;
		overflow-y: auto;
	}
	.grp-sugg-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 6px;
		border-radius: var(--radius-md);
		font-size: 12.5px;
		color: var(--color-text-body);
		cursor: pointer;
	}
	.grp-sugg-item:hover {
		background: var(--color-surface);
	}
	.grp-sugg-item input {
		accent-color: var(--color-primary);
	}
	.grp-sugg-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.grp-form-foot {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.list-empty {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-muted);
		padding: 22px 4px;
		text-align: center;
	}
	.list-tools {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -6px;
	}
	.list-selall {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: none;
		background: transparent;
		padding: 4px 6px;
		border-radius: var(--radius-md);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-primary);
		cursor: pointer;
	}
	.list-selall:hover {
		background: var(--color-primary-light);
	}
	.list-selall:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	.plist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.prow {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 4px;
		border-bottom: 1px solid var(--color-hairline);
	}
	.prow:last-child {
		border-bottom: none;
	}
	.prow.rowsel {
		background: rgba(47, 90, 158, 0.045);
	}
	.prow-side {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.row-cbx-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		cursor: pointer;
	}
	.row-cbx-input {
		position: absolute;
		width: 18px;
		height: 18px;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.row-cbx {
		width: 18px;
		height: 18px;
		border-radius: 5px;
		border: 1.5px solid var(--color-border-strong);
		display: grid;
		place-items: center;
		background: var(--color-surface);
		color: #fff;
		transition: background 140ms ease, border-color 140ms ease;
	}
	.row-cbx :global(svg) {
		opacity: 0;
	}
	.row-cbx.on {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
	.row-cbx.on :global(svg) {
		opacity: 1;
	}
	.row-cbx-input:focus-visible ~ .row-cbx {
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.28);
		border-color: var(--color-primary);
	}

	.prow-name {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.prow-sub {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.sub-sep {
		margin: 0 6px;
	}
	.grp-tag {
		display: inline-block;
		padding: 1px 7px;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		color: var(--color-text-body);
		font-size: 11px;
		font-weight: 600;
	}
	.row-remove {
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border: 1px solid transparent;
		background: transparent;
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
	}
	.row-remove:hover:not(:disabled) {
		background: var(--color-danger-light);
		border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);
		color: var(--color-danger-deep);
	}
	.row-remove:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.row-remove:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	/* Barre de sélection (pied de carte). */
	.bulk {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.bulk-count {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
	}
	.bulk-badge {
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: var(--radius-full);
		background: var(--color-primary);
		color: #fff;
		font-size: 11.5px;
		font-weight: 700;
		display: inline-grid;
		place-items: center;
	}
	.bulk-select {
		min-width: 150px;
		height: 36px;
		padding: 0 10px;
		border: 1px solid var(--color-border-input, var(--color-border));
		border-radius: var(--radius-md);
		background: var(--color-surface);
		font: 13px var(--font-sans, inherit);
		color: var(--color-text);
		cursor: pointer;
	}
	.bulk-select:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}

	/* États vide. */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
		padding: 44px 20px;
	}
	.empty-ic {
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-xl);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		margin-bottom: 4px;
	}
	.empty-t {
		margin: 0;
		font-size: 14.5px;
		font-weight: 700;
		color: var(--color-text);
	}
	.empty-p {
		margin: 0 0 8px;
		font-size: 13px;
		color: var(--color-text-muted);
		max-width: 40ch;
	}
</style>
