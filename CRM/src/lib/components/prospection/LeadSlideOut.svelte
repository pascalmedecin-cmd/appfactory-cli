<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import SlideOut from '$lib/components/SlideOut.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import SourcePill from '$lib/components/SourcePill.svelte';
	import { sourceMetaFor } from '$lib/utils/entreprisesFormat';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import VisitsPanel from '$lib/components/VisitsPanel.svelte';
	import { toasts } from '$lib/stores/toast';
	import { calculerScore } from '$lib/scoring';
	import type { Marque } from '$lib/marque';
	import { safeHttpUrl } from '$lib/utils/safe-url';
	import {
		cantonNoms, scoreBadgeVariant,
		statutLabel, statutBadgeVariant, sourceLabel,
	} from '$lib/prospection-utils';
	import CampagneCombo from '$lib/components/prospection/CampagneCombo.svelte';
	import type { CampagneWithCount, Campagne } from '$lib/campagnes';

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

	let { open = $bindable(false), lead = $bindable<Lead | null>(null), importResult = $bindable<{ message: string; type: 'success' | 'error' } | null>(null), leads, premium = false, campagnes = [], campagnesByLead = {}, marque = 'filmpro' }: {
		open: boolean;
		lead: Lead | null;
		importResult: { message: string; type: 'success' | 'error' } | null;
		leads: Lead[];
		premium?: boolean;
		campagnes?: CampagneWithCount[];
		campagnesByLead?: Record<string, Campagne[]>;
		// Atelier 209 : marque de la vue active (toutes les fiches affichées en relèvent). Pilote la
		// ventilation « Secteur » du score comme à l'insert. Défaut 'filmpro' = non-régression.
		marque?: Marque;
	} = $props();

	let enriching = $state(false);

	// Vague 3.2 : étiquettes campagne du lead courant. Resync depuis la donnée serveur à chaque
	// changement de lead OU après invalidateAll (la source de vérité reste `campagnesByLead`).
	let leadCampagneIds = $state<string[]>([]);
	$effect(() => {
		leadCampagneIds = lead ? (campagnesByLead[lead.id] ?? []).map((c) => c.id) : [];
	});

	// Persistance immédiate d'un ajout/retrait d'étiquette (multi-tag, depuis la fiche).
	// Optimiste côté combo ; on resynchronise sur la vérité serveur (succès -> invalidateAll,
	// échec -> revert depuis `campagnesByLead`).
	async function persistCampagne(leadId: string, campagneId: string, op: 'add' | 'remove') {
		try {
			const resp = await fetch('/api/prospection/lead-campagnes', {
				method: op === 'add' ? 'POST' : 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(op === 'add' ? { leadId, campagneIds: [campagneId] } : { leadId, campagneId }),
			});
			if (!resp.ok) {
				const d = await resp.json().catch(() => null);
				toasts.error(d?.error || 'Mise à jour de la campagne impossible');
				leadCampagneIds = (campagnesByLead[leadId] ?? []).map((c) => c.id);
				return;
			}
			await invalidateAll();
		} catch {
			toasts.error('Erreur réseau');
			leadCampagneIds = (campagnesByLead[leadId] ?? []).map((c) => c.id);
		}
	}

	function getScoreDetail(l: Lead) {
		const detail = calculerScore({
			marque,
			canton: l.canton,
			description: l.description,
			raison_sociale: l.raison_sociale,
			secteur_detecte: l.secteur_detecte,
			source: l.source,
			date_publication: l.date_publication,
			telephone: l.telephone,
			montant: l.montant ? Number(l.montant) : null,
		});
		// Bonus Veille appliqué au score stocké mais recalcul client n'a pas accès au signal source.
		// Si le score DB dépasse la somme des critères, on expose le delta en ligne explicite.
		const stored = l.score_pertinence ?? 0;
		const delta = stored - detail.total;
		if (delta > 0) {
			return {
				...detail,
				total: stored,
				criteres: [...detail.criteres, `Signal Veille (+${delta})`],
			};
		}
		return detail;
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
		<div class="space-y-6">
			<!-- Badges statut -->
			<div class="flex flex-wrap items-center gap-2">
				<ScorePill score={lead.score_pertinence} compact />
				<Badge label={statutLabel(lead.statut)} variant={statutBadgeVariant(lead.statut)} dot={true} />
				{#if premium}
					{@const sm = sourceMetaFor(lead.source)}
					{#if sm}
						<SourcePill label={sm.label} variant={sm.variant} />
					{:else}
						<Badge label={sourceLabel(lead.source)} variant="default" />
					{/if}
				{:else}
					<Badge label={sourceLabel(lead.source)} variant="default" />
				{/if}
			</div>

			{#if premium}
				<!-- Vague 3.2 : étiquettes campagne (assigner/retirer à tout moment, même combo que l'import). -->
				<section aria-labelledby="fiche-campagnes-h">
					<h4 id="fiche-campagnes-h" class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 eyebrow">Campagnes</h4>
					<CampagneCombo
						{campagnes}
						bind:selected={leadCampagneIds}
						onAdd={(id) => lead && persistCampagne(lead.id, id, 'add')}
						onRemove={(id) => lead && persistCampagne(lead.id, id, 'remove')}
						placeholder="Étiqueter cette entreprise…"
					/>
				</section>
			{/if}

			<!-- Score detail (remonté juste après les badges) -->
			<div class="p-3 rounded-xl bg-gradient-to-r from-surface-alt to-surface">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-semibold text-text">Scoring détaillé</span>
					<span class="text-xs font-medium px-2 py-1 rounded-full {scoreBadgeVariant(scoreDetail.total) === 'danger' ? 'bg-danger/10 text-danger-deep' : scoreBadgeVariant(scoreDetail.total) === 'warning' ? 'bg-warning/10 text-warning-deep' : 'bg-surface-alt text-text-muted'}">{scoreDetail.total} pts</span>
				</div>
				<div class="space-y-1.5">
					{#each scoreDetail.criteres as critere}
						<div class="flex items-center gap-2 text-xs">
							<Icon name="check_circle" size={14} class="text-success-deep" />
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
				<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 eyebrow">Coordonnées</h4>
				{#if premium}
					<div class="crm-facts">
						<div class="crm-fact crm-fact--wide">
							<div class="crm-fact-k">Adresse</div>
							<div class="crm-fact-v">{[lead.adresse, lead.npa, lead.localite].filter(Boolean).join(', ') || '–'}</div>
						</div>
						<div class="crm-fact">
							<div class="crm-fact-k">Canton</div>
							<div class="crm-fact-v">{lead.canton ? (cantonNoms[lead.canton] ?? lead.canton) : '–'}</div>
						</div>
						<div class="crm-fact">
							<div class="crm-fact-k">Téléphone</div>
							<div class="crm-fact-v">{#if lead.telephone}<a href={`tel:${lead.telephone.replace(/\s/g, '')}`}>{lead.telephone}</a>{:else}–{/if}</div>
						</div>
						<div class="crm-fact">
							<div class="crm-fact-k">Email</div>
							<div class="crm-fact-v">{#if lead.email}<a href={`mailto:${lead.email}`}>{lead.email}</a>{:else}–{/if}</div>
						</div>
						<div class="crm-fact">
							<div class="crm-fact-k">Contact</div>
							<div class="crm-fact-v">{lead.nom_contact ?? '–'}</div>
						</div>
						{#if lead.site_web}
							{@const webHref = safeHttpUrl(lead.site_web)}
							<div class="crm-fact crm-fact--wide">
								<div class="crm-fact-k">Site web</div>
								<div class="crm-fact-v">{#if webHref}<a href={webHref} target="_blank" rel="noopener noreferrer">{lead.site_web}</a>{:else}{lead.site_web}{/if}</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-xs text-text-muted">Adresse</span>
							<p class="font-medium text-text">
								{[lead.adresse, lead.npa, lead.localite].filter(Boolean).join(', ') || '–'}
							</p>
						</div>
						<div>
							<span class="text-xs text-text-muted">Canton</span>
							<p class="font-medium text-text">{lead.canton ? `${cantonNoms[lead.canton] ?? lead.canton}` : '–'}</p>
						</div>
						<div>
							<span class="text-xs text-text-muted">Téléphone</span>
							<p class="font-medium text-text">{lead.telephone ?? '–'}</p>
						</div>
						<div>
							<span class="text-xs text-text-muted">Email</span>
							<p class="font-medium text-text">{lead.email ?? '–'}</p>
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
				{/if}
			</div>

			<!-- Détails métier -->
			{#if lead.secteur_detecte || lead.montant || lead.description}
				<div>
					<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 eyebrow">Détails</h4>
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
				{@const sourceHref = safeHttpUrl(lead.source_url)}
				{#if sourceHref}
					<a
						href={sourceHref}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
					>
						<Icon name="open_in_new" size={16} />
						Voir la source originale
					</a>
				{/if}
			{/if}

			<!-- Photos chantier (V2 mobile F1) -->
			<div class="pt-4 border-t border-border">
				<PhotoGallery leadId={lead.id} {marque} />
			</div>

			<!-- Visites terrain (V2 mobile F2) -->
			<div class="pt-4 border-t border-border">
				<VisitsPanel leadId={lead.id} />
			</div>

			<!-- Enrichissement -->
			{#if !lead.telephone && lead.statut !== 'transfere'}
				<button
					onclick={() => enrichirTelephone(lead!.id)}
					disabled={enriching}
					class="inline-flex items-center gap-2 h-10 px-3 box-border text-sm font-medium text-warning-deep bg-warning-light border border-warning/20 rounded-lg hover:bg-warning-light/80 disabled:opacity-50 cursor-pointer transition-colors"
				>
					<Icon name="phone_forwarded" size={16} />
					{enriching ? 'Recherche en cours…' : 'Enrichir le téléphone (search.ch)'}
				</button>
			{/if}

			<!-- Actions -->
			{#if lead.statut === 'transfere'}
				<div class="flex items-center gap-2 pt-4 border-t border-border text-sm text-success-deep font-medium">
					<Icon name="check_circle" size={18} />
					Ce prospect a été converti en client
				</div>
			{:else if lead.statut === 'ecarte'}
				<!-- Vue « Écartés » : réactiver remet le prospect dans la file de tri (statut vide). -->
				<div class="pt-4 border-t border-border space-y-3">
					<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider eyebrow">Actions</h4>
					<form method="POST" action="?/updateStatut" use:enhance={enhanceStatut('vide', 'Prospect réactivé')}>
						<input type="hidden" name="id" value={lead.id} />
						<input type="hidden" name="statut" value="vide" />
						<button type="submit" class="inline-flex items-center gap-2 h-10 px-4 box-border text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 cursor-pointer transition-colors">
							<Icon name="unarchive" size={16} />
							Réactiver
						</button>
					</form>
				</div>
			{:else}
				<!-- File de tri (statut vide) ou déjà au pipeline (a_contacter). -->
				<div class="pt-4 border-t border-border space-y-3">
					<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider eyebrow">Actions</h4>
					<div class="flex flex-wrap gap-3">
						{#if lead.statut !== 'a_contacter'}
							<form method="POST" action="?/markForContact" use:enhance={() => {
								return async ({ result, update }) => {
									closeAndClear();
									if (result.type === 'success') toasts.success('Prospect ajouté au pipeline (à contacter)');
									else toasts.error('Erreur lors du passage au pipeline');
									await update();
								};
							}}>
								<input type="hidden" name="id" value={lead.id} />
								<button type="submit" class="inline-flex items-center gap-2 h-10 px-4 box-border text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer shadow-sm transition-colors">
									<Icon name="arrow_forward" size={16} />
									À contacter
								</button>
							</form>
						{/if}
						<form method="POST" action="?/updateStatut" use:enhance={enhanceStatut('ecarte', 'Prospect écarté')}>
							<input type="hidden" name="id" value={lead.id} />
							<input type="hidden" name="statut" value="ecarte" />
							<button type="submit" class="inline-flex items-center gap-2 h-10 px-4 box-border text-sm text-text-muted hover:text-text border border-border rounded-lg hover:bg-surface-alt cursor-pointer transition-colors">
								<Icon name="block" size={16} />
								Écarter
							</button>
						</form>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</SlideOut>
