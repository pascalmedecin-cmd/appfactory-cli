<script lang="ts" generics="T extends Record<string, any>">
	import type { Snippet } from 'svelte';

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		class?: string;
		render?: (row: T) => string;
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
	} = $props();

	let search = $state(serverMode ? serverSearch : '');
	let sortKey = $state(serverMode ? serverSortKey : '');
	let sortAsc = $state(serverMode ? serverSortAsc : true);
	let currentPage = $state(serverMode ? currentServerPage : 0);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync server props when they change (navigation/reload)
	$effect(() => { if (serverMode) search = serverSearch; });
	$effect(() => { if (serverMode) sortKey = serverSortKey; });
	$effect(() => { if (serverMode) sortAsc = serverSortAsc; });
	$effect(() => { if (serverMode) currentPage = currentServerPage; });

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
</script>

<div class="bg-white rounded-xl border border-border shadow-sm flex flex-col min-h-0">
	{#if searchable}
		<div class="px-4 py-3 border-b border-border">
			<input
				type="text"
				value={search}
				oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
				placeholder={searchPlaceholder}
				class="w-full max-w-sm px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
			/>
		</div>
	{/if}

	<div class="overflow-x-auto flex-1 min-h-0 overflow-y-auto">
		<table class="w-full text-sm table-fixed">
			<thead class="sticky top-0 z-10">
				<tr class="border-b border-border bg-surface-alt">
					{#if selectable}
						<th class="w-10 px-4 py-2.5">
							<label class="relative inline-flex items-center justify-center w-5 h-5 cursor-pointer before:absolute before:content-[''] before:-inset-3">
								<input type="checkbox" class="w-4 h-4 cursor-pointer" checked={selectedIds.size === paged.length && paged.length > 0} onchange={toggleSelectAll} aria-label="Tout sélectionner" />
							</label>
						</th>
					{/if}
					{#each columns as col}
						<th
							class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider {col.class ?? ''}"
						>
							{#if col.sortable}
								<button
									class="flex items-center gap-1 cursor-pointer hover:text-text"
									onclick={() => toggleSort(col.key)}
								>
									{col.label}
									{#if sortKey === col.key}
										<span class="material-symbols-outlined text-[16px]">
											{sortAsc ? 'arrow_upward' : 'arrow_downward'}
										</span>
									{/if}
								</button>
							{:else}
								{col.label}
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
							class="border-b border-border/40 hover:bg-surface-alt/50 transition-colors duration-150 {onRowClick ? 'cursor-pointer' : ''}"
							onclick={() => onRowClick?.(row)}
						>
							{#if selectable}
								<td class="w-10 px-4 py-2.5" onclick={(e) => e.stopPropagation()}>
									<label class="relative inline-flex items-center justify-center w-5 h-5 cursor-pointer before:absolute before:content-[''] before:-inset-3">
										<input type="checkbox" class="w-4 h-4 cursor-pointer" checked={selectedIds.has(row.id)} onchange={() => toggleSelect(row.id)} aria-label="Sélectionner la ligne" />
									</label>
								</td>
							{/if}
							{#if rowSnippet}
								{@render rowSnippet(row, i)}
							{:else}
								{#each columns as col}
									<td class="px-4 py-2.5 text-text {col.class ?? ''}">
										{col.render ? col.render(row) : (row[col.key] ?? '—')}
									</td>
								{/each}
							{/if}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1}
		<div class="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-text-muted shrink-0">
			<span>{effectiveTotalCount} résultat{effectiveTotalCount > 1 ? 's' : ''}</span>
			<div class="flex items-center gap-2">
				<button
					class="px-2 py-1 rounded hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
					disabled={currentPage === 0}
					onclick={() => goToPage(currentPage - 1)}
				>
					<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				</button>
				<span>{currentPage + 1} / {totalPages}</span>
				<button
					class="px-2 py-1 rounded hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
					disabled={currentPage >= totalPages - 1}
					onclick={() => goToPage(currentPage + 1)}
				>
					<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
				</button>
			</div>
		</div>
	{/if}
</div>
