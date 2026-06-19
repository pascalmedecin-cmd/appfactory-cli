<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { config } from '$lib/config';
	import { cantonNoms } from '$lib/prospection-utils';
	import { normalizeNFDTrim } from '$lib/utils/text-normalize';
	import { API_LIMITS } from '$lib/api-limits';
	import { SOURCE_CARDS, type EntrepriseSource } from './source-meta';

	type GoogleQuotaStatus = { used: number; cap: number; remaining: number; exhausted: boolean; warning: string | null };

	let {
		source,
		googleQuota = null,
		pending = false,
		onsearch,
	}: {
		source: EntrepriseSource;
		googleQuota?: GoogleQuotaStatus | null;
		pending?: boolean;
		onsearch?: (body: Record<string, unknown>) => void;
	} = $props();

	const meta = $derived(SOURCE_CARDS[source]);
	const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];

	// État partagé entre sources (le canton choisi survit à un changement de source).
	let canton = $state('GE');
	// search.ch
	let searchchTerm = $state('');
	let searchchVille = $state('');
	// Google Places
	let gpActivity = $state<string>('regies_syndics');
	let gpKeyword = $state('');
	// Zefix
	let zefixName = $state('');

	// Miroir des denylists serveur pour un feedback immédiat (cohérent ImportModal).
	const GP_ACTIVITY_OPTIONS = [
		{ key: 'regies_syndics', label: 'Régies immobilières et syndics de copropriété' },
		{ key: 'facility_management', label: 'Facility management et gestion de bâtiments' },
		{ key: 'bureaux_etudes', label: 'Bureaux d’études énergie et thermique' },
		{ key: 'architectes_designers', label: 'Architectes et architectes d’intérieur' },
		{ key: 'cvc_hvac', label: 'Climatisation, ventilation, CVC / HVAC' },
		{ key: 'entreprises_generales', label: 'Entreprises générales du bâtiment' },
		{ key: 'securite_batiment', label: 'Sécurité du bâtiment (alarme, accès, vidéo)' },
		{ key: 'commerce', label: 'Commerce (magasins, boutiques, vitrines)' },
		{ key: 'other', label: 'Mot-clé libre' },
	] as const;
	const GENERIC_TERMS = new Set([
		'sa', 'sarl', 'sa rl', 'sasu', 'sàrl', 'srl', 'gmbh', 'ag', 'kg', 'ohg',
		'ltd', 'llc', 'inc', 'societe', 'societé', 'company', 'compagnie', 'entreprise', 'firma',
	]);

	// --- Validations (miroir client, le serveur re-valide) ---
	const searchchTrim = $derived(searchchTerm.trim());
	const searchchTooShort = $derived(searchchTrim.length > 0 && searchchTrim.length < 3);
	const searchchGeneric = $derived(searchchTrim.length >= 3 && GENERIC_TERMS.has(normalizeNFDTrim(searchchTrim)));
	const searchchInvalid = $derived(searchchTrim.length < 3 || searchchGeneric);

	const zefixInvalid = $derived(zefixName.trim().length < 2);

	const gpKeywordTrim = $derived(gpKeyword.trim());
	const gpKeywordTooShort = $derived(gpKeywordTrim.length > 0 && gpKeywordTrim.length < 3);
	const gpKeywordGeneric = $derived(gpKeywordTrim.length >= 3 && GENERIC_TERMS.has(normalizeNFDTrim(gpKeywordTrim)));
	const gpRequiresKeyword = $derived(gpActivity === 'other');
	const gpInvalid = $derived(
		gpKeywordTooShort || gpKeywordGeneric || (gpRequiresKeyword && gpKeywordTrim.length < 3) || (googleQuota?.exhausted ?? false),
	);

	const invalid = $derived(
		source === 'search_ch' ? searchchInvalid : source === 'zefix' ? zefixInvalid : gpInvalid,
	);

	const searchchMax = API_LIMITS.search_ch.maxResultsPerQuery;

	function submit() {
		if (invalid || pending) return;
		if (source === 'search_ch') {
			onsearch?.({ term: searchchTrim, canton, ville: searchchVille.trim() || null });
		} else if (source === 'zefix') {
			onsearch?.({ name: zefixName.trim(), canton, activeOnly: true, limit: 100 });
		} else {
			onsearch?.({ activityType: gpActivity, keyword: gpKeywordTrim || null, canton });
		}
	}

	function onFieldKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		}
	}
</script>

<div id="source-fields" class="search-panel rounded-xl border border-border bg-white overflow-hidden">
	<div class="sp-head flex items-center gap-3 px-4 py-3 border-b border-border">
		<span class="mini" style="--c: var({meta.cssVar}); --c-bg: var({meta.bgVar}); --c-deep: var({meta.deepVar});">
			<Icon name={meta.icon} size={17} />
		</span>
		<div class="min-w-0">
			<p class="text-[13.5px] font-bold text-text leading-tight">Recherche {meta.title}</p>
			<p class="text-[12px] text-text-muted leading-tight">
				{#if source === 'zefix'}Au registre du commerce, par nom d’entreprise{:else}{meta.how.charAt(0).toUpperCase() + meta.how.slice(1)} - jusqu’à {source === 'google_places' ? 20 : searchchMax} résultats{/if}
			</p>
		</div>
		<span class="adapt ml-auto hidden sm:inline-flex items-center gap-1.5 text-[11px] text-text-muted bg-surface-alt border border-border rounded-full px-2.5 py-1">
			<Icon name="auto_fix_high" size={12} />Champ adaptatif
		</span>
	</div>

	<!-- ANNUAIRE (search.ch) : activité + canton + ville -->
	{#if source === 'search_ch'}
		<div class="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 px-4 py-4 items-end">
			<div class="field">
				<label for="ssf-term">Activité ou métier <span class="req">*</span></label>
				<div class="inp"><Icon name="search" size={16} class="lead" />
					<input id="ssf-term" type="text" bind:value={searchchTerm} onkeydown={onFieldKeydown}
						placeholder="vitrerie, façade, régie…" class="{searchchInvalid && searchchTrim.length > 0 ? 'err' : ''}" />
				</div>
			</div>
			<div class="field">
				<label for="ssf-canton-sc">Canton <span class="req">*</span></label>
				<select id="ssf-canton-sc" bind:value={canton}>
					{#each cantons as c}<option value={c}>{cantonNoms[c] ?? c} ({c})</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="ssf-ville">Ville / NPA <span class="opt">(option.)</span></label>
				<input id="ssf-ville" type="text" bind:value={searchchVille} onkeydown={onFieldKeydown} maxlength="60" placeholder="Lausanne, 1003…" />
			</div>
			<button type="button" class="btn-search" style="--c: var({meta.cssVar}); --c-deep: var({meta.deepVar});" onclick={submit} disabled={invalid || pending}>
				<Icon name={pending ? 'progress_activity' : 'search'} size={16} class={pending ? 'spin' : ''} />{pending ? 'Recherche…' : 'Rechercher'}
			</button>
		</div>
		{#if searchchTooShort}
			<p class="hint err-text"><Icon name="error" size={12} />Saisir au moins 3 caractères pour économiser le quota.</p>
		{:else if searchchGeneric}
			<p class="hint err-text"><Icon name="error" size={12} />Terme trop générique. Préciser un secteur (vitrerie, façade…).</p>
		{:else}
			<p class="hint"><Icon name="info" size={12} />Recherché dans le nom et l’activité, {searchchMax} résultats max par recherche.</p>
		{/if}

	<!-- REGISTRE (Zefix) : nom + canton -->
	{:else if source === 'zefix'}
		<div class="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 px-4 py-4 items-end">
			<div class="field">
				<label for="ssf-name">Nom de l’entreprise <span class="req">*</span></label>
				<div class="inp"><Icon name="search" size={16} class="lead" />
					<input id="ssf-name" type="text" bind:value={zefixName} onkeydown={onFieldKeydown}
						placeholder="raison sociale, mot-clé…" class="{zefixInvalid && zefixName.length > 0 ? 'err' : ''}" />
				</div>
			</div>
			<div class="field">
				<label for="ssf-canton-zx">Canton <span class="req">*</span></label>
				<select id="ssf-canton-zx" bind:value={canton}>
					{#each cantons as c}<option value={c}>{cantonNoms[c] ?? c} ({c})</option>{/each}
				</select>
			</div>
			<button type="button" class="btn-search" style="--c: var({meta.cssVar}); --c-deep: var({meta.deepVar});" onclick={submit} disabled={invalid || pending}>
				<Icon name={pending ? 'progress_activity' : 'search'} size={16} class={pending ? 'spin' : ''} />{pending ? 'Recherche…' : 'Rechercher'}
			</button>
		</div>
		{#if zefixInvalid && zefixName.length > 0}
			<p class="hint err-text"><Icon name="error" size={12} />Saisir au moins 2 caractères.</p>
		{:else}
			<p class="hint"><Icon name="info" size={12} />Recherche insensible à la casse, fiche légale officielle.</p>
		{/if}

	<!-- GOOGLE : type d'activité + mot-clé + canton -->
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 px-4 py-4 items-end">
			<div class="field">
				<label for="ssf-gp-act">Type d’activité <span class="req">*</span></label>
				<select id="ssf-gp-act" bind:value={gpActivity}>
					{#each GP_ACTIVITY_OPTIONS as o}<option value={o.key}>{o.label}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="ssf-gp-kw">Mot-clé {#if gpRequiresKeyword}<span class="req">*</span>{:else}<span class="opt">(option.)</span>{/if}</label>
				<input id="ssf-gp-kw" type="text" bind:value={gpKeyword} onkeydown={onFieldKeydown} maxlength="80"
					placeholder={gpRequiresKeyword ? 'ex : agencement magasins' : 'ex : ventilation…'}
					class="{(gpKeywordTooShort || gpKeywordGeneric || (gpRequiresKeyword && gpKeywordTrim.length > 0 && gpKeywordTrim.length < 3)) ? 'err' : ''}" />
			</div>
			<div class="field">
				<label for="ssf-canton-gp">Canton <span class="req">*</span></label>
				<select id="ssf-canton-gp" bind:value={canton}>
					{#each cantons as c}<option value={c}>{cantonNoms[c] ?? c} ({c})</option>{/each}
				</select>
			</div>
			<button type="button" class="btn-search" style="--c: var({meta.cssVar}); --c-deep: var({meta.deepVar});" onclick={submit} disabled={invalid || pending}>
				<Icon name={pending ? 'progress_activity' : 'search'} size={16} class={pending ? 'spin' : ''} />{pending ? 'Recherche…' : 'Rechercher'}
			</button>
		</div>
		{#if googleQuota?.exhausted}
			<p class="hint err-text"><Icon name="error" size={12} />Quota mensuel épuisé ({googleQuota.used}/{googleQuota.cap}). Réessayez le mois prochain.</p>
		{:else if gpKeywordTooShort || (gpRequiresKeyword && gpKeywordTrim.length > 0 && gpKeywordTrim.length < 3)}
			<p class="hint err-text"><Icon name="error" size={12} />Mot-clé : au moins 3 caractères.</p>
		{:else if gpKeywordGeneric}
			<p class="hint err-text"><Icon name="error" size={12} />Mot-clé trop générique (forme juridique seule).</p>
		{:else}
			<p class="hint"><Icon name="info" size={12} />1 recherche = 1 crédit du quota (même sans import), 20 résultats max.</p>
		{/if}
	{/if}
</div>

<style>
	.mini {
		width: 30px;
		height: 30px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		background: var(--c-bg);
		color: var(--c-deep);
		flex-shrink: 0;
	}
	.sp-head { background: linear-gradient(180deg, #fff, var(--color-surface-alt)); }
	.field { min-width: 0; }
	.field label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-body);
		margin-bottom: 6px;
	}
	.field .req { color: var(--color-danger-deep); font-weight: 400; }
	.field .opt { color: var(--color-text-muted); font-weight: 400; }
	.field .inp { position: relative; }
	.field :global(.lead) {
		position: absolute;
		left: 11px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.field input,
	.field select {
		width: 100%;
		height: 44px;
		border: 1px solid var(--color-border-input);
		border-radius: 9px;
		background: #fff;
		padding: 0 13px;
		font: inherit;
		font-size: 14px;
		color: var(--color-text);
	}
	.field .inp input { padding-left: 37px; }
	.field input::placeholder { color: #9aa1ab; }
	.field input:focus,
	.field select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 78%);
	}
	.field input.err { border-color: var(--color-danger); }
	.btn-search {
		height: 44px;
		padding: 0 20px;
		border: 0;
		border-radius: 9px;
		background: var(--c);
		color: #fff;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 1px 2px rgba(16, 24, 40, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.18);
		transition: background 0.2s cubic-bezier(0.32, 0.72, 0, 1), transform 0.15s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.btn-search:hover:not(:disabled) { background: var(--c-deep); }
	.btn-search:active:not(:disabled) { transform: scale(0.98); }
	.btn-search:disabled { opacity: 0.5; cursor: not-allowed; }
	.hint {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 0 16px 14px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.hint :global(svg) { color: var(--color-text-muted); flex-shrink: 0; }
	.hint.err-text { color: var(--color-danger-deep); }
	.hint.err-text :global(svg) { color: var(--color-danger-deep); }
	@media (max-width: 767px) {
		.btn-search { width: 100%; justify-content: center; }
	}
	:global(.spin) { animation: ssf-spin 0.9s linear infinite; }
	@keyframes ssf-spin { to { transform: rotate(360deg); } }
</style>
