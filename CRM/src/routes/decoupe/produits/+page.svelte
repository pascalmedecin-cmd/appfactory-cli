<!--
  Découpe Films - Base produit (écran 2). Catalogue descriptif (pas tarifaire).
  CRUD via ModalForm (tous les attributs data-model), archive = soft-delete (actif=false).
  Réutilise DataTable + styles partagés decoupe.css.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type Produit = (typeof data.produits)[number];

	const FAMILLE_LABEL: Record<string, string> = {
		solaire: 'Solaire',
		securite: 'Sécurité',
		discretion: 'Discrétion'
	};

	let modalOpen = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let selectedId = $state('');
	let selectedActif = $state(true);

	// Champs (chaînes : soumises telles quelles via name=, le schéma Zod coerce).
	let reference = $state('');
	let nom = $state('');
	let famille = $state('solaire');
	let fabricant = $state('');
	let fournisseur = $state('');
	let laizes = $state('');
	let marge = $state('0');
	let recouvrement = $state('0');
	let nestable = $state(true);
	let orientation_imposee = $state(false);
	let jointage_autorise = $state(false);
	let notes = $state('');

	let archiveEl: HTMLFormElement | null = $state(null);
	let restoreEl: HTMLFormElement | null = $state(null);

	const count = $derived(data.produits.length);
	const nbActifs = $derived(data.produits.filter((p) => p.actif).length);
	const nbArchives = $derived(count - nbActifs);

	const columns = [
		{ key: 'reference', label: 'Référence', sortable: true, class: 'w-[15%]' },
		{ key: 'nom', label: 'Produit', sortable: true, class: 'w-[25%]' },
		{ key: 'famille', label: 'Famille', sortable: true, class: 'w-[13%] hidden md:table-cell' },
		{ key: 'laizes', label: 'Laizes (mm)', class: 'w-[17%] hidden lg:table-cell' },
		{ key: 'attributs', label: 'Attributs', class: 'w-[30%]' }
	];

	function openCreate() {
		editMode = false;
		selectedId = '';
		selectedActif = true;
		reference = '';
		nom = '';
		famille = 'solaire';
		fabricant = '';
		fournisseur = '';
		laizes = '';
		marge = '0';
		recouvrement = '0';
		nestable = true;
		orientation_imposee = false;
		jointage_autorise = false;
		notes = '';
		modalOpen = true;
	}

	function openEdit(p: Produit) {
		editMode = true;
		selectedId = p.id;
		selectedActif = p.actif;
		reference = p.reference;
		nom = p.nom;
		famille = p.famille;
		fabricant = p.fabricant ?? '';
		fournisseur = p.fournisseur ?? '';
		laizes = (p.laizes_mm ?? []).join(', ');
		marge = String(p.marge_pose_mm ?? 0);
		recouvrement = String(p.recouvrement_mm ?? 0);
		nestable = p.nestable;
		orientation_imposee = p.orientation_imposee;
		jointage_autorise = p.jointage_autorise;
		notes = p.notes ?? '';
		modalOpen = true;
	}
</script>

<svelte:head><title>Base produit · Découpe Films</title></svelte:head>

{#snippet icScissors(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
{/snippet}
{#snippet icRotate(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
{/snippet}

<section class="df-pagehead">
	<div class="df-pagehead-l">
		<div class="df-kicker">Découpe Films</div>
		<h1 class="df-title-xl">Base produit</h1>
		<div class="df-page-meta">
			<span>{count} produit{count > 1 ? 's' : ''}</span>
			{#if count > 0}
				<span class="df-dot-sep"></span><span>{nbActifs} actif{nbActifs > 1 ? 's' : ''}</span>
				{#if nbArchives > 0}<span class="df-dot-sep"></span><span>{nbArchives} archivé{nbArchives > 1 ? 's' : ''}</span>{/if}
			{/if}
		</div>
	</div>
	<div class="df-pagehead-r">
		<button type="button" class="ws-btn ws-btn-primary df-head-action" onclick={openCreate}>
			<Icon name="add" size={18} />
			Nouveau produit
		</button>
	</div>
</section>

{#if count === 0}
	<EmptyState
		icon="layers"
		title="Aucun produit"
		description="Ajoutez vos films au catalogue (référence, famille, laizes) pour pouvoir les sélectionner à la saisie des vitres."
		actionLabel="Nouveau produit"
		onAction={openCreate}
	/>
{:else}
	<div class="df-card">
		<DataTable
			data={data.produits}
			{columns}
			onRowClick={openEdit}
			searchable={true}
			searchPlaceholder="Rechercher une référence, un nom…"
			embedded
			rowAriaLabel={(p) =>
				`${p.reference} ${p.nom}, famille ${FAMILLE_LABEL[p.famille] ?? p.famille}${p.actif ? '' : ', archivé'}`}
			emptyMessage="Aucun produit"
		>
			{#snippet row(p: Produit)}
				<td class="px-4 py-3">
					<span class="df-td-ref">
						<span class="df-ref-tile df-fam-tile--{p.famille}">{@render icScissors(16)}</span>
						<span class="df-cell-strong">{p.reference}</span>
					</span>
				</td>
				<td class="px-4 py-3">{p.nom}</td>
				<td class="px-4 py-3 hidden md:table-cell">
					<span class="df-pastille df-pastille--{p.famille}">{FAMILLE_LABEL[p.famille] ?? p.famille}</span>
				</td>
				<td class="px-4 py-3 hidden lg:table-cell">
					<span class="df-laizechips">
						{#each p.laizes_mm ?? [] as l (l)}<span class="df-lz">{l}</span>{/each}
					</span>
				</td>
				<td class="px-4 py-3">
					<div class="df-chips">
						{#if p.nestable}
							<span class="df-chip df-chip--ok"><Icon name="check" size={12} /> nestable</span>
						{:else}
							<span class="df-chip df-chip--warn">non nestable</span>
						{/if}
						{#if p.orientation_imposee}
							<span class="df-chip df-chip--warn">{@render icRotate(12)} sens imposé</span>
						{:else}
							<span class="df-chip">{@render icRotate(12)} rotation libre</span>
						{/if}
						{#if p.jointage_autorise}<span class="df-chip df-chip--les"><Icon name="layers" size={12} /> jointage</span>{/if}
						{#if p.marge_pose_mm > 0}<span class="df-chip">marge {p.marge_pose_mm} mm</span>{/if}
						{#if !p.actif}<span class="df-chip">archivé</span>{/if}
					</div>
				</td>
			{/snippet}
		</DataTable>
	</div>
{/if}

<button type="button" class="ws-fab" aria-label="Nouveau produit" onclick={openCreate}>
	<Icon name="add" size={22} />
</button>

<ModalForm
	bind:open={modalOpen}
	title={editMode ? 'Modifier le produit' : 'Nouveau produit'}
	{saving}
	icon="layers"
	maxWidth="max-w-2xl"
>
	<form
		method="POST"
		action={editMode ? '?/update' : '?/create'}
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') {
					modalOpen = false;
					toasts.success(editMode ? 'Produit modifié' : 'Produit ajouté');
				} else if (result.type === 'failure') {
					toasts.error((result.data?.error as string) ?? "Erreur lors de l'enregistrement");
				} else {
					toasts.error("Erreur lors de l'enregistrement");
				}
				await update();
			};
		}}
	>
		{#if editMode}<input type="hidden" name="id" value={selectedId} />{/if}

		<div class="df-form-grid">
			<label class="df-field">
				<span class="df-label">Référence <span class="df-req">*</span></span>
				<input class="df-input" name="reference" bind:value={reference} required maxlength="100" placeholder="SOL-70" />
			</label>
			<label class="df-field">
				<span class="df-label">Famille <span class="df-req">*</span></span>
				<select class="df-select" name="famille" bind:value={famille} required>
					<option value="solaire">Solaire</option>
					<option value="securite">Sécurité</option>
					<option value="discretion">Discrétion</option>
				</select>
			</label>

			<label class="df-field df-col-span">
				<span class="df-label">Nom <span class="df-req">*</span></span>
				<input class="df-input" name="nom" bind:value={nom} required maxlength="200" placeholder="Film solaire 70 %" />
			</label>

			<label class="df-field">
				<span class="df-label">Fabricant <span class="df-opt">(optionnel)</span></span>
				<input class="df-input" name="fabricant" bind:value={fabricant} maxlength="500" />
			</label>
			<label class="df-field">
				<span class="df-label">Fournisseur <span class="df-opt">(optionnel)</span></span>
				<input class="df-input" name="fournisseur" bind:value={fournisseur} maxlength="500" />
			</label>

			<label class="df-field df-col-span">
				<span class="df-label">Laizes disponibles (mm) <span class="df-req">*</span></span>
				<input class="df-input df-num" name="laizes_mm" bind:value={laizes} required placeholder="1520, 1830" />
				<span class="df-hint">Largeurs de rouleau, séparées par une virgule. Entiers en millimètres.</span>
			</label>

			<label class="df-field">
				<span class="df-label">Marge de pose (mm)</span>
				<input class="df-input df-num" type="number" name="marge_pose_mm" bind:value={marge} min="0" step="1" />
				<span class="df-hint">Ajoutée à L et H avant calcul.</span>
			</label>
			<label class="df-field">
				<span class="df-label">Recouvrement entre lés (mm)</span>
				<input class="df-input df-num" type="number" name="recouvrement_mm" bind:value={recouvrement} min="0" step="1" />
				<span class="df-hint">0 = partage géométrique pur.</span>
			</label>

			<div class="df-checks">
				<label class="df-check">
					<input type="checkbox" name="nestable" bind:checked={nestable} />
					<span class="df-check-text">
						<b>Nestable</b>
						<span class="df-check-desc">Décochez pour les produits jamais optimisés (vernis, e-film) : toujours commandés sur-mesure.</span>
					</span>
				</label>
				<label class="df-check">
					<input type="checkbox" name="orientation_imposee" bind:checked={orientation_imposee} />
					<span class="df-check-text">
						<b>Sens de pose imposé</b>
						<span class="df-check-desc">Interdit la rotation 90° des pièces au nesting.</span>
					</span>
				</label>
				<label class="df-check">
					<input type="checkbox" name="jointage_autorise" bind:checked={jointage_autorise} />
					<span class="df-check-text">
						<b>Jointage autorisé</b>
						<span class="df-check-desc">Pose en lés si une vitre dépasse la laize.</span>
					</span>
				</label>
			</div>

			<label class="df-field df-col-span">
				<span class="df-label">Notes <span class="df-opt">(optionnel)</span></span>
				<textarea class="df-textarea" name="notes" bind:value={notes} maxlength="5000" placeholder="Information libre sur le produit…"></textarea>
			</label>
		</div>

		<div class="df-modal-actions">
			{#if editMode && selectedActif}
				<button type="button" class="ws-btn ws-btn-ghost" onclick={() => archiveEl?.requestSubmit()}>
					<Icon name="archive" size={16} />
					Archiver
				</button>
			{:else if editMode && !selectedActif}
				<button type="button" class="ws-btn ws-btn-secondary" onclick={() => restoreEl?.requestSubmit()}>
					Restaurer
				</button>
			{/if}
			<div class="df-spacer"></div>
			<button type="button" class="ws-btn ws-btn-ghost" onclick={() => (modalOpen = false)}>Annuler</button>
			<button type="submit" class="ws-btn ws-btn-primary" disabled={saving || !reference.trim() || !nom.trim()}>
				{saving ? 'Enregistrement…' : editMode ? 'Enregistrer' : 'Ajouter le produit'}
			</button>
		</div>
	</form>

	<!-- Forms secondaires (archive / restauration), déclenchés depuis le pied du modal -->
	<form bind:this={archiveEl} method="POST" action="?/archive" use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'success') { modalOpen = false; toasts.success('Produit archivé'); }
			else toasts.error("Erreur lors de l'archivage");
			await update();
		};
	}}>
		<input type="hidden" name="id" value={selectedId} />
	</form>
	<form bind:this={restoreEl} method="POST" action="?/restore" use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'success') { modalOpen = false; toasts.success('Produit restauré'); }
			else toasts.error('Erreur lors de la restauration');
			await update();
		};
	}}>
		<input type="hidden" name="id" value={selectedId} />
	</form>
</ModalForm>
