<script lang="ts" generics="T extends Record<string, any>">
	import Icon from '$lib/components/Icon.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { Snippet } from 'svelte';

	type Column = {
		key: string;
		label: string;
		shortLabel?: string;
		sortable?: boolean;
		class?: string;
		render?: (row: T) => string;
		infoTooltip?: string;
		minWidth?: number;
		defaultWidth?: number;
	};

	let {
		data = [],
		columns = [],
		searchable = true,
		searchPlaceholder = 'Rechercher…',
		selectable = false,
		selectedIds = $bindable(new Set<string>()),
		onRowClick,
		pageSize = 25,
		emptyMessage = 'Aucun résultat',
		row: rowSnippet,
		serverMode = false,
		totalCount = 0,
		currentServerPage = 0,
		serverSortKey = '',
		serverSortAsc = true,
		serverSearch = '',
		onPageChange,
		onSortChange,
		onSearchChange,
		// Phase 2 2026-05-01 : extensions opt-in (rétrocompat /contacts).
		dense = false,
		resizable = false,
		storageKey = '',
		pageSizeOptions = null as number[] | null,
		onPageSizeChange = null as ((size: number) => void) | null,
		// Mode "embedded" : le parent fournit déjà le shell visuel (rounded + border + shadow + bg).
		// Utilisé par /prospection Phase 2 où ProspectionTabs + DataTable partagent un seul wrapper.
		embedded = false,
		// V4 audit S163 (F-V4-04) : aria-label descriptif par ligne (lecteur d'écran).
		// Sans cette prop, role=button + tabindex=0 sont annoncés sans contexte ("bouton").
		rowAriaLabel = null as (((row: T) => string) | null),
		// H-19 audit S160 : pin colonnes gauche (+ checkbox si selectable). Pattern Linear/Attio.
		// 0 = off, 1 = pin col 0, 2 = pin col 0 + col 1 (ex. ScorePill + raison_sociale).
		// Compatible resizable : offsets recalculés dynamiquement depuis colWidths.
		stickyLeftCols = 0,
	}: {
		data: T[];
		columns: Column[];
		searchable?: boolean;
		searchPlaceholder?: string;
		selectable?: boolean;
		selectedIds?: Set<string>;
		onRowClick?: (row: T) => void;
		pageSize?: number;
		emptyMessage?: string;
		row?: Snippet<[T, number]>;
		serverMode?: boolean;
		totalCount?: number;
		currentServerPage?: number;
		serverSortKey?: string;
		serverSortAsc?: boolean;
		serverSearch?: string;
		onPageChange?: (page: number) => void;
		onSortChange?: (key: string, asc: boolean) => void;
		onSearchChange?: (q: string) => void;
		dense?: boolean;
		resizable?: boolean;
		storageKey?: string;
		pageSizeOptions?: number[] | null;
		onPageSizeChange?: ((size: number) => void) | null;
		embedded?: boolean;
		rowAriaLabel?: ((row: T) => string) | null;
		stickyLeftCols?: number;
	} = $props();

	// H-19 : track scroll horizontal pour afficher box-shadow conditionnel sur colonne(s) pinned.
	// Pas de shadow quand scrollLeft = 0 (pas de visuel "flottant" gratuit en pleine vue).
	let scrollWrapEl: HTMLDivElement | undefined = $state();
	let scrolledX = $state(false);
	function handleTableScroll() {
		if (!scrollWrapEl) return;
		scrolledX = scrollWrapEl.scrollLeft > 0;
	}

	// H-19 : offsets `left:` des colonnes pin, recalculés dès que colWidths ou columns change.
	// Le checkbox prend 40px (constant via dt-th-checkbox / dt-td-checkbox CSS).
	const stickyOffsets = $derived.by(() => {
		if (stickyLeftCols <= 0) return null;
		const checkboxW = selectable ? 40 : 0;
		const col0Key = columns[0]?.key;
		const col0W = (col0Key && colWidths[col0Key]) || columns[0]?.defaultWidth || 0;
		return {
			cb: '0px',
			c0: checkboxW + 'px',
			c1: checkboxW + col0W + 'px',
		};
	});

	let search = $state(serverMode ? serverSearch : '');
	let sortKey = $state(serverMode ? serverSortKey : '');
	let sortAsc = $state(serverMode ? serverSortAsc : true);
	let currentPage = $state(serverMode ? currentServerPage : 0);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => { if (serverMode) search = serverSearch; });
	$effect(() => { if (serverMode) sortKey = serverSortKey; });
	$effect(() => { if (serverMode) sortAsc = serverSortAsc; });
	$effect(() => { if (serverMode) currentPage = currentServerPage; });

	// Largeurs colonnes persistées par scope (resizable + storageKey requis ensemble).
	const STORAGE_PREFIX = 'datatable.col-widths.';
	let colWidths = $state<Record<string, number>>({});

	$effect(() => {
		if (!resizable || !storageKey || typeof window === 'undefined') return;
		try {
			const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			// Garde-fou : payload doit être un objet plain (pas array, pas null), valeurs = nombres finis bornés.
			// Anti-corruption locale (manipulation localStorage, migration ratée, valeurs hostiles).
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
			const safe: Record<string, number> = {};
			for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
				if (typeof v === 'number' && Number.isFinite(v) && v >= 40 && v <= 2000) {
					safe[k] = v;
				}
			}
			colWidths = safe;
		} catch { /* localStorage indisponible : on garde defaults */ }
	});

	function persistWidths() {
		if (!resizable || !storageKey || typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(colWidths));
		} catch { /* quota ou private mode : best-effort */ }
	}

	function resetWidths() {
		colWidths = {};
		persistWidths();
	}

	// V2.2 audit S160 : redim colonne au clavier (WCAG 2.1.1).
	// ArrowLeft/Right ±10px, Shift+Arrow ±50px (large step), Home reset minWidth, End cap 2000.
	function handleResizeKeydown(e: KeyboardEvent, colKey: string, minW: number) {
		const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement | null;
		if (!th) return;
		const current = colWidths[colKey] ?? th.offsetWidth;
		const step = e.shiftKey ? 50 : 10;
		let next = current;
		if (e.key === 'ArrowRight') next = current + step;
		else if (e.key === 'ArrowLeft') next = current - step;
		else if (e.key === 'Home') next = minW;
		else if (e.key === 'End') next = 2000;
		else return;
		e.preventDefault();
		next = Math.max(minW, Math.min(2000, next));
		colWidths = { ...colWidths, [colKey]: next };
		th.style.width = next + 'px';
		persistWidths();
	}

	function startResize(e: PointerEvent, colKey: string, minW: number) {
		e.preventDefault();
		e.stopPropagation();
		const target = e.currentTarget as HTMLElement;
		target.classList.add('col-resizer--active');
		const pointerId = e.pointerId;
		try { target.setPointerCapture?.(pointerId); } catch { /* navigateur ancien : fallback ok */ }
		const th = target.parentElement as HTMLElement;
		const startX = e.clientX;
		const startWidth = th.offsetWidth;
		let lastWidth = startWidth;
		// Pendant le drag : on mute le DOM directement (style inline sur <th>) pour éviter
		// un re-render Svelte qui détacherait le handle et casserait la capture pointer.
		// On sync `colWidths` (state Svelte + persistance localStorage) UNE SEULE FOIS au pointerup.
		const cleanup = () => {
			target.classList.remove('col-resizer--active');
			try { target.releasePointerCapture?.(pointerId); } catch { /* déjà perdue */ }
			colWidths = { ...colWidths, [colKey]: lastWidth };
			persistWidths();
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			document.removeEventListener('pointercancel', onUp);
		};
		const onMove = (ev: PointerEvent) => {
			lastWidth = Math.max(minW, Math.min(2000, startWidth + ev.clientX - startX));
			th.style.width = lastWidth + 'px';
		};
		const onUp = () => cleanup();

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
		document.addEventListener('pointercancel', onUp);
	}

	const filtered = $derived.by(() => {
		if (serverMode) return data;
		let result = data;
		if (search) {
			const q = search.toLowerCase();
			result = result.filter((row) =>
				columns.some((col) => {
					const val = row[col.key];
					return val != null && String(val).toLowerCase().includes(q);
				})
			);
		}
		if (sortKey) {
			result = [...result].sort((a, b) => {
				const va = a[sortKey] ?? '';
				const vb = b[sortKey] ?? '';
				const cmp = String(va).localeCompare(String(vb), 'fr', { numeric: true });
				return sortAsc ? cmp : -cmp;
			});
		}
		return result;
	});

	const effectiveTotalCount = $derived(serverMode ? totalCount : filtered.length);
	const totalPages = $derived(Math.max(1, Math.ceil(effectiveTotalCount / pageSize)));
	const paged = $derived(serverMode ? data : filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize));

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = true;
		}
		if (serverMode) {
			onSortChange?.(sortKey, sortAsc);
		}
	}

	function toggleSelectAll() {
		if (selectedIds.size === paged.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(paged.map((r) => r.id));
		}
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function handleSearchInput(value: string) {
		search = value;
		if (serverMode) {
			if (searchTimer) clearTimeout(searchTimer);
			searchTimer = setTimeout(() => {
				currentPage = 0;
				onSearchChange?.(search);
			}, 300);
		} else {
			currentPage = 0;
		}
	}

	function goToPage(page: number) {
		currentPage = page;
		if (serverMode) onPageChange?.(page);
	}

	function ariaSort(key: string): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortAsc ? 'ascending' : 'descending';
	}
</script>

<div class="flex flex-1 flex-col min-h-0 {embedded ? '' : 'bg-white rounded-xl border border-border shadow-sm'}">
	{#if searchable}
		<div class="sticky top-0 z-20 px-4 py-3 border-b border-border bg-white {embedded ? '' : 'rounded-t-xl'} flex items-center gap-3">
			<input
				type="search"
				value={search}
				oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
				placeholder={searchPlaceholder}
				aria-label={searchPlaceholder}
				class="w-full md:max-w-sm px-3 py-2 md:py-1.5 text-sm border border-[var(--color-border-input)] rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
			/>
		</div>
	{/if}

	<div
		class="overflow-x-auto flex-1 min-h-0 overflow-y-auto"
		class:dt-sticky-1={stickyLeftCols >= 1}
		class:dt-sticky-2={stickyLeftCols >= 2}
		class:dt-no-checkbox={stickyLeftCols >= 1 && !selectable}
		class:dt-scrolled-x={scrolledX}
		style={stickyOffsets ? `--dt-stick-cb: ${stickyOffsets.cb}; --dt-stick-0: ${stickyOffsets.c0}; --dt-stick-1: ${stickyOffsets.c1};` : ''}
		bind:this={scrollWrapEl}
		onscroll={handleTableScroll}
	>
		<table class="w-full text-sm table-fixed" class:dt-dense={dense}>
			<thead class="sticky top-0 z-10">
				<tr class="border-b border-border bg-surface-alt">
					{#if selectable}
						<th class="dt-th-checkbox" scope="col">
							<label class="relative inline-flex items-center justify-center w-5 h-5 cursor-pointer before:absolute before:content-[''] before:-inset-3">
								<input type="checkbox" class="w-4 h-4 cursor-pointer" checked={selectedIds.size === paged.length && paged.length > 0} onchange={toggleSelectAll} aria-label="Tout sélectionner" />
							</label>
						</th>
					{/if}
					{#each columns as col}
						<th
							scope="col"
							class="dt-th text-left text-xs font-semibold text-text-muted uppercase tracking-wider {col.class ?? ''}"
							style={resizable && colWidths[col.key] ? `width: ${colWidths[col.key]}px;` : (resizable && col.defaultWidth ? `width: ${col.defaultWidth}px;` : '')}
							class:dt-th-sorted={sortKey === col.key}
							class:dt-th-sorted-asc={sortKey === col.key && sortAsc}
							class:dt-th-sorted-desc={sortKey === col.key && !sortAsc}
							aria-sort={col.sortable ? ariaSort(col.key) : undefined}
						>
							{#if col.sortable}
								<button
									type="button"
									class="dt-th-button"
									onclick={() => toggleSort(col.key)}
								>
									{#if col.infoTooltip}
										<Tooltip content={col.infoTooltip} anchor="start" width={280}>
											<span class="dt-th-label-with-info">
												{#if col.shortLabel}
													<span class="md:hidden">{col.shortLabel}</span>
													<span class="hidden md:inline">{col.label}</span>
												{:else}
													{col.label}
												{/if}
												<span class="dt-info-mark" aria-hidden="true">i</span>
											</span>
										</Tooltip>
									{:else}
										{#if col.shortLabel}
											<span class="md:hidden">{col.shortLabel}</span>
											<span class="hidden md:inline">{col.label}</span>
										{:else}
											{col.label}
										{/if}
									{/if}
									<span class="dt-sort-stack" aria-hidden="true">
										<svg class="dt-sort-up" viewBox="0 0 9 5" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="0.75 4.25 4.5 0.75 8.25 4.25"/></svg>
										<svg class="dt-sort-down" viewBox="0 0 9 5" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="0.75 0.75 4.5 4.25 8.25 0.75"/></svg>
									</span>
								</button>
							{:else if col.infoTooltip}
								<Tooltip content={col.infoTooltip} anchor="start" width={280}>
									<span class="dt-th-label-with-info">
										{#if col.shortLabel}
											<span class="md:hidden">{col.shortLabel}</span>
											<span class="hidden md:inline">{col.label}</span>
										{:else}
											{col.label}
										{/if}
										<span class="dt-info-mark" aria-hidden="true">i</span>
									</span>
								</Tooltip>
							{:else if col.shortLabel}
								<span class="md:hidden">{col.shortLabel}</span>
								<span class="hidden md:inline">{col.label}</span>
							{:else}
								{col.label}
							{/if}
							{#if resizable}
								<span
									class="col-resizer"
									role="separator"
									aria-orientation="vertical"
									tabindex="0"
									aria-label="Redimensionner la colonne {col.label}"
									aria-valuenow={colWidths[col.key] ?? col.defaultWidth ?? 0}
									aria-valuemin={col.minWidth ?? 60}
									aria-valuemax={2000}
									onpointerdown={(e) => startResize(e, col.key, col.minWidth ?? 60)}
									onkeydown={(e) => handleResizeKeydown(e, col.key, col.minWidth ?? 60)}
								></span>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if paged.length === 0}
					<tr>
						<td colspan={columns.length + (selectable ? 1 : 0)} class="px-4 py-8 text-center text-text-muted">
							{emptyMessage}
						</td>
					</tr>
				{:else}
					{#each paged as row, i}
						<tr
							class="border-b border-border/40 hover:bg-surface-alt/50 transition-colors duration-150 {onRowClick ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]' : ''}"
							tabindex={onRowClick ? 0 : undefined}
							role={onRowClick ? 'button' : undefined}
							aria-label={onRowClick && rowAriaLabel ? rowAriaLabel(row) : undefined}
							onclick={() => onRowClick?.(row)}
							onkeydown={(e) => {
								if (!onRowClick) return;
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onRowClick(row);
								}
							}}
						>
							{#if selectable}
								<td class="dt-td-checkbox" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
									<label class="relative inline-flex items-center justify-center w-5 h-5 cursor-pointer before:absolute before:content-[''] before:-inset-3">
										<input type="checkbox" class="w-4 h-4 cursor-pointer" checked={selectedIds.has(row.id)} onchange={() => toggleSelect(row.id)} aria-label="Sélectionner la ligne" />
									</label>
								</td>
							{/if}
							{#if rowSnippet}
								{@render rowSnippet(row, i)}
							{:else}
								{#each columns as col}
									<td class="dt-td text-text {col.class ?? ''}">
										{col.render ? col.render(row) : (row[col.key] ?? '–')}
									</td>
								{/each}
							{/if}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1 || (pageSizeOptions && pageSizeOptions.length > 0)}
		<div class="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-text-muted shrink-0 gap-2 flex-wrap">
			<div class="flex items-center gap-3">
				<span>{effectiveTotalCount} résultat{effectiveTotalCount > 1 ? 's' : ''}</span>
				{#if pageSizeOptions && pageSizeOptions.length > 0}
					<label class="flex items-center gap-2 text-xs">
						<span class="hidden md:inline">Afficher</span>
						<select
							class="h-8 px-2 border border-[var(--color-border-input)] rounded-md bg-white text-text cursor-pointer text-xs"
							onchange={(e) => onPageSizeChange?.(Number((e.target as HTMLSelectElement).value))}
							aria-label="Nombre d'entrées par page"
						>
							{#each pageSizeOptions as opt}
								<option value={opt} selected={opt === pageSize}>{opt}</option>
							{/each}
						</select>
						<span class="hidden md:inline">par page</span>
					</label>
				{/if}
			</div>
			{#if totalPages > 1}
				<div class="flex items-center gap-2">
					<button
						class="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
						disabled={currentPage === 0}
						onclick={() => goToPage(currentPage - 1)}
						aria-label="Page précédente"
					>
						<Icon name="arrow_back" size={18} />
					</button>
					<span>{currentPage + 1} / {totalPages}</span>
					<button
						class="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
						disabled={currentPage >= totalPages - 1}
						onclick={() => goToPage(currentPage + 1)}
						aria-label="Page suivante"
					>
						<Icon name="arrow_forward" size={18} />
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Padding par défaut, repris du baseline /contacts non-dense */
	.dt-th { padding: 12px 16px; position: relative; }
	.dt-td { padding: 12px 16px; }
	.dt-th-checkbox { width: 40px; padding: 12px 16px; }
	.dt-td-checkbox { width: 40px; padding: 12px 16px; }

	/* Densité opt-in (Phase 2 prospection) : padding réduit, 13px police */
	:global(table.dt-dense) .dt-th { padding: 8px 12px; font-size: 11px; }
	:global(table.dt-dense) .dt-td { padding: 7px 12px; font-size: 13px; }
	:global(table.dt-dense) .dt-th-checkbox,
	:global(table.dt-dense) .dt-td-checkbox { padding: 7px 8px; }

	.dt-th-button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: inherit;
		font-weight: 600;
		text-transform: inherit;
		letter-spacing: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.dt-th-button:hover { color: var(--color-text); }
	.dt-th-sorted .dt-th-button { color: var(--color-primary); }

	.dt-th-label-with-info {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		cursor: help;
	}
	.dt-info-mark {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--color-text-muted) 40%, transparent);
		color: var(--color-text-muted);
		font-size: 9px;
		font-weight: 600;
		font-family: serif;
		font-style: italic;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-transform: lowercase;
		letter-spacing: 0;
		transition: color 120ms ease, border-color 120ms ease;
	}
	.dt-th-label-with-info:hover .dt-info-mark {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	/* Tri stack bidirectionnel (Linear/Stripe pattern) */
	.dt-sort-stack {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin-left: 4px;
		line-height: 0;
		vertical-align: middle;
		height: 12px;
	}
	.dt-sort-stack svg {
		display: block;
		width: 9px;
		height: 5px;
		color: var(--color-text-muted);
		opacity: 0.35;
		transition: opacity 120ms ease, color 120ms ease;
	}
	.dt-th-button:hover .dt-sort-stack svg { opacity: 0.7; }
	.dt-th-sorted-asc .dt-sort-up,
	.dt-th-sorted-desc .dt-sort-down {
		color: var(--color-primary);
		opacity: 1;
	}
	.dt-th-sorted-asc .dt-sort-down,
	.dt-th-sorted-desc .dt-sort-up {
		opacity: 0.25;
	}

	/* H-19 audit S160 : pin colonnes gauche compatible resizable. Pattern Linear/Attio.
	   Offsets `left:` injectés via CSS vars depuis JS pour suivre colWidths dynamiquement.
	   z-index hiérarchisé : tbody sticky z=1, thead sticky-top z=10 + sticky-left = z=11,
	   col-resizer z=2 reste opérable (pas par-dessus la colonne pin elle-même). */

	/* Checkbox pinned (uniquement quand stickyLeftCols >= 1 ET selectable) */
	:global(.dt-sticky-1:not(.dt-no-checkbox)) tbody td:first-child {
		position: sticky;
		left: var(--dt-stick-cb, 0);
		z-index: 1;
		background: var(--color-surface);
	}
	:global(.dt-sticky-1:not(.dt-no-checkbox)) thead th:first-child {
		position: sticky;
		left: var(--dt-stick-cb, 0);
		z-index: 11;
		background: var(--color-surface-alt);
	}

	/* Col 0 data pinned : nth-child(2) si selectable, nth-child(1) sinon */
	:global(.dt-sticky-1:not(.dt-no-checkbox)) tbody td:nth-child(2),
	:global(.dt-sticky-1.dt-no-checkbox) tbody td:nth-child(1) {
		position: sticky;
		left: var(--dt-stick-0, 0);
		z-index: 1;
		background: var(--color-surface);
	}
	:global(.dt-sticky-1:not(.dt-no-checkbox)) thead th:nth-child(2),
	:global(.dt-sticky-1.dt-no-checkbox) thead th:nth-child(1) {
		position: sticky;
		left: var(--dt-stick-0, 0);
		z-index: 11;
		background: var(--color-surface-alt);
	}

	/* Col 1 data pinned (uniquement quand stickyLeftCols >= 2) */
	:global(.dt-sticky-2:not(.dt-no-checkbox)) tbody td:nth-child(3),
	:global(.dt-sticky-2.dt-no-checkbox) tbody td:nth-child(2) {
		position: sticky;
		left: var(--dt-stick-1, 0);
		z-index: 1;
		background: var(--color-surface);
	}
	:global(.dt-sticky-2:not(.dt-no-checkbox)) thead th:nth-child(3),
	:global(.dt-sticky-2.dt-no-checkbox) thead th:nth-child(2) {
		position: sticky;
		left: var(--dt-stick-1, 0);
		z-index: 11;
		background: var(--color-surface-alt);
	}

	/* Hover ligne propage sur cellules pin (sinon le bg sticky écrase le hover transparent). */
	:global(.dt-sticky-1) tbody tr:hover td:first-child,
	:global(.dt-sticky-1:not(.dt-no-checkbox)) tbody tr:hover td:nth-child(2),
	:global(.dt-sticky-1.dt-no-checkbox) tbody tr:hover td:nth-child(1),
	:global(.dt-sticky-2:not(.dt-no-checkbox)) tbody tr:hover td:nth-child(3),
	:global(.dt-sticky-2.dt-no-checkbox) tbody tr:hover td:nth-child(2) {
		background: color-mix(in srgb, var(--color-surface-alt) 50%, var(--color-surface));
	}

	/* Box-shadow droite UNIQUEMENT sur la dernière colonne pin (séparation visuelle vers contenu scrollé).
	   Conditionnel à dt-scrolled-x : pas de visuel flottant en état pleine vue (scrollLeft=0). */
	:global(.dt-sticky-1.dt-scrolled-x:not(.dt-sticky-2):not(.dt-no-checkbox)) thead th:nth-child(2),
	:global(.dt-sticky-1.dt-scrolled-x:not(.dt-sticky-2):not(.dt-no-checkbox)) tbody td:nth-child(2),
	:global(.dt-sticky-1.dt-scrolled-x:not(.dt-sticky-2).dt-no-checkbox) thead th:nth-child(1),
	:global(.dt-sticky-1.dt-scrolled-x:not(.dt-sticky-2).dt-no-checkbox) tbody td:nth-child(1),
	:global(.dt-sticky-2.dt-scrolled-x:not(.dt-no-checkbox)) thead th:nth-child(3),
	:global(.dt-sticky-2.dt-scrolled-x:not(.dt-no-checkbox)) tbody td:nth-child(3),
	:global(.dt-sticky-2.dt-scrolled-x.dt-no-checkbox) thead th:nth-child(2),
	:global(.dt-sticky-2.dt-scrolled-x.dt-no-checkbox) tbody td:nth-child(2) {
		box-shadow: 4px 0 4px -4px rgba(0, 0, 0, 0.08);
	}

	/* Resize handle (drag horizontal sur séparateur de colonne) */
	.col-resizer {
		position: absolute;
		right: -3px;
		top: 0;
		bottom: 0;
		width: 6px;
		cursor: col-resize;
		z-index: 2;
		background: transparent;
		transition: background 100ms ease;
		touch-action: none;
	}
	.col-resizer:hover,
	.col-resizer:global(.col-resizer--active) {
		background: color-mix(in srgb, var(--color-primary) 30%, transparent);
	}
	.col-resizer::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 1px;
		height: 16px;
		background: var(--color-border);
	}
</style>
