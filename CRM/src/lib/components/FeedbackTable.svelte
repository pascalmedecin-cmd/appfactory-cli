<script lang="ts">
	// Spec : notes/page-log-2026-05-13/spec.md § 6.3 + § 6.4 + § 8.
	// Tableau des retours. Mode `admin` : boutons statut + textarea admin_notes mutables.
	// Mode `user` : lecture seule (badge statut uniquement). Click sur ligne = expand inline.
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';
	import Icon from '$lib/components/Icon.svelte';
	import { CRM_BASE } from '$lib/config';
	import {
		TYPE_LABELS,
		SEVERITY_LABELS,
		STATUS_LABELS,
		TYPE_BADGE_CLASSES,
		SEVERITY_BADGE_CLASSES,
		STATUS_BADGE_CLASSES,
		FEEDBACK_STATUSES,
	} from '$lib/feedback/options';
	import type { FeedbackEntry, FeedbackStatus } from '$lib/feedback/types';

	let {
		entries,
		isAdmin,
	}: {
		entries: FeedbackEntry[];
		isAdmin: boolean;
	} = $props();

	let expandedId = $state<string | null>(null);
	let pendingNotes = $state<Record<string, string>>({});

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function relativeDate(iso: string): string {
		const d = new Date(iso);
		const diff = Date.now() - d.getTime();
		const minutes = Math.floor(diff / 60_000);
		if (minutes < 1) return "à l'instant";
		if (minutes < 60) return `il y a ${minutes} min`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `il y a ${hours} h`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `il y a ${days} j`;
		return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
	}

	function fullDate(iso: string): string {
		return new Date(iso).toLocaleString('fr-CH');
	}

	function noteValue(entry: FeedbackEntry): string {
		return pendingNotes[entry.id] ?? entry.admin_notes ?? '';
	}
</script>

{#if entries.length === 0}
	<div class="text-center py-12 text-text-muted">
		<Icon name="inbox" size={32} class="mx-auto mb-3 opacity-60" />
		<p class="text-sm">Aucun retour pour le moment.</p>
	</div>
{:else}
	<div class="feedback-table-wrap">
		<table class="feedback-table w-full text-sm">
			<thead>
				<tr class="text-left text-xs uppercase tracking-wide text-text-muted border-b border-border">
					<th scope="col" class="px-3 py-2">Date</th>
					<th scope="col" class="px-3 py-2 col-type">Type</th>
					<th scope="col" class="px-3 py-2 col-sev">Sévérité</th>
					<th scope="col" class="px-3 py-2 col-page">Page</th>
					<th scope="col" class="px-3 py-2 col-author">Auteur</th>
					<th scope="col" class="px-3 py-2">Description</th>
					<th scope="col" class="px-3 py-2 text-right">Statut</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.id)}
					<tr
						class="border-b border-border hover:bg-surface-secondary/40 cursor-pointer"
						onclick={() => toggleExpand(entry.id)}
					>
						<td class="px-3 py-2 whitespace-nowrap text-text-muted" title={fullDate(entry.created_at)}>
							{relativeDate(entry.created_at)}
						</td>
						<td class="px-3 py-2 col-type">
							<span class="badge {TYPE_BADGE_CLASSES[entry.type]}">{TYPE_LABELS[entry.type]}</span>
						</td>
						<td class="px-3 py-2 col-sev">
							{#if entry.severity}
								<span class="badge {SEVERITY_BADGE_CLASSES[entry.severity]}">{SEVERITY_LABELS[entry.severity]}</span>
							{:else}
								<span class="text-text-muted text-xs">—</span>
							{/if}
						</td>
						<td class="px-3 py-2 col-page text-text-muted text-xs">{entry.page}</td>
						<td class="px-3 py-2 col-author text-text-muted text-xs truncate max-w-[140px]" title={entry.created_by_email}>
							{entry.created_by_email.split('@')[0]}@…
						</td>
						<td class="px-3 py-2 truncate max-w-md">{entry.description}</td>
						<td class="px-3 py-2 text-right">
							<span class="badge {STATUS_BADGE_CLASSES[entry.status]}">{STATUS_LABELS[entry.status]}</span>
						</td>
					</tr>

					{#if expandedId === entry.id}
						<tr class="border-b border-border bg-surface-secondary/30" transition:slide={{ duration: 150 }}>
							<td colspan="7" class="px-4 py-4">
								<div class="space-y-3 text-sm">
									<div>
										<div class="text-xs uppercase tracking-wide text-text-muted mb-1">Description complète</div>
										<p class="whitespace-pre-wrap text-text">{entry.description}</p>
									</div>

									<div>
										<div class="text-xs uppercase tracking-wide text-text-muted mb-1">Contexte technique</div>
										<dl class="grid grid-cols-2 gap-1 text-xs text-text-muted">
											<dt>URL</dt>
											<dd class="truncate" title={entry.context?.url ?? ''}>{entry.context?.url || '—'}</dd>
											<dt>Viewport</dt>
											<dd>{entry.context?.viewport?.w ?? 0} × {entry.context?.viewport?.h ?? 0}</dd>
											<dt>User-Agent</dt>
											<dd class="truncate" title={entry.context?.userAgent ?? ''}>{entry.context?.userAgent || '—'}</dd>
										</dl>
										{#if entry.context?.recentErrors?.length}
											<details class="mt-2">
												<summary class="text-xs text-text-muted cursor-pointer">
													{entry.context.recentErrors.length} erreur(s) JS récente(s)
												</summary>
												<ul class="mt-1 space-y-1 text-xs font-mono">
													{#each entry.context.recentErrors as err}
														<li class="text-danger-deep truncate" title={err.stack ?? err.message}>{err.message}</li>
													{/each}
												</ul>
											</details>
										{/if}
									</div>

									{#if isAdmin}
										<div class="border-t border-border pt-3 space-y-3">
											<div>
												<div class="text-xs uppercase tracking-wide text-text-muted mb-2">Statut</div>
												<div class="flex flex-wrap gap-2">
													{#each FEEDBACK_STATUSES as st}
														<form
															method="POST"
															action={`${CRM_BASE}/log?/updateStatus`}
															use:enhance={() => {
																return async ({ result, update }) => {
																	if (result.type === 'failure') {
																		const msg = (result.data as { error?: string } | undefined)?.error ?? 'Mise à jour impossible.';
																		toasts.error(msg);
																	}
																	await update();
																};
															}}
														>
															<input type="hidden" name="id" value={entry.id} />
															<input type="hidden" name="status" value={st} />
															<button
																type="submit"
																class="px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer
																	{entry.status === st
																		? 'bg-primary text-white border-primary'
																		: 'bg-white text-text border-border hover:border-primary'}"
															>
																{STATUS_LABELS[st as FeedbackStatus]}
															</button>
														</form>
													{/each}
												</div>
											</div>

											<form
												method="POST"
												action={`${CRM_BASE}/log?/updateAdminNotes`}
												use:enhance={() => {
													return async ({ result, update }) => {
														if (result.type === 'success') {
															toasts.success('Note enregistrée');
															expandedId = null;
														} else if (result.type === 'failure') {
															const msg = (result.data as { error?: string } | undefined)?.error ?? 'Mise à jour impossible.';
															toasts.error(msg);
														}
														await update();
													};
												}}
											>
												<input type="hidden" name="id" value={entry.id} />
												<label for="notes-{entry.id}" class="block text-xs uppercase tracking-wide text-text-muted mb-1">
													Note interne (admin uniquement)
												</label>
												<textarea
													id="notes-{entry.id}"
													name="admin_notes"
													value={noteValue(entry)}
													oninput={(e) => (pendingNotes[entry.id] = (e.target as HTMLTextAreaElement).value)}
													rows={2}
													maxlength={2000}
													placeholder="Lien à un audit, à une carte, ou raison du classement..."
													class="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
												></textarea>
												<div class="mt-1 flex justify-end">
													<button
														type="submit"
														class="px-3 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg cursor-pointer"
													>
														Enregistrer la note
													</button>
												</div>
											</form>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.feedback-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		background: white;
	}
	.feedback-table {
		border-collapse: collapse;
	}
	.feedback-table th {
		font-weight: 600;
		background: var(--color-surface-secondary);
	}
	:global(.badge) {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		white-space: nowrap;
	}

	/* Spec § 6.3 : 3 colonnes affichées sur mobile (Type / Description / Statut + date).
	   Ce composant reste utilisé sur la page /log qui elle-même est masquée < 1024px,
	   mais on garde le responsive collapse au cas où il est intégré ailleurs. */
	@media (max-width: 768px) {
		.col-sev,
		.col-page,
		.col-author {
			display: none;
		}
	}
</style>
