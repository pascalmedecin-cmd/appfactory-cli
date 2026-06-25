<script lang="ts">
	/**
	 * Sélecteur multi-campagnes réutilisable (Vague 3.2, flag ffCrmListesV2).
	 *
	 * Recherche + cases à cocher + compteur de prospects par campagne + « Créer à la volée »
	 * (nom + couleur, golden §3b). Utilisé à l'import (lot-level, `bind:selected`) ET depuis la
	 * fiche (persistance immédiate via `onAdd`/`onRemove`).
	 *
	 * Le payload de création n'est jamais fait confiance côté serveur (Zod + repo borné, couleur
	 * hors palette -> défaut). L'index unique `lower(nom)` protège des quasi-doublons (409 -> toast).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import {
		COULEUR_SLUGS,
		DEFAULT_COULEUR,
		CAMPAGNE_NOM_MAX,
		campClass,
		type CampagneWithCount,
		type Campagne,
		type CouleurSlug,
	} from '$lib/campagnes';

	let {
		selected = $bindable<string[]>([]),
		campagnes,
		onAdd,
		onRemove,
		onCreated,
		placeholder = 'Rechercher ou créer…',
		disabled = false,
	}: {
		selected: string[];
		campagnes: CampagneWithCount[];
		/** Persistance immédiate (fiche) : appelé quand une campagne est cochée. */
		onAdd?: (id: string) => void;
		/** Persistance immédiate (fiche) : appelé quand une campagne est décochée. */
		onRemove?: (id: string) => void;
		/** Création : appelé après un POST réussi (le parent peut rafraîchir sa liste). */
		onCreated?: (c: Campagne) => void;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	// Campagnes créées localement (combo) pas encore reflétées dans la prop : fusion + dédup par id.
	let extra = $state<CampagneWithCount[]>([]);
	const all = $derived.by(() => {
		const map = new Map<string, CampagneWithCount>();
		for (const c of campagnes) map.set(c.id, c);
		for (const c of extra) if (!map.has(c.id)) map.set(c.id, c);
		return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
	});
	const byId = $derived(new Map(all.map((c) => [c.id, c])));
	const selectedCampagnes = $derived(selected.map((id) => byId.get(id)).filter((c): c is CampagneWithCount => !!c));

	let query = $state('');
	let open = $state(false);
	let creating = $state(false);
	let createNom = $state('');
	let createCouleur = $state<CouleurSlug>(DEFAULT_COULEUR);
	let createDesc = $state('');
	let createBusy = $state(false);
	let rootEl = $state<HTMLDivElement>();
	let inputEl = $state<HTMLInputElement>();
	const uid = $props.id();
	// Index d'option mis en avant au clavier (-1 = aucune ; APG combobox via aria-activedescendant).
	let focusedIndex = $state(-1);

	function moveFocus(delta: number) {
		if (filtered.length === 0) {
			focusedIndex = -1;
			return;
		}
		const next = focusedIndex + delta;
		focusedIndex = next < 0 ? filtered.length - 1 : next >= filtered.length ? 0 : next;
	}

	function onInputKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			moveFocus(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			open = true;
			moveFocus(-1);
		} else if (e.key === 'Enter') {
			if (focusedIndex >= 0 && filtered[focusedIndex]) {
				e.preventDefault();
				toggle(filtered[focusedIndex].id);
			} else if (showCreate) {
				e.preventDefault();
				openCreateForm();
			}
		} else if (e.key === 'Escape') {
			open = false;
			creating = false;
			focusedIndex = -1;
		}
	}

	const filtered = $derived(
		all.filter((c) => c.nom.toLowerCase().includes(query.trim().toLowerCase())),
	);
	const exactMatch = $derived(
		all.some((c) => c.nom.trim().toLowerCase() === query.trim().toLowerCase()),
	);
	const showCreate = $derived(query.trim().length > 0 && !exactMatch);

	function toggle(id: string) {
		if (selected.includes(id)) {
			selected = selected.filter((v) => v !== id);
			onRemove?.(id);
		} else {
			selected = [...selected, id];
			onAdd?.(id);
		}
	}

	function openCreateForm() {
		creating = true;
		createNom = query.trim();
		// Couleur proposée automatiquement (rotation), modifiable (golden §3b).
		createCouleur = COULEUR_SLUGS[all.length % COULEUR_SLUGS.length];
		createDesc = '';
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
			const data = await resp.json().catch(() => null);
			if (resp.ok && data?.campagne) {
				const c: CampagneWithCount = { ...(data.campagne as Campagne), lead_count: 0 };
				extra = [...extra, c];
				selected = [...selected, c.id];
				onAdd?.(c.id);
				onCreated?.(data.campagne as Campagne);
				creating = false;
				query = '';
				inputEl?.focus();
			} else {
				toasts.error(data?.error || 'Création impossible');
			}
		} catch {
			toasts.error('Erreur réseau');
		} finally {
			createBusy = false;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (rootEl && !rootEl.contains(e.target as Node)) {
			open = false;
			creating = false;
			focusedIndex = -1;
		}
	}
	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div class="combo" bind:this={rootEl}>
	<div
		class="combo-field"
		class:focus={open}
		class:disabled
		onclick={() => { if (!disabled) { open = true; inputEl?.focus(); } }}
		onkeydown={(e) => { if (e.key === 'Escape') { open = false; creating = false; } }}
		role="presentation"
	>
		{#each selectedCampagnes as c (c.id)}
			<span class="camp {campClass(c.couleur)} removable">
				<span class="cdot"></span><span class="clabel">{c.nom}</span>
				<button type="button" class="cx" aria-label={`Retirer ${c.nom}`} onclick={(e) => { e.stopPropagation(); toggle(c.id); }}>
					<Icon name="close" size={11} />
				</button>
			</span>
		{/each}
		<input
			bind:this={inputEl}
			bind:value={query}
			type="text"
			{placeholder}
			{disabled}
			role="combobox"
			aria-expanded={open}
			aria-controls="combo-pop-{uid}"
			aria-autocomplete="list"
			aria-label={placeholder}
			aria-activedescendant={!creating && focusedIndex >= 0 && filtered[focusedIndex] ? `combo-opt-${uid}-${focusedIndex}` : undefined}
			onfocus={() => (open = true)}
			oninput={() => (focusedIndex = -1)}
			onkeydown={onInputKeydown}
		/>
	</div>

	{#if open}
		<div class="combo-pop" id="combo-pop-{uid}" role="listbox" aria-label="Campagnes">
			{#if creating}
				<div class="combo-create-form">
					<label class="cf-label" for="combo-create-nom">Nom</label>
					<input
						id="combo-create-nom"
						class="cf-input"
						type="text"
						bind:value={createNom}
						maxlength={CAMPAGNE_NOM_MAX}
						onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate(); } if (e.key === 'Escape') creating = false; }}
					/>
					<span class="cf-label">Couleur</span>
					<div class="swatches">
						{#each COULEUR_SLUGS as slug}
							<button
								type="button"
								class="swatch sw{slug.slice(1)}"
								class:sel={createCouleur === slug}
								aria-label={`Couleur ${slug}`}
								aria-pressed={createCouleur === slug}
								onclick={() => (createCouleur = slug)}
							></button>
						{/each}
					</div>
					<label class="cf-label" for="combo-create-desc">Description <span class="cf-opt">- optionnel</span></label>
					<input id="combo-create-desc" class="cf-input" type="text" bind:value={createDesc} placeholder="Note interne (cible, période…)" />
					<div class="cf-actions">
						<button type="button" class="cf-btn cf-cancel" onclick={() => (creating = false)}>Annuler</button>
						<button type="button" class="cf-btn cf-confirm" disabled={!createNom.trim() || createBusy} onclick={submitCreate}>
							{createBusy ? 'Création…' : 'Créer'}
						</button>
					</div>
				</div>
			{:else}
				{#if filtered.length === 0 && !showCreate}
					<p class="combo-empty">Aucune campagne. Tapez un nom pour en créer une.</p>
				{/if}
				{#each filtered as c, i (c.id)}
					<button type="button" id="combo-opt-{uid}-{i}" role="option" aria-selected={selected.includes(c.id)} tabindex="-1" class="combo-opt" class:on={selected.includes(c.id)} class:active={i === focusedIndex} onclick={() => toggle(c.id)}>
						<span class="cbx">{#if selected.includes(c.id)}<Icon name="check" size={12} />{/if}</span>
						<span class="co-name"><span class="camp-swatch sw{(c.couleur ?? 'c1').slice(1)}" style="width:12px;height:12px;border-radius:4px"></span> {c.nom}</span>
						<span class="co-ct">{c.lead_count}</span>
					</button>
				{/each}
				{#if showCreate}
					{#if filtered.length > 0}<div class="combo-sep"></div>{/if}
					<button type="button" class="combo-create" onclick={openCreateForm}>
						<span class="plus"><Icon name="add" size={13} /></span>
						<span>Créer la campagne « <b>{query.trim()}</b> »</span>
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.combo {
		position: relative;
	}
	.combo-field {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 7px;
		min-height: 44px;
		padding: 7px 10px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		cursor: text;
	}
	.combo-field.focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.combo-field.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.combo-field input {
		flex: 1;
		min-width: 130px;
		height: 28px;
		border: none;
		outline: none;
		background: transparent;
		font: 14px var(--font-sans, inherit);
		color: var(--color-text);
	}
	.combo-field input::placeholder {
		color: var(--color-text-muted);
	}
	.combo-pop {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 6px);
		z-index: 40;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-menu, 0 12px 32px -8px rgba(16, 24, 40, 0.22));
		padding: 6px;
		max-height: 280px;
		overflow-y: auto;
	}
	.combo-opt {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 10px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
	}
	.combo-opt:hover,
	.combo-opt.active {
		background: var(--color-surface-alt);
	}
	.combo-opt .cbx {
		width: 18px;
		height: 18px;
		border-radius: 5px;
		border: 1.5px solid var(--color-border-strong);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: #fff;
	}
	.combo-opt.on .cbx {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
	.combo-opt .co-name {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.combo-opt .co-ct {
		margin-left: auto;
		font-size: 11.5px;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}
	.combo-empty {
		margin: 0;
		padding: 12px 10px;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.combo-create {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--color-primary);
		font-size: 13.5px;
		font-weight: 600;
		text-align: left;
	}
	.combo-create:hover {
		background: var(--color-primary-light);
	}
	.combo-create .plus {
		width: 18px;
		height: 18px;
		display: grid;
		place-items: center;
		border-radius: 5px;
		background: var(--color-primary-light);
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.combo-create b {
		color: var(--color-primary);
	}
	.combo-sep {
		height: 1px;
		background: var(--color-border);
		margin: 5px 4px;
	}
	/* Mini-formulaire de création (golden §3b). */
	.combo-create-form {
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 6px 6px 4px;
	}
	.cf-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-body);
	}
	.cf-opt {
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.cf-input {
		height: 38px;
		padding: 0 12px;
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-md);
		font: 14px var(--font-sans, inherit);
		color: var(--color-text);
		background: var(--color-surface);
	}
	.cf-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(47, 90, 158, 0.16);
	}
	.swatches {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 2px;
	}
	.swatch {
		width: 28px;
		height: 28px;
		border: none;
		padding: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.10);
		position: relative;
	}
	.swatch.sel {
		box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.10), 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary);
	}
	.swatch.sel::after {
		content: '';
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/14px no-repeat;
	}
	.cf-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 4px;
	}
	.cf-btn {
		height: 36px;
		padding: 0 14px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		border: none;
	}
	.cf-cancel {
		background: transparent;
		color: var(--color-text-muted);
	}
	.cf-cancel:hover {
		color: var(--color-text);
	}
	.cf-confirm {
		background: var(--color-primary);
		color: #fff;
	}
	.cf-confirm:hover {
		background: var(--color-primary-hover);
	}
	.cf-confirm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
