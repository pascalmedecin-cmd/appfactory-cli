<script lang="ts">
	/**
	 * Page dédiée « Impression d'étiquettes » d'une campagne (remplace le volet V1 EtiquettesPanel).
	 *
	 * Flux : on choisit les prospects (sélection = adresses complètes par défaut), on saisit un
	 * DESTINATAIRE directement dans la ligne (générique tout mailing, ex. « Service technique » ou
	 * « Service technique, M. X »), on l'applique en LOT via la barre flottante, on prévisualise la
	 * planche Avery réelle (SVG du moteur, police Outfit chargée à la volée) puis on télécharge le PDF.
	 *
	 * Invariants repris du V1 :
	 *  - le destinataire est NON PERSISTÉ : il vit dans l'état de la page (Map id -> texte), injecté
	 *    seulement à la construction du PDF, jamais écrit en base ;
	 *  - la génération du PDF ne fait AUCUN appel API (adresse lue du stock) ;
	 *  - la SEULE surface qui appelle une API est « Compléter » (lookup unitaire search.ch, V5) ;
	 *  - une adresse incomplète n'est ni sélectionnable ni imprimable tant qu'elle n'est pas complétée
	 *    (sa case + son champ destinataire sont désactivés) -> jamais d'adresse partielle imprimée.
	 *
	 * Logique pure (filtre, résumé, construction des entrées) testée en Vitest : `etiquettes-page.ts`.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { untrack } from 'svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import { toasts } from '$lib/stores/toast';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { trapFocus } from '$lib/actions/trapFocus';
	import { CRM_BASE } from '$lib/config';
	import { campClass } from '$lib/campagnes';
	import { adresseStatut, type ProspectAdresse } from '$lib/etiquettes/prospect-etiquette';
	import { summarize, filterProspects, buildEtiquetteEntries } from '$lib/etiquettes/etiquettes-page';
	import {
		buildEtiquettesPagesSvg,
		exportEtiquettesPdf,
		etiquettesFileName,
		pageCount
	} from '$lib/etiquettes/pdf-etiquettes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const campagnesUrl = `${CRM_BASE}/campagnes`;
	const dialogTitleId = $props.id();

	// --- État local (aucune persistance) ---
	const selected = new SvelteSet<string>();
	const destinataires = new SvelteMap<string, string>(); // id -> texte saisi (non persisté)
	const completing = new SvelteSet<string>(); // ids dont l'adresse est en cours de complétion
	// Corrections d'adresse appliquées en session (complétion search.ch) : id -> prospect rafraîchi.
	// Fusionnées au chargement serveur pour dériver la liste courante SANS muter `data`.
	const patches = new SvelteMap<string, ProspectAdresse>();
	let search = $state('');
	let includeIncomplete = $state(false);
	let bulkValue = $state('');
	let generating = $state(false);

	// Aperçu
	let previewOpen = $state(false);
	let previewSvgs = $state<string[]>([]);
	let previewCount = $state(0);

	// Jeton anti-race pour les rafraîchissements post-complétion (une réponse périmée ne doit jamais
	// écraser un état plus récent si deux complétions reviennent dans le désordre).
	let refreshSeq = 0;

	function seedSelection(list: readonly ProspectAdresse[]) {
		selected.clear();
		for (const p of list) if (adresseStatut(p).complete) selected.add(p.id);
	}

	// Seed synchrone au montage (sélection = adresses complètes) -> évite un flash « rien coché ».
	untrack(() => seedSelection(data.prospects));

	// SvelteKit RÉUTILISE ce composant sur un simple changement de param `[id]` : sans reset, la
	// sélection / les destinataires / les corrections fuiraient d'une campagne à l'autre. On réinitialise
	// tout l'état local dès que la campagne change (l'égalité au montage évite un double seed).
	let seededFor = untrack(() => data.campagne.id);
	$effect(() => {
		const camp = data.campagne.id;
		if (camp === seededFor) return;
		seededFor = camp;
		destinataires.clear();
		completing.clear();
		patches.clear();
		search = '';
		includeIncomplete = false;
		bulkValue = '';
		// Aperçu + génération + jeton anti-race : réinitialisés aussi, sinon un aperçu ouvert (ou une
		// réponse de complétion en vol) de l'ancienne campagne « fuiterait » sur la nouvelle.
		previewOpen = false;
		previewSvgs = [];
		previewCount = 0;
		generating = false;
		refreshSeq++;
		seedSelection(data.prospects);
	});

	$effect(() => {
		$pageSubtitle = data.campagne.nom;
	});

	// Liste courante = chargement serveur, écrasé par les corrections de session (sans muter `data`).
	const prospects = $derived(data.prospects.map((p) => patches.get(p.id) ?? p));
	const statutById = $derived(new Map(prospects.map((p) => [p.id, adresseStatut(p)])));
	const filtered = $derived(filterProspects(prospects, { search, includeIncomplete }));
	const summary = $derived(summarize(prospects, destinataires));
	const incompleteCount = $derived(summary.total - summary.completes);
	const selectedList = $derived(prospects.filter((p) => selected.has(p.id)));
	// « Tout sélectionner » n'agit QUE sur les lignes complètes visibles (les sélectionnables).
	const selectableFiltered = $derived(filtered.filter((p) => statutById.get(p.id)?.complete));
	const allSelectableSelected = $derived(
		selectableFiltered.length > 0 && selectableFiltered.every((p) => selected.has(p.id))
	);

	function isComplete(id: string): boolean {
		return statutById.get(id)?.complete ?? false;
	}

	function toggle(id: string) {
		if (!isComplete(id)) return; // une adresse incomplète n'est jamais sélectionnable
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
	}

	function toggleAll() {
		if (allSelectableSelected) {
			for (const p of selectableFiltered) selected.delete(p.id);
		} else {
			for (const p of selectableFiltered) selected.add(p.id);
		}
	}

	function setDest(id: string, value: string) {
		if (value.trim()) destinataires.set(id, value);
		else destinataires.delete(id);
	}

	// --- Barre d'actions groupées (un seul concept de sélection : imprime ET cible le lot) ---
	function applyBulk() {
		const v = bulkValue.trim();
		for (const id of selected) {
			if (v) destinataires.set(id, v);
			else destinataires.delete(id);
		}
	}
	function clearBulkDest() {
		for (const id of selected) destinataires.delete(id);
		bulkValue = '';
	}
	function deselectAll() {
		selected.clear();
	}

	// --- Complétion d'adresse (lookup unitaire search.ch, sanctionné V5) ---
	async function completeOne(p: ProspectAdresse) {
		if (completing.has(p.id)) return;
		const campId = data.campagne.id; // fige la campagne : si elle change pendant l'appel, on abandonne
		const before = statutById.get(p.id)?.complete ?? false;
		completing.add(p.id);
		try {
			const resp = await fetch('/api/prospection/search-ch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lead_id: p.id })
			});
			if (data.campagne.id !== campId) return; // campagne changée -> ne touche pas l'état courant
			const d = await resp.json().catch(() => null);
			if (!resp.ok) {
				toasts.error(d?.error || 'Recherche d’adresse impossible');
				return;
			}
			await refreshAddresses(campId, p.id, before);
		} catch {
			if (data.campagne.id === campId) toasts.error('Erreur réseau');
		} finally {
			completing.delete(p.id);
		}
	}

	/** Re-lit la liste de la campagne figée (DB seulement, aucun search.ch) en préservant sélection +
	 *  destinataires ; auto-sélectionne et notifie si l'adresse vient d'être complétée, la désélectionne
	 *  si elle reste incomplète (invariant « sélection ⊆ adresses complètes »). Abandonne si la campagne
	 *  a changé (composant réutilisé) ou si une réponse plus récente a pris le relais (jeton anti-race). */
	async function refreshAddresses(campId: string, id: string, wasComplete: boolean) {
		const token = ++refreshSeq;
		const resp = await fetch(`/api/campagnes/${campId}/prospects`);
		if (token !== refreshSeq || data.campagne.id !== campId || !resp.ok) return;
		const d = (await resp.json()) as { prospects?: ProspectAdresse[] };
		if (token !== refreshSeq || data.campagne.id !== campId) return;
		const fresh = (d.prospects ?? []).find((x) => x.id === id);
		if (fresh) patches.set(id, fresh); // correction de session, fusionnée au dérivé `prospects`
		const nowComplete = fresh ? adresseStatut(fresh).complete : false;
		if (nowComplete && !wasComplete) {
			selected.add(id); // devient imprimable -> auto-sélection
			toasts.success('Adresse complétée');
		} else if (!nowComplete) {
			selected.delete(id); // défense : jamais une adresse incomplète dans la sélection imprimable
			toasts.info('Aucune adresse trouvée sur search.ch pour ce prospect');
		}
	}

	// --- Aperçu + téléchargement ---
	// Police Outfit (celle du PDF) chargée à la volée depuis le TTF embarqué -> l'aperçu SVG est le
	// PDF au pixel près, sans réseau (data: URL, autorisé par la CSP `font-src 'self' data:`).
	let outfitLoaded = false;
	async function ensureOutfitLoaded() {
		if (outfitLoaded || typeof document === 'undefined' || !('fonts' in document)) return;
		try {
			const fonts = await import('$lib/etiquettes/etiquettes-fonts');
			const mk = (data64: string, weight: string) =>
				new FontFace('Outfit', `url(data:font/ttf;base64,${data64})`, { weight, style: 'normal' });
			const f400 = mk(fonts.OUTFIT_400, '400');
			const f700 = mk(fonts.OUTFIT_700, '700');
			await Promise.all([f400.load(), f700.load()]);
			document.fonts.add(f400);
			document.fonts.add(f700);
			outfitLoaded = true;
		} catch {
			// Repli silencieux : rendu en police système, aperçu approximatif mais fonctionnel.
		}
	}

	async function openPreview() {
		if (selectedList.length === 0) return;
		const entries = buildEtiquetteEntries(selectedList, destinataires);
		await ensureOutfitLoaded();
		previewSvgs = buildEtiquettesPagesSvg(entries, { guides: true });
		previewCount = entries.length;
		previewOpen = true;
	}
	function closePreview() {
		previewOpen = false;
	}

	async function downloadPdf() {
		if (generating || selectedList.length === 0) return;
		generating = true;
		try {
			const entries = buildEtiquetteEntries(selectedList, destinataires);
			await exportEtiquettesPdf(entries, etiquettesFileName(data.campagne.nom));
			toasts.success(
				`${entries.length} étiquette${entries.length > 1 ? 's' : ''} générée${entries.length > 1 ? 's' : ''}`
			);
			previewOpen = false;
		} catch {
			toasts.error('Génération du PDF impossible');
		} finally {
			generating = false;
		}
	}

	function adresseLigne(p: ProspectAdresse): string {
		return [p.adresse, [p.npa, p.localite].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && previewOpen) closePreview();
	}

	// Verrou de défilement du corps pendant l'aperçu (cohérent avec ModalForm).
	$effect(() => {
		if (!previewOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="etq">
	<!-- Zone 1 : identité de page -->
	<div class="head">
		<div class="head-id">
			<a class="back" href={campagnesUrl}>
				<Icon name="arrow_back" size={15} /> Retour à la campagne
			</a>
			<h1>Impression d'étiquettes</h1>
			<div class="subline">
				<span class="camp {campClass(data.campagne.couleur)}"><span class="cdot"></span> {data.campagne.nom}</span>
				<span class="sep"></span>
				<span class="tabular">
					{summary.total} prospect{summary.total > 1 ? 's' : ''}
					&middot; {summary.completes} adresse{summary.completes > 1 ? 's' : ''} complète{summary.completes > 1 ? 's' : ''}
					&middot; {summary.destinataires} destinataire{summary.destinataires > 1 ? 's' : ''} renseigné{summary.destinataires > 1 ? 's' : ''}
				</span>
			</div>
		</div>
		<button
			type="button"
			class="btn-primary"
			onclick={openPreview}
			disabled={selectedList.length === 0}
			title={selectedList.length === 0 ? 'Sélectionnez au moins un prospect' : 'Prévisualiser puis télécharger'}
		>
			<Icon name="download" size={17} /> Télécharger le PDF
		</button>
	</div>

	<!-- Zone 3 : outils -->
	<div class="tools">
		<div class="search">
			<Icon name="search" size={17} />
			<input type="search" bind:value={search} placeholder="Rechercher un prospect…" aria-label="Rechercher un prospect" />
		</div>
		<button type="button" class="link" onclick={toggleAll} disabled={selectableFiltered.length === 0}>
			<Icon name={allSelectableSelected ? 'deselect' : 'select_all'} size={16} />
			{allSelectableSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
		</button>
		<span class="spacer"></span>
		{#if incompleteCount > 0}
			<button
				type="button"
				class="toggle"
				aria-pressed={includeIncomplete}
				onclick={() => (includeIncomplete = !includeIncomplete)}
			>
				<span class="sw" class:on={includeIncomplete}></span>
				Inclure les {incompleteCount} adresse{incompleteCount > 1 ? 's' : ''} incomplète{incompleteCount > 1 ? 's' : ''}
			</button>
		{/if}
	</div>

	<!-- Zone 4 : contenu -->
	<div class="card">
		{#if prospects.length === 0}
			<div class="state">
				<span class="state-ic"><Icon name="mail" size={24} /></span>
				<h3>Aucun prospect dans cette campagne</h3>
				<p>Ajoutez des prospects en les étiquetant depuis la Prospection, puis revenez générer leurs étiquettes.</p>
			</div>
		{:else}
			<div class="thead">
				<span></span>
				<span>Prospect</span>
				<span class="h-dest">Destinataire</span>
				<span class="h-stat">Statut</span>
			</div>

			{#if filtered.length === 0}
				<div class="state">
					<span class="state-ic"><Icon name={search.trim() ? 'search_off' : 'do_not_disturb'} size={24} /></span>
					{#if search.trim()}
						<h3>Aucun prospect ne correspond</h3>
						<p>Aucun prospect ne correspond à « {search.trim()} »{includeIncomplete ? '' : ' parmi les adresses complètes'}.</p>
					{:else}
						<h3>Aucune adresse complète</h3>
						<p>Activez « Inclure les adresses incomplètes » ci-dessus pour compléter les adresses manquantes.</p>
					{/if}
				</div>
			{:else}
				{#each filtered as p (p.id)}
					{@const st = statutById.get(p.id)}
					{@const complete = st?.complete ?? false}
					{@const checked = selected.has(p.id)}
					{@const busy = completing.has(p.id)}
					<div class="trow" class:sel={checked}>
						<label class="cbx-wrap">
							<input
								type="checkbox"
								class="cbx-input"
								checked={checked}
								disabled={!complete}
								onchange={() => toggle(p.id)}
								aria-label={`Sélectionner ${p.raison_sociale}`}
							/>
							<span class="cbx" class:on={checked} aria-hidden="true"><Icon name="check" size={12} strokeWidth={3} /></span>
						</label>

						<div class="p-col">
							<div class="p-name">{p.raison_sociale}</div>
							{#if complete}
								<div class="p-addr">
									<Icon name="place" size={13} class="p-pin" />
									<span>{adresseLigne(p)}</span>
								</div>
							{:else}
								<div class="p-addr">
									<span class="p-missing">{adresseLigne(p) || 'Adresse manquante'}</span>
								</div>
								<span class="p-tag"><Icon name="warning" size={12} /> Adresse incomplète</span>
							{/if}
						</div>

						<div class="dest-col">
							<input
								class="dest-input"
								value={destinataires.get(p.id) ?? ''}
								disabled={!complete}
								maxlength={120}
								placeholder={complete ? 'Ajouter un destinataire' : 'Complétez l’adresse d’abord'}
								oninput={(e) => setDest(p.id, e.currentTarget.value)}
								aria-label={`Destinataire de l’étiquette pour ${p.raison_sociale}`}
							/>
						</div>

						<div class="stat">
							{#if complete}
								<span class="ready"><span class="bd"></span> Prête</span>
							{:else}
								<button
									type="button"
									class="complete"
									onclick={() => completeOne(p)}
									disabled={busy}
									title="Rechercher l'adresse sur search.ch et la compléter ici"
								>
									{#if busy}
										<span class="spin"></span> Recherche…
									{:else}
										<Icon name="search" size={14} /> Compléter
									{/if}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			{/if}

			<div class="foot">
				<span>{summary.total} prospect{summary.total > 1 ? 's' : ''} dans cette campagne &middot; {selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
			</div>
		{/if}
	</div>

	<!-- Barre d'actions groupées (flottante, apparaît dès qu'une ligne est cochée) -->
	{#if selected.size > 0}
		<div class="bulkbar" role="region" aria-label="Actions groupées sur la sélection">
			<span class="bulk-count"><span class="n tabular">{selected.size}</span> sélectionné{selected.size > 1 ? 's' : ''}</span>
			<span class="bulk-sep"></span>
			<label class="bulk-lab" for="bulk-dest">Adresser à</label>
			<input
				id="bulk-dest"
				class="bulk-input"
				bind:value={bulkValue}
				maxlength={120}
				placeholder="ex. Service technique"
				onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyBulk(); } }}
			/>
			<button type="button" class="bulk-apply" onclick={applyBulk}>
				<Icon name="check" size={15} strokeWidth={2.4} /> Appliquer
			</button>
			<button type="button" class="bulk-clear" onclick={clearBulkDest}>Effacer</button>
			<button type="button" class="bulk-x" onclick={deselectAll} aria-label="Tout désélectionner">
				<Icon name="close" size={16} />
			</button>
		</div>
	{/if}
</div>

<!-- Aperçu de la planche (au clic « Télécharger le PDF ») -->
{#if previewOpen}
	<div class="prev-backdrop"></div>
	<div class="prev-layer">
		<div
			class="prev"
			role="dialog"
			aria-modal="true"
			aria-labelledby={dialogTitleId}
			use:trapFocus
		>
			<div class="prev-h">
				<h2 id={dialogTitleId}>Aperçu de la planche</h2>
				<button type="button" class="prev-x" onclick={closePreview} aria-label="Fermer l'aperçu">
					<Icon name="close" size={18} />
				</button>
			</div>
			<div class="prev-canvas">
				{#each previewSvgs as svg, i (i)}
					<!-- SVG généré par notre moteur (texte échappé via esc()) : contenu contrôlé, pas d'UGC brut. -->
					<div class="sheet">{@html svg}</div>
				{/each}
			</div>
			<div class="prev-foot">
				<span class="count">
					<b>{previewCount} étiquette{previewCount > 1 ? 's' : ''}</b>
					&middot; {pageCount(previewCount)} page{pageCount(previewCount) > 1 ? 's' : ''} A4 &middot; Avery 6122
				</span>
				<div class="actions">
					<button type="button" class="btn-ghost" onclick={closePreview}>Fermer</button>
					<button type="button" class="btn-primary" onclick={downloadPdf} disabled={generating}>
						<Icon name="download" size={17} /> {generating ? 'Génération…' : 'Télécharger le PDF'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Conteneur : gouttière 32px, aligné sur le golden v2 (marges resserrées / cohérentes app). */
	.etq {
		position: relative;
		max-width: 1160px;
		margin: 0 auto;
		padding: 8px 0 96px;
	}

	/* ===== Zone 1 : identité de page ===== */
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding: 8px 32px 0;
	}
	.head-id {
		min-width: 0;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-decoration: none;
		margin-bottom: 12px;
	}
	.back:hover {
		color: var(--color-primary);
	}
	.head h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.2;
		color: var(--color-text);
	}
	.subline {
		margin-top: 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.camp {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px 3px 8px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.04);
	}
	.camp .cdot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}
	.subline .sep {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--color-border-strong);
	}

	.btn-primary {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 18px;
		border: none;
		border-radius: var(--radius-lg);
		background: var(--color-primary);
		color: #fff;
		font: 600 14px var(--font-sans);
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.16);
		transition: background 200ms var(--ease-out-expo), transform 120ms var(--ease-out-expo);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.btn-primary:active:not(:disabled) {
		transform: scale(0.98);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text-body);
		font: 600 14px var(--font-sans);
		cursor: pointer;
		box-shadow: var(--shadow-xs);
	}
	.btn-ghost:hover {
		border-color: var(--color-border-strong);
		background: var(--color-surface-alt);
	}

	/* ===== Zone 3 : outils ===== */
	.tools {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 24px 32px 16px;
	}
	.search {
		position: relative;
		width: 300px;
		max-width: 100%;
	}
	.search :global(svg) {
		position: absolute;
		left: 14px;
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
		font: 14px var(--font-sans);
		color: var(--color-text);
		box-shadow: var(--shadow-xs);
	}
	.search input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 12px;
		border: none;
		background: transparent;
		border-radius: var(--radius-lg);
		font: 600 13px var(--font-sans);
		color: var(--color-primary);
		cursor: pointer;
	}
	.link:hover:not(:disabled) {
		background: var(--color-primary-light);
	}
	.link:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.tools .spacer {
		flex: 1;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		height: 40px;
		padding: 0 16px 0 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-xs);
		font: 600 13px var(--font-sans);
		color: var(--color-text-body);
		cursor: pointer;
	}
	.toggle .sw {
		width: 34px;
		height: 20px;
		border-radius: var(--radius-full);
		background: var(--color-border-strong);
		position: relative;
		transition: background 200ms var(--ease-out-expo);
	}
	.toggle .sw::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		box-shadow: var(--shadow-xs);
		transition: transform 200ms var(--ease-out-expo);
	}
	.toggle .sw.on {
		background: var(--color-primary);
	}
	.toggle .sw.on::after {
		transform: translateX(14px);
	}

	/* ===== Zone 4 : contenu ===== */
	.card {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
		margin: 0 32px;
	}
	.thead,
	.trow {
		display: grid;
		grid-template-columns: 48px minmax(180px, 1fr) minmax(280px, 1.35fr) 132px;
		align-items: center;
		gap: 24px;
		padding: 0 24px;
	}
	.thead > *,
	.trow > * {
		min-width: 0;
	}
	.thead {
		height: 48px;
		border-bottom: 1px solid var(--color-border);
	}
	.thead span {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.thead .h-dest {
		padding-left: 13px;
	}
	.thead .h-stat {
		text-align: right;
	}

	.trow {
		min-height: 80px;
		position: relative;
		border-bottom: 1px solid var(--color-hairline);
		transition: background 160ms var(--ease-out-expo);
	}
	.trow:last-of-type {
		border-bottom: none;
	}
	.trow::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--color-primary);
		opacity: 0;
		transition: opacity 160ms var(--ease-out-expo);
	}
	.trow:hover {
		background: rgba(47, 90, 158, 0.022);
	}
	.trow.sel {
		background: rgba(47, 90, 158, 0.045);
	}
	.trow.sel::before {
		opacity: 1;
	}

	/* case à cocher (input réel masqué + visuel décoratif) */
	.cbx-wrap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		width: 20px;
		height: 20px;
	}
	.cbx-input {
		position: absolute;
		width: 20px;
		height: 20px;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.cbx-input:disabled {
		cursor: not-allowed;
	}
	.cbx {
		width: 20px;
		height: 20px;
		border-radius: 6px;
		border: 1.5px solid var(--color-border-strong);
		display: grid;
		place-items: center;
		background: var(--color-surface);
		color: #fff;
		transition: background 140ms var(--ease-out-expo), border-color 140ms var(--ease-out-expo);
	}
	.cbx :global(svg) {
		opacity: 0;
	}
	.cbx.on {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
	.cbx.on :global(svg) {
		opacity: 1;
	}
	.cbx-input:disabled ~ .cbx {
		background: var(--color-surface-alt);
		border-color: var(--color-border);
		opacity: 0.55;
	}
	.cbx-input:focus-visible ~ .cbx {
		outline: none;
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.28);
		border-color: var(--color-primary);
	}

	/* colonne prospect */
	.p-name {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.01em;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.p-addr {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 4px;
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.25;
	}
	.p-addr :global(.p-pin) {
		flex-shrink: 0;
		color: var(--color-info);
	}
	.p-addr span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.p-missing {
		color: var(--color-text-muted);
		font-style: italic;
	}
	.p-tag {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 6px;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		background: var(--color-warning-light);
		color: var(--color-warning-deep);
		font-size: 12px;
		font-weight: 600;
	}

	/* colonne destinataire */
	.dest-input {
		width: 100%;
		height: 40px;
		padding: 0 12px;
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		background: transparent;
		font: 500 14px var(--font-sans);
		color: var(--color-text);
		transition: background 140ms var(--ease-out-expo), border-color 140ms var(--ease-out-expo), box-shadow 140ms var(--ease-out-expo);
	}
	.dest-input::placeholder {
		color: var(--color-text-muted);
		font-weight: 400;
	}
	.dest-input:hover:not(:disabled) {
		background: var(--color-surface-alt);
	}
	.dest-input:focus {
		outline: none;
		background: var(--color-surface);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.dest-input:disabled {
		color: var(--color-text-muted);
		background: transparent;
		cursor: not-allowed;
	}

	/* colonne statut */
	.stat {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}
	.ready {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-success-deep);
	}
	.ready .bd {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--color-success);
	}
	.complete {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 34px;
		padding: 0 13px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-primary);
		font: 600 13px var(--font-sans);
		cursor: pointer;
		box-shadow: var(--shadow-xs);
	}
	.complete:hover:not(:disabled) {
		border-color: rgba(47, 90, 158, 0.35);
		background: var(--color-primary-light);
	}
	.complete:disabled {
		opacity: 0.7;
		cursor: wait;
	}
	.spin {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid currentColor;
		border-top-color: transparent;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 24px;
		border-top: 1px solid var(--color-border);
		font-size: 13px;
		color: var(--color-text-muted);
	}

	/* état vide / sans résultat */
	.state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		padding: 56px 24px;
	}
	.state-ic {
		width: 56px;
		height: 56px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-2xl);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		margin-bottom: 6px;
	}
	.state h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text);
	}
	.state p {
		margin: 0;
		font-size: 13.5px;
		color: var(--color-text-muted);
		max-width: 44ch;
	}

	/* ===== barre d'actions groupées (flottante, sticky bas) ===== */
	.bulkbar {
		position: sticky;
		bottom: 24px;
		z-index: 12;
		width: fit-content;
		max-width: calc(100% - 64px);
		margin: 28px auto 0;
		display: flex;
		align-items: center;
		gap: 16px;
		height: 64px;
		padding: 0 12px 0 20px;
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-2xl);
		border: 1px solid rgba(17, 24, 39, 0.06);
	}
	.bulk-count {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
	}
	.bulk-count .n {
		min-width: 24px;
		height: 24px;
		padding: 0 7px;
		border-radius: var(--radius-full);
		background: var(--color-primary);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		display: inline-grid;
		place-items: center;
	}
	.bulk-sep {
		width: 1px;
		height: 32px;
		background: var(--color-border);
	}
	.bulk-lab {
		font-size: 13px;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.bulk-input {
		width: 300px;
		max-width: 42vw;
		height: 40px;
		padding: 0 14px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		font: 14px var(--font-sans);
		color: var(--color-text);
	}
	.bulk-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.bulk-apply {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border: none;
		border-radius: var(--radius-lg);
		background: var(--color-primary);
		color: #fff;
		font: 600 14px var(--font-sans);
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.16);
	}
	.bulk-apply:hover {
		background: var(--color-primary-hover);
	}
	.bulk-clear {
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		font: 600 13px var(--font-sans);
		cursor: pointer;
		padding: 0 6px;
		height: 40px;
	}
	.bulk-clear:hover {
		color: var(--color-text);
	}
	.bulk-x {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		border-radius: var(--radius-lg);
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.bulk-x:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}

	/* ===== aperçu ===== */
	.prev-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 22, 40, 0.45);
		z-index: 60;
	}
	.prev-layer {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		pointer-events: none;
	}
	.prev {
		pointer-events: auto;
		width: 720px;
		max-width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-2xl);
		overflow: hidden;
	}
	.prev-h {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-border);
	}
	.prev-h h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text);
	}
	.prev-x {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.prev-x:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.prev-canvas {
		flex: 1;
		overflow-y: auto;
		padding: 40px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		align-items: center;
		background: var(--color-surface-alt);
	}
	.sheet {
		width: 360px;
		max-width: 100%;
		aspect-ratio: 210 / 297;
		background: #fff;
		box-shadow: 0 12px 32px -12px rgba(16, 24, 40, 0.28), 0 0 0 1px rgba(17, 24, 39, 0.05);
		border-radius: 4px;
		overflow: hidden;
	}
	.sheet :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.prev-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 24px;
		border-top: 1px solid var(--color-border);
	}
	.prev-foot .count {
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.prev-foot .count b {
		color: var(--color-text);
		font-weight: 600;
	}
	.prev-foot .actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* ===== responsive : sous 820px, la ligne se réorganise en pile lisible ===== */
	@media (max-width: 820px) {
		.head,
		.tools,
		.card {
			padding-left: 16px;
			padding-right: 16px;
		}
		.card {
			margin-left: 16px;
			margin-right: 16px;
		}
		.thead {
			display: none;
		}
		.trow {
			grid-template-columns: 28px minmax(0, 1fr);
			grid-template-areas:
				'cbx prospect'
				'.   dest'
				'.   stat';
			gap: 8px 16px;
			padding: 16px 20px;
		}
		.cbx-wrap {
			grid-area: cbx;
			align-self: start;
		}
		.p-col {
			grid-area: prospect;
		}
		.dest-col {
			grid-area: dest;
		}
		.stat {
			grid-area: stat;
			justify-content: flex-start;
		}
		.dest-input {
			border-color: var(--color-border);
			background: var(--color-surface);
		}
		.bulkbar {
			flex-wrap: wrap;
			height: auto;
			padding: 14px 16px;
			gap: 10px;
		}
		.bulk-input {
			width: 100%;
			max-width: none;
			flex: 1 1 100%;
			order: 5;
		}
	}
</style>
