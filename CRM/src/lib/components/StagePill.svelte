<script lang="ts">
	/**
	 * Primitive partagee « pill d'etape pipeline » (refonte Vague 2).
	 * Couleur alignee sur la palette workflow (app.css : prosp-import/enrich/qualify/convert).
	 * Reutilisable : Entreprises (ligne + cards + fiche), puis Pipeline / Signaux en cascade.
	 */
	import type { StageVariant } from '$lib/utils/entreprisesFormat';

	let { label, variant = 'import' }: { label: string; variant?: StageVariant } = $props();
</script>

<span class="stage stage-{variant}">
	<span class="stdot" aria-hidden="true"></span>
	{label}
</span>

<style>
	.stage {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 4px 11px 4px 9px;
		border-radius: var(--radius-full);
		font-size: 12px;
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.stdot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.stage-import {
		background: var(--color-prosp-import-bg);
		color: var(--color-prosp-import-deep);
	}
	.stage-import .stdot {
		background: var(--color-prosp-import);
	}
	.stage-enrich {
		background: var(--color-prosp-enrich-bg);
		color: var(--color-prosp-enrich-deep);
	}
	.stage-enrich .stdot {
		background: var(--color-prosp-enrich);
	}
	.stage-qualify {
		background: var(--color-prosp-qualify-bg);
		color: var(--color-prosp-qualify-deep);
	}
	.stage-qualify .stdot {
		background: var(--color-prosp-qualify);
	}
	.stage-convert {
		background: var(--color-prosp-convert-bg);
		color: var(--color-prosp-convert-deep);
	}
	.stage-convert .stdot {
		background: var(--color-prosp-convert);
	}
</style>
