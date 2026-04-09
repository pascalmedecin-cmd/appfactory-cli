<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { config } from '$lib/config';

	const supabase = createSupabaseBrowserClient();
	const bgImage = 'loginBackground' in config.branding ? (config.branding as Record<string, unknown>).loginBackground as string : null;

	let qrCode = $state('');
	let secret = $state('');
	let factorId = $state('');
	let code = $state('');
	let error = $state('');
	let loading = $state(false);
	let enrolling = $state(true);
	let showSecret = $state(false);

	async function enrollTotp() {
		const { data, error: enrollError } = await supabase.auth.mfa.enroll({
			factorType: 'totp',
			issuer: config.app.name,
			friendlyName: 'Authenticator'
		});

		if (enrollError || !data) {
			error = 'Erreur lors de la configuration. Rechargez la page.';
			console.error('MFA enroll error:', enrollError?.message);
			return;
		}

		factorId = data.id;
		qrCode = data.totp.qr_code;
		secret = data.totp.secret;
		enrolling = false;
	}

	async function verifySetup() {
		if (code.length !== 6) {
			error = 'Le code doit contenir 6 chiffres.';
			return;
		}

		loading = true;
		error = '';

		const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
			factorId,
			code
		});

		loading = false;

		if (verifyError) {
			error = 'Code incorrect. Vérifiez dans votre application et réessayez.';
			code = '';
			return;
		}

		goto('/');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && code.length === 6) {
			verifySetup();
		}
	}

	// Lancer l'enrollment au montage
	enrollTotp();
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
			<p class="login-subtitle" class:text-white={bgImage} class:text-text={!bgImage}>Configuration sécurité</p>
		</div>

		{#if enrolling}
			<div class="text-center {bgImage ? 'text-white/70' : 'text-text-light'} text-sm">
				Chargement...
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				<div class="text-center {bgImage ? 'text-white/70' : 'text-text-light'} text-sm">
					<p class="mb-2"><strong class="{bgImage ? 'text-white' : 'text-text'}">Étape 1</strong> — Scannez ce QR code avec votre application d'authentification</p>
					<p>(Google Authenticator, Authy, 1Password…)</p>
				</div>

				<div class="flex justify-center">
					<div class="bg-white p-4 rounded-xl">
						<!-- SVG genere par Supabase SDK, pas d'input utilisateur — safe -->
					{@html qrCode}
					</div>
				</div>

				<div class="text-center">
					<button
						onclick={() => showSecret = !showSecret}
						class="text-xs underline opacity-60 hover:opacity-100 {bgImage ? 'text-white' : 'text-text-light'} cursor-pointer"
					>
						{showSecret ? 'Masquer' : 'Impossible de scanner ?'}
					</button>
					{#if showSecret}
						<div class="mt-2 px-3 py-2 rounded-lg text-xs font-mono break-all {bgImage ? 'bg-white/10 text-white/80' : 'bg-surface-alt text-text-light'}">
							{secret}
						</div>
					{/if}
				</div>

				{#if error}
					<div class="px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm text-center">
						{error}
					</div>
				{/if}

				<div>
					<label for="totp-code" class="block text-sm font-medium mb-1.5 {bgImage ? 'text-white/80' : 'text-text-light'}">
						<strong class="{bgImage ? 'text-white' : 'text-text'}">Étape 2</strong> — Saisissez le code affiché
					</label>
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
					onclick={verifySetup}
					disabled={loading || code.length !== 6}
					class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
						{bgImage
							? 'border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
							: 'border border-primary bg-primary text-white hover:bg-primary-dark'}"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
					</svg>
					{loading ? 'Vérification...' : 'Activer la protection'}
				</button>
			</div>
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
