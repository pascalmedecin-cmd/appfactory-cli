<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { deserialize, applyAction } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toasts } from '$lib/stores/toast';
	import type { PageData } from './$types';
	import type { VeilleTheme } from '$lib/server/intelligence/themes-repository';

	let { data }: { data: PageData } = $props();

	let modalOpen = $state(false);
	let editingTheme = $state<VeilleTheme | null>(null);
	let saving = $state(false);

	let confirmOpen = $state(false);
	let confirmTarget = $state<VeilleTheme | null>(null);
	let confirmLoading = $state(false);

	let form = $state({
		slug: '',
		label: '',
		description: '',
		category: 'core' as 'core' | 'adjacent',
		sort_order: 100
	});
	let formError = $state<string | null>(null);

	function openCreate() {
		editingTheme = null;
		form = { slug: '', label: '', description: '', category: 'core', sort_order: nextSortOrder() };
		formError = null;
		modalOpen = true;
	}

	function openEdit(theme: VeilleTheme) {
		editingTheme = theme;
		form = {
			slug: theme.slug,
			label: theme.label,
			description: theme.description,
			category: theme.category as 'core' | 'adjacent',
			sort_order: theme.sort_order
		};
		formError = null;
		modalOpen = true;
	}

	function nextSortOrder(): number {
		const max = data.themes.reduce((acc: number, t: VeilleTheme) => Math.max(acc, t.sort_order), 0);
		return Math.min(max + 10, 9999);
	}

	async function submitForm() {
		saving = true;
		formError = null;
		const fd = new FormData();
		const action = editingTheme ? '?/update' : '?/create';
		if (editingTheme) fd.append('id', editingTheme.id);
		else fd.append('slug', form.slug);
		fd.append('label', form.label);
		fd.append('description', form.description);
		fd.append('category', form.category);
		fd.append('sort_order', String(form.sort_order));
		try {
			const res = await fetch(action, { method: 'POST', body: fd });
			const result: ActionResult = deserialize(await res.text());
			if (result.type === 'success') {
				toasts.success(
					(result.data as { message?: string } | undefined)?.message ?? 'Thème enregistré.'
				);
				modalOpen = false;
				await invalidateAll();
				await applyAction(result);
			} else if (result.type === 'failure') {
				formError = (result.data as { error?: string } | undefined)?.error ?? 'Erreur';
			} else {
				formError = 'Erreur inattendue';
			}
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Erreur réseau';
		} finally {
			saving = false;
		}
	}

	function askToggleActive(theme: VeilleTheme) {
		confirmTarget = theme;
		confirmOpen = true;
	}

	async function confirmToggle() {
		if (!confirmTarget) return;
		confirmLoading = true;
		const fd = new FormData();
		fd.append('id', confirmTarget.id);
		fd.append('active', String(!confirmTarget.active));
		try {
			const res = await fetch('?/toggleActive', { method: 'POST', body: fd });
			const result: ActionResult = deserialize(await res.text());
			if (result.type === 'success') {
				toasts.success(
					(result.data as { message?: string } | undefined)?.message ?? 'Mise à jour.'
				);
				confirmOpen = false;
				await invalidateAll();
				await applyAction(result);
			} else {
				toasts.error(
					(result.type === 'failure'
						? ((result.data as { error?: string } | undefined)?.error ?? 'Erreur')
						: 'Erreur inattendue')
				);
			}
		} catch (err) {
			toasts.error(err instanceof Error ? err.message : 'Erreur réseau');
		} finally {
			confirmLoading = false;
		}
	}

	const columns = [
		{ key: 'slug', label: 'Slug', sortable: true, defaultWidth: 220 },
		{ key: 'label', label: 'Libellé', sortable: true, defaultWidth: 220 },
		{ key: 'category', label: 'Catégorie', sortable: true, defaultWidth: 120 },
		{ key: 'sort_order', label: 'Ordre', sortable: true, defaultWidth: 90 },
		{ key: 'active', label: 'Actif', sortable: true, defaultWidth: 90 },
		{ key: 'actions', label: '', srLabel: 'Actions', defaultWidth: 100 }
	];
</script>

<svelte:head><title>Thèmes veille - FilmPro</title></svelte:head>

<div class="px-6 py-6 md:px-8 md:py-8 space-y-6">
	<header class="flex items-center justify-between gap-4">
		<div>
			<!-- Audit 360 V2c H-26 : h2 (le h1 unique de la page est dans Header.svelte). -->
			<h2 class="text-2xl font-semibold tracking-tight">Thèmes veille</h2>
			<p class="text-sm text-text-muted mt-1">
				Taxonomie utilisée par le pipeline veille hebdomadaire (LLM + cross-check). Les thèmes
				actifs sont injectés dans le prompt à chaque génération.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			<Icon name="add" class="w-4 h-4" />
			Nouveau thème
		</button>
	</header>

	<DataTable
		data={data.themes}
		{columns}
		searchable
		searchPlaceholder="Rechercher par slug ou libellé…"
		pageSize={25}
		emptyMessage="Aucun thème — clique « Nouveau thème »."
		dense
		resizable
		storageKey="veille-themes-cols"
		rowAriaLabel={(t: VeilleTheme) =>
			`Thème ${t.label}, slug ${t.slug}, catégorie ${t.category}, ordre ${t.sort_order}, ${t.active ? 'actif' : 'inactif'}`}
	>
		{#snippet row(theme: VeilleTheme)}
			<td class="dt-td font-mono text-xs text-text-muted">{theme.slug}</td>
			<td class="dt-td font-medium">{theme.label}</td>
			<td class="dt-td">
				<Badge
					variant={theme.category === 'core' ? 'default' : 'info'}
					label={theme.category === 'core' ? 'Cœur métier' : 'Adjacent'}
					dot
				/>
			</td>
			<td class="dt-td text-text-muted tabular-nums">{theme.sort_order}</td>
			<td class="dt-td">
				{#if theme.active}
					<Badge variant="success" label="Actif" dot />
				{:else}
					<Badge variant="muted" label="Inactif" />
				{/if}
			</td>
			<td class="dt-td">
				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => openEdit(theme)}
						aria-label="Modifier le thème {theme.label}"
						class="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					>
						<Icon name="edit" class="w-4 h-4" />
					</button>
					<button
						type="button"
						onclick={() => askToggleActive(theme)}
						aria-label={theme.active
							? `Désactiver le thème ${theme.label}`
							: `Activer le thème ${theme.label}`}
						class="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					>
						<Icon name={theme.active ? 'eye_off' : 'eye'} class="w-4 h-4" />
					</button>
				</div>
			</td>
		{/snippet}
	</DataTable>
</div>

<ModalForm
	bind:open={modalOpen}
	title={editingTheme ? `Modifier ${editingTheme.label}` : 'Nouveau thème'}
	icon="sell"
	{saving}
	maxWidth="max-w-xl"
	onSave={submitForm}
>
	<div class="space-y-4">
		{#if formError}
			<div class="px-3 py-2 rounded-md bg-danger-light text-danger-deep text-sm" role="alert">
				{formError}
			</div>
		{/if}

		<label class="block">
			<span class="block text-sm font-medium mb-1">
				Slug
				{#if editingTheme}
					<span class="text-xs text-text-muted font-normal">(non modifiable)</span>
				{/if}
			</span>
			<input
				type="text"
				bind:value={form.slug}
				disabled={!!editingTheme}
				placeholder="ex. vitrages_haute_performance"
				class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary disabled:bg-surface-alt disabled:text-text-muted font-mono text-sm"
				required
				pattern="[a-z][a-z0-9_]*"
				minlength="2"
				maxlength="64"
			/>
			<span class="block text-xs text-text-muted mt-1">
				Snake case minuscule : a-z, 0-9, _. Doit commencer par une lettre.
			</span>
		</label>

		<label class="block">
			<span class="block text-sm font-medium mb-1">Libellé affiché</span>
			<input
				type="text"
				bind:value={form.label}
				placeholder="ex. Vitrages haute performance"
				class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				required
				maxlength="120"
			/>
		</label>

		<label class="block">
			<span class="block text-sm font-medium mb-1">Description (injectée dans le prompt LLM)</span>
			<textarea
				bind:value={form.description}
				placeholder="ex. Low-E, triple vitrage, gaz argon, coefficients Ug/Uw"
				rows="3"
				class="w-full px-3 py-2 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary text-sm"
				required
				maxlength="500"
			></textarea>
		</label>

		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="block text-sm font-medium mb-1">Catégorie</span>
				<select
					bind:value={form.category}
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary"
				>
					<option value="core">Cœur métier (priorité haute)</option>
					<option value="adjacent">Adjacent (signal faible)</option>
				</select>
			</label>

			<label class="block">
				<span class="block text-sm font-medium mb-1">Ordre d'affichage</span>
				<input
					type="number"
					bind:value={form.sort_order}
					min="0"
					max="9999"
					step="10"
					class="w-full h-10 px-3 rounded-md border border-border-input bg-surface focus:outline-2 focus:outline-primary tabular-nums"
				/>
			</label>
		</div>
	</div>
</ModalForm>

<ConfirmModal
	bind:open={confirmOpen}
	title={confirmTarget?.active ? 'Désactiver ce thème ?' : 'Réactiver ce thème ?'}
	message={confirmTarget
		? confirmTarget.active
			? `Le thème "${confirmTarget.label}" ne sera plus injecté dans le prompt LLM des prochaines générations veille. Les éditions passées qui le référencent restent intactes.`
			: `Le thème "${confirmTarget.label}" sera de nouveau injecté dans le prompt LLM dès la prochaine génération veille.`
		: ''}
	confirmLabel={confirmTarget?.active ? 'Désactiver' : 'Réactiver'}
	variant={confirmTarget?.active ? 'warning' : 'warning'}
	loading={confirmLoading}
	onConfirm={confirmToggle}
/>
