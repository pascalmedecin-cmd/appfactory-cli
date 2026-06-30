<script lang="ts">
	/**
	 * Panneau « Étiquettes d'adresses » d'une campagne (écran Campagnes, Vague 3.2).
	 *
	 * Flux, ENTIÈREMENT sur la page Campagnes (volet glissant, aucune navigation) :
	 *  1. ouverture -> charge les prospects étiquetés (GET .../prospects) ;
	 *  2. l'opérateur coche/décoche ; une adresse incomplète peut être COMPLÉTÉE sur place via le
	 *     lookup unitaire search.ch (`/api/prospection/search-ch`, sanctionné V5) - bouton par ligne ;
	 *  3. « Télécharger le PDF » produit une planche Avery 6122 (24/page) côté navigateur (jsPDF +
	 *     svg2pdf). LA GÉNÉRATION NE FAIT AUCUN APPEL API : elle imprime l'adresse déjà enregistrée.
	 *
	 * Réutilise SlideOut + tokens du golden Campagnes (aucun composant générique).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { toasts } from '$lib/stores/toast';
	import {
		adresseStatut,
		toEtiquetteEntry,
		type ProspectAdresse
	} from '$lib/etiquettes/prospect-etiquette';
	import { exportEtiquettesPdf, etiquettesFileName } from '$lib/etiquettes/pdf-etiquettes';
	import type { CampagneWithCount } from '$lib/campagnes';

	let {
		open = $bindable(false),
		campagne = null
	}: {
		open?: boolean;
		campagne?: CampagneWithCount | null;
	} = $props();

	let loading = $state(false);
	let loadError = $state(false);
	let prospects = $state<ProspectAdresse[]>([]);
	let selected = new SvelteSet<string>();
	let completing = new SvelteSet<string>(); // ids dont l'adresse est en cours de complétion
	let search = $state('');
	let generating = $state(false);
	let loadedFor = $state<string | null>(null);
	// Jeton de génération : une réponse périmée (campagne A) ne doit jamais écraser l'état d'un
	// chargement plus récent (campagne B) si elles reviennent dans le désordre -> sinon le PDF de B
	// serait construit avec les adresses de A. Toute continuation après un await s'arrête si elle
	// n'est plus la plus récente.
	let loadSeq = 0;

	// Charge les prospects à l'ouverture (une fois par campagne ouverte). Réinitialise à la fermeture.
	$effect(() => {
		if (!open || !campagne) {
			if (!open) loadedFor = null;
			return;
		}
		if (loadedFor === campagne.id) return;
		loadedFor = campagne.id;
		void load(campagne.id);
	});

	async function load(id: string) {
		const token = ++loadSeq;
		loading = true;
		loadError = false;
		prospects = [];
		selected.clear();
		completing.clear();
		search = '';
		try {
			const resp = await fetch(`/api/campagnes/${id}/prospects`);
			if (token !== loadSeq) return; // un chargement plus récent a pris le relais
			if (!resp.ok) throw new Error(String(resp.status));
			const d = (await resp.json()) as { prospects?: ProspectAdresse[] };
			if (token !== loadSeq) return;
			prospects = d.prospects ?? [];
			// Sélection par défaut : seules les adresses postales complètes.
			for (const p of prospects) {
				if (adresseStatut(p).complete) selected.add(p.id);
			}
		} catch {
			if (token === loadSeq) loadError = true;
		} finally {
			if (token === loadSeq) loading = false;
		}
	}

	const statutById = $derived(new Map(prospects.map((p) => [p.id, adresseStatut(p)])));

	const filtered = $derived(
		(() => {
			const q = search.trim().toLowerCase();
			if (!q) return prospects;
			return prospects.filter((p) =>
				[p.raison_sociale, p.adresse, p.localite, p.npa]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q))
			);
		})()
	);

	const incompleteCount = $derived(prospects.filter((p) => !statutById.get(p.id)?.complete).length);
	const selectedList = $derived(prospects.filter((p) => selected.has(p.id)));
	const selectedIncomplete = $derived(selectedList.filter((p) => !statutById.get(p.id)?.complete).length);
	const allFilteredSelected = $derived(filtered.length > 0 && filtered.every((p) => selected.has(p.id)));

	function toggle(id: string) {
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
	}

	function toggleAllFiltered() {
		if (allFilteredSelected) {
			for (const p of filtered) selected.delete(p.id);
		} else {
			for (const p of filtered) selected.add(p.id);
		}
	}

	/**
	 * Complète l'adresse d'UN prospect via le lookup unitaire search.ch (sanctionné V5 ; le batch
	 * reste désactivé par design). Action manuelle, une ligne à la fois. Puis re-lit la liste
	 * (DB seulement) en préservant la sélection. C'est la SEULE surface qui appelle une API ici ;
	 * la génération du PDF n'en fait jamais.
	 */
	async function completeOne(p: ProspectAdresse) {
		if (completing.has(p.id) || !campagne) return;
		const campId = campagne.id; // fige la campagne : si elle change pendant l'appel, on abandonne
		const before = statutById.get(p.id)?.complete ?? false;
		completing.add(p.id);
		try {
			const resp = await fetch('/api/prospection/search-ch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lead_id: p.id })
			});
			if (campagne?.id !== campId) return; // campagne changée -> ne pas toucher l'état courant
			const d = await resp.json().catch(() => null);
			if (!resp.ok) {
				toasts.error(d?.error || 'Recherche d’adresse impossible');
				return;
			}
			await refreshAddresses(campId, p.id, before);
		} catch {
			if (campagne?.id === campId) toasts.error('Erreur réseau');
		} finally {
			completing.delete(p.id);
		}
	}

	/** Re-lit la liste (aucun appel search.ch, lecture DB) en gardant la sélection ; auto-sélectionne
	 *  et notifie si l'adresse vient d'être complétée. Abandonne si la campagne a changé entre-temps. */
	async function refreshAddresses(campId: string, id: string, wasComplete: boolean) {
		const resp = await fetch(`/api/campagnes/${campId}/prospects`);
		if (campagne?.id !== campId || !resp.ok) return;
		const d = (await resp.json()) as { prospects?: ProspectAdresse[] };
		if (campagne?.id !== campId) return;
		prospects = d.prospects ?? prospects;
		const p = prospects.find((x) => x.id === id);
		const nowComplete = p ? adresseStatut(p).complete : false;
		if (nowComplete && !wasComplete) {
			selected.add(id);
			toasts.success('Adresse complétée');
		} else if (!nowComplete) {
			toasts.info('Aucune adresse trouvée sur search.ch pour ce prospect');
		}
	}

	async function download() {
		if (!campagne || selectedList.length === 0 || generating) return;
		generating = true;
		try {
			const entries = selectedList.map(toEtiquetteEntry);
			await exportEtiquettesPdf(entries, etiquettesFileName(campagne.nom));
			toasts.success(
				`${entries.length} étiquette${entries.length > 1 ? 's' : ''} générée${entries.length > 1 ? 's' : ''}`
			);
		} catch {
			toasts.error('Génération du PDF impossible');
		} finally {
			generating = false;
		}
	}

	function adresseLigne(p: ProspectAdresse): string {
		return [p.adresse, [p.npa, p.localite].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	}
	function manqueLabel(manque: string[]): string {
		return manque.length === 0 ? '' : `Adresse incomplète : ${manque.join(' et ')} manquante${manque.length > 1 ? 's' : ''}`;
	}
</script>

<SlideOut bind:open title={campagne ? `Étiquettes - ${campagne.nom}` : 'Étiquettes'} width="620px">
	{#if loading}
		<div class="space-y-2.5" aria-busy="true" aria-label="Chargement des prospects">
			{#each Array(6) as _, i (i)}
				<div class="h-[68px] rounded-xl bg-surface-alt animate-pulse"></div>
			{/each}
		</div>
	{:else if loadError}
		<div class="flex flex-col items-center text-center gap-3 py-16">
			<span class="grid place-items-center w-12 h-12 rounded-2xl bg-danger-light text-danger-deep">
				<Icon name="error" size={24} />
			</span>
			<h3 class="text-base font-semibold text-text">Chargement impossible</h3>
			<p class="text-sm text-text-muted max-w-xs">Les prospects de cette campagne n'ont pas pu être récupérés.</p>
			<button
				type="button"
				class="min-h-11 inline-flex items-center gap-1.5 px-4 text-sm font-semibold text-primary hover:text-primary-hover cursor-pointer"
				onclick={() => campagne && load(campagne.id)}
			>
				Réessayer
			</button>
		</div>
	{:else if prospects.length === 0}
		<div class="flex flex-col items-center text-center gap-3 py-16">
			<span class="grid place-items-center w-12 h-12 rounded-2xl bg-surface-alt text-text-muted">
				<Icon name="mail" size={24} />
			</span>
			<h3 class="text-base font-semibold text-text">Aucun prospect dans cette campagne</h3>
			<p class="text-sm text-text-muted max-w-xs">
				Ajoutez des prospects à cette campagne en les étiquetant depuis la Prospection, puis revenez générer leurs étiquettes.
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			<p class="text-sm text-text-muted leading-relaxed">
				Cochez les prospects à imprimer. Le PDF produit une planche d'étiquettes Avery
				(24 par page A4, nom en gras, adresse centrée), prête à coller.
			</p>

			<div class="flex items-center gap-3 flex-wrap">
				<div class="relative flex-1 min-w-[180px]">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
						<Icon name="search" size={16} />
					</span>
					<input
						type="search"
						bind:value={search}
						placeholder="Rechercher un prospect…"
						aria-label="Rechercher un prospect"
						class="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>
				<button
					type="button"
					class="min-h-10 inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-primary hover:text-primary-hover cursor-pointer"
					onclick={toggleAllFiltered}
				>
					<Icon name={allFilteredSelected ? 'deselect' : 'select_all'} size={16} />
					{allFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
				</button>
			</div>

			<div class="flex items-center justify-between text-xs text-text-muted">
				<span><span class="font-semibold text-text">{selectedList.length}</span> sur {prospects.length} sélectionné{selectedList.length > 1 ? 's' : ''}</span>
				{#if incompleteCount > 0}
					<span class="inline-flex items-center gap-1 text-warning-deep">
						<Icon name="warning" size={13} />
						{incompleteCount} adresse{incompleteCount > 1 ? 's' : ''} à compléter
					</span>
				{/if}
			</div>

			{#if filtered.length === 0}
				<p class="text-sm text-text-muted py-8 text-center">Aucun prospect ne correspond à « {search.trim()} ».</p>
			{:else}
				<ul class="space-y-2">
					{#each filtered as p (p.id)}
						{@const st = statutById.get(p.id)}
						{@const checked = selected.has(p.id)}
						{@const busy = completing.has(p.id)}
						<li>
							<div
								class="flex items-start gap-3 p-3 rounded-xl border transition-colors {checked
									? 'border-primary bg-primary-light/40'
									: 'border-border bg-white hover:bg-surface-alt'}"
							>
								<!-- Zone de bascule (le <label> nomme la case : nom + adresse + badge inclus,
								     donc l'avertissement « adresse incomplète » est annoncé par les lecteurs d'écran). -->
								<label class="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
									<input
										type="checkbox"
										class="mt-0.5 w-4 h-4 shrink-0 accent-primary cursor-pointer"
										checked={checked}
										onchange={() => toggle(p.id)}
									/>
									<span class="min-w-0 flex-1">
										<span class="block text-sm font-semibold text-text truncate">{p.raison_sociale}</span>
										{#if p.adresse || p.npa || p.localite}
											<span class="flex items-center gap-1 text-xs text-text-muted mt-0.5">
												<Icon name="place" size={12} class="shrink-0" />
												<span class="truncate">{adresseLigne(p)}</span>
											</span>
										{/if}
										{#if st && !st.complete}
											<span class="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-light text-warning-deep text-[11px] font-semibold">
												<Icon name="warning" size={12} />
												{manqueLabel(st.manque)}
											</span>
										{/if}
									</span>
								</label>

								{#if st && !st.complete}
									<button
										type="button"
										onclick={() => completeOne(p)}
										disabled={busy}
										title="Rechercher l'adresse sur search.ch et la compléter ici"
										class="shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-white text-xs font-semibold text-primary hover:bg-primary-light/60 hover:border-primary/40 disabled:opacity-60 disabled:cursor-wait cursor-pointer transition-colors"
									>
										{#if busy}
											<span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
											Recherche…
										{:else}
											<Icon name="search" size={14} />
											Compléter
										{/if}
									</button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<div class="text-sm font-semibold text-text">
					{selectedList.length} étiquette{selectedList.length > 1 ? 's' : ''}
				</div>
				{#if selectedIncomplete > 0}
					<div class="text-xs text-warning-deep">
						dont {selectedIncomplete} sans adresse complète
					</div>
				{/if}
			</div>
			<button
				type="button"
				onclick={download}
				disabled={selectedList.length === 0 || generating}
				class="h-11 px-4 inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
			>
				<Icon name="download" size={17} />
				{generating ? 'Génération…' : 'Télécharger le PDF'}
			</button>
		</div>
	{/snippet}
</SlideOut>
