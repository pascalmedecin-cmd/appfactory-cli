<script lang="ts">
	/**
	 * Écran dédié « Campagnes » (Vague 3.2, flag ffCrmListesV2). Le centre de gestion :
	 * créer / renommer / recolorer / archiver / supprimer, compter les prospects (lien vers
	 * Prospection filtrée). Suppression = confirmation rassurante (retire l'étiquette, ne
	 * supprime jamais les prospects). Mêmes tokens/primitives que les goldens Vague 2/3.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import KpiStrip, { type KpiItem } from '$lib/components/KpiStrip.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { CRM_BASE } from '$lib/config';
	import {
		COULEUR_SLUGS,
		DEFAULT_COULEUR,
		CAMPAGNE_NOM_MAX,
		CAMPAGNE_DESC_MAX,
		swatchClass,
		type CouleurSlug,
		type CampagneWithCount,
	} from '$lib/campagnes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'actives' | 'archived'>('actives');
	let search = $state('');
	let menuOpenId = $state<string | null>(null);

	$effect(() => {
		$pageSubtitle = `${data.stats.actives} campagne${data.stats.actives > 1 ? 's' : ''} active${data.stats.actives > 1 ? 's' : ''}`;
	});

	const visible = $derived(
		data.campagnes
			.filter((c) => (activeTab === 'actives' ? !c.archived : c.archived))
			.filter((c) => c.nom.toLowerCase().includes(search.trim().toLowerCase())),
	);

	const kpiItems = $derived<KpiItem[]>([
		{ icon: 'sell', value: data.stats.actives, label: 'Campagnes actives', tone: 'primary' },
		{ icon: 'group', value: data.stats.taggedLeads, label: 'Prospects étiquetés', tone: 'convert' },
		{ icon: 'do_not_disturb', value: data.stats.sansCampagne, label: 'Sans campagne', tone: 'primary' },
	]);

	function dateLong(iso: string | null): string {
		if (!iso) return '–';
		return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function goToProspection(id: string) {
		goto(`${CRM_BASE}/prospection?campagne=${id}`);
	}

	// --- Étiquettes d'adresses (publipostage) : page dédiée ---
	function goToEtiquettes(c: CampagneWithCount) {
		menuOpenId = null;
		goto(`${CRM_BASE}/campagnes/${c.id}/etiquettes`);
	}

	// --- Création ---
	let createOpen = $state(false);
	let createNom = $state('');
	let createCouleur = $state<CouleurSlug>(DEFAULT_COULEUR);
	let createDesc = $state('');
	let createBusy = $state(false);

	function openCreate() {
		createNom = '';
		createCouleur = COULEUR_SLUGS[data.campagnes.length % COULEUR_SLUGS.length];
		createDesc = '';
		createOpen = true;
	}
	async function submitCreate() {
		const nom = createNom.trim();
		if (!nom || createBusy) return;
		createBusy = true;
		try {
			const resp = await fetch('/api/campagnes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nom, couleur: createCouleur, description: createDesc.trim() || null }),
			});
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				toasts.success(`Campagne « ${nom} » créée`);
				createOpen = false;
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Création impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			createBusy = false;
		}
	}

	// --- Renommage ---
	let renameTarget = $state<CampagneWithCount | null>(null);
	let renameNom = $state('');
	let renameBusy = $state(false);

	function openRename(c: CampagneWithCount) {
		menuOpenId = null;
		renameTarget = c;
		renameNom = c.nom;
	}
	async function submitRename() {
		const c = renameTarget;
		const nom = renameNom.trim();
		if (!c || !nom || renameBusy) return;
		renameBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nom }),
			});
			const d = await resp.json().catch(() => null);
			if (resp.ok) {
				toasts.success('Campagne renommée');
				renameTarget = null;
				await invalidateAll();
			} else {
				toasts.error(d?.error || 'Renommage impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			renameBusy = false;
		}
	}

	// --- Archivage / réactivation ---
	async function toggleArchive(c: CampagneWithCount) {
		menuOpenId = null;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ archived: !c.archived }),
			});
			if (resp.ok) {
				toasts.success(c.archived ? 'Campagne réactivée' : 'Campagne archivée');
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Action impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		}
	}

	// --- Suppression ---
	let deleteTarget = $state<CampagneWithCount | null>(null);
	let deleteBusy = $state(false);

	function openDelete(c: CampagneWithCount) {
		menuOpenId = null;
		deleteTarget = c;
	}
	async function confirmDelete() {
		const c = deleteTarget;
		if (!c || deleteBusy) return;
		deleteBusy = true;
		try {
			const resp = await fetch(`/api/campagnes/${c.id}`, { method: 'DELETE' });
			if (resp.ok) {
				toasts.success('Campagne supprimée');
				deleteTarget = null;
				await invalidateAll();
			} else {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Suppression impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			deleteBusy = false;
		}
	}

	const deleteMessage = $derived(
		deleteTarget
			? `L'étiquette sera retirée de ${deleteTarget.lead_count} prospect${deleteTarget.lead_count > 1 ? 's' : ''}. Les prospects eux-mêmes ne sont pas supprimés : ils restent dans Prospection, simplement sans cette campagne.`
			: '',
	);

	$effect(() => {
		if (menuOpenId === null) return;
		const onClick = () => (menuOpenId = null);
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});
</script>

<div class="ws-bound">
	<header class="head">
		<div>
			<h2>Campagnes</h2>
			<p>Regrouper les prospects par action commerciale. Une entreprise peut porter plusieurs campagnes.</p>
		</div>
		<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}>
			<Icon name="add" size={17} /> Nouvelle campagne
		</button>
	</header>

	<KpiStrip items={kpiItems} ariaLabel="Indicateurs campagnes" />

	<div class="toolbar">
		<div class="segtabs" role="tablist" aria-label="Filtrer les campagnes">
			<button type="button" id="camptab-actives" class="segtab" class:active={activeTab === 'actives'} role="tab" aria-selected={activeTab === 'actives'} aria-controls="campagnes-panel" onclick={() => (activeTab = 'actives')}>
				Actives <span class="ct">{data.stats.actives}</span>
			</button>
			<button type="button" id="camptab-archived" class="segtab" class:active={activeTab === 'archived'} role="tab" aria-selected={activeTab === 'archived'} aria-controls="campagnes-panel" onclick={() => (activeTab = 'archived')}>
				Archivées <span class="ct">{data.stats.archived}</span>
			</button>
		</div>
		<div class="search">
			<Icon name="search" size={17} />
			<input type="search" bind:value={search} placeholder="Rechercher une campagne…" aria-label="Rechercher une campagne" />
		</div>
	</div>

	<div id="campagnes-panel" role="tabpanel" aria-labelledby={`camptab-${activeTab}`}>
	{#if visible.length === 0}
		<div class="empty">
			<span class="empty-ic"><Icon name={search.trim() ? 'search_off' : 'sell'} size={26} /></span>
			{#if search.trim()}
				<h3>Aucune campagne ne correspond</h3>
				<p>Aucune campagne {activeTab === 'actives' ? 'active' : 'archivée'} ne contient « {search.trim()} ».</p>
			{:else if activeTab === 'actives'}
				<h3>Aucune campagne active</h3>
				<p>Créez votre première campagne pour regrouper des prospects (salon, secteur, région…).</p>
				<button type="button" class="ws-btn ws-btn-primary" onclick={openCreate}><Icon name="add" size={16} /> Nouvelle campagne</button>
			{:else}
				<h3>Aucune campagne archivée</h3>
				<p>Les campagnes que vous archivez apparaîtront ici. L'archivage est réversible.</p>
			{/if}
		</div>
	{:else}
		<div class="listcard">
			<div class="lc-head">
				<span></span><span>Campagne</span><span class="hide-sm">Prospects</span><span class="hide-md">Créée le</span><span class="hide-sm">Statut</span><span></span>
			</div>
			{#each visible as c (c.id)}
				<div class="lc-row">
					<span class="camp-swatch {swatchClass(c.couleur)}"></span>
					<div class="lc-id">
						<div class="lc-name">{c.nom}</div>
						{#if c.description}<div class="lc-desc">{c.description}</div>{/if}
					</div>
					<button type="button" class="leadcount hide-sm" class:zero={c.lead_count === 0} onclick={() => goToProspection(c.id)} title="Voir ces prospects dans la Prospection">
						<Icon name="arrow_forward" size={13} />
						{c.lead_count} prospect{c.lead_count > 1 ? 's' : ''}
					</button>
					<span class="lc-date hide-md">{dateLong(c.date_creation)}</span>
					<span class="cstatus hide-sm" class:active={!c.archived && c.lead_count > 0} class:muted={c.archived || c.lead_count === 0}>
						<span class="dot"></span>
						{c.archived ? 'Archivée' : c.lead_count === 0 ? 'Sans prospect' : 'Active'}
					</span>
					<div class="act-menu">
						<button
							type="button"
							class="kebab"
							aria-label={`Actions pour ${c.nom}`}
							aria-haspopup="menu"
							aria-expanded={menuOpenId === c.id}
							onclick={(e) => { e.stopPropagation(); menuOpenId = menuOpenId === c.id ? null : c.id; }}
						>
							<Icon name="more_vert" size={18} />
						</button>
						{#if menuOpenId === c.id}
							<div class="menu" role="menu">
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); openRename(c); }}>
									<Icon name="edit" size={15} /> Renommer
								</button>
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); menuOpenId = null; goToProspection(c.id); }}>
									<Icon name="visibility" size={15} /> Voir les prospects
								</button>
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); goToEtiquettes(c); }}>
									<Icon name="mail" size={15} /> Étiquettes d'adresses
								</button>
								<button type="button" class="menu-item" role="menuitem" onclick={(e) => { e.stopPropagation(); toggleArchive(c); }}>
									<Icon name={c.archived ? 'unarchive' : 'archive'} size={15} /> {c.archived ? 'Réactiver' : 'Archiver'}
								</button>
								<div class="menu-sep"></div>
								<button type="button" class="menu-item danger" role="menuitem" onclick={(e) => { e.stopPropagation(); openDelete(c); }}>
									<Icon name="delete" size={15} /> Supprimer
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
			<div class="lc-foot">
				{visible.length} campagne{visible.length > 1 ? 's' : ''} {activeTab === 'actives' ? 'active' : 'archivée'}{visible.length > 1 ? 's' : ''}
			</div>
		</div>
	{/if}
	</div>
</div>

<!-- Création -->
<ModalForm bind:open={createOpen} title="Nouvelle campagne" icon="sell" saving={createBusy} onSave={submitCreate} maxWidth="max-w-md">
	<div class="field">
		<label for="camp-create-nom">Nom</label>
		<input id="camp-create-nom" class="txt" type="text" bind:value={createNom} maxlength={CAMPAGNE_NOM_MAX} placeholder="Ex : Salon Habitat 2026" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate(); } }} />
	</div>
	<div class="field">
		<span class="lbl">Couleur</span>
		<div class="swatches">
			{#each COULEUR_SLUGS as slug}
				<button type="button" class="swatch {swatchClass(slug)}" class:sel={createCouleur === slug} aria-label={`Couleur ${slug}`} aria-pressed={createCouleur === slug} onclick={() => (createCouleur = slug)}></button>
			{/each}
		</div>
	</div>
	<div class="field">
		<label for="camp-create-desc">Description <span class="opt">- optionnel</span></label>
		<input id="camp-create-desc" class="txt" type="text" bind:value={createDesc} maxlength={CAMPAGNE_DESC_MAX} placeholder="Note interne (cible, période, source…)" />
	</div>
</ModalForm>

<!-- Renommage -->
<ModalForm open={renameTarget !== null} title="Renommer la campagne" icon="edit" saving={renameBusy} onSave={submitRename} onClose={() => (renameTarget = null)} maxWidth="max-w-md">
	<div class="field">
		<label for="camp-rename-nom">Nom</label>
		<input id="camp-rename-nom" class="txt" type="text" bind:value={renameNom} maxlength={CAMPAGNE_NOM_MAX} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRename(); } }} />
	</div>
</ModalForm>

<!-- Suppression (confirmation rassurante) -->
<ConfirmModal
	open={deleteTarget !== null}
	title={deleteTarget ? `Supprimer la campagne « ${deleteTarget.nom} » ?` : ''}
	message={deleteMessage}
	confirmLabel="Supprimer la campagne"
	variant="danger"
	loading={deleteBusy}
	onConfirm={confirmDelete}
	onClose={() => (deleteTarget = null)}
/>

<style>
	.ws-bound {
		/* Marges resserrées / alignées sur la page Étiquettes et les autres surfaces (gouttière 32px). */
		max-width: 1160px;
		margin: 0 auto;
		padding: 8px 0 64px;
	}
	.head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		padding: 4px 32px 18px;
	}
	.head h2 {
		margin: 0;
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}
	.head p {
		margin: 4px 0 0;
		font-size: 13px;
		color: var(--color-text-muted);
		max-width: 60ch;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 6px 32px 18px;
	}
	.segtabs {
		display: inline-flex;
		gap: 2px;
		padding: 4px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
	}
	.segtab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: var(--radius-lg);
		font: 600 13px var(--font-sans, inherit);
		color: var(--color-text-muted);
		transition: background 200ms ease, color 200ms ease;
	}
	.segtab:hover {
		color: var(--color-text);
	}
	.segtab.active {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}
	.segtab .ct {
		font-size: 11.5px;
		padding: 1px 7px;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
		color: var(--color-text-muted);
		font-weight: 700;
	}
	.segtab.active .ct {
		background: color-mix(in srgb, white 22%, transparent);
		color: var(--color-text-inverse);
	}
	.search {
		position: relative;
		margin-left: auto;
		width: 280px;
		max-width: 100%;
	}
	.search :global(svg) {
		position: absolute;
		left: 13px;
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
		font: 14px var(--font-sans, inherit);
		color: var(--color-text);
		box-shadow: var(--shadow-xs);
	}
	.search input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}

	.listcard {
		margin: 0 32px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: visible;
	}
	.lc-head,
	.lc-row {
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr) 150px 130px 120px 40px;
		align-items: center;
		gap: 16px;
		padding: 0 18px;
	}
	.lc-head {
		height: 42px;
		border-bottom: 1px solid var(--color-border);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.lc-row {
		min-height: 64px;
		padding-top: 11px;
		padding-bottom: 11px;
		border-bottom: 1px solid var(--color-hairline);
	}
	.lc-row:last-of-type {
		border-bottom: none;
	}
	.lc-id {
		min-width: 0;
	}
	.lc-name {
		font-size: 14.5px;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lc-desc {
		font-size: 12.5px;
		color: var(--color-text-muted);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lc-date {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}
	button.leadcount {
		border: none;
		cursor: pointer;
		justify-self: start;
		transition: color 160ms ease, box-shadow 160ms ease;
	}
	button.leadcount:hover {
		color: var(--color-primary);
		box-shadow: inset 0 0 0 1px rgba(47, 90, 158, 0.30);
	}
	.cstatus {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--radius-lg);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.cstatus .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.cstatus.active {
		background: var(--color-success-light);
		color: var(--color-success-deep);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-success) 18%, transparent);
	}
	.cstatus.active .dot {
		background: var(--color-success);
	}
	.cstatus.muted {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
	.cstatus.muted .dot {
		background: var(--color-text-muted);
	}

	.act-menu {
		position: relative;
		justify-self: end;
	}
	.kebab {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		box-shadow: var(--shadow-xs);
	}
	.kebab:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 20;
		min-width: 200px;
		padding: 6px;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-menu);
		border: 1px solid var(--color-border);
	}
	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 11px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		font: 600 13px var(--font-sans, inherit);
		color: var(--color-text-body);
		cursor: pointer;
		text-align: left;
	}
	.menu-item:hover {
		background: var(--color-surface-alt);
	}
	.menu-item :global(svg) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.menu-item.danger {
		color: var(--color-danger-deep);
	}
	.menu-item.danger :global(svg) {
		color: var(--color-danger);
	}
	.menu-sep {
		height: 1px;
		background: var(--color-border);
		margin: 5px 4px;
	}
	.lc-foot {
		padding: 13px 20px;
		border-top: 1px solid var(--color-border);
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.empty {
		margin: 8px 32px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		padding: 56px 24px;
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
	}
	.empty-ic {
		width: 56px;
		height: 56px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-2xl);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		margin-bottom: 6px;
	}
	.empty h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text);
	}
	.empty p {
		margin: 0 0 6px;
		font-size: 13.5px;
		color: var(--color-text-muted);
		max-width: 44ch;
	}

	/* Champs des modales create/rename. */
	.field {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.field label,
	.field .lbl {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-text-body);
	}
	.field .opt {
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.field .txt {
		height: 42px;
		padding: 0 13px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
		font: 14px var(--font-sans, inherit);
		color: var(--color-text);
		background: var(--color-surface);
	}
	.field .txt:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.swatches {
		display: flex;
		gap: 9px;
		flex-wrap: wrap;
	}
	.swatch {
		position: relative;
		width: 30px;
		height: 30px;
		border: none;
		padding: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent);
	}
	.swatch.sel {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent), 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary);
	}
	.swatch.sel::after {
		content: '';
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/14px no-repeat;
	}

	@media (max-width: 720px) {
		.head,
		.toolbar {
			padding-left: 16px;
			padding-right: 16px;
		}
		.listcard,
		.empty {
			margin-left: 16px;
			margin-right: 16px;
		}
		.lc-head,
		.lc-row {
			grid-template-columns: 26px minmax(0, 1fr) 40px;
		}
		.hide-sm,
		.hide-md {
			display: none;
		}
	}
	@media (max-width: 1000px) and (min-width: 721px) {
		.hide-md {
			display: none;
		}
		.lc-head,
		.lc-row {
			grid-template-columns: 26px minmax(0, 1fr) 150px 120px 40px;
		}
	}
</style>
