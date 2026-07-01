<script lang="ts">
	import ModalForm from '$lib/components/ModalForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { invalidateAll } from '$app/navigation';
	import SourceSelector from './SourceSelector.svelte';
	import SourceSearchFields from './SourceSearchFields.svelte';
	import ResultsChecklist from './ResultsChecklist.svelte';
	import { SOURCE_CARDS, SOURCE_ORDER, type EntrepriseSource } from './source-meta';
	import type { PublicCandidate } from '$lib/server/prospection/candidate';
	import CampagneCombo from '$lib/components/prospection/CampagneCombo.svelte';
	import type { CampagneWithCount } from '$lib/campagnes';

	type GoogleQuotaStatus = { used: number; cap: number; remaining: number; exhausted: boolean; warning: string | null };

	let {
		open = $bindable(false),
		importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null),
		fromIntelligence = null,
		fromTerm = null,
		allowedSources,
		googleQuota = null,
		premium = false,
		campagnes = [],
		presetCampagneIds = [],
	}: {
		open: boolean;
		importResult: { message: string; type: 'success' | 'error' } | null;
		fromIntelligence?: string | null;
		fromTerm?: string | null;
		/** Sources entreprises actives (déjà filtrées par flag côté page), ordre canonique appliqué ici. */
		allowedSources: EntrepriseSource[];
		googleQuota?: GoogleQuotaStatus | null;
		/** Vague 3.2 (flag ffCrmListesV2) : active l'étiquetage campagne du lot importé. */
		premium?: boolean;
		campagnes?: CampagneWithCount[];
		/**
		 * Lot 3 : campagnes pré-cochées à l'ouverture (ouverture « depuis une campagne » :
		 * le lot importé sera étiqueté à cette/ces campagne(s) par défaut). L'opérateur reste
		 * libre de décocher / ajouter dans le combo. Appliqué UNIQUEMENT à la transition
		 * d'ouverture ; vidé à la fermeture (rien ne fuit d'une session à l'autre).
		 */
		presetCampagneIds?: string[];
	} = $props();

	// Vague 3.2 : campagnes assignées à TOUT le lot importé (lot-level, pas par candidat).
	let campagneIds = $state<string[]>([]);

	// Sources visibles dans l'ordre du golden, filtrées par celles autorisées.
	const sources = $derived(SOURCE_ORDER.filter((k) => allowedSources.includes(k)));

	// svelte-ignore state_referenced_locally
	let active = $state<EntrepriseSource>(sources[0] ?? 'search_ch');
	// Re-ancre la source active si la liste change (ex : un flag coupe la source courante).
	$effect(() => {
		if (sources.length > 0 && !sources.includes(active)) active = sources[0];
	});

	let candidates = $state<PublicCandidate[]>([]);
	let hasSearched = $state(false);
	let searching = $state(false);
	let importing = $state(false);
	let error = $state<string | null>(null);
	// svelte-ignore state_referenced_locally
	let quota = $state<GoogleQuotaStatus | null>(googleQuota);

	const activeMeta = $derived(SOURCE_CARDS[active]);

	// Lot 3 : noms des campagnes pré-cochées (ouverture « depuis une campagne »), pour un rappel
	// visible dès l'ouverture — le combo d'étiquetage n'apparaît, lui, qu'après une recherche.
	const presetNames = $derived(
		premium
			? presetCampagneIds.map((id) => campagnes.find((c) => c.id === id)?.nom).filter((n): n is string => !!n)
			: [],
	);

	// Changement de source = on repart de l'écran de recherche : les résultats d'une source ne
	// s'appliquent pas à une autre. (Comparaison à la valeur précédente car `bind:active` met à
	// jour `active` AVANT tout callback : on ne peut pas se fier à un onselect côté carte.)
	// svelte-ignore state_referenced_locally
	let prevActive: EntrepriseSource = active;
	$effect(() => {
		if (active !== prevActive) {
			prevActive = active;
			candidates = [];
			hasSearched = false;
			error = null;
		}
	});

	// Transitions d'ouverture/fermeture (état propre d'une session à l'autre) :
	//  - fermeture -> reset complet (rien ne fuit) ;
	//  - ouverture -> pré-remplissage campagne (Lot 3, premium uniquement) si un preset est fourni.
	// `prevOpen` (marqueur non réactif) évite de réinitialiser à chaque re-run de l'effet : seule
	// la vraie transition d'état déclenche l'action. Les autres deps (presetCampagneIds/premium)
	// re-déclenchent l'effet mais la garde `open === prevOpen` court-circuite (pas d'écrasement
	// du choix de l'opérateur pendant que la modale est ouverte).
	let prevOpen = false;
	$effect(() => {
		if (open === prevOpen) return;
		prevOpen = open;
		if (open) {
			campagneIds = premium ? [...presetCampagneIds] : [];
		} else {
			candidates = [];
			hasSearched = false;
			error = null;
			searching = false;
			importing = false;
			campagneIds = [];
		}
	});

	// Au 1er affichage de Google (ou ouverture), récupère le quota frais si absent.
	$effect(() => {
		if (open && active === 'google_places' && quota === null) refreshQuota();
	});

	async function refreshQuota() {
		try {
			const resp = await fetch('/api/prospection/google-places/quota');
			if (resp.ok) quota = await resp.json();
		} catch {
			/* silencieux : le serveur re-vérifie le quota, l'absence d'affichage ne bloque pas */
		}
	}

	async function runSearch(body: Record<string, unknown>) {
		searching = true;
		error = null;
		const payload = {
			...body,
			preview: true,
			...(fromIntelligence ? { from_intelligence: fromIntelligence } : {}),
			...(fromTerm ? { from_term: fromTerm } : {}),
		};
		try {
			const resp = await fetch(activeMeta.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await resp.json();
			if (resp.ok) {
				candidates = Array.isArray(data.candidates) ? data.candidates : [];
				hasSearched = true;
			} else {
				error = data.error || 'Erreur lors de la recherche.';
				candidates = [];
				hasSearched = true;
			}
		} catch (err) {
			error = `Erreur réseau : ${String(err)}`;
			candidates = [];
			hasSearched = true;
		} finally {
			searching = false;
			if (active === 'google_places') refreshQuota();
		}
	}

	async function runImport(selected: PublicCandidate[]) {
		if (selected.length === 0) return;
		importing = true;
		error = null;
		// Le serveur re-valide (Zod strict), re-score et re-déduplique : on envoie les candidats
		// cochés tels quels, les champs hors schéma (score/status/tempId) sont strippés côté serveur.
		const payload = {
			source: active,
			candidates: selected,
			...(premium && campagneIds.length > 0 ? { campagneIds } : {}),
			...(fromIntelligence ? { from_intelligence: fromIntelligence } : {}),
			...(fromTerm ? { from_term: fromTerm } : {}),
		};
		try {
			const resp = await fetch('/api/prospection/import-selected', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await resp.json();
			if (resp.ok) {
				importResult = { message: data.message, type: 'success' };
				await invalidateAll();
				open = false;
			} else {
				error = data.error || 'Erreur lors de l’import.';
			}
		} catch (err) {
			error = `Erreur réseau : ${String(err)}`;
		} finally {
			importing = false;
		}
	}
</script>

<ModalForm bind:open title="Rechercher des entreprises" icon="search" headerVariant="accent" maxWidth="max-w-5xl">
	<div class="space-y-4">
		<p class="text-[13px] text-text-muted leading-relaxed -mt-1 max-w-[68ch]">
			Choisissez une source, lancez une recherche ciblée, puis cochez les entreprises à importer.
			Une seule source à la fois - zéro doublon.
		</p>

		{#if presetNames.length > 0}
			<div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-primary/5 border border-primary/15 text-[13px] text-text-body">
				<Icon name="sell" size={16} class="shrink-0 text-primary" />
				<span>Les entreprises importées seront étiquetées à la campagne <b class="font-semibold">{presetNames.join(', ')}</b>.</span>
			</div>
		{/if}

		<SourceSelector {sources} bind:active googleQuota={quota} />

		<SourceSearchFields source={active} googleQuota={quota} pending={searching} onsearch={runSearch} />

		{#if error}
			<div role="alert" class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-danger-light text-danger-deep border border-danger/20">
				<Icon name="error" size={18} class="shrink-0" />
				<span class="font-medium">{error}</span>
			</div>
		{/if}

		{#if candidates.length > 0}
			{#if premium}
				<!-- Vague 3.2 : étiquetage campagne du lot (optionnel, plusieurs possibles). -->
				<div class="space-y-1.5">
					<span class="block text-[13px] font-semibold text-text-body">Campagnes <span class="font-normal text-text-muted">- optionnel, plusieurs possibles</span></span>
					<CampagneCombo {campagnes} bind:selected={campagneIds} placeholder="Étiqueter ce lot…" />
					<p class="text-[12px] text-text-muted leading-snug">Les entreprises importées de ce lot recevront ces campagnes. Réimporter plus tard sous la même campagne regroupe sans créer de doublon.</p>
				</div>
			{/if}
			<ResultsChecklist {candidates} source={active} pending={importing} onimport={runImport} />
		{:else if hasSearched && !error}
			<!-- État vide après recherche -->
			<div class="flex flex-col items-center text-center gap-2 px-6 py-10 rounded-xl border border-border bg-surface-alt/40">
				<span class="w-11 h-11 rounded-full grid place-items-center bg-white border border-border text-text-muted"><Icon name="search_off" size={20} /></span>
				<p class="text-sm font-semibold text-text">Aucune entreprise trouvée</p>
				<p class="text-[13px] text-text-muted max-w-[44ch]">Ajustez l’activité, le canton ou le lieu, puis relancez la recherche.</p>
			</div>
		{:else if !hasSearched}
			<!-- État de départ (avant 1re recherche) -->
			<div class="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-surface-alt/40">
				<span class="w-9 h-9 rounded-lg grid place-items-center shrink-0" style="background: var({activeMeta.bgVar}); color: var({activeMeta.deepVar});"><Icon name={activeMeta.icon} size={18} /></span>
				<p class="text-[13px] text-text-body leading-snug">
					Lancez une recherche <b class="font-semibold">{activeMeta.title}</b> pour voir les entreprises à importer - rien n’est ajouté tant que vous n’avez pas coché et cliqué <b class="font-semibold">Importer</b>.
				</p>
			</div>
		{/if}
	</div>
</ModalForm>
