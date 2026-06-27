<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { SOURCE_CARDS, SOURCE_ORDER, type EntrepriseSource } from './source-meta';

	type GoogleQuotaStatus = { used: number; cap: number; remaining: number; exhausted: boolean; warning: string | null };

	let {
		sources,
		active = $bindable(),
		googleQuota = null,
	}: {
		/** Sources actives (filtrées par flag) à proposer, dans l'ordre canonique. */
		sources: EntrepriseSource[];
		active: EntrepriseSource;
		googleQuota?: GoogleQuotaStatus | null;
	} = $props();

	// Cartes visibles dans l'ordre du golden (Annuaire, Google, Registre), filtrées par `sources`.
	const cards = $derived(SOURCE_ORDER.filter((k) => sources.includes(k)).map((k) => SOURCE_CARDS[k]));

	// La réaction au changement de source (vider les résultats précédents) est gérée par le parent
	// via `bind:active` + un effet : la carte ne fait que pointer la source active.
	function pick(key: EntrepriseSource) {
		active = key;
	}

	// ARIA roving tabindex : flèches + Home/End, wrap circulaire (cohérent ImportModal/ProspectionTabs).
	function onKeydown(e: KeyboardEvent, key: EntrepriseSource) {
		const keys = cards.map((c) => c.key);
		if (keys.length <= 1) return;
		const idx = keys.indexOf(key);
		let next = idx;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % keys.length;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + keys.length) % keys.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = keys.length - 1;
		else return;
		e.preventDefault();
		const target = keys[next];
		pick(target);
		queueMicrotask(() => document.getElementById(`source-card-${target}`)?.focus());
	}
</script>

<div role="tablist" aria-label="Source de recherche" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
	{#each cards as c (c.key)}
		{@const on = active === c.key}
		<button
			type="button"
			role="tab"
			id="source-card-{c.key}"
			aria-selected={on}
			aria-controls="source-fields"
			tabindex={on ? 0 : -1}
			onclick={() => pick(c.key)}
			onkeydown={(e) => onKeydown(e, c.key)}
			class="source-card group relative text-left rounded-2xl border bg-white p-4 cursor-pointer flex flex-col transition-[transform,box-shadow,border-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 {on ? 'is-on' : 'border-border hover:-translate-y-0.5'}"
			style="--c: var({c.cssVar}); --c-bg: var({c.bgVar}); --c-border: var({c.borderVar}); --c-deep: var({c.deepVar}); --tw-ring-color: var({c.cssVar});"
		>
			<span class="accent" aria-hidden="true"></span>
			<span class="check" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>

			<span class="chip"><Icon name={c.icon} size={22} /></span>

			<span class="flex items-center gap-2">
				<span class="text-[15px] font-bold tracking-tight text-text">{c.title}</span>
				<span class="code">{c.code}</span>
			</span>
			<span class="how">{c.how}</span>
			<span class="block mt-1.5 text-[12.5px] leading-snug text-text-muted flex-1">{c.desc}</span>

			<span class="block mt-3">
				<span class="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">Ce que ça ramène</span>
				<span class="flex flex-wrap gap-1.5">
					{#each c.pills as p}
						<span class="pill {p.star ? 'star' : ''}"><Icon name={p.icon} size={12} />{p.label}</span>
					{/each}
				</span>
			</span>

			<span class="cost mt-3 pt-2.5 flex items-center justify-between">
				{#if c.paid}
					{#if googleQuota}
						<span class="quota-pill {googleQuota.exhausted ? 'is-out' : ''}">
							<Icon name="payments" size={12} />
							{#if googleQuota.exhausted}
								<span>Quota épuisé ({googleQuota.used}/{googleQuota.cap})</span>
							{:else}
								<b>{googleQuota.remaining}/{googleQuota.cap}</b><span>restantes ce mois</span>
							{/if}
						</span>
					{:else}
						<span class="quota-pill"><Icon name="payments" size={12} /><span>Gratuit jusqu’à 900/mois</span></span>
					{/if}
				{:else}
					<span class="free"><Icon name="check" size={13} strokeWidth={2.5} />Gratuit</span>
				{/if}
			</span>
		</button>
	{/each}
</div>

<style>
	/* Soft Structuralism : rayons concentriques + ombres diffuses douces, transitions à ressort.
	   Densité contrôlée (p-4, gap-3) : premium sans être aéré. */
	.source-card {
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
	}
	.source-card:hover {
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 28px -14px rgba(16, 24, 40, 0.18);
	}
	.source-card.is-on {
		border-color: transparent;
		box-shadow: 0 2px 4px rgba(16, 24, 40, 0.05), 0 22px 44px -22px rgba(16, 24, 40, 0.22), 0 0 0 2px var(--c) inset;
		transform: translateY(-2px);
	}
	.accent {
		position: absolute;
		top: 0;
		left: 16px;
		right: 16px;
		height: 3px;
		border-radius: 0 0 3px 3px;
		background: var(--c);
		opacity: 0;
		transition: opacity 0.3s var(--ease-smooth);
	}
	.source-card.is-on .accent { opacity: 1; }
	.check {
		position: absolute;
		top: 14px;
		right: 14px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--c);
		color: var(--color-text-inverse);
		opacity: 0;
		transform: scale(0.5);
		transition: opacity 0.3s var(--ease-smooth), transform 0.3s var(--ease-smooth);
	}
	.source-card.is-on .check { opacity: 1; transform: scale(1); }
	.chip {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: var(--c-bg);
		color: var(--c-deep);
		margin-bottom: 12px;
		box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.6);
	}
	.code {
		font-family: 'DM Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--c-deep);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		padding: 2px 7px;
		border-radius: 999px;
	}
	.how {
		margin-top: 3px;
		font-size: 12px;
		font-weight: 600;
		color: var(--c-deep);
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11.5px;
		font-weight: 600;
		color: var(--color-text-body);
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		padding: 3px 9px;
		border-radius: 999px;
	}
	.pill.star {
		color: var(--c-deep);
		background: var(--c-bg);
		border-color: var(--c-border);
	}
	.cost { border-top: 1px solid var(--color-border); }
	.free {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-success-deep);
	}
	.quota-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		font-weight: 600;
		color: var(--c-deep);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		padding: 4px 10px;
		border-radius: 999px;
	}
	.quota-pill b { font-family: 'DM Mono', ui-monospace, monospace; font-weight: 600; }
	.quota-pill.is-out { color: var(--color-danger-deep); background: var(--color-danger-light); border-color: var(--color-danger); }
</style>
