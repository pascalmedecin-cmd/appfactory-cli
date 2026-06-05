<!--
  Découpe Films - Fiche chantier + saisie vitres (écran 3). Saisie rapide en ligne
  (focus conservé pour enchaîner), table des vitres, édition/suppression, bouton
  « Optimiser ce chantier ». Réutilise DataTable / ModalForm / ConfirmModal / Badge.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import DataTable from '$lib/components/DataTable.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type Vitre = (typeof data.vitres)[number];

	const FAMILLE_LABEL: Record<string, string> = {
		solaire: 'Solaire',
		securite: 'Sécurité',
		discretion: 'Discrétion'
	};

	const lancee = $derived(data.chantier.statut === 'lancee');
	const nbVitres = $derived(data.vitres.length);
	const noProduit = $derived(data.produits.length === 0);

	// --- Saisie rapide en ligne ---
	let addProduit = $state('');
	let addLargeur = $state('');
	let addHauteur = $state('');
	let addQuantite = $state('1');
	let addType = $state('');
	let addSurMesure = $state(false);
	let addingSaving = $state(false);
	let largeurInput: HTMLInputElement | null = $state(null);

	const addValid = $derived(
		addProduit !== '' && Number(addLargeur) > 0 && Number(addHauteur) > 0 && Number(addQuantite) >= 1
	);

	// --- Édition vitre (modal) ---
	let editOpen = $state(false);
	let editSaving = $state(false);
	let eId = $state('');
	let eProduit = $state('');
	let eLargeur = $state('');
	let eHauteur = $state('');
	let eQuantite = $state('1');
	let eType = $state('');
	let eSurMesure = $state(false);
	let deleteVitreEl: HTMLFormElement | null = $state(null);

	// --- Édition / suppression chantier ---
	let chantierModalOpen = $state(false);
	let chantierSaving = $state(false);
	let cNom = $state('');
	let cClient = $state('');
	let confirmDeleteOpen = $state(false);
	let deletingChantier = $state(false);
	let deleteChantierEl: HTMLFormElement | null = $state(null);

	const columns = [
		{ key: 'produit', label: 'Produit', class: 'w-[30%]' },
		{ key: 'dimensions', label: 'Dimensions', class: 'w-[20%]' },
		{ key: 'quantite', label: 'Qté', class: 'w-[10%]' },
		{ key: 'type_vitrage', label: 'Type de vitrage', class: 'w-[22%] hidden md:table-cell' },
		{ key: 'sur_mesure_fournisseur', label: 'Pose', class: 'w-[18%]' }
	];

	function openEditVitre(v: Vitre) {
		eId = v.id;
		eProduit = v.produit_id;
		eLargeur = String(v.largeur_mm);
		eHauteur = String(v.hauteur_mm);
		eQuantite = String(v.quantite);
		eType = v.type_vitrage ?? '';
		eSurMesure = v.sur_mesure_fournisseur;
		editOpen = true;
	}

	function openEditChantier() {
		cNom = data.chantier.nom;
		cClient = data.chantier.client ?? '';
		chantierModalOpen = true;
	}

	async function afterAdd() {
		// Saisie rapide : on garde le produit + la coche, on remet à zéro les dimensions,
		// et on refocalise la largeur pour enchaîner la vitre suivante.
		addLargeur = '';
		addHauteur = '';
		addQuantite = '1';
		addType = '';
		await tick();
		largeurInput?.focus();
	}
</script>

<svelte:head><title>{data.chantier.nom} · Découpe Films</title></svelte:head>

<a href="/decoupe" class="back-link">
	<Icon name="expand_more" size={16} class="back-chevron" />
	Chantiers
</a>

<section class="fiche-head">
	<div class="fiche-title">
		<h1 class="df-page-title">{data.chantier.nom}</h1>
		<div class="fiche-meta">
			{#if data.chantier.client}<span class="df-cell-muted">{data.chantier.client}</span>{/if}
			<Badge label={lancee ? 'Lancée' : 'En saisie'} variant={lancee ? 'success' : 'muted'} />
			<span class="df-cell-muted">{nbVitres} vitre{nbVitres > 1 ? 's' : ''}</span>
		</div>
	</div>
	<div class="fiche-actions">
		<button type="button" class="ws-btn ws-btn-ghost" onclick={openEditChantier}>
			<Icon name="edit" size={16} />
			Modifier
		</button>
		{#if nbVitres > 0}
			<a class="ws-btn ws-btn-primary" href={`/decoupe/optimisation?chantiers=${data.chantier.id}`}>
				<Icon name="layers" size={16} />
				Optimiser ce chantier
			</a>
		{/if}
	</div>
</section>

{#if noProduit}
	<div class="notice">
		<Icon name="warning" size={18} />
		<span>Aucun produit dans le catalogue. <a href="/decoupe/produits">Ajoutez un film</a> avant de saisir des vitres.</span>
	</div>
{:else}
	<!-- Saisie rapide en ligne -->
	<form
		class="add-vitre"
		method="POST"
		action="?/addVitre"
		use:enhance={() => {
			addingSaving = true;
			return async ({ result, update }) => {
				addingSaving = false;
				if (result.type === 'success') {
					await afterAdd();
				} else if (result.type === 'failure') {
					toasts.error((result.data?.error as string) ?? "Erreur d'ajout");
				} else {
					toasts.error("Erreur d'ajout");
				}
				await update();
			};
		}}
	>
		<input type="hidden" name="chantier_id" value={data.chantier.id} />
		<div class="add-grid">
			<label class="df-field add-produit">
				<span class="df-label">Produit <span class="df-req">*</span></span>
				<select class="df-select" name="produit_id" bind:value={addProduit} required>
					<option value="" disabled>Choisir…</option>
					{#each data.produits as p (p.id)}
						<option value={p.id}>{p.reference} — {p.nom}</option>
					{/each}
				</select>
			</label>
			<label class="df-field">
				<span class="df-label">Largeur (mm) <span class="df-req">*</span></span>
				<input bind:this={largeurInput} class="df-input df-num" type="number" name="largeur_mm" bind:value={addLargeur} min="1" step="1" required placeholder="1200" />
			</label>
			<label class="df-field">
				<span class="df-label">Hauteur (mm) <span class="df-req">*</span></span>
				<input class="df-input df-num" type="number" name="hauteur_mm" bind:value={addHauteur} min="1" step="1" required placeholder="800" />
			</label>
			<label class="df-field add-qte">
				<span class="df-label">Qté</span>
				<input class="df-input df-num" type="number" name="quantite" bind:value={addQuantite} min="1" step="1" />
			</label>
			<label class="df-field add-type">
				<span class="df-label">Type <span class="df-opt">(opt.)</span></span>
				<input class="df-input" name="type_vitrage" bind:value={addType} maxlength="500" placeholder="Double, feuilleté…" />
			</label>
			<label class="add-coche">
				<input type="checkbox" name="sur_mesure_fournisseur" bind:checked={addSurMesure} />
				<span>Sur-mesure fournisseur</span>
			</label>
			<button type="submit" class="ws-btn ws-btn-primary add-submit" disabled={addingSaving || !addValid}>
				<Icon name="add" size={18} />
				Ajouter
			</button>
		</div>
		<p class="add-hint">La marge de pose du produit est ajoutée automatiquement au calcul. « Sur-mesure fournisseur » sort la vitre du nesting (liste de commande).</p>
	</form>

	{#if nbVitres === 0}
		<EmptyState
			icon="layers"
			title="Aucune vitre"
			description="Saisissez la première vitre ci-dessus. Les pièces identiques se regroupent via la quantité."
		/>
	{:else}
		<div class="df-card vitres-card">
			<DataTable
				data={data.vitres}
				{columns}
				onRowClick={openEditVitre}
				searchable={false}
				embedded
				rowAriaLabel={(v) =>
					`Vitre ${v.largeur_mm} sur ${v.hauteur_mm} millimètres, quantité ${v.quantite}${v.produit ? `, produit ${v.produit.reference}` : ''}`}
				emptyMessage="Aucune vitre"
			>
				{#snippet row(v: Vitre)}
					{@const p = v.produit}
					<td class="px-4 py-3">
						{#if p}
							<span class="df-pastille df-pastille--{p.famille}">{p.reference}</span>
							<span class="vitre-prod-nom">{p.nom}</span>
						{:else}
							<span class="df-cell-muted">—</span>
						{/if}
					</td>
					<td class="px-4 py-3 df-num df-cell-strong">{v.largeur_mm} × {v.hauteur_mm}</td>
					<td class="px-4 py-3"><span class="df-count">{v.quantite}</span></td>
					<td class="px-4 py-3 hidden md:table-cell df-cell-muted">{v.type_vitrage || '—'}</td>
					<td class="px-4 py-3">
						{#if v.sur_mesure_fournisseur}
							<span class="df-chip df-chip--warn">Sur-mesure</span>
						{:else}
							<span class="df-cell-muted">Découpe interne</span>
						{/if}
					</td>
				{/snippet}
			</DataTable>
		</div>
	{/if}
{/if}

<!-- Modal édition vitre -->
<ModalForm bind:open={editOpen} title="Modifier la vitre" saving={editSaving} icon="layers">
	<form
		method="POST"
		action="?/updateVitre"
		use:enhance={() => {
			editSaving = true;
			return async ({ result, update }) => {
				editSaving = false;
				if (result.type === 'success') {
					editOpen = false;
					toasts.success('Vitre modifiée');
				} else if (result.type === 'failure') {
					toasts.error((result.data?.error as string) ?? 'Erreur');
				} else {
					toasts.error('Erreur');
				}
				await update();
			};
		}}
	>
		<input type="hidden" name="id" value={eId} />
		<div class="df-form-grid">
			<label class="df-field df-col-span">
				<span class="df-label">Produit <span class="df-req">*</span></span>
				<select class="df-select" name="produit_id" bind:value={eProduit} required>
					{#each data.produits as p (p.id)}
						<option value={p.id}>{p.reference} — {p.nom}</option>
					{/each}
				</select>
			</label>
			<label class="df-field">
				<span class="df-label">Largeur (mm) <span class="df-req">*</span></span>
				<input class="df-input df-num" type="number" name="largeur_mm" bind:value={eLargeur} min="1" step="1" required />
			</label>
			<label class="df-field">
				<span class="df-label">Hauteur (mm) <span class="df-req">*</span></span>
				<input class="df-input df-num" type="number" name="hauteur_mm" bind:value={eHauteur} min="1" step="1" required />
			</label>
			<label class="df-field">
				<span class="df-label">Quantité</span>
				<input class="df-input df-num" type="number" name="quantite" bind:value={eQuantite} min="1" step="1" />
			</label>
			<label class="df-field">
				<span class="df-label">Type <span class="df-opt">(optionnel)</span></span>
				<input class="df-input" name="type_vitrage" bind:value={eType} maxlength="500" />
			</label>
			<label class="df-check df-col-span" style="background:var(--color-surface-alt);padding:12px;border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px var(--color-border)">
				<input type="checkbox" name="sur_mesure_fournisseur" bind:checked={eSurMesure} />
				<span class="df-check-text"><b>Sur-mesure fournisseur</b><span class="df-check-desc">La vitre sort du nesting et passe en liste de commande.</span></span>
			</label>
		</div>

		<div class="df-modal-actions">
			<button type="button" class="ws-btn ws-btn-ghost" onclick={() => deleteVitreEl?.requestSubmit()}>
				<Icon name="delete" size={16} />
				Supprimer
			</button>
			<div class="df-spacer"></div>
			<button type="button" class="ws-btn ws-btn-ghost" onclick={() => (editOpen = false)}>Annuler</button>
			<button type="submit" class="ws-btn ws-btn-primary" disabled={editSaving}>
				{editSaving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>

	<form bind:this={deleteVitreEl} method="POST" action="?/deleteVitre" use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'success') { editOpen = false; toasts.success('Vitre supprimée'); }
			else toasts.error('Erreur lors de la suppression');
			await update();
		};
	}}>
		<input type="hidden" name="id" value={eId} />
	</form>
</ModalForm>

<!-- Modal édition chantier -->
<ModalForm bind:open={chantierModalOpen} title="Modifier le chantier" saving={chantierSaving} icon="edit">
	<form
		method="POST"
		action="?/updateChantier"
		use:enhance={() => {
			chantierSaving = true;
			return async ({ result, update }) => {
				chantierSaving = false;
				if (result.type === 'success') {
					chantierModalOpen = false;
					toasts.success('Chantier modifié');
				} else {
					toasts.error('Erreur');
				}
				await update();
			};
		}}
	>
		<input type="hidden" name="id" value={data.chantier.id} />
		<div class="df-form-grid">
			<label class="df-field df-col-span">
				<span class="df-label">Nom du chantier <span class="df-req">*</span></span>
				<input class="df-input" name="nom" bind:value={cNom} required maxlength="200" />
			</label>
			<label class="df-field df-col-span">
				<span class="df-label">Client <span class="df-opt">(optionnel)</span></span>
				<input class="df-input" name="client" bind:value={cClient} maxlength="500" />
			</label>
		</div>
		<div class="df-modal-actions">
			<button type="button" class="ws-btn ws-btn-danger" onclick={() => { chantierModalOpen = false; confirmDeleteOpen = true; }}>
				<Icon name="delete" size={16} />
				Supprimer le chantier
			</button>
			<div class="df-spacer"></div>
			<button type="button" class="ws-btn ws-btn-ghost" onclick={() => (chantierModalOpen = false)}>Annuler</button>
			<button type="submit" class="ws-btn ws-btn-primary" disabled={chantierSaving || !cNom.trim()}>
				{chantierSaving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</form>
</ModalForm>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Supprimer ce chantier ?"
	message="Le chantier et toutes ses vitres seront supprimés définitivement. Cette action est irréversible."
	confirmLabel="Supprimer"
	variant="danger"
	loading={deletingChantier}
	onConfirm={() => deleteChantierEl?.requestSubmit()}
/>

<form bind:this={deleteChantierEl} method="POST" action="?/deleteChantier" use:enhance={() => {
	deletingChantier = true;
	return async ({ result, update }) => {
		deletingChantier = false;
		if (result.type === 'redirect') { toasts.success('Chantier supprimé'); }
		else if (result.type !== 'success') { toasts.error('Erreur lors de la suppression'); confirmDeleteOpen = false; }
		await update();
	};
}}>
	<input type="hidden" name="id" value={data.chantier.id} />
</form>

<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-decoration: none;
		margin-bottom: 14px;
		transition: color 180ms var(--ease-out-expo);
	}
	.back-link:hover {
		color: var(--color-primary);
	}
	.back-link :global(.back-chevron) {
		transform: rotate(90deg);
	}

	.fiche-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 22px;
	}
	.fiche-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 7px;
		font-size: 14px;
	}
	.fiche-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: none;
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 16px;
		border-radius: var(--radius-lg);
		background: var(--color-warning-light);
		color: #b54708;
		font-size: 14px;
	}
	.notice a {
		color: inherit;
		font-weight: 600;
		text-decoration: underline;
	}

	.add-vitre {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		padding: 18px 20px;
		margin-bottom: 20px;
	}
	.add-grid {
		display: grid;
		grid-template-columns: minmax(180px, 1.6fr) 1fr 1fr 0.7fr 1.2fr auto;
		gap: 12px 14px;
		align-items: end;
	}
	.add-coche {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13.5px;
		color: var(--color-text-body);
		height: 40px;
		white-space: nowrap;
		cursor: pointer;
	}
	.add-coche input {
		width: 16px;
		height: 16px;
		accent-color: var(--color-primary);
		cursor: pointer;
	}
	.add-submit {
		height: 40px;
		white-space: nowrap;
	}
	.add-hint {
		margin-top: 12px;
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.vitre-prod-nom {
		margin-left: 8px;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	@media (max-width: 900px) {
		.add-grid {
			grid-template-columns: 1fr 1fr;
		}
		.add-produit,
		.add-coche,
		.add-submit {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 640px) {
		.fiche-head {
			flex-direction: column;
			align-items: flex-start;
		}
		.add-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
