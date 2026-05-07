<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { config } from '$lib/config';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const bgImage = 'loginBackground' in config.branding ? (config.branding as Record<string, unknown>).loginBackground as string : null;

	let email = $state('');
	let code = $state('');
	let loginError = $state('');
	let loading = $state(false);
	let codeSent = $state(false);
	let sentEmail = $state('');

	// Detecter erreur d'acces non autorise via query param
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		if (params.get('error') === 'unauthorized') {
			loginError = 'Accès réservé aux comptes @filmpro.ch. Contactez l\'administrateur.';
		} else if (params.get('error') === 'expired') {
			loginError = 'Session expirée. Veuillez vous reconnecter.';
		} else if (params.get('error') === 'callback') {
			loginError = `Erreur de connexion : ${params.get('detail') || 'inconnue'}`;
		}
	}

	// Réagir aux retours serveur
	$effect(() => {
		if (form?.codeSent && !form?.verified) {
			codeSent = true;
			sentEmail = form.email ?? '';
		}
		if (form?.verified) {
			goto('/');
		}
	});

	function resetToEmail() {
		codeSent = false;
		sentEmail = '';
		code = '';
		loginError = '';
	}
</script>

<div class="login-page" class:has-bg={bgImage}>
	{#if bgImage}
		<img src="/{bgImage}" alt="" class="login-bg" />
		<div class="login-overlay"></div>
	{/if}
	<div class="login-card">
		<div class="text-center">
			{#if bgImage && config.branding.logoWhite}
				<img src="/{config.branding.logoWhite}" alt="{config.app.name}" class="login-logo" fetchpriority="high" width="246" height="46" />
			{:else if config.branding.logo}
				<img src="/{config.branding.logo}" alt="{config.app.name}" class="login-logo" fetchpriority="high" width="246" height="46" />
			{/if}
			<p class="login-subtitle" class:text-white={bgImage} class:text-text={!bgImage}>Espace professionnel</p>
		</div>

		{#if (loginError || form?.error) && !form?.verified}
			<div class="px-4 py-3 rounded-lg bg-danger/15 border border-danger/30 text-danger-light text-sm text-center">
				{loginError || form?.error}
			</div>
		{/if}

		{#if codeSent}
			<!-- Étape 2 : saisir le code -->
			<form method="POST" action="?/verifycode" use:enhance={() => { loading = true; loginError = ''; return async ({ update }) => { loading = false; await update(); }; }} class="flex flex-col gap-4">
				<input type="hidden" name="email" value={sentEmail} />

				<div class="text-center {bgImage ? 'text-white/80' : 'text-text-light'}">
					<p class="text-sm">Code envoyé à <strong class="{bgImage ? 'text-white' : 'text-text'}">{sentEmail}</strong></p>
				</div>

				<div>
					<label for="code" class="block text-sm font-medium mb-1.5 {bgImage ? 'text-white/80' : 'text-text-light'}">Code à 6 chiffres</label>
					<input
						id="code"
						name="code"
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="6"
						placeholder="000000"
						bind:value={code}
						required
						class="w-full px-4 py-3 rounded-lg text-sm text-center tracking-[0.3em] text-lg font-mono {bgImage
							? 'bg-white/10 border border-white/20 text-white placeholder-white/40 backdrop-blur-sm'
							: 'bg-white border border-border text-text placeholder-text-light/50'}"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || code.length !== 6}
					class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
						{bgImage
							? 'border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
							: 'border border-primary bg-primary text-white hover:bg-primary-hover'}"
				>
					<Icon name="lock_open" />
					{loading ? 'Vérification...' : 'Se connecter'}
				</button>

				<button
					type="button"
					onclick={resetToEmail}
					class="text-sm underline opacity-70 hover:opacity-100 cursor-pointer {bgImage ? 'text-white' : 'text-text'}"
				>
					Changer d'adresse email
				</button>
			</form>
		{:else}
			<!-- Étape 1 : entrer l'email -->
			<form method="POST" action="?/sendcode" use:enhance={() => { loading = true; loginError = ''; return async ({ update }) => { loading = false; await update(); }; }} class="flex flex-col gap-4">
				<div>
					<label for="email" class="block text-sm font-medium mb-1.5 {bgImage ? 'text-white/80' : 'text-text-light'}">Adresse email professionnelle</label>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="prenom@filmpro.ch"
						bind:value={email}
						required
						class="w-full px-4 py-3 rounded-lg text-sm {bgImage
							? 'bg-white/10 border border-white/20 text-white placeholder-white/40 backdrop-blur-sm'
							: 'bg-white border border-border text-text placeholder-text-light/50'}"
					/>
				</div>
				<button
					type="submit"
					disabled={loading || !email}
					class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
						{bgImage
							? 'border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
							: 'border border-primary bg-primary text-white hover:bg-primary-hover'}"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
					</svg>
					{loading ? 'Envoi en cours...' : 'Recevoir le code'}
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.login-page {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-alt);
	}

	.login-page.has-bg {
		background: var(--color-primary-dark);
	}

	.login-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
	}

	.login-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 22, 40, 0.45);
		z-index: 1;
	}

	.login-card {
		position: relative;
		z-index: 2;
		max-width: 24rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		padding: 2.5rem;
	}

	.login-logo {
		height: 3.5rem;
		margin: 0 auto 1rem;
	}

	.login-subtitle {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: white;
		font-family: 'Inter', system-ui, sans-serif;
	}
</style>
