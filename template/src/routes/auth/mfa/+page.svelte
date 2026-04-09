<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { config } from '$lib/config';

	const supabase = createSupabaseBrowserClient();
	const bgImage = 'loginBackground' in config.branding ? (config.branding as Record<string, unknown>).loginBackground as string : null;

	let code = $state('');
	let error = $state('');
	let loading = $state(false);

	async function verifyCode() {
		if (code.length !== 6) {
			error = 'Le code doit contenir 6 chiffres.';
			return;
		}

		loading = true;
		error = '';

		const { data: factors } = await supabase.auth.mfa.listFactors();
		const totpFactor = factors?.totp?.[0];

		if (!totpFactor) {
			error = 'Aucun authentificateur configuré. Contactez l\'administrateur.';
			loading = false;
			return;
		}

		const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
			factorId: totpFactor.id,
			code
		});

		loading = false;

		if (verifyError) {
			if (verifyError.message.includes('expired')) {
				error = 'Code expiré, réessayez.';
			} else {
				error = 'Code incorrect. Vérifiez votre application d\'authentification.';
			}
			code = '';
			return;
		}

		goto('/');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && code.length === 6) {
			verifyCode();
		}
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
				<img src="/{config.branding.logoWhite}" alt="{config.app.name}" class="login-logo" />
			{:else if config.branding.logo}
				<img src="/{config.branding.logo}" alt="{config.app.name}" class="login-logo" />
			{/if}
			<p class="login-subtitle" class:text-white={bgImage} class:text-text={!bgImage}>Vérification en deux étapes</p>
		</div>

		<div class="text-center {bgImage ? 'text-white/70' : 'text-text-light'} text-sm">
			Ouvrez votre application d'authentification et saisissez le code à 6 chiffres.
		</div>

		{#if error}
			<div class="px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm text-center">
				{error}
			</div>
		{/if}

		<div class="flex flex-col gap-4">
			<div>
				<label for="totp-code" class="block text-sm font-medium mb-1.5 {bgImage ? 'text-white/80' : 'text-text-light'}">Code de vérification</label>
				<input
					id="totp-code"
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					maxlength="6"
					autocomplete="one-time-code"
					placeholder="000000"
					bind:value={code}
					onkeydown={handleKeydown}
					class="w-full px-4 py-3 rounded-lg text-sm text-center tracking-[0.5em] font-mono text-lg {bgImage
						? 'bg-white/10 border border-white/20 text-white placeholder-white/40 backdrop-blur-sm'
						: 'bg-white border border-border text-text placeholder-text-light/50'}"
				/>
			</div>
			<button
				onclick={verifyCode}
				disabled={loading || code.length !== 6}
				class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
					{bgImage
						? 'border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
						: 'border border-primary bg-primary text-white hover:bg-primary-dark'}"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
				</svg>
				{loading ? 'Vérification...' : 'Vérifier'}
			</button>
		</div>
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
