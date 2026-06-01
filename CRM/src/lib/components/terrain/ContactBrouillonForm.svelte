<script lang="ts">
	/**
	 * ContactBrouillonForm — capture d'un contact rencontré en BROUILLON
	 * (DESIGN.md § 4.11, AC-009). Crée une contact_suggestions (en_attente) via
	 * POST /api/contact-suggestions ; jamais une ligne contacts directe.
	 * Au moins un identifiant requis (nom/prénom/téléphone/email).
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { hasIdentifier, buildContactSuggestionPayload, type ContactDraft } from './contact-draft';

	type Props = {
		entrepriseId: string;
		raisonSociale: string;
		onClose: () => void;
		onSaved: () => void;
	};
	let { entrepriseId, raisonSociale, onClose, onSaved }: Props = $props();

	let prenom = $state('');
	let nom = $state('');
	let role = $state('');
	let telephone = $state('');
	let email = $state('');
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	const draft = $derived<ContactDraft>({
		prenom,
		nom,
		role_fonction: role,
		telephone,
		email,
	});
	const valid = $derived(hasIdentifier(draft));
	const canSave = $derived(valid && !saving);

	async function save() {
		if (!canSave) return;
		saving = true;
		saveError = null;
		const payload = buildContactSuggestionPayload(entrepriseId, draft);
		try {
			const res = await fetch('/api/contact-suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				onSaved();
			} else {
				const body = await res.json().catch(() => ({}));
				saveError = body.error ?? "Échec de l'enregistrement. Réessayez.";
			}
		} catch {
			saveError = 'Réseau indisponible, réessayez.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Contact rencontré">
	<header class="ov-header">
		<button type="button" class="ghost" onclick={onClose}>Annuler</button>
		<span class="ov-title">Contact rencontré</span>
		<span class="spacer"></span>
	</header>

	<div class="ov-body">
		<p class="ent text-base text-[var(--color-text-muted)] truncate">{raisonSociale}</p>

		<div class="block">
			<label class="lbl" for="cb-prenom">Prénom</label>
			<input id="cb-prenom" class="inp" bind:value={prenom} autocomplete="off" />
		</div>
		<div class="block">
			<label class="lbl" for="cb-nom">Nom</label>
			<input id="cb-nom" class="inp" bind:value={nom} autocomplete="off" />
		</div>
		<div class="block">
			<label class="lbl" for="cb-role">Fonction <span class="opt">(optionnel)</span></label>
			<input id="cb-role" class="inp" bind:value={role} autocomplete="off" />
		</div>
		<div class="block">
			<label class="lbl" for="cb-tel">Téléphone <span class="opt">(optionnel)</span></label>
			<input id="cb-tel" class="inp" type="tel" inputmode="tel" bind:value={telephone} autocomplete="off" />
		</div>
		<div class="block">
			<label class="lbl" for="cb-email">Email <span class="opt">(optionnel)</span></label>
			<input id="cb-email" class="inp" type="email" inputmode="email" bind:value={email} autocomplete="off" />
		</div>

		{#if !valid}
			<p class="hint text-base text-[var(--color-text-muted)]">
				Renseigne au moins un nom, un téléphone ou un email.
			</p>
		{/if}
		{#if saveError}
			<p class="err" role="alert">{saveError}</p>
		{/if}
	</div>

	<footer class="ov-footer">
		<button type="button" class="cta" disabled={!canSave} onclick={save}>
			{#if saving}
				<Icon name="progress_activity" size={18} class="spin" />
				<span>Enregistrement…</span>
			{:else}
				<span>Enregistrer le contact</span>
			{/if}
		</button>
	</footer>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		background: var(--color-surface-alt);
	}
	.ov-header {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px var(--mobile-gutter);
		padding-top: calc(10px + env(safe-area-inset-top, 0px));
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.ov-title {
		font-size: 17px;
		font-weight: 700;
		color: var(--color-text);
	}
	.ghost {
		min-height: 44px;
		padding: 0 4px;
		font-size: 16px;
		color: var(--color-primary);
		background: transparent;
	}
	.spacer {
		width: 56px;
	}
	.ov-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: var(--mobile-gutter);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.ent {
		margin: -4px 0 0;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.lbl {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
	}
	.opt {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.inp {
		width: 100%;
		min-height: 48px;
		padding: 0 14px;
		font-size: 16px;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-lg);
	}
	.inp:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: -1px;
	}
	.hint {
		margin: 0;
	}
	.err {
		font-size: 16px;
		color: #B42318;
		background: var(--color-danger-light);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: 10px 12px;
	}
	.ov-footer {
		flex: 0 0 auto;
		padding: 12px var(--mobile-gutter);
		padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}
	.cta {
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
	.cta:active:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.cta:disabled {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
	}
	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
