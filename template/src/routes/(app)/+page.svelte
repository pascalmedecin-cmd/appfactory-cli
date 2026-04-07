<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isEmpty = $derived(
		data.stats.contacts === 0 && data.stats.entreprises === 0 && data.stats.opportunites === 0
	);

	const statCards = $derived([
		{ label: 'Contacts', value: data.stats.contacts, icon: 'contacts', href: '/contacts', color: 'text-accent' },
		{ label: 'Entreprises', value: data.stats.entreprises, icon: 'business', href: '/entreprises', color: 'text-primary' },
		{ label: 'Opportunités', value: data.stats.opportunites, icon: 'conversion_path', href: '/pipeline', color: 'text-success' },
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

	<!-- Alertes signaux neufs -->
	{#if data.stats.signaux > 0}
		<a
			href="/signaux"
			class="flex items-center gap-3 p-4 bg-primary/5 border border-primary/15 rounded-lg hover:bg-primary/10 transition-colors"
		>
			<span class="material-symbols-outlined text-[24px] text-primary">radar</span>
			<div class="flex-1">
				<p class="text-sm font-semibold text-text">
					{data.stats.signaux} signal{data.stats.signaux > 1 ? 'ux' : ''} d'affaires à traiter
				</p>
				<p class="text-xs text-text-muted">
					Appels d'offres, permis, créations d'entreprises — à analyser ou convertir en opportunité
				</p>
			</div>
			<span class="material-symbols-outlined text-[18px] text-primary">arrow_forward</span>
		</a>
	{/if}

	<!-- Alertes prospection -->
	{#if data.alertes.length > 0}
		<a
			href="/prospection"
			class="flex items-center gap-3 p-4 bg-warning-light border border-warning/30 rounded-lg hover:bg-warning-light/80 transition-colors"
		>
			<span class="material-symbols-outlined text-[24px] text-warning">notifications_active</span>
			<div class="flex-1">
				<p class="text-sm font-semibold text-text">
					Nouveaux leads détectés
				</p>
				<p class="text-xs text-text-muted">
					{#each data.alertes as alerte, i}
						{alerte.nom}: {alerte.nb_nouveaux} nouveau{(alerte.nb_nouveaux ?? 0) > 1 ? 'x' : ''}{i < data.alertes.length - 1 ? ' · ' : ''}
					{/each}
				</p>
			</div>
			<span class="material-symbols-outlined text-[18px] text-warning">arrow_forward</span>
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
					<div class="space-y-3">
						<p class="text-sm text-text-muted">Rien pour le moment. Quelques idées pour démarrer :</p>
						<a href="/prospection" class="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors group">
							<span class="material-symbols-outlined text-[18px] text-accent">cloud_download</span>
							<div>
								<p class="text-sm font-medium text-text group-hover:text-accent">Importer des leads depuis LINDAS ou SIMAP</p>
								<p class="text-xs text-text-muted">Trouvez des prospects dans le registre du commerce ou les marchés publics</p>
							</div>
						</a>
						<a href="/signaux" class="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors group">
							<span class="material-symbols-outlined text-[18px] text-warning">notifications_active</span>
							<div>
								<p class="text-sm font-medium text-text group-hover:text-accent">Surveiller les signaux d'affaires</p>
								<p class="text-xs text-text-muted">Appels d'offres, permis de construire, créations d'entreprises</p>
							</div>
						</a>
						<a href="/prospection" class="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors group">
							<span class="material-symbols-outlined text-[18px] text-success">bookmark_add</span>
							<div>
								<p class="text-sm font-medium text-text group-hover:text-accent">Configurer une alerte automatique</p>
								<p class="text-xs text-text-muted">Soyez notifié quand de nouveaux leads correspondent à vos critères</p>
							</div>
						</a>
					</div>
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

	<!-- Onboarding ou raccourcis -->
	{#if isEmpty}
		<div class="bg-white rounded-lg border border-border p-6">
			<h2 class="font-semibold text-text mb-4">Pour démarrer</h2>
			<div class="space-y-3">
				<a href="/entreprises" class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-alt transition-colors group">
					<span class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold">1</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-text group-hover:text-accent">Ajouter une entreprise</p>
						<p class="text-xs text-text-muted">Créez la fiche de votre premier client ou prospect</p>
					</div>
					<span class="material-symbols-outlined text-[18px] text-text-muted group-hover:text-accent">arrow_forward</span>
				</a>
				<a href="/contacts" class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-alt transition-colors group">
					<span class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold">2</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-text group-hover:text-accent">Ajouter un contact</p>
						<p class="text-xs text-text-muted">Rattachez vos interlocuteurs à leurs entreprises</p>
					</div>
					<span class="material-symbols-outlined text-[18px] text-text-muted group-hover:text-accent">arrow_forward</span>
				</a>
				<a href="/pipeline" class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-alt transition-colors group">
					<span class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold">3</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-text group-hover:text-accent">Créer une opportunité</p>
						<p class="text-xs text-text-muted">Suivez vos affaires dans le pipeline commercial</p>
					</div>
					<span class="material-symbols-outlined text-[18px] text-text-muted group-hover:text-accent">arrow_forward</span>
				</a>
			</div>
		</div>
	{:else}
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
				<span class="material-symbols-outlined text-[18px] text-accent">notifications</span>
				Voir les signaux
			</a>
		</div>
	{/if}
</div>
