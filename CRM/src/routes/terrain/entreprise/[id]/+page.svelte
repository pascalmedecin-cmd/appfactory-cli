<script lang="ts">
	/** Fiche entreprise terrain (lecture seule) + compte-rendu + brouillon contact. */
	import { goto, invalidateAll } from '$app/navigation';
	import MobileShell from '$lib/components/terrain/MobileShell.svelte';
	import NativeActionBar from '$lib/components/terrain/NativeActionBar.svelte';
	import CompteRenduForm from '$lib/components/terrain/CompteRenduForm.svelte';
	import ContactBrouillonForm from '$lib/components/terrain/ContactBrouillonForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		RESULTAT_VISITE_LABELS,
		RESULTAT_VISITE_VARIANT,
		isResultatVisite,
	} from '$lib/types/visit-result';
	import { formatRelativeDate } from '$lib/components/terrain/relative-date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let overlay = $state<'none' | 'compte-rendu' | 'contact'>('none');
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => () => {
		if (toastTimer) clearTimeout(toastTimer);
	});

	function openCR() {
		overlay = 'compte-rendu';
	}
	function openContact() {
		overlay = 'contact';
	}
	function closeOverlay() {
		overlay = 'none';
	}

	async function onCrSaved() {
		overlay = 'none';
		await goto('/terrain');
	}
	async function onContactSaved() {
		overlay = 'none';
		toast = 'Contact à valider au bureau';
		await invalidateAll();
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3000);
	}

	function visitLabel(r: string | null): string {
		return r && isResultatVisite(r) ? RESULTAT_VISITE_LABELS[r] : 'Visite';
	}
</script>

<MobileShell title={data.entreprise.raison_sociale} back backHref="/terrain">
	{#snippet footer()}
		<button type="button" class="cta-cr" onclick={openCR}>
			<Icon name="edit_note" size={20} />
			<span>Compte-rendu de visite</span>
		</button>
	{/snippet}

	<!-- Identité -->
	<div class="ident">
		{#if data.entreprise.secteur_activite}
			<p class="text-base text-[var(--color-text-body)]">{data.entreprise.secteur_activite}</p>
		{/if}
		{#if data.adresseComplete}
			<p class="text-base text-[var(--color-text-muted)]">{data.adresseComplete}</p>
		{/if}
		{#if data.contact}
			<p class="text-base text-[var(--color-text-body)]">
				Contact : {data.contact.nom}{#if data.contact.role} · {data.contact.role}{/if}
			</p>
		{/if}
	</div>

	<!-- 3 actions natives -->
	<div class="actions">
		<NativeActionBar
			telephone={data.nativeData.telephone}
			adresse={data.nativeData.adresse}
			email={data.nativeData.email}
		/>
	</div>

	<!-- Opportunités ouvertes -->
	{#if data.opportunites.length > 0}
		<section class="sec">
			<h2 class="sec-title">Opportunités en cours</h2>
			<ul class="opps">
				{#each data.opportunites as o (o.id)}
					<li class="opp">
						<span class="text-base text-[var(--color-text)] truncate">{o.titre}</span>
						{#if o.etape_pipeline}
							<span class="etape">{o.etape_pipeline}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Historique terrain -->
	{#if data.visits.length > 0}
		<section class="sec">
			<h2 class="sec-title">Historique terrain</h2>
			<ul class="hist">
				{#each data.visits as v (v.id)}
					<li class="hrow">
						<span class="pastille {RESULTAT_VISITE_VARIANT[isResultatVisite(v.resultat) ? v.resultat : 'absent']}"></span>
						<div class="hinfo">
							<span class="text-base text-[var(--color-text-body)]">{visitLabel(v.resultat)}</span>
							{#if v.note}
								<span class="text-base text-[var(--color-text-muted)] truncate block">{v.note}</span>
							{/if}
						</div>
						<span class="meta-technique font-mono text-[15px] text-[var(--color-text-muted)]">
							{formatRelativeDate(v.visited_at ? v.visited_at.slice(0, 10) : null)}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Contact rencontré -->
	<button type="button" class="add-contact" onclick={openContact}>
		<Icon name="add" size={20} />
		<span>Contact rencontré</span>
	</button>
</MobileShell>

{#if overlay === 'compte-rendu'}
	<CompteRenduForm
		entrepriseId={data.entreprise.id}
		raisonSociale={data.entreprise.raison_sociale}
		onClose={closeOverlay}
		onSaved={onCrSaved}
	/>
{:else if overlay === 'contact'}
	<ContactBrouillonForm
		entrepriseId={data.entreprise.id}
		raisonSociale={data.entreprise.raison_sociale}
		onClose={closeOverlay}
		onSaved={onContactSaved}
	/>
{/if}

{#if toast}
	<div class="toast" role="status">{toast}</div>
{/if}

<style>
	.ident {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 16px;
	}
	.actions {
		margin-bottom: 20px;
	}
	.sec {
		margin-bottom: 20px;
	}
	.sec-title {
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text);
		margin: 0 0 8px;
	}
	.opps,
	.hist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.opp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 48px;
		padding: 10px 14px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.etape {
		flex: 0 0 auto;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: capitalize;
	}
	.hrow {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 48px;
		padding: 10px 14px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.pastille {
		flex: 0 0 auto;
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.pastille.success {
		background: var(--color-success);
	}
	.pastille.warning {
		background: var(--color-warning);
	}
	.pastille.danger {
		background: var(--color-danger);
	}
	.pastille.muted {
		background: var(--color-text-muted);
	}
	.hinfo {
		min-width: 0;
		flex: 1 1 auto;
	}
	.add-contact {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 48px;
		padding: 0 16px;
		margin-bottom: 8px;
		color: var(--color-primary);
		font-size: 16px;
		font-weight: 600;
		background: transparent;
	}
	.cta-cr {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		min-height: var(--mobile-cta-h);
		border-radius: var(--radius-lg);
		background: var(--color-primary);
		color: var(--color-text-inverse);
		font-size: 17px;
		font-weight: 600;
	}
	.cta-cr:active {
		background: var(--color-primary-hover);
	}
	.toast {
		position: fixed;
		left: 50%;
		bottom: calc(var(--mobile-tabbar-h) + var(--mobile-safe-bottom) + 16px);
		transform: translateX(-50%);
		z-index: 50;
		max-width: calc(100vw - 32px);
		padding: 12px 18px;
		border-radius: var(--radius-lg);
		background: var(--color-primary-dark);
		color: var(--color-text-inverse);
		font-size: 16px;
		box-shadow: var(--shadow-md);
	}
</style>
