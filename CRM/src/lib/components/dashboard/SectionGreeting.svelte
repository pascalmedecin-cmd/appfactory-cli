<script lang="ts">
	/**
	 * Hero greeting personnalisé : kicker date+heure pulsing, h1 « Bonjour {firstName} »
	 * avec gradient text sur le prénom, summary 1-ligne contextuelle selon counts.
	 *
	 * Identité éditoriale : « inbox du matin du fondateur ».
	 */
	import { onMount, onDestroy } from 'svelte';

	type Props = {
		firstName: string | null;
		triageTotal: number;
		signauxCount: number;
		relancesCount: number;
	};

	let { firstName, triageTotal, signauxCount, relancesCount }: Props = $props();

	let now = $state(new Date());
	let intervalId: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		intervalId = setInterval(() => { now = new Date(); }, 60_000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const dateLabel = $derived(
		now.toLocaleDateString('fr-CH', { weekday: 'long', day: '2-digit', month: 'long' })
	);
	const timeLabel = $derived(
		now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })
	);

	const greeting = $derived(firstName ? `Bonjour ${firstName}.` : 'Bonjour.');
	const total = $derived(triageTotal + signauxCount + relancesCount);
	const tail = $derived(total <= 5 ? 'Le reste peut attendre.' : "Concentre-toi sur l'essentiel.");
</script>

<section class="hero">
	<div class="hero-meta">
		<span class="kicker">
			<span class="dot" aria-hidden="true"></span>
			<span class="kicker-text">{dateLabel} · {timeLabel}</span>
		</span>
	</div>
	<h2 class="hero-h1">
		{#if firstName}
			Bonjour <span class="name">{firstName}</span>.
		{:else}
			{greeting}
		{/if}
	</h2>
	<p class="hero-summary">
		<strong>{triageTotal} {triageTotal === 1 ? 'lead prioritaire' : 'leads prioritaires'}</strong> à trier ce matin,
		<strong>{signauxCount} {signauxCount === 1 ? 'marché' : 'marchés'}</strong>,
		<strong>{relancesCount} {relancesCount === 1 ? 'relance' : 'relances'}</strong>.
		{tail}
	</p>
</section>

<style>
	.hero {
		margin-bottom: 56px;
	}
	.hero-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}
	/* Audit 360 V2c H-30 : échelle éditoriale dashboard (24/40/56/76), cf. GOLDEN_STANDARD § 3.3. */
	.hero-h1 {
		font-size: 40px;
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.05;
		color: var(--color-primary-dark);
		margin: 0 0 12px;
	}
	/* Audit 360 V2c H-25 : prénom en aplat primary (pas de gradient text, cf. GOLDEN § 6). */
	.hero-h1 .name {
		color: var(--color-primary);
	}
	.hero-summary {
		font-size: 17px;
		line-height: 1.65;
		color: var(--color-text-body);
		max-width: 660px;
		margin: 0;
	}
	.hero-summary strong {
		color: var(--color-text);
		font-weight: 600;
	}

	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-text-muted);
	}
	.kicker-text { text-transform: capitalize; }
	.kicker .dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--color-success);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 15%, transparent);
		animation: pulse 2.4s var(--ease-out-expo) infinite;
	}
	@keyframes pulse {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.2); opacity: 0.8; }
	}

	@media (max-width: 768px) {
		.hero { margin-bottom: 32px; }
		.hero-h1 { font-size: 32px; }
		.hero-summary { font-size: 15px; }
	}

	@media (prefers-reduced-motion: reduce) {
		.kicker .dot { animation: none; }
	}
</style>
