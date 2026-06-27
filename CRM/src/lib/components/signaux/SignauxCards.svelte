<script lang="ts" generics="T extends import('$lib/utils/signauxFormat').SignalLite & { description_projet?: string | null; commune?: string | null; source_officielle?: string | null }">
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ScorePill from '$lib/components/prospection/ScorePill.svelte';
	import {
		formatTypeLabel,
		typeIcon,
		formatRelative,
		statutLabel,
		statutVariant,
		signalAriaLabel,
	} from '$lib/utils/signauxFormat';
	import {
		highlightKeywordsAndSearch,
		dominantKeywordCategory,
		type KeywordRow,
		type KeywordCategorie,
	} from '$lib/scoring/keywords';

	type Props = {
		signaux: T[];
		selectMode?: boolean;
		selectedIds?: Set<string>;
		onSelect: (signal: T) => void;
		onToggleSelect?: (id: string) => void;
		emptyMessage?: string;
		// V2 : si fourni, les mots-clés matchés dans description_projet sont surlignés
		// par catégorie (Cœur / Bonus / Éviter). Échappement HTML natif Svelte (zéro {@html}).
		keywords?: KeywordRow[];
		// V3 (spec § 4 C7) : si fourni, les occurrences du terme dans description_projet
		// sont surlignées en jaune. Prime visuellement sur la catégorie keyword.
		searchTerm?: string;
	};

	let {
		signaux,
		selectMode = false,
		selectedIds = new Set(),
		onSelect,
		onToggleSelect,
		emptyMessage = 'Aucun signal.',
		keywords = [],
		searchTerm = '',
	}: Props = $props();

	function handleClick(signal: T) {
		if (selectMode) {
			onToggleSelect?.(signal.id);
		} else {
			onSelect(signal);
		}
	}

	// V4 (S189) : pour chaque card, calcule la catégorie dominante des mots-clés
	// détectés dans la description (Cœur > Bonus > Éviter > null). Pilote la couleur
	// du bandeau 3px en haut de card, pour identifier la classe d'intérêt à l'œil nu.
	function dominantFor(s: T): KeywordCategorie | null {
		return dominantKeywordCategory(s.description_projet, keywords);
	}
</script>

{#if signaux.length === 0}
	<div class="empty">
		<Icon name="filter_alt_off" size={28} class="empty-icon" />
		<p>{emptyMessage}</p>
	</div>
{:else}
	<div class="cards-grid">
		{#each signaux as signal (signal.id)}
			{@const isSelected = selectedIds.has(signal.id)}
			{@const dom = dominantFor(signal)}
			<button
				type="button"
				class="card-signal"
				class:selected={selectMode && isSelected}
				data-dominant={dom ?? 'neutral'}
				onclick={() => handleClick(signal)}
				aria-label={signalAriaLabel(signal)}
			>
				<span class="card-signal-band" aria-hidden="true"></span>
				<div class="card-signal-head">
					{#if selectMode}
						<span class="card-signal-icon" class:icon-selected={isSelected}>
							<Icon name={isSelected ? 'check' : 'check_box_outline_blank'} size={22} />
						</span>
					{:else}
						<span class="card-signal-icon">
							<Icon name={typeIcon(signal.type_signal)} size={22} />
						</span>
					{/if}
					<div class="card-signal-meta">
						<p class="card-signal-type">{formatTypeLabel(signal.type_signal)}</p>
						<p class="card-signal-when">
							<span>{signal.canton ?? '–'}</span>
							<span class="dot" aria-hidden="true">·</span>
							<span>{formatRelative(signal.date_detection)}</span>
						</p>
					</div>
					<div class="card-signal-status">
						<ScorePill score={signal.score_pertinence} variant="temperature" display="value" compact />
						<Badge label={statutLabel(signal.statut_traitement)} variant={statutVariant(signal.statut_traitement)} />
					</div>
				</div>

				{#if signal.description_projet}
					<p class="card-signal-desc">
						{#if keywords.length > 0 || searchTerm.length > 0}
							{#each highlightKeywordsAndSearch(signal.description_projet, keywords, searchTerm) as chunk}
								{#if chunk.search}
									<mark class="kw-search">{chunk.text}</mark>
								{:else if chunk.cat}
									<mark class="kw-{chunk.cat}">{chunk.text}</mark>
								{:else}
									{chunk.text}
								{/if}
							{/each}
						{:else}
							{signal.description_projet}
						{/if}
					</p>
				{/if}

				<div class="card-signal-footer">
					{#if signal.commune}
						<span class="card-signal-foot-item">
							<Icon name="location_on" size={14} />
							<span>{signal.commune}</span>
						</span>
					{/if}
					{#if signal.source_officielle}
						<span class="card-signal-foot-item">
							<Icon name="source" size={14} />
							<span class="uppercase">{signal.source_officielle}</span>
						</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 16px;
	}
	.empty {
		padding: 64px 32px;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.5;
		display: grid;
		gap: 8px;
		justify-items: center;
	}
	.empty :global(.empty-icon) {
		color: var(--color-text-muted);
		opacity: 0.5;
	}
	.card-signal {
		position: relative;
		background: var(--color-surface);
		border-radius: var(--radius-lg); /* Vague 4b : 12→10px, hiérarchie radius golden (carte < modale) */
		box-shadow: var(--shadow-card);
		/* V4 : padding 16 → 20, gap 16 → 20 — densité texte plus généreuse pour
		   line-clamp 4 (vs 2 en V3). Plus respirable, plus lisible. */
		padding: 20px;
		padding-top: 22px; /* +2px pour le bandeau coloré 3px en haut */
		cursor: pointer;
		transition:
			transform 200ms var(--ease-out-expo),
			box-shadow 200ms var(--ease-out-expo);
		text-align: left;
		border: none;
		font-family: inherit;
		width: 100%;
		display: grid;
		gap: 20px;
		overflow: hidden; /* clip le bandeau dans le border-radius */
	}
	.card-signal:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-card-hover);
	}
	.card-signal:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.card-signal.selected {
		box-shadow: 0 0 0 2px var(--color-primary), 0 8px 20px -12px color-mix(in srgb, var(--color-text) 10%, transparent);
		background: var(--color-primary-light);
	}

	/* V4 (S189) : bandeau coloré 3px en haut de chaque card, pilote par la
	   catégorie dominante des mots-clés détectés. Permet d'identifier la classe
	   d'intérêt d'un signal à l'œil nu (Cœur métier > Bonus > Éviter > neutre)
	   avant même de lire la description. data-dominant est posé côté markup. */
	.card-signal-band {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: transparent;
	}
	.card-signal[data-dominant='coeur'] .card-signal-band {
		background: var(--color-success);
	}
	.card-signal[data-dominant='bonus'] .card-signal-band {
		background: var(--color-primary);
	}
	.card-signal[data-dominant='eviter'] .card-signal-band {
		background: var(--color-danger);
	}
	.card-signal-head {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}
	.card-signal-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		flex-shrink: 0;
		display: grid;
		place-items: center;
		background: var(--color-primary-light);
		color: var(--color-primary);
		border: 1px solid color-mix(in srgb, var(--color-primary) 6%, transparent);
	}
	.card-signal-icon.icon-selected {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
	.card-signal-meta {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.card-signal-type {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
		line-height: 1.25;
	}
	.card-signal-when {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 0;
		display: inline-flex;
		gap: 4px;
		align-items: center;
	}
	.card-signal-when .dot {
		opacity: 0.6;
	}
	.card-signal-status {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-end;
		flex-shrink: 0;
	}
	.card-signal-desc {
		font-size: 14px;
		color: var(--color-text);
		line-height: 1.55;
		margin: 0;
		display: -webkit-box;
		/* V4 (S189) : line-clamp 2 → 4, plus de texte visible directement sur la card
		   (objectif Pascal : « identifier d'un seul coup d'œil sans cliquer »). */
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	/* V3 spec § 4 C7 : highlight jaune des matches de recherche.
	   Prime visuellement sur la catégorie keyword (chunk search rendu sans cat). */
	.card-signal-desc :global(mark.kw-search) {
		background: var(--color-highlight);
		color: inherit;
		padding: 0 2px;
		border-radius: 2px;
	}

	/* V3 option A "underline typo éditorial" (spec § 4 C1-C3) :
	   zéro fond saturé, hiérarchie via typo. */
	.card-signal-desc :global(mark.kw-coeur) {
		background: none;
		color: inherit;
		font-weight: 700;
		text-decoration: underline;
		text-decoration-color: var(--color-success);
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
	}
	.card-signal-desc :global(mark.kw-bonus) {
		background: none;
		color: var(--color-primary);
		font-weight: 500;
	}
	.card-signal-desc :global(mark.kw-eviter) {
		background: none;
		color: var(--color-danger-deep);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
		text-decoration-color: color-mix(in srgb, var(--color-danger) 55%, transparent);
	}
	.card-signal-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		padding-top: 8px;
		border-top: 1px solid var(--color-hairline);
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.card-signal-foot-item {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	.card-signal-foot-item span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.card-signal-foot-item :global(svg) {
		opacity: 0.7;
		flex-shrink: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.card-signal,
		.card-signal:hover {
			transform: none;
			transition: none;
		}
	}
</style>
