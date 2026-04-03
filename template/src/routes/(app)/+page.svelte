<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statCards = $derived([
		{ label: 'Contacts', value: data.stats.contacts, icon: 'contacts', href: '/contacts', color: 'text-accent' },
		{ label: 'Entreprises', value: data.stats.entreprises, icon: 'business', href: '/entreprises', color: 'text-primary' },
		{ label: 'Opportunités', value: data.stats.opportunites, icon: 'filter_list', href: '/pipeline', color: 'text-success' },
		{ label: 'Signaux neufs', value: data.stats.signaux, icon: 'notifications', href: '/signaux', color: 'text-warning' },
	]);

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' });
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('fr-CH', {
			day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
		});
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-text">Dashboard</h1>
		<p class="text-sm text-text-muted">Vue d'ensemble de votre activité</p>
	</div>

	<!-- Alertes prospection -->
	{#if data.alertes.length > 0}
		<a
			href="/prospection"
			class="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
		>
			<span class="material-symbols-outlined text-[24px] text-amber-600">notifications_active</span>
			<div class="flex-1">
				<p class="text-sm font-semibold text-amber-800">
					Nouveaux leads detectes
				</p>
				<p class="text-xs text-amber-700">
					{#each data.alertes as alerte, i}
						{alerte.nom}: {alerte.nb_nouveaux} nouveau{(alerte.nb_nouveaux ?? 0) > 1 ? 'x' : ''}{i < data.alertes.length - 1 ? ' · ' : ''}
					{/each}
				</p>
			</div>
			<span class="material-symbols-outlined text-[18px] text-amber-600">arrow_forward</span>
		</a>
	{/if}

	<!-- Stats cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		{#each statCards as card}
			<a
				href={card.href}
				class="bg-white rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
			>
				<div class="flex items-center justify-between">
					<span class="material-symbols-outlined text-[28px] {card.color}">{card.icon}</span>
					<span class="text-2xl font-bold text-text">{card.value}</span>
				</div>
				<p class="mt-2 text-sm text-text-muted">{card.label}</p>
			</a>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Relances du jour -->
		<div class="bg-white rounded-lg border border-border">
			<div class="px-5 py-4 border-b border-border flex items-center justify-between">
				<h2 class="font-semibold text-text">Relances du jour</h2>
				{#if data.relances.length > 0}
					<Badge label={String(data.relances.length)} variant="warning" />
				{/if}
			</div>
			<div class="p-5">
				{#if data.relances.length === 0}
					<p class="text-sm text-text-muted text-center py-4">Aucune relance prévue.</p>
				{:else}
					<div class="space-y-3">
						{#each data.relances as relance}
							<div class="flex items-center justify-between p-3 rounded-lg bg-surface">
								<div>
									<p class="text-sm font-medium text-text">{relance.titre}</p>
									<p class="text-xs text-text-muted">
										{relance.etape_pipeline ?? '—'}
									</p>
								</div>
								<span class="text-xs text-text-muted">{formatDate(relance.date_relance_prevue)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Dernière activité -->
		<div class="bg-white rounded-lg border border-border">
			<div class="px-5 py-4 border-b border-border">
				<h2 class="font-semibold text-text">Dernière activité</h2>
			</div>
			<div class="p-5">
				{#if data.activitesRecentes.length === 0}
					<p class="text-sm text-text-muted text-center py-4">Aucune activité enregistrée.</p>
				{:else}
					<div class="space-y-3">
						{#each data.activitesRecentes as activite}
							<div class="flex items-start gap-3 p-3 rounded-lg bg-surface">
								<span class="material-symbols-outlined text-[18px] text-text-muted mt-0.5">
									{activite.type_activite === 'appel' ? 'call' :
									 activite.type_activite === 'email' ? 'mail' :
									 activite.type_activite === 'reunion' ? 'groups' : 'note'}
								</span>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-text truncate">
										{activite.type_activite}
									</p>
									<p class="text-xs text-text-muted truncate">{activite.resume_contenu ?? activite.type_activite}</p>
								</div>
								<span class="text-xs text-text-muted shrink-0">{formatDateTime(activite.date_heure)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Raccourcis -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<a href="/contacts" class="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm transition-shadow">
			<span class="material-symbols-outlined text-[18px] text-accent">person_add</span>
			Nouveau contact
		</a>
		<a href="/entreprises" class="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm transition-shadow">
			<span class="material-symbols-outlined text-[18px] text-accent">domain_add</span>
			Nouvelle entreprise
		</a>
		<a href="/pipeline" class="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm transition-shadow">
			<span class="material-symbols-outlined text-[18px] text-accent">add_circle</span>
			Nouvelle opportunité
		</a>
		<a href="/signaux" class="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm transition-shadow">
			<span class="material-symbols-outlined text-[18px] text-accent">search</span>
			Voir les signaux
		</a>
	</div>
</div>
