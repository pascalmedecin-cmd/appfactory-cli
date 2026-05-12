<!--
	Rendu d'un bloc de contenu d'aide (dispatch sur `block.type`).

	Tous les textes viennent de `aideContent` (statique, pas d'input utilisateur) : aucun `{@html}`.
	Couleurs et espacements via tokens (GOLDEN). Pas de bordure pointillée, pas de gradient.
-->
<script lang="ts">
	import type { AideBlock } from '$lib/aide/content';
	import Icon from '$lib/components/Icon.svelte';
	import AideChecklist from './AideChecklist.svelte';
	import AideDiagram from './AideDiagram.svelte';

	let { block }: { block: AideBlock } = $props();

	const calloutMeta = {
		tip: { icon: 'lightbulb', cls: 'callout-tip' as const },
		warning: { icon: 'warning', cls: 'callout-warning' as const },
		note: { icon: 'info', cls: 'callout-note' as const }
	};
</script>

{#if block.type === 'paragraph'}
	<p class="aide-p">{block.text}</p>

{:else if block.type === 'list'}
	{#if block.ordered}
		<ol class="aide-list aide-list-ol">
			{#each block.items as item}<li>{item}</li>{/each}
		</ol>
	{:else}
		<ul class="aide-list">
			{#each block.items as item}<li>{item}</li>{/each}
		</ul>
	{/if}

{:else if block.type === 'steps'}
	<AideChecklist id={block.id} intro={block.intro} items={block.items} />

{:else if block.type === 'table'}
	<div class="aide-table-wrap">
		<table class="aide-table">
			<thead>
				<tr>{#each block.head as h}<th>{h}</th>{/each}</tr>
			</thead>
			<tbody>
				{#each block.rows as row}
					<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if block.caption}<p class="aide-caption">{block.caption}</p>{/if}

{:else if block.type === 'callout'}
	{@const meta = calloutMeta[block.tone]}
	<aside class="aide-callout {meta.cls}">
		<span class="aide-callout-icon"><Icon name={meta.icon} size={18} strokeWidth={2} /></span>
		<div class="aide-callout-body">
			<p class="aide-callout-title">{block.title}</p>
			<p class="aide-callout-text">{block.text}</p>
		</div>
	</aside>

{:else if block.type === 'code'}
	{#if block.caption}<p class="aide-caption">{block.caption}</p>{/if}
	<pre class="aide-code"><code>{block.code}</code></pre>

{:else if block.type === 'diagram'}
	<AideDiagram name={block.name} caption={block.caption} />

{:else if block.type === 'link'}
	{#if block.link.external}
		<a class="aide-link" href={block.link.href} target="_blank" rel="noopener noreferrer">
			<Icon name="open_in_new" size={16} strokeWidth={2} />
			<span>{block.link.label}</span>
		</a>
	{:else}
		<a class="aide-link" href={block.link.href}>
			<Icon name="arrow_forward" size={16} strokeWidth={2} />
			<span>{block.link.label}</span>
		</a>
	{/if}
{/if}

<style>
	.aide-p {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text-body);
		margin: 0 0 12px;
	}
	.aide-p:last-child {
		margin-bottom: 0;
	}

	.aide-list {
		margin: 0 0 12px;
		padding-left: 24px;
		list-style: disc;
	}
	.aide-list-ol {
		list-style: decimal;
	}
	.aide-list li {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text-body);
		margin-bottom: 8px;
	}
	.aide-list li::marker {
		color: var(--color-text-muted);
	}

	.aide-table-wrap {
		overflow-x: auto;
		margin: 0 0 8px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.aide-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	.aide-table th {
		text-align: left;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		background: var(--color-surface-alt);
		padding: 12px 16px;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
	.aide-table td {
		padding: 12px 16px;
		color: var(--color-text-body);
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
		line-height: 1.5;
	}
	.aide-table tbody tr:last-child td {
		border-bottom: none;
	}
	.aide-table tbody tr:hover {
		background: var(--color-surface-alt);
	}

	.aide-caption {
		font-size: 12px;
		line-height: 1.33;
		color: var(--color-text-muted);
		margin: 0 0 12px;
	}

	.aide-callout {
		display: flex;
		gap: 12px;
		padding: 12px 16px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		margin: 0 0 12px;
		align-items: flex-start;
	}
	.aide-callout-icon {
		flex-shrink: 0;
		display: inline-flex;
		margin-top: 1px;
	}
	.aide-callout-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 2px;
	}
	.aide-callout-text {
		font-size: 14px;
		line-height: 1.55;
		color: var(--color-text-body);
		margin: 0;
	}
	.callout-tip {
		background: var(--color-success-light);
		border-color: color-mix(in srgb, var(--color-success) 28%, var(--color-border));
	}
	.callout-tip .aide-callout-icon {
		color: var(--color-success);
	}
	.callout-warning {
		background: var(--color-warning-light);
		border-color: color-mix(in srgb, var(--color-warning) 32%, var(--color-border));
	}
	.callout-warning .aide-callout-icon {
		color: var(--color-warning);
	}
	.callout-note {
		background: var(--color-info-light);
		border-color: color-mix(in srgb, var(--color-info) 28%, var(--color-border));
	}
	.callout-note .aide-callout-icon {
		color: var(--color-info);
	}

	.aide-code {
		background: var(--color-primary-dark);
		color: var(--color-text-inverse);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: 0 0 12px;
	}
	.aide-code code {
		font-family: inherit;
	}

	.aide-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		margin: 0 8px 12px 0;
		transition: border-color 180ms var(--ease-out-expo), background 180ms var(--ease-out-expo);
	}
	.aide-link:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
	}
</style>
