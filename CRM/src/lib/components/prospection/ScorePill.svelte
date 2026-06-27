<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { scoreLabel, scoreToCategory, scoreIcon } from '$lib/prospection-utils';
	import { scoreLabel as scoreTempBucket, clampDisplayScore } from '$lib/utils/signauxFormat';
	import { config } from '$lib/config';

	type Props = {
		score: number | null;
		breakdown?: string;
		compact?: boolean;
		/** 'priority' (défaut, /prospection) : libellé d'action commerciale + icônes flame/target/eye.
		    'temperature' (/signaux) : température Chaud/Tiède/Froid + icônes thermiques. */
		variant?: 'priority' | 'temperature';
		/** 'label' (défaut) : libellé seul. 'value' : score numérique clampé seul (cartes denses, mobile).
		    'full' : « valeur/max : libellé » (fiche détail signal). */
		display?: 'label' | 'value' | 'full';
	};

	let { score, breakdown = '', compact = false, variant = 'priority', display = 'label' }: Props = $props();

	// score=null = lead non encore scoré (lead_express en attente d'enrichissement Zefix).
	// Variante neutre dédiée "Non scoré" avec icône clock — différencie de "Faible signal" (score=0-3 enrichi mais pas chaud).
	const isNull = $derived(score === null);
	const safeScore = $derived(score ?? 0);
	const maxPoints = config.scoring.maxPoints;
	const displayValue = $derived(clampDisplayScore(score, maxPoints));

	// Catégorie visuelle commune aux deux variantes : chaud / tiede / froid / unscored.
	// Audit 360 Bloc D : Signaux convergé sur cette primitive (fin du système saturé
	// `signal-score-pill` à dégradé — anti-pattern golden §6 + échec WCAG AA du texte blanc).
	const rawCategory = $derived(
		isNull ? 'unscored' : variant === 'temperature' ? scoreTempBucket(safeScore) : scoreToCategory(safeScore)
	);
	const category = $derived(rawCategory === 'non_qualifie' ? 'unscored' : rawCategory);

	const TEMP_LABELS: Record<string, string> = {
		chaud: 'Chaud',
		tiede: 'Tiède',
		froid: 'Froid',
		unscored: 'Non qualifié',
	};
	const TEMP_ICONS: Record<string, string> = {
		chaud: 'flame',
		tiede: 'thermostat',
		froid: 'ac_unit',
		unscored: 'remove',
	};

	const label = $derived(
		variant === 'temperature' ? TEMP_LABELS[category] : isNull ? 'Non scoré' : scoreLabel(safeScore)
	);
	const iconName = $derived(
		variant === 'temperature' ? TEMP_ICONS[category] : isNull ? 'schedule' : scoreIcon(safeScore)
	);
	const titleText = $derived(
		breakdown ||
			(isNull && variant === 'priority'
				? "En attente d'enrichissement"
				: `${label} - ${displayValue}/${maxPoints}`)
	);
</script>

<span
	class="score-pill score-pill--{category}"
	class:score-pill--compact={compact}
	title={titleText}
>
	<Icon name={iconName} size={14} />
	{#if display === 'value'}
		<span class="tabular-nums">{displayValue}</span>
	{:else if display === 'full'}
		<span class="tabular-nums">{displayValue}/{maxPoints} : {label}</span>
	{:else}
		<span>{label}</span>
	{/if}
</span>

<style>
	/* PILLS SÉMANTIQUES (pattern Linear Priority).
	   Cohérent avec le mockup notes/refonte-prospection-2026-05-01/mockup-prospection-phase01.html.
	   Variante --compact pour lecture en table dense, sans min-width fixe. */
	.score-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		min-width: 130px;
		height: 26px;
		padding: 0 11px;
		border-radius: var(--radius-sm);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.005em;
		white-space: nowrap;
	}
	.score-pill--compact { min-width: 0; }

	.score-pill :global(svg) {
		stroke-width: 2;
		flex-shrink: 0;
	}

	/* Audit 360 M-27 (cf. H-24 TriageQueue V2c) : couleurs dérivées des tokens
	   système par color-mix (« atténué » pour le fond, « saturé/sombre » pour le
	   texte et l'icône) plutôt qu'en hex codés en dur. */
	.score-pill--chaud {
		background: color-mix(in srgb, var(--color-danger) 7%, white);
		color: color-mix(in srgb, var(--color-danger) 75%, black);
	}
	.score-pill--chaud :global(svg) { stroke: color-mix(in srgb, var(--color-danger) 88%, black); }

	.score-pill--tiede {
		background: color-mix(in srgb, var(--color-warning) 9%, white);
		color: color-mix(in srgb, var(--color-warning) 70%, black);
	}
	.score-pill--tiede :global(svg) { stroke: color-mix(in srgb, var(--color-warning) 90%, black); }

	.score-pill--froid {
		background: var(--color-info-light);
		/* V2.6 audit S160 : valeur tunée WCAG AA (≈ 4.92:1 sur fond info-light).
		   Conservée en hex à dessein — un color-mix ne garantirait pas le ratio. */
		color: #3F4D5F;
	}
	.score-pill--froid :global(svg) { stroke: var(--color-info); }

	/* Variante "Non scoré" : neutre ardoise très pâle, icône clock = en attente d'enrichissement */
	.score-pill--unscored {
		background: var(--color-surface-alt, #F5F7FA);
		color: var(--color-text-muted, #6B7280);
	}
	.score-pill--unscored :global(svg) { stroke: var(--color-text-muted, #6B7280); }
</style>
