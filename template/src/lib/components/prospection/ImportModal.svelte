<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { config } from '$lib/config';
	import { invalidateAll } from '$app/navigation';
	import { API_LIMITS } from '$lib/api-limits';
	import { cantonNoms } from '$lib/prospection-utils';

	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];

	type ImportSourceKey = 'zefix' | 'simap' | 'regbl';

	let {
		open = $bindable(false),
		importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null),
		fromIntelligence = null,
		fromTerm = null,
		// F-V4-05 audit S163 : import contextuel par onglet /prospection.
		// Si null/undefined → toutes sources visibles (rétrocompat).
		// Si liste → seules ces sources sont proposées (les autres tabs sont masqués).
		allowedSources = null,
		// Tab initial. Si non précisé, prend la 1re source autorisée.
		defaultSource = null,
		// Titre modale custom (sinon "Importer des prospects").
		title = null,
	}: {
		open: boolean;
		importResult: { message: string; type: 'success' | 'error' } | null;
		fromIntelligence?: string | null;
		fromTerm?: string | null;
		allowedSources?: ImportSourceKey[] | null;
		defaultSource?: ImportSourceKey | null;
		title?: string | null;
	} = $props();

	let importing = $state(false);
	const allowed = $derived.by(() => allowedSources);
	const fallback = $derived.by(() => defaultSource);
	// svelte-ignore state_referenced_locally
	let activeTab = $state<ImportSourceKey>(
		defaultSource ?? (allowedSources && allowedSources.length > 0 ? allowedSources[0] : 'zefix')
	);

	// Resync activeTab si allowedSources change (ex: utilisateur change d'onglet /prospection
	// pendant que la modale est ouverte = edge case, mais on re-ancre proprement).
	$effect(() => {
		if (allowed && allowed.length > 0 && !allowed.includes(activeTab)) {
			activeTab = fallback ?? allowed[0];
		}
	});

	let importCanton = $state('GE');
	let importLimit = $state('50');
	let importZefixName = $state('');
	let importSimapSearch = $state('');
	let importSimapDays = $state('30');
	let importRegblCantons = $state<string[]>(['GE', 'VD']);

	const zefixMaxResults = API_LIMITS.zefix.maxResultsPerQuery;

	let simapSearchInvalid = $derived(
		importSimapSearch.trim().length > 0 && importSimapSearch.trim().length < 3
	);

	let zefixNameInvalid = $derived(importZefixName.trim().length < 2);

	// F-V4-06 audit S164 : metadata premium par source pour différenciation visuelle/UX forte.
	// Chaque source a son propre layout (search-first / period-first / map-first), son icône
	// d'action métier (search / pulse / construction), son verbe explicite et son footer pédagogique.
	type SourceMeta = {
		code: string;
		title: string;
		subtitle: string;
		hero: { icon: string; kicker: string; promise: string; helper: string };
		action: { icon: string; label: string; pendingLabel: string };
		footer: { icon: string; text: string };
		cssVar: string;
		bgCssVar: string;
		borderCssVar: string;
	};

	const sourceMeta: Record<ImportSourceKey, SourceMeta> = {
		zefix: {
			code: 'RC',
			title: 'Registre du commerce',
			subtitle: 'Entreprises actives par secteur',
			hero: {
				icon: 'business',
				kicker: 'Recherche par mot-clé',
				promise: 'Trouvez des entreprises suisses actives par raison sociale ou secteur d\'activité.',
				helper: 'Mieux vaut 50 prospects ciblés que 500 à trier - filtrez sur un terme précis (vitrerie, façade, architecte).',
			},
			action: { icon: 'search', label: 'Rechercher dans le registre', pendingLabel: 'Recherche en cours…' },
			footer: { icon: 'verified', text: 'But social, capital nominal, adresse légale officielle. Dédupliqué automatiquement.' },
			cssVar: '--color-prosp-import',
			bgCssVar: '--color-prosp-import-bg',
			borderCssVar: '--color-prosp-import-border',
		},
		simap: {
			code: 'SIMAP',
			title: 'Marchés publics',
			subtitle: 'Appels d\'offres récents',
			hero: {
				icon: 'gavel',
				kicker: 'Veille sur les appels d\'offres',
				promise: 'Scannez les marchés publics construction publiés par la Confédération, les cantons et les communes.',
				helper: 'Filtrez par période courte si vous voulez attaquer vite, ou élargie pour reconstruire la pipeline.',
			},
			action: { icon: 'monitor_heart', label: 'Scanner les marchés publics', pendingLabel: 'Scan en cours…' },
			footer: { icon: 'schedule', text: 'Budget, délai, lieu d\'exécution et critères d\'attribution inclus dans chaque marché.' },
			cssVar: '--color-prosp-qualify',
			bgCssVar: '--color-prosp-qualify-bg',
			borderCssVar: '--color-prosp-qualify-border',
		},
		regbl: {
			code: 'RegBL',
			title: 'Registre des bâtiments',
			subtitle: 'Chantiers actifs en Suisse',
			hero: {
				icon: 'apartment',
				kicker: 'Cartographie des chantiers',
				promise: 'Scannez les bâtiments autorisés ou en construction dans les cantons que vous ciblez.',
				helper: 'Signal chaud : un permis délivré aujourd\'hui = un chantier ouvert demain. Croisez ensuite avec le registre du commerce pour le maître d\'ouvrage.',
			},
			action: { icon: 'construction', label: 'Scanner les chantiers actifs', pendingLabel: 'Scan en cours…' },
			footer: { icon: 'place', text: 'Coordonnées GPS, statut chantier (autorisé / en construction), affectation programmée.' },
			cssVar: '--color-prosp-convert',
			bgCssVar: '--color-prosp-convert-bg',
			borderCssVar: '--color-prosp-convert-border',
		},
	};

	const allTabs: ImportSourceKey[] = ['zefix', 'simap', 'regbl'];

	// Filtrage déterministe par allowedSources (préserve l'ordre canonique).
	let visibleTabs = $derived(
		allowed && allowed.length > 0
			? allTabs.filter((k) => allowed.includes(k))
			: allTabs
	);

	let activeMeta = $derived(sourceMeta[activeTab]);

	const simapPeriods = [
		{ value: '7', label: '7 jours', sub: 'Urgences chaudes' },
		{ value: '30', label: '30 jours', sub: 'Pipeline du mois' },
		{ value: '90', label: '3 mois', sub: 'Reconstruction large' },
	];

	const zefixLimits = [
		{ value: '20', label: '20', sub: 'Très ciblé' },
		{ value: '50', label: '50', sub: 'Recommandé' },
		{ value: '100', label: '100', sub: 'Large balayage' },
	];

	async function importFromSource(url: string, body: Record<string, unknown>) {
		importing = true;
		importResult = null;
		const bodyWithTrace = {
			...body,
			...(fromIntelligence ? { from_intelligence: fromIntelligence } : {}),
			...(fromTerm ? { from_term: fromTerm } : {}),
		};
		try {
			const resp = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bodyWithTrace),
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
		if (zefixNameInvalid) return;
		return importFromSource('/api/prospection/zefix', {
			canton: importCanton,
			name: importZefixName.trim(),
			activeOnly: true,
			limit: Number(importLimit) || 100,
		});
	}

	function importSimap() {
		const search = importSimapSearch.trim();
		return importFromSource('/api/prospection/simap', {
			canton: importCanton,
			search: search.length >= 3 ? search : undefined,
			daysBack: Number(importSimapDays) || 30,
		});
	}

	function importRegbl() {
		return importFromSource('/api/prospection/regbl', {
			cantons: importRegblCantons,
			limit: Number(importLimit) || 50,
		});
	}

	function toggleCanton(list: string[], canton: string): string[] {
		return list.includes(canton) ? list.filter(c => c !== canton) : [...list, canton];
	}

	// Pattern ARIA tabs (cohérent avec ProspectionTabs S162 V2.1) : ArrowLeft/Right + Home/End,
	// roving tabindex sur les cards source. Wrap circulaire pour ergonomie clavier power-user.
	function handleSourceTabsKeydown(e: KeyboardEvent, key: ImportSourceKey) {
		const tabs = visibleTabs;
		if (tabs.length <= 1) return;
		const idx = tabs.indexOf(key);
		let next = idx;
		if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
		else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = tabs.length - 1;
		else return;
		e.preventDefault();
		const targetKey = tabs[next];
		activeTab = targetKey;
		importResult = null;
		// Focus la card cible (timeout 0 pour laisser Svelte appliquer tabindex=0).
		queueMicrotask(() => {
			const el = document.getElementById(`tab-${targetKey}`);
			el?.focus();
		});
	}
</script>

<ModalForm
	bind:open
	title={title ?? 'Importer des prospects'}
	icon="cloud_download"
	headerVariant="accent"
	saving={importing}
	maxWidth="max-w-3xl"
>
	<div class="space-y-5">
		<!-- F-V4-06 : sélecteur de source en CARDS distinctes, masqué si parcours unique (F-V4-05).
		     Layout cards = chaque source vue d'un coup d'œil avant clic, pas un tab horizontal anonyme. -->
		{#if visibleTabs.length > 1}
			<div role="tablist" aria-label="Source d'import" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each visibleTabs as key}
					{@const m = sourceMeta[key]}
					{@const active = activeTab === key}
					<button
						type="button"
						role="tab"
						id="tab-{key}"
						aria-selected={active}
						aria-controls="import-panel-{key}"
						tabindex={active ? 0 : -1}
						onclick={() => { activeTab = key; importResult = null; }}
						onkeydown={(e) => handleSourceTabsKeydown(e, key)}
						class="group relative text-left p-4 rounded-xl border-2 box-border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 {active ? 'shadow-md' : 'border-border hover:border-text-muted/40 hover:shadow-sm bg-white'}"
						style={active
							? `border-color: var(${m.cssVar}); background: var(${m.bgCssVar}); --tw-ring-color: var(${m.cssVar});`
							: `--tw-ring-color: var(${m.cssVar});`}
					>
						<div class="flex items-center justify-between mb-2.5">
							<div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background: {active ? 'rgba(255,255,255,0.6)' : `var(${m.bgCssVar})`};">
								<span style={`color: var(${m.cssVar});`}><Icon name={m.hero.icon} size={20} /></span>
							</div>
							<span class="text-[10px] font-bold uppercase tracking-wider" style={`color: var(${m.cssVar}); opacity: ${active ? 1 : 0.7};`}>
								{m.code}
							</span>
						</div>
						<p class="text-sm font-semibold text-text leading-tight">{m.title}</p>
						<p class="text-xs text-text-muted mt-1 leading-snug">{m.subtitle}</p>
					</button>
				{/each}
			</div>
		{/if}

		<!-- ZEFIX parcours : SEARCH-FIRST (input nom prominent en grand, filtres secondaires en chips) -->
		{#if activeTab === 'zefix'}
			<div id="import-panel-zefix" role="tabpanel" aria-labelledby={visibleTabs.length > 1 ? 'tab-zefix' : undefined}
				aria-label={visibleTabs.length === 1 ? sourceMeta.zefix.title : undefined} class="space-y-5">
				<!-- Hero pédagogique riche -->
				<div class="p-5 rounded-2xl flex gap-4" style={`background: var(${activeMeta.bgCssVar}); border: 1px solid color-mix(in srgb, var(${activeMeta.borderCssVar}), transparent 70%);`}>
					<div class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={`background: color-mix(in srgb, var(${activeMeta.cssVar}), transparent 88%);`}>
						<span style={`color: var(${activeMeta.cssVar});`}><Icon name={activeMeta.hero.icon} size={26} /></span>
					</div>
					<div>
						<p class="text-xs font-bold uppercase tracking-wider mb-1" style={`color: var(${activeMeta.cssVar});`}>{activeMeta.hero.kicker}</p>
						<p class="text-sm font-semibold text-text">{activeMeta.hero.promise}</p>
						<p class="text-xs text-text-body mt-1.5 leading-relaxed">{activeMeta.hero.helper}</p>
					</div>
				</div>

				<!-- Search input PROMINENT (h-12, icône intégrée, signature visuelle "search-first") -->
				<div>
					<label for="zefix-name" class="block text-sm font-semibold text-text mb-2">
						Mot-clé secteur ou raison sociale
						<span class="font-normal text-danger ml-0.5">*</span>
					</label>
					<div class="relative">
						<Icon name="search" size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
						<input
							id="zefix-name"
							type="text"
							required
							bind:value={importZefixName}
							placeholder="vitrerie, façade, architecte, construction…"
							class="w-full h-12 pl-11 pr-3 text-base box-border border-2 rounded-lg bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors {zefixNameInvalid ? 'border-danger' : 'border-border'}"
						/>
					</div>
					{#if zefixNameInvalid}
						<p class="text-xs text-danger mt-1.5 flex items-center gap-1.5">
							<Icon name="error" size={13} />
							Saisir au moins 2 caractères. L'API Zefix exige un filtre par nom.
						</p>
					{:else}
						<p class="text-xs text-text-muted mt-1.5">Recherche insensible à la casse, max {zefixMaxResults} résultats par requête.</p>
					{/if}
				</div>

				<!-- Filtres canton + résultats : 2 cols, équilibre visuel -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="zefix-canton" class="block text-sm font-medium text-text mb-1.5">Canton</label>
						<select id="zefix-canton" bind:value={importCanton} class="w-full h-10 px-3 text-sm box-border border border-border rounded-lg bg-white">
							{#each cantons as c}
								<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
							{/each}
						</select>
					</div>
					<div>
						<span class="block text-sm font-medium text-text mb-1.5">Volumétrie souhaitée</span>
						<div class="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Nombre de résultats">
							{#each zefixLimits as opt}
								{@const sel = importLimit === opt.value}
								<button
									type="button"
									role="radio"
									aria-checked={sel}
									onclick={() => importLimit = opt.value}
									class="flex flex-col items-center justify-center h-10 px-2 box-border border rounded-lg cursor-pointer transition-colors {sel ? 'text-white shadow-sm' : 'border-border bg-white text-text-muted hover:border-text-muted/40 hover:text-text'}"
									style={sel ? `background-color: var(${activeMeta.cssVar}); border-color: var(${activeMeta.cssVar});` : ''}
								>
									<span class="text-sm font-semibold leading-none">{opt.label}</span>
									<span class="text-[10px] mt-0.5 leading-none {sel ? 'opacity-90' : ''}">{opt.sub}</span>
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- SIMAP parcours : PERIOD-FIRST (chips horizontaux période, ton "veille en flux") -->
		{#if activeTab === 'simap'}
			<div id="import-panel-simap" role="tabpanel" aria-labelledby={visibleTabs.length > 1 ? 'tab-simap' : undefined}
				aria-label={visibleTabs.length === 1 ? sourceMeta.simap.title : undefined} class="space-y-5">
				<div class="p-5 rounded-2xl flex gap-4" style={`background: var(${activeMeta.bgCssVar}); border: 1px solid color-mix(in srgb, var(${activeMeta.borderCssVar}), transparent 70%);`}>
					<div class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={`background: color-mix(in srgb, var(${activeMeta.cssVar}), transparent 88%);`}>
						<span style={`color: var(${activeMeta.cssVar});`}><Icon name={activeMeta.hero.icon} size={26} /></span>
					</div>
					<div>
						<p class="text-xs font-bold uppercase tracking-wider mb-1" style={`color: var(${activeMeta.cssVar});`}>{activeMeta.hero.kicker}</p>
						<p class="text-sm font-semibold text-text">{activeMeta.hero.promise}</p>
						<p class="text-xs text-text-body mt-1.5 leading-relaxed">{activeMeta.hero.helper}</p>
					</div>
				</div>

				<!-- Période en CHIPS XL (signature visuelle "period-first" différencie SIMAP de Zefix) -->
				<div>
					<span class="block text-sm font-semibold text-text mb-2">Fenêtre de veille</span>
					<div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Période">
						{#each simapPeriods as p}
							{@const sel = importSimapDays === p.value}
							<button
								type="button"
								role="radio"
								aria-checked={sel}
								onclick={() => importSimapDays = p.value}
								class="flex flex-col items-center justify-center py-3 px-2 box-border border-2 rounded-xl cursor-pointer transition-all {sel ? 'shadow-md' : 'border-border bg-white text-text-muted hover:border-text-muted/40 hover:text-text'}"
								style={sel
									? `border-color: var(${activeMeta.cssVar}); background: var(${activeMeta.bgCssVar}); color: var(${activeMeta.cssVar});`
									: ''}
							>
								<span class="text-base font-bold leading-tight">{p.label}</span>
								<span class="text-[11px] mt-0.5 leading-tight">{p.sub}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Filtres canton + mots-clés : 2 cols -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="simap-canton" class="block text-sm font-medium text-text mb-1.5">Canton</label>
						<select id="simap-canton" bind:value={importCanton} class="w-full h-10 px-3 text-sm box-border border border-border rounded-lg bg-white">
							{#each cantons as c}
								<option value={c}>{cantonNoms[c] ?? c} ({c})</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="simap-search" class="block text-sm font-medium text-text mb-1.5">
							Mots-clés
							<span class="font-normal text-text-muted">(optionnel)</span>
						</label>
						<input
							id="simap-search"
							type="text"
							bind:value={importSimapSearch}
							placeholder="rénovation, façade…"
							class="w-full h-10 px-3 text-sm box-border border rounded-lg bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary {simapSearchInvalid ? 'border-danger' : 'border-border'}"
						/>
						{#if simapSearchInvalid}
							<p class="text-xs text-danger mt-1">Min. 3 caractères ou laisser vide.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- REGBL parcours : MAP-FIRST (cantons en chips XL grille, signature visuelle "carto") -->
		{#if activeTab === 'regbl'}
			<div id="import-panel-regbl" role="tabpanel" aria-labelledby={visibleTabs.length > 1 ? 'tab-regbl' : undefined}
				aria-label={visibleTabs.length === 1 ? sourceMeta.regbl.title : undefined} class="space-y-5">
				<div class="p-5 rounded-2xl flex gap-4" style={`background: var(${activeMeta.bgCssVar}); border: 1px solid color-mix(in srgb, var(${activeMeta.borderCssVar}), transparent 70%);`}>
					<div class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={`background: color-mix(in srgb, var(${activeMeta.cssVar}), transparent 88%);`}>
						<span style={`color: var(${activeMeta.cssVar});`}><Icon name={activeMeta.hero.icon} size={26} /></span>
					</div>
					<div>
						<p class="text-xs font-bold uppercase tracking-wider mb-1" style={`color: var(${activeMeta.cssVar});`}>{activeMeta.hero.kicker}</p>
						<p class="text-sm font-semibold text-text">{activeMeta.hero.promise}</p>
						<p class="text-xs text-text-body mt-1.5 leading-relaxed">{activeMeta.hero.helper}</p>
					</div>
				</div>

				<!-- Cantons en CHIPS XL (signature visuelle "map-first" : grille riche, pas un menu select) -->
				<fieldset>
					<legend class="block text-sm font-semibold text-text mb-2">
						Périmètre géographique
						<span class="font-normal text-text-muted">({importRegblCantons.length} sélectionné{importRegblCantons.length > 1 ? 's' : ''})</span>
					</legend>
					<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
						{#each cantons as c}
							{@const sel = importRegblCantons.includes(c)}
							<button
								type="button"
								aria-pressed={sel}
								onclick={() => importRegblCantons = toggleCanton(importRegblCantons, c)}
								class="flex flex-col items-center justify-center py-3 px-2 box-border border-2 rounded-xl cursor-pointer transition-all {sel ? 'shadow-sm' : 'border-border bg-white text-text-muted hover:border-text-muted/40 hover:text-text'}"
								style={sel
									? `border-color: var(${activeMeta.cssVar}); background: var(${activeMeta.bgCssVar}); color: var(${activeMeta.cssVar});`
									: ''}
							>
								<span class="text-base font-bold leading-none">{c}</span>
								<span class="text-[10px] mt-1 leading-none">{cantonNoms[c] ?? c}</span>
							</button>
						{/each}
					</div>
				</fieldset>

				<!-- Volumétrie : alignée pattern Zefix mais cohérent avec couleur source (convert) -->
				<div>
					<span class="block text-sm font-medium text-text mb-1.5">Volumétrie souhaitée</span>
					<div class="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Nombre de résultats">
						{#each zefixLimits as opt}
							{@const sel = importLimit === opt.value}
							<button
								type="button"
								role="radio"
								aria-checked={sel}
								onclick={() => importLimit = opt.value}
								class="flex flex-col items-center justify-center h-10 px-2 box-border border rounded-lg cursor-pointer transition-colors {sel ? 'text-white shadow-sm' : 'border-border bg-white text-text-muted hover:border-text-muted/40 hover:text-text'}"
								style={sel ? `background-color: var(${activeMeta.cssVar}); border-color: var(${activeMeta.cssVar});` : ''}
							>
								<span class="text-sm font-semibold leading-none">{opt.label}</span>
								<span class="text-[10px] mt-0.5 leading-none {sel ? 'opacity-90' : ''}">{opt.sub}</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Footer pédagogique commun (identique à toutes les sources mais texte source-specific) -->
		<div class="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-surface-alt border border-border/60">
			<Icon name={activeMeta.footer.icon} size={16} class="mt-0.5 shrink-0 text-text-muted" />
			<p class="text-xs text-text-body leading-relaxed">{activeMeta.footer.text}</p>
		</div>

		<!-- Résultat import (succès / erreur) -->
		{#if importResult}
			<div role="alert" class="flex items-center gap-3 p-4 rounded-lg text-sm {importResult.type === 'success' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}">
				<Icon name={importResult.type === 'success' ? 'check_circle' : 'error'} />
				<span class="font-medium">{importResult.message}</span>
			</div>
		{/if}

		<!-- CTA pleine largeur, couleur source-specific, verbe action distinct -->
		<button
			type="button"
			onclick={activeTab === 'zefix' ? importZefix : (activeTab === 'simap' ? importSimap : importRegbl)}
			disabled={importing
				|| (activeTab === 'zefix' && zefixNameInvalid)
				|| (activeTab === 'simap' && simapSearchInvalid)
				|| (activeTab === 'regbl' && importRegblCantons.length === 0)}
			class="w-full inline-flex items-center justify-center gap-2 h-12 px-4 box-border text-base font-semibold text-white rounded-xl disabled:opacity-50 cursor-pointer shadow-md transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
			style={`background-color: var(${activeMeta.cssVar}); --tw-ring-color: var(${activeMeta.cssVar});`}
		>
			<Icon name={activeMeta.action.icon} size={18} />
			{importing ? activeMeta.action.pendingLabel : activeMeta.action.label}
		</button>
	</div>
</ModalForm>
