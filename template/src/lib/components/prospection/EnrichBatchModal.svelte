<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { invalidateAll } from '$app/navigation';

	let {
		open = $bindable(false),
		leadIds = [],
		onDone,
	}: {
		open: boolean;
		leadIds: string[];
		onDone?: (summary: { enriched: number; errors: number }) => void;
	} = $props();

	// Sources disponibles
	let useSearchCh = $state(true);
	let useZefix = $state(true);

	// Etats du process
	type Phase = 'config' | 'running' | 'done';
	let phase = $state<Phase>('config');
	let total = $state(0);
	let current = $state(0);
	let enrichedCount = $state(0);
	let alreadyCompleteCount = $state(0);
	let notFoundCount = $state(0);
	let errorCount = $state(0);
	let logs = $state<Array<{ status: string; raison_sociale: string; message: string }>>([]);
	let abortController: AbortController | null = null;

	const progress = $derived(total > 0 ? Math.round((current / total) * 100) : 0);

	function reset() {
		phase = 'config';
		total = 0;
		current = 0;
		enrichedCount = 0;
		alreadyCompleteCount = 0;
		notFoundCount = 0;
		errorCount = 0;
		logs = [];
		useSearchCh = true;
		useZefix = true;
		abortController = null;
	}

	function close() {
		if (phase === 'running' && abortController) {
			abortController.abort();
		}
		open = false;
		// Reset apres la fermeture pour eviter flash visuel
		setTimeout(reset, 200);
	}

	async function start() {
		const sources: string[] = [];
		if (useSearchCh) sources.push('search_ch');
		if (useZefix) sources.push('zefix');

		if (sources.length === 0) return;

		phase = 'running';
		abortController = new AbortController();

		try {
			const resp = await fetch('/api/prospection/enrichir-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lead_ids: leadIds, sources }),
				signal: abortController.signal,
			});

			if (!resp.ok) {
				const err = await resp.json();
				logs = [{ status: 'error', raison_sociale: '', message: err.error || 'Erreur serveur' }];
				phase = 'done';
				return;
			}

			const reader = resp.body?.getReader();
			if (!reader) return;

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				let eventType = '';
				for (const line of lines) {
					if (line.startsWith('event: ')) {
						eventType = line.slice(7);
					} else if (line.startsWith('data: ') && eventType) {
						try {
							const data = JSON.parse(line.slice(6));
							handleEvent(eventType, data);
						} catch {
							// Ignorer les lignes mal formees
						}
						eventType = '';
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				logs = [...logs, { status: 'error', raison_sociale: '', message: `Erreur connexion: ${String(err)}` }];
			}
		}

		phase = 'done';
		await invalidateAll();
	}

	function handleEvent(event: string, data: Record<string, unknown>) {
		switch (event) {
			case 'start':
				total = data.total as number;
				break;
			case 'progress': {
				current = data.current as number;
				const result = data.result as {
					status: string;
					raison_sociale: string;
					message: string;
					fields_updated: string[];
				};
				if (result.status === 'enriched') enrichedCount++;
				else if (result.status === 'already_complete') alreadyCompleteCount++;
				else if (result.status === 'not_found') notFoundCount++;
				else if (result.status === 'error') errorCount++;
				logs = [...logs, {
					status: result.status,
					raison_sociale: result.raison_sociale,
					message: result.message,
				}];
				break;
			}
			case 'done':
				enrichedCount = data.enriched as number;
				alreadyCompleteCount = data.already_complete as number;
				notFoundCount = data.not_found as number;
				errorCount = data.errors as number;
				break;
			case 'cancelled':
				break;
		}
	}

	function handleDone() {
		onDone?.({ enriched: enrichedCount, errors: errorCount });
		close();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && phase !== 'running') close();
	}

	function statusIcon(status: string): string {
		switch (status) {
			case 'enriched': return 'check_circle';
			case 'already_complete': return 'verified';
			case 'not_found': return 'search_off';
			case 'error': return 'error';
			default: return 'circle';
		}
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'enriched': return 'text-success';
			case 'already_complete': return 'text-text-muted';
			case 'not_found': return 'text-warning';
			case 'error': return 'text-danger';
			default: return 'text-text-muted';
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 bg-black/30 z-50 cursor-default"
		onclick={() => { if (phase !== 'running') close(); }}
		tabindex="-1"
		aria-label="Fermer"
		transition:fade={{ duration: 150 }}
	></button>

	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
		<div
			class="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4" style="background: linear-gradient(to right, #F0ECF5, #EDF1F5); border-bottom: 1px solid #8B9DB620">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-[22px]" style="color: #7B6A9A">auto_fix_high</span>
					<h2 class="text-lg font-semibold text-text">Enrichissement batch</h2>
				</div>
				{#if phase !== 'running'}
					<button onclick={close} class="text-text-muted hover:text-text cursor-pointer">
						<span class="material-symbols-outlined text-[20px]">close</span>
					</button>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
				<!-- Phase config -->
				{#if phase === 'config'}
					<div class="flex items-start gap-3 p-3.5 rounded-lg" style="background: #F0ECF520; border: 1px solid #9B8BB515">
						<span class="material-symbols-outlined text-[20px] mt-0.5" style="color: #7B6A9A">info</span>
						<p class="text-sm text-text-body">
							{leadIds.length} prospect{leadIds.length > 1 ? 's' : ''} sélectionné{leadIds.length > 1 ? 's' : ''}. Choisissez les sources d'enrichissement.
						</p>
					</div>

					<div class="space-y-3">
						<p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Sources</p>
						<label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/30 cursor-pointer transition-colors">
							<input type="checkbox" bind:checked={useSearchCh} class="accent-accent" />
							<span class="material-symbols-outlined text-[20px] text-text-muted">phone_forwarded</span>
							<div>
								<span class="text-sm font-medium text-text">search.ch</span>
								<p class="text-xs text-text-muted">Telephone, adresse, NPA, localite</p>
							</div>
						</label>
						<label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/30 cursor-pointer transition-colors">
							<input type="checkbox" bind:checked={useZefix} class="accent-accent" />
							<span class="material-symbols-outlined text-[20px] text-text-muted">business</span>
							<div>
								<span class="text-sm font-medium text-text">Zefix (registre du commerce)</span>
								<p class="text-xs text-text-muted">Adresse, but social, lien source</p>
							</div>
						</label>
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-border">
						<button
							type="button"
							onclick={close}
							class="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
						>
							Annuler
						</button>
						<button
							type="button"
							onclick={start}
							disabled={!useSearchCh && !useZefix}
							class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
							style="background: #7B6A9A"
						>
							<span class="material-symbols-outlined text-[16px]">play_arrow</span>
							Lancer l'enrichissement
						</button>
					</div>
				{/if}

				<!-- Phase running -->
				{#if phase === 'running'}
					<div class="space-y-4">
						<!-- Barre de progression -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-text">{current} / {total}</span>
								<span class="text-sm font-medium" style="color: #7B6A9A">{progress}%</span>
							</div>
							<div class="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-300"
									style="width: {progress}%; background: #7B6A9A"
								></div>
							</div>
						</div>

						<!-- Compteurs en temps reel -->
						<div class="grid grid-cols-4 gap-2 text-center">
							<div class="p-2 rounded-lg bg-success-light">
								<span class="text-lg font-bold text-success">{enrichedCount}</span>
								<p class="text-[10px] text-success font-medium">Enrichis</p>
							</div>
							<div class="p-2 rounded-lg bg-surface-alt">
								<span class="text-lg font-bold text-text-muted">{alreadyCompleteCount}</span>
								<p class="text-[10px] text-text-muted font-medium">Complets</p>
							</div>
							<div class="p-2 rounded-lg bg-warning-light">
								<span class="text-lg font-bold text-warning">{notFoundCount}</span>
								<p class="text-[10px] text-warning font-medium">Non trouves</p>
							</div>
							<div class="p-2 rounded-lg bg-danger-light">
								<span class="text-lg font-bold text-danger">{errorCount}</span>
								<p class="text-[10px] text-danger font-medium">Erreurs</p>
							</div>
						</div>

						<!-- Log scrollable -->
						<div class="max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg bg-surface-alt/50 border border-border/50">
							{#each logs as log}
								<div class="flex items-center gap-2 text-xs py-0.5">
									<span class="material-symbols-outlined text-[14px] {statusColor(log.status)}">{statusIcon(log.status)}</span>
									<span class="font-medium text-text truncate max-w-[180px]">{log.raison_sociale}</span>
									<span class="text-text-muted">{log.message}</span>
								</div>
							{/each}
						</div>

						<div class="flex justify-end pt-2">
							<button
								type="button"
								onclick={() => { abortController?.abort(); }}
								class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger-light cursor-pointer transition-colors"
							>
								<span class="material-symbols-outlined text-[16px]">stop</span>
								Annuler
							</button>
						</div>
					</div>
				{/if}

				<!-- Phase done -->
				{#if phase === 'done'}
					<div class="space-y-4">
						<!-- Resume -->
						<div class="p-4 rounded-xl" style="background: linear-gradient(135deg, #F0ECF5, #EDF1F5)">
							<div class="flex items-center gap-2 mb-3">
								<span class="material-symbols-outlined text-[24px] text-success">task_alt</span>
								<h3 class="text-base font-semibold text-text">Enrichissement termine</h3>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px] text-success">check_circle</span>
									<span class="text-sm text-text">{enrichedCount} enrichi{enrichedCount > 1 ? 's' : ''}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px] text-text-muted">verified</span>
									<span class="text-sm text-text">{alreadyCompleteCount} deja complet{alreadyCompleteCount > 1 ? 's' : ''}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px] text-warning">search_off</span>
									<span class="text-sm text-text">{notFoundCount} non trouve{notFoundCount > 1 ? 's' : ''}</span>
								</div>
								{#if errorCount > 0}
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-[16px] text-danger">error</span>
										<span class="text-sm text-text">{errorCount} erreur{errorCount > 1 ? 's' : ''}</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Log detaille -->
						{#if logs.length > 0}
							<details class="group">
								<summary class="flex items-center gap-1.5 text-sm text-text-muted cursor-pointer hover:text-text">
									<span class="material-symbols-outlined text-[16px] group-open:rotate-90 transition-transform">chevron_right</span>
									Detail par prospect
								</summary>
								<div class="mt-2 max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg bg-surface-alt/50 border border-border/50">
									{#each logs as log}
										<div class="flex items-center gap-2 text-xs py-0.5">
											<span class="material-symbols-outlined text-[14px] {statusColor(log.status)}">{statusIcon(log.status)}</span>
											<span class="font-medium text-text truncate max-w-[180px]">{log.raison_sociale}</span>
											<span class="text-text-muted">{log.message}</span>
										</div>
									{/each}
								</div>
							</details>
						{/if}

						<div class="flex justify-end pt-3 border-t border-border">
							<button
								type="button"
								onclick={handleDone}
								class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg cursor-pointer shadow-sm transition-colors"
								style="background: #7B6A9A"
							>
								Fermer
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
