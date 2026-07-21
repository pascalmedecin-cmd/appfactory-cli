<!--
  Connexion Atelier 209 - direction « Heure bleue » (validée Pascal 2026-07-15).
  Bandeau photo (néon + Jet d'Eau) via AtelierShell, contenu centré sans cadre.
  Flux OTP réel en 2 étapes : email -> code. L'étape 2 reste « pending » (désactivée)
  tant que le code n'a pas été envoyé, puis prend le focus. Copy de domaine neutralisée
  (le domaine autorisé est piloté par ALLOWED_DOMAINS, pas codé en dur ici).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import AtelierShell from '$lib/components/atelier209/AtelierShell.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let email = $state('');
	let code = $state('');
	let sending = $state(false);
	let verifying = $state(false);
	let codeSent = $state(false);
	let sentEmail = $state('');
	// Incrémenté à chaque code (r)envoyé : re-keye la bannière pour rejouer l'animation = feedback
	// visible même sur un RENVOI (sinon le clic « Renvoyer » ne bouge rien à l'écran).
	let sendCount = $state(0);
	let codeInput = $state<HTMLInputElement | null>(null);
	// Masque l'erreur périmée quand on revient à l'étape 1 (resetToEmail ne peut pas effacer `form`).
	let errorDismissed = $state(false);

	// Erreur portée par la query (redirections du hook) - copy neutre.
	let queryError = $state('');
	$effect(() => {
		if (!browser) return;
		const p = new URLSearchParams(window.location.search);
		const e = p.get('error');
		if (e === 'unauthorized')
			queryError = 'Accès réservé aux comptes autorisés. Contactez l’administrateur.';
		else if (e === 'expired') queryError = 'Session expirée. Veuillez vous reconnecter.';
		else if (e === 'callback') queryError = `Erreur de connexion : ${p.get('detail') || 'inconnue'}`;
	});

	// Retours serveur : code envoyé (étape 2) ou vérifié (accès au portail).
	$effect(() => {
		if (form?.codeSent && !form?.verified) {
			codeSent = true;
			sentEmail = form.email ?? '';
			queryError = '';
		}
		if (form?.verified) {
			goto('/');
		}
	});

	// Focus le champ code dès qu'il devient actif.
	$effect(() => {
		if (codeSent && codeInput) codeInput.focus();
	});

	const displayedError = $derived(
		form?.verified || errorDismissed ? '' : (form?.error ?? queryError ?? ''),
	);

	function resetToEmail() {
		codeSent = false;
		sentEmail = '';
		code = '';
		queryError = '';
		errorDismissed = true; // efface la bannière de l'étape 2 en revenant à l'étape 1
	}
</script>

<svelte:head>
	<title>Connexion - Atelier 209</title>
</svelte:head>

<AtelierShell>
	<span class="eyebrow reveal" style="--d:.02s">Connexion</span>
	<div class="head">
		<h1 class="display login-title reveal" style="--d:.08s">Bienvenue</h1>
		<p class="subtitle reveal" style="--d:.14s">Espace professionnel</p>
	</div>

	<!-- Slot de message TOUJOURS présent (anime sa hauteur au lieu d'apparaître d'un coup) :
	     le formulaire glisse en douceur, sans saut brutal ni « Se connecter » rogné. -->
	<div class="msg-slot" class:open={displayedError || codeSent}>
		<div class="msg-slot-inner">
			{#if displayedError}
				<div class="login-error reveal" role="alert" style="--d:.05s">{displayedError}</div>
			{:else if codeSent}
				{#key sendCount}
					<div class="login-notice reveal" role="status" style="--d:.05s">
						Un {sendCount > 1 ? 'nouveau ' : ''}code à 6 chiffres a été envoyé à
						<strong>{sentEmail}</strong>. Saisissez-le ci-dessous.
					</div>
				{/key}
			{/if}
		</div>
	</div>

	<div class="login-form">
		<!-- Étape 1 : identifiant -->
		<form
			class="step reveal"
			style="--d:.20s"
			method="POST"
			action="?/sendcode"
			use:enhance={() => {
				sending = true;
				errorDismissed = false;
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'success' && (result.data as { codeSent?: boolean } | undefined)?.codeSent)
						sendCount += 1;
					await update({ reset: false });
				};
			}}
		>
			<span class="step-label"><span class="n">Étape 1</span> · Identifiant</span>
			<label class="field-label" for="email">Adresse professionnelle</label>
			<input
				class="field"
				id="email"
				name="email"
				type="email"
				placeholder="prenom@lamaisoncreativedirection.ch"
				autocomplete="email"
				bind:value={email}
				required
			/>
			<div class="btn-row">
				<button class="btn" type="submit" disabled={sending || !email}>
					{sending ? 'Envoi…' : codeSent ? 'Renvoyer le code' : 'Recevoir le code'}
					<span class="icon-pill" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2.6" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
					</span>
				</button>
			</div>
			<p class="step-hint">
				{#if codeSent}
					Pas reçu&nbsp;? Vérifiez les indésirables, ou
					<button type="button" class="link-reset" onclick={resetToEmail}>changez d’adresse</button>.
				{:else}
					Un code à 6 chiffres vous est envoyé par courriel.
				{/if}
			</p>
		</form>

		<!-- Étape 2 : vérification. Pas de `reveal` ici : elle reste « pending » (0.5) au
		     chargement puis se dé-dimme via la transition de `.step` quand le code est envoyé. -->
		<form
			class="step"
			class:pending={!codeSent}
			method="POST"
			action="?/verifycode"
			use:enhance={() => {
				verifying = true;
				errorDismissed = false;
				return async ({ update }) => {
					verifying = false;
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="email" value={sentEmail} />
			<span class="step-label"><span class="n">Étape 2</span> · Vérification</span>
			<label class="field-label" for="code">Code de connexion</label>
			<input
				class="field code-field"
				id="code"
				name="code"
				type="text"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				placeholder="123456"
				bind:value={code}
				bind:this={codeInput}
				disabled={!codeSent}
				required
			/>
			<div class="btn-row">
				<button class="btn" type="submit" disabled={!codeSent || verifying || code.length !== 6}>
					{verifying ? 'Vérification…' : 'Se connecter'}
					<span class="icon-pill" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
					</span>
				</button>
			</div>
			<p class="step-hint">Le code expire après 10 minutes.</p>
		</form>
	</div>
</AtelierShell>

<style>
	.login-title {
		font-size: clamp(44px, 5.8vw, 74px);
	}

	.login-error {
		max-width: 44ch;
		padding: 11px 18px;
		border-radius: 12px;
		background: rgba(178, 88, 84, 0.14);
		box-shadow: inset 0 0 0 1px rgba(220, 130, 120, 0.24);
		color: #f0c9c2;
		font-size: 13.5px;
		line-height: 1.5;
	}

	/* Confirmation « code envoyé » (état success) : même gabarit que .login-error, ton crème
	   positif de la direction « Heure bleue ». role="status" = annonce polie au lecteur d'écran. */
	.login-notice {
		max-width: 46ch;
		padding: 11px 18px;
		border-radius: 12px;
		background: rgba(240, 228, 194, 0.1);
		box-shadow: inset 0 0 0 1px rgba(240, 228, 194, 0.26);
		color: var(--cream);
		font-size: 13.5px;
		line-height: 1.5;
		text-align: center;
	}
	.login-notice strong {
		color: var(--cream-bright);
		font-weight: 600;
	}

	/* Le slot de message anime sa HAUTEUR (grid-template-rows 0fr -> 1fr) au lieu d'être
	   inséré/retiré du flux : quand le code est envoyé, le bloc formulaire glisse doucement
	   vers le bas au lieu de sauter d'un coup (~83px) qui rognait « Se connecter ». */
	.msg-slot {
		display: grid;
		grid-template-rows: 0fr;
		width: min(720px, 100%);
		transition: grid-template-rows 0.45s var(--a209-ease);
	}
	.msg-slot.open {
		grid-template-rows: 1fr;
	}
	.msg-slot-inner {
		overflow: hidden;
		min-height: 0;
		display: flex;
		justify-content: center;
	}

	/* Les 2 étapes côte à côte (desktop), empilées en mobile. */
	.login-form {
		width: min(720px, 100%);
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: center;
		gap: clamp(28px, 5vw, 60px);
	}
	.step {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: opacity 0.4s var(--a209-ease);
	}
	.step.pending {
		opacity: 0.5;
	}

	.step-label {
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}
	.step-label .n {
		color: var(--cream);
	}
	.field-label {
		margin-top: 10px;
		font-size: 13px;
		font-weight: 500;
		color: var(--ink);
	}

	.field {
		margin-top: 10px;
		width: 100%;
		/* Hauteur FIXE identique aux deux étapes : le champ code (26px) est plus grand que le
		   champ email (16px) ; sans hauteur commune, l'étape 2 pousse son bouton plus bas et les
		   deux boutons se désalignent. Hauteur explicite = grille verticale partagée (déterministe). */
		height: 56px;
		box-sizing: border-box;
		font-family: inherit;
		font-size: 16px;
		font-weight: 400;
		color: var(--ink);
		text-align: center;
		background: transparent;
		border: none;
		outline: none;
		padding: 0 6px;
		border-radius: 2px;
		box-shadow: inset 0 -1.5px 0 rgba(236, 231, 220, 0.18);
		transition:
			box-shadow 0.4s var(--a209-ease),
			color 0.4s var(--a209-ease);
	}
	.field::placeholder {
		color: var(--ink-faint);
	}
	.field:focus {
		box-shadow:
			inset 0 -2px 0 rgba(240, 228, 194, 0.85),
			0 14px 26px -22px rgba(240, 228, 194, 0.55);
	}
	.field:disabled {
		cursor: not-allowed;
	}
	.code-field {
		font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
		font-size: 26px;
		letter-spacing: 0.5em;
		padding-left: 0.5em; /* recentre le texte interlettré */
	}

	.btn-row {
		display: flex;
		justify-content: center;
		margin-top: clamp(14px, 2vw, 20px);
	}
	.btn {
		font-family: inherit;
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		/* Boutons d'action appariés (Recevoir le code / Se connecter) = MÊME largeur ET même hauteur
		   (règle globale Pascal 2026-07-21) : min-width partagée + contenu centré → équilibre parfait,
		   quel que soit le libellé. */
		min-width: 220px;
		padding: 14px 22px;
		border-radius: 999px;
		color: var(--concrete-950);
		background: linear-gradient(180deg, var(--cream-bright), var(--cream));
		box-shadow:
			0 18px 44px -22px rgba(240, 228, 194, 0.7),
			0 2px 10px -4px rgba(240, 228, 194, 0.4);
		transition:
			transform 0.55s var(--a209-ease-soft),
			box-shadow 0.55s var(--a209-ease-soft),
			filter 0.4s var(--a209-ease),
			opacity 0.3s var(--a209-ease);
	}
	.btn:hover:not(:disabled) {
		filter: brightness(1.04);
		box-shadow:
			0 26px 58px -20px rgba(240, 228, 194, 0.82),
			0 3px 14px -4px rgba(240, 228, 194, 0.5);
	}
	.btn:active:not(:disabled) {
		transform: scale(0.985);
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.btn:focus-visible {
		outline: 2px solid rgba(240, 228, 194, 0.7);
		outline-offset: 3px;
	}
	.icon-pill {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(18, 19, 21, 0.1);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.55s var(--a209-ease-soft);
	}
	.btn:hover:not(:disabled) .icon-pill {
		transform: translateX(3px);
	}
	.icon-pill svg {
		display: block;
	}

	.step-hint {
		margin-top: 9px;
		/* Réserve 2 lignes : le hint « Pas reçu ? … changez d'adresse » (état renvoi) s'enroule sur
		   2 lignes ; hauteur commune = bas des 2 colonnes aligné (grille préservée). Le hint initial
		   « Un code à 6 chiffres… » tient sur UNE ligne (décision Pascal 2026-07-21) : pas de bride de
		   largeur, il occupe la colonne (≈264px sur ≈330px). */
		min-height: 36px;
		font-size: 12px;
		color: var(--ink-faint);
		line-height: 1.5;
		max-width: 100%;
	}
	.link-reset {
		display: inline;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--cream);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.link-reset:hover {
		color: var(--cream-bright);
	}

	@media (max-width: 760px) {
		.login-form {
			flex-direction: column;
			align-items: center;
			gap: 20px;
			width: min(360px, 100%);
		}
		.step {
			flex: none;
			width: 100%;
		}
		.btn {
			width: 100%;
			justify-content: space-between;
		}
		.btn-row {
			width: 100%;
		}
	}
</style>
