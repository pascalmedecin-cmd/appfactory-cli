<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import type { PageData } from './$types';

	$pageSubtitle = 'Vue d\'ensemble';

	let { data }: { data: PageData } = $props();

	const isEmpty = $derived(
		data.stats.contacts === 0 && data.stats.entreprises === 0 && data.stats.opportunites === 0
	);

	const statCards = $derived([
		{ label: 'Contacts', value: data.stats.contacts, icon: 'contacts', href: '/contacts', iconColor: 'text-accent', iconBg: 'bg-accent/10' },
		{ label: 'Entreprises', value: data.stats.entreprises, icon: 'business', href: '/entreprises', iconColor: 'text-primary', iconBg: 'bg-primary/10' },
		{ label: 'Opportunités', value: data.stats.opportunites, icon: 'conversion_path', href: '/pipeline', iconColor: 'text-success', iconBg: 'bg-success-light' },
		{ label: 'Signaux neufs', value: data.stats.signaux, icon: 'notifications', href: '/signaux', iconColor: 'text-warning', iconBg: 'bg-warning-light' },
	]);

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '–';
		return new Date(dateStr).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' });
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '–';
		return new Date(dateStr).toLocaleDateString('fr-CH', {
			day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
		});
	}
</script>

<div class="space-y-8">
	<!-- Alertes signaux neufs -->
	{#if data.stats.signaux > 0}
		<a
			href="/signaux"
			class="flex items-center gap-4 p-4 bg-primary/5 border border-primary/12 rounded-lg hover:bg-primary/8 hover:shadow-sm transition-all"
		>
			<span class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
				<Icon name="radar" size={22} class="text-primary" />
			</span>
			<div class="flex-1">
				<p class="text-sm font-semibold text-text">
					{data.stats.signaux} {data.stats.signaux > 1 ? 'signaux' : 'signal'} d'affaires à traiter
				</p>
				<p class="text-xs text-text-muted mt-1">
					Appels d'offres, permis, créations d'entreprises : à analyser ou convertir en opportunité
				</p>
			</div>
			<Icon name="arrow_forward" size={18} class="text-primary" />
		</a>
	{/if}

	<!-- Alertes prospection -->
	{#if data.alertes.length > 0}
		<a
			href="/prospection"
			class="flex items-center gap-3 p-4 bg-warning-light border border-warning/30 rounded-lg hover:bg-warning-light/80 transition-colors"
		>
			<Icon name="notifications_active" size={24} class="text-warning" />
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
			<Icon name="arrow_forward" size={18} class="text-warning" />
		</a>
	{/if}

	<!-- Stats cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		{#each statCards as card}
			<a
				href={card.href}
				class="bg-white rounded-lg border border-border p-4 hover:shadow-md hover:border-border-strong transition-all duration-200 group"
			>
				<div class="flex items-center justify-between mb-3">
					<span class="flex items-center justify-center w-10 h-10 rounded-lg {card.iconBg}">
						<Icon name={card.icon} size={22} class="{card.iconColor}" />
					</span>
					<Icon name="arrow_forward" size={16} class="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
				</div>
				<p class="text-2xl font-semibold text-text tracking-tight">{card.value}</p>
				<p class="text-sm text-text-muted mt-1">{card.label}</p>
			</a>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Relances du jour -->
		<div class="bg-white rounded-lg border border-border">
			<div class="px-4 py-4 border-b border-border flex items-center justify-between">
				<h2 class="text-lg font-semibold text-text">Relances du jour</h2>
				{#if data.relances.length > 0}
					<Badge label={String(data.relances.length)} variant="warning" />
				{/if}
			</div>
			<div class="p-4">
				{#if data.relances.length === 0}
					<p class="text-sm text-text-muted text-center py-4">Aucune relance prévue.</p>
				{:else}
					<div class="space-y-3">
						{#each data.relances as relance}
							<div class="flex items-center justify-between p-3 rounded-lg bg-surface">
								<div>
									<p class="text-sm font-medium text-text">{relance.titre}</p>
									<p class="text-xs text-text-muted">
										{relance.etape_pipeline ?? '–'}
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
			<div class="px-4 py-4 border-b border-border">
				<h2 class="text-lg font-semibold text-text">Dernière activité</h2>
			</div>
			<div class="p-4">
				{#if data.activitesRecentes.length === 0}
					<div class="space-y-3">
						<p class="text-sm text-text-muted">Rien pour le moment. Quelques idées pour démarrer :</p>
						<a href="/prospection" class="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors group">
							<Icon name="cloud_download" size={18} class="text-accent" />
							<div>
								<p class="text-sm font-medium text-text group-hover:text-accent">Importer des leads depuis Zefix ou SIMAP</p>
								<p class="text-xs text-text-muted">Trouvez des prospects dans le registre du commerce ou les marchés publics</p>
							</div>
						</a>
						<a href="/signaux" class="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors group">
							<Icon name="notifications_active" size={18} class="text-warning" />
							<div>
								<p class="text-sm font-medium text-text group-hover:text-accent">Surveiller les signaux d'affaires</p>
								<p class="text-xs text-text-muted">Appels d'offres, permis de construire, créations d'entreprises</p>
							</div>
						</a>
						<a href="/prospection" class="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors group">
							<Icon name="bookmark_add" size={18} class="text-success" />
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
								<Icon name={activite.type_activite === 'appel' ? 'call' :
									 activite.type_activite === 'email' ? 'mail' :
									 activite.type_activite === 'reunion' ? 'groups' : 'note'} size={18} class="text-text-muted mt-0.5" />
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
			<h2 class="text-lg font-semibold text-text mb-4">Pour démarrer</h2>
			<div class="space-y-3">
				<a href="/entreprises" class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-alt transition-colors group">
					<span class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold">1</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-text group-hover:text-accent">Ajouter une entreprise</p>
						<p class="text-xs text-text-muted">Créez la fiche de votre premier client ou prospect</p>
					</div>
					<Icon name="arrow_forward" size={18} class="text-text-muted group-hover:text-accent" />
				</a>
				<a href="/contacts" class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-alt transition-colors group">
					<span class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold">2</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-text group-hover:text-accent">Ajouter un contact</p>
						<p class="text-xs text-text-muted">Rattachez vos interlocuteurs à leurs entreprises</p>
					</div>
					<Icon name="arrow_forward" size={18} class="text-text-muted group-hover:text-accent" />
				</a>
				<a href="/pipeline" class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-alt transition-colors group">
					<span class="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold">3</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-text group-hover:text-accent">Créer une opportunité</p>
						<p class="text-xs text-text-muted">Suivez vos affaires dans le pipeline commercial</p>
					</div>
					<Icon name="arrow_forward" size={18} class="text-text-muted group-hover:text-accent" />
				</a>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
			<a href="/contacts" class="flex items-center gap-2 h-10 px-4 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm hover:border-border-strong transition-all">
				<Icon name="person_add" size={18} class="text-accent" />
				Nouveau contact
			</a>
			<a href="/entreprises" class="flex items-center gap-2 h-10 px-4 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm hover:border-border-strong transition-all">
				<Icon name="domain_add" size={18} class="text-accent" />
				Nouvelle entreprise
			</a>
			<a href="/pipeline" class="flex items-center gap-2 h-10 px-4 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm hover:border-border-strong transition-all">
				<Icon name="add_circle" size={18} class="text-accent" />
				Nouvelle opportunité
			</a>
			<a href="/signaux" class="flex items-center gap-2 h-10 px-4 bg-white rounded-lg border border-border text-sm text-text hover:shadow-sm hover:border-border-strong transition-all">
				<Icon name="notifications" size={18} class="text-accent" />
				Voir les signaux
			</a>
		</div>
	{/if}
</div>

