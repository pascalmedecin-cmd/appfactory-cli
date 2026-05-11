<script lang="ts" generics="T extends import('$lib/utils/signauxFormat').SignalLite & { description_projet?: string | null; commune?: string | null; source_officielle?: string | null }">
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import {
		formatTypeLabel,
		typeIcon,
		formatRelative,
		scoreStyle,
		statutLabel,
		statutVariant,
		signalAriaLabel,
	} from '$lib/utils/signauxFormat';

	type Props = {
		signaux: T[];
		selectMode?: boolean;
		selectedIds?: Set<string>;
		onSelect: (signal: T) => void;
		onToggleSelect?: (id: string) => void;
		emptyMessage?: string;
	};

	let {
		signaux,
		selectMode = false,
		selectedIds = new Set(),
		onSelect,
		onToggleSelect,
		emptyMessage = 'Aucun signal.',
	}: Props = $props();

	function handleClick(signal: T) {
		if (selectMode) {
			onToggleSelect?.(signal.id);
		} else {
			onSelect(signal);
		}
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
			{@const sStyle = scoreStyle(signal.score_pertinence)}
			{@const isSelected = selectedIds.has(signal.id)}
			<button
				type="button"
				class="card-signal"
				class:selected={selectMode && isSelected}
				onclick={() => handleClick(signal)}
				aria-label={signalAriaLabel(signal)}
			>
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
						<span class="score-pill {sStyle.bgClass} {sStyle.colorClass}" title={`Score ${signal.score_pertinence ?? 0}`}>
							<Icon name={sStyle.icon} size={14} />
							<span class="tabular-nums">{signal.score_pertinence ?? 0}</span>
						</span>
						<Badge label={statutLabel(signal.statut_traitement)} variant={statutVariant(signal.statut_traitement)} />
					</div>
				</div>

				{#if signal.description_projet}
					<p class="card-signal-desc">{signal.description_projet}</p>
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
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		padding: 16px;
		cursor: pointer;
		transition:
			transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
		text-align: left;
		border: none;
		font-family: inherit;
		width: 100%;
		display: grid;
		gap: 16px;
	}
	.card-signal:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-card-active);
	}
	.card-signal:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.card-signal.selected {
		box-shadow: 0 0 0 2px var(--color-primary), 0 8px 20px -12px color-mix(in srgb, var(--color-text) 10%, transparent);
		background: var(--color-primary-light);
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
		border: 1px solid rgba(47, 90, 158, 0.06);
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
	.score-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
	}
	.card-signal-desc {
		font-size: 13px;
		color: var(--color-text);
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.card-signal-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		padding-top: 8px;
		border-top: 1px solid rgba(17, 24, 39, 0.05);
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
