<script lang="ts">
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { PageData } from './$types';
	import type { Actionability, Segment } from '$lib/server/intelligence/schema';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		const n = data.editions.length;
		$pageSubtitle =
			n === 0
				? 'Aucune édition'
				: `${n} édition${n > 1 ? 's' : ''} récente${n > 1 ? 's' : ''}`;
	});

	const ACTIONABILITY_LABELS: Record<Actionability, string> = {
		action_directe: 'Action directe',
		veille_active: 'Veille active',
		a_surveiller: 'À surveiller'
	};

	const SEGMENT_LABELS: Record<Segment, string> = {
		tertiaire: 'Tertiaire',
		residentiel: 'Résidentiel',
		commerces: 'Commerces',
		erp: 'ERP',
		partenaires: 'Partenaires'
	};

	const ACTIONABILITY_STYLES: Record<Actionability, string> = {
		action_directe: 'bg-danger-light text-danger border-danger/20',
		veille_active: 'bg-warning-light text-warning border-warning/20',
		a_surveiller: 'bg-surface-alt text-text-muted border-border'
	};

	const SEGMENT_STYLES: Record<Segment, string> = {
		tertiaire: 'bg-prosp-import-bg text-prosp-import border-prosp-import/30',
		residentiel: 'bg-prosp-qualify-bg text-prosp-qualify border-prosp-qualify/30',
		commerces: 'bg-prosp-convert-bg text-prosp-convert border-prosp-convert/30',
		erp: 'bg-prosp-enrich-bg text-prosp-enrich border-prosp-enrich/30',
		partenaires: 'bg-primary/10 text-primary border-primary/20'
	};

	function formatDateLong(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<div class="max-w-[1280px] mx-auto px-4 md:px-10 py-6 md:py-10">
	<header class="mb-8">
		<h1 class="text-2xl md:text-3xl font-bold text-text">Veille FilmPro</h1>
		<p class="text-sm text-text-muted mt-1">Les 3 dernières éditions hebdomadaires</p>
	</header>

	{#if data.editions.length === 0}
		<div class="bg-white rounded-xl border border-border p-10 text-center">
			<span class="material-symbols-outlined text-5xl text-text-muted">radar</span>
			<h2 class="mt-4 text-lg font-semibold text-text">Aucune édition publiée</h2>
			<p class="mt-2 text-sm text-text-muted">
				La veille sectorielle est générée automatiquement chaque vendredi matin.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			{#each data.editions as ed (ed.id)}
				<article
					class="rounded-xl border border-border bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col"
				>
					<header class="p-5 md:p-6 border-b border-border">
						<div class="flex items-center gap-2 text-xs text-text-muted mb-2 flex-wrap">
							<span class="font-semibold text-text">{ed.week_label}</span>
							<span>·</span>
							<span>{formatDateLong(ed.generated_at)}</span>
							<span>·</span>
							<span>{ed.items_total} signal{ed.items_total > 1 ? 's' : ''}</span>
							{#if ed.is_unread}
								<span
									class="ml-auto px-1.5 py-0.5 rounded-full bg-warning text-white text-[10px] font-semibold uppercase tracking-wider"
								>
									Non lu
								</span>
							{/if}
						</div>
						<p class="text-sm text-text-body leading-relaxed line-clamp-4">
							{ed.executive_summary}
						</p>
					</header>

					<div class="p-5 md:p-6 flex-1 flex flex-col gap-3">
						{#if ed.preview.length > 0}
							<h3
								class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1"
							>
								À retenir
							</h3>
							<ul class="space-y-3 flex-1">
								{#each ed.preview as item (item.rank)}
									<li class="flex flex-col gap-1.5">
										<a
											href={`/veille/item/${ed.id}-${item.rank}`}
											class="text-sm font-semibold text-text hover:text-primary transition-colors leading-snug"
										>
											{item.title}
										</a>
										<div class="flex flex-wrap gap-1.5 text-[10px]">
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded-full border font-medium {SEGMENT_STYLES[
													item.segment
												]}"
											>
												{SEGMENT_LABELS[item.segment]}
											</span>
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded-full border font-semibold {ACTIONABILITY_STYLES[
													item.actionability
												]}"
											>
												{ACTIONABILITY_LABELS[item.actionability]}
											</span>
											{#if item.is_update}
												<span
													class="inline-flex items-center px-1.5 py-0.5 rounded-full border font-medium bg-info-light text-info border-info/20"
													title="Mise à jour d'un sujet déjà couvert"
												>
													Mise à jour
												</span>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-text-muted italic flex-1">
								Édition vide cette semaine.
							</p>
						{/if}
					</div>

					<footer class="p-5 md:p-6 border-t border-border bg-surface-alt rounded-b-xl">
						<a
							href={`/veille/${ed.id}`}
							class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
						>
							Lire l'édition complète →
						</a>
					</footer>
				</article>
			{/each}
		</div>
	{/if}
</div>
