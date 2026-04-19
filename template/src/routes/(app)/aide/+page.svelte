<script lang="ts">
	import { config } from '$lib/config';
	import { pageSubtitle } from '$lib/stores/pageSubtitle';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	$pageSubtitle = 'Documentation';

	type Tab = 'demarrage' | 'guide' | 'technique';

	const tabs: { id: Tab; label: string; icon: string; desc: string }[] = [
		{ id: 'demarrage', label: 'Prise en main', icon: 'rocket_launch', desc: 'Premiers pas avec l\'application' },
		{ id: 'guide', label: 'Fonctions détaillées', icon: 'menu_book', desc: 'Toutes les fonctions en détail' },
		{ id: 'technique', label: 'Documentation technique', icon: 'engineering', desc: 'Pour administrateurs et développeurs' },
	];

	let activeTab = $state<Tab>(($page.url.searchParams.get('tab') as Tab) || 'demarrage');
	let searchQuery = $state('');
	let activeSection = $state('');

	function switchTab(tab: Tab) {
		activeTab = tab;
		searchQuery = '';
		activeSection = '';
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	// -- Sections par onglet --

	const sectionsDemarrage = [
		{ id: 'bienvenue', label: 'Bienvenue', icon: 'waving_hand' },
		{ id: 'connexion-rapide', label: 'Se connecter', icon: 'login' },
		{ id: 'navigation-rapide', label: 'Naviguer', icon: 'explore' },
		{ id: 'premieres-actions', label: 'Premières actions', icon: 'play_circle' },
		{ id: 'astuces', label: 'Astuces', icon: 'lightbulb' },
	];

	const sectionsGuide = [
		{ id: 'connexion', label: 'Connexion', icon: 'login' },
		{ id: 'navigation', label: 'Navigation', icon: 'menu' },
		{ id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
		{ id: 'contacts', label: 'Contacts', icon: 'contacts' },
		{ id: 'entreprises', label: 'Entreprises', icon: 'business' },
		{ id: 'pipeline', label: 'Pipeline', icon: 'conversion_path' },
		{ id: 'prospection', label: 'Prospection', icon: 'search' },
		{ id: 'signaux', label: 'Signaux', icon: 'notifications' },
	];

	const sectionsTechnique = [
		{ id: 'tech-architecture', label: 'Architecture', icon: 'account_tree' },
		{ id: 'tech-stack', label: 'Stack technique', icon: 'layers' },
		{ id: 'tech-bdd', label: 'Base de données', icon: 'database' },
		{ id: 'tech-auth', label: 'Authentification', icon: 'lock' },
		{ id: 'tech-api', label: 'APIs externes', icon: 'api' },
		{ id: 'tech-deploy', label: 'Déploiement', icon: 'cloud_upload' },
		{ id: 'tech-cron', label: 'Tâches planifiées', icon: 'schedule' },
		{ id: 'tech-securite', label: 'Sécurité', icon: 'shield' },
		{ id: 'tech-procedures', label: 'Procédures', icon: 'checklist' },
	];

	const currentSections = $derived(
		activeTab === 'demarrage' ? sectionsDemarrage :
		activeTab === 'guide' ? sectionsGuide :
		sectionsTechnique
	);

	// Filter sections by search
	const filteredSections = $derived.by(() => {
		if (!searchQuery.trim()) return currentSections.map(s => s.id);
		const q = searchQuery.toLowerCase();
		const matches: string[] = [];
		for (const section of currentSections) {
			const el = document.getElementById(section.id);
			if (el && el.textContent?.toLowerCase().includes(q)) {
				matches.push(section.id);
			}
			if (section.label.toLowerCase().includes(q) && !matches.includes(section.id)) {
				matches.push(section.id);
			}
		}
		return matches;
	});

	function scrollTo(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeSection = id;
		}
	}

	// Observe active section on scroll
	$effect(() => {
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
					}
				}
			},
			{ rootMargin: '-80px 0px -60% 0px' }
		);
		for (const section of currentSections) {
			const el = document.getElementById(section.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<div class="max-w-6xl mx-auto">

	<!-- Tabs -->
	<div class="aide-tabs">
		{#each tabs as tab}
			<button
				onclick={() => switchTab(tab.id)}
				class="aide-tab {activeTab === tab.id ? 'aide-tab--active' : ''}"
			>
				<span class="material-symbols-outlined aide-tab-icon">{tab.icon}</span>
				<span class="aide-tab-label">{tab.label}</span>
				<span class="aide-tab-desc">{tab.desc}</span>
			</button>
		{/each}
	</div>

	<!-- Search -->
	<div class="relative mt-6 mb-8">
		<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
		<input
			type="text"
			placeholder="Rechercher dans {tabs.find(t => t.id === activeTab)?.label}..."
			bind:value={searchQuery}
			class="w-full pl-11 pr-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-xs"
		/>
		{#if searchQuery}
			<button
				onclick={() => searchQuery = ''}
				class="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">close</span>
			</button>
		{/if}
		{#if searchQuery && filteredSections.length === 0}
			<p class="mt-3 text-sm text-text-muted">Aucun résultat pour « {searchQuery} »</p>
		{/if}
	</div>

	<!-- Mobile TOC (select) -->
	<div class="aide-toc-mobile">
		<label for="aide-toc-select" class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Sommaire</label>
		<div class="relative">
			<select
				id="aide-toc-select"
				onchange={(e) => scrollTo((e.target as HTMLSelectElement).value)}
				class="w-full pl-3 pr-8 py-2.5 border border-border rounded-xl bg-surface text-text text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
			>
				{#each currentSections as section}
					{#if !searchQuery || filteredSections.includes(section.id)}
						<option value={section.id} selected={activeSection === section.id}>{section.label}</option>
					{/if}
				{/each}
			</select>
			<span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">expand_more</span>
		</div>
	</div>

	<div class="flex gap-8">
		<!-- Sidebar TOC (desktop) -->
		<nav class="aide-toc">
			<div class="sticky top-20">
				<p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Sommaire</p>
				<ul class="space-y-0.5">
					{#each currentSections as section}
						{#if !searchQuery || filteredSections.includes(section.id)}
							<li>
								<button
									onclick={() => scrollTo(section.id)}
									class="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer
										{activeSection === section.id ? 'bg-primary-light text-primary font-medium' : 'text-text-body hover:bg-surface-alt'}"
								>
									<span class="material-symbols-outlined text-[16px] opacity-70">{section.icon}</span>
									{section.label}
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		</nav>

		<!-- Content -->
		<div class="flex-1 min-w-0 space-y-10 pb-16">

			<!-- ==================== ONGLET PRISE EN MAIN ==================== -->
			{#if activeTab === 'demarrage'}

				<!-- Bienvenue -->
				<section id="bienvenue" class="aide-section {searchQuery && !filteredSections.includes('bienvenue') ? 'hidden' : ''}">
					<div class="aide-hero">
						<div class="aide-hero-icon">
							<span class="material-symbols-outlined text-[32px]">waving_hand</span>
						</div>
						<div>
							<h2 class="aide-hero-title">Bienvenue sur {config.app.name}</h2>
							<p class="aide-hero-desc">Votre outil de gestion commerciale. Ce guide vous accompagne dans vos premiers pas.</p>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
						<div class="aide-card">
							<span class="material-symbols-outlined aide-card-icon text-success">contacts</span>
							<p class="aide-card-title">Contacts & Entreprises</p>
							<p class="aide-card-desc">Centralisez vos relations d'affaires</p>
						</div>
						<div class="aide-card">
							<span class="material-symbols-outlined aide-card-icon text-primary">conversion_path</span>
							<p class="aide-card-title">Pipeline commercial</p>
							<p class="aide-card-desc">Suivez vos opportunités en kanban</p>
						</div>
						<div class="aide-card">
							<span class="material-symbols-outlined aide-card-icon text-warning">search</span>
							<p class="aide-card-title">Prospection automatisée</p>
							<p class="aide-card-desc">Détectez des leads depuis les registres publics</p>
						</div>
					</div>
				</section>

				<!-- Connexion rapide -->
				<section id="connexion-rapide" class="aide-section {searchQuery && !filteredSections.includes('connexion-rapide') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">login</span> Se connecter</h2>
					<div class="aide-content">
						<div class="aide-steps">
							<div class="aide-step">
								<div class="aide-step-number">1</div>
								<div>
									<p class="aide-step-title">Entrez votre adresse email</p>
									<p class="aide-step-desc">Sur la page de connexion, saisissez votre adresse <strong>@filmpro.ch</strong>.</p>
								</div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">2</div>
								<div>
									<p class="aide-step-title">Recevez votre code</p>
									<p class="aide-step-desc">Un <strong>code à 6 chiffres</strong> est envoyé à votre adresse email.</p>
								</div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">3</div>
								<div>
									<p class="aide-step-title">Saisissez le code</p>
									<p class="aide-step-desc">Entrez le code reçu pour accéder à l'application. Votre session reste active <strong>7 jours</strong>.</p>
								</div>
							</div>
						</div>

						<div class="aide-tip">
							<span class="material-symbols-outlined aide-tip-icon">info</span>
							<p>Seules les adresses <strong>@filmpro.ch</strong> sont autorisées. Si vous ne recevez pas le code, vérifiez vos spams ou attendez quelques instants avant de réessayer.</p>
						</div>
					</div>
				</section>

				<!-- Navigation rapide -->
				<section id="navigation-rapide" class="aide-section {searchQuery && !filteredSections.includes('navigation-rapide') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">explore</span> Naviguer dans l'application</h2>
					<div class="aide-content">
						<p>L'application s'organise autour de <strong>6 sections principales</strong> accessibles depuis la barre latérale :</p>

						<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
							{#each config.navigation.primary as nav}
								<div class="aide-nav-card">
									<span class="material-symbols-outlined text-primary text-[20px]">{nav.icon}</span>
									<span class="text-sm font-medium text-text">{nav.label}</span>
								</div>
							{/each}
						</div>

						<div class="aide-tip">
							<span class="material-symbols-outlined aide-tip-icon">smartphone</span>
							<p><strong>Sur mobile</strong> : la barre latérale est masquée. Appuyez sur l'icône menu en haut à gauche pour l'ouvrir.</p>
						</div>
					</div>
				</section>

				<!-- Premières actions -->
				<section id="premieres-actions" class="aide-section {searchQuery && !filteredSections.includes('premieres-actions') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">play_circle</span> Premières actions</h2>
					<div class="aide-content">
						<div class="space-y-4">
							<div class="aide-action-card">
								<div class="aide-action-number">1</div>
								<div>
									<p class="font-semibold text-text text-[15px]">Créez votre premier contact</p>
									<p class="text-sm text-text-body mt-1">Allez dans <strong>Contacts</strong>, cliquez <strong>Nouveau contact</strong>. Renseignez nom, prénom, entreprise, email, téléphone, fonction.</p>
								</div>
							</div>
							<div class="aide-action-card">
								<div class="aide-action-number">2</div>
								<div>
									<p class="font-semibold text-text text-[15px]">Ajoutez une entreprise</p>
									<p class="text-sm text-text-body mt-1">Allez dans <strong>Entreprises</strong>, cliquez <strong>Nouvelle entreprise</strong>. Renseignez la raison sociale, le secteur et le canton.</p>
								</div>
							</div>
							<div class="aide-action-card">
								<div class="aide-action-number">3</div>
								<div>
									<p class="font-semibold text-text text-[15px]">Créez une opportunité</p>
									<p class="text-sm text-text-body mt-1">Dans le <strong>Pipeline</strong>, cliquez <strong>Nouvelle opportunité</strong>. Rattachez-la à une entreprise et un contact existants.</p>
								</div>
							</div>
							<div class="aide-action-card">
								<div class="aide-action-number">4</div>
								<div>
									<p class="font-semibold text-text text-[15px]">Lancez une prospection</p>
									<p class="text-sm text-text-body mt-1">Dans <strong>Prospection</strong>, cliquez <strong>Importer</strong> pour détecter des leads depuis les registres publics suisses.</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- Astuces -->
				<section id="astuces" class="aide-section {searchQuery && !filteredSections.includes('astuces') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">lightbulb</span> Astuces</h2>
					<div class="aide-content">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="aide-tip-card">
								<span class="material-symbols-outlined text-warning text-[20px]">drag_indicator</span>
								<div>
									<p class="font-medium text-text text-sm">Glisser-déposer</p>
									<p class="text-[13px] text-text-body mt-0.5">Déplacez les cartes du pipeline d'une colonne à l'autre pour changer l'étape.</p>
								</div>
							</div>
							<div class="aide-tip-card">
								<span class="material-symbols-outlined text-info text-[20px]">dock_to_right</span>
								<div>
									<p class="font-medium text-text text-sm">Panneau latéral</p>
									<p class="text-[13px] text-text-body mt-0.5">Cliquez sur un élément dans une liste pour ouvrir sa fiche sans quitter la page.</p>
								</div>
							</div>
							<div class="aide-tip-card">
								<span class="material-symbols-outlined text-success text-[20px]">bookmark</span>
								<div>
									<p class="font-medium text-text text-sm">Recherches sauvegardées</p>
									<p class="text-[13px] text-text-body mt-0.5">Sauvegardez vos filtres de prospection pour recevoir des alertes automatiques.</p>
								</div>
							</div>
							<div class="aide-tip-card">
								<span class="material-symbols-outlined text-danger text-[20px]">notification_important</span>
								<div>
									<p class="font-medium text-text text-sm">Relances</p>
									<p class="text-[13px] text-text-body mt-0.5">Les opportunités en retard apparaissent en rouge et sur le tableau de bord.</p>
								</div>
							</div>
						</div>
					</div>
				</section>

			<!-- ==================== ONGLET GUIDE COMPLET ==================== -->
			{:else if activeTab === 'guide'}

				<!-- Connexion -->
				<section id="connexion" class="aide-section {searchQuery && !filteredSections.includes('connexion') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">login</span> Connexion</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Se connecter</h3>
						<p>Sur la page de connexion, entrez votre adresse <strong>@filmpro.ch</strong> et cliquez <strong>Recevoir mon code</strong>. Un <strong>code à 6 chiffres</strong> est envoyé par email. Saisissez-le pour accéder à l'application.</p>
						<p>Seules les adresses @filmpro.ch sont autorisées.</p>

						<div class="aide-tip mt-4">
							<span class="material-symbols-outlined aide-tip-icon">timer</span>
							<p>Votre session reste active pendant <strong>7 jours</strong>. Passé ce délai, vous devrez vous reconnecter avec un nouveau code.</p>
						</div>

						<h3 class="aide-h3">Se déconnecter</h3>
						<p>Cliquez le bouton <strong>Déconnexion</strong> en bas de la barre latérale. Sur mobile, ouvrez d'abord le menu.</p>
					</div>
				</section>

				<!-- Navigation -->
				<section id="navigation" class="aide-section {searchQuery && !filteredSections.includes('navigation') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">menu</span> Navigation</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Barre latérale</h3>
						<p>La barre latérale gauche donne accès aux 6 sections principales :</p>
						<ul class="aide-list">
							<li><strong>Dashboard</strong> : Vue d'ensemble, relances du jour, alertes</li>
							<li><strong>Contacts</strong> : Gestion des personnes</li>
							<li><strong>Entreprises</strong> : Fiches entreprises</li>
							<li><strong>Pipeline</strong> : Opportunités commerciales en kanban</li>
							<li><strong>Prospection</strong> : Leads B2B depuis sources publiques</li>
							<li><strong>Signaux</strong> : Signaux d'affaires détectés</li>
						</ul>
						<p>La section <strong>Aide</strong> est accessible en bas de la barre latérale.</p>

						<h3 class="aide-h3">Réduire la barre latérale</h3>
						<p>Cliquez la flèche en bas pour la réduire (icônes seules). Cliquez à nouveau pour la déployer.</p>

						<h3 class="aide-h3">Sur mobile</h3>
						<p>La barre latérale est masquée par défaut. Cliquez l'icône menu en haut à gauche pour l'ouvrir. Elle se ferme automatiquement après navigation.</p>
					</div>
				</section>

				<!-- Dashboard -->
				<section id="dashboard" class="aide-section {searchQuery && !filteredSections.includes('dashboard') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">dashboard</span> Tableau de bord</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Indicateurs</h3>
						<p>4 cartes affichent les compteurs en temps réel :</p>
						<div class="grid grid-cols-2 gap-3 my-4">
							<div class="aide-stat-card"><span class="material-symbols-outlined text-primary text-[18px]">contacts</span> Nombre de contacts</div>
							<div class="aide-stat-card"><span class="material-symbols-outlined text-primary text-[18px]">business</span> Nombre d'entreprises</div>
							<div class="aide-stat-card"><span class="material-symbols-outlined text-warning text-[18px]">conversion_path</span> Opportunités en cours</div>
							<div class="aide-stat-card"><span class="material-symbols-outlined text-danger text-[18px]">notifications</span> Signaux à traiter</div>
						</div>

						<h3 class="aide-h3">Relances du jour</h3>
						<p>Les opportunités dont la date de relance est aujourd'hui ou dépassée apparaissent dans un bandeau dédié. Cliquez sur une relance pour ouvrir le pipeline.</p>

						<h3 class="aide-h3">Alertes prospection</h3>
						<p>Si des recherches sauvegardées ont détecté de nouveaux leads, un bandeau orange s'affiche. Cliquez pour accéder à la prospection.</p>

						<h3 class="aide-h3">Activité récente</h3>
						<p>Les dernières actions (création, modification, transfert) sont listées avec leur date.</p>
					</div>
				</section>

				<!-- Contacts -->
				<section id="contacts" class="aide-section {searchQuery && !filteredSections.includes('contacts') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">contacts</span> Contacts</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Voir la liste</h3>
						<p>La page affiche tous les contacts dans un tableau triable. Utilisez la barre de recherche pour filtrer par nom, entreprise, email ou téléphone.</p>

						<h3 class="aide-h3">Créer un contact (saisie rapide)</h3>
						<p>Cliquez <strong>Nouveau contact</strong>. Les 6 champs principaux apparaissent : nom, prénom, entreprise, email, téléphone, fonction. Validez avec <strong>Enregistrer</strong>.</p>

						<h3 class="aide-h3">Voir la fiche</h3>
						<p>Cliquez sur un contact dans la liste. Le panneau latéral s'ouvre avec toutes les informations : coordonnées, entreprise rattachée, historique.</p>

						<h3 class="aide-h3">Modifier un contact</h3>
						<p>Dans le panneau latéral, cliquez <strong>Modifier</strong>. Le formulaire d'édition apparaît avec tous les champs.</p>

						<h3 class="aide-h3">Archiver</h3>
						<p>Dans le panneau latéral, cliquez <strong>Archiver</strong>. Le contact passe en statut archivé et n'apparaît plus dans la liste par défaut.</p>

						<h3 class="aide-h3">Prescripteur</h3>
						<p>Un prescripteur est un contact qui recommande vos services. Activez le badge prescripteur depuis la fiche du contact. Les prescripteurs sont identifiés par un badge violet dans la liste.</p>
					</div>
				</section>

				<!-- Entreprises -->
				<section id="entreprises" class="aide-section {searchQuery && !filteredSections.includes('entreprises') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">business</span> Entreprises</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Voir la liste</h3>
						<p>Toutes les entreprises dans un tableau triable avec recherche. Les colonnes affichent : raison sociale, secteur, canton, taille estimée, statut.</p>

						<h3 class="aide-h3">Créer une entreprise</h3>
						<p>Cliquez <strong>Nouvelle entreprise</strong>. Remplissez : raison sociale (obligatoire), secteur d'activité, canton, adresse, site web, notes.</p>

						<h3 class="aide-h3">Voir la fiche</h3>
						<p>Cliquez sur une entreprise pour ouvrir le panneau latéral. Vous y trouverez les détails et la liste des contacts rattachés.</p>

						<h3 class="aide-h3">Modifier / Supprimer</h3>
						<p>Depuis le panneau latéral : <strong>Modifier</strong> pour éditer, <strong>Supprimer</strong> pour retirer définitivement.</p>

						<div class="aide-warning mt-4">
							<span class="material-symbols-outlined aide-warning-icon">warning</span>
							<p>La suppression est <strong>irréversible</strong>. Les contacts rattachés ne sont pas supprimés mais perdent leur lien avec l'entreprise.</p>
						</div>
					</div>
				</section>

				<!-- Pipeline -->
				<section id="pipeline" class="aide-section {searchQuery && !filteredSections.includes('pipeline') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">conversion_path</span> Pipeline commercial</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Vue kanban</h3>
						<p>Le pipeline affiche vos opportunités en 6 colonnes :</p>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 my-4">
							{#each config.pipeline.etapes as etape}
								<div class="px-3 py-2.5 rounded-lg bg-surface-alt text-sm flex items-center gap-2 {etape.key === 'gagne' ? 'border border-success/30 bg-success-light' : etape.key === 'perdu' ? 'border border-danger/30 bg-danger-light' : ''}">
									<span class="material-symbols-outlined text-[16px] {etape.color}">{etape.icon}</span>
									<strong>{etape.label}</strong>
								</div>
							{/each}
						</div>
						<p>Chaque carte affiche : titre, entreprise, montant estimé, date de relance, contact. Le total des montants est visible en haut de chaque colonne.</p>

						<h3 class="aide-h3">Créer une opportunité</h3>
						<p>Cliquez <strong>Nouvelle opportunité</strong> en haut à droite, ou le <strong>+</strong> dans une colonne. Remplissez : titre (obligatoire), entreprise, contact, montant, étape, date de relance, responsable, notes.</p>

						<h3 class="aide-h3">Déplacer (changer d'étape)</h3>
						<p>Glissez-déposez une carte d'une colonne à l'autre. L'étape est mise à jour automatiquement.</p>

						<h3 class="aide-h3">Relances en retard</h3>
						<p>Les dates de relance dépassées apparaissent en rouge sur les cartes.</p>

						<h3 class="aide-h3">Modifier / Marquer perdu</h3>
						<p>Cliquez sur une carte pour ouvrir la fiche. Depuis là, vous pouvez modifier les détails ou marquer l'opportunité comme perdue.</p>
					</div>
				</section>

				<!-- Prospection -->
				<section id="prospection" class="aide-section {searchQuery && !filteredSections.includes('prospection') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">search</span> Prospection</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Comprendre le scoring</h3>
						<p>Chaque lead reçoit un score de pertinence automatique (0-13 points) :</p>
						<div class="overflow-x-auto my-4">
							<table class="aide-table">
								<thead>
									<tr>
										<th>Critère</th>
										<th>Points</th>
										<th>Détail</th>
									</tr>
								</thead>
								<tbody>
									<tr><td>Canton prioritaire</td><td class="font-medium">+3</td><td>GE, VD, VS</td></tr>
									<tr><td>Canton secondaire</td><td class="font-medium">+1</td><td>NE, FR, JU</td></tr>
									<tr><td>Secteur cible</td><td class="font-medium">+3</td><td>Construction, architecture, HVAC, électricité...</td></tr>
									<tr><td>Signal chaud</td><td class="font-medium">+2</td><td>Source SIMAP (appel d'offres)</td></tr>
									<tr><td>Récent (&lt; 30j)</td><td class="font-medium">+2</td><td>Date de publication</td></tr>
									<tr><td>Récent (&lt; 90j)</td><td class="font-medium">+1</td><td>Date de publication</td></tr>
									<tr><td>Téléphone disponible</td><td class="font-medium">+1</td><td>Numéro renseigné</td></tr>
									<tr><td>Montant &gt; 100k</td><td class="font-medium">+1</td><td>Montant estimé</td></tr>
								</tbody>
							</table>
						</div>
						<p>Badges de couleur :</p>
						<div class="flex flex-wrap gap-3 my-3">
							<span class="aide-badge aide-badge--hot">Chaud (8+ pts)</span>
							<span class="aide-badge aide-badge--warm">Tiède (5-7 pts)</span>
							<span class="aide-badge aide-badge--cold">Froid (2-4 pts)</span>
						</div>

						<h3 class="aide-h3">Sources disponibles</h3>
						<p>4 sources alimentent la prospection : registre du commerce (Zefix), marchés publics (SIMAP), registre des bâtiments (RegBL) et annuaire pour l'enrichissement (search.ch). Utilisez <strong>Importer des prospects</strong> pour lancer un import depuis une source.</p>

						<h3 class="aide-h3">Filtrer et trier</h3>
						<p>4 filtres disponibles en haut : source, canton, statut, score minimum. La barre de recherche filtre par texte dans toutes les colonnes. Cliquez un en-tête de colonne pour trier.</p>

						<h3 class="aide-h3">Qualifier (intéressé / écarté)</h3>
						<p>Ouvrez le détail d'un lead, puis cliquez <strong>Intéressé</strong> ou <strong>Écarter</strong>. Un lead écarté ne sera jamais réimporté depuis la même source.</p>

						<h3 class="aide-h3">Transférer vers le CRM</h3>
						<p>Cliquez <strong>Transférer vers CRM</strong> dans la fiche du lead. Cela crée automatiquement une fiche entreprise (et un contact si le nom est renseigné). Le lead passe en statut « transféré ».</p>

						<h3 class="aide-h3">Importer depuis des sources publiques</h3>
						<p>Cliquez <strong>Importer</strong> en haut à droite. Choisissez une source :</p>
						<ul class="aide-list">
							<li><strong>Registre du commerce</strong> : Entreprises suisses avec but social, capital nominal et informations légales (source technique : API Zefix)</li>
							<li><strong>Marchés publics</strong> : Appels d'offres construction par canton et période (source technique : SIMAP)</li>
							<li><strong>Registre des bâtiments</strong> : Bâtiments autorisés ou en construction par canton (source technique : RegBL / geo.admin.ch)</li>
							<li><strong>Annuaire</strong> : Enrichissement des numéros de téléphone (source technique : search.ch)</li>
						</ul>
						<p>Les doublons sont détectés automatiquement. Les leads écartés ou transférés ne sont jamais réimportés. Les leads sans canton reconnu sont exclus à l'import.</p>

						<h3 class="aide-h3">Enrichir (téléphone)</h3>
						<p>Sur un lead sans téléphone, cliquez <strong>Enrichir téléphone</strong>. Le système cherche dans l'annuaire suisse et met à jour la fiche. Le score est recalculé (+1 pt si téléphone trouvé).</p>

						<h3 class="aide-h3">Recherches sauvegardées</h3>
						<p>Configurez vos filtres, puis cliquez <strong>Créer une alerte</strong>. Donnez un nom, choisissez la fréquence (quotidienne ou hebdomadaire), et activez les notifications.</p>
						<p>Pour recharger une recherche : cliquez <strong>Mes recherches</strong> et sélectionnez-la. Un badge orange indique les nouveaux leads.</p>

						<h3 class="aide-h3">Sélection multiple</h3>
						<p>Cochez plusieurs leads, puis utilisez la barre d'actions : <strong>Intéressé</strong> ou <strong>Écarter</strong> en lot.</p>
					</div>
				</section>

				<!-- Signaux -->
				<section id="signaux" class="aide-section {searchQuery && !filteredSections.includes('signaux') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">notifications</span> Signaux d'affaires</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Comprendre les signaux</h3>
						<p>Les signaux sont des informations détectées depuis des sources publiques : appels d'offres, permis de construire, créations d'entreprise.</p>

						<h3 class="aide-h3">Types de signaux</h3>
						<div class="flex flex-wrap gap-2 my-3">
							{#each config.signaux.types as type}
								<span class="px-3 py-1.5 rounded-full bg-surface-alt text-[13px] text-text-body border border-border">{type.label}</span>
							{/each}
						</div>

						<h3 class="aide-h3">Consulter et filtrer</h3>
						<p>La liste affiche : type, description, maître d'ouvrage, canton, date, statut. Filtrez par type de signal, canton ou statut via les menus déroulants.</p>

						<h3 class="aide-h3">Convertir en opportunité</h3>
						<p>Ouvrez un signal, cliquez <strong>Créer opportunité</strong>. Donnez un titre et validez. Le signal passe en « converti » et l'opportunité apparaît dans le pipeline (étape Identification).</p>

						<h3 class="aide-h3">Écarter un signal</h3>
						<p>Cliquez <strong>Écarter</strong> dans la fiche. Le signal ne sera plus proposé.</p>

						<h3 class="aide-h3">Statuts</h3>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
							<div class="aide-status-badge"><span class="w-2 h-2 rounded-full bg-info"></span> Nouveau</div>
							<div class="aide-status-badge"><span class="w-2 h-2 rounded-full bg-warning"></span> En analyse</div>
							<div class="aide-status-badge"><span class="w-2 h-2 rounded-full bg-success"></span> Intéressé</div>
							<div class="aide-status-badge"><span class="w-2 h-2 rounded-full bg-border-strong"></span> Écarté</div>
							<div class="aide-status-badge"><span class="w-2 h-2 rounded-full bg-primary"></span> Converti</div>
						</div>
					</div>
				</section>

			<!-- ==================== ONGLET RÉFÉRENTIEL TECHNIQUE ==================== -->
			{:else}

				<!-- Architecture -->
				<section id="tech-architecture" class="aide-section {searchQuery && !filteredSections.includes('tech-architecture') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">account_tree</span> Architecture</h2>
					<div class="aide-content">
						<div class="aide-code-block">
							<pre>Navigateur (SvelteKit SSR)
  |  HTTPS
SvelteKit sur Vercel (Fluid Compute)
  |  supabase-js
Supabase (PostgreSQL + Auth + API REST)
  |  cron quotidien
APIs externes (Zefix, SIMAP, search.ch)</pre>
						</div>

						<h3 class="aide-h3">Principes</h3>
						<ul class="aide-list">
							<li><strong>SSR par défaut</strong> : Toutes les pages sont rendues côté serveur pour la performance et le SEO</li>
							<li><strong>Form actions</strong> : Les mutations passent par les form actions SvelteKit (pas de fetch client)</li>
							<li><strong>RLS</strong> : Row Level Security activée sur toutes les tables (authenticated = full access)</li>
							<li><strong>Validation Zod</strong> : Toutes les entrées utilisateur sont validées côté serveur</li>
						</ul>
					</div>
				</section>

				<!-- Stack -->
				<section id="tech-stack" class="aide-section {searchQuery && !filteredSections.includes('tech-stack') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">layers</span> Stack technique</h2>
					<div class="aide-content">
						<div class="overflow-x-auto">
							<table class="aide-table">
								<thead><tr><th>Composant</th><th>Version</th><th>Rôle</th></tr></thead>
								<tbody>
									<tr><td>SvelteKit</td><td>^2.50</td><td>Framework frontend + SSR</td></tr>
									<tr><td>Svelte</td><td>^5.54</td><td>Composants UI (runes)</td></tr>
									<tr><td>Tailwind CSS</td><td>^4.2</td><td>Styles utilitaires</td></tr>
									<tr><td>Supabase</td><td>–</td><td>BDD + Auth + API REST</td></tr>
									<tr><td>Vercel</td><td>adapter-vercel ^6.3</td><td>Hébergement + CDN</td></tr>
									<tr><td>Node.js</td><td>24.x</td><td>Runtime Vercel</td></tr>
									<tr><td>Vitest</td><td>–</td><td>Tests unitaires (129 tests)</td></tr>
									<tr><td>Playwright</td><td>–</td><td>Tests e2e (5 tests)</td></tr>
								</tbody>
							</table>
						</div>
					</div>
				</section>

				<!-- BDD -->
				<section id="tech-bdd" class="aide-section {searchQuery && !filteredSections.includes('tech-bdd') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">database</span> Base de données</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Tables CRM</h3>
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
							{#each ['contacts', 'entreprises', 'opportunites', 'prescripteurs', 'signaux_affaires', 'activites', 'imports_zefix', 'utilisateurs'] as table}
								<div class="aide-table-badge">
									<span class="material-symbols-outlined text-[14px] text-primary">table_chart</span>
									{table}
								</div>
							{/each}
						</div>

						<h3 class="aide-h3">Tables Prospection</h3>
						<div class="grid grid-cols-2 gap-2 my-3">
							<div class="aide-table-badge">
								<span class="material-symbols-outlined text-[14px] text-warning">table_chart</span>
								prospect_leads
							</div>
							<div class="aide-table-badge">
								<span class="material-symbols-outlined text-[14px] text-warning">table_chart</span>
								recherches_sauvegardees
							</div>
						</div>

						<h3 class="aide-h3">Régénérer les types TypeScript</h3>
						<div class="aide-code-block">
							<pre>cd template
npx supabase gen types typescript \
  --project-id fmflvjubjtpidvxwhqab \
  > src/lib/database.types.ts</pre>
						</div>

						<h3 class="aide-h3">Migrations</h3>
						<ul class="aide-list">
							<li><code>20260402_001_schema_filmpro.sql</code> : 8 tables CRM initiales</li>
							<li><code>20260403_001_prospect_leads.sql</code> : Tables prospection + RLS + index</li>
						</ul>
					</div>
				</section>

				<!-- Auth -->
				<section id="tech-auth" class="aide-section {searchQuery && !filteredSections.includes('tech-auth') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">lock</span> Authentification</h2>
					<div class="aide-content">
						<div class="aide-tip mb-4">
							<span class="material-symbols-outlined aide-tip-icon">info</span>
							<p>L'authentification utilise l'<strong>OTP par email</strong> via Supabase Auth (signInWithOtp). Pas de mot de passe, pas de Google OAuth, pas de MFA TOTP.</p>
						</div>

						<h3 class="aide-h3">Flux de connexion</h3>
						<div class="aide-steps">
							<div class="aide-step">
								<div class="aide-step-number">1</div>
								<div>
									<p class="aide-step-title">Validation du domaine</p>
									<p class="aide-step-desc">Le serveur vérifie que l'email appartient au domaine <code>@filmpro.ch</code> (form action, impossible à contourner).</p>
								</div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">2</div>
								<div>
									<p class="aide-step-title">Envoi du code OTP</p>
									<p class="aide-step-desc">Supabase envoie un code à 6 chiffres via SMTP Resend (noreply@filmpro.ch).</p>
								</div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">3</div>
								<div>
									<p class="aide-step-title">Vérification + session</p>
									<p class="aide-step-desc">Le code est vérifié par Supabase. Un cookie <code>login_at</code> (httpOnly) est posé pour limiter la session à 7 jours.</p>
								</div>
							</div>
						</div>

						<h3 class="aide-h3">Protection des routes</h3>
						<ul class="aide-list">
							<li><code>hooks.server.ts</code> : Redirige vers <code>/login</code> si pas de session</li>
							<li>Allowlist explicite : <code>/login</code>, <code>/auth/callback</code></li>
							<li>Cookie <code>login_at</code> vérifié à chaque requête (max 7 jours)</li>
						</ul>

						<h3 class="aide-h3">Variables d'environnement</h3>
						<div class="aide-code-block">
							<pre>ALLOWED_DOMAINS=filmpro.ch
ALLOWED_EMAILS=pascal@filmpro.ch,antoine@filmpro.ch</pre>
						</div>
					</div>
				</section>

				<!-- APIs externes -->
				<section id="tech-api" class="aide-section {searchQuery && !filteredSections.includes('tech-api') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">api</span> APIs externes</h2>
					<div class="aide-content">
						<div class="overflow-x-auto">
							<table class="aide-table">
								<thead><tr><th>API</th><th>Usage</th><th>Auth</th><th>Quota</th><th>Route</th></tr></thead>
								<tbody>
									<tr><td>Zefix REST</td><td>Registre du commerce (entreprises)</td><td>Basic Auth</td><td>Pas de quota publié, max 500/requête</td><td><code>/api/prospection/zefix</code></td></tr>
									<tr><td>SIMAP</td><td>Marchés publics construction</td><td>Aucune</td><td>Pas de quota publié, accès gratuit</td><td><code>/api/prospection/simap</code></td></tr>
									<tr><td>search.ch</td><td>Enrichissement téléphone</td><td>Clé API</td><td><strong>1 000 requêtes/mois</strong>, max 200/requête</td><td><code>/api/prospection/search-ch</code></td></tr>
								</tbody>
							</table>
							<p class="text-xs text-text-muted mt-2">
								<span class="material-symbols-outlined text-[14px] align-text-bottom">info</span>
								search.ch est la seule API avec un quota mensuel strict. L'enrichissement batch affiche un avertissement si le nombre de prospects risque d'épuiser le quota. En cas de dépassement, l'enrichissement s'interrompt automatiquement avec un message explicatif.
							</p>
						</div>

						<h3 class="aide-h3">Variables d'environnement API</h3>
						<div class="overflow-x-auto mt-3">
							<table class="aide-table">
								<thead><tr><th>Variable</th><th>Service</th><th>Statut</th></tr></thead>
								<tbody>
									<tr><td><code>ZEFIX_USERNAME</code></td><td>Zefix REST</td><td><span class="text-success font-medium">Configuré</span></td></tr>
									<tr><td><code>ZEFIX_PASSWORD</code></td><td>Zefix REST</td><td><span class="text-success font-medium">Configuré</span></td></tr>
									<tr><td><code>SEARCH_CH_API_KEY</code></td><td>search.ch</td><td><span class="text-success font-medium">Configuré</span></td></tr>
									<tr><td><code>CRON_SECRET</code></td><td>Cron sécurisé</td><td><span class="text-success font-medium">Configuré</span></td></tr>
									<tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td>Bypass RLS (cron)</td><td><span class="text-success font-medium">Configuré</span></td></tr>
								</tbody>
							</table>
						</div>
					</div>
				</section>

				<!-- Déploiement -->
				<section id="tech-deploy" class="aide-section {searchQuery && !filteredSections.includes('tech-deploy') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">cloud_upload</span> Déploiement</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Environnements</h3>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
							<div class="aide-env-card">
								<div class="flex items-center gap-2 mb-2">
									<span class="w-2.5 h-2.5 rounded-full bg-success"></span>
									<span class="font-semibold text-text">Production</span>
								</div>
								<p class="text-[13px] text-text-body">Push sur <code>main</code> → deploy auto</p>
								<p class="text-[13px] text-text-muted mt-1">filmpro-crm.vercel.app</p>
							</div>
							<div class="aide-env-card">
								<div class="flex items-center gap-2 mb-2">
									<span class="w-2.5 h-2.5 rounded-full bg-warning"></span>
									<span class="font-semibold text-text">Preview</span>
								</div>
								<p class="text-[13px] text-text-body">Push sur branche → URL preview auto</p>
								<p class="text-[13px] text-text-muted mt-1">Chaque branche a sa propre URL</p>
							</div>
						</div>

						<h3 class="aide-h3">Root directory</h3>
						<p>Le projet Vercel pointe sur le dossier <code>template/</code>. Les commits hors <code>template/</code> ne déclenchent pas de build (skip deployments actif).</p>

						<h3 class="aide-h3">SMTP</h3>
						<p>Resend (free plan permanent, 3000 emails/mois). Domaine filmpro.ch vérifié, sender <code>noreply@filmpro.ch</code>. DNS Infomaniak (DKIM + MX + SPF).</p>
					</div>
				</section>

				<!-- Cron -->
				<section id="tech-cron" class="aide-section {searchQuery && !filteredSections.includes('tech-cron') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">schedule</span> Tâches planifiées</h2>
					<div class="aide-content">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
							<div class="aide-env-card">
								<div class="flex items-center gap-2 mb-2">
									<span class="material-symbols-outlined text-primary text-[18px]">monitoring</span>
									<span class="font-semibold text-text">Veille signaux</span>
								</div>
								<p class="text-[13px] text-text-body"><code>/api/cron/signaux</code></p>
								<p class="text-[13px] text-text-muted mt-1">Quotidien à 6h : Zefix + SIMAP</p>
							</div>
							<div class="aide-env-card">
								<div class="flex items-center gap-2 mb-2">
									<span class="material-symbols-outlined text-warning text-[18px]">notifications_active</span>
									<span class="font-semibold text-text">Alertes prospection</span>
								</div>
								<p class="text-[13px] text-text-body"><code>/api/cron/alertes</code></p>
								<p class="text-[13px] text-text-muted mt-1">Quotidien à 7h : recherches sauvegardées</p>
							</div>
						</div>

						<div class="aide-tip">
							<span class="material-symbols-outlined aide-tip-icon">security</span>
							<p>Les crons sont sécurisés par <code>CRON_SECRET</code> (Bearer token, timing-safe). Ils utilisent le <code>service_role</code> client pour bypasser RLS.</p>
						</div>
					</div>
				</section>

				<!-- Sécurité -->
				<section id="tech-securite" class="aide-section {searchQuery && !filteredSections.includes('tech-securite') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">shield</span> Sécurité</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Mesures en place</h3>
						<div class="space-y-2 my-4">
							{#each [
								{ icon: 'check_circle', text: 'OTP email @filmpro.ch (validation domaine serveur)' },
								{ icon: 'check_circle', text: 'Session max 7 jours (cookie httpOnly login_at)' },
								{ icon: 'check_circle', text: 'Validation Zod sur toutes les form actions (19 actions)' },
								{ icon: 'check_circle', text: 'Rate limiting 10 req/min/IP sur /api/prospection/*' },
								{ icon: 'check_circle', text: 'Headers sécurité : CSP, X-Frame-Options DENY, nosniff, Referrer-Policy' },
								{ icon: 'check_circle', text: 'CRON_SECRET timing-safe (crypto.timingSafeEqual)' },
								{ icon: 'check_circle', text: 'Erreurs Supabase génériques côté client' },
								{ icon: 'check_circle', text: 'Protection JSON.parse et validation des entrées API' },
								{ icon: 'check_circle', text: 'Boutons destructifs désactivés après clic (anti double soumission)' },
							] as item}
								<div class="flex items-start gap-2.5">
									<span class="material-symbols-outlined text-success text-[18px] mt-0.5">{item.icon}</span>
									<p class="text-sm text-text-body">{item.text}</p>
								</div>
							{/each}
						</div>

						<h3 class="aide-h3">Tests automatisés</h3>
						<ul class="aide-list">
							<li><strong>129 tests Vitest</strong> : scoring, schemas Zod (19/19), validation, API helpers, 16 tests auth email</li>
							<li><strong>5 tests Playwright</strong> : navigation, redirection auth</li>
						</ul>
					</div>
				</section>

				<!-- Procédures -->
				<section id="tech-procedures" class="aide-section {searchQuery && !filteredSections.includes('tech-procedures') ? 'hidden' : ''}">
					<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">checklist</span> Procédures</h2>
					<div class="aide-content">
						<h3 class="aide-h3">Ajouter une nouvelle table</h3>
						<div class="aide-steps">
							<div class="aide-step">
								<div class="aide-step-number">1</div>
								<div><p class="aide-step-desc">Créer la migration SQL dans <code>supabase/migrations/</code></p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">2</div>
								<div><p class="aide-step-desc">Activer RLS et ajouter la policy <code>authenticated</code></p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">3</div>
								<div><p class="aide-step-desc">Régénérer les types TS (<code>supabase gen types</code>)</p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">4</div>
								<div><p class="aide-step-desc">Créer la route SvelteKit (page + form actions)</p></div>
							</div>
						</div>

						<h3 class="aide-h3">Ajouter une source de prospection</h3>
						<div class="aide-steps">
							<div class="aide-step">
								<div class="aide-step-number">1</div>
								<div><p class="aide-step-desc">Créer la route API dans <code>src/routes/api/prospection/{'{source}'}/</code></p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">2</div>
								<div><p class="aide-step-desc">Mapper les données vers le format <code>prospect_leads</code></p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">3</div>
								<div><p class="aide-step-desc">Ajouter la source dans <code>config.ts</code> et le composant ImportModal</p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">4</div>
								<div><p class="aide-step-desc">Configurer les variables d'env si authentification requise</p></div>
							</div>
						</div>

						<h3 class="aide-h3">Modifier le scoring</h3>
						<p>Le scoring est configuré dans <code>project.yaml</code> (source de vérité) et <code>src/lib/config.ts</code> (miroir TS). Modifier les deux en cohérence.</p>
						<p>La fonction <code>calculerScore()</code> dans <code>src/lib/scoring.ts</code> lit la config : pas besoin de la modifier sauf changement de logique.</p>

						<h3 class="aide-h3">Personnaliser pour un nouveau client</h3>
						<div class="aide-steps">
							<div class="aide-step">
								<div class="aide-step-number">1</div>
								<div><p class="aide-step-desc">Copier le template</p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">2</div>
								<div><p class="aide-step-desc">Modifier <code>project.yaml</code> et <code>config.ts</code> (branding, scoring, pipeline, sources)</p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">3</div>
								<div><p class="aide-step-desc">Remplacer les logos dans <code>static/</code></p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">4</div>
								<div><p class="aide-step-desc">Mettre à jour <code>app.css</code> (couleurs @theme)</p></div>
							</div>
							<div class="aide-step">
								<div class="aide-step-number">5</div>
								<div><p class="aide-step-desc">Déployer sur Vercel</p></div>
							</div>
						</div>
					</div>
				</section>

			{/if}
		</div>
	</div>
</div>

<style>
	/* ===== TABS ===== */
	.aide-tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.aide-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 1.25rem 1rem;
		border-radius: var(--radius-xl);
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		cursor: pointer;
		transition: all 0.2s;
	}

	.aide-tab:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.aide-tab--active {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
		box-shadow: var(--shadow-sm);
	}

	.aide-tab-icon {
		font-size: 24px;
		color: var(--color-primary);
	}

	.aide-tab-label {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.aide-tab-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	/* ===== TOC ===== */
	.aide-toc {
		width: 200px;
		flex-shrink: 0;
	}

	.aide-toc-mobile {
		display: none;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 1023px) {
		.aide-toc {
			display: none;
		}

		.aide-toc-mobile {
			display: flex;
		}
	}

	/* ===== SECTIONS ===== */
	.aide-section {
		scroll-margin-top: 80px;
	}

	.aide-h2 {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text);
		padding-bottom: 0.75rem;
		border-bottom: 2px solid var(--color-border);
		margin-bottom: 1.25rem;
	}

	.aide-icon {
		font-size: 24px;
		color: var(--color-primary);
	}

	.aide-h3 {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
		margin-top: 1.75rem;
		margin-bottom: 0.625rem;
	}

	.aide-content p {
		color: var(--color-text-body);
		font-size: 0.875rem;
		line-height: 1.7;
		margin-bottom: 0.5rem;
	}

	.aide-list {
		list-style: none;
		padding-left: 0;
		color: var(--color-text-body);
		font-size: 0.875rem;
		line-height: 1.8;
		margin-bottom: 0.75rem;
	}

	.aide-list li {
		padding-left: 1.5rem;
		position: relative;
		margin-bottom: 0.375rem;
	}

	.aide-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.625rem;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-primary);
		opacity: 0.5;
	}

	/* ===== HERO ===== */
	.aide-hero {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1.5rem;
		background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%);
		border-radius: var(--radius-xl);
		border: 1px solid var(--color-border);
	}

	.aide-hero-icon {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-lg);
		background: var(--color-primary);
		color: white;
		flex-shrink: 0;
	}

	.aide-hero-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: 0.25rem;
	}

	.aide-hero-desc {
		font-size: 0.875rem;
		color: var(--color-text-body);
		line-height: 1.5;
	}

	/* ===== CARDS ===== */
	.aide-card {
		padding: 1.25rem;
		border-radius: var(--radius-xl);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		transition: box-shadow 0.2s;
	}

	.aide-card:hover {
		box-shadow: var(--shadow-md);
	}

	.aide-card-icon {
		font-size: 28px;
		margin-bottom: 0.75rem;
		display: block;
	}

	.aide-card-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.25rem;
	}

	.aide-card-desc {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	/* ===== STEPS ===== */
	.aide-steps {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 1rem 0;
	}

	.aide-step {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.aide-step-number {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-primary);
		color: white;
		font-size: 0.8125rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.aide-step-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.125rem;
	}

	.aide-step-desc {
		font-size: 0.8125rem;
		color: var(--color-text-body);
		line-height: 1.6;
	}

	/* ===== TIP / WARNING ===== */
	.aide-tip {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-lg);
		background: var(--color-info-light);
		border-left: 3px solid var(--color-info);
	}

	.aide-tip-icon {
		font-size: 20px;
		color: var(--color-info);
		flex-shrink: 0;
		margin-top: 1px;
	}

	.aide-tip p {
		font-size: 0.8125rem !important;
		color: var(--color-text-body) !important;
		line-height: 1.6;
		margin: 0 !important;
	}

	.aide-warning {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-lg);
		background: var(--color-warning-light);
		border-left: 3px solid var(--color-warning);
	}

	.aide-warning-icon {
		font-size: 20px;
		color: var(--color-warning);
		flex-shrink: 0;
		margin-top: 1px;
	}

	.aide-warning p {
		font-size: 0.8125rem !important;
		color: var(--color-text-body) !important;
		line-height: 1.6;
		margin: 0 !important;
	}

	/* ===== ACTION CARDS ===== */
	.aide-action-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.aide-action-number {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-size: 0.8125rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	/* ===== TIP CARDS ===== */
	.aide-tip-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
	}

	/* ===== NAV CARDS ===== */
	.aide-nav-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
	}

	/* ===== STAT CARDS ===== */
	.aide-stat-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		border-radius: var(--radius-md);
		background: var(--color-surface-alt);
		font-size: 0.8125rem;
		color: var(--color-text-body);
	}

	/* ===== TABLE ===== */
	.aide-table {
		width: 100%;
		font-size: 0.8125rem;
		border-collapse: collapse;
	}

	.aide-table th {
		text-align: left;
		padding: 0.625rem 0.875rem;
		background: var(--color-surface-alt);
		border-bottom: 2px solid var(--color-border);
		font-weight: 600;
		color: var(--color-text);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.aide-table td {
		padding: 0.5rem 0.875rem;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-body);
	}

	/* ===== BADGES ===== */
	.aide-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.875rem;
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.aide-badge--hot {
		background: var(--color-danger-light);
		color: var(--color-danger);
		border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
	}

	.aide-badge--warm {
		background: var(--color-warning-light);
		color: var(--color-warning);
		border: 1px solid color-mix(in srgb, var(--color-warning) 20%, transparent);
	}

	.aide-badge--cold {
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}

	.aide-status-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		background: var(--color-surface-alt);
		font-size: 0.8125rem;
		color: var(--color-text-body);
	}

	/* ===== TABLE BADGES ===== */
	.aide-table-badge {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		background: var(--color-surface-alt);
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--color-text-body);
		border: 1px solid var(--color-border);
	}

	/* ===== CODE BLOCK ===== */
	.aide-code-block {
		padding: 1rem 1.25rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface-dark);
		overflow-x: auto;
		margin: 0.75rem 0;
	}

	.aide-code-block pre {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--color-text-inverse);
		line-height: 1.7;
		margin: 0;
		white-space: pre;
	}

	/* ===== ENV CARDS ===== */
	.aide-env-card {
		padding: 1.25rem;
		border-radius: var(--radius-xl);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	/* ===== MOBILE TABS ===== */
	@media (max-width: 639px) {
		.aide-tabs {
			gap: 0.5rem;
		}

		.aide-tab {
			padding: 0.875rem 0.5rem;
		}

		.aide-tab-desc {
			display: none;
		}

		.aide-tab-icon {
			font-size: 20px;
		}

		.aide-tab-label {
			font-size: 0.8125rem;
		}

		.aide-hero {
			flex-direction: column;
			text-align: center;
		}
	}
</style>
