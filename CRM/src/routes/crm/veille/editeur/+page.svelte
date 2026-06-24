<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import Tabs from '$lib/components/Tabs.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';
	import type { VeilleTheme } from '$lib/server/intelligence/themes-repository';
	import type { VeilleSource } from '$lib/server/intelligence/sources-repository';

	let { data }: { data: PageData } = $props();

	type TabKey = 'themes' | 'sources';
	let activeTab = $state<TabKey>('themes');

	// ---------- Helpers présentation ----------
	type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted';

	// Priorité = bucket de sort_order (mockup v2 : Prioritaire ≤20, Standard ≤60, Secondaire >60).
	function prioriteOf(sortOrder: number): { label: string; variant: BadgeVariant } {
		if (sortOrder <= 20) return { label: 'Prioritaire', variant: 'default' };
		if (sortOrder <= 60) return { label: 'Standard', variant: 'info' };
		return { label: 'Secondaire', variant: 'muted' };
	}
	// Le select Priorité écrit une valeur de sort_order représentative du bucket.
	function sortOrderForPriorite(p: 'prioritaire' | 'standard' | 'secondaire'): number {
		return p === 'prioritaire' ? 10 : p === 'standard' ? 50 : 90;
	}
	function prioriteKey(sortOrder: number): 'prioritaire' | 'standard' | 'secondaire' {
		if (sortOrder <= 20) return 'prioritaire';
		if (sortOrder <= 60) return 'standard';
		return 'secondaire';
	}

	type Regime = 'strict' | 'trusted' | 'trusted_advocacy';
	// Aperçu du régime côté client : MÊME logique que regimeFromClassification (serveur),
	// pour montrer en lecture seule l'effet de famille+flags. La vérité reste serveur.
	function regimePreview(c: {
		tier: string | null;
		strict_verbatim: boolean;
		is_preprint: boolean;
		is_advocacy: boolean;
		in_denylist: boolean;
	}): Regime {
		if (c.in_denylist || c.strict_verbatim || c.is_preprint) return 'strict';
		if (c.tier === null) return 'strict';
		if (c.tier === 'T3' || c.tier === 'T6' || c.tier === 'T7A' || c.tier === 'T7B') return 'strict';
		if (c.is_advocacy) return 'trusted_advocacy';
		if (c.tier === 'T1' || c.tier === 'T2' || c.tier === 'T4' || c.tier === 'T5') return 'trusted';
		return 'strict';
	}
	function regimeBadge(r: Regime): { label: string; variant: BadgeVariant } {
		if (r === 'trusted') return { label: 'Confiance', variant: 'success' };
		if (r === 'trusted_advocacy') return { label: 'Confiance + garde chiffres', variant: 'info' };
		return { label: 'Strict', variant: 'warning' };
	}

	// ---------- Familles de sources ----------
	type FamilyKey = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7A' | 'T7B' | 'untiered' | 'denied';
	const FAMILIES: { key: FamilyKey; label: string; desc: string }[] = [
		{ key: 'T4', label: 'Presse généraliste & régionale', desc: 'Signaux marché, décisions cantonales, contexte. Cœur du sourcing romand.' },
		{ key: 'T1', label: 'Officiel, normes & statistiques', desc: 'Régulation, normes, agences publiques, statistiques officielles.' },
		{ key: 'T2', label: 'Presse pro bâtiment & vitrage', desc: 'Actualité sectorielle, études de cas, façade et verre.' },
		{ key: 'T5', label: 'Tech, R&D & brevets', desc: 'Innovation matériau, recherche académique, brevets.' },
		{ key: 'T3', label: 'Études de marché & cabinets', desc: 'Chiffres marché et baromètres. Tout chiffre vérifié au mot près.' },
		{ key: 'T6', label: 'Concurrents internationaux', desc: 'Sites officiels concurrents (films, smart glass).' },
		{ key: 'T7A', label: 'Installateurs concurrents (benchmark)', desc: 'Concurrence frontale de FilmPro. Signal explicite uniquement, jamais chiffré.' },
		{ key: 'T7B', label: 'Marques & fabricants (benchmark)', desc: 'Bench specs produits, normes, certifications, R&D matériaux.' },
		{ key: 'untiered', label: 'Hors famille (vérification stricte)', desc: 'Sources connues mais non whitelistées (PR-wires, préprints) : chaque fait vérifié au mot près.' },
		{ key: 'denied', label: 'Sources bloquées (denylist)', desc: 'Filtrées avant vérification : blogs marketing déguisés, agrégateurs spam.' }
	];
	function familyOf(s: VeilleSource): FamilyKey {
		if (s.in_denylist) return 'denied';
		if (s.tier && ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7A', 'T7B'].includes(s.tier)) {
			return s.tier as FamilyKey;
		}
		return 'untiered';
	}
	function familyBadge(key: FamilyKey): { label: string; variant: BadgeVariant } {
		if (key === 'denied') return { label: 'Bloquée', variant: 'danger' };
		if (key === 'untiered' || key === 'T3' || key === 'T6' || key === 'T7A' || key === 'T7B') {
			return regimeBadge('strict');
		}
		return regimeBadge('trusted');
	}
	// Régime « par défaut » de la famille (tier seul). Sert à n'afficher un badge
	// régime PAR LIGNE que pour les sources dont le régime RÉEL (s.regime, tier+flags)
	// s'écarte de ce défaut (advocacy → trusted_advocacy, preprint → strict) : sinon
	// l'en-tête de famille (tier seul) mentirait sur ces sources (bug-hunt MEDIUM).
	function familyDefaultRegime(key: FamilyKey): Regime {
		if (key === 'T1' || key === 'T2' || key === 'T4' || key === 'T5') return 'trusted';
		return 'strict';
	}

	const TOP_N = 5; // sources visibles avant collapse, par famille (mockup v2)

	// ---------- Filtres sources (client) ----------
	let srcSearch = $state('');
	let famFilter = $state<FamilyKey | ''>('');
	let chipConfiance = $state(false);
	let chipStrict = $state(false);
	let chipBenchmark = $state(false);
	let chipPause = $state(false);
	let expanded = $state<Record<string, boolean>>({});

	const filteredSources = $derived.by(() => {
		const q = srcSearch.trim().toLowerCase();
		return data.sources.filter((s: VeilleSource) => {
			if (q && !s.name.toLowerCase().includes(q) && !s.hostname.toLowerCase().includes(q)) return false;
			if (famFilter && familyOf(s) !== famFilter) return false;
			const reg = s.regime as Regime;
			if (chipConfiance && reg !== 'trusted' && reg !== 'trusted_advocacy') return false;
			if (chipStrict && reg !== 'strict') return false;
			if (chipBenchmark && !s.is_benchmark) return false;
			if (chipPause && s.active) return false;
			return true;
		});
	});

	const groupedSources = $derived.by(() => {
		const map = new Map<FamilyKey, VeilleSource[]>();
		for (const s of filteredSources) {
			const k = familyOf(s);
			if (!map.has(k)) map.set(k, []);
			map.get(k)!.push(s);
		}
		return FAMILIES.filter((f) => map.has(f.key)).map((f) => ({ ...f, rows: map.get(f.key)! }));
	});

	const activeSourceCount = $derived(data.sources.filter((s: VeilleSource) => s.active).length);

	// ---------- Thèmes : filtrage + tri ----------
	let themeSearch = $state('');
	const filteredThemes = $derived.by(() => {
		const q = themeSearch.trim().toLowerCase();
		return [...data.themes]
			.sort((a: VeilleTheme, b: VeilleTheme) => a.sort_order - b.sort_order)
			.filter(
				(t: VeilleTheme) =>
					!q || t.label.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
			);
	});

	// ===================== ACTIONS génériques =====================
	// Les actions THÈMES vivent dans /crm/veille/themes (réutilisées cross-route) ;
	// les actions SOURCES dans cette route (?/...). On poste en fetch + deserialize,
	// puis invalidateAll recharge le `load` de l'éditeur (themes + sources frais).
	async function postAction(
		url: string,
		fields: Record<string, string>,
		okMsg: string
	): Promise<boolean> {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) fd.set(k, v);
		try {
			const res = await fetch(url, { method: 'POST', body: fd });
			const result: ActionResult = deserialize(await res.text());
			if (result.type === 'success') {
				toasts.success((result.data as { message?: string } | undefined)?.message ?? okMsg);
				await invalidateAll();
				return true;
			}
			if (result.type === 'failure') {
				toasts.error((result.data as { error?: string } | undefined)?.error ?? 'Erreur');
			} else {
				toasts.error('Erreur inattendue');
			}
			// Resync de l'état réel sur échec : la case à cocher (toggle source) est
			// optimiste (le navigateur la bascule avant la réponse) ; sans recharge,
			// elle resterait dans l'état basculé alors que le serveur a refusé.
			await invalidateAll();
			return false;
		} catch (err) {
			toasts.error(err instanceof Error ? err.message : 'Erreur réseau');
			await invalidateAll();
			return false;
		}
	}

	// ===================== THÈME : modale =====================
	let themeModalOpen = $state(false);
	let editingTheme = $state<VeilleTheme | null>(null);
	let themeSaving = $state(false);
	let themeForm = $state({
		slug: '',
		label: '',
		description: '',
		category: 'core' as 'core' | 'adjacent',
		priorite: 'standard' as 'prioritaire' | 'standard' | 'secondaire'
	});
	let themeFormError = $state<string | null>(null);

	function openCreateTheme() {
		editingTheme = null;
		themeForm = { slug: '', label: '', description: '', category: 'core', priorite: 'standard' };
		themeFormError = null;
		themeModalOpen = true;
	}
	function openEditTheme(t: VeilleTheme) {
		editingTheme = t;
		themeForm = {
			slug: t.slug,
			label: t.label,
			description: t.description,
			category: t.category as 'core' | 'adjacent',
			priorite: prioriteKey(t.sort_order)
		};
		themeFormError = null;
		themeModalOpen = true;
	}
	// Proposition auto du terme depuis le nom (création seulement).
	function slugify(label: string): string {
		return label
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 64);
	}
	function onThemeLabelInput() {
		if (!editingTheme) themeForm.slug = slugify(themeForm.label);
	}
	async function saveTheme() {
		themeSaving = true;
		themeFormError = null;
		const sortOrder = sortOrderForPriorite(themeForm.priorite);
		const base: Record<string, string> = {
			label: themeForm.label,
			description: themeForm.description,
			category: themeForm.category,
			sort_order: String(sortOrder)
		};
		const fd = new FormData();
		const url = editingTheme
			? '/crm/veille/themes?/update'
			: '/crm/veille/themes?/create';
		if (editingTheme) fd.set('id', editingTheme.id);
		else fd.set('slug', themeForm.slug);
		for (const [k, v] of Object.entries(base)) fd.set(k, v);
		try {
			const res = await fetch(url, { method: 'POST', body: fd });
			const result: ActionResult = deserialize(await res.text());
			if (result.type === 'success') {
				toasts.success(
					(result.data as { message?: string } | undefined)?.message ?? 'Thème enregistré.'
				);
				themeModalOpen = false;
				await invalidateAll();
			} else if (result.type === 'failure') {
				themeFormError = (result.data as { error?: string } | undefined)?.error ?? 'Erreur';
			} else {
				themeFormError = 'Erreur inattendue';
			}
		} catch (err) {
			themeFormError = err instanceof Error ? err.message : 'Erreur réseau';
		} finally {
			themeSaving = false;
		}
	}

	// THÈME : toggle actif + suppression (ConfirmModal)
	let themeToggleOpen = $state(false);
	let themeToggleTarget = $state<VeilleTheme | null>(null);
	let themeToggleLoading = $state(false);
	function askToggleTheme(t: VeilleTheme) {
		themeToggleTarget = t;
		themeToggleOpen = true;
	}
	async function confirmToggleTheme() {
		if (!themeToggleTarget) return;
		themeToggleLoading = true;
		const ok = await postAction(
			'/crm/veille/themes?/toggleActive',
			{ id: themeToggleTarget.id, active: String(!themeToggleTarget.active) },
			'Mise à jour.'
		);
		themeToggleLoading = false;
		if (ok) themeToggleOpen = false;
	}

	let themeDeleteOpen = $state(false);
	let themeDeleteTarget = $state<VeilleTheme | null>(null);
	let themeDeleteLoading = $state(false);
	function askDeleteTheme(t: VeilleTheme) {
		themeDeleteTarget = t;
		themeDeleteOpen = true;
	}
	async function confirmDeleteTheme() {
		if (!themeDeleteTarget) return;
		themeDeleteLoading = true;
		const ok = await postAction(
			'/crm/veille/themes?/delete',
			{ id: themeDeleteTarget.id },
			'Thème supprimé.'
		);
		themeDeleteLoading = false;
		if (ok) themeDeleteOpen = false;
	}

	// ===================== SOURCE : modale =====================
	let sourceModalOpen = $state(false);
	let editingSource = $state<VeilleSource | null>(null);
	let sourceSaving = $state(false);
	let sourceForm = $state({
		url: '',
		name: '',
		description: '',
		tier: '' as string,
		is_benchmark: false,
		strict_verbatim: false,
		is_advocacy: false,
		is_preprint: false,
		in_denylist: false
	});
	let sourceFormError = $state<string | null>(null);

	// Aperçu live du régime (lecture seule) à partir de famille + flags.
	const sourceRegimePreview = $derived(
		regimeBadge(
			regimePreview({
				tier: sourceForm.tier === '' ? null : sourceForm.tier,
				strict_verbatim: sourceForm.strict_verbatim,
				is_preprint: sourceForm.is_preprint,
				is_advocacy: sourceForm.is_advocacy,
				in_denylist: sourceForm.in_denylist
			})
		)
	);
	const sourceCanSave = $derived(sourceForm.url.trim().length > 3 && sourceForm.name.trim().length > 0);

	function openCreateSource() {
		editingSource = null;
		sourceForm = {
			url: '',
			name: '',
			description: '',
			tier: 'T4',
			is_benchmark: false,
			strict_verbatim: false,
			is_advocacy: false,
			is_preprint: false,
			in_denylist: false
		};
		sourceFormError = null;
		sourceModalOpen = true;
	}
	function openEditSource(s: VeilleSource) {
		editingSource = s;
		sourceForm = {
			url: s.hostname,
			name: s.name,
			description: s.description ?? '',
			tier: s.tier ?? '',
			is_benchmark: s.is_benchmark,
			strict_verbatim: s.strict_verbatim,
			is_advocacy: s.is_advocacy,
			is_preprint: s.is_preprint,
			in_denylist: s.in_denylist
		};
		sourceFormError = null;
		sourceModalOpen = true;
	}
	async function saveSource() {
		sourceSaving = true;
		sourceFormError = null;
		const fd = new FormData();
		const url = editingSource ? '?/updateSource' : '?/createSource';
		if (editingSource) fd.set('id', editingSource.id);
		else fd.set('url', sourceForm.url);
		fd.set('name', sourceForm.name);
		fd.set('description', sourceForm.description);
		fd.set('tier', sourceForm.tier);
		fd.set('is_benchmark', String(sourceForm.is_benchmark));
		fd.set('strict_verbatim', String(sourceForm.strict_verbatim));
		fd.set('is_advocacy', String(sourceForm.is_advocacy));
		fd.set('is_preprint', String(sourceForm.is_preprint));
		fd.set('in_denylist', String(sourceForm.in_denylist));
		try {
			const res = await fetch(url, { method: 'POST', body: fd });
			const result: ActionResult = deserialize(await res.text());
			if (result.type === 'success') {
				toasts.success(
					(result.data as { message?: string } | undefined)?.message ?? 'Source enregistrée.'
				);
				sourceModalOpen = false;
				await invalidateAll();
			} else if (result.type === 'failure') {
				sourceFormError = (result.data as { error?: string } | undefined)?.error ?? 'Erreur';
			} else {
				sourceFormError = 'Erreur inattendue';
			}
		} catch (err) {
			sourceFormError = err instanceof Error ? err.message : 'Erreur réseau';
		} finally {
			sourceSaving = false;
		}
	}

	// SOURCE : pause/réactivation (case à cocher, sans confirmation = retrait réversible)
	let toggling = $state<Record<string, boolean>>({});
	async function toggleSource(s: VeilleSource) {
		toggling = { ...toggling, [s.id]: true };
		await postAction(
			'?/toggleSourceActive',
			{ id: s.id, active: String(!s.active) },
			'Mise à jour.'
		);
		toggling = { ...toggling, [s.id]: false };
	}

	// SOURCE : suppression définitive (ConfirmModal)
	let sourceDeleteOpen = $state(false);
	let sourceDeleteTarget = $state<VeilleSource | null>(null);
	let sourceDeleteLoading = $state(false);
	function askDeleteSource(s: VeilleSource) {
		sourceDeleteTarget = s;
		sourceDeleteOpen = true;
	}
	async function confirmDeleteSource() {
		if (!sourceDeleteTarget) return;
		sourceDeleteLoading = true;
		const ok = await postAction('?/deleteSource', { id: sourceDeleteTarget.id }, 'Source supprimée.');
		sourceDeleteLoading = false;
		if (ok) sourceDeleteOpen = false;
	}

	const tabs = $derived([
		{ key: 'themes' as const, label: 'Thèmes', count: data.themes.length },
		{ key: 'sources' as const, label: 'Sources', count: data.sources.length }
	]);
</script>

<svelte:head><title>Éditeur de la veille · FilmPro</title></svelte:head>

<div class="px-6 pt-6 md:px-8 md:pt-8">
	<a
		href="/crm/veille"
		class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mb-4"
	>
		<Icon name="arrow_back" size={17} />
		Retour à la veille
	</a>
	<div class="mag-kicker text-primary">Veille sectorielle FilmPro</div>
	<h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-primary-dark mt-2">Éditeur</h2>
	<p class="text-base text-text-body mt-2 max-w-2xl leading-relaxed">
		Gère les <b>thèmes</b> surveillés et les <b>sources</b> consultées par la veille hebdomadaire.
		Tes réglages sont pris en compte dès la prochaine génération du vendredi.
	</p>
</div>

<div class="mt-5">
	<Tabs
		{tabs}
		active={activeTab}
		onSelect={(k) => (activeTab = k as TabKey)}
		ariaLabel="Sections de l'éditeur"
		tabIdPrefix="editeur-tab"
		panelIdPrefix="editeur-panel"
	/>
</div>

<div class="px-6 py-6 md:px-8 md:py-8">
	{#if activeTab === 'themes'}
		<!-- ============ ONGLET THÈMES ============ -->
		<div id="editeur-panel-themes" role="tabpanel" aria-labelledby="editeur-tab-themes">
			<div class="callout">
				<Icon name="info" size={18} class="callout-ic" />
				<p>
					Les <b>thèmes</b> sont les sujets que la veille recherche chaque semaine. La
					<b>priorité</b> règle l'ordre de remontée dans le brief. Désactive un thème pour
					l'écarter sans perdre l'historique ; supprime-le pour le retirer définitivement.
				</p>
			</div>

			<div class="flex items-center justify-between gap-4 flex-wrap mb-4">
				<label class="search">
					<Icon name="search" size={16} class="text-text-muted" />
					<input type="search" bind:value={themeSearch} placeholder="Rechercher un thème…" aria-label="Rechercher un thème" />
				</label>
				<button type="button" onclick={openCreateTheme} class="btn-primary">
					<Icon name="add" size={17} />
					Nouveau thème
				</button>
			</div>

			<div class="tablecard">
				<div class="thead themes-grid">
					<span>Terme</span>
					<span>Nom affiché</span>
					<span class="hide-sm">Catégorie</span>
					<span class="hide-sm">Priorité</span>
					<span>Statut</span>
					<span class="text-right">Actions</span>
				</div>
				{#each filteredThemes as theme (theme.id)}
					{@const prio = prioriteOf(theme.sort_order)}
					<div class="trow themes-grid" class:off={!theme.active}>
						<span class="font-mono text-[13px] text-text-body">{theme.slug}</span>
						<div>
							<div class="text-sm font-semibold text-text">{theme.label}</div>
							<div class="text-xs text-text-muted mt-0.5 line-clamp-1">{theme.description}</div>
						</div>
						<span class="hide-sm">
							<Badge
								variant={theme.category === 'core' ? 'default' : 'info'}
								label={theme.category === 'core' ? 'Cœur métier' : 'Adjacent'}
								dot
							/>
						</span>
						<span class="hide-sm"><Badge variant={prio.variant} label={prio.label} /></span>
						<span>
							{#if theme.active}
								<Badge variant="success" label="Actif" dot />
							{:else}
								<Badge variant="muted" label="Inactif" />
							{/if}
						</span>
						<div class="actions">
							<button type="button" class="iconbtn" onclick={() => openEditTheme(theme)} aria-label="Modifier le thème {theme.label}">
								<Icon name="edit" size={17} />
							</button>
							<button
								type="button"
								class="iconbtn"
								onclick={() => askToggleTheme(theme)}
								aria-label={theme.active ? `Désactiver ${theme.label}` : `Réactiver ${theme.label}`}
							>
								<Icon name={theme.active ? 'eye_off' : 'eye'} size={17} />
							</button>
							<button type="button" class="iconbtn danger" onclick={() => askDeleteTheme(theme)} aria-label="Supprimer le thème {theme.label}">
								<Icon name="delete" size={17} />
							</button>
						</div>
					</div>
				{:else}
					<div class="empty">Aucun thème ne correspond.</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- ============ ONGLET SOURCES ============ -->
		<div id="editeur-panel-sources" role="tabpanel" aria-labelledby="editeur-tab-sources">
			<div class="callout">
				<Icon name="info" size={18} class="callout-ic" />
				<p>
					Les <b>sources</b> sont les sites que la veille consulte, classés par famille. La
					<b>case à cocher</b> indique si la source est utilisée : décoche-la pour la mettre en
					pause sans la perdre. Le <b>niveau de confiance</b> de chaque famille fixe la rigueur de
					vérification des faits.
				</p>
			</div>

			<div class="conf-legend">
				<div class="cl"><span class="sw bg-success"></span><div><b>Confiance</b><span>Un fait n'est écarté que s'il est contredit par la page (sources reconnues).</span></div></div>
				<div class="cl"><span class="sw bg-info"></span><div><b>Confiance + garde chiffres</b><span>Faits crus, mais chaque chiffre revérifié (associations, lobbies).</span></div></div>
				<div class="cl"><span class="sw bg-warning"></span><div><b>Strict</b><span>Chaque fait doit figurer mot pour mot sur la page (concurrents, cabinets).</span></div></div>
				<div class="cl"><span class="sw bg-danger"></span><div><b>Bloquée</b><span>Filtrée avant vérification (blog marketing, agrégateur spam).</span></div></div>
			</div>

			<div class="flex items-center justify-between gap-3 flex-wrap mb-5">
				<div class="flex items-center gap-2.5 flex-wrap">
					<label class="search">
						<Icon name="search" size={16} class="text-text-muted" />
						<input type="search" bind:value={srcSearch} placeholder="Rechercher une source…" aria-label="Rechercher une source" />
					</label>
					<select class="famsel" bind:value={famFilter} aria-label="Filtrer par famille">
						<option value="">Toutes les familles</option>
						{#each FAMILIES as f (f.key)}
							<option value={f.key}>{f.label}</option>
						{/each}
					</select>
					<div class="flex gap-2 flex-wrap">
						<button type="button" class="chip" aria-pressed={chipConfiance} onclick={() => (chipConfiance = !chipConfiance)}><span class="sw bg-success"></span>Confiance</button>
						<button type="button" class="chip" aria-pressed={chipStrict} onclick={() => (chipStrict = !chipStrict)}><span class="sw bg-warning"></span>Strict</button>
						<button type="button" class="chip" aria-pressed={chipBenchmark} onclick={() => (chipBenchmark = !chipBenchmark)}>Mon benchmark</button>
						<button type="button" class="chip" aria-pressed={chipPause} onclick={() => (chipPause = !chipPause)}>En pause</button>
					</div>
				</div>
				<button type="button" onclick={openCreateSource} class="btn-primary">
					<Icon name="add" size={17} />
					Nouvelle source
				</button>
			</div>

			{#each groupedSources as fam (fam.key)}
				{@const fb = familyBadge(fam.key)}
				{@const isOpen = expanded[fam.key]}
				{@const hidden = Math.max(0, fam.rows.length - TOP_N)}
				<div class="cat">
					<div class="cat-head">
						<div class="min-w-0">
							<h3 class="cat-title">{fam.label}</h3>
							<p class="cat-desc">{fam.desc}</p>
						</div>
						<div class="cat-meta">
							<Badge variant={fb.variant} label={fb.label} dot />
							<span class="cat-count tabular-nums">{fam.rows.length} {fam.rows.length > 1 ? 'sources' : 'source'}</span>
						</div>
					</div>
					<div class="src-card">
						{#each fam.rows as s, i (s.id)}
							{#if i < TOP_N || isOpen}
								<div class="src-row src-grid" class:off={!s.active}>
									<input
										type="checkbox"
										class="chk"
										checked={s.active}
										disabled={toggling[s.id]}
										onchange={() => toggleSource(s)}
										aria-label={s.active ? `Mettre ${s.name} en pause` : `Réactiver ${s.name}`}
									/>
									<div class="min-w-0">
										<div class="src-name-row">
											<span class="src-name">{s.name}</span>
											{#if s.is_new}<span class="tag tag-new">Ajout récent</span>{/if}
											{#if s.is_benchmark}<span class="tag tag-bench">Ton benchmark</span>{/if}
											{#if s.strict_verbatim}
												<Badge variant="danger" label="Strict renforcé" dot />
											{:else if (s.regime as Regime) !== familyDefaultRegime(fam.key)}
												{@const rb = regimeBadge(s.regime as Regime)}
												<Badge variant={rb.variant} label={rb.label} />
											{/if}
										</div>
										<div class="src-domain font-mono">{s.hostname}</div>
									</div>
									<span class="src-desc hide-sm">{s.description || '—'}</span>
									<div class="actions">
										<button type="button" class="iconbtn" onclick={() => openEditSource(s)} aria-label="Modifier {s.name}">
											<Icon name="edit" size={16} />
										</button>
										<button type="button" class="iconbtn danger" onclick={() => askDeleteSource(s)} aria-label="Supprimer {s.name}">
											<Icon name="delete" size={16} />
										</button>
									</div>
								</div>
							{/if}
						{/each}
						{#if hidden > 0}
							<div class="cat-foot">
								<button type="button" class="btn-secondary" onclick={() => (expanded = { ...expanded, [fam.key]: !isOpen })}>
									{isOpen ? 'Réduire' : `Afficher les ${hidden} autres sources`}
									<Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16} />
								</button>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="empty">Aucune source ne correspond aux filtres.</div>
			{/each}

			<p class="text-sm text-text-muted text-center mt-6">
				{activeSourceCount} source{activeSourceCount > 1 ? 's' : ''} active{activeSourceCount > 1 ? 's' : ''}
				sur {data.sources.length} au total.
			</p>
		</div>
	{/if}
</div>

<!-- ===================== MODALE THÈME ===================== -->
<ModalForm
	bind:open={themeModalOpen}
	title={editingTheme ? `Modifier ${editingTheme.label}` : 'Nouveau thème'}
	icon="sell"
	saving={themeSaving}
	maxWidth="max-w-xl"
	onSave={saveTheme}
>
	<div class="space-y-4">
		{#if themeFormError}
			<div class="px-3 py-2 rounded-md bg-danger-light text-danger-deep text-sm" role="alert">{themeFormError}</div>
		{/if}
		<label class="block">
			<span class="lbl">Nom affiché <span class="text-danger-deep">*</span></span>
			<input type="text" bind:value={themeForm.label} oninput={onThemeLabelInput} placeholder="ex. Vitrages haute performance" class="inp" required maxlength="120" />
			<span class="hint">Le libellé lisible, affiché partout dans la veille.</span>
		</label>
		<label class="block">
			<span class="lbl">Terme (identifiant) <span class="text-danger-deep">*</span>{#if editingTheme}<span class="text-text-muted font-normal"> · non modifiable</span>{/if}</span>
			<input type="text" bind:value={themeForm.slug} disabled={!!editingTheme} placeholder="vitrages_haute_performance" class="inp font-mono" required pattern="[a-z][a-z0-9_]*" minlength="2" maxlength="64" />
			<span class="hint">Mot-clé technique unique : minuscules, tirets bas, sans accent. Proposé depuis le nom. Non modifiable une fois créé.</span>
		</label>
		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="lbl">Catégorie</span>
				<select bind:value={themeForm.category} class="inp">
					<option value="core">Cœur métier</option>
					<option value="adjacent">Adjacent</option>
				</select>
			</label>
			<label class="block">
				<span class="lbl">Priorité</span>
				<select bind:value={themeForm.priorite} class="inp">
					<option value="prioritaire">Prioritaire</option>
					<option value="standard">Standard</option>
					<option value="secondaire">Secondaire</option>
				</select>
				<span class="hint">Ordre de remontée dans le brief.</span>
			</label>
		</div>
		<label class="block">
			<span class="lbl">Description (transmise au moteur)</span>
			<textarea bind:value={themeForm.description} rows="2" placeholder="ex. Low-E, triple vitrage, gaz argon, coefficients Ug/Uw" class="inp" maxlength="500"></textarea>
			<span class="hint">Aide le moteur à cerner le sujet. N'apparaît pas dans la veille publiée.</span>
		</label>
	</div>
</ModalForm>

<!-- ===================== MODALE SOURCE ===================== -->
<ModalForm
	bind:open={sourceModalOpen}
	title={editingSource ? `Modifier ${editingSource.name}` : 'Nouvelle source'}
	icon="language"
	saving={sourceSaving}
	maxWidth="max-w-xl"
	onSave={sourceCanSave ? saveSource : undefined}
>
	<div class="space-y-4">
		{#if sourceFormError}
			<div class="px-3 py-2 rounded-md bg-danger-light text-danger-deep text-sm" role="alert">{sourceFormError}</div>
		{/if}
		<label class="block">
			<span class="lbl">Adresse du site (URL) <span class="text-danger-deep">*</span></span>
			<input type="url" bind:value={sourceForm.url} disabled={!!editingSource} placeholder="https://exemple.ch" class="inp font-mono" required />
			<span class="hint">{editingSource ? 'Le domaine identifie la source : non modifiable (supprime puis recrée pour changer de domaine).' : "Le domaine sert d'identifiant à la source."}</span>
		</label>
		<label class="block">
			<span class="lbl">Nom de la source <span class="text-danger-deep">*</span></span>
			<input type="text" bind:value={sourceForm.name} placeholder="ex. Le Nouvelliste" class="inp" required maxlength="160" />
		</label>
		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="lbl">Famille</span>
				<select bind:value={sourceForm.tier} class="inp">
					<option value="T4">Presse généraliste & régionale</option>
					<option value="T1">Officiel, normes & statistiques</option>
					<option value="T2">Presse pro bâtiment & vitrage</option>
					<option value="T5">Tech, R&D & brevets</option>
					<option value="T3">Études de marché & cabinets</option>
					<option value="T6">Concurrents internationaux</option>
					<option value="T7A">Installateurs concurrents (benchmark)</option>
					<option value="T7B">Marques & fabricants (benchmark)</option>
					<option value="">Hors famille (vérification stricte)</option>
				</select>
			</label>
			<div class="block">
				<span class="lbl">Niveau de confiance</span>
				<div class="readonly-regime">
					<Badge variant={sourceRegimePreview.variant} label={sourceRegimePreview.label} dot />
				</div>
				<span class="hint">Calculé depuis la famille et les options. Non modifiable directement.</span>
			</div>
		</div>
		<label class="block">
			<span class="lbl">Descriptif court</span>
			<input type="text" bind:value={sourceForm.description} placeholder="ex. Quotidien valaisan (VS)" class="inp" maxlength="500" />
		</label>
		<div class="flex flex-wrap gap-x-5 gap-y-2 pt-1">
			<label class="opt"><input type="checkbox" bind:checked={sourceForm.is_benchmark} /> Source benchmark (concurrent suivi)</label>
			<label class="opt"><input type="checkbox" bind:checked={sourceForm.strict_verbatim} /> Chiffres surveillés (strict renforcé)</label>
		</div>
		{#if editingSource && (sourceForm.is_advocacy || sourceForm.is_preprint || sourceForm.in_denylist)}
			<p class="struct-note">
				<Icon name="info" size={14} />
				<span>
					Attribut structurel (réglé en base, non modifiable ici) :
					{#if sourceForm.in_denylist}source bloquée.{:else if sourceForm.is_advocacy}association / lobby sectoriel — la confiance garde les chiffres.{:else}préprint non relu — vérification stricte.{/if}
				</span>
			</p>
		{/if}
	</div>
</ModalForm>

<!-- ===================== CONFIRMATIONS ===================== -->
<ConfirmModal
	bind:open={themeToggleOpen}
	title={themeToggleTarget?.active ? 'Désactiver ce thème ?' : 'Réactiver ce thème ?'}
	message={themeToggleTarget
		? themeToggleTarget.active
			? `Le thème « ${themeToggleTarget.label} » ne sera plus surveillé dès la prochaine génération. L'historique reste intact.`
			: `Le thème « ${themeToggleTarget.label} » sera de nouveau surveillé dès la prochaine génération.`
		: ''}
	confirmLabel={themeToggleTarget?.active ? 'Désactiver' : 'Réactiver'}
	variant="warning"
	loading={themeToggleLoading}
	onConfirm={confirmToggleTheme}
/>

<ConfirmModal
	bind:open={themeDeleteOpen}
	title="Supprimer ce thème ?"
	message={themeDeleteTarget
		? `Le thème « ${themeDeleteTarget.label} » sera définitivement retiré. Les éditions déjà publiées restent consultables. Pour le retirer sans le perdre, utilise plutôt « Désactiver ».`
		: ''}
	confirmLabel="Supprimer définitivement"
	cancelLabel="Annuler"
	variant="danger"
	loading={themeDeleteLoading}
	onConfirm={confirmDeleteTheme}
/>

<ConfirmModal
	bind:open={sourceDeleteOpen}
	title="Supprimer cette source ?"
	message={sourceDeleteTarget
		? `« ${sourceDeleteTarget.name} » sera définitivement retirée. Pour un retrait réversible, décoche simplement la source (elle passe « en pause »).`
		: ''}
	confirmLabel="Supprimer définitivement"
	cancelLabel="Annuler"
	variant="danger"
	loading={sourceDeleteLoading}
	onConfirm={confirmDeleteSource}
/>

<style>
	/* Layout structurel (doctrine : <style> scoped pour la structure, Tailwind pour le détail). */
	.mag-kicker {
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-size: 11px;
		font-weight: 700;
	}

	.callout {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		background: var(--color-primary-light);
		border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
		border-radius: var(--radius-lg, 10px);
		padding: 14px 17px;
		margin-bottom: 20px;
	}
	.callout :global(.callout-ic) {
		flex: none;
		color: var(--color-primary);
		margin-top: 1px;
	}
	.callout p {
		margin: 0;
		font-size: 13.5px;
		color: var(--color-primary-dark);
		line-height: 1.55;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--color-surface);
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-md, 8px);
		padding: 9px 13px;
		min-width: 240px;
	}
	.search input {
		border: 0;
		outline: 0;
		font: inherit;
		font-size: 14px;
		width: 100%;
		background: transparent;
		color: var(--color-text);
	}
	.famsel {
		height: 40px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-md, 8px);
		padding: 0 12px;
		font: inherit;
		font-size: 14px;
		color: var(--color-text-body);
		background: var(--color-surface);
		cursor: pointer;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border-radius: var(--radius-lg, 10px);
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
		background: var(--color-primary);
		color: #fff;
		transition: background 180ms ease;
	}
	.btn-primary:hover {
		background: var(--color-primary-hover);
	}
	.btn-primary:active {
		transform: scale(0.98);
	}
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		height: 38px;
		padding: 0 16px;
		border-radius: var(--radius-lg, 10px);
		font: inherit;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
		background: var(--color-surface);
		color: var(--color-text-body);
		border: 1px solid var(--color-border-strong);
	}
	.btn-secondary:hover {
		background: var(--color-surface-alt);
	}

	.chip {
		height: 34px;
		padding: 0 14px;
		border-radius: var(--radius-full, 9999px);
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-text-body);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 150ms ease;
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.chip:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.chip[aria-pressed='true'] {
		background: var(--color-primary-dark);
		border-color: var(--color-primary-dark);
		color: #fff;
	}
	.sw {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex: none;
	}

	/* Tables thèmes */
	.tablecard {
		background: var(--color-surface);
		border-radius: var(--radius-xl, 12px);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}
	.thead,
	.trow {
		display: grid;
		align-items: center;
		gap: 16px;
		padding: 0 20px;
	}
	.themes-grid {
		grid-template-columns: minmax(140px, 1fr) minmax(160px, 1.3fr) 140px 130px 100px 116px;
	}
	.thead {
		height: 46px;
		background: var(--color-surface-alt);
		border-bottom: 1px solid var(--color-border);
		font-size: 11.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}
	.trow {
		min-height: 70px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-text) 5%, transparent);
		transition: background 160ms ease;
	}
	.trow:last-child {
		border-bottom: 0;
	}
	.trow:hover {
		background: color-mix(in srgb, var(--color-primary) 3%, transparent);
	}
	.trow.off,
	.src-row.off {
		opacity: 0.5;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 4px;
		justify-content: flex-end;
	}
	.iconbtn {
		width: 34px;
		height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md, 8px);
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 150ms ease;
	}
	.iconbtn:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.iconbtn.danger:hover {
		background: var(--color-danger-light);
		color: var(--color-danger-deep);
	}
	.iconbtn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.empty {
		padding: 40px 20px;
		text-align: center;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	/* Légende confiance */
	.conf-legend {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px 22px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg, 10px);
		padding: 16px 18px;
		margin-bottom: 20px;
	}
	.cl {
		display: flex;
		gap: 10px;
		align-items: flex-start;
	}
	.cl .sw {
		width: 12px;
		height: 12px;
		border-radius: 4px;
		margin-top: 3px;
	}
	.cl b {
		display: block;
		font-size: 13px;
		color: var(--color-text);
	}
	.cl span {
		font-size: 12.5px;
		color: var(--color-text-muted);
		line-height: 1.45;
	}
	.bg-success {
		background: var(--color-success);
	}
	.bg-info {
		background: var(--color-info);
	}
	.bg-warning {
		background: var(--color-warning);
	}
	.bg-danger {
		background: var(--color-danger);
	}

	/* Catégories de sources */
	.cat {
		margin-bottom: 22px;
	}
	.cat-head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px 20px;
		background: var(--color-primary-dark);
		color: #fff;
		border-radius: var(--radius-xl, 12px) var(--radius-xl, 12px) 0 0;
	}
	.cat-title {
		font-size: 15.5px;
		font-weight: 700;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.cat-desc {
		font-size: 12.5px;
		color: rgba(255, 255, 255, 0.68);
		margin: 4px 0 0;
		line-height: 1.45;
	}
	.cat-meta {
		margin-left: auto;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 7px;
		flex: none;
	}
	.cat-count {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.82);
		font-weight: 600;
	}
	.src-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: 0;
		border-radius: 0 0 var(--radius-xl, 12px) var(--radius-xl, 12px);
		overflow: hidden;
	}
	.src-grid {
		display: grid;
		align-items: center;
		gap: 16px;
		padding: 0 20px;
		grid-template-columns: 40px minmax(200px, 1.6fr) minmax(150px, 1fr) 84px;
	}
	.src-row {
		min-height: 68px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-text) 5%, transparent);
		transition: background 160ms ease;
	}
	.src-row:last-of-type {
		border-bottom: 0;
	}
	.src-row:hover {
		background: color-mix(in srgb, var(--color-primary) 3%, transparent);
	}
	.src-name-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.src-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
	}
	.src-domain {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 3px;
	}
	.src-desc {
		font-size: 13px;
		color: var(--color-text-body);
	}
	.cat-foot {
		display: flex;
		justify-content: center;
		padding: 14px 20px;
		background: var(--color-surface-alt);
		border-top: 1px solid var(--color-border);
	}

	.chk {
		width: 19px;
		height: 19px;
		border-radius: 5px;
		border: 1.8px solid var(--color-border-strong);
		background: var(--color-surface);
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		position: relative;
		transition: all 140ms ease;
		flex: none;
	}
	.chk:checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
	.chk:checked::after {
		content: '';
		position: absolute;
		left: 5.5px;
		top: 2px;
		width: 5px;
		height: 9px;
		border: solid #fff;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}
	.chk:hover {
		border-color: var(--color-primary);
	}
	.chk:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.tag {
		font-size: 10.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 3px 8px;
		border-radius: var(--radius-sm, 6px);
	}
	.tag-bench {
		background: var(--color-primary-light);
		color: var(--color-primary-hover);
	}
	.tag-new {
		background: var(--color-primary-dark);
		color: #cfe0ff;
	}

	/* Modale : champs */
	.lbl {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 6px;
	}
	.hint {
		display: block;
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 6px;
		line-height: 1.45;
	}
	.inp {
		width: 100%;
		font: inherit;
		font-size: 14px;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-md, 8px);
		padding: 10px 11px;
		outline: none;
		transition:
			border-color 150ms,
			box-shadow 150ms;
	}
	.inp:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
	}
	.inp:disabled {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	.readonly-regime {
		display: flex;
		align-items: center;
		min-height: 42px;
		padding: 0 2px;
	}
	.opt {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text-body);
		cursor: pointer;
	}
	.struct-note {
		display: flex;
		align-items: flex-start;
		gap: 7px;
		margin: 4px 0 0;
		padding: 9px 11px;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--color-text-muted);
		background: var(--color-surface-alt);
		border-radius: var(--radius-md, 8px);
	}
	.struct-note :global(svg) {
		flex: none;
		margin-top: 2px;
		color: var(--color-text-muted);
	}

	@media (max-width: 860px) {
		.themes-grid {
			grid-template-columns: 1.2fr 96px 116px;
		}
		.src-grid {
			grid-template-columns: 40px 1.4fr 84px;
		}
		.hide-sm {
			display: none;
		}
		.conf-legend {
			grid-template-columns: 1fr;
		}
	}
</style>
