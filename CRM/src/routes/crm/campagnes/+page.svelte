<script lang="ts">
	/**
	 * Écran dédié « Campagnes » (Vague 3.2, flag ffCrmListesV2). Le centre de gestion :
	 * créer / renommer / recolorer / archiver / supprimer. Cliquer une campagne (nom, compteur
	 * ou menu) ouvre sa page dédiée /crm/campagnes/[id] (Constituer -> Organiser -> Valider ->
	 * Diffuser) - un seul chemin, spec validation externe §2 (l'ex-panneau latéral est retiré).
	 * Suppression = confirmation rassurante (retire l'étiquette, ne supprime jamais les
	 * prospects). Mêmes tokens/primitives que les goldens Vague 2/3.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import KpiStrip, { type KpiItem } from '$lib/components/KpiStrip.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import EntrepriseSearchModal from '$lib/components/prospection/EntrepriseSearchModal.svelte';
	import StatutSegment from '$lib/components/campagnes/StatutSegment.svelte';
	import PageBand from '$lib/components/PageBand.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { SvelteSet } from 'svelte/reactivity';
	import { toasts } from '$lib/stores/toast';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { isBandeauActive } from '$lib/pageBandeau';
	import { CRM_BASE } from '$lib/config';
	import { filterEnabledSources } from '$lib/prospection-flags';
	import type { EntrepriseSource } from '$lib/components/prospection/source-meta';
	import {
		COULEUR_SLUGS,
		DEFAULT_COULEUR,
		CAMPAGNE_NOM_MAX,
		CAMPAGNE_DESC_MAX,
		swatchClass,
		campagneStatutLabel,
		type CouleurSlug,
		type CampagneStatut,
		type CampagneWithCount,
	} from '$lib/campagnes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'actives' | 'archived'>('actives');
	let search = $state('');
	let menuOpenId = $state<string | null>(null);

	// Lot 3 : sources entreprises actives (mêmes flags que la Prospection, dérivées client-side ;
	// config statique -> identique des deux côtés). Le quota Google est auto-récupéré par la modale
	// à l'ouverture de l'onglet Google (pas besoin de le charger côté serveur ici).
	const PREVIEW_SOURCES: EntrepriseSource[] = ['search_ch', 'google_places', 'zefix'];
	const entrepriseSources = $derived(
		filterEnabledSources(PREVIEW_SOURCES).filter((s): s is EntrepriseSource => PREVIEW_SOURCES.includes(s as EntrepriseSource)),
	);

	$effect(() => {
		$pageSubtitle = `${data.stats.actives} campagne${data.stats.actives > 1 ? 's' : ''} ouverte${data.stats.actives > 1 ? 's' : ''}`;
	});

	// Cohérence UI : bandeau de page in-page (flag ff_page_bandeau). Source unique isBandeauActive,
	// partagée avec le Header → jamais de titre double ni absent. OFF → rendu actuel strict (titre +
	// compteur dans le Header, refonte 16/07) ; ON → ils migrent dans le bandeau.
	const bandeau = $derived(isBandeauActive(data.featureFlags, $page.url.pathname));
	const bandeauCount = $derived(
		data.stats.actives === 0
			? 'Aucune campagne ouverte'
			: `${data.stats.actives} campagne${data.stats.actives > 1 ? 's' : ''} ouverte${data.stats.actives > 1 ? 's' : ''}`,
	);

	const visible = $derived(
		data.campagnes
			.filter((c) => (activeTab === 'actives' ? !c.archived : c.archived))
			.filter((c) => c.nom.toLowerCase().includes(search.trim().toLowerCase())),
	);

	// Lot 3 : campagnes ouvertes (non archivées) déjà lancées (statut = active), pour le KPI.
	const activeStatutCount = $derived(data.campagnes.filter((c) => !c.archived && c.statut === 'active').length);

	// Cibles d'étiquetage du modal de recherche = campagnes OUVERTES uniquement (jamais une
	// archivée : cohérent avec la Prospection qui charge le même modal en includeArchived:false).
	const openCampagnes = $derived(data.campagnes.filter((c) => !c.archived));

	const kpiItems = $derived<KpiItem[]>([
		{ icon: 'sell', value: data.stats.actives, label: 'Campagnes ouvertes', tone: 'primary' },
		{ icon: 'rocket_launch', value: activeStatutCount, label: 'Campagnes actives', tone: 'convert' },
		{ icon: 'group', value: data.stats.taggedLeads, label: 'Prospects étiquetés', tone: 'primary' },
		{ icon: 'do_not_disturb', value: data.stats.sansCampagne, label: 'Sans campagne', tone: 'primary' },
	]);

	function dateLong(iso: string | null): string {
		if (!iso) return '–';
		return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	// --- Page campagne dédiée : Constituer -> Organiser -> Valider -> Diffuser ---
	// Un seul chemin (spec validation externe §2) : nom, compteur et menu y mènent tous.
	function openCampagne(c: CampagneWithCount) {
		menuOpenId = null;
		goto(`${CRM_BASE}/campagnes/${c.id}`);
	}

	// --- Étiquettes d'adresses (publipostage) : page dédiée ---
	function goToEtiquettes(c: CampagneWithCount) {
		menuOpenId = null;
		goto(`${CRM_BASE}/campagnes/${c.id}/etiquettes`);
	}

	// --- Liste des prospects en PDF (A4 paysage, pastilles Google Maps cliquables) ---
	// Depuis le menu de la ligne : charge les prospects puis génère côté navigateur (dynamic
	// import, hors bundle). Parallélisme par id (cf. feedback_svelteset_parallel_by_id).
	const pdfBusyIds = new SvelteSet<string>();

	async function downloadListePdf(c: CampagneWithCount) {
		menuOpenId = null;
		if (pdfBusyIds.has(c.id)) return;
		if (c.lead_count === 0) {
			toasts.info('Cette campagne n’a aucun prospect étiqueté : rien à télécharger.');
			return;
		}
		pdfBusyIds.add(c.id);
		try {
			const resp = await fetch(`/api/campagnes/${c.id}/prospects`);
			const d = await resp.json().catch(() => null);
			if (!resp.ok || !d || !Array.isArray(d.prospects)) {
				toasts.error(d?.error || 'Chargement des prospects impossible');
				return;
			}
			if (d.prospects.length === 0) {
				toasts.info('Cette campagne n’a aucun prospect étiqueté : rien à télécharger.');
				return;
			}
			const { exportListeProspectsPdf } = await import('$lib/campagnes-pdf/pdf-liste-prospects');
			await exportListeProspectsPdf(c.nom, d.prospects);
		} catch {
			toasts.error('Génération du PDF impossible');
		} finally {
			pdfBusyIds.delete(c.id);
		}
	}

	// --- Création ---
	let createOpen = $state(false);
	let createNom = $state('');
	let createCouleur = $state<CouleurSlug>(DEFAULT_COULEUR);
	let createDesc = $state('');
	let createBusy = $state(false);

	function openCreate() {
		createNom = '';
		createCouleur = COULEUR_SLUGS[data.campagnes.length % COULEUR_SLUGS.length];
		createDesc = '';
		createOpen = true;
	}
	async function submitCreate() {
		const nom = createNom.trim();
		if (!nom || createBusy) return;
		createBusy = true;
		try {
			const resp = await fetch('/api/campagnes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nom, couleur: createCouleur, description: createDesc.trim() || null }),
			});
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				toasts.success(`Campagne « ${nom} » créée`);
				createOpen = false;
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Création impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			createBusy = false;
		}
	}

	// --- Renommage ---
	let renameTarget = $state<CampagneWithCount | null>(null);
	let renameNom = $state('');
	let renameBusy = $state(false);

	function openRename(c: CampagneWithCount) {
		menuOpenId = null;
		renameTarget = c;
		renameNom = c.nom;
	}
	async function submitRename() {
		const c = renameTarget;
		const nom = renameNom.trim();
		if (!c || !nom || renameBusy) return;
		renameBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nom }),
			});
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				toasts.success('Campagne renommée');
				renameTarget = null;
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Renommage impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			renameBusy = false;
		}
	}

	// --- Archivage / réactivation ---
	async function toggleArchive(c: CampagneWithCount) {
		menuOpenId = null;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ archived: !c.archived }),
			});
			if (resp.ok) {
				toasts.success(c.archived ? 'Campagne réactivée' : 'Campagne archivée');
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Action impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		}
	}

	// --- Statut (cycle de vie En cours / Active) - édition inline + menu ---
	// Set d'ids en cours de mise à jour : parallélisme par id, garde anti double-clic
	// (cf. feedback_svelteset_parallel_by_id). L'update est optimiste côté serveur via PATCH.
	const statutBusy = new SvelteSet<string>();

	async function setStatut(c: CampagneWithCount, statut: CampagneStatut) {
		menuOpenId = null;
		if (c.statut === statut || statutBusy.has(c.id)) return;
		statutBusy.add(c.id);
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ statut }),
			});
			if (resp.ok) {
				toasts.success(statut === 'active' ? `« ${c.nom} » lancée` : `« ${c.nom} » repassée en préparation`);
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Changement de statut impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			statutBusy.delete(c.id);
		}
	}

	// --- Recherche de prospects embarquée par campagne (Lot 3) ---
	// Ouvre EntrepriseSearchModal avec la campagne pré-cochée : le lot importé sera étiqueté
	// à cette campagne. La modale appelle invalidateAll après import (compteurs à jour).
	let searchOpen = $state(false);
	let searchPresetIds = $state<string[]>([]);
	let searchImportResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	function openSearch(c: CampagneWithCount) {
		menuOpenId = null;
		searchPresetIds = [c.id];
		searchImportResult = null;
		searchOpen = true;
	}

	// Retour d'import (message serveur) : succès -> toast ; ÉCHEC (dont étiquetage campagne
	// échoué) -> bannière PERSISTANTE avec bouton Fermer (même traitement que la Prospection) -
	// une consigne de récupération de ~200 caractères ne doit pas s'effacer en 6 secondes.
	let importAlert = $state<string | null>(null);
	$effect(() => {
		if (!searchImportResult) return;
		const { message, type } = searchImportResult;
		if (type === 'success') toasts.success(message);
		else importAlert = message;
		searchImportResult = null;
	});

	// --- Suppression ---
	let deleteTarget = $state<CampagneWithCount | null>(null);
	let deleteBusy = $state(false);

	function openDelete(c: CampagneWithCount) {
		menuOpenId = null;
		deleteTarget = c;
	}
	async function confirmDelete() {
		const c = deleteTarget;
		if (!c || deleteBusy) return;
		deleteBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, { method: 'DELETE' });
			if (resp.ok) {
				toasts.success('Campagne supprimée');
				deleteTarget = null;
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Suppression impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			deleteBusy = false;
		}
	}

	const deleteMessage = $derived(
		deleteTarget
			? `L'étiquette sera retirée de ${deleteTarget.lead_count} prospect${deleteTarget.lead_count > 1 ? 's' : ''}. Les prospects eux-mêmes ne sont pas supprimés : ils restent dans Prospection, simplement sans cette campagne.`
			: '',
	);

	$effect(() => {
		if (menuOpenId === null) return;
		const onClick = () => (menuOpenId = null);
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});
</script>

<div class="ws-bound">
	{#if bandeau}
		<PageBand
			icon="sell"
			eyebrow="Les actions"
			title="Campagnes"
			desc="Regrouper les prospects par action commerciale."
			descMobile="Grouper par action commerciale."
			count={bandeauCount}
		>
			{#snippet actions()}
				<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
					<Icon name="add" size={17} /> Nouvelle campagne
				</button>
			{/snippet}
		</PageBand>
	{:else}
		<header class="head">
			<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
				<Icon name="add" size={17} /> Nouvelle campagne
			</button>
		</header>
	{/if}

	<KpiStrip items={kpiItems} ariaLabel="Indicateurs campagnes" />

	{#if importAlert}
		<div class="import-alert" role="alert">
			<Icon name="warning" size={17} />
			<p>{importAlert}</p>
			<button type="button" class="ia-close" aria-label="Fermer l'alerte" onclick={() => (importAlert = null)}>
				<Icon name="close" size={15} />
			</button>
		</div>
	{/if}

	<div class="toolbar">
		<div class="segtabs" role="tablist" aria-label="Filtrer les campagnes">
			<button type="button" id="camptab-actives" class="segtab" class:active={activeTab === 'actives'} role="tab" aria-selected={activeTab === 'actives'} aria-controls="campagnes-panel" onclick={() => (activeTab = 'actives')}>
				Ouvertes <span class="ct">{data.stats.actives}</span>
			</button>
			<button type="button" id="camptab-archived" class="segtab" class:active={activeTab === 'archived'} role="tab" aria-selected={activeTab === 'archived'} aria-controls="campagnes-panel" onclick={() => (activeTab = 'archived')}>
				Archivées <span class="ct">{data.stats.archived}</span>
			</button>
		</div>
		<div class="search">
			<Icon name="search" size={17} />
			<input type="search" bind:value={search} placeholder="Rechercher une campagne…" aria-label="Rechercher une campagne" />
		</div>
	</div>

	<div id="campagnes-panel" role="tabpanel" aria-labelledby={`camptab-${activeTab}`}>
	{#if visible.length === 0}
		<div class="empty">
			<span class="empty-ic"><Icon name={search.trim() ? 'search_off' : 'sell'} size={26} /></span>
			{#if search.trim()}
				<h3>Aucune campagne ne correspond</h3>
				<p>Aucune campagne {activeTab === 'actives' ? 'active' : 'archivée'} ne contient « {search.trim()} ».</p>
			{:else if activeTab === 'actives'}
				<h3>Aucune campagne active</h3>
				<p>Créez votre première campagne pour regrouper des prospects (salon, secteur, région…).</p>
				<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}><Icon name="add" size={16} /> Nouvelle campagne</button>
			{:else}
				<h3>Aucune campagne archivée</h3>
				<p>Les campagnes que vous archivez apparaîtront ici. L'archivage est réversible.</p>
			{/if}
		</div>
	{:else}
		<div class="listcard">
			<div class="lc-head">
				<span></span>
				<span>Campagne</span>
				<span class="hide-sm">Statut</span>
				<span class="hide-sm">Prospects</span>
				<span class="hide-md"></span>
				<span></span>
			</div>
			{#each visible as c (c.id)}
				<div class="lc-row">
					<span class="camp-swatch {swatchClass(c.couleur)}"></span>
					<div class="lc-id">
						<button type="button" class="lc-name" onclick={() => openCampagne(c)} title={`Ouvrir la campagne « ${c.nom} »`}>{c.nom}</button>
						{#if c.description}<div class="lc-desc">{c.description}</div>{/if}
						<div class="lc-meta">Créée le {dateLong(c.date_creation)}</div>
					</div>

					<!-- Statut (cycle de vie) : contrôle inline pour les ouvertes, chip figé pour les archivées. -->
					{#if c.archived}
						<span class="cstatus muted hide-sm"><span class="dot"></span>Archivée</span>
					{:else}
						{@const cStatut = c.statut}
						<div class="hide-sm">
							<StatutSegment
								statut={cStatut}
								busy={statutBusy.has(c.id)}
								onChange={(s) => setStatut(c, s)}
								ariaLabel={`Statut de ${c.nom}`}
							/>
						</div>
					{/if}

					<button type="button" class="leadcount hide-sm" class:zero={c.lead_count === 0} onclick={() => openCampagne(c)} title="Ouvrir la campagne (prospects, validation, diffusion)">
						<Icon name="group" size={13} />
						{c.lead_count} prospect{c.lead_count > 1 ? 's' : ''}
					</button>

					<!-- Action clé Lot 3 : trouver des prospects pour cette campagne (ouvertes uniquement). -->
					{#if c.archived}
						<span class="hide-md"></span>
					{:else}
						<button type="button" class="trouver hide-md" onclick={() => openSearch(c)}>
							<Icon name="radar" size={15} /> Trouver des prospects
						</button>
					{/if}

					<div class="act-menu">
						<button
							type="button"
							class="kebab"
							aria-label={`Actions pour ${c.nom}`}
							aria-haspopup="menu"
							aria-expanded={menuOpenId === c.id}
							onclick={(e) => { e.stopPropagation(); menuOpenId = menuOpenId === c.id ? null : c.id; }}
						>
							<Icon name="more_vert" size={18} />
						</button>
						{#if menuOpenId === c.id}
							<div class="menu" role="menu">
								{#if !c.archived}
									<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); openSearch(c); }}>
										<Icon name="radar" size={15} /> Trouver des prospects
									</button>
									{#if c.statut === 'en_cours'}
										<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); setStatut(c, 'active'); }}>
											<Icon name="rocket_launch" size={15} /> Lancer la campagne
										</button>
									{:else}
										<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); setStatut(c, 'en_cours'); }}>
											<Icon name="tune" size={15} /> Repasser en préparation
										</button>
									{/if}
									<div class="menu-sep"></div>
								{/if}
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); openRename(c); }}>
									<Icon name="edit" size={15} /> Renommer
								</button>
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); openCampagne(c); }}>
									<Icon name="arrow_forward" size={15} /> Ouvrir la campagne
								</button>
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); goToEtiquettes(c); }}>
									<Icon name="mail" size={15} /> Étiquettes d'adresses
								</button>
								<button type="button" class="menu-item" role="menuitem" disabled={pdfBusyIds.has(c.id)} onclick={(e) => { e.stopPropagation(); downloadListePdf(c); }}>
									<Icon name="download" size={15} /> {pdfBusyIds.has(c.id) ? 'Génération du PDF…' : 'Liste des prospects (PDF)'}
								</button>
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); toggleArchive(c); }}>
									<Icon name={c.archived ? 'unarchive' : 'archive'} size={15} /> {c.archived ? 'Réactiver' : 'Archiver'}
								</button>
								<div class="menu-sep"></div>
								<button type="button" class="menu-item danger" role="menuitem" onclick={(e) => { e.stopPropagation(); openDelete(c); }}>
									<Icon name="delete" size={15} /> Supprimer
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
			<div class="lc-foot">
				{visible.length} campagne{visible.length > 1 ? 's' : ''} {activeTab === 'actives' ? 'ouverte' : 'archivée'}{visible.length > 1 ? 's' : ''}
			</div>
		</div>
	{/if}
	</div>
</div>

<!-- Création -->
<ModalForm bind:open={createOpen} title="Nouvelle campagne" icon="sell" saving={createBusy} onSave={submitCreate} maxWidth="max-w-md">
	<div class="field">
		<label for="camp-create-nom">Nom</label>
		<input id="camp-create-nom" class="txt" type="text" bind:value={createNom} maxlength={CAMPAGNE_NOM_MAX} placeholder="Ex : Salon Habitat 2026" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate(); } }} />
	</div>
	<div class="field">
		<span class="lbl">Couleur</span>
		<div class="swatches">
			{#each COULEUR_SLUGS as slug}
				<button type="button" class="swatch {swatchClass(slug)}" class:sel={createCouleur === slug} aria-label={`Couleur ${slug}`} aria-pressed={createCouleur === slug} onclick={() => (createCouleur = slug)}></button>
			{/each}
		</div>
	</div>
	<div class="field">
		<label for="camp-create-desc">Description <span class="opt">- optionnel</span></label>
		<input id="camp-create-desc" class="txt" type="text" bind:value={createDesc} maxlength={CAMPAGNE_DESC_MAX} placeholder="Note interne (cible, période, source…)" />
	</div>
</ModalForm>

<!-- Renommage -->
<ModalForm open={renameTarget !== null} title="Renommer la campagne" icon="edit" saving={renameBusy} onSave={submitRename} onClose={() => (renameTarget = null)} maxWidth="max-w-md">
	<div class="field">
		<label for="camp-rename-nom">Nom</label>
		<input id="camp-rename-nom" class="txt" type="text" bind:value={renameNom} maxlength={CAMPAGNE_NOM_MAX} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRename(); } }} />
	</div>
</ModalForm>

<!-- Suppression (confirmation rassurante) -->
<ConfirmModal
	open={deleteTarget !== null}
	title={deleteTarget ? `Supprimer la campagne « ${deleteTarget.nom} » ?` : ''}
	message={deleteMessage}
	confirmLabel="Supprimer la campagne"
	variant="danger"
	loading={deleteBusy}
	onConfirm={confirmDelete}
	onClose={() => (deleteTarget = null)}
/>

<!-- Lot 3 : recherche de prospects embarquée par campagne. La campagne est pré-cochée
     (presetCampagneIds) : le lot importé est étiqueté à cette campagne + apparaît en Prospection.
     La modale appelle invalidateAll après import -> compteurs de la liste à jour. -->
<EntrepriseSearchModal
	bind:open={searchOpen}
	bind:importResult={searchImportResult}
	allowedSources={entrepriseSources}
	premium={true}
	campagnes={openCampagnes}
	presetCampagneIds={searchPresetIds}
/>

<style>
	.ws-bound {
		/* Pleine largeur (retour Pascal 16/07) : mêmes gouttières 32px que les autres pages CRM
		   (portées par .head/.toolbar/.listcard) ; plus de bridage 1160 qui « resserrait » la page. */
		padding: 8px 0 64px;
	}
	/* Barre d'action de la page : bouton primaire seul, aligné à droite au-dessus du KPI strip
	   (convention refonte, cf. .ws-page-actions des pages Entreprises/Contacts). Le titre + le
	   compteur vivent dans le bandeau du haut (Header + $pageSubtitle) : plus de doublon interne. */
	.head {
		display: flex;
		justify-content: flex-end;
		padding: 4px 32px 18px;
	}
	/* Bannière persistante d'échec d'import/étiquetage (jamais un toast auto-fermé). */
	.import-alert {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin: 0 32px 14px;
		padding: 12px 14px;
		background: var(--color-danger-light);
		border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
		border-radius: var(--radius-lg);
		color: var(--color-danger-deep);
	}
	.import-alert :global(svg) {
		flex-shrink: 0;
		margin-top: 1px;
	}
	.import-alert p {
		margin: 0;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.45;
	}
	.ia-close {
		margin-left: auto;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		color: inherit;
		cursor: pointer;
		flex-shrink: 0;
	}
	.ia-close:hover {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
	}
	.ia-close:focus-visible {
		outline: 2px solid var(--color-danger);
		outline-offset: 1px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 6px 32px 18px;
	}
	.segtabs {
		display: inline-flex;
		gap: 2px;
		padding: 4px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
	}
	.segtab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: var(--radius-lg);
		font: 600 13px var(--font-sans, inherit);
		color: var(--color-text-muted);
		transition: background 200ms ease, color 200ms ease;
	}
	.segtab:hover {
		color: var(--color-text);
	}
	.segtab.active {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}
	.segtab .ct {
		font-size: 11.5px;
		padding: 1px 7px;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
		color: var(--color-text-muted);
		font-weight: 700;
	}
	.segtab.active .ct {
		background: color-mix(in srgb, white 22%, transparent);
		color: var(--color-text-inverse);
	}
	.search {
		position: relative;
		margin-left: auto;
		width: 280px;
		max-width: 100%;
	}
	.search :global(svg) {
		position: absolute;
		left: 13px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.search input {
		width: 100%;
		height: 40px;
		padding: 0 14px 0 40px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		font: 14px var(--font-sans, inherit);
		color: var(--color-text);
		box-shadow: var(--shadow-xs);
	}
	.search input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}

	.listcard {
		margin: 0 32px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: visible;
	}
	.lc-head,
	.lc-row {
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr) 176px 140px 196px 40px;
		align-items: center;
		gap: 16px;
		padding: 0 18px;
	}
	.lc-head {
		height: 42px;
		border-bottom: 1px solid var(--color-border);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.lc-row {
		min-height: 64px;
		padding-top: 11px;
		padding-bottom: 11px;
		border-bottom: 1px solid var(--color-hairline);
	}
	.lc-row:last-of-type {
		border-bottom: none;
	}
	.lc-id {
		min-width: 0;
	}
	/* Nom = bouton texte : ouvre la page campagne dédiée (affordance principale de la ligne). */
	.lc-name {
		display: block;
		max-width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		font: 600 14.5px var(--font-sans, inherit);
		color: var(--color-text);
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 160ms ease;
	}
	.lc-name:hover {
		color: var(--color-primary);
	}
	.lc-name:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
	.lc-desc {
		font-size: 12.5px;
		color: var(--color-text-muted);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lc-meta {
		font-size: 11.5px;
		color: var(--color-text-muted);
		margin-top: 3px;
	}

	/* Statut segmenté : composant partagé StatutSegment.svelte (source unique liste + page campagne). */

	/* Action clé Lot 3 : « Trouver des prospects » (bouton secondaire discret). */
	.trouver {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		justify-self: start;
		padding: 7px 13px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-primary-dark);
		border-radius: var(--radius-lg);
		font: 600 12.5px var(--font-sans, inherit);
		cursor: pointer;
		box-shadow: var(--shadow-xs);
		white-space: nowrap;
		transition: background 180ms ease, border-color 180ms ease, transform 120ms ease;
	}
	.trouver:hover {
		background: var(--color-surface-alt);
		border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
	}
	.trouver:active {
		transform: translateY(1px);
	}
	.trouver :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.trouver:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	button.leadcount {
		border: none;
		cursor: pointer;
		justify-self: start;
		transition: color 160ms ease, box-shadow 160ms ease;
	}
	button.leadcount:hover {
		color: var(--color-primary);
		box-shadow: inset 0 0 0 1px rgba(47, 90, 158, 0.30);
	}
	.cstatus {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--radius-lg);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.cstatus .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.cstatus.muted {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
	.cstatus.muted .dot {
		background: var(--color-text-muted);
	}

	.act-menu {
		position: relative;
		justify-self: end;
	}
	.kebab {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		box-shadow: var(--shadow-xs);
	}
	.kebab:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 20;
		min-width: 200px;
		padding: 6px;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-menu);
		border: 1px solid var(--color-border);
	}
	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 11px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		font: 600 13px var(--font-sans, inherit);
		color: var(--color-text-body);
		cursor: pointer;
		text-align: left;
	}
	.menu-item:hover {
		background: var(--color-surface-alt);
	}
	.menu-item:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.menu-item :global(svg) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.menu-item.danger {
		color: var(--color-danger-deep);
	}
	.menu-item.danger :global(svg) {
		color: var(--color-danger);
	}
	.menu-sep {
		height: 1px;
		background: var(--color-border);
		margin: 5px 4px;
	}
	.lc-foot {
		padding: 13px 20px;
		border-top: 1px solid var(--color-border);
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.empty {
		margin: 8px 32px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		padding: 56px 24px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
	}
	.empty-ic {
		width: 56px;
		height: 56px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-2xl);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		margin-bottom: 6px;
	}
	.empty h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text);
	}
	.empty p {
		margin: 0 0 6px;
		font-size: 13.5px;
		color: var(--color-text-muted);
		max-width: 44ch;
	}

	/* Champs des modales create/rename. */
	.field {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.field label,
	.field .lbl {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-text-body);
	}
	.field .opt {
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.field .txt {
		height: 42px;
		padding: 0 13px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
		font: 14px var(--font-sans, inherit);
		color: var(--color-text);
		background: var(--color-surface);
	}
	.field .txt:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.swatches {
		display: flex;
		gap: 9px;
		flex-wrap: wrap;
	}
	.swatch {
		position: relative;
		width: 30px;
		height: 30px;
		border: none;
		padding: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent);
	}
	.swatch.sel {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent), 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary);
	}
	.swatch.sel::after {
		content: '';
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/14px no-repeat;
	}

	@media (max-width: 720px) {
		.head,
		.toolbar {
			padding-left: 16px;
			padding-right: 16px;
		}
		.listcard,
		.empty,
		.import-alert {
			margin-left: 16px;
			margin-right: 16px;
		}
		.lc-head,
		.lc-row {
			grid-template-columns: 26px minmax(0, 1fr) 40px;
		}
		.hide-sm,
		.hide-md {
			display: none;
		}
	}
	@media (max-width: 1000px) and (min-width: 721px) {
		.hide-md {
			display: none;
		}
		.lc-head,
		.lc-row {
			grid-template-columns: 26px minmax(0, 1fr) 176px 140px 40px;
		}
	}
</style>
