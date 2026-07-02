<script lang="ts">
	/**
	 * Panneau « Prospects de la campagne » (écran Campagnes). Remplace l'aller-retour vers la
	 * Prospection : consultation des prospects étiquetés SANS quitter la page (slide-out, même
	 * primitive que la fiche prospect). L'ouverture dans la Prospection reste possible mais
	 * devient un choix explicite (pied de panneau), plus jamais une obligation.
	 *
	 * Données : GET /api/campagnes/[id]/prospects + GET /api/campagnes/[id]/groupes, chargés en
	 * parallèle à l'ouverture. Garde anti-course `inflightToken` sur les requêtes en vol : le
	 * composant est réutilisé d'une campagne à l'autre sans remount (cf.
	 * feedback_sveltekit_page_reuse_reset_local_state).
	 *
	 * GROUPES (2026-07-02) : un prospect appartient à au plus UN groupe par campagne. Le panneau
	 * porte tout le cycle : pastilles-filtres avec compteurs, création pré-remplie par type
	 * Google / source (suggestions sur les prospects SANS groupe uniquement : le pré-remplissage
	 * ne déplace jamais un prospect déjà classé), sélection multiple -> « Déplacer vers… »,
	 * renommage / suppression du groupe actif (suppression = les prospects repassent sans
	 * groupe, jamais retirés de la campagne). Nom borné GROUPE_NOM_MAX = 24 (stress test
	 * étiquette de transition). Logique pure (tri, compteurs, filtre, suggestions) testée dans
	 * `$lib/campagne-groupes`.
	 *
	 * Retrait d'étiquette : DELETE /api/prospection/lead-campagnes (le prospect reste en
	 * Prospection), maj locale + invalidateAll (compteurs de la liste + KPI à jour).
	 */
	import SlideOut from '$lib/components/SlideOut.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import { toasts } from '$lib/stores/toast';
	import { CRM_BASE } from '$lib/config';
	import { statutLabel, statutBadgeVariant, sourceLabel } from '$lib/prospection-utils';
	import {
		campClass,
		campagneStatutLabel,
		filterProspectsCampagne,
		type CampagneWithCount,
		type ProspectCampagne,
	} from '$lib/campagnes';
	import {
		GROUPE_NOM_MAX,
		MAX_GROUPE_LEAD_IDS,
		sortGroupes,
		groupeCounts,
		filterByGroupe,
		groupeSuggestions,
		type CampagneGroupe,
		type GroupeFilter,
	} from '$lib/campagne-groupes';

	let {
		open = $bindable(false),
		campagne = null,
		onTrouver,
	}: {
		open?: boolean;
		campagne?: CampagneWithCount | null;
		/** Ouvre la recherche de prospects pré-cochée sur cette campagne (campagnes ouvertes seulement). */
		onTrouver?: (c: CampagneWithCount) => void;
	} = $props();

	let prospects = $state<ProspectCampagne[]>([]);
	let groupes = $state<CampagneGroupe[]>([]);
	let loading = $state(false);
	let loadError = $state(false);
	let search = $state('');
	let groupeFilter = $state<GroupeFilter>(null);

	// --- Sélection multiple (assignation de groupe) ---
	const sel = new SvelteSet<string>();
	let assignBusy = $state(false);

	// --- Mini-formulaire groupe (création pré-remplie / renommage) ---
	let formOpen = $state(false);
	let formMode = $state<'create' | 'rename'>('create');
	let formNom = $state('');
	let formBusy = $state(false);
	const formChecked = new SvelteSet<string>(); // clés des suggestions cochées

	// --- Suppression du groupe actif ---
	let confirmDeleteOpen = $state(false);
	let deleteBusy = $state(false);

	// Jeton unique de requête en vol : une réponse qui arrive après un changement de campagne,
	// une fermeture OU une réouverture de la même campagne est ignorée. Un id de campagne ne
	// suffirait pas (fermer/rouvrir la même campagne = 2 requêtes au même id, la plus vieille
	// pourrait gagner) ; le compteur rend la course impossible par construction.
	let inflightToken = 0;

	async function load(campId: string) {
		const token = ++inflightToken;
		loading = true;
		loadError = false;
		try {
			// Prospects + groupes en parallèle : tout-ou-rien (un panneau « groupes absents » serait
			// un état menteur - les pastilles disparaîtraient alors que les prospects en portent).
			const [pResp, gResp] = await Promise.all([
				fetch(`/api/campagnes/${campId}/prospects`),
				fetch(`/api/campagnes/${campId}/groupes`),
			]);
			const [pData, gData] = await Promise.all([
				pResp.json().catch(() => null),
				gResp.json().catch(() => null),
			]);
			if (inflightToken !== token) return; // réponse périmée
			if (pResp.ok && pData && Array.isArray(pData.prospects) && gResp.ok && gData && Array.isArray(gData.groupes)) {
				prospects = pData.prospects;
				groupes = gData.groupes;
			} else {
				loadError = true;
			}
		} catch {
			if (inflightToken === token) loadError = true;
		} finally {
			if (inflightToken === token) loading = false;
		}
	}

	function resetLocalState() {
		prospects = [];
		groupes = [];
		search = '';
		groupeFilter = null;
		sel.clear();
		formOpen = false;
		formMode = 'create';
		formNom = '';
		formChecked.clear();
		confirmDeleteOpen = false;
	}

	// Chargement à l'ouverture + rechargement si on ouvre pour une AUTRE campagne (le composant
	// n'est pas remonté). L'état local est réinitialisé à chaque ouverture.
	let lastLoadedId = $state<string | null>(null);
	$effect(() => {
		if (!open || !campagne) {
			if (!open) {
				inflightToken++; // invalide toute réponse encore en vol
				lastLoadedId = null;
			}
			return;
		}
		if (campagne.id === lastLoadedId) return;
		lastLoadedId = campagne.id;
		resetLocalState();
		load(campagne.id);
	});

	const sortedGroupes = $derived(sortGroupes(groupes));
	const counts = $derived(groupeCounts(prospects));
	const suggestions = $derived(groupeSuggestions(prospects));
	const groupeById = $derived(new Map(groupes.map((g) => [g.id, g])));
	const activeGroupe = $derived(
		groupeFilter !== null && groupeFilter !== 'none' ? (groupeById.get(groupeFilter) ?? null) : null
	);
	const filtered = $derived(filterByGroupe(filterProspectsCampagne(prospects, search), groupeFilter));
	const allFilteredSelected = $derived(filtered.length > 0 && filtered.every((p) => sel.has(p.id)));
	/** Prospects préchargés du formulaire de création (union des suggestions cochées). */
	const formLeadIds = $derived(
		formMode === 'create' ? suggestions.filter((s) => formChecked.has(s.key)).flatMap((s) => s.leadIds) : []
	);

	// Compteur du bandeau : pendant le chargement, le compteur frais de la ligne (lead_count,
	// maintenu par invalidateAll) évite un « 0 prospect » mensonger au-dessus des squelettes.
	const shownCount = $derived(loading ? (campagne?.lead_count ?? 0) : prospects.length);

	// --- Retrait d'étiquette (le prospect reste en Prospection) ---
	const removeBusy = new SvelteSet<string>();

	async function removeFromCampagne(p: ProspectCampagne) {
		const c = campagne;
		if (!c || removeBusy.has(p.id)) return;
		removeBusy.add(p.id);
		try {
			const resp = await fetch('/api/prospection/lead-campagnes', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ leadId: p.id, campagneId: c.id }),
			});
			if (resp.ok) {
				// Garde cross-campagne : si l'opérateur a ouvert une AUTRE campagne pendant le DELETE,
				// ne pas retirer la ligne de la liste courante (le lead peut y être légitimement).
				if (campagne?.id === c.id) {
					prospects = prospects.filter((x) => x.id !== p.id);
					sel.delete(p.id); // la sélection ne référence jamais une ligne partie
				}
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

	// --- Groupes : sélection + assignation ---
	function toggleSel(id: string) {
		if (sel.has(id)) sel.delete(id);
		else sel.add(id);
	}
	function toggleSelectAllFiltered() {
		if (allFilteredSelected) for (const p of filtered) sel.delete(p.id);
		else for (const p of filtered) sel.add(p.id);
	}

	/**
	 * Garde de péremption des MUTATIONS (bug-hunter 2026-07-02, M1) : l'égalité d'id de campagne
	 * ne détecte pas un cycle fermer→rouvrir (ou A→B→A) de la MÊME campagne pendant l'await -
	 * `load()` aurait alors déjà rechargé la vérité serveur, et une maj locale périmée pourrait
	 * dupliquer un groupe (append) -> clé `{#each}` dupliquée. `inflightToken` est incrémenté à
	 * chaque fermeture ET chaque load : un jeton capturé avant l'await qui ne matche plus = état
	 * local reconstruit entre-temps -> on n'y touche plus (le serveur a déjà été mis à jour, le
	 * rechargement l'a déjà reflété ou le fera à la prochaine ouverture).
	 */
	function mutationToken(): number {
		return inflightToken;
	}
	function stale(token: number, campId: string): boolean {
		return inflightToken !== token || campagne?.id !== campId;
	}

	/** Déplace la sélection vers `groupeId` (null = sans groupe). Maj locale, compte honnête. */
	async function moveSelection(groupeId: string | null) {
		const c = campagne;
		if (!c || assignBusy || sel.size === 0) return;
		const ids = [...sel];
		if (ids.length > MAX_GROUPE_LEAD_IDS) {
			toasts.error(`Sélection trop grande (max ${MAX_GROUPE_LEAD_IDS}).`);
			return;
		}
		const token = mutationToken();
		assignBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}/groupes/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groupeId, leadIds: ids }),
			});
			const d = await resp.json().catch(() => null);
			if (stale(token, c.id)) return; // état local rechargé entre-temps (garde M1)
			if (resp.ok) {
				const idSet = new Set(ids);
				prospects = prospects.map((p) => (idSet.has(p.id) ? { ...p, groupe_id: groupeId } : p));
				sel.clear();
				const nom = groupeId ? (groupeById.get(groupeId)?.nom ?? 'le groupe') : null;
				const n = typeof d?.updated === 'number' ? d.updated : ids.length;
				toasts.success(
					groupeId
						? `${n} prospect${n > 1 ? 's' : ''} déplacé${n > 1 ? 's' : ''} vers « ${nom} »`
						: `${n} prospect${n > 1 ? 's' : ''} retiré${n > 1 ? 's' : ''} de leur groupe`
				);
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
		el.value = ''; // le <select> est une commande, pas un état : il se réarme aussitôt
		if (!v) return;
		void moveSelection(v === '__none__' ? null : v);
	}

	// --- Groupes : mini-formulaire création / renommage ---
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
		const c = campagne;
		const nom = formNom.trim();
		if (!c || formBusy || nom.length === 0 || nom.length > GROUPE_NOM_MAX) return;
		const token = mutationToken();
		formBusy = true;
		try {
			if (formMode === 'create') {
				const leadIds = formLeadIds.slice(0, MAX_GROUPE_LEAD_IDS);
				const resp = await fetch(`/api/campagnes/${c.id}/groupes`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ nom, ...(leadIds.length > 0 ? { leadIds } : {}) }),
				});
				const d = await resp.json().catch(() => null);
				if (stale(token, c.id)) return; // garde M1 : jamais d'append périmé (groupe dupliqué)
				if (resp.ok && d?.groupe) {
					groupes = [...groupes, d.groupe];
					if (leadIds.length > 0 && !d.assignWarning) {
						const idSet = new Set(leadIds);
						prospects = prospects.map((p) => (idSet.has(p.id) ? { ...p, groupe_id: d.groupe.id } : p));
					}
					groupeFilter = d.groupe.id; // focus immédiat sur le groupe créé (feedback visuel)
					closeForm();
					if (d.assignWarning) toasts.error(d.assignWarning);
					else
						toasts.success(
							d.assigned > 0
								? `Groupe « ${nom} » créé avec ${d.assigned} prospect${d.assigned > 1 ? 's' : ''}`
								: `Groupe « ${nom} » créé`
						);
				} else {
					toasts.error(d?.error || 'Création du groupe impossible');
				}
			} else {
				const g = activeGroupe;
				if (!g) return;
				const resp = await fetch(`/api/campagnes/${c.id}/groupes/${g.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ nom }),
				});
				const d = await resp.json().catch(() => null);
				if (stale(token, c.id)) return;
				if (resp.ok && d?.groupe) {
					groupes = groupes.map((x) => (x.id === g.id ? d.groupe : x));
					closeForm();
					toasts.success(`Groupe renommé en « ${nom} »`);
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

	async function deleteActiveGroupe() {
		const c = campagne;
		const g = activeGroupe;
		if (!c || !g || deleteBusy) return;
		const token = mutationToken();
		deleteBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}/groupes/${g.id}`, { method: 'DELETE' });
			const d = await resp.json().catch(() => null);
			if (stale(token, c.id)) return;
			if (resp.ok) {
				groupes = groupes.filter((x) => x.id !== g.id);
				prospects = prospects.map((p) => (p.groupe_id === g.id ? { ...p, groupe_id: null } : p));
				groupeFilter = null;
				confirmDeleteOpen = false;
				toasts.success(`Groupe « ${g.nom} » supprimé (prospects conservés)`);
			} else {
				toasts.error(d?.error || 'Suppression impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			deleteBusy = false;
		}
	}

	function toggleChip(target: GroupeFilter) {
		groupeFilter = groupeFilter === target ? null : target;
	}

	function openInProspection() {
		if (!campagne) return;
		open = false;
		goto(`${CRM_BASE}/prospection?campagne=${campagne.id}`);
	}

	function trouver() {
		if (!campagne || !onTrouver) return;
		const c = campagne;
		open = false; // le panneau se rouvre à jour après import (compteurs via invalidateAll)
		onTrouver(c);
	}

	function adresseCourte(p: ProspectCampagne): string {
		return [p.npa, p.localite].filter(Boolean).join(' ') || '–';
	}

	// --- Téléchargement PDF de la liste (A4 paysage, pastilles Google Maps cliquables) ---
	// Réutilise les prospects déjà chargés par le panneau ; moteur en dynamic import (hors bundle).
	let pdfBusy = $state(false);

	async function downloadPdf() {
		const c = campagne;
		if (!c || pdfBusy || loading || prospects.length === 0) return;
		// Snapshot AVANT tout await : le composant est réutilisé sans remount, `prospects` peut être
		// remplacé pendant le chargement du chunk jsPDF (campagne changée) -> PDF mal étiqueté sinon.
		const rows = prospects;
		const grps = groupes;
		pdfBusy = true;
		try {
			const { exportListeProspectsPdf } = await import('$lib/campagnes-pdf/pdf-liste-prospects');
			// Garde cross-campagne (même pattern que removeFromCampagne) : si l'opérateur a ouvert une
			// AUTRE campagne pendant l'import du chunk, ne pas télécharger un PDF périmé.
			if (campagne?.id !== c.id) return;
			await exportListeProspectsPdf(c.nom, rows, grps);
		} catch {
			toasts.error('Génération du PDF impossible');
		} finally {
			pdfBusy = false;
		}
	}
</script>

<SlideOut bind:open title={campagne?.nom ?? ''} width="600px">
	{#if campagne}
		<div class="flex flex-col gap-4 h-full">
			<!-- Retour explicite : ferme le panneau et rend la liste des campagnes (la croix seule
			     ne suffit pas comme affordance de navigation, demande Pascal 2026-07-02). -->
			<button type="button" class="back-campagnes" onclick={() => (open = false)}>
				<Icon name="arrow_back" size={15} /> Retour à la liste des campagnes
			</button>

			<!-- Rappel de contexte : couleur + statut + compteur + export PDF -->
			<div class="flex items-center gap-2.5 flex-wrap">
				<span class="camp-chip {campClass(campagne.couleur)}">
					{campagne.archived ? 'Archivée' : campagneStatutLabel(campagne.statut)}
				</span>
				<span class="text-sm text-text-muted">
					{shownCount} prospect{shownCount > 1 ? 's' : ''} étiqueté{shownCount > 1 ? 's' : ''}
				</span>
				{#if !loading && !loadError && prospects.length > 0}
					<button
						type="button"
						class="pdf-btn"
						disabled={pdfBusy}
						onclick={downloadPdf}
						title="Télécharger la liste complète en PDF (A4 paysage, liens Google Maps cliquables) - le filtre de recherche n'est pas appliqué"
					>
						<Icon name="download" size={14} /> {pdfBusy ? 'Génération…' : 'Télécharger (PDF)'}
					</button>
				{/if}
			</div>

			{#if loading}
				<!-- Squelettes calqués sur la forme des lignes (jamais de spinner générique) -->
				<div class="flex flex-col gap-2" aria-hidden="true">
					{#each Array(5) as _unused, i (i)}
						<div class="skeleton-row">
							<div class="sk sk-name" style="width: {62 - (i % 3) * 9}%"></div>
							<div class="sk sk-sub" style="width: {38 - (i % 2) * 7}%"></div>
						</div>
					{/each}
				</div>
			{:else if loadError}
				<div class="panel-empty" role="alert">
					<span class="panel-empty-ic"><Icon name="error" size={22} /></span>
					<p class="panel-empty-t">Chargement impossible</p>
					<p class="panel-empty-p">Les prospects de la campagne n'ont pas pu être chargés.</p>
					<button type="button" class="ws-btn ws-btn-secondary" onclick={() => campagne && load(campagne.id)}>
						<Icon name="retry" size={15} /> Réessayer
					</button>
				</div>
			{:else if prospects.length === 0}
				<div class="panel-empty">
					<span class="panel-empty-ic"><Icon name="group" size={22} /></span>
					<p class="panel-empty-t">Aucun prospect étiqueté</p>
					<p class="panel-empty-p">
						Cette campagne n'a pas encore de prospects.
						{#if !campagne.archived}Lancez une recherche pour en trouver : le lot importé sera étiqueté automatiquement.{/if}
					</p>
					{#if !campagne.archived && onTrouver}
						<button type="button" class="ws-btn ws-btn-primary" onclick={trouver}>
							<Icon name="radar" size={15} /> Trouver des prospects
						</button>
					{/if}
				</div>
			{:else}
				<div class="panel-search">
					<Icon name="search" size={16} />
					<input
						type="search"
						bind:value={search}
						placeholder="Filtrer par nom ou localité…"
						aria-label="Filtrer les prospects de la campagne"
					/>
				</div>

				<!-- Groupes : pastilles-filtres avec compteurs + création -->
				<div class="grp-row" role="group" aria-label="Groupes de prospects de la campagne">
					{#if groupes.length > 0}
						<button type="button" class="grp-chip" class:on={groupeFilter === null} onclick={() => (groupeFilter = null)}>
							Tous <span class="grp-n">{prospects.length}</span>
						</button>
						{#each sortedGroupes as g (g.id)}
							<button
								type="button"
								class="grp-chip"
								class:on={groupeFilter === g.id}
								aria-pressed={groupeFilter === g.id}
								onclick={() => toggleChip(g.id)}
							>
								{g.nom} <span class="grp-n">{counts.byId.get(g.id) ?? 0}</span>
							</button>
						{/each}
						{#if counts.none > 0}
							<button
								type="button"
								class="grp-chip grp-chip-none"
								class:on={groupeFilter === 'none'}
								aria-pressed={groupeFilter === 'none'}
								onclick={() => toggleChip('none')}
							>
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
							<button type="button" class="grp-tool grp-tool-danger" onclick={() => (confirmDeleteOpen = true)} aria-label={`Supprimer le groupe ${activeGroupe.nom}`} title="Supprimer ce groupe (les prospects restent dans la campagne)">
								<Icon name="delete" size={14} />
							</button>
						</span>
					{/if}
				</div>

				<!-- Mini-formulaire : création (pré-remplie par types détectés) ou renommage -->
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
					<p class="text-sm text-text-muted px-1 py-6 text-center">
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
					<ul class="prospect-list" aria-label={`Prospects de la campagne ${campagne.nom}`}>
						{#each filtered as p (p.id)}
							<li class="prospect-row" class:rowsel={sel.has(p.id)}>
								<label class="row-cbx-wrap">
									<input
										type="checkbox"
										class="row-cbx-input"
										checked={sel.has(p.id)}
										onchange={() => toggleSel(p.id)}
										aria-label={`Sélectionner ${p.raison_sociale}`}
									/>
									<span class="row-cbx" class:on={sel.has(p.id)} aria-hidden="true"><Icon name="check" size={11} strokeWidth={3} /></span>
								</label>
								<div class="min-w-0 flex-1">
									<div class="prospect-name" title={p.raison_sociale}>{p.raison_sociale}</div>
									<div class="prospect-sub">
										{adresseCourte(p)}<span class="sub-sep">·</span>{sourceLabel(p.source)}
										{#if p.groupe_id && groupeById.get(p.groupe_id)}
											<span class="sub-sep">·</span><span class="grp-tag">{groupeById.get(p.groupe_id)?.nom}</span>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-2 shrink-0">
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
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if campagne}
			{#if sel.size > 0}
				<!-- Mode sélection : le pied de panneau devient la barre d'assignation de groupe. -->
				<div class="flex items-center gap-3 flex-wrap" role="region" aria-label="Actions sur la sélection">
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
					{#if sortedGroupes.length === 0}
						<span class="bulk-hint">Créez d'abord un groupe (« + Groupe » ci-dessus).</span>
					{/if}
					<button type="button" class="ws-btn ws-btn-secondary" onclick={() => sel.clear()}>Annuler</button>
				</div>
			{:else}
				<div class="flex items-center justify-between gap-3 flex-wrap">
					{#if !campagne.archived && onTrouver}
						<button type="button" class="ws-btn ws-btn-secondary" onclick={trouver}>
							<Icon name="radar" size={15} /> Trouver des prospects
						</button>
					{:else}
						<span></span>
					{/if}
					<button type="button" class="ws-btn ws-btn-secondary" onclick={openInProspection} title="Ouvrir la Prospection filtrée sur cette campagne (tri, statuts, enrichissement)">
						Ouvrir dans la Prospection <Icon name="arrow_forward" size={15} />
					</button>
				</div>
			{/if}
		{/if}
	{/snippet}
</SlideOut>

<!-- Confirmation de suppression du groupe actif (les prospects restent dans la campagne). -->
<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Supprimer le groupe"
	message={`Supprimer le groupe « ${activeGroupe?.nom ?? ''} » ? Ses ${counts.byId.get(activeGroupe?.id ?? '') ?? 0} prospect(s) repassent « sans groupe » et restent dans la campagne.`}
	confirmLabel="Supprimer"
	loading={deleteBusy}
	onConfirm={deleteActiveGroupe}
/>

<style>
	/* Bouton retour : lien-bouton discret en tête de panneau, aligné à gauche. */
	.back-campagnes {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin: -6px 0 -4px -8px;
		padding: 6px 10px 6px 8px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 160ms ease, color 160ms ease;
	}
	.back-campagnes:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.back-campagnes:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	/* Bouton export PDF : discret, aligné à droite de la ligne de contexte. */
	.pdf-btn {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 11px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-primary-dark);
		cursor: pointer;
		box-shadow: var(--shadow-xs);
		white-space: nowrap;
		transition: background 160ms ease, border-color 160ms ease;
	}
	.pdf-btn:hover:not(:disabled) {
		background: var(--color-surface-alt);
		border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
	}
	.pdf-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.pdf-btn :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.pdf-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	/* Chip campagne (couleur .camp--cN d'app.css : fournit fond + texte). */
	.camp-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 11px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}

	.panel-search {
		position: relative;
	}
	.panel-search :global(svg) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.panel-search input {
		width: 100%;
		height: 38px;
		padding: 0 13px 0 37px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		font: 13.5px var(--font-sans, inherit);
		color: var(--color-text);
	}
	.panel-search input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}

	/* ===== Groupes : pastilles-filtres ===== */
	.grp-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: -6px;
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

	/* ===== Groupes : mini-formulaire ===== */
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

	/* ===== Liste ===== */
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

	.prospect-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.prospect-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 4px;
		border-bottom: 1px solid var(--color-hairline);
	}
	.prospect-row:last-child {
		border-bottom: none;
	}
	.prospect-row.rowsel {
		background: rgba(47, 90, 158, 0.045);
	}

	/* case à cocher de ligne (input réel masqué + visuel décoratif, pattern page Étiquettes) */
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

	.prospect-name {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.prospect-sub {
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

	/* ===== Pied de panneau : mode sélection ===== */
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
		flex: 1;
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
	.bulk-hint {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	/* Squelette de chargement (forme des lignes). */
	.skeleton-row {
		padding: 12px 4px;
		border-bottom: 1px solid var(--color-hairline);
	}
	.sk {
		height: 12px;
		border-radius: var(--radius-full);
		background: linear-gradient(90deg, var(--color-surface-alt) 25%, color-mix(in srgb, var(--color-surface-alt) 55%, white) 50%, var(--color-surface-alt) 75%);
		background-size: 200% 100%;
		animation: sk-shimmer 1.3s ease-in-out infinite;
	}
	.sk-sub {
		height: 9px;
		margin-top: 7px;
		opacity: 0.7;
	}
	@keyframes sk-shimmer {
		from { background-position: 200% 0; }
		to { background-position: -200% 0; }
	}

	/* États vide / erreur. */
	.panel-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
		padding: 44px 20px;
	}
	.panel-empty-ic {
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-xl);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		margin-bottom: 4px;
	}
	.panel-empty-t {
		margin: 0;
		font-size: 14.5px;
		font-weight: 700;
		color: var(--color-text);
	}
	.panel-empty-p {
		margin: 0 0 8px;
		font-size: 13px;
		color: var(--color-text-muted);
		max-width: 40ch;
	}
</style>
