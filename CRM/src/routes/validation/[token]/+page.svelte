<script lang="ts">
	/**
	 * Page PUBLIQUE de validation externe d'une campagne (aucun compte CRM requis). Mockup v3
	 * golden (02/07) : colonne centrée claire, palette sourde, barre de progression MONO bleue,
	 * boutons Garder = sauge / Retirer = ardoise (jamais de rouge en aplat), lignes séparées par
	 * un filet (pas de carte par ligne).
	 *
	 * Parcours (revu 03/07, demande Pascal) : la personne ouvre chaque fiche Google Maps, vérifie
	 * l'adresse et l'activité, puis « Garder » ou « Retirer ». Les prospects décidés RESTENT
	 * affichés (vue « Tous » par défaut) : on peut revenir sur chaque décision à tout moment
	 * (re-clic = annuler, clic sur l'autre bouton = changer d'avis). Le filtre « À vérifier »
	 * reste disponible en option pour retrouver le reste d'une longue liste. Le parcours se
	 * termine par un geste explicite « Envoyer la validation » (POST /confirmer) : le CRM affiche
	 * alors « Validation reçue ». Ce signal est informatif - il ne bloque jamais la campagne ni
	 * les étiquettes - et reste ré-émettable après un changement d'avis (le dernier envoi prime).
	 *
	 * Écritures : POST /api/validation/<token>/decision, optimiste avec rollback ; 410 (lien
	 * expiré/révoqué OU service désactivé pendant la session) bascule la page en état « lien
	 * expiré » ; 409 (prospect retiré par un fondateur entre-temps) retire la carte avec un
	 * message honnête.
	 */
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import FilmProLogo from '$lib/components/portail/FilmProLogo.svelte';
	import { marqueLabel } from '$lib/marque';
	import type { PageData } from './$types';
	import type { ProspectValidation } from './+page.server';

	let { data }: { data: PageData } = $props();

	// Instantané au chargement : chaque visiteur ouvre UN lien et reste dessus (pas de navigation
	// client entre tokens), donc l'état local part de la donnée de load et vit sa vie ensuite.
	// svelte-ignore state_referenced_locally
	let expired = $state(data.state === 'expire');
	// svelte-ignore state_referenced_locally
	let prospects = $state<ProspectValidation[]>([...data.prospects]);
	// « Tous » par défaut : une carte décidée ne disparaît JAMAIS de l'écran (retour en arrière
	// toujours possible d'un coup d'œil). « À vérifier » = filtre opt-in pour les longues listes.
	let filtre = $state<'restants' | 'tous'>('tous');
	let notice = $state<string | null>(null);
	// Confirmation finale : horodatage serveur du dernier « Envoyer la validation » sur ce lien.
	// svelte-ignore state_referenced_locally
	let confirmedAt = $state<string | null>(data.confirmedAt ?? null);
	let confirmBusy = $state(false);
	// Décision modifiée APRÈS un envoi -> proposer « Renvoyer la validation » (le dernier envoi prime).
	let editedSinceConfirm = $state(false);
	const busy = new SvelteSet<string>();

	const disabled = $derived(data.state === 'disabled');
	const total = $derived(prospects.length);
	const garder = $derived(prospects.filter((p) => p.decision === 'garder').length);
	const retirer = $derived(prospects.filter((p) => p.decision === 'retirer').length);
	const verifies = $derived(garder + retirer);
	const restants = $derived(total - verifies);
	const done = $derived(total > 0 && restants === 0);
	const shown = $derived(filtre === 'restants' ? prospects.filter((p) => p.decision === null) : prospects);

	function dateHeure(iso: string): string {
		return new Date(iso).toLocaleString('fr-CH', {
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
	const dateValidite = $derived(data.expiresAt ? dateHeure(data.expiresAt) : null);
	const dateConfirmation = $derived(confirmedAt ? dateHeure(confirmedAt) : null);

	async function decide(p: ProspectValidation, statut: 'garder' | 'retirer') {
		if (busy.has(p.id) || expired) return;
		const next = p.decision === statut ? null : statut; // re-clic = annuler
		const before = p.decision;
		busy.add(p.id);
		notice = null;
		// Optimiste : la carte réagit immédiatement, rollback si le serveur refuse.
		prospects = prospects.map((x) => (x.id === p.id ? { ...x, decision: next } : x));
		try {
			const resp = await fetch(`/api/validation/${page.params.token}/decision`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ leadId: p.id, statut: next }),
			});
			if (resp.ok) {
				if (confirmedAt) editedSinceConfirm = true;
				return;
			}
			if (resp.status === 410) {
				expired = true;
				return;
			}
			if (resp.status === 409) {
				prospects = prospects.filter((x) => x.id !== p.id);
				notice = `« ${p.nom} » a été retiré de la campagne entre-temps.`;
				return;
			}
			prospects = prospects.map((x) => (x.id === p.id ? { ...x, decision: before } : x));
			notice = 'Enregistrement impossible. Réessayez.';
		} catch {
			prospects = prospects.map((x) => (x.id === p.id ? { ...x, decision: before } : x));
			notice = 'Erreur réseau. Vérifiez votre connexion puis réessayez.';
		} finally {
			busy.delete(p.id);
		}
	}

	// Confirmation finale : « Envoyer la validation » -> le CRM affiche « Validation reçue ».
	// Possible même s'il reste des prospects non vérifiés (jamais bloquant), ré-émettable après
	// un changement d'avis. Le serveur fait foi pour l'horodatage.
	async function envoyerValidation() {
		if (confirmBusy || expired || total === 0) return;
		confirmBusy = true;
		notice = null;
		try {
			const resp = await fetch(`/api/validation/${page.params.token}/confirmer`, { method: 'POST' });
			if (resp.ok) {
				const d = await resp.json().catch(() => null);
				// Pas de fallback d'horodatage local : une réponse OK sans confirmedAt n'est PAS une
				// confirmation (ex. redirection avalée) - afficher « envoyé » sans écriture serait un
				// mensonge. Le serveur fait foi, sinon on retombe sur le message d'erreur.
				if (d?.confirmedAt) {
					confirmedAt = d.confirmedAt;
					editedSinceConfirm = false;
					return;
				}
			}
			if (resp.status === 410) {
				expired = true;
				return;
			}
			notice = 'Envoi impossible. Réessayez.';
		} catch {
			notice = 'Erreur réseau. Vérifiez votre connexion puis réessayez.';
		} finally {
			confirmBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Vérification des prospects{data.campagneNom ? ` - ${data.campagneNom}` : ''}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if expired || disabled}
	<div class="val-expired">
		{#if disabled}
			<b>Ce service est momentanément indisponible</b>
			<p>La vérification des prospects est désactivée pour l'instant. Réessayez plus tard ou demandez à la personne qui vous a envoyé ce lien.</p>
		{:else}
			<b>Ce lien n'est plus actif</b>
			<p>Le lien de vérification a expiré ou a été remplacé. Vos choix déjà enregistrés sont conservés. Demandez simplement un nouveau lien à la personne qui vous l'a envoyé.</p>
		{/if}
	</div>
{:else}
	<div class="val-page" data-marque={data.marque}>
		<header class="val-head">
			{#if data.marque === 'led'}
				<img class="val-logo-led" src="/atelier209/ledstudio-magenta.svg" alt="LED Studio" width="103" height="22" />
			{:else}
				<FilmProLogo class="val-logo" />
			{/if}
			<p class="val-kick">Vérification des prospects</p>
			<h1 class="val-title">{data.campagneNom}</h1>
			{#if dateValidite}<p class="val-hsub">Lien actif jusqu'au {dateValidite}.</p>{/if}
		</header>

		<div class="val-body">
			<div class="val-howto">
				<p class="val-howto-t">Comment faire</p>
				<ol>
					<li>Ouvrez la fiche <b>Google Maps</b> du prospect.</li>
					<li>Vérifiez que l'adresse et l'activité correspondent.</li>
					<li>Choisissez <b>Garder</b> ou <b>Retirer</b> - c'est enregistré aussitôt.</li>
					<li>À la fin, cliquez <b>Envoyer la validation</b> en bas de page.</li>
				</ol>
				<p>Vous pouvez changer d'avis à tout moment : re-cliquez sur votre choix pour l'annuler, ou cliquez sur l'autre bouton.</p>
			</div>

			<div class="val-prog" role="status" aria-live="polite">
				<div class="val-prog-top">
					<span class="val-prog-c tabular">{verifies}/{total} vérifié{verifies > 1 ? 's' : ''}</span>
					<span class="val-prog-d tabular">{garder} à garder · {retirer} à retirer</span>
				</div>
				<div class="val-bar" aria-hidden="true">
					<span class="val-bar-fill" style="width: {total ? (verifies / total) * 100 : 0}%"></span>
				</div>
				<div class="val-filtres" role="group" aria-label="Filtrer les prospects">
					<button type="button" class="vf" class:on={filtre === 'tous'} onclick={() => (filtre = 'tous')}>
						Tous <span class="vf-n tabular">{total}</span>
					</button>
					<button type="button" class="vf" class:on={filtre === 'restants'} onclick={() => (filtre = 'restants')}>
						À vérifier <span class="vf-n tabular">{restants}</span>
					</button>
				</div>
			</div>

			{#if data.truncated}
				<p class="val-hint-line">Cette campagne dépasse la taille affichable ici : seuls les {total} premiers prospects sont listés.</p>
			{/if}

			{#if notice}
				<p class="val-notice" role="alert">{notice}</p>
			{/if}

			{#if done && (!confirmedAt || editedSinceConfirm)}
				<p class="val-done">Tout est vérifié - terminez en cliquant « Envoyer la validation » en bas de page.</p>
			{/if}

			{#if shown.length === 0 && !done}
				<p class="val-empty">
					{filtre === 'restants' ? 'Aucun prospect restant dans cette vue.' : 'Aucun prospect dans cette campagne.'}
				</p>
			{/if}

			<div class="val-list">
				{#each shown as p (p.id)}
					<div class="val-row">
						<p class="val-nom">
							{p.nom}
							{#if p.decision === 'garder'}<span class="flag g">À garder</span>
							{:else if p.decision === 'retirer'}<span class="flag r">À retirer</span>{/if}
						</p>
						{#if p.adresse}<p class="val-adr">{p.adresse}</p>{/if}
						{#if p.mapsUrl}
							<a class="val-maps" href={p.mapsUrl} target="_blank" rel="noopener noreferrer">
								<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
								Ouvrir sur Google Maps
							</a>
						{:else}
							<span class="val-maps-none">Pas de fiche Google - vérifiez l'adresse.</span>
						{/if}
						<div class="val-acts" role="group" aria-label={`Décision pour ${p.nom}`}>
							<button
								type="button"
								class="val-btn g-h"
								class:g-on={p.decision === 'garder'}
								disabled={busy.has(p.id)}
								aria-pressed={p.decision === 'garder'}
								onclick={() => decide(p, 'garder')}
							>
								<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
								Garder
							</button>
							<button
								type="button"
								class="val-btn r-h"
								class:r-on={p.decision === 'retirer'}
								disabled={busy.has(p.id)}
								aria-pressed={p.decision === 'retirer'}
								onclick={() => decide(p, 'retirer')}
							>
								<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
								Retirer
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Confirmation finale : geste explicite, jamais bloquant, ré-émettable après correction. -->
			<div class="val-send">
				{#if confirmedAt && !editedSinceConfirm}
					<p class="val-sent" role="status">
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
						Validation envoyée le {dateConfirmation} - merci, l'équipe {marqueLabel(data.marque)} est prévenue.
					</p>
					<p class="val-send-hint">Un changement d'avis ? Modifiez vos choix ci-dessus puis renvoyez la validation : le dernier envoi remplace le précédent.</p>
				{:else}
					{#if editedSinceConfirm}
						<p class="val-send-hint">Vous avez modifié des choix depuis votre dernier envoi : renvoyez la validation pour les transmettre.</p>
					{:else if restants > 0}
						<p class="val-send-hint">
							Il reste {restants} prospect{restants > 1 ? 's' : ''} à vérifier. Vous pouvez déjà envoyer : vos choix restent modifiables tant que le lien est actif.
						</p>
					{:else if total > 0}
						<p class="val-send-hint">Tout est vérifié : envoyez votre validation pour prévenir l'équipe {marqueLabel(data.marque)}.</p>
					{/if}
					<button type="button" class="val-confirm" disabled={confirmBusy || total === 0} onclick={envoyerValidation}>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
						{confirmBusy ? 'Envoi…' : confirmedAt ? 'Renvoyer la validation' : 'Envoyer la validation'}
					</button>
				{/if}
			</div>

			<p class="val-foot">{marqueLabel(data.marque)} · page de vérification sécurisée</p>
		</div>
	</div>
{/if}

<style>
	/* Page autonome (hors chrome CRM) : colonne centrée claire, tokens app.css, palette sourde. */
	:global(body) {
		background: var(--color-surface-alt);
	}

	/* ===== Colonne centrée claire (mockup v3) : une seule carte, tout dedans. ===== */
	.val-page {
		max-width: 640px;
		margin: 24px auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl, 12px);
		overflow: hidden;
		font-family: var(--font-sans, system-ui, sans-serif);
		color: var(--color-text);
	}

	.val-head {
		padding: 24px;
		border-bottom: 1px solid var(--color-border);
	}
	.val-head :global(.val-logo) {
		height: 22px;
		width: auto;
		display: block;
	}
	/* Logo LED (asset magenta, fond clair) : même gabarit que le wordmark FilmPro. */
	.val-logo-led {
		height: 22px;
		width: auto;
		display: block;
	}

	/* Atelier 209 : teinte LED de cette page PUBLIQUE autonome (hors .crm-shell, donc les overrides
	   de app.css ne s'y appliquent pas). Miroir exact des tokens .crm-shell[data-marque='led'] :
	   l'accent primaire (barre de progression, bouton « Envoyer », anneaux de focus) passe au
	   magenta. Garder/Retirer restent sauge/ardoise (prosp-convert/info, inchangés). */
	.val-page[data-marque='led'] {
		--color-primary: #c6007e;
		--color-primary-hover: #a80069;
		--color-primary-light: #fde9f4;
		--color-primary-dark: #01003b;
	}
	.val-kick {
		margin: 16px 0 4px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.val-title {
		margin: 0;
		font-size: 22px;
		line-height: 1.2;
		font-weight: 600;
		color: var(--color-text);
	}
	.val-hsub {
		margin: 6px 0 0;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.val-body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* Mode d'emploi : texte, PAS une carte. */
	.val-howto-t {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.val-howto ol {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 14px;
		color: var(--color-text-body);
	}
	.val-howto p {
		margin: 12px 0 0;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	/* Progression collante, filets fins (pas une carte), barre MONO bleue. */
	.val-prog {
		position: sticky;
		top: 8px;
		z-index: 5;
		background: var(--color-surface);
		padding: 12px 0;
		border-top: 1px solid var(--color-hairline);
		border-bottom: 1px solid var(--color-hairline);
	}
	.val-prog-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
	}
	.val-prog-c {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
	}
	.val-prog-d {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.val-bar {
		height: 8px;
		margin-top: 8px;
		border-radius: var(--radius-full, 999px);
		background: var(--color-surface-alt);
		overflow: hidden;
	}
	.val-bar-fill {
		display: block;
		height: 100%;
		background: var(--color-primary);
		transition: width 260ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.val-filtres {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	.vf {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-full, 999px);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 140ms ease, color 140ms ease;
	}
	.vf.on {
		background: var(--color-surface-alt);
		color: var(--color-text);
		border-color: var(--color-border);
	}
	.vf-n {
		display: inline-grid;
		place-items: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: var(--radius-full, 999px);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-size: 11px;
		font-weight: 700;
	}
	.vf.on .vf-n {
		background: var(--color-surface);
	}
	.vf:focus-visible,
	.val-btn:focus-visible,
	.val-maps:focus-visible,
	.val-confirm:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.val-hint-line {
		margin: 0;
		font-size: 12.5px;
		color: var(--color-text-muted);
	}
	.val-notice {
		margin: 0;
		padding: 10px 14px;
		border: 1px solid color-mix(in srgb, var(--color-warning) 40%, var(--color-border));
		background: var(--color-warning-light);
		border-radius: var(--radius-lg, 10px);
		font-size: 13px;
		color: var(--color-warning-deep);
	}
	.val-done {
		margin: 0;
		padding: 12px 14px;
		border: 1px solid color-mix(in srgb, var(--color-prosp-convert) 40%, var(--color-border));
		background: var(--color-success-light);
		border-radius: var(--radius-lg, 10px);
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-prosp-convert);
	}
	.val-empty {
		margin: 0;
		font-size: 13.5px;
		color: var(--color-text-muted);
		text-align: center;
	}

	/* ===== Liste : lignes séparées par un filet (pas de carte, pas de liseré, pas de fond teinté). ===== */
	.val-list {
		display: flex;
		flex-direction: column;
	}
	.val-row {
		padding: 20px 0;
		border-bottom: 1px solid var(--color-hairline);
	}
	.val-row:first-child {
		padding-top: 4px;
	}
	.val-row:last-child {
		border-bottom: none;
	}
	.val-nom {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
	}
	.flag {
		font-size: 12px;
		font-weight: 600;
		margin-left: 8px;
	}
	.flag.g {
		color: var(--color-prosp-convert);
	}
	.flag.r {
		color: var(--color-info);
	}
	.val-adr {
		margin: 4px 0 0;
		font-size: 14px;
		color: var(--color-text-muted);
	}
	/* Lien Maps : pill surface, texte primary. */
	.val-maps {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-top: 12px;
		min-height: 44px;
		padding: 0 16px;
		border-radius: var(--radius-full, 999px);
		background: var(--color-surface-alt);
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
		transition: background 140ms ease;
	}
	.val-maps:hover {
		background: color-mix(in srgb, var(--color-surface-alt) 60%, var(--color-border));
	}
	.val-maps-none {
		display: inline-block;
		margin-top: 12px;
		font-size: 13px;
		font-style: italic;
		color: var(--color-text-muted);
	}

	/* ===== Boutons Garder / Retirer : 44px, sourds (sauge / ardoise), JAMAIS de rouge. ===== */
	.val-acts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 16px;
	}
	.val-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		border-radius: var(--radius-lg, 10px);
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-body);
		cursor: pointer;
		transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 90ms ease;
	}
	.val-btn:active:not(:disabled) {
		transform: scale(0.99);
	}
	.val-btn:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.val-btn.g-h:hover:not(:disabled):not(.g-on) {
		border-color: var(--color-prosp-convert);
		color: var(--color-prosp-convert);
	}
	.val-btn.r-h:hover:not(:disabled):not(.r-on) {
		border-color: var(--color-info);
		color: var(--color-info);
	}
	.val-btn.g-on {
		background: var(--color-prosp-convert);
		border-color: var(--color-prosp-convert);
		color: #fff;
	}
	.val-btn.r-on {
		background: var(--color-info);
		border-color: var(--color-info);
		color: #fff;
	}

	/* ===== Confirmation finale : filet au-dessus, bouton primaire plein, état « envoyé » vert. ===== */
	.val-send {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-top: 20px;
		border-top: 1px solid var(--color-hairline);
	}
	.val-sent {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 12px 14px;
		border: 1px solid color-mix(in srgb, var(--color-prosp-convert) 40%, var(--color-border));
		background: var(--color-success-light);
		border-radius: var(--radius-lg, 10px);
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-prosp-convert);
	}
	.val-sent svg {
		flex-shrink: 0;
	}
	.val-send-hint {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.val-confirm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 48px;
		border: none;
		border-radius: var(--radius-lg, 10px);
		background: var(--color-primary);
		font-size: 15px;
		font-weight: 600;
		color: #fff;
		cursor: pointer;
		transition: filter 140ms ease, transform 90ms ease;
	}
	.val-confirm:hover:not(:disabled) {
		filter: brightness(1.06);
	}
	.val-confirm:active:not(:disabled) {
		transform: scale(0.99);
	}
	.val-confirm:disabled {
		opacity: 0.55;
		cursor: default;
	}

	.val-foot {
		margin: 12px 0 0;
		text-align: center;
		font-size: 11px;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}

	/* ===== État « lien expiré / service désactivé » : boîte claire centrée. ===== */
	.val-expired {
		max-width: 640px;
		margin: 24px auto;
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl, 12px);
		padding: 24px;
		font-family: var(--font-sans, system-ui, sans-serif);
	}
	.val-expired b {
		display: block;
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 6px;
		color: var(--color-text);
	}
	.val-expired p {
		margin: 0;
		font-size: 14px;
		color: var(--color-text-body);
	}

	@media (max-width: 520px) {
		.val-acts {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
