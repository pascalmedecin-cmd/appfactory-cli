<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const supabase = createSupabaseBrowserClient();

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">AppFactory</h1>
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-600">{data.user?.email}</span>
				<button
					onclick={signOut}
					class="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
				>
					Déconnexion
				</button>
			</div>
		</div>
	</nav>

	<main class="max-w-7xl mx-auto px-4 py-8">
		<h2 class="text-2xl font-semibold text-gray-900">Dashboard</h2>
		<p class="mt-2 text-gray-600">Bienvenue, {data.user?.email}.</p>
	</main>
</div>
