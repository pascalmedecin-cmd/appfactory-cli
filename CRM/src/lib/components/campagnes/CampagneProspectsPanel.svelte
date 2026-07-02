<script lang="ts">
	/**
	 * Panneau « Prospects de la campagne » (écran Campagnes). Remplace l'aller-retour vers la
	 * Prospection : consultation des prospects étiquetés SANS quitter la page (slide-out, même
	 * primitive que la fiche prospect). L'ouverture dans la Prospection reste possible mais
	 * devient un choix explicite (pied de panneau), plus jamais une obligation.
	 *
	 * Données : GET /api/campagnes/[id]/prospects (adresse + statut + score + source), chargées à
	 * l'ouverture. Garde anti-course `campId` sur les requêtes en vol : le composant est réutilisé
	 * d'une campagne à l'autre sans remount (cf. feedback_sveltekit_page_reuse_reset_local_state).
	 * Retrait d'étiquette : DELETE /api/prospection/lead-campagnes (le prospect reste en
	 * Prospection), maj locale + invalidateAll (compteurs de la liste + KPI à jour).
	 */
	import SlideOut from '$lib/components/SlideOut.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
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
	let loading = $state(false);
	let loadError = $state(false);
	let search = $state('');

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
			const resp = await fetch(`/api/campagnes/${campId}/prospects`);
			const d = await resp.json().catch(() => null);
			if (inflightToken !== token) return; // réponse périmée
			if (resp.ok && d && Array.isArray(d.prospects)) {
				prospects = d.prospects;
			} else {
				loadError = true;
			}
		} catch {
			if (inflightToken === token) loadError = true;
		} finally {
			if (inflightToken === token) loading = false;
		}
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
		prospects = [];
		search = '';
		load(campagne.id);
	});

	const filtered = $derived(filterProspectsCampagne(prospects, search));

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
				if (campagne?.id === c.id) prospects = prospects.filter((x) => x.id !== p.id);
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
</script>

<SlideOut bind:open title={campagne?.nom ?? ''} width="600px">
	{#if campagne}
		<div class="flex flex-col gap-4 h-full">
			<!-- Rappel de contexte : couleur + statut + compteur -->
			<div class="flex items-center gap-2.5 flex-wrap">
				<span class="camp-chip {campClass(campagne.couleur)}">
					{campagne.archived ? 'Archivée' : campagneStatutLabel(campagne.statut)}
				</span>
				<span class="text-sm text-text-muted">
					{shownCount} prospect{shownCount > 1 ? 's' : ''} étiqueté{shownCount > 1 ? 's' : ''}
				</span>
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

				{#if filtered.length === 0}
					<p class="text-sm text-text-muted px-1 py-6 text-center">
						Aucun prospect ne correspond à « {search.trim()} ».
					</p>
				{:else}
					<ul class="prospect-list" aria-label={`Prospects de la campagne ${campagne.nom}`}>
						{#each filtered as p (p.id)}
							<li class="prospect-row">
								<div class="min-w-0 flex-1">
									<div class="prospect-name" title={p.raison_sociale}>{p.raison_sociale}</div>
									<div class="prospect-sub">
										{adresseCourte(p)}<span class="sub-sep">·</span>{sourceLabel(p.source)}
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
	{/snippet}
</SlideOut>

<style>
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
		gap: 12px;
		padding: 11px 4px;
		border-bottom: 1px solid var(--color-hairline);
	}
	.prospect-row:last-child {
		border-bottom: none;
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
