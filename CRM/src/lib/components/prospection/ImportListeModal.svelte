<script lang="ts">
	/**
	 * Modale d'import d'une liste de prospects (Run 3 Atelier 209) - wizard 3 étapes fidèle à la
	 * maquette validée : 1. déposer (CSV/TSV) → 2. associer les colonnes (auto-reconnues, ajustables)
	 * → 3. aperçu & import (nouveaux / doublons ignorés / à corriger). Le client PARSE le fichier, le
	 * serveur re-mappe / déduplique / score / insère dans la marque active (`/api/prospection/import-liste`).
	 * Thème marque via `--color-primary` (teinté par `[data-marque]`). A11y : focus trap + Escape +
	 * scroll-lock (mêmes primitives que ModalForm).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { trapFocus } from '$lib/actions/trapFocus';
	import { invalidateAll } from '$app/navigation';
	import { parseCsv, decodeCsvBytes } from '$lib/utils/csv';
	import {
		autoMapColumns,
		CRM_IMPORT_FIELDS,
		type ImportFieldKey,
	} from '$lib/prospection/import-mapping';
	import { marqueLabel } from '$lib/marque';
	import type { Marque } from '$lib/marque';
	import { prospectionCopies } from '$lib/prospection/prospection-copies';
	import { IMPORT_LISTE_MAX_ROWS } from '$lib/schemas';

	let {
		open = $bindable(false),
		marque,
		importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null),
		onImported,
	}: {
		open: boolean;
		marque: Marque;
		importResult: { message: string; type: 'success' | 'error' } | null;
		/** Appelé après un import réussi (la page navigue vers l'onglet « Ma liste »). */
		onImported?: () => void;
	} = $props();

	type PreviewState = 'new' | 'duplicate' | 'invalid';
	interface PreviewRow {
		line: number;
		raison_sociale: string;
		secteur: string | null;
		localite: string | null;
		npa: string | null;
		state: PreviewState;
	}
	interface PreviewData {
		stats: { total: number; toImport: number; duplicates: number; invalid: number };
		sample: PreviewRow[];
		sampleTruncated: boolean;
	}

	let step = $state<1 | 2 | 3>(1);
	let fileName = $state('');
	let columns = $state<string[]>([]);
	let sampleValues = $state<string[]>([]); // 1re ligne de données (aperçu du mapping)
	let dataRows = $state<string[][]>([]);
	let mapping = $state<(ImportFieldKey | null)[]>([]);
	let autoMapped = $state<boolean[]>([]); // colonne reconnue automatiquement (badge « auto »)
	let truncatedRows = $state(false);

	let parseError = $state<string | null>(null);
	let dragOver = $state(false);
	let previewLoading = $state(false);
	let preview = $state<PreviewData | null>(null);
	let importing = $state(false);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let dialogEl = $state<HTMLElement | null>(null);

	const marqueName = $derived(marqueLabel(marque));

	// Champs mappables + « ne pas importer ». Nombre de colonnes reconnues (badge d'intro étape 2).
	const recognizedCount = $derived(mapping.filter((m) => m !== null).length);
	const raisonSocialeMapped = $derived(mapping.includes('raison_sociale'));

	// Pied de l'étape 3 : n'énumère QUE les catégories non vides, avec accord nombre/genre correct
	// (masculin l'emporte si doublons + lignes ; féminin si des lignes seules). Évite « Les 0 doublon ».
	const excludedNote = $derived.by(() => {
		if (!preview) return '';
		const d = preview.stats.duplicates;
		const i = preview.stats.invalid;
		const parts: string[] = [];
		if (d > 0) parts.push(`${d} doublon${d > 1 ? 's' : ''}`);
		if (i > 0) parts.push(`${i} ligne${i > 1 ? 's' : ''} en erreur`);
		if (parts.length === 0) return '';
		const plural = parts.length > 1 || d > 1 || i > 1;
		const feminine = parts.length === 1 && i > 0; // seules des « lignes » → accord féminin
		return `${parts.join(' et ')} ${plural ? 'seront' : 'sera'} ignoré${feminine ? 'e' : ''}${plural ? 's' : ''}.`;
	});

	function resetAll() {
		step = 1;
		fileName = '';
		columns = [];
		sampleValues = [];
		dataRows = [];
		mapping = [];
		autoMapped = [];
		truncatedRows = false;
		parseError = null;
		dragOver = false;
		previewLoading = false;
		preview = null;
		importing = false;
		error = null;
	}

	// Scroll-lock du body pendant l'ouverture (cleanup via $effect return = SSR-safe).
	$effect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = prev; };
	});

	// Reset complet à la fermeture (rien ne fuit d'une session à l'autre).
	let prevOpen = false;
	$effect(() => {
		if (open === prevOpen) return;
		prevOpen = open;
		if (!open) resetAll();
	});

	// Le focus trap ne verrouille qu'aux BORNES : à chaque changement d'étape, l'élément focalisé
	// (ex. le bouton « Continuer ») est démonté et le focus retombe sur <body> → il s'échapperait
	// derrière la modale. On le ramène donc dans le dialog après chaque transition d'étape.
	$effect(() => {
		step; // dépendance
		if (!open || !dialogEl) return;
		queueMicrotask(() => {
			if (dialogEl && !dialogEl.contains(document.activeElement)) dialogEl.focus();
		});
	});

	function close() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	async function handleFile(file: File) {
		parseError = null;
		const lowerName = file.name.toLowerCase();
		if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
			parseError = 'Les fichiers Excel ne sont pas encore acceptés. Dans Excel : « Enregistrer sous » → CSV (UTF-8), puis déposez le CSV.';
			return;
		}
		let text: string;
		try {
			// `File.text()` force UTF-8 ; on décode via `decodeCsvBytes` pour gérer les CSV Excel
			// FR/CH en Windows-1252 (accents), sinon « Genève » → « Gen�ve » + dédup faussée.
			text = decodeCsvBytes(await file.arrayBuffer());
		} catch {
			parseError = 'Impossible de lire le fichier. Réessayez.';
			return;
		}
		const rows = parseCsv(text).filter((r) => r.some((c) => c.trim().length > 0));
		if (rows.length < 2) {
			parseError = 'Le fichier doit contenir une ligne d’en-têtes et au moins une ligne de données.';
			return;
		}
		const cols = rows[0].map((c) => c.trim());
		let body = rows.slice(1);
		truncatedRows = body.length > IMPORT_LISTE_MAX_ROWS;
		if (truncatedRows) body = body.slice(0, IMPORT_LISTE_MAX_ROWS);

		const map = autoMapColumns(cols);
		fileName = file.name;
		columns = cols;
		sampleValues = cols.map((_, i) => (body[0]?.[i] ?? '').trim());
		dataRows = body;
		mapping = map;
		autoMapped = map.map((m) => m !== null);
		step = 2;
	}

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
		input.value = ''; // permet de re-déposer le même fichier
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function downloadTemplate() {
		// Parité WP-C #6 : ligne d'exemple métier selon la marque active (FilmPro verbatim ; LED enseigne/signalétique).
		const csv =
			'Nom,Adresse,NPA,Ville,Téléphone,Catégorie,Site web,Email\r\n' +
			prospectionCopies(marque).importTemplateExampleRow + '\r\n';
		const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'modele-import-prospects.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function setMapping(colIdx: number, value: ImportFieldKey | null) {
		mapping = mapping.map((m, i) => (i === colIdx ? value : m));
		autoMapped = autoMapped.map((a, i) => (i === colIdx ? false : a)); // choix manuel = plus « auto »
	}

	// N'envoie au serveur QUE les colonnes mappées (le serveur ignore le reste de toute façon) :
	// une colonne non importée - trop longue ou au-delà de 60 - ne peut plus faire échouer l'import.
	function buildImportPayload(previewMode: boolean) {
		const kept = mapping.map((m, i) => (m !== null ? i : -1)).filter((i) => i >= 0);
		return {
			preview: previewMode,
			columns: kept.map((i) => columns[i]),
			mapping: kept.map((i) => mapping[i]),
			rows: dataRows.map((row) => kept.map((i) => row[i] ?? '')),
		};
	}

	async function loadPreview() {
		if (!raisonSocialeMapped) return;
		previewLoading = true;
		error = null;
		try {
			const resp = await fetch('/api/prospection/import-liste', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildImportPayload(true)),
			});
			const data = await resp.json();
			if (resp.ok) {
				preview = data as PreviewData;
				step = 3;
			} else {
				error = data.error || 'Erreur lors de l’analyse du fichier.';
			}
		} catch (err) {
			error = `Erreur réseau : ${String(err)}`;
		} finally {
			previewLoading = false;
		}
	}

	async function runImport() {
		if (!preview || preview.stats.toImport === 0) return;
		importing = true;
		error = null;
		try {
			const resp = await fetch('/api/prospection/import-liste', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildImportPayload(false)),
			});
			const data = await resp.json();
			if (resp.ok) {
				importResult = { message: data.message, type: 'success' };
				await invalidateAll();
				open = false;
				onImported?.();
			} else {
				error = data.error || 'Erreur lors de l’import.';
			}
		} catch (err) {
			error = `Erreur réseau : ${String(err)}`;
		} finally {
			importing = false;
		}
	}

	const stepLabels = ['Déposer', 'Associer les colonnes', 'Aperçu & import'] as const;
	const subtitle = $derived(
		step === 1
			? 'Étape 1 sur 3 - déposez votre fichier'
			: step === 2
				? `Étape 2 sur 3 - ${fileName} (${dataRows.length} ligne${dataRows.length > 1 ? 's' : ''})`
				: 'Étape 3 sur 3 - aperçu avant import',
	);
	const titleId = $props.id();
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 bg-black/30 z-50" transition:fade={{ duration: 150 }}></div>
	<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
		<div
			bind:this={dialogEl}
			tabindex="-1"
			class="bg-white rounded-t-xl md:rounded-xl shadow-2xl w-full max-w-2xl pointer-events-auto flex flex-col max-h-[92vh] md:max-h-[88vh] overflow-hidden focus:outline-none"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			use:trapFocus
			transition:scale={{ start: 0.96, duration: 200 }}
		>
			<!-- En-tête teinté marque -->
			<div class="flex items-center gap-3 px-5 py-4 bg-primary text-white">
				<span class="w-9 h-9 rounded-lg grid place-items-center bg-white/15 shrink-0">
					<Icon name="cloud_upload" size={20} />
				</span>
				<div class="flex-1 min-w-0">
					<h2 id={titleId} class="text-[15px] font-bold leading-tight">Importer une liste de prospects</h2>
					<p class="text-xs text-white/80 mt-0.5 truncate">{subtitle}</p>
				</div>
				<button type="button" aria-label="Fermer" onclick={close} class="w-8 h-8 rounded-lg grid place-items-center text-white/85 hover:text-white bg-white/10 hover:bg-white/20 cursor-pointer transition-colors">
					<Icon name="close" size={16} />
				</button>
			</div>

			<!-- Stepper -->
			<div class="flex items-center gap-0 px-5 py-3 bg-surface-alt border-b border-border">
				{#each stepLabels as label, i}
					{@const n = i + 1}
					{@const done = step > n}
					{@const on = step === n}
					<div class="flex items-center gap-2 shrink-0">
						<span
							class="w-[22px] h-[22px] rounded-full grid place-items-center text-[11px] font-bold tabular-nums shrink-0 {done || on ? 'bg-primary text-white' : 'bg-white text-text-muted ring-[1.5px] ring-border-strong ring-inset'}"
							style={on ? 'box-shadow: 0 0 0 3px var(--color-primary-light);' : ''}
						>
							{#if done}<Icon name="check" size={12} />{:else}{n}{/if}
						</span>
						<span class="text-[12.5px] font-semibold {done ? 'text-text-body' : on ? 'text-primary-dark' : 'text-text-muted'} hidden sm:inline">{label}</span>
					</div>
					{#if i < stepLabels.length - 1}
						<span class="flex-1 h-0.5 mx-3 rounded {step > n ? 'bg-primary' : 'bg-border'}"></span>
					{/if}
				{/each}
			</div>

			<!-- Corps -->
			<div class="flex-1 overflow-y-auto px-5 py-5">
				{#if step === 1}
					<!-- ÉTAPE 1 : dropzone -->
					<div
						role="button"
						tabindex="0"
						aria-label="Déposer ou parcourir un fichier CSV"
						class="rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer {dragOver ? 'border-primary bg-primary-light/40' : 'border-border-strong bg-surface-alt'}"
						ondragover={(e) => { e.preventDefault(); dragOver = true; }}
						ondragleave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) dragOver = false; }}
						ondrop={onDrop}
						onclick={() => fileInput?.click()}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); } }}
					>
						<span class="w-13 h-13 rounded-2xl grid place-items-center mx-auto mb-3.5 bg-primary-light text-primary-dark" style="width:3.25rem;height:3.25rem;">
							<Icon name="cloud_upload" size={24} />
						</span>
						<p class="text-[15px] font-semibold text-text">Glissez votre fichier ici</p>
						<p class="text-[13px] text-text-muted mt-1">ou <span class="text-primary-dark font-semibold underline underline-offset-2">parcourez vos fichiers</span></p>
						<p class="text-xs text-text-muted mt-3">CSV - une ligne = un prospect - {IMPORT_LISTE_MAX_ROWS.toLocaleString('fr-CH')} lignes maximum</p>
					</div>
					<input
						bind:this={fileInput}
						type="file"
						accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
						class="sr-only"
						onchange={onFileChange}
					/>
					<div class="flex items-center justify-between gap-3 mt-4 flex-wrap">
						<button type="button" onclick={downloadTemplate} class="inline-flex items-center gap-2 text-[12.5px] font-semibold text-primary-dark hover:text-primary cursor-pointer">
							<Icon name="download" size={15} />
							Télécharger le modèle CSV
						</button>
						<span class="inline-flex items-center gap-2 text-[12.5px] text-text-muted">
							Ira dans
							<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light text-primary-dark text-xs font-bold">
								<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>{marqueName}
							</span>
						</span>
					</div>
					{#if parseError}
						<div role="alert" class="flex items-center gap-2.5 mt-4 px-3.5 py-3 rounded-lg text-[13px] bg-danger-light text-danger-deep border border-danger/20">
							<Icon name="error" size={17} class="shrink-0" />
							<span class="font-medium">{parseError}</span>
						</div>
					{/if}
				{:else if step === 2}
					<!-- ÉTAPE 2 : mapping -->
					<div class="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-primary-light/60 mb-4">
						<Icon name="fact_check" size={18} class="shrink-0 text-primary-dark mt-0.5" />
						<p class="text-[13px] text-text-body leading-snug">
							<b class="font-semibold text-text">{recognizedCount} colonne{recognizedCount > 1 ? 's' : ''} reconnue{recognizedCount > 1 ? 's' : ''} sur {columns.length}.</b>
							Vérifiez les correspondances. Choisissez un champ CRM ou « Ne pas importer » pour chaque colonne.
						</p>
					</div>
					<div class="flex flex-col gap-2">
						{#each columns as col, i}
							{@const ignored = mapping[i] === null}
							<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3">
								<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt ring-1 ring-inset ring-border min-w-0 {ignored ? 'opacity-60' : ''}">
									<span class="font-mono text-[12px] font-semibold text-text-body truncate">{col || '(colonne vide)'}</span>
									{#if sampleValues[i]}<span class="ml-auto text-[11px] text-text-muted truncate max-w-[45%] shrink-0">{sampleValues[i]}</span>{/if}
								</div>
								<Icon name="arrow_forward" size={15} class="text-text-muted shrink-0" />
								<div class="relative flex items-center rounded-lg ring-1 ring-inset {ignored ? 'bg-surface-alt ring-border' : autoMapped[i] ? 'bg-success-light ring-success/30' : 'bg-white ring-border-strong'}">
									<label class="sr-only" for="map-col-{i}">Champ CRM pour la colonne {col}</label>
									<select
										id="map-col-{i}"
										class="w-full appearance-none bg-transparent px-3 py-2 pr-8 text-[13px] font-semibold cursor-pointer focus:outline-none {ignored ? 'text-text-muted italic' : autoMapped[i] ? 'text-success-deep' : 'text-text'}"
										value={mapping[i] ?? ''}
										onchange={(e) => setMapping(i, (e.currentTarget.value || null) as ImportFieldKey | null)}
									>
										<option value="">Ne pas importer</option>
										{#each CRM_IMPORT_FIELDS as f}
											<option value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
										{/each}
									</select>
									{#if autoMapped[i]}
										<span class="absolute right-8 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-success/12 text-success-deep pointer-events-none">auto</span>
									{/if}
									<Icon name="chevron_right" size={15} class="absolute right-2.5 text-text-muted pointer-events-none rotate-90" />
								</div>
							</div>
						{/each}
					</div>
					<div class="flex items-center gap-2.5 mt-4 px-3.5 py-2.5 rounded-lg bg-info-light text-info-deep text-[12.5px]">
						<Icon name="info" size={16} class="shrink-0" />
						Le canton est déduit automatiquement du code postal (NPA).
					</div>
					{#if !raisonSocialeMapped}
						<div role="alert" class="flex items-center gap-2.5 mt-3 px-3.5 py-2.5 rounded-lg bg-warning-light text-warning-deep border border-warning/25 text-[12.5px]">
							<Icon name="warning" size={16} class="shrink-0" />
							Associez une colonne à la « Raison sociale » (obligatoire) pour continuer.
						</div>
					{/if}
					{#if truncatedRows}
						<p class="text-[12px] text-text-muted mt-3">Fichier tronqué aux {IMPORT_LISTE_MAX_ROWS.toLocaleString('fr-CH')} premières lignes.</p>
					{/if}
				{:else if preview}
					<!-- ÉTAPE 3 : aperçu -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
						<div class="px-3.5 py-3 rounded-lg bg-surface-alt ring-1 ring-inset ring-border">
							<div class="text-[22px] font-bold tabular-nums text-text leading-none">{preview.stats.total}</div>
							<div class="text-[11.5px] text-text-muted mt-1.5">ligne{preview.stats.total > 1 ? 's' : ''} lue{preview.stats.total > 1 ? 's' : ''}</div>
						</div>
						<div class="px-3.5 py-3 rounded-lg bg-success-light ring-1 ring-inset ring-success/20">
							<div class="text-[22px] font-bold tabular-nums text-success-deep leading-none">{preview.stats.toImport}</div>
							<div class="text-[11.5px] text-text-muted mt-1.5">nouveau{preview.stats.toImport > 1 ? 'x' : ''} prospect{preview.stats.toImport > 1 ? 's' : ''}</div>
						</div>
						<div class="px-3.5 py-3 rounded-lg bg-surface-alt ring-1 ring-inset ring-border">
							<div class="text-[22px] font-bold tabular-nums text-text leading-none">{preview.stats.duplicates}</div>
							<div class="text-[11.5px] text-text-muted mt-1.5">doublon{preview.stats.duplicates > 1 ? 's' : ''} ignoré{preview.stats.duplicates > 1 ? 's' : ''}</div>
						</div>
						<div class="px-3.5 py-3 rounded-lg bg-warning-light ring-1 ring-inset ring-warning/25">
							<div class="text-[22px] font-bold tabular-nums text-warning-deep leading-none">{preview.stats.invalid}</div>
							<div class="text-[11.5px] text-text-muted mt-1.5">à corriger</div>
						</div>
					</div>
					{#if excludedNote}<p class="text-[11.5px] text-text-muted mb-3">{excludedNote}</p>{/if}
					<div class="rounded-xl ring-1 ring-inset ring-border overflow-hidden">
						<table class="w-full border-collapse table-fixed">
							<colgroup><col style="width:42%" /><col style="width:18%" /><col style="width:18%" /><col style="width:22%" /></colgroup>
							<thead>
								<tr class="bg-surface-alt">
									<th class="text-left text-[10.5px] uppercase tracking-wide text-text-muted font-semibold px-3.5 py-2.5 border-b border-border">Entreprise</th>
									<th class="text-left text-[10.5px] uppercase tracking-wide text-text-muted font-semibold px-3.5 py-2.5 border-b border-border">Zone</th>
									<th class="text-left text-[10.5px] uppercase tracking-wide text-text-muted font-semibold px-3.5 py-2.5 border-b border-border">Source</th>
									<th class="text-left text-[10.5px] uppercase tracking-wide text-text-muted font-semibold px-3.5 py-2.5 border-b border-border">État</th>
								</tr>
							</thead>
							<tbody>
								{#each preview.sample as r (r.line)}
									<tr class="{r.state === 'invalid' ? 'bg-warning-light/30' : ''}">
										<td class="px-3.5 py-2.5 border-b border-hairline align-middle">
											<div class="text-[13px] font-semibold truncate {r.state === 'duplicate' ? 'text-text-muted' : r.state === 'invalid' ? 'text-warning-deep' : 'text-text'}">
												{r.state === 'invalid' ? `Ligne ${r.line}` : r.raison_sociale}
											</div>
											{#if r.state === 'invalid'}<div class="text-[11.5px] text-text-muted">Raison sociale vide</div>{:else if r.secteur}<div class="text-[11.5px] text-text-muted truncate">{r.secteur}</div>{/if}
										</td>
										<td class="px-3.5 py-2.5 border-b border-hairline align-middle">
											{#if r.localite}<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-info-light text-info-deep truncate max-w-full">{r.localite}</span>{:else}<span class="text-text-muted text-xs">-</span>{/if}
										</td>
										<td class="px-3.5 py-2.5 border-b border-hairline align-middle">
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style="background:#EEF0F2;color:#52606D;">
												<span class="w-1.5 h-1.5 rounded-full" style="background:#7B8794;"></span>Import manuel
											</span>
										</td>
										<td class="px-3.5 py-2.5 border-b border-hairline align-middle">
											{#if r.state === 'new'}
												<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-success-light text-success-deep"><Icon name="check" size={12} />Nouveau</span>
											{:else if r.state === 'duplicate'}
												<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold text-text-muted" style="background:#F1F2F4;"><Icon name="close" size={12} />Doublon ignoré</span>
											{:else}
												<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-warning-light text-warning-deep"><Icon name="warning" size={12} />À corriger</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if preview.sampleTruncated}
						<p class="text-[11.5px] text-text-muted mt-2.5">Aperçu des {preview.sample.length} premières lignes. Les compteurs ci-dessus portent sur l’ensemble du fichier.</p>
					{/if}
				{/if}

				{#if error}
					<div role="alert" class="flex items-center gap-2.5 mt-4 px-3.5 py-3 rounded-lg text-[13px] bg-danger-light text-danger-deep border border-danger/20">
						<Icon name="error" size={17} class="shrink-0" />
						<span class="font-medium">{error}</span>
					</div>
				{/if}
			</div>

			<!-- Pied : navigation par étape -->
			<div class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-white">
				{#if step === 1}
					<button type="button" onclick={close} class="inline-flex items-center px-3.5 py-2.5 text-[13px] font-semibold text-text-muted hover:text-text cursor-pointer">Annuler</button>
					<span class="text-[12px] text-text-muted">Déposez un fichier pour continuer</span>
				{:else if step === 2}
					<button type="button" onclick={() => { step = 1; }} class="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold text-text-muted hover:text-text cursor-pointer">
						<Icon name="chevron_left" size={15} />Retour
					</button>
					<button
						type="button"
						onclick={loadPreview}
						disabled={!raisonSocialeMapped || previewLoading}
						class="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[13.5px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
					>
						{previewLoading ? 'Analyse…' : 'Vérifier l’aperçu'}
						{#if !previewLoading}<Icon name="arrow_forward" size={16} />{/if}
					</button>
				{:else}
					<button type="button" onclick={() => { step = 2; }} class="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold text-text-muted hover:text-text cursor-pointer shrink-0">
						<Icon name="chevron_left" size={15} />Retour
					</button>
					<button
						type="button"
						onclick={runImport}
						disabled={importing || !preview || preview.stats.toImport === 0}
						class="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[13.5px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
					>
						{importing ? 'Import en cours…' : (preview?.stats.toImport ?? 0) === 0 ? 'Aucun prospect à importer' : `Importer ${preview?.stats.toImport ?? 0} prospect${(preview?.stats.toImport ?? 0) > 1 ? 's' : ''} dans ${marqueName}`}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
