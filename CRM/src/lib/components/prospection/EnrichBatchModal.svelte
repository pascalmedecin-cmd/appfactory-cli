<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { trapFocus } from '$lib/actions/trapFocus';
	import { invalidateAll } from '$app/navigation';
	import { estimateSearchChCost, SEARCH_CH_SAFE_BATCH_SIZE } from '$lib/api-limits';

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

	const searchChEstimate = $derived(estimateSearchChCost(leadIds.length));
	const batchTooLarge = $derived(useSearchCh && leadIds.length > SEARCH_CH_SAFE_BATCH_SIZE);

	// Etats du process
	type Phase = 'config' | 'running' | 'done';
	let phase = $state<Phase>('config');
	let quotaWarning = $state<string | null>(null);
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
		quotaWarning = null;
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
			case 'quota_exceeded':
				quotaWarning = data.message as string;
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
	<!-- Backdrop (clic extérieur désactivé pour éviter perte de saisie) -->
	<div
		class="fixed inset-0 bg-black/30 z-50"
		transition:fade={{ duration: 150 }}
	></div>

	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
		<div
			class="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-labelledby="enrich-modal-title"
			use:trapFocus
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4" style="background: linear-gradient(to right, var(--color-prosp-enrich-bg), var(--color-prosp-import-bg)); border-bottom: 1px solid color-mix(in srgb, var(--color-prosp-import-border), transparent 88%)">
				<div class="flex items-center gap-3">
					<Icon name="auto_fix_high" size={22} class="text-prosp-enrich" />
					<h2 id="enrich-modal-title" class="text-lg font-semibold text-text">Enrichissement batch</h2>
				</div>
				{#if phase !== 'running'}
					<button onclick={close} aria-label="Fermer la fenêtre" class="text-text-muted hover:text-text cursor-pointer">
						<Icon name="close" />
					</button>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
				<!-- Phase config -->
				{#if phase === 'config'}
					<div class="flex items-start gap-3 p-3 rounded-lg bg-prosp-enrich-bg/10 border border-prosp-enrich-border/10">
						<Icon name="info" class="mt-0.5 text-prosp-enrich" />
						<p class="text-sm text-text-body">
							{leadIds.length} prospect{leadIds.length > 1 ? 's' : ''} sélectionné{leadIds.length > 1 ? 's' : ''}. Choisissez les sources d'enrichissement.
						</p>
					</div>

					<div class="space-y-3">
						<p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Sources</p>
						<label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors">
							<input type="checkbox" bind:checked={useSearchCh} class="accent-accent" />
							<Icon name="phone_forwarded" class="text-text-muted" />
							<div>
								<span class="text-sm font-medium text-text">search.ch</span>
								<p class="text-xs text-text-muted">Téléphone, adresse, NPA, localité</p>
							</div>
						</label>
						<label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors">
							<input type="checkbox" bind:checked={useZefix} class="accent-accent" />
							<Icon name="business" class="text-text-muted" />
							<div>
								<span class="text-sm font-medium text-text">Zefix (registre du commerce)</span>
								<p class="text-xs text-text-muted">Adresse, but social, lien source</p>
							</div>
						</label>
					</div>

					{#if useSearchCh}
						{@const pct = searchChEstimate.percentOfMonthly}
						{@const critical = pct >= 95}
						{@const warn = pct >= 50}
						<div class="flex items-start gap-3 p-3 rounded-lg {critical ? 'bg-danger-light border border-danger/20' : warn ? 'bg-warning-light border border-warning/20' : 'bg-surface-alt border border-border'}">
							<Icon name={critical || warn ? 'warning' : 'info'} size={18} class="mt-0.5 {critical ? 'text-danger' : warn ? 'text-warning' : 'text-text-muted'}" />
							<div>
								<p class="text-sm font-medium {critical ? 'text-danger' : warn ? 'text-warning' : 'text-text'}">
									{searchChEstimate.requests} requête{searchChEstimate.requests > 1 ? 's' : ''} search.ch ({pct.toFixed(1)}% du quota mensuel de 1000)
								</p>
								{#if batchTooLarge}
									<p class="text-xs text-text-muted mt-1">Recommandation : enrichir par lots de {SEARCH_CH_SAFE_BATCH_SIZE} maximum.</p>
								{/if}
							</div>
						</div>
					{/if}

					<div class="flex justify-end gap-3 pt-3 border-t border-border">
						<button
							type="button"
							onclick={close}
							class="inline-flex items-center h-10 px-4 box-border text-sm text-text-muted hover:text-text cursor-pointer"
						>
							Annuler
						</button>
						<button
							type="button"
							onclick={start}
							disabled={!useSearchCh && !useZefix}
							class="inline-flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-colors !bg-prosp-enrich"
						>
							<Icon name="play_arrow" size={16} />
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
								<span class="text-sm font-medium text-prosp-enrich">{progress}%</span>
							</div>
							<div class="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-300 bg-prosp-enrich" style="width: {progress}%"
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
								<p class="text-[10px] text-warning font-medium">Non trouvés</p>
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
									<Icon name={statusIcon(log.status)} size={14} class="{statusColor(log.status)}" />
									<span class="font-medium text-text truncate max-w-[180px]">{log.raison_sociale}</span>
									<span class="text-text-muted">{log.message}</span>
								</div>
							{/each}
						</div>

						<div class="flex justify-end pt-2">
							<button
								type="button"
								onclick={() => { abortController?.abort(); }}
								class="inline-flex items-center gap-1.5 h-10 px-4 box-border text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger-light cursor-pointer transition-colors"
							>
								<Icon name="stop" size={16} />
								Annuler
							</button>
						</div>
					</div>
				{/if}

				<!-- Phase done -->
				{#if phase === 'done'}
					<div class="space-y-4">
						<!-- Resume -->
						{#if quotaWarning}
							<div class="flex items-start gap-3 p-3 rounded-lg bg-danger-light border border-danger/20">
								<Icon name="error" size={18} class="mt-0.5 text-danger" />
								<p class="text-sm text-danger font-medium">{quotaWarning}</p>
							</div>
						{/if}

						<div class="p-4 rounded-xl" style="background: linear-gradient(135deg, var(--color-prosp-enrich-bg), var(--color-prosp-import-bg))">
							<div class="flex items-center gap-2 mb-3">
								<Icon name={quotaWarning ? 'warning' : 'task_alt'} size={24} class="{quotaWarning ? 'text-warning' : 'text-success'}" />
								<h3 class="text-base font-semibold text-text">{quotaWarning ? 'Enrichissement interrompu' : 'Enrichissement terminé'}</h3>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex items-center gap-2">
									<Icon name="check_circle" size={16} class="text-success" />
									<span class="text-sm text-text">{enrichedCount} enrichi{enrichedCount > 1 ? 's' : ''}</span>
								</div>
								<div class="flex items-center gap-2">
									<Icon name="verified" size={16} class="text-text-muted" />
									<span class="text-sm text-text">{alreadyCompleteCount} déjà complet{alreadyCompleteCount > 1 ? 's' : ''}</span>
								</div>
								<div class="flex items-center gap-2">
									<Icon name="search_off" size={16} class="text-warning" />
									<span class="text-sm text-text">{notFoundCount} non trouvé{notFoundCount > 1 ? 's' : ''}</span>
								</div>
								{#if errorCount > 0}
									<div class="flex items-center gap-2">
										<Icon name="error" size={16} class="text-danger" />
										<span class="text-sm text-text">{errorCount} erreur{errorCount > 1 ? 's' : ''}</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Log detaille -->
						{#if logs.length > 0}
							<details class="group">
								<summary class="flex items-center gap-1.5 text-sm text-text-muted cursor-pointer hover:text-text">
									<Icon name="chevron_right" size={16} class="group-open:rotate-90 transition-transform" />
									Détail par prospect
								</summary>
								<div class="mt-2 max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg bg-surface-alt/50 border border-border/50">
									{#each logs as log}
										<div class="flex items-center gap-2 text-xs py-0.5">
											<Icon name={statusIcon(log.status)} size={14} class="{statusColor(log.status)}" />
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
								class="inline-flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white rounded-lg cursor-pointer shadow-sm transition-colors !bg-prosp-enrich"
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
