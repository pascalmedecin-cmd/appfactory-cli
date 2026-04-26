<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/stores/toast';
	import { cantonNoms, sourceLabel } from '$lib/prospection-utils';

	type Recherche = {
		id: string;
		nom: string;
		sources: string[] | null;
		cantons: string[] | null;
		temperatures: string[] | null;
		mots_cles: string[] | null;
		score_minimum: number | null;
		alerte_active: boolean | null;
		frequence_alerte: string | null;
		nb_nouveaux: number | null;
	};

	let {
		open = $bindable(false),
		recherches = [],
		onCharger,
	}: {
		open?: boolean;
		recherches?: Recherche[];
		onCharger?: (r: Recherche) => void;
	} = $props();
</script>

{#if open}
	<div class="p-4 bg-white rounded-xl border border-border shadow-xs space-y-2">
		<div class="flex items-center justify-between mb-1">
			<div class="flex items-center gap-2">
				<Icon name="bookmarks" size={18} class="text-accent" />
				<h3 class="text-sm font-semibold text-text">Mes recherches sauvegardées</h3>
			</div>
			<button onclick={() => open = false} class="text-sm text-text-muted hover:text-text cursor-pointer">Fermer</button>
		</div>
		{#each recherches as rech}
			<div class="flex items-center justify-between p-3 rounded-lg bg-surface-alt/60 border border-border/50 hover:border-accent/20 transition-colors">
				<div class="flex items-center gap-3">
					<button
						onclick={() => onCharger?.(rech)}
						class="text-sm font-semibold text-accent hover:underline cursor-pointer"
					>
						{rech.nom}
					</button>
					<span class="text-xs text-text-muted">
						{[
							rech.sources?.length ? rech.sources.map((s: string) => sourceLabel(s)).join(', ') : null,
							rech.cantons?.length ? rech.cantons.map((c: string) => cantonNoms[c] ?? c).join(', ') : null,
							rech.temperatures?.length ? rech.temperatures.map((t: string) => t === 'chaud' ? 'Chaud' : t === 'tiede' ? 'Tiède' : 'Froid').join(', ') : null,
							rech.mots_cles?.length ? rech.mots_cles.join(', ') : null,
							rech.score_minimum ? `Score ${rech.score_minimum}+` : null,
						].filter(Boolean).join(' · ') || 'Tous les critères'}
					</span>
					{#if rech.alerte_active}
						<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
							<Icon name="notifications" size={12} />
							{rech.frequence_alerte === 'quotidien' ? 'Quotidienne' : 'Hebdomadaire'}
						</span>
					{/if}
					{#if rech.nb_nouveaux && rech.nb_nouveaux > 0}
						<span class="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger font-semibold">{rech.nb_nouveaux} nouveau{rech.nb_nouveaux > 1 ? 'x' : ''}</span>
					{/if}
				</div>
				<form method="POST" action="?/deleteRecherche" use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') toasts.success('Recherche supprimée');
						else toasts.error('Erreur lors de la suppression');
						await update();
					};
				}}>
					<input type="hidden" name="id" value={rech.id} />
					<button type="submit" class="text-text-muted hover:text-danger cursor-pointer transition-colors" title="Supprimer cette recherche">
						<Icon name="delete" size={16} />
					</button>
				</form>
			</div>
		{/each}
	</div>
{/if}
