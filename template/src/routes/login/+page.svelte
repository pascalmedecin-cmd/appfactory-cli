<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { config } from '$lib/config';

	const supabase = createSupabaseBrowserClient();
	const bgImage = 'loginBackground' in config.branding ? (config.branding as Record<string, unknown>).loginBackground as string : null;

	async function signInWithGoogle() {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
		if (error) console.error('Erreur login:', error.message);
	}
</script>

<div class="login-page" class:has-bg={bgImage}>
	{#if bgImage}
		<img src="/{bgImage}" alt="" class="login-bg" />
		<div class="login-overlay"></div>
	{/if}
	<div class="login-card">
		<div class="text-center">
			<h1 class="text-3xl font-bold" class:text-white={bgImage} class:text-text={!bgImage}>{config.app.name}</h1>
			<p class="mt-2" class:text-white-70={bgImage} class:text-text-muted={!bgImage}>Connectez-vous pour continuer</p>
		</div>

		<button
			onclick={signInWithGoogle}
			class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-colors cursor-pointer
				{bgImage
					? 'border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
					: 'border border-border bg-surface text-text hover:bg-surface-alt'}"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24">
				<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
				<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
				<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
				<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
			</svg>
			Se connecter avec Google
		</button>
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
		gap: 2rem;
		padding: 2rem;
	}

	.text-white-70 {
		color: rgba(255, 255, 255, 0.7);
	}
</style>
