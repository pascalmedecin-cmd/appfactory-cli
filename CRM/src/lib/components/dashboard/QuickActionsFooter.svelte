<script lang="ts">
	/**
	 * 4 cards quick actions persistantes : Nouveau contact / Nouvelle entreprise /
	 * Nouvelle opportunité / Voir signaux. Hover translateY(-1px) + shadow primary.
	 *
	 * Aligné golden v9 : footer densifié, identité footer (vs cards principales),
	 * subtil enough pour ne pas concurrencer le KPI vedette.
	 */
	import Icon from '$lib/components/Icon.svelte';

	type Action = {
		href: string;
		icon: string;
		label: string;
		sub: string;
	};

	const actions: Action[] = [
		{ href: '/contacts', icon: 'person_add', label: 'Nouveau contact', sub: 'Saisie rapide' },
		{ href: '/entreprises', icon: 'domain_add', label: 'Nouvelle entreprise', sub: 'Import Zefix' },
		{ href: '/pipeline', icon: 'add_circle', label: 'Nouvelle opportunité', sub: 'Pipeline' },
		{ href: '/signaux', icon: 'radar', label: 'Voir les signaux', sub: 'Marchés et créations' },
	];
</script>

<section aria-labelledby="quick-actions-heading">
	<div class="section-head">
		<div class="section-title-block">
			<div class="section-meta" aria-hidden="true">Actions rapides</div>
			<h2 id="quick-actions-heading" class="sr-only">Actions rapides</h2>
		</div>
	</div>
	<div class="quick-actions">
		{#each actions as action}
			<a class="qa-card" href={action.href}>
				<span class="qa-icon">
					<Icon name={action.icon} size={16} strokeWidth={1.75} />
				</span>
				<div class="qa-text">
					<div class="qa-label">{action.label}</div>
					<div class="qa-sub">{action.sub}</div>
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	.section-head {
		display: flex;
		align-items: end;
		justify-content: space-between;
		margin-bottom: 20px;
		padding-bottom: 4px;
	}
	.section-title-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.section-meta {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-muted);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.quick-actions {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}
	.qa-card {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		padding: 14px 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: var(--color-text);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-text) 5%, transparent);
		transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.qa-card:hover {
		transform: translateY(-1px);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent), 0 8px 16px -8px color-mix(in srgb, var(--color-primary) 18%, transparent);
	}
	.qa-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.qa-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 240ms cubic-bezier(0.16, 1, 0.3, 1), color 240ms ease;
	}
	.qa-card:hover .qa-icon {
		background: var(--color-primary);
		color: white;
	}
	.qa-text { min-width: 0; }
	.qa-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}
	.qa-sub {
		font-size: 11.5px;
		color: var(--color-text-muted);
		margin-top: 2px;
	}

	@media (max-width: 1024px) {
		.quick-actions { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 480px) {
		.quick-actions { grid-template-columns: 1fr; }
	}

	@media (prefers-reduced-motion: reduce) {
		.qa-card, .qa-icon { transition: none; }
		.qa-card:hover { transform: none; }
	}
</style>
