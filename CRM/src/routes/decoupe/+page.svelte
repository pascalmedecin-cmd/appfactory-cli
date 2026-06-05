<!--
  Découpe Films - Liste des chantiers (écran 1). Réutilise les primitives CRM
  (DataTable, Badge, EmptyState, ModalForm, Icon, toasts) + styles partagés decoupe.css.
  Clic ligne → fiche chantier.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import DataTable from '$lib/components/DataTable.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type Chantier = (typeof data.chantiers)[number];

	let modalOpen = $state(false);
	let saving = $state(false);
	let nom = $state('');
	let client = $state('');

	const count = $derived(data.chantiers.length);

	const columns = [
		{ key: 'nom', label: 'Chantier', sortable: true, class: 'w-[34%]' },
		{ key: 'client', label: 'Client', sortable: true, class: 'w-[22%] hidden md:table-cell' },
		{ key: 'nb_vitres', label: 'Vitres', class: 'w-[12%]' },
		{ key: 'statut', label: 'Statut', sortable: true, class: 'w-[16%]' },
		{ key: 'updated_at', label: 'Modifié', sortable: true, class: 'w-[14%] hidden lg:table-cell' }
	];

	function statutLabel(s: string): string {
		return s === 'lancee' ? 'Lancée' : 'En saisie';
	}
	function statutVariant(s: string): 'success' | 'muted' {
		return s === 'lancee' ? 'success' : 'muted';
	}
	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function openCreate() {
		nom = '';
		client = '';
		modalOpen = true;
	}
	function openChantier(c: Chantier) {
		goto(`/decoupe/chantiers/${c.id}`);
	}
</script>

<svelte:head><title>Chantiers · Découpe Films</title></svelte:head>

<section class="df-page-head">
	<div>
		<h1 class="df-page-title">Chantiers</h1>
		<p class="df-page-sub">
			{count === 0
				? 'Créez un chantier pour saisir vos vitres et optimiser la découpe.'
				: `${count} chantier${count > 1 ? 's' : ''} · saisissez les vitres puis lancez l'optimisation.`}
		</p>
	</div>
	<button type="button" class="ws-btn ws-btn-primary df-head-action" onclick={openCreate}>
		<Icon name="add" size={18} />
		Nouveau chantier
	</button>
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
	<div class="df-card">
		<DataTable
			data={data.chantiers}
			{columns}
			onRowClick={openChantier}
			searchable={false}
			embedded
			rowAriaLabel={(c) =>
				`Chantier ${c.nom}${c.client ? `, client ${c.client}` : ''}, ${c.nb_vitres} vitre${c.nb_vitres > 1 ? 's' : ''}, ${statutLabel(c.statut)}`}
			emptyMessage="Aucun chantier"
		>
			{#snippet row(c: Chantier)}
				<td class="px-4 py-3"><span class="df-cell-strong">{c.nom}</span></td>
				<td class="px-4 py-3 hidden md:table-cell df-cell-muted">{c.client || '—'}</td>
				<td class="px-4 py-3"><span class="df-count">{c.nb_vitres}</span></td>
				<td class="px-4 py-3">
					<Badge label={statutLabel(c.statut)} variant={statutVariant(c.statut)} />
				</td>
				<td class="px-4 py-3 hidden lg:table-cell df-cell-muted df-num">{formatDate(c.updated_at)}</td>
			{/snippet}
		</DataTable>
	</div>
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
