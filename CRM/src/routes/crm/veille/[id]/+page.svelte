<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { toasts } from '$lib/stores/toast';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type {
		IntelligenceItem,
		ImpactFilmpro
	} from '$lib/server/intelligence/schema';
	import {
		themeLabel,
		themeLabelMap,
		maturityLabel,
		geoScopeLabel,
		impactAxisLabel,
		chipKindLabel
	} from '$lib/utils/veilleFormat';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		$pageSubtitle = `Édition ${data.report.week_label}`;
	});

	const items = $derived(data.report.items as IntelligenceItem[]);
	const impacts = $derived(data.report.impacts_filmpro as ImpactFilmpro[]);
	const aggregatedChips = $derived(data.aggregatedChips ?? []);
	// Libellés humains des thèmes (slug DB -> label), jamais le slug brut (Pascal W25 #1).
	const themeLabels = $derived(themeLabelMap(data.activeThemes));

	let chipLoading = $state<number | null>(null);

	// Ajout manuel item
	let addItemOpen = $state(false);
	let addItemSaving = $state(false);
	let addItemError = $state<string | null>(null);
	// Seed initial du formulaire depuis data (capture voulue : objet mutable ensuite)
	// svelte-ignore state_referenced_locally
	let manualItem = $state({
		title: '',
		summary: '',
		filmpro_relevance: '',
		url: '',
		source_name: '',
		published_at: new Date().toISOString().slice(0, 10),
		theme: data.activeThemes[0]?.slug ?? 'autre',
		segment: 'tertiaire',
		geo_scope: 'suisse_romande',
		maturity: 'etabli',
		actionability: 'veille_active'
	});

	async function submitAddItem() {
		addItemSaving = true;
		addItemError = null;
		const fd = new FormData();
		Object.entries(manualItem).forEach(([k, v]) => fd.append(k, String(v)));
		try {
			const res = await fetch('?/addItem', { method: 'POST', body: fd });
			const text = await res.text();
			const { deserialize, applyAction } = await import('$app/forms');
			const result = deserialize(text);
			if (result.type === 'success') {
				toasts.success(
					(result.data as { message?: string } | undefined)?.message ?? 'Item ajouté.'
				);
				addItemOpen = false;
				manualItem = {
					...manualItem,
					title: '',
					summary: '',
					filmpro_relevance: '',
					url: '',
					source_name: ''
				};
				const { invalidateAll } = await import('$app/navigation');
				await invalidateAll();
				await applyAction(result);
			} else if (result.type === 'failure') {
				addItemError = (result.data as { error?: string } | undefined)?.error ?? 'Erreur';
			} else {
				addItemError = 'Erreur inattendue';
			}
		} catch (err) {
			addItemError = err instanceof Error ? err.message : 'Erreur réseau';
		} finally {
			addItemSaving = false;
		}
	}

	// KIND_ICONS reste local : ce sont des icônes Material (pas des libellés). Les
	// libellés enum (theme/maturity/geo/impact/kind) passent par $lib/utils/veilleFormat
	// (source unique, anti-fuite underscore, Pascal W25 #1).
	const KIND_ICONS: Record<string, string> = {
		simap: 'gavel',
		zefix: 'business',
		regbl: 'construction'
	};

	const COMPLIANCE_STYLES: Record<string, string> = {
		'OK FilmPro': 'bg-success-light text-success-deep border-success/20',
		'Adjacent pertinent': 'bg-info-light text-info-deep border-info/20',
		'À surveiller': 'bg-warning-light text-warning-deep border-warning/20',
		'Non exploitable': 'bg-surface-alt text-text-muted border-border'
	};

	const MATURITY_STYLES: Record<string, string> = {
		etabli: 'bg-success-light text-success-deep',
		emergent: 'bg-warning-light text-warning-deep',
		speculatif: 'bg-surface-alt text-text-muted'
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function editionNumber(weekLabel: string): string {
		const match = weekLabel.match(/W(\d+)/);
		return match ? match[1] : weekLabel;
	}

	async function copyTerm(term: string) {
		try {
			await navigator.clipboard.writeText(term);
			toasts.success('Terme copié');
		} catch {
			toasts.error('Copie impossible');
		}
	}

	async function copyAllTerms() {
		const text = aggregatedChips.map((a) => a.chip.query).join('\n');
		try {
			await navigator.clipboard.writeText(text);
			toasts.success(`${aggregatedChips.length} termes copiés`);
		} catch {
			toasts.error('Copie impossible');
		}
	}

	async function runChipSearch(idx: number) {
		if (chipLoading !== null) return;
		const entry = aggregatedChips[idx];
		if (!entry) return;
		chipLoading = idx;
		try {
			const resp = await fetch('/api/prospection/from-intelligence', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chip: entry.chip,
					report_id: data.report.id,
					item_rank: entry.item_rank
				})
			});
			const result = await resp.json();
			if (!resp.ok) {
				toasts.error(`Échec import : ${result?.error ?? resp.statusText}`);
				return;
			}
			goto(result.redirect, { invalidateAll: true });
		} catch (err) {
			toasts.error(`Erreur réseau : ${String(err)}`);
		} finally {
			chipLoading = null;
		}
	}
</script>

<div class="max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-12">
	<div class="mb-6">
		<a
			href="/crm/veille"
			class="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
		>
			<Icon name="arrow_back" size={16} />
			Retour au flux
		</a>
	</div>

	<!-- Masthead éditorial -->
	<header class="pb-6 md:pb-8 mb-10 md:mb-14 border-b-2 border-primary-dark">
		<div class="flex items-start justify-between gap-6 flex-wrap">
			<div class="flex-1 min-w-0 max-w-3xl">
				<div class="mag-kicker text-primary mb-3">Veille sectorielle FilmPro</div>
				<!-- Audit 360 V2c H-26 : h2 (le h1 unique de la page est dans Header.svelte). -->
				<h2 class="mag-display text-[40px] md:text-6xl text-primary-dark">
					Édition n° {editionNumber(data.report.week_label)}
				</h2>
				<p class="mag-body text-text-body mt-4 text-base md:text-[17px]">
					{data.report.week_label} · panorama hebdomadaire des marchés bâtiment, films
					solaires, vitrages et réglementation pour servir vos décisions commerciales.
				</p>
			</div>
			<div class="shrink-0 flex flex-col items-end gap-6">
				<button
					type="button"
					onclick={() => (addItemOpen = true)}
					class="h-9 px-3 inline-flex items-center gap-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				>
					<Icon name="add" size={16} />
					Ajouter un item
				</button>
				<div class="text-right">
					<div class="mag-kicker text-text-muted">Publiée le</div>
					<div class="text-sm font-semibold text-text mt-1">
						{formatDate(data.report.generated_at)}
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- HERO COUVERTURE : aside navy + synthèse -->
	<section class="mb-14 md:mb-20">
		<div class="flex items-end gap-3 mb-6">
			<div class="mag-kicker text-primary">Couverture éditoriale</div>
			<div class="h-px flex-1 bg-border mb-2"></div>
		</div>

		<article
			class="bg-white rounded-xl border border-border shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12"
		>
			<!-- Aside : couverture du numéro -->
			<aside
				class="bg-primary-dark text-white p-8 lg:p-10 lg:col-span-4 flex flex-col justify-between gap-8 relative overflow-hidden"
			>
				<div
					class="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/[0.04] pointer-events-none"
				></div>
				<div
					class="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none"
				></div>
				<div class="relative">
					<div class="mag-kicker text-white/55 mb-2">Édition n°</div>
					<div
						class="mag-display text-[88px] md:text-[112px] lg:text-[104px] xl:text-[120px] text-white leading-[0.85] tabular-nums"
					>
						{editionNumber(data.report.week_label)}
					</div>
					<div class="mt-6 text-sm text-white/85 font-semibold">
						{data.report.week_label}
					</div>
					<div class="text-xs text-white/55 mt-1">
						{formatDate(data.report.generated_at)}
					</div>
				</div>
				<div class="relative space-y-3">
					<span
						class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border {COMPLIANCE_STYLES[
							data.report.compliance_tag
						] ?? 'bg-white/10 text-white border-white/20'}"
					>
						{data.report.compliance_tag}
					</span>
					<dl class="grid grid-cols-3 gap-3 text-white pt-2">
						<div>
							<dt class="mag-kicker text-white/55 text-[9px]">Signaux</dt>
							<dd class="mag-display text-2xl tabular-nums leading-none mt-1">
								{items.length}
							</dd>
						</div>
						<div>
							<dt class="mag-kicker text-white/55 text-[9px]">Impacts</dt>
							<dd class="mag-display text-2xl tabular-nums leading-none mt-1">
								{impacts.length}
							</dd>
						</div>
						<div>
							<dt class="mag-kicker text-white/55 text-[9px]">Termes</dt>
							<dd class="mag-display text-2xl tabular-nums leading-none mt-1">
								{aggregatedChips.length}
							</dd>
						</div>
					</dl>
				</div>
			</aside>

			<!-- Corps : synthèse de la semaine -->
			<div class="lg:col-span-8 p-6 md:p-8 lg:p-10 flex flex-col">
				<div class="mag-kicker text-primary mb-3">Synthèse de la semaine</div>
				<p class="mag-body text-text-body">{data.report.executive_summary}</p>
			</div>
		</article>
	</section>

	<!-- SIGNAUX -->
	{#if items.length > 0}
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-8 md:mb-10">
				<div>
					<div class="mag-kicker text-primary">Les signaux</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl text-primary-dark mt-1">
						{items.length} mouvement{items.length > 1 ? 's' : ''} de la semaine
					</h2>
				</div>
				<div class="h-px flex-1 bg-border mb-2"></div>
			</div>

			<div class="space-y-12 md:space-y-16">
				{#each items as item, i}
					<article class="grid grid-cols-12 gap-4 md:gap-6">
						<!-- Numéro éditorial -->
						<div class="col-span-12 md:col-span-1">
							<span
								class="mag-display text-[56px] md:text-[64px] text-primary-dark/15 leading-none tabular-nums block"
							>
								{String(item.rank).padStart(2, '0')}
							</span>
						</div>
						<div class="col-span-12 md:col-span-11">
							<div
								class="flex items-center gap-2 text-xs text-text-muted mb-3 flex-wrap"
							>
								<span class="mag-kicker text-primary"
									>{themeLabel(item.theme, themeLabels)}</span
								>
								<span aria-hidden="true">·</span>
								<span>{geoScopeLabel(item.geo_scope)}</span>
								<span
									class="px-2 py-0.5 rounded {MATURITY_STYLES[
										item.maturity
									]} text-[10px] font-semibold"
								>
									{maturityLabel(item.maturity)}
								</span>
							</div>
							<h3
								class="mag-display-3 text-xl md:text-[26px] mb-3 text-primary-dark"
							>
								{item.title}
							</h3>
							<p class="mag-body text-text-body mb-4">{item.summary}</p>
							<div
								class="border-l-4 border-warning bg-warning-light pl-4 py-3 mb-4 rounded-r"
							>
								<div class="mag-kicker text-warning-deep mb-1">Pour FilmPro</div>
								<p class="text-sm text-text-body leading-relaxed">
									{item.filmpro_relevance}
								</p>
							</div>
							{#if item.deep_dive}
								<p class="text-sm text-text-body italic mb-4 leading-relaxed">
									{item.deep_dive}
								</p>
							{/if}
							<div
								class="flex items-center gap-3 text-xs text-text-muted flex-wrap pt-3 border-t border-border"
							>
								<span class="font-semibold text-text">{item.source.name}</span>
								<span aria-hidden="true">·</span>
								<span>{formatDate(item.source.published_at)}</span>
								<a
									href={item.source.url}
									target="_blank"
									rel="noopener noreferrer"
									class="ml-auto text-primary font-semibold hover:underline inline-flex items-center gap-1.5 group"
								>
									Lire l'article
									<Icon
										name="open_in_new"
										size={14}
										class="transition-transform group-hover:translate-x-0.5"
									/>
								</a>
							</div>
						</div>
					</article>
					{#if i < items.length - 1}
						<hr class="border-border" />
					{/if}
				{/each}
			</div>
		</section>
	{/if}

	<!-- IMPACTS FILMPRO -->
	{#if impacts.length > 0}
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-8 md:mb-10">
				<div>
					<div class="mag-kicker text-primary">Impact stratégique</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl text-primary-dark mt-1">
						Ce que ça change pour FilmPro
					</h2>
				</div>
				<div class="h-px flex-1 bg-border mb-2"></div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
				{#each impacts as impact}
					<div
						class="bg-white border border-border border-l-4 border-l-primary rounded-lg shadow-xs hover:shadow-md transition-shadow px-6 md:px-8 py-6 md:py-8"
					>
						<div class="mag-kicker text-primary mb-3">
							Axe {impactAxisLabel(impact.axis)}
						</div>
						<p
							class="mag-display-3 text-lg md:text-xl text-primary-dark leading-snug"
						>
							« {impact.note} »
						</p>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- TERMES DE RECHERCHE -->
	{#if aggregatedChips.length > 0}
		<section class="mb-14 md:mb-20">
			<div class="flex items-end gap-3 mb-8 md:mb-10 flex-wrap">
				<div>
					<div class="mag-kicker text-primary">Termes générés</div>
					<h2 class="mag-display-3 text-2xl md:text-3xl text-primary-dark mt-1">
						À lancer dans Prospection
					</h2>
				</div>
				<div class="h-px flex-1 bg-border mb-2 min-w-8"></div>
				<button
					type="button"
					onclick={copyAllTerms}
					class="inline-flex items-center gap-2 h-10 px-4 box-border rounded-lg border border-border bg-white hover:border-primary hover:bg-surface-alt text-sm font-semibold text-text-body transition-colors"
				>
					<Icon name="content_copy" size={16} />
					Copier les {aggregatedChips.length}
				</button>
			</div>

			<ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each aggregatedChips as entry, idx (entry.chip.label)}
					{@const chip = entry.chip}
					{@const isLoading = chipLoading === idx}
					<li
						class="bg-white border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap mb-2">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10px] font-bold uppercase tracking-wider">
										{chipKindLabel(chip.kind)}
									</span>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-alt text-text-muted text-[10px] font-semibold uppercase tracking-wider border border-border">
										{chip.canton}
									</span>
									<span class="text-[10px] text-text-muted">
										depuis signal #{entry.item_rank}
									</span>
								</div>
								<p class="text-sm font-semibold text-primary-dark leading-snug break-words">
									{chip.query}
								</p>
							</div>
							<button
								type="button"
								onclick={() => copyTerm(chip.query)}
								class="shrink-0 p-2 rounded-lg hover:bg-surface-alt text-text-muted hover:text-primary transition-colors"
								title="Copier le terme"
								aria-label="Copier le terme"
							>
								<Icon name="content_copy" size={16} />
							</button>
						</div>
						<button
							type="button"
							disabled={chipLoading !== null}
							onclick={() => runChipSearch(idx)}
							class="self-start inline-flex items-center gap-2 h-10 px-4 box-border rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors group cursor-pointer"
							title="Auto-exécuter la recherche dans Prospection"
						>
							<Icon
								name={isLoading ? 'progress_activity' : KIND_ICONS[chip.kind] ?? 'search'}
								size={16}
								class={isLoading ? 'animate-spin' : ''}
							/>
							{isLoading ? 'Lancement…' : 'Lancer la recherche'}
							{#if !isLoading}
								<Icon
									name="arrow_forward"
									size={14}
									class="transition-transform group-hover:translate-x-0.5"
								/>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<footer
		class="mt-16 md:mt-20 pt-6 border-t border-border flex items-center justify-between text-xs text-text-muted"
	>
		<div>
			Veille FilmPro · Édition {data.report.week_label}
		</div>
		<div class="font-semibold text-text">FilmPro</div>
	</footer>
</div>

<ModalForm
	bind:open={addItemOpen}
	title="Ajouter un item à cette édition"
	icon="add"
	saving={addItemSaving}
	maxWidth="max-w-2xl"
	onSave={submitAddItem}
>
	<div class="space-y-4">
		{#if addItemError}
			<div class="px-3 py-2 rounded-md bg-danger-light text-danger-deep text-sm" role="alert">
				{addItemError}
			</div>
		{/if}
		<p class="text-xs text-text-muted">
			Ajout manuel : URL vérifiée active + denylist sources. Pas de cross-check verbatim
			LLM (vous validez le contenu).
		</p>

		<label class="block">
			<span class="block text-sm font-medium mb-1">Titre</span>
			<input
				type="text"
				bind:value={manualItem.title}
				required
				minlength="10"
				maxlength="200"
				class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
			/>
		</label>

		<label class="block">
			<span class="block text-sm font-medium mb-1">URL source</span>
			<input
				type="url"
				bind:value={manualItem.url}
				required
				placeholder="https://..."
				class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
			/>
		</label>

		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="block text-sm font-medium mb-1">Nom de la source</span>
				<input
					type="text"
					bind:value={manualItem.source_name}
					required
					minlength="2"
					maxlength="120"
					placeholder="ex. Le Temps"
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				/>
			</label>
			<label class="block">
				<span class="block text-sm font-medium mb-1">Date publication</span>
				<input
					type="date"
					bind:value={manualItem.published_at}
					required
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				/>
			</label>
		</div>

		<label class="block">
			<span class="block text-sm font-medium mb-1">Résumé</span>
			<textarea
				bind:value={manualItem.summary}
				required
				minlength="40"
				maxlength="1500"
				rows="3"
				class="w-full px-3 py-2 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary text-sm"
			></textarea>
		</label>

		<label class="block">
			<span class="block text-sm font-medium mb-1">Pertinence FilmPro</span>
			<textarea
				bind:value={manualItem.filmpro_relevance}
				required
				minlength="20"
				maxlength="1200"
				rows="2"
				class="w-full px-3 py-2 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary text-sm"
			></textarea>
		</label>

		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="block text-sm font-medium mb-1">Thème</span>
				<select
					bind:value={manualItem.theme}
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				>
					{#each data.activeThemes as theme (theme.id)}
						<option value={theme.slug}>{theme.label}</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="block text-sm font-medium mb-1">Segment</span>
				<select
					bind:value={manualItem.segment}
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				>
					<option value="tertiaire">Tertiaire</option>
					<option value="residentiel">Résidentiel</option>
					<option value="commerces">Commerces</option>
					<option value="erp">ERP</option>
					<option value="partenaires">Partenaires</option>
				</select>
			</label>
		</div>

		<div class="grid grid-cols-3 gap-4">
			<label class="block">
				<span class="block text-sm font-medium mb-1">Géo</span>
				<select
					bind:value={manualItem.geo_scope}
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				>
					<option value="suisse_romande">Suisse romande</option>
					<option value="suisse">Suisse</option>
					<option value="monde">Monde</option>
				</select>
			</label>
			<label class="block">
				<span class="block text-sm font-medium mb-1">Maturité</span>
				<select
					bind:value={manualItem.maturity}
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				>
					<option value="emergent">Émergent</option>
					<option value="etabli">Établi</option>
					<option value="speculatif">Spéculatif</option>
				</select>
			</label>
			<label class="block">
				<span class="block text-sm font-medium mb-1">Actionnabilité</span>
				<select
					bind:value={manualItem.actionability}
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				>
					<option value="action_directe">Action directe</option>
					<option value="veille_active">Veille active</option>
					<option value="a_surveiller">À surveiller</option>
				</select>
			</label>
		</div>
	</div>
</ModalForm>
