<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { toasts } from '$lib/stores/toast';
	import { config } from '$lib/config';
	import { calculerScore } from '$lib/scoring';

	const { labels: scoreLabels } = config.scoring;

	type Lead = {
		id: string;
		raison_sociale: string;
		score_pertinence: number | null;
		statut: string;
		source: string;
		source_id: string | null;
		source_url: string | null;
		adresse: string | null;
		npa: string | null;
		localite: string | null;
		canton: string | null;
		telephone: string | null;
		email: string | null;
		nom_contact: string | null;
		site_web: string | null;
		secteur_detecte: string | null;
		montant: number | string | null;
		description: string | null;
		date_publication: string | null;
	};

	let { open = $bindable(false), lead = $bindable<Lead | null>(null), importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null), leads }: {
		open: boolean;
		lead: Lead | null;
		importResult: { message: string; type: 'success' | 'error' } | null;
		leads: Lead[];
	} = $props();

	let enriching = $state(false);

	function scoreBadgeVariant(score: number): 'danger' | 'warning' | 'muted' | 'default' {
		if (score >= scoreLabels.chaud) return 'danger';
		if (score >= scoreLabels.tiede) return 'warning';
		if (score >= scoreLabels.froid) return 'muted';
		return 'default';
	}

	function statutBadgeVariant(statut: string): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
		switch (statut) {
			case 'nouveau': return 'warning';
			case 'interesse': return 'accent';
			case 'ecarte': return 'muted';
			case 'transfere': return 'success';
			default: return 'default';
		}
	}

	function sourceLabel(s: string): string {
		const configSource = (config.prospection.sources as Record<string, { label: string }>)[s];
		if (configSource) return configSource.label.split(' (')[0];
		const extras: Record<string, string> = { sitg: 'SITG', fosc: 'FOSC', manuel: 'Manuel' };
		return extras[s] ?? s;
	}

	function getScoreDetail(l: Lead) {
		return calculerScore({
			canton: l.canton,
			description: l.description,
			raison_sociale: l.raison_sociale,
			source: l.source,
			date_publication: l.date_publication,
			telephone: l.telephone,
			montant: l.montant ? Number(l.montant) : null,
		});
	}

	async function enrichirTelephone(leadId: string) {
		enriching = true;
		try {
			const resp = await fetch('/api/prospection/search-ch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lead_id: leadId }),
			});
			const result = await resp.json();
			if (resp.ok) {
				importResult = { message: result.message, type: result.telephone ? 'success' : 'error' };
				await invalidateAll();
				if (lead) {
					const updated = leads.find((l) => l.id === lead!.id);
					if (updated) lead = updated;
				}
			} else {
				importResult = { message: result.error || 'Erreur enrichissement', type: 'error' };
			}
		} catch (err) {
			importResult = { message: `Erreur: ${String(err)}`, type: 'error' };
		} finally {
			enriching = false;
		}
	}

	function closeAndClear() {
		open = false;
		lead = null;
	}

	function enhanceStatut(statut: string, successMsg: string) {
		return () => {
			return async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
				closeAndClear();
				if (result.type === 'success') toasts.success(successMsg);
				else toasts.error('Erreur lors de la mise a jour');
				await update();
			};
		};
	}
</script>

<SlideOut bind:open title={lead?.raison_sociale ?? ''}>
	{#if lead}
		{@const scoreDetail = getScoreDetail(lead)}
		<div class="space-y-5">
			<div class="flex items-center gap-2">
				<Badge label={String(lead.score_pertinence ?? 0)} variant={scoreBadgeVariant(lead.score_pertinence ?? 0)} />
				<Badge label={lead.statut} variant={statutBadgeVariant(lead.statut)} />
				<Badge label={sourceLabel(lead.source)} variant="default" />
			</div>

			{#if lead.source_id}
				<p class="text-xs text-text-muted">ID source : {lead.source_id}</p>
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-text-muted">Adresse</span>
					<p class="font-medium text-text">
						{[lead.adresse, lead.npa, lead.localite].filter(Boolean).join(', ') || '—'}
					</p>
				</div>
				<div>
					<span class="text-text-muted">Canton</span>
					<p class="font-medium text-text">{lead.canton ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Telephone</span>
					<p class="font-medium text-text">{lead.telephone ?? '—'}</p>
				</div>
				<div>
					<span class="text-text-muted">Email</span>
					<p class="font-medium text-text">{lead.email ?? '—'}</p>
				</div>
				{#if lead.nom_contact}
					<div>
						<span class="text-text-muted">Contact</span>
						<p class="font-medium text-text">{lead.nom_contact}</p>
					</div>
				{/if}
				{#if lead.site_web}
					<div>
						<span class="text-text-muted">Site web</span>
						<p class="font-medium text-text">{lead.site_web}</p>
					</div>
				{/if}
				{#if lead.secteur_detecte}
					<div>
						<span class="text-text-muted">Secteur</span>
						<p class="font-medium text-text">{lead.secteur_detecte}</p>
					</div>
				{/if}
				{#if lead.montant}
					<div>
						<span class="text-text-muted">Montant</span>
						<p class="font-medium text-text">{Number(lead.montant).toLocaleString('fr-CH')} CHF</p>
					</div>
				{/if}
			</div>

			{#if lead.description}
				<div class="text-sm">
					<span class="text-text-muted">Description</span>
					<p class="text-text whitespace-pre-wrap mt-1">{lead.description}</p>
				</div>
			{/if}

			<!-- Score detail -->
			<div class="text-sm p-3 bg-surface rounded-lg">
				<span class="font-semibold text-text">Scoring ({scoreDetail.total}/13)</span>
				<div class="mt-1 space-y-0.5">
					{#each scoreDetail.criteres as critere}
						<p class="text-text-muted">{critere}</p>
					{/each}
					{#if scoreDetail.criteres.length === 0}
						<p class="text-text-muted">Aucun critere match</p>
					{/if}
				</div>
			</div>

			{#if lead.source_url}
				<a
					href={lead.source_url}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1 text-sm text-accent hover:underline"
				>
					<span class="material-symbols-outlined text-[16px]">open_in_new</span>
					Voir la source
				</a>
			{/if}

			<!-- Enrichissement -->
			{#if !lead.telephone && lead.statut !== 'transfere'}
				<button
					onclick={() => enrichirTelephone(lead!.id)}
					disabled={enriching}
					class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-warning bg-warning-light border border-warning/30 rounded-lg hover:bg-warning-light/80 disabled:opacity-50 cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">phone_forwarded</span>
					{enriching ? 'Recherche...' : 'Enrichir telephone'}
				</button>
			{/if}

			<!-- Actions -->
			{#if lead.statut !== 'transfere'}
				<div class="flex flex-wrap gap-3 pt-4 border-t border-border">
					{#if lead.statut !== 'interesse'}
						<form method="POST" action="?/updateStatut" use:enhance={enhanceStatut('interesse', 'Lead marque interesse')}>
							<input type="hidden" name="id" value={lead.id} />
							<input type="hidden" name="statut" value="interesse" />
							<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent/10 cursor-pointer">
								<span class="material-symbols-outlined text-[16px]">thumb_up</span>
								Interesse
							</button>
						</form>
					{/if}
					{#if lead.statut !== 'ecarte'}
						<form method="POST" action="?/updateStatut" use:enhance={enhanceStatut('ecarte', 'Lead ecarte')}>
							<input type="hidden" name="id" value={lead.id} />
							<input type="hidden" name="statut" value="ecarte" />
							<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer">
								<span class="material-symbols-outlined text-[16px]">block</span>
								Ecarter
							</button>
						</form>
					{/if}
					<form method="POST" action="?/transferer" use:enhance={() => {
						return async ({ result, update }) => {
							closeAndClear();
							if (result.type === 'success') toasts.success('Lead transfere vers le CRM');
							else toasts.error('Erreur lors du transfert');
							await update();
						};
					}}>
						<input type="hidden" name="id" value={lead.id} />
						<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer">
							<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
							Transferer vers CRM
						</button>
					</form>
				</div>
			{:else}
				<div class="flex items-center gap-2 pt-4 border-t border-border text-sm text-success">
					<span class="material-symbols-outlined text-[16px]">check_circle</span>
					Transfere vers le CRM
				</div>
			{/if}
		</div>
	{/if}
</SlideOut>
