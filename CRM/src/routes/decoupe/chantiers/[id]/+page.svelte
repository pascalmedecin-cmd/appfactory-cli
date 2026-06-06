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
	import ProductCascade from '$lib/components/decoupe/ProductCascade.svelte';
	import PoseToggle from '$lib/components/decoupe/PoseToggle.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type Vitre = (typeof data.vitres)[number];

	const FAMILLE_LABEL: Record<string, string> = {
		solaire: 'Solaire',
		securite: 'Sécurité',
		discretion: 'Discrétion'
	};
	const NONE = '__none__';

	const lancee = $derived(data.chantier.statut === 'lancee');
	const nbVitres = $derived(data.vitres.length);
	const noProduit = $derived(data.produits.length === 0);

	// --- Bandeau récap (calculé depuis les vitres saisies) ---
	const nbPieces = $derived(data.vitres.reduce((s, v) => s + (v.quantite ?? 0), 0));
	const surfaceM2 = $derived(
		data.vitres.reduce((s, v) => s + (v.largeur_mm * v.hauteur_mm * v.quantite) / 1_000_000, 0)
	);
	const nbProduits = $derived(new Set(data.vitres.map((v) => v.produit_id)).size);
	const nbFamilles = $derived(
		new Set(data.vitres.map((v) => v.produit?.famille).filter(Boolean)).size
	);
	const nbSurMesure = $derived(data.vitres.filter((v) => v.sur_mesure_fournisseur).length);
	const nbAtelier = $derived(nbVitres - nbSurMesure);
	const surfaceLabel = $derived(
		surfaceM2.toLocaleString('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
	);

	// Dérive la famille + le bucket fabricant d'un produit (pour pré-remplir la cascade en édition).
	function famFabOf(produitId: string): { famille: string | null; fabricant: string | null } {
		const p = data.produits.find((x) => x.id === produitId);
		if (!p) return { famille: null, fabricant: null };
		return { famille: p.famille, fabricant: p.fabricant || NONE };
	}

	// --- Saisie rapide ---
	let addFamille = $state<string | null>(null);
	let addFabricant = $state<string | null>(null);
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
	let eFamille = $state<string | null>(null);
	let eFabricant = $state<string | null>(null);
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
		{ key: 'produit', label: 'Produit', class: 'w-[34%]' },
		{ key: 'dimensions', label: 'Dimensions', class: 'w-[18%]' },
		{ key: 'quantite', label: 'Qté', class: 'w-[8%]' },
		{ key: 'type_vitrage', label: 'Type de vitrage', class: 'w-[22%] hidden md:table-cell' },
		{ key: 'sur_mesure_fournisseur', label: 'Découpe', class: 'w-[18%]' }
	];

	function openEditVitre(v: Vitre) {
		eId = v.id;
		const { famille, fabricant } = famFabOf(v.produit_id);
		eFamille = famille;
		eFabricant = fabricant;
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
		// Saisie rapide : on garde le produit choisi + le mode de découpe pour enchaîner,
		// on remet à zéro les dimensions, et on refocalise la largeur.
		addLargeur = '';
		addHauteur = '';
		addQuantite = '1';
		addType = '';
		await tick();
		largeurInput?.focus();
	}
</script>

<svelte:head><title>{data.chantier.nom} · Découpe Films</title></svelte:head>

{#snippet scissorsIco()}
	<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
{/snippet}

<!-- Bloc haut figé (en-tête chantier + bandeau récap) -->
<div class="fiche-freeze">
	<a href="/decoupe" class="back-link">
		<Icon name="expand_more" size={16} class="back-chevron" />
		Chantiers
	</a>

	<section class="fiche-head">
		<div class="fiche-title">
			<div class="df-kicker">{data.chantier.client || 'Fiche chantier'}</div>
			<h1 class="df-title-xl fiche-title-xl">{data.chantier.nom}</h1>
			<div class="fiche-meta">
				<Badge label={lancee ? 'Lancée' : 'En saisie'} variant={lancee ? 'success' : 'muted'} />
				<span class="df-cell-muted">{nbVitres} vitre{nbVitres > 1 ? 's' : ''}{#if nbPieces > nbVitres} · {nbPieces} pièces{/if}</span>
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

	{#if nbVitres > 0}
		<div class="fiche-kpis">
			<div class="fkpi">
				<span class="fkpi-ico fkpi-ico--a"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg></span>
				<div class="fkpi-body"><div class="fkpi-lbl">Vitres saisies</div><div class="fkpi-val df-num">{nbVitres}</div><div class="fkpi-sub"><b>{nbPieces}</b> pièce{nbPieces > 1 ? 's' : ''} au total</div></div>
			</div>
			<div class="fkpi">
				<span class="fkpi-ico fkpi-ico--b"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 3 21" /><path d="M21 3v6h-6" /><path d="M3 21h6v-6" /></svg></span>
				<div class="fkpi-body"><div class="fkpi-lbl">Surface vitrage</div><div class="fkpi-val df-num">{surfaceLabel} <span class="fkpi-unit">m²</span></div><div class="fkpi-sub">cumul des pièces</div></div>
			</div>
			<div class="fkpi">
				<span class="fkpi-ico fkpi-ico--c"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg></span>
				<div class="fkpi-body"><div class="fkpi-lbl">Produits mobilisés</div><div class="fkpi-val df-num">{nbProduits}</div><div class="fkpi-sub"><b>{nbFamilles}</b> famille{nbFamilles > 1 ? 's' : ''}</div></div>
			</div>
			<div class="fkpi">
				<span class="fkpi-ico fkpi-ico--d"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg></span>
				<div class="fkpi-body"><div class="fkpi-lbl">Sur mesure fournisseur</div><div class="fkpi-val df-num">{nbSurMesure}</div><div class="fkpi-sub"><b>{nbAtelier}</b> en découpe atelier</div></div>
			</div>
		</div>
	{/if}
</div>

{#if noProduit}
	<div class="notice">
		<Icon name="warning" size={18} />
		<span>Aucun produit dans le catalogue. <a href="/decoupe/produits">Ajoutez un film</a> avant de saisir des vitres.</span>
	</div>
{:else}
	<!-- Saisie d'une vitre : produit en cascade puis dimensions -->
	<form
		class="add-card"
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
		<input type="hidden" name="produit_id" value={addProduit} />
		<input type="hidden" name="sur_mesure_fournisseur" value={addSurMesure ? 'true' : 'false'} />

		<div class="add-head">
			<span class="add-head-ico"><Icon name="add" size={20} /></span>
			<div>
				<div class="add-head-h">Ajouter une vitre</div>
				<div class="add-head-p">Choisissez le produit en 3 temps, puis les dimensions. La ligne reste prête pour la suivante.</div>
			</div>
		</div>

		<ProductCascade
			produits={data.produits}
			bind:famille={addFamille}
			bind:fabricant={addFabricant}
			bind:produitId={addProduit}
		/>

		<div class="dimrow">
			<label class="df-field">
				<span class="df-label">Largeur (mm) <span class="df-req">*</span></span>
				<input bind:this={largeurInput} class="df-input df-num" type="number" name="largeur_mm" bind:value={addLargeur} min="1" step="1" required />
			</label>
			<label class="df-field">
				<span class="df-label">Hauteur (mm) <span class="df-req">*</span></span>
				<input class="df-input df-num" type="number" name="hauteur_mm" bind:value={addHauteur} min="1" step="1" required />
			</label>
			<label class="df-field">
				<span class="df-label">Qté</span>
				<input class="df-input df-num" type="number" name="quantite" bind:value={addQuantite} min="1" step="1" />
			</label>
			<label class="df-field">
				<span class="df-label">Type de vitrage <span class="df-opt">(opt.)</span></span>
				<input class="df-input" name="type_vitrage" bind:value={addType} maxlength="500" />
			</label>
		</div>

		<div class="poserow">
			<div class="poseblock">
				<div class="df-label">Mode de découpe</div>
				<PoseToggle bind:value={addSurMesure} idPrefix="add-pose" />
			</div>
			<button type="submit" class="ws-btn ws-btn-primary add-submit" disabled={addingSaving || !addValid}>
				<Icon name="add" size={18} />
				Ajouter la vitre
			</button>
		</div>
		<p class="posehint">
			<Icon name="info" size={14} />
			<span>
				{#if addSurMesure}
					Sur mesure fournisseur : la vitre sort de l'optimisation et part en liste de commande chez le fournisseur.
				{:else}
					Découpe atelier : la vitre entre dans l'optimisation du rouleau. La marge de pose du produit est ajoutée au calcul.
				{/if}
			</span>
		</p>
	</form>

	{#if nbVitres === 0}
		<EmptyState
			icon="layers"
			title="Aucune vitre"
			description="Saisissez la première vitre ci-dessus. Les pièces identiques se regroupent via la quantité."
		/>
	{:else}
		<h2 class="df-sec-h">Vitres saisies <span class="df-sec-count">· {nbVitres}</span></h2>
		<div class="df-card vitres-card">
			<DataTable
				data={data.vitres}
				{columns}
				onRowClick={openEditVitre}
				searchable={false}
				embedded
				rowAriaLabel={(v) =>
					`Vitre ${v.largeur_mm} sur ${v.hauteur_mm} millimètres, quantité ${v.quantite}${v.produit ? `, produit ${v.produit.nom}` : ''}`}
				emptyMessage="Aucune vitre"
			>
				{#snippet row(v: Vitre)}
					{@const p = v.produit}
					<td class="px-4 py-3">
						{#if p}
							<span class="prod-ref">
								<span class="df-ref-tile df-fam-tile--{p.famille}">{@render scissorsIco()}</span>
								<span class="prod-id-wrap">
									<span class="prod-nom">{p.nom}</span>
									<span class="prod-id">{#if p.fabricant}{p.fabricant} · {/if}#{p.reference}</span>
								</span>
							</span>
						{:else}
							<span class="df-cell-muted">—</span>
						{/if}
					</td>
					<td class="px-4 py-3 df-num df-cell-strong">{v.largeur_mm} × {v.hauteur_mm} mm</td>
					<td class="px-4 py-3"><span class="df-count">×{v.quantite}</span></td>
					<td class="px-4 py-3 hidden md:table-cell df-cell-muted">{v.type_vitrage || '—'}</td>
					<td class="px-4 py-3">
						{#if v.sur_mesure_fournisseur}
							<span class="posechip posechip--four">
								<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
								Sur mesure
							</span>
						{:else}
							<span class="posechip posechip--atelier">{@render scissorsIco()}Atelier</span>
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
		<input type="hidden" name="produit_id" value={eProduit} />
		<input type="hidden" name="sur_mesure_fournisseur" value={eSurMesure ? 'true' : 'false'} />

		<div class="edit-stack">
			<ProductCascade
				produits={data.produits}
				bind:famille={eFamille}
				bind:fabricant={eFabricant}
				bind:produitId={eProduit}
			/>

			<div class="df-form-grid">
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
					<span class="df-label">Type de vitrage <span class="df-opt">(optionnel)</span></span>
					<input class="df-input" name="type_vitrage" bind:value={eType} maxlength="500" />
				</label>
			</div>

			<div class="poseblock">
				<div class="df-label">Mode de découpe</div>
				<PoseToggle bind:value={eSurMesure} idPrefix="edit-pose" />
			</div>
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
	/* --- Bloc haut figé --- */
	.fiche-freeze {
		position: sticky;
		/* sous PortailHeader (72px) + barre d'outils Découpe (56px) */
		top: 128px;
		z-index: 10;
		margin: -28px -24px 24px;
		padding: 22px 24px 18px;
		background: var(--color-surface-alt);
		box-shadow: 0 1px 0 var(--color-border), 0 12px 18px -16px rgba(17, 24, 39, 0.22);
	}

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
	}
	.fiche-title-xl {
		font-size: 24px;
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

	/* --- Bandeau récap (KPIs) --- */
	.fiche-kpis {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
		margin-top: 18px;
	}
	.fkpi {
		display: flex;
		align-items: flex-start;
		gap: 13px;
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-card);
		padding: 16px 18px;
	}
	.fkpi-ico {
		width: 38px;
		height: 38px;
		border-radius: 11px;
		display: grid;
		place-items: center;
		flex: none;
	}
	.fkpi-ico--a {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.fkpi-ico--b {
		background: #eef6ff;
		color: #1d6fbf;
	}
	.fkpi-ico--c {
		background: var(--df-surface-sunken, #f3f4f6);
		color: var(--color-text-body);
	}
	.fkpi-ico--d {
		background: var(--color-warning-light);
		color: var(--df-amber-tx, #b54708);
	}
	.fkpi-body {
		min-width: 0;
	}
	.fkpi-lbl {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.fkpi-val {
		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--color-text);
		margin-top: 3px;
		display: flex;
		align-items: baseline;
		gap: 5px;
	}
	.fkpi-unit {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.fkpi-sub {
		font-size: 12px;
		color: var(--df-text-faint, #6b7280);
		margin-top: 3px;
	}
	.fkpi-sub b {
		color: var(--color-text-body);
		font-weight: 600;
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

	/* --- Carte de saisie --- */
	.add-card {
		background: var(--color-surface);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-card);
		padding: 24px 24px 22px;
		margin-bottom: 24px;
	}
	.add-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 22px;
	}
	.add-head-ico {
		width: 38px;
		height: 38px;
		border-radius: 11px;
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: grid;
		place-items: center;
		flex: none;
	}
	.add-head-h {
		font-size: 16px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text);
	}
	.add-head-p {
		font-size: 12.5px;
		color: var(--color-text-muted);
		margin-top: 1px;
	}
	.dimrow {
		display: grid;
		grid-template-columns: 1fr 1fr 90px 1.4fr;
		gap: 14px;
		margin-top: 22px;
	}
	.poserow {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-top: 20px;
	}
	.poseblock {
		min-width: 0;
	}
	.poseblock .df-label {
		margin-bottom: 7px;
	}
	.add-submit {
		height: 46px;
		padding: 0 22px;
		font-size: 14.5px;
		white-space: nowrap;
	}
	.posehint {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-top: 14px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.posehint :global(svg) {
		color: var(--df-text-faint, #6b7280);
		flex: none;
	}

	/* --- Table enrichie --- */
	.prod-ref {
		display: inline-flex;
		align-items: center;
		gap: 11px;
	}
	.prod-ref :global(.df-ref-tile svg) {
		width: 16px;
		height: 16px;
	}
	.prod-id-wrap {
		min-width: 0;
	}
	.prod-nom {
		display: block;
		font-weight: 600;
		color: var(--color-text);
	}
	.prod-id {
		display: block;
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--df-text-faint, #6b7280);
		margin-top: 1px;
	}
	.posechip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 25px;
		padding: 0 11px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.posechip :global(svg) {
		flex: none;
	}
	.posechip--atelier {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	.posechip--four {
		background: var(--color-warning-light);
		color: var(--df-amber-tx, #b54708);
		box-shadow: inset 0 0 0 1px var(--df-amber-bd, #fedf89);
	}

	/* L'en-tête de colonnes de la DataTable ne colle pas (le bloc figé porte déjà
	   le contexte persistant) : sinon son thead sticky chevauche le freeze. */
	.vitres-card :global(thead) {
		position: static;
	}

	/* --- Modale d'édition --- */
	.edit-stack {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	@media (max-width: 980px) {
		.fiche-kpis {
			grid-template-columns: 1fr 1fr;
		}
		.dimrow {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 640px) {
		.fiche-freeze {
			top: 116px;
			margin: -20px -16px 20px;
			padding: 18px 16px 16px;
		}
		.fiche-head {
			flex-direction: column;
			align-items: flex-start;
		}
		.poserow {
			flex-direction: column;
			align-items: stretch;
		}
		.add-submit {
			width: 100%;
			justify-content: center;
		}
	}
	@media (max-width: 560px) {
		.fiche-kpis {
			grid-template-columns: 1fr;
		}
		.dimrow {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
