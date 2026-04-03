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
		onRowClick,
		pageSize = 25,
		emptyMessage = 'Aucun résultat',
		row: rowSnippet,
	}: {
		data: T[];
		columns: Column[];
		searchable?: boolean;
		searchPlaceholder?: string;
		selectable?: boolean;
		onRowClick?: (row: T) => void;
		pageSize?: number;
		emptyMessage?: string;
		row?: Snippet<[T, number]>;
	} = $props();

	let search = $state('');
	let sortKey = $state('');
	let sortAsc = $state(true);
	let currentPage = $state(0);
	let selectedIds = $state<Set<string>>(new Set());

	const filtered = $derived.by(() => {
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

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const paged = $derived(filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize));

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = true;
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

	$effect(() => {
		search;
		currentPage = 0;
	});
</script>

<div class="bg-white rounded-lg border border-border shadow-sm">
	{#if searchable}
		<div class="px-4 py-3 border-b border-border">
			<input
				type="text"
				bind:value={search}
				placeholder={searchPlaceholder}
				class="w-full max-w-sm px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
			/>
		</div>
	{/if}

	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-border bg-surface-alt/50">
					{#if selectable}
						<th class="w-10 px-4 py-2.5">
							<input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0} onchange={toggleSelectAll} />
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
							class="border-b border-border/50 hover:bg-surface transition-colors {onRowClick ? 'cursor-pointer' : ''}"
							onclick={() => onRowClick?.(row)}
						>
							{#if selectable}
								<td class="w-10 px-4 py-2.5" onclick={(e) => e.stopPropagation()}>
									<input type="checkbox" checked={selectedIds.has(row.id)} onchange={() => toggleSelect(row.id)} />
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
		<div class="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-text-muted">
			<span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
			<div class="flex items-center gap-2">
				<button
					class="px-2 py-1 rounded hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
					disabled={currentPage === 0}
					onclick={() => currentPage--}
				>
					←
				</button>
				<span>{currentPage + 1} / {totalPages}</span>
				<button
					class="px-2 py-1 rounded hover:bg-surface-alt disabled:opacity-40 cursor-pointer"
					disabled={currentPage >= totalPages - 1}
					onclick={() => currentPage++}
				>
					→
				</button>
			</div>
		</div>
	{/if}
</div>
