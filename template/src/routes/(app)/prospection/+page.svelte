<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { toasts } from '$lib/stores/toast';
	import DataTable from '$lib/components/DataTable.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import Badge from '$lib/components/Badge.svelte';
	import ImportModal from '$lib/components/prospection/ImportModal.svelte';
	import LeadSlideOut from '$lib/components/prospection/LeadSlideOut.svelte';
	import LeadExpress from '$lib/components/prospection/LeadExpress.svelte';
	import EnrichBatchModal from '$lib/components/prospection/EnrichBatchModal.svelte';
	import AlerteModal from '$lib/components/prospection/AlerteModal.svelte';
	import BatchActionsBar from '$lib/components/prospection/BatchActionsBar.svelte';
	import RecherchesPanel from '$lib/components/prospection/RecherchesPanel.svelte';
	import MultiSelectDropdown from '$lib/components/MultiSelectDropdown.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import ProspectionTabs from '$lib/components/prospection/ProspectionTabs.svelte';
	import {
		cantonNoms,
		statutLabel, statutBadgeVariant, sourceLabel, relativeDate,
		sourceOptions, cantonOptions, temperatureOptions, statutOptions,
		type ProspectionTabKey,
	} from '$lib/prospection-utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Lead = (typeof data.leads)[number];

	$effect(() => { $pageSubtitle = `${data.totalLeads} prospect${data.totalLeads > 1 ? 's' : ''}`; });

	let slideOutOpen = $state(false);
	let selectedLead = $state<Lead | null>(null);
	let importModalOpen = $state(false);
	let importResult = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let selectedIds = $state<Set<string>>(new Set());
	let selectAllLoading = $state(false);
	let selectAllNotice = $state<{ message: string; type: 'info' | 'error' } | null>(null);
	let enrichBatchOpen = $state(false);
	let enrichBatchIds = $state<string[]>([]);
	let alerteModalOpen = $state(false);
	let recherchesOpen = $state(false);
	let mobileFiltersOpen = $state(false);
	let mobileMenuOpen = $state(false);
	let mobileMenuRef = $state<HTMLDivElement | null>(null);
	let leadExpressOpen = $state(false);

	const showSelectAllBanner = $derived(
		selectedIds.size > 0
		&& selectedIds.size === data.leads.length
		&& data.leads.length > 0
		&& data.totalLeads > data.leads.length
		&& selectedIds.size < data.totalLeads
	);

	// Reset notice quand la sélection retombe à zéro
	$effect(() => {
		if (selectedIds.size === 0 && selectAllNotice) selectAllNotice = null;
	});

	async function selectAllMatching() {
		selectAllLoading = true;
		try {
			const res = await fetch(`/api/prospection/all-ids${$page.url.search}`);
			if (!res.ok) {
				selectAllNotice = { message: 'Impossible de récupérer la sélection complète.', type: 'error' };
				return;
			}
			const payload = await res.json() as { ids: string[]; total: number; capped: boolean };
			selectedIds = new Set(payload.ids);
			if (payload.capped) {
				selectAllNotice = {
					message: `Sélection limitée à ${payload.ids.length} prospects (cap technique). Affinez les filtres pour traiter le reste.`,
					type: 'info',
				};
			} else {
				selectAllNotice = null;
			}
		} catch {
			selectAllNotice = { message: 'Erreur réseau. Réessayez.', type: 'error' };
		} finally {
			selectAllLoading = false;
		}
	}

	function closeMobileMenuOnOutside(event: MouseEvent) {
		if (mobileMenuRef && !mobileMenuRef.contains(event.target as Node)) {
			mobileMenuOpen = false;
		}
	}

	$effect(() => {
		if (mobileMenuOpen) {
			document.addEventListener('click', closeMobileMenuOnOutside);
			return () => document.removeEventListener('click', closeMobileMenuOnOutside);
		}
	});

	// Filtres synchronisés avec les URL params du serveur
	let filterSources = $state<string[]>(data.filters.sources);
	let filterCantons = $state<string[]>(data.filters.cantons);
	let filterStatuts = $state<string[]>(data.filters.statuts);
	let filterTemperatures = $state<string[]>(data.filters.temperatures);
	// Phase 0 : toggle "afficher les transférés" persistant via URL ?showTransferred=1
	let showTransferred = $state<boolean>(data.showTransferred);

	const activeFilterCount = $derived(
		(filterStatuts.length > 0 ? 1 : 0) +
		(filterTemperatures.length > 0 ? 1 : 0) +
		(filterCantons.length > 0 ? 1 : 0) +
		(filterSources.length > 0 ? 1 : 0)
	);

	function buildUrl(overrides: Record<string, string | string[] | number | boolean | undefined> = {}) {
		const params = new URLSearchParams();
		const sources = overrides.source !== undefined ? overrides.source as string[] : filterSources;
		const cantons = overrides.canton !== undefined ? overrides.canton as string[] : filterCantons;
		const statuts = overrides.statut !== undefined ? overrides.statut as string[] : filterStatuts;
		const temps = overrides.temp !== undefined ? overrides.temp as string[] : filterTemperatures;
		const showTr = overrides.showTransferred !== undefined ? overrides.showTransferred as boolean : showTransferred;
		const pg = overrides.page !== undefined ? overrides.page as number : data.page;
		const sort = (overrides.sort as string) ?? data.sort;
		const dir = overrides.dir !== undefined ? overrides.dir as string : (data.sortAsc ? 'asc' : 'desc');
		const q = overrides.q !== undefined ? overrides.q as string : data.search;
		const tab = (overrides.tab as string) ?? data.tab;
		const perPage = overrides.perPage !== undefined ? Number(overrides.perPage) : data.pageSize;

		if (tab && tab !== 'simap') params.set('tab', tab);
		if (pg > 0) params.set('page', String(pg));
		if (sort !== 'score_pertinence') params.set('sort', sort);
		if (dir === 'asc') params.set('dir', 'asc');
		if (q) params.set('q', q);
		if (perPage !== 25) params.set('perPage', String(perPage));
		sources.forEach(s => params.append('source', s));
		cantons.forEach(c => params.append('canton', c));
		statuts.forEach(s => params.append('statut', s));
		temps.forEach(t => params.append('temp', t));
		if (showTr) params.set('showTransferred', '1');

		const qs = params.toString();
		return qs ? `?${qs}` : $page.url.pathname;
	}

	function applyFilters() {
		// V1.5 audit S160 : reset sélection sur changement de filtres.
		// Les ids précédemment sélectionnés peuvent disparaître du jeu de résultats →
		// risque actions batch sur leads invisibles.
		selectedIds = new Set();
		selectAllNotice = null;
		goto(buildUrl({ page: 0 }), { keepFocus: true, noScroll: true });
	}

	// Réagir aux changements de filtres (skip le premier run au mount)
	let filterDebounce: ReturnType<typeof setTimeout> | null = null;
	let filterMounted = false;
	$effect(() => {
		// Tracker les valeurs
		filterSources; filterCantons; filterStatuts; filterTemperatures; showTransferred;
		if (!filterMounted) { filterMounted = true; return; }
		if (filterDebounce) clearTimeout(filterDebounce);
		filterDebounce = setTimeout(() => applyFilters(), 200);
	});

	// Phase 2 2026-05-01 : columns par onglet (colonne signature distincte par nature de signal).
	const PRIORITY_TOOLTIP = 'Score 0-12 calculé automatiquement à partir du canton, du secteur, de la source, de la récence et du montant. ≥ 7 = prioritaire · 4-6 = à qualifier · ≤ 3 = faible signal.';

	const baseColumns = [
		{ key: 'score_pertinence', label: 'Priorité', shortLabel: 'Prio.', sortable: true, infoTooltip: PRIORITY_TOOLTIP, defaultWidth: 130, minWidth: 110 },
		{ key: 'raison_sociale', label: 'Entreprise', sortable: true, defaultWidth: 240, minWidth: 160 },
	];

	const columnsByTab: Record<ProspectionTabKey, Array<{ key: string; label: string; shortLabel?: string; sortable: boolean; class?: string; infoTooltip?: string; defaultWidth?: number; minWidth?: number }>> = {
		simap: [
			...baseColumns,
			{ key: 'montant', label: 'Montant estimé', sortable: true, defaultWidth: 140, minWidth: 110 },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70, class: 'hidden md:table-cell' },
			{ key: 'date_publication', label: 'Publié le', sortable: true, defaultWidth: 110, minWidth: 100, class: 'hidden lg:table-cell' },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
			{ key: 'date_import', label: 'Ajouté', sortable: true, defaultWidth: 100, minWidth: 90, class: 'hidden lg:table-cell' },
		],
		regbl: [
			...baseColumns,
			{ key: 'description', label: 'Type de travaux', sortable: false, defaultWidth: 220, minWidth: 160 },
			{ key: 'localite', label: 'Adresse', sortable: true, defaultWidth: 200, minWidth: 140, class: 'hidden md:table-cell' },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70 },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
			{ key: 'date_import', label: 'Ajouté', sortable: true, defaultWidth: 100, minWidth: 90, class: 'hidden lg:table-cell' },
		],
		entreprises: [
			...baseColumns,
			{ key: 'localite', label: 'Localité', sortable: true, defaultWidth: 160, minWidth: 120, class: 'hidden md:table-cell' },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70 },
			{ key: 'source', label: 'Source', sortable: true, defaultWidth: 140, minWidth: 110, class: 'hidden lg:table-cell' },
			{ key: 'date_publication', label: 'Inscription', sortable: true, defaultWidth: 110, minWidth: 100, class: 'hidden lg:table-cell' },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
		],
		terrain: [
			...baseColumns,
			{ key: 'description', label: 'Note terrain', sortable: false, defaultWidth: 240, minWidth: 160 },
			{ key: 'telephone', label: 'Téléphone', sortable: false, defaultWidth: 140, minWidth: 110, class: 'hidden md:table-cell' },
			{ key: 'canton', label: 'Canton', sortable: true, defaultWidth: 80, minWidth: 70 },
			{ key: 'statut', label: 'Statut', sortable: true, defaultWidth: 120, minWidth: 100 },
			{ key: 'date_import', label: 'Ajouté', sortable: true, defaultWidth: 100, minWidth: 90, class: 'hidden lg:table-cell' },
		],
	};

	const columns = $derived(columnsByTab[data.tab as ProspectionTabKey] ?? columnsByTab.simap);

	// Configuration des onglets (icônes Lucide via icon-map, tooltips pédagogiques)
	const tabsConfig = $derived([
		{
			key: 'simap' as ProspectionTabKey,
			label: 'Marchés publics',
			tagline: "Appels d'offres en cours",
			icon: 'landmark',
			count: data.tabCounts.simap,
			tooltip: "Appels d'offres SIMAP publiés par les collectivités publiques (cantons, communes, hôpitaux). Signal d'achat explicite avec montant estimé et date de clôture.",
			colorVar: 'simap',
		},
		{
			key: 'regbl' as ProspectionTabKey,
			label: 'Chantiers',
			tagline: 'Permis de construire RegBL',
			icon: 'construction',
			count: data.tabCounts.regbl,
			tooltip: 'Permis de construire et autorisations bâtiment du registre fédéral. Signal indirect de besoin vitrage (transformation, rénovation, neuf).',
			colorVar: 'regbl',
		},
		{
			key: 'entreprises' as ProspectionTabKey,
			label: 'Entreprises',
			tagline: 'Registre du commerce Zefix',
			icon: 'business',
			count: data.tabCounts.entreprises,
			tooltip: "Inscriptions du registre du commerce (Zefix) et fiches search.ch. Pour prospection à froid ciblée par canton et secteur.",
			colorVar: 'entreprises',
		},
		{
			key: 'terrain' as ProspectionTabKey,
			label: 'Terrain',
			tagline: 'Saisies sur place + veille',
			icon: 'smartphone',
			count: data.tabCounts.terrain,
			tooltip: 'Saisies rapides en RDV chantier (lead express) et signaux issus de la veille sectorielle. Vos opportunités captées sur le terrain.',
			colorVar: 'terrain',
		},
	]);

	// V4 audit S163 (F-V4-01/02/03) : CTA + empty state contextuels par scope d'onglet.
	// Terrain = saisie sur place (RDV chantier), pas import. Entreprises = scope sémantique.
	type HeaderCTA = { label: string; labelMobile: string; icon: string; ariaLabel: string; action: () => void };
	const headerCTA = $derived.by((): HeaderCTA => {
		switch (data.tab) {
			case 'terrain':
				return {
					label: 'Créer une fiche terrain',
					labelMobile: 'Créer',
					icon: 'bolt',
					ariaLabel: 'Créer une fiche terrain (lead express)',
					action: () => (leadExpressOpen = true),
				};
			case 'entreprises':
				return {
					label: 'Importer des entreprises',
					labelMobile: 'Importer',
					icon: 'cloud_download',
					ariaLabel: 'Importer des entreprises depuis le registre du commerce (Zefix)',
					action: () => (importModalOpen = true),
				};
			case 'regbl':
				return {
					label: 'Scanner les chantiers',
					labelMobile: 'Scanner',
					icon: 'monitor_heart',
					ariaLabel: 'Scanner les chantiers depuis le registre des bâtiments (RegBL)',
					action: () => (importModalOpen = true),
				};
			case 'simap':
				return {
					label: 'Scanner les marchés publics',
					labelMobile: 'Scanner',
					icon: 'monitor_heart',
					ariaLabel: 'Scanner les marchés publics depuis SIMAP',
					action: () => (importModalOpen = true),
				};
			default:
				return {
					label: 'Importer des prospects',
					labelMobile: 'Importer',
					icon: 'cloud_download',
					ariaLabel: 'Importer des prospects depuis les sources publiques',
					action: () => (importModalOpen = true),
				};
		}
	});

	// F-V4-05 audit S163 : périmètre des sources d'import par onglet (cohérence avec headerCTA).
	// SIMAP → marchés publics, RegBL → registre bâtiments, Entreprises → registre commerce, Terrain → ImportModal jamais ouvert depuis cet onglet.
	type ImportScope = {
		allowedSources: Array<'zefix' | 'simap' | 'regbl'> | null;
		defaultSource: 'zefix' | 'simap' | 'regbl' | null;
		title: string | null;
	};
	const importScope = $derived.by((): ImportScope => {
		switch (data.tab) {
			case 'simap':
				return { allowedSources: ['simap'], defaultSource: 'simap', title: 'Importer depuis les marchés publics' };
			case 'regbl':
				return { allowedSources: ['regbl'], defaultSource: 'regbl', title: 'Importer depuis le registre des bâtiments' };
			case 'entreprises':
				return { allowedSources: ['zefix'], defaultSource: 'zefix', title: 'Importer depuis le registre du commerce' };
			default:
				return { allowedSources: null, defaultSource: null, title: null };
		}
	});

	type EmptyStateCopy = { icon: string; title: string; body: string; ctaLabel: string; ctaIcon: string; ctaAction: () => void };
	const emptyStateCopy = $derived.by((): EmptyStateCopy => {
		switch (data.tab) {
			case 'terrain':
				return {
					icon: 'smartphone',
					title: "Aucune fiche terrain pour l'instant",
					body: "Créez votre première fiche depuis le terrain (RDV chantier, repérage de site) en quelques secondes via le lead express.",
					ctaLabel: 'Créer une fiche',
					ctaIcon: 'bolt',
					ctaAction: () => (leadExpressOpen = true),
				};
			case 'entreprises':
				return {
					icon: 'business',
					title: 'Aucune entreprise importée',
					body: 'Importez des entreprises depuis le registre du commerce (Zefix) pour prospecter à froid par canton et secteur d\'activité.',
					ctaLabel: 'Importer des entreprises',
					ctaIcon: 'cloud_download',
					ctaAction: () => (importModalOpen = true),
				};
			case 'regbl':
				return {
					icon: 'construction',
					title: 'Aucun chantier RegBL',
					body: "Lancez un import du registre fédéral des bâtiments pour récupérer les permis de construire et autorisations en cours.",
					ctaLabel: 'Lancer un import',
					ctaIcon: 'cloud_download',
					ctaAction: () => (importModalOpen = true),
				};
			default:
				return {
					icon: 'landmark',
					title: 'Aucun marché public SIMAP',
					body: "Lancez un import des appels d'offres SIMAP publiés par les collectivités publiques.",
					ctaLabel: 'Lancer un import',
					ctaIcon: 'cloud_download',
					ctaAction: () => (importModalOpen = true),
				};
		}
	});

	function selectTab(tab: ProspectionTabKey) {
		// V1.5 audit S160 : reset sélection avant switch.
		// Sinon BatchActionsBar affiche actions sur leads invisibles (autres onglets).
		selectedIds = new Set();
		selectAllNotice = null;
		// Pas besoin d'invalidateAll : changer l'URL réinvoque load() automatiquement.
		// noScroll préserve la position de l'utilisateur (sinon scroll-to-top sur switch).
		goto(buildUrl({ tab, page: 0 }), { keepFocus: true, noScroll: true });
	}

	function openDetail(lead: Lead) {
		selectedLead = lead;
		slideOutOpen = true;
	}

	// Ouverture auto du SlideOut quand on arrive depuis dashboard avec ?slideOut=<id>
	// (workflow F3 lead express : redirect post-création vers fiche pour enrichissement).
	// On nettoie l'URL même si le lead n'est pas (encore) trouvé pour éviter une réouverture
	// post-fermeture rapide ou au reload navigateur.
	$effect(() => {
		const targetId = $page.url.searchParams.get('slideOut');
		if (!targetId || slideOutOpen) return;
		const lead = data.leads.find(l => l.id === targetId);
		const url = new URL($page.url);
		url.searchParams.delete('slideOut');
		goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
		if (lead) {
			selectedLead = lead;
			slideOutOpen = true;
		}
	});

	type Recherche = (typeof data.recherches)[number];

	function chargerRecherche(r: Recherche) {
		filterSources = r.sources ?? [];
		filterCantons = r.cantons ?? [];
		filterTemperatures = r.temperatures ?? [];
		filterStatuts = [];
		recherchesOpen = false;
	}

	function resetFilters() {
		// V1.5 audit S160 : reset sélection en même temps que les filtres.
		selectedIds = new Set();
		selectAllNotice = null;
		filterSources = [];
		filterCantons = [];
		filterStatuts = [];
		filterTemperatures = [];
		showTransferred = false;
	}

	// V1.1 audit S160 : count des leads enrichissables sur la page courante.
	// Migré ici depuis un {@const} top-level (placement invalide en Svelte 5).
	const enrichablesCount = $derived(data.leads.filter(l => l.statut !== 'transfere').length);

	// V3.4 audit S160 : sauvegarder la recherche courante (filtres actifs) en 1 clic.
	// Affordance manquante avant : "Mes recherches" en lecture seule, aucune création depuis filtres.
	let savePanelOpen = $state(false);
	let saveRechercheNom = $state('');
	let saveRechercheLoading = $state(false);

	async function handleSaveRecherche() {
		const nom = saveRechercheNom.trim();
		if (!nom) return;
		saveRechercheLoading = true;
		try {
			const fd = new FormData();
			fd.set('nom', nom);
			fd.set('sources', JSON.stringify(filterSources));
			fd.set('cantons', JSON.stringify(filterCantons));
			fd.set('temperatures', JSON.stringify(filterTemperatures));
			fd.set('alerte_active', 'false');
			const res = await fetch('?/saveRecherche', { method: 'POST', body: fd });
			if (res.ok) {
				toasts.success(`Recherche « ${nom} » enregistrée`);
				saveRechercheNom = '';
				savePanelOpen = false;
				await invalidateAll();
			} else {
				toasts.error('Enregistrement impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			saveRechercheLoading = false;
		}
	}
</script>

<div class="flex flex-col gap-3 md:gap-6 md:h-[calc(100dvh-var(--header-height)-3rem)]">
	<!-- Phase 0 : 3 indicateurs honnêtes (remplacent le funnel décoratif 4 cartes
	     Importer/Enrichir/Qualifier/Convertir qui mentait + suggérait un parcours linéaire qui n'existe pas). -->
	<div class="md:hidden flex items-center gap-2 text-xs leading-tight tabular-nums" aria-label="Indicateurs prospection">
		<span class="font-semibold text-text">{data.leadsActifsCount} actif{data.leadsActifsCount > 1 ? 's' : ''}</span>
		<span class="text-border">·</span>
		<span class="text-text-muted">{data.marchesOuvertsCount} marché{data.marchesOuvertsCount > 1 ? 's' : ''}</span>
		<span class="text-border">·</span>
		<span class="text-text-muted">{data.transferresMoisCount} transféré{data.transferresMoisCount > 1 ? 's' : ''} ce mois</span>
	</div>
	<!-- V3.6 audit S160 (M-29) : indicateurs flat sémantiquement listés via dl/dt/dd.
	     F-V4-07 : compression header (px/py 7 → 5/4, icône 11 → 10, count 36px → 30px). -->
	<dl class="hidden md:grid grid-cols-3 gap-0 border-y border-border m-0">
		<div class="flex items-center gap-4 px-5 py-4">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));">
				<Icon name="users" size={20} class="text-info" />
			</div>
			<div class="flex flex-col gap-0.5 min-w-0">
				<dd class="text-[30px] leading-none font-bold tabular-nums text-primary-dark tracking-tight m-0">{data.leadsActifsCount}</dd>
				<dt class="text-[12px] font-medium text-text-muted">Leads actifs</dt>
			</div>
		</div>
		<div class="flex items-center gap-4 px-5 py-4 border-l border-border">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));">
				<Icon name="landmark" size={20} class="text-info" />
			</div>
			<div class="flex flex-col gap-0.5 min-w-0">
				<dd class="text-[30px] leading-none font-bold tabular-nums text-primary-dark tracking-tight m-0">{data.marchesOuvertsCount}</dd>
				<dt class="text-[12px] font-medium text-text-muted">Marchés publics ouverts</dt>
			</div>
		</div>
		<div class="flex items-center gap-4 px-5 py-4 border-l border-border">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-primary) 2%, transparent));">
				<Icon name="repeat" size={20} class="text-info" />
			</div>
			<div class="flex flex-col gap-0.5 min-w-0">
				<dd class="text-[30px] leading-none font-bold tabular-nums text-primary-dark tracking-tight m-0">{data.transferresMoisCount}</dd>
				<dt class="text-[12px] font-medium text-text-muted">Transférés ce mois</dt>
			</div>
		</div>
	</dl>

	<!-- Actions principales : DESKTOP descendues dans le slot `actions` de ProspectionTabs (F-V4-07).
	     MOBILE conservé ici en barre dédiée (kebab + leadExpress + headerCTA), au-dessus des filtres mobile.
	     enrichablesCount calculé en $derived dans le script (Svelte 5). -->
	<div class="flex md:hidden items-center gap-2 justify-end">
		<button
			type="button"
			onclick={() => leadExpressOpen = true}
			class="flex items-center gap-2 h-11 px-3 text-sm font-semibold text-primary border border-primary rounded-lg box-border bg-white hover:bg-primary-light cursor-pointer transition-colors"
			aria-label="Créer un lead express"
		>
			<Icon name="bolt" size={18} />
			<span>Lead express</span>
		</button>
		<!-- V4 audit S163 (F-V4-01) + F-V4-07 verbes : CTA contextuel par onglet via headerCTA. -->
		<button
			onclick={headerCTA.action}
			aria-label={headerCTA.ariaLabel}
			class="flex items-center gap-2 h-11 px-4 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg box-border cursor-pointer shadow-md transition-colors"
		>
			<Icon name={headerCTA.icon} size={18} />
			<span class="sm:hidden">{headerCTA.labelMobile}</span>
			<span class="hidden sm:inline">{headerCTA.label}</span>
		</button>
		<!-- Kebab mobile : actions secondaires -->
			<div class="md:hidden relative" bind:this={mobileMenuRef}>
				<button
					onclick={(e) => { e.stopPropagation(); mobileMenuOpen = !mobileMenuOpen; }}
					class="flex items-center justify-center h-11 w-11 rounded-lg border border-border bg-white hover:bg-surface-alt cursor-pointer transition-colors"
					aria-label="Plus d'actions"
					aria-haspopup="menu"
					aria-expanded={mobileMenuOpen}
				>
					<Icon name="more_vert" size={20} />
				</button>
				{#if mobileMenuOpen}
					<div role="menu" class="absolute right-0 top-full mt-1 w-60 rounded-lg border border-border bg-white shadow-lg z-30 overflow-hidden">
						{#if data.recherches.length > 0}
							<button
								role="menuitem"
								onclick={() => { recherchesOpen = true; mobileMenuOpen = false; }}
								class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-surface-alt cursor-pointer text-left"
							>
								<Icon name="bookmarks" size={18} class="text-text-muted" />
								<span class="flex-1">Mes recherches</span>
								<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">{data.recherches.length}</span>
							</button>
						{/if}
						{#if enrichablesCount > 0}
							<button
								role="menuitem"
								onclick={() => { enrichBatchIds = data.leads.filter(l => l.statut !== 'transfere').map(l => l.id); enrichBatchOpen = true; mobileMenuOpen = false; }}
								class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-surface-alt cursor-pointer text-left"
							>
								<Icon name="auto_fix_high" size={18} class="text-prosp-enrich" />
								<span class="flex-1">Enrichir cette page</span>
								<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-prosp-enrich-bg text-prosp-enrich">{enrichablesCount}</span>
							</button>
						{/if}
						<button
							role="menuitem"
							onclick={() => { alerteModalOpen = true; mobileMenuOpen = false; }}
							class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-surface-alt cursor-pointer text-left"
						>
							<Icon name="notifications_active" size={18} class="text-primary" />
							<span class="flex-1">Créer une alerte</span>
						</button>
					</div>
				{/if}
			</div>
	</div>

	<!-- Filtres : drawer mobile collapsible, grid permanent desktop -->
	<!-- Bouton mobile "Filtres" -->
	<div class="md:hidden flex items-center gap-2">
		<button
			onclick={() => mobileFiltersOpen = !mobileFiltersOpen}
			class="flex items-center gap-2 h-11 px-3 text-sm font-medium text-text border border-border rounded-lg box-border bg-white hover:bg-surface-alt cursor-pointer transition-colors"
			aria-expanded={mobileFiltersOpen}
			aria-controls="filtres-mobile-panel"
		>
			<Icon name="filter_list" size={18} />
			<span>Filtres</span>
			{#if activeFilterCount > 0}
				<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">{activeFilterCount}</span>
			{/if}
			<Icon name={mobileFiltersOpen ? 'expand_less' : 'expand_more'} size={18} class="text-text-muted" />
		</button>
		{#if activeFilterCount > 0}
			<span class="text-xs text-text-muted">{data.totalLeads} résultat{data.totalLeads > 1 ? 's' : ''}</span>
			<button onclick={resetFilters} class="flex items-center gap-1 ml-auto px-2 py-2 text-xs text-text-muted hover:text-danger cursor-pointer transition-colors">
				<Icon name="close" size={14} />
				Réinitialiser
			</button>
		{/if}
	</div>
	{#if mobileFiltersOpen}
		<div id="filtres-mobile-panel" class="md:hidden rounded-xl border border-border bg-white shadow-xs">
			<!-- V3.6 audit S160 (M-30) : fieldset+legend pour grouper les filtres sémantiquement. -->
			<fieldset class="grid grid-cols-2 gap-3 p-3">
				<legend class="sr-only">Filtres prospection</legend>
				<MultiSelectDropdown bind:selected={filterStatuts} options={statutOptions} icon="checklist" label="Statut" tooltip="Filtrer par statut de traitement" />
				<MultiSelectDropdown bind:selected={filterTemperatures} options={temperatureOptions} icon="thermostat" label="Température" tooltip="Niveau d'intérêt estimé du prospect" />
				<MultiSelectDropdown bind:selected={filterCantons} options={cantonOptions} icon="location_on" label="Canton" tooltip="Zones géographiques" />
				<MultiSelectDropdown bind:selected={filterSources} options={sourceOptions} icon="database" label="Source" tooltip="Registres et bases de données" />
			</fieldset>
		</div>
	{/if}
	<!-- Bloc filtres desktop -->
	<div class="hidden md:block rounded-xl border border-border bg-white shadow-xs">
		<fieldset class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3">
			<legend class="sr-only">Filtres prospection</legend>
			<MultiSelectDropdown bind:selected={filterStatuts} options={statutOptions} icon="checklist" label="Statut" tooltip="Filtrer par statut de traitement" />
			<MultiSelectDropdown bind:selected={filterTemperatures} options={temperatureOptions} icon="thermostat" label="Température" tooltip="Niveau d'intérêt estimé du prospect" />
			<MultiSelectDropdown bind:selected={filterCantons} options={cantonOptions} icon="location_on" label="Canton" tooltip="Zones géographiques" />
			<MultiSelectDropdown bind:selected={filterSources} options={sourceOptions} icon="database" label="Source" tooltip="Registres et bases de données" />
		</fieldset>
		<div class="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0">
			<!-- Phase 0 : toggle "Afficher les transférés" off par défaut, persistant via URL ?showTransferred=1 -->
			<label class="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
				<input
					type="checkbox"
					bind:checked={showTransferred}
					class="h-4 w-4 cursor-pointer accent-primary"
				/>
				<span>Afficher aussi les leads transférés</span>
			</label>
			<div class="flex items-center gap-2 ml-auto">
				{#if activeFilterCount > 0}
					<span class="text-xs text-text-muted">{data.totalLeads} résultat{data.totalLeads > 1 ? 's' : ''}</span>
					<button onclick={resetFilters} class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-danger cursor-pointer transition-colors">
						<Icon name="close" size={14} />
						Réinitialiser
					</button>
					<!-- V3.4 audit S160 : sauvegarder la recherche courante en 1 clic. -->
					<button
						onclick={() => savePanelOpen = !savePanelOpen}
						class="flex items-center gap-2 h-10 px-3 text-sm font-medium text-text border border-border rounded-lg box-border bg-white hover:bg-surface-alt cursor-pointer transition-colors"
					>
						<Icon name="bookmark_add" size={16} />
						Sauvegarder cette recherche
					</button>
				{/if}
				<button
					onclick={() => alerteModalOpen = true}
					class="flex items-center gap-2 h-10 px-3 text-sm font-medium text-primary border border-primary rounded-lg box-border hover:bg-primary/5 cursor-pointer transition-colors"
				>
					<Icon name="notifications_active" size={16} />
					Créer une alerte
				</button>
			</div>
		</div>
	</div>

	<!-- V3.4 audit S160 : panneau inline pour sauvegarder la recherche courante. -->
	{#if savePanelOpen}
		<div class="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-primary/30 bg-primary-light/30 shadow-xs">
			<Icon name="bookmark_add" size={18} class="text-primary shrink-0" />
			<label for="save-recherche-nom" class="text-sm font-medium text-text shrink-0">Nom de la recherche</label>
			<input
				id="save-recherche-nom"
				type="text"
				bind:value={saveRechercheNom}
				placeholder="Ex : SIMAP Vaud chaud"
				maxlength="120"
				class="flex-1 min-w-[180px] h-10 px-3 text-sm border border-[var(--color-border-input)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
				onkeydown={(e) => { if (e.key === 'Enter' && saveRechercheNom.trim()) handleSaveRecherche(); if (e.key === 'Escape') savePanelOpen = false; }}
			/>
			<button
				type="button"
				onclick={handleSaveRecherche}
				disabled={!saveRechercheNom.trim() || saveRechercheLoading}
				class="h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
			>
				{saveRechercheLoading ? 'Enregistrement…' : 'Enregistrer'}
			</button>
			<button
				type="button"
				onclick={() => { savePanelOpen = false; saveRechercheNom = ''; }}
				class="h-10 px-3 text-sm text-text-muted hover:text-text cursor-pointer"
			>
				Annuler
			</button>
		</div>
	{/if}

	<!-- Recherches sauvegardées -->
	<RecherchesPanel bind:open={recherchesOpen} recherches={data.recherches} onCharger={chargerRecherche} />

	<!-- Notification import/enrichissement -->
	{#if importResult}
		<div class="flex items-center justify-between p-3 rounded-xl border shadow-xs {importResult.type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-danger-light border-danger/30 text-danger'}">
			<div class="flex items-center gap-2">
				<Icon name={importResult.type === 'success' ? 'check_circle' : 'error'} size={18} />
				<span class="text-sm font-medium">{importResult.message}</span>
			</div>
			<button onclick={() => importResult = null} class="text-sm opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Bannière sélection globale (Gmail/Notion pattern) -->
	{#if showSelectAllBanner}
		<div class="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-primary-light text-sm">
			<Icon name="checklist" size={16} class="text-primary shrink-0" />
			<span class="text-text">
				Les <strong>{selectedIds.size}</strong> prospects de cette page sont sélectionnés.
			</span>
			<button
				onclick={selectAllMatching}
				disabled={selectAllLoading}
				class="font-semibold text-primary hover:text-primary-hover underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{selectAllLoading ? 'Chargement…' : `Sélectionner les ${data.totalLeads} prospects qui correspondent aux filtres`}
			</button>
		</div>
	{/if}
	{#if selectAllNotice}
		<div
			class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm {selectAllNotice.type === 'error' ? 'border-danger bg-danger-light text-danger' : 'border-primary bg-primary-light text-text'}"
			role={selectAllNotice.type === 'error' ? 'alert' : 'status'}
		>
			<div class="flex items-center gap-2">
				<Icon name={selectAllNotice.type === 'error' ? 'error' : 'info'} size={16} class="shrink-0" />
				<span>{selectAllNotice.message}</span>
			</div>
			<button onclick={() => (selectAllNotice = null)} aria-label="Fermer la notification" class="text-xs opacity-60 hover:opacity-100 cursor-pointer">Fermer</button>
		</div>
	{/if}

	<!-- Barre actions batch -->
	<BatchActionsBar bind:selectedIds bind:enrichBatchIds bind:enrichBatchOpen />

	<div class="flex-1 min-h-0 flex flex-col">
	<!-- Empty state global UNIQUEMENT si tous les onglets sont vides (système jamais peuplé).
	     Sinon les onglets restent visibles (sinon impossible de revenir sur SIMAP depuis Terrain à 0). -->
	{#if data.tabCounts.simap === 0 && data.tabCounts.regbl === 0 && data.tabCounts.entreprises === 0 && data.tabCounts.terrain === 0 && activeFilterCount === 0}
		<div class="flex flex-col items-center justify-center py-16 px-6">
			<div class="flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style="background: linear-gradient(135deg, var(--color-prosp-import-bg), var(--color-prosp-enrich-bg))">
				<Icon name="search" size={32} class="text-prosp-import" />
			</div>
			<h3 class="text-lg font-semibold text-text mb-2">Trouvez vos premiers prospects</h3>
			<p class="text-sm text-text-muted text-center max-w-lg mb-6">
				Importez des entreprises depuis les sources publiques suisses (registre du commerce, marchés publics, registre des bâtiments). Qualifiez-les, puis convertissez les plus pertinentes en entreprises dans votre CRM.
			</p>
			<button
				onclick={() => importModalOpen = true}
				class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer shadow-md transition-colors"
			>
				<Icon name="cloud_download" size={18} />
				Lancer un import
			</button>
		</div>
	{:else}
	<!-- Phase 2 : onglets par nature de signal collés au DataTable (1 shell visuel cohérent) -->
	<div class="bg-white rounded-xl border border-border shadow-sm flex flex-1 flex-col min-h-0 overflow-visible">
		<ProspectionTabs tabs={tabsConfig} active={data.tab as ProspectionTabKey} onSelect={selectTab}>
			{#snippet actions()}
				<!-- F-V4-07 : actions desktop descendues sur la même ligne que les onglets.
				     Mobile garde sa propre barre header (leadExpress + CTA + kebab) ci-dessus. -->
				{#if data.recherches.length > 0}
					<button
						type="button"
						onclick={() => recherchesOpen = !recherchesOpen}
						class="hidden md:inline-flex items-center gap-2 h-10 px-3 box-border text-sm font-medium text-text border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors"
						aria-label="Ouvrir mes recherches sauvegardées"
					>
						<Icon name="bookmarks" size={16} />
						<span>Mes recherches</span>
						<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-light text-primary">{data.recherches.length}</span>
					</button>
				{/if}
				{#if enrichablesCount > 0}
					<button
						type="button"
						onclick={() => { enrichBatchIds = data.leads.filter(l => l.statut !== 'transfere').map(l => l.id); enrichBatchOpen = true; }}
						class="hidden md:inline-flex items-center gap-2 h-10 px-3 box-border text-sm font-medium border rounded-lg cursor-pointer transition-colors text-prosp-enrich border-prosp-enrich-border hover:bg-prosp-enrich-bg"
						title="Enrichit uniquement les {enrichablesCount} leads de cette page"
						aria-label="Enrichir les {enrichablesCount} leads de cette page"
					>
						<Icon name="auto_fix_high" size={16} />
						<span>Enrichir cette page</span>
						<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-prosp-enrich-bg text-prosp-enrich">{enrichablesCount}</span>
					</button>
				{/if}
				<!-- V4 audit S163 (F-V4-01) + F-V4-07 verbes : CTA principal contextuel par onglet. -->
				<button
					type="button"
					onclick={headerCTA.action}
					aria-label={headerCTA.ariaLabel}
					class="hidden md:inline-flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer shadow-sm transition-colors"
				>
					<Icon name={headerCTA.icon} size={16} />
					<span>{headerCTA.label}</span>
				</button>
			{/snippet}
		</ProspectionTabs>
		<!-- V2.1 audit S160 : tabpanel ARIA wrapper. Lié à #tab-{key} via aria-labelledby. -->
		<div role="tabpanel" id="tabpanel-{data.tab}" aria-labelledby="tab-{data.tab}" class="flex flex-1 flex-col min-h-0">
		{#if data.sourceFilterIncompatible}
			<div class="flex items-start gap-2 px-4 py-3 border-b border-warning/30 bg-warning-light text-warning text-sm" role="status">
				<Icon name="info" size={18} class="shrink-0 mt-0.5" />
				<div class="flex-1">
					<strong class="font-semibold">Filtre source incompatible avec l'onglet actif.</strong>
					Le filtre Source actuel ne contient aucune source liée à <em>{tabsConfig.find(t => t.key === data.tab)?.label}</em>. Aucun résultat à afficher.
				</div>
				<button
					onclick={() => { filterSources = []; }}
					class="font-semibold underline hover:no-underline cursor-pointer"
				>Retirer le filtre Source</button>
			</div>
		{:else if data.totalLeads === 0}
			<!-- V1.1 H-18 audit S160 : empty state intermédiaire actionnable.
			     V4 audit S163 (F-V4-02/03) : empty state contextuel par scope d'onglet via emptyStateCopy.
			     Distingue "onglet vide à cause des filtres" de "onglet jamais peuplé".
			     Terrain = saisie sur place (lead express), pas import. -->
			<div class="flex flex-col items-center justify-center py-12 px-6">
				<div class="flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-surface-alt">
					<Icon name={activeFilterCount > 0 || data.search ? 'filter_alt_off' : emptyStateCopy.icon} size={26} class="text-text-muted" />
				</div>
				{#if activeFilterCount > 0 || data.search}
					<h3 class="text-base font-semibold text-text mb-1">Aucun prospect ne correspond à ces filtres</h3>
					<p class="text-sm text-text-muted text-center max-w-md mb-5">
						Réinitialisez les filtres pour réafficher l'onglet, changez de nature de signal, ou importez de nouveaux prospects.
					</p>
					<div class="flex flex-wrap items-center justify-center gap-2">
						<button
							onclick={() => { resetFilters(); goto(buildUrl({ q: '', source: [], canton: [], statut: [], temp: [], showTransferred: false, page: 0 }), { keepFocus: true, noScroll: true }); }}
							class="flex items-center gap-2 h-10 px-4 box-border text-sm font-medium text-text border border-border rounded-lg bg-white hover:bg-surface-alt cursor-pointer transition-colors"
						>
							<Icon name="close" size={16} />
							Réinitialiser les filtres
						</button>
						<button
							onclick={headerCTA.action}
							class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer shadow-md transition-colors"
						>
							<Icon name={headerCTA.icon} size={16} />
							{headerCTA.labelMobile}
						</button>
					</div>
				{:else}
					<h3 class="text-base font-semibold text-text mb-1">{emptyStateCopy.title}</h3>
					<p class="text-sm text-text-muted text-center max-w-md mb-5">{emptyStateCopy.body}</p>
					<button
						onclick={emptyStateCopy.ctaAction}
						class="flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer shadow-md transition-colors"
					>
						<Icon name={emptyStateCopy.ctaIcon} size={16} />
						{emptyStateCopy.ctaLabel}
					</button>
				{/if}
			</div>
		{:else}
	<DataTable
		data={data.leads}
		{columns}
		embedded={true}
		dense={true}
		resizable={true}
		stickyLeftCols={2}
		storageKey="prospection-{data.tab}"
		pageSizeOptions={[25, 50, 100]}
		onPageSizeChange={(s) => goto(buildUrl({ perPage: s, page: 0 }), { keepFocus: true, noScroll: true })}
		selectable={true}
		bind:selectedIds
		onRowClick={openDetail}
		rowAriaLabel={(lead) => {
			const parts: string[] = [`Lead ${lead.raison_sociale}`];
			if (lead.canton) parts.push(`canton ${lead.canton}`);
			if (typeof lead.score_pertinence === 'number') parts.push(`score ${lead.score_pertinence} sur 12`);
			if (lead.statut) parts.push(`statut ${lead.statut}`);
			return parts.join(', ');
		}}
		searchPlaceholder="Rechercher un prospect…"
		emptyMessage="Aucun prospect correspondant aux filtres."
		serverMode={true}
		totalCount={data.totalLeads}
		currentServerPage={data.page}
		serverSortKey={data.sort}
		serverSortAsc={data.sortAsc}
		serverSearch={data.search}
		pageSize={data.pageSize}
		onPageChange={(p) => goto(buildUrl({ page: p }), { keepFocus: true, noScroll: true })}
		onSortChange={(key, asc) => goto(buildUrl({ sort: key, dir: asc ? 'asc' : 'desc', page: 0 }), { keepFocus: true, noScroll: true })}
		onSearchChange={(q) => goto(buildUrl({ q, page: 0 }), { keepFocus: true, noScroll: true })}
	>
		{#snippet row(lead, _i)}
			{#each columns as col}
				<td class="dt-td {col.class ?? ''}">
					{#if col.key === 'score_pertinence'}
						<ScorePill score={lead.score_pertinence} compact />
					{:else if col.key === 'raison_sociale'}
						<span class="font-medium text-text truncate block" title={lead.raison_sociale}>{lead.raison_sociale}</span>
					{:else if col.key === 'canton'}
						<span class="text-text">{lead.canton ? (cantonNoms[lead.canton] ?? lead.canton) : '–'}</span>
					{:else if col.key === 'localite'}
						<span class="text-text truncate block" title={lead.localite ?? ''}>{lead.localite ?? '–'}</span>
					{:else if col.key === 'source'}
						<span class="text-text-muted text-xs">{sourceLabel(lead.source)}</span>
					{:else if col.key === 'statut'}
						<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
					{:else if col.key === 'date_import' || col.key === 'date_publication'}
						<span class="text-text-muted text-xs">{relativeDate(lead[col.key as 'date_import' | 'date_publication'])}</span>
					{:else if col.key === 'montant'}
						<span class="text-text tabular-nums">{lead.montant != null && lead.montant > 0 ? `${(lead.montant / 1000).toFixed(0)} k CHF` : '—'}</span>
					{:else if col.key === 'description'}
						<span class="text-text-body truncate block" title={lead.description ?? ''}>{lead.description ?? '—'}</span>
					{:else if col.key === 'telephone'}
						<span class="text-text">{lead.telephone ?? '—'}</span>
					{:else}
						<span class="text-text">{lead[col.key as keyof typeof lead] ?? '—'}</span>
					{/if}
				</td>
			{/each}
		{/snippet}
	</DataTable>
		{/if}
		</div><!-- /tabpanel V2.1 -->
	</div>
	{/if}
	</div>
</div>

<!-- Lead detail slide-out -->
<LeadSlideOut bind:open={slideOutOpen} bind:lead={selectedLead} bind:importResult leads={data.leads} />

<!-- Lead express modale (F3 V2 mobile terrain) -->
<LeadExpress bind:open={leadExpressOpen} redirectAfterCreate={false} />

<!-- Modal création alerte -->
<AlerteModal bind:open={alerteModalOpen} />

<!-- Modal import sources -->
<ImportModal
	bind:open={importModalOpen}
	bind:importResult
	fromIntelligence={data.fromIntelligence}
	fromTerm={data.fromTerm}
	allowedSources={importScope.allowedSources}
	defaultSource={importScope.defaultSource}
	title={importScope.title}
/>

<!-- Modal enrichissement batch -->
<EnrichBatchModal
	bind:open={enrichBatchOpen}
	leadIds={enrichBatchIds}
	onDone={(summary) => {
		selectedIds = new Set();
		if (summary.enriched > 0) {
			importResult = {
				message: `${summary.enriched} prospect${summary.enriched > 1 ? 's' : ''} enrichi${summary.enriched > 1 ? 's' : ''}${summary.errors > 0 ? ` (${summary.errors} erreur${summary.errors > 1 ? 's' : ''})` : ''}`,
				type: summary.errors > 0 ? 'error' : 'success'
			};
		}
	}}
/>
