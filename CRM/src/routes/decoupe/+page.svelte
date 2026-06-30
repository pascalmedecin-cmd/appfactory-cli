<!--
  Découpe Films - Liste des chantiers (écran 1). Refonte 2026-06-29 : lignes-cartes premium
  groupées par statut (En saisie / Lancées), tuile couleur-famille + nom + client + méta-chips
  + pastille de statut. Recherche client-side. Clic ligne → fiche chantier.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { familleColor } from '$lib/decoupe/presenter';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type Chantier = (typeof data.chantiers)[number];

	const FAMILLE_LABEL: Record<string, string> = {
		solaire: 'Solaire',
		securite: 'Sécurité',
		discretion: 'Discrétion'
	};

	let modalOpen = $state(false);
	let saving = $state(false);
	let nom = $state('');
	let client = $state('');
	let query = $state('');

	const count = $derived(data.chantiers.length);
	const nbEnSaisie = $derived(data.chantiers.filter((c) => c.statut !== 'lancee').length);
	const nbLancees = $derived(data.chantiers.filter((c) => c.statut === 'lancee').length);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data.chantiers;
		return data.chantiers.filter((c) => `${c.nom} ${c.client ?? ''}`.toLowerCase().includes(q));
	});
	const enSaisie = $derived(filtered.filter((c) => c.statut !== 'lancee'));
	const lancees = $derived(filtered.filter((c) => c.statut === 'lancee'));

	// Tuile : couleur de la famille si une seule, bleu primaire si plusieurs (ou aucune).
	function tileColor(c: Chantier): string {
		return c.familles.length === 1 ? familleColor(c.familles[0]) : 'var(--color-primary)';
	}
	function formatDateShort(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
	}

	function openCreate() {
		nom = '';
		client = '';
		modalOpen = true;
	}
</script>

<svelte:head><title>Chantiers · Découpe Films</title></svelte:head>

<!-- Icônes Lucide inline (décoratives → aria-hidden) -->
{#snippet icBuilding()}
	<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>
{/snippet}
{#snippet icFrame()}
	<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
{/snippet}
{#snippet icCalendar()}
	<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>
{/snippet}
{#snippet icPencil()}
	<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
{/snippet}
{#snippet icCheck()}
	<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
{/snippet}
{#snippet icChevron()}
	<svg class="df-chrow-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
{/snippet}
{#snippet icSearch()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
{/snippet}

{#snippet chantierCard(c: Chantier)}
	<a
		class="df-chrow"
		href={`/decoupe/chantiers/${c.id}`}
		aria-label={`Chantier ${c.nom}${c.client ? `, client ${c.client}` : ''}, ${c.nb_vitres} vitre${c.nb_vitres > 1 ? 's' : ''}, ${c.statut === 'lancee' ? 'lancée' : 'en saisie'}`}
	>
		<span class="df-chrow-tile" style="background:{tileColor(c)}">{@render icBuilding()}</span>
		<div class="df-chrow-main">
			<div class="df-chrow-nom">{c.nom}</div>
			{#if c.client}<div class="df-chrow-client">{c.client}</div>{/if}
			<div class="df-chrow-meta">
				<span class="df-mchip">{@render icFrame()}<span class="df-num">{c.nb_vitres}</span> vitre{c.nb_vitres > 1 ? 's' : ''}</span>
				{#if c.familles.length > 0}
					<span class="df-chrow-fams">
						{#each c.familles as f (f)}<span class="df-pastille df-pastille--{f}">{FAMILLE_LABEL[f] ?? f}</span>{/each}
					</span>
				{/if}
				<span class="df-mchip">{@render icCalendar()}{formatDateShort(c.updated_at)}</span>
			</div>
		</div>
		<div class="df-chrow-right">
			{#if c.statut === 'lancee'}
				<span class="df-statepill df-statepill--ok">{@render icCheck()} Lancée</span>
			{:else}
				<span class="df-statepill df-statepill--saisie">{@render icPencil()} En saisie</span>
			{/if}
			{@render icChevron()}
		</div>
	</a>
{/snippet}

<section class="df-pagehead">
	<div class="df-pagehead-l">
		<div class="df-kicker">Découpe Films</div>
		<h1 class="df-title-xl">Chantiers</h1>
		<div class="df-page-meta">
			<span>{count} chantier{count > 1 ? 's' : ''} actif{count > 1 ? 's' : ''}</span>
			{#if count > 0}
				<span class="df-dot-sep"></span><span>{nbEnSaisie} en saisie</span>
				<span class="df-dot-sep"></span><span>{nbLancees} lancée{nbLancees > 1 ? 's' : ''}</span>
			{/if}
		</div>
	</div>
	<div class="df-pagehead-r">
		<button type="button" class="ws-btn ws-btn-primary df-head-action" onclick={openCreate}>
			<Icon name="add" size={18} />
			Nouveau chantier
		</button>
	</div>
</section>

{#if count === 0}
	<EmptyState
		icon="layers"
		title="Aucun chantier"
		description="Un chantier regroupe les vitres d'un même projet. Créez-en un pour commencer."
		actionLabel="Nouveau chantier"
		onAction={openCreate}
	/>
{:else}
	<div class="df-listbar">
		<label class="df-search">
			<span class="sr-only">Rechercher un chantier</span>
			{@render icSearch()}
			<input type="search" bind:value={query} placeholder="Rechercher un chantier, un client…" />
		</label>
	</div>

	{#if filtered.length === 0}
		<EmptyState icon="search" title="Aucun résultat" description={`Aucun chantier ne correspond à « ${query} ».`} />
	{:else}
		{#if enSaisie.length > 0}
			<h2 class="df-sec-h">En saisie<span class="df-sec-count">· {enSaisie.length}</span><span class="df-sec-line"></span></h2>
			{#each enSaisie as c (c.id)}{@render chantierCard(c)}{/each}
		{/if}
		{#if lancees.length > 0}
			<h2 class="df-sec-h">Lancées<span class="df-sec-count">· {lancees.length}</span><span class="df-sec-line"></span></h2>
			{#each lancees as c (c.id)}{@render chantierCard(c)}{/each}
		{/if}
	{/if}
{/if}

<!-- FAB mobile (.ws-fab : visible < 768px uniquement) -->
<button type="button" class="ws-fab" aria-label="Nouveau chantier" onclick={openCreate}>
	<Icon name="add" size={22} />
</button>

<ModalForm bind:open={modalOpen} title="Nouveau chantier" {saving} icon="layers">
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') {
					modalOpen = false;
					toasts.success('Chantier créé');
				} else if (result.type === 'failure') {
					toasts.error((result.data?.error as string) ?? 'Erreur lors de la création');
				} else {
					toasts.error('Erreur lors de la création');
				}
				await update();
			};
		}}
	>
		<div class="df-form-grid">
			<label class="df-field df-col-span">
				<span class="df-label">Nom du chantier <span class="df-req">*</span></span>
				<input class="df-input" bind:value={nom} required maxlength="200" placeholder="Villa Léman, étage 2" />
			</label>
			<label class="df-field df-col-span">
				<span class="df-label">Client <span class="df-opt">(optionnel)</span></span>
				<input class="df-input" bind:value={client} maxlength="500" placeholder="Régie, architecte, particulier…" />
			</label>
		</div>

		<input type="hidden" name="nom" value={nom} />
		<input type="hidden" name="client" value={client} />

		<div class="df-modal-actions">
			<div class="df-spacer"></div>
			<button type="button" class="ws-btn ws-btn-ghost" onclick={() => (modalOpen = false)}>Annuler</button>
			<button type="submit" class="ws-btn ws-btn-primary" disabled={saving || !nom.trim()}>
				{saving ? 'Création…' : 'Créer le chantier'}
			</button>
		</div>
	</form>
</ModalForm>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
