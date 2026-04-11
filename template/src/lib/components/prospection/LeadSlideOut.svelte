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

	const cantonNoms: Record<string, string> = {
		GE: 'Genève', VD: 'Vaud', VS: 'Valais', NE: 'Neuchâtel', FR: 'Fribourg', JU: 'Jura'
	};

	function scoreLabel(score: number): string {
		if (score >= scoreLabels.chaud) return 'Chaud';
		if (score >= scoreLabels.tiede) return 'Tiède';
		if (score >= scoreLabels.froid) return 'Froid';
		return 'Faible';
	}

	function scoreBadgeVariant(score: number): 'danger' | 'warning' | 'muted' | 'default' {
		if (score >= scoreLabels.chaud) return 'danger';
		if (score >= scoreLabels.tiede) return 'warning';
		if (score >= scoreLabels.froid) return 'muted';
		return 'default';
	}

	function statutLabel(statut: string): string {
		const labels: Record<string, string> = {
			nouveau: 'Nouveau',
			interesse: 'Intéressé',
			ecarte: 'Écarté',
			transfere: 'Converti',
		};
		return labels[statut] ?? statut;
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
		const labels: Record<string, string> = {
			zefix: 'Registre du commerce',
			simap: 'Marchés publics',
			search_ch: 'Annuaire',
			sitg: 'Géodonnées',
			fosc: 'Feuille officielle',
			manuel: 'Saisie manuelle',
		};
		return labels[s] ?? s;
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
				else toasts.error('Erreur lors de la mise à jour');
				await update();
			};
		};
	}
</script>

<SlideOut bind:open title={lead?.raison_sociale ?? ''}>
	{#if lead}
		{@const scoreDetail = getScoreDetail(lead)}
		<div class="space-y-5">
			<!-- Badges statut -->
			<div class="flex flex-wrap items-center gap-2">
				<Badge label="{scoreLabel(lead.score_pertinence ?? 0)} ({lead.score_pertinence ?? 0}/13)" variant={scoreBadgeVariant(lead.score_pertinence ?? 0)} dot={true} />
				<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
				<Badge label={sourceLabel(lead.source)} variant="default" />
			</div>

			<!-- Score detail (remonté juste après les badges) -->
			<div class="p-3 rounded-xl bg-gradient-to-r from-surface-alt to-surface">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-semibold text-text">Scoring détaillé</span>
					<span class="text-xs font-medium px-2 py-0.5 rounded-full {scoreBadgeVariant(scoreDetail.total) === 'danger' ? 'bg-danger/10 text-danger' : scoreBadgeVariant(scoreDetail.total) === 'warning' ? 'bg-warning/10 text-warning' : 'bg-surface-alt text-text-muted'}">{scoreDetail.total}/13 pts</span>
				</div>
				<div class="space-y-1.5">
					{#each scoreDetail.criteres as critere}
						<div class="flex items-center gap-2 text-xs">
							<span class="material-symbols-outlined text-[14px] text-success">check_circle</span>
							<span class="text-text-body">{critere}</span>
						</div>
					{/each}
					{#if scoreDetail.criteres.length === 0}
						<p class="text-xs text-text-muted">Aucun critère atteint</p>
					{/if}
				</div>
			</div>

			{#if lead.source_id}
				<p class="text-xs text-text-muted">Identifiant source : {lead.source_id}</p>
			{/if}

			<!-- Coordonnées -->
			<div>
				<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Coordonnées</h4>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-xs text-text-muted">Adresse</span>
						<p class="font-medium text-text">
							{[lead.adresse, lead.npa, lead.localite].filter(Boolean).join(', ') || '—'}
						</p>
					</div>
					<div>
						<span class="text-xs text-text-muted">Canton</span>
						<p class="font-medium text-text">{lead.canton ? `${cantonNoms[lead.canton] ?? lead.canton}` : '—'}</p>
					</div>
					<div>
						<span class="text-xs text-text-muted">Téléphone</span>
						<p class="font-medium text-text">{lead.telephone ?? '—'}</p>
					</div>
					<div>
						<span class="text-xs text-text-muted">Email</span>
						<p class="font-medium text-text">{lead.email ?? '—'}</p>
					</div>
					{#if lead.nom_contact}
						<div>
							<span class="text-xs text-text-muted">Contact</span>
							<p class="font-medium text-text">{lead.nom_contact}</p>
						</div>
					{/if}
					{#if lead.site_web}
						<div>
							<span class="text-xs text-text-muted">Site web</span>
							<p class="font-medium text-text">{lead.site_web}</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Détails métier -->
			{#if lead.secteur_detecte || lead.montant || lead.description}
				<div>
					<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Détails</h4>
					<div class="space-y-3 text-sm">
						{#if lead.secteur_detecte}
							<div>
								<span class="text-xs text-text-muted">Secteur détecté</span>
								<p class="font-medium text-text">{lead.secteur_detecte}</p>
							</div>
						{/if}
						{#if lead.montant}
							<div>
								<span class="text-xs text-text-muted">Montant</span>
								<p class="font-medium text-text">{Number(lead.montant).toLocaleString('fr-CH')} CHF</p>
							</div>
						{/if}
						{#if lead.description}
							<div>
								<span class="text-xs text-text-muted">Description / But social</span>
								<p class="text-text-body whitespace-pre-wrap mt-1">{lead.description}</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if lead.source_url}
				<a
					href={lead.source_url}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1.5 text-sm text-accent hover:underline font-medium"
				>
					<span class="material-symbols-outlined text-[16px]">open_in_new</span>
					Voir la source originale
				</a>
			{/if}

			<!-- Enrichissement -->
			{#if !lead.telephone && lead.statut !== 'transfere'}
				<button
					onclick={() => enrichirTelephone(lead!.id)}
					disabled={enriching}
					class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-warning bg-warning-light border border-warning/20 rounded-lg hover:bg-warning-light/80 disabled:opacity-50 cursor-pointer transition-colors"
				>
					<span class="material-symbols-outlined text-[16px]">phone_forwarded</span>
					{enriching ? 'Recherche en cours…' : 'Enrichir le téléphone (search.ch)'}
				</button>
			{/if}

			<!-- Actions -->
			{#if lead.statut !== 'transfere'}
				<div class="pt-4 border-t border-border space-y-3">
					<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</h4>
					<div class="flex flex-wrap gap-3">
						{#if lead.statut !== 'interesse'}
							<form method="POST" action="?/updateStatut" use:enhance={enhanceStatut('interesse', 'Prospect marqué intéressé')}>
								<input type="hidden" name="id" value={lead.id} />
								<input type="hidden" name="statut" value="interesse" />
								<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent/10 cursor-pointer transition-colors">
									<span class="material-symbols-outlined text-[16px]">thumb_up</span>
									Marquer intéressé
								</button>
							</form>
						{/if}
						{#if lead.statut !== 'ecarte'}
							<form method="POST" action="?/updateStatut" use:enhance={enhanceStatut('ecarte', 'Prospect écarté')}>
								<input type="hidden" name="id" value={lead.id} />
								<input type="hidden" name="statut" value="ecarte" />
								<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors">
									<span class="material-symbols-outlined text-[16px]">block</span>
									Écarter
								</button>
							</form>
						{/if}
						<form method="POST" action="?/transferer" use:enhance={() => {
							return async ({ result, update }) => {
								closeAndClear();
								if (result.type === 'success') toasts.success('Prospect converti en entreprise');
								else toasts.error('Erreur lors de la conversion');
								await update();
							};
						}}>
							<input type="hidden" name="id" value={lead.id} />
							<button type="submit" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-lg cursor-pointer shadow-sm transition-colors">
								<span class="material-symbols-outlined text-[16px]">domain_add</span>
								Convertir en entreprise
							</button>
						</form>
					</div>
				</div>
			{:else}
				<div class="flex items-center gap-2 pt-4 border-t border-border text-sm text-success font-medium">
					<span class="material-symbols-outlined text-[18px]">check_circle</span>
					Ce prospect a été converti en entreprise
				</div>
			{/if}
		</div>
	{/if}
</SlideOut>
