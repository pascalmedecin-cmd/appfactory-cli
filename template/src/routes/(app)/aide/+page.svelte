<script lang="ts">
	import { config } from '$lib/config';

	let searchQuery = $state('');
	let activeSection = $state('');

	const sections = [
		{ id: 'connexion', label: 'Connexion', icon: 'login' },
		{ id: 'navigation', label: 'Navigation', icon: 'menu' },
		{ id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
		{ id: 'contacts', label: 'Contacts', icon: 'contacts' },
		{ id: 'entreprises', label: 'Entreprises', icon: 'business' },
		{ id: 'pipeline', label: 'Pipeline commercial', icon: 'filter_list' },
		{ id: 'prospection', label: 'Prospection', icon: 'search' },
		{ id: 'signaux', label: 'Signaux d\'affaires', icon: 'notifications' },
	];

	// Track which sections match search
	const filteredSections = $derived.by(() => {
		if (!searchQuery.trim()) return sections.map(s => s.id);
		const q = searchQuery.toLowerCase();
		const matches: string[] = [];
		// Check each content block via DOM
		for (const section of sections) {
			const el = document.getElementById(section.id);
			if (el && el.textContent?.toLowerCase().includes(q)) {
				matches.push(section.id);
			}
		}
		// Also match section labels
		for (const section of sections) {
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
		for (const section of sections) {
			const el = document.getElementById(section.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-text">Aide</h1>
		<p class="mt-1 text-text-muted">Documentation utilisateur {config.app.name}</p>
	</div>

	<!-- Search -->
	<div class="relative mb-6">
		<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
		<input
			type="text"
			placeholder="Rechercher dans l'aide..."
			bind:value={searchQuery}
			class="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		/>
		{#if searchQuery}
			<button
				onclick={() => searchQuery = ''}
				class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">close</span>
			</button>
		{/if}
		{#if searchQuery && filteredSections.length === 0}
			<p class="mt-2 text-sm text-text-muted">Aucun resultat pour "{searchQuery}"</p>
		{/if}
	</div>

	<div class="flex gap-6">
		<!-- Sidebar TOC (desktop) -->
		<nav class="hidden lg:block w-48 shrink-0">
			<div class="sticky top-20">
				<p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Sommaire</p>
				<ul class="space-y-1">
					{#each sections as section}
						{#if !searchQuery || filteredSections.includes(section.id)}
							<li>
								<button
									onclick={() => scrollTo(section.id)}
									class="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm transition-colors cursor-pointer
										{activeSection === section.id ? 'bg-primary-light text-primary font-medium' : 'text-text-body hover:bg-surface-alt'}"
								>
									<span class="material-symbols-outlined text-[16px]">{section.icon}</span>
									{section.label}
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		</nav>

		<!-- Content -->
		<div class="flex-1 min-w-0 space-y-8">

			<!-- Connexion -->
			<section id="connexion" class="aide-section {searchQuery && !filteredSections.includes('connexion') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">login</span> Connexion</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Se connecter</h3>
					<p>Sur la page de login, entrez votre adresse <strong>@filmpro.ch</strong> et cliquez <strong>Recevoir le lien de connexion</strong>. Un email contenant un lien sécurisé vous sera envoyé.</p>
					<p>Seules les adresses @filmpro.ch sont autorisées.</p>

					<h3 class="aide-h3">Se deconnecter</h3>
					<p>Cliquez le bouton <strong>Deconnexion</strong> en bas de la sidebar (icone logout). Sur mobile, ouvrez d'abord le menu hamburger.</p>
				</div>
			</section>

			<!-- Navigation -->
			<section id="navigation" class="aide-section {searchQuery && !filteredSections.includes('navigation') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">menu</span> Navigation</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Sidebar</h3>
					<p>La barre laterale gauche donne acces aux 6 sections principales :</p>
					<ul class="aide-list">
						<li><strong>Dashboard</strong> — Vue d'ensemble, relances du jour, alertes</li>
						<li><strong>Contacts</strong> — Gestion des personnes</li>
						<li><strong>Entreprises</strong> — Fiches entreprises</li>
						<li><strong>Pipeline</strong> — Opportunites commerciales en kanban</li>
						<li><strong>Prospection</strong> — Leads B2B depuis sources publiques</li>
						<li><strong>Signaux</strong> — Signaux d'affaires detectes</li>
					</ul>
					<p>La section <strong>Aide</strong> est accessible en bas de la sidebar.</p>

					<h3 class="aide-h3">Reduire la sidebar</h3>
					<p>Cliquez la fleche en bas de la sidebar pour la reduire (icones seules). Cliquez a nouveau pour la deployer.</p>

					<h3 class="aide-h3">Sur mobile</h3>
					<p>La sidebar est masquee par defaut. Cliquez l'icone menu (hamburger) en haut a gauche pour l'ouvrir. Elle se ferme automatiquement apres navigation.</p>
				</div>
			</section>

			<!-- Dashboard -->
			<section id="dashboard" class="aide-section {searchQuery && !filteredSections.includes('dashboard') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">dashboard</span> Tableau de bord</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Indicateurs</h3>
					<p>4 cartes en haut de page affichent les compteurs en temps reel :</p>
					<ul class="aide-list">
						<li>Nombre de contacts</li>
						<li>Nombre d'entreprises</li>
						<li>Opportunites en cours (hors Gagne/Perdu)</li>
						<li>Signaux neufs a traiter</li>
					</ul>

					<h3 class="aide-h3">Relances du jour</h3>
					<p>Les opportunites dont la date de relance est aujourd'hui ou depassee apparaissent dans un bandeau dedie. Cliquez sur une relance pour ouvrir le pipeline.</p>

					<h3 class="aide-h3">Alertes prospection</h3>
					<p>Si des recherches sauvegardees ont detecte de nouveaux leads, un bandeau orange s'affiche avec le nombre de leads. Cliquez pour acceder a la prospection.</p>

					<h3 class="aide-h3">Activite recente</h3>
					<p>Les dernieres actions (creation, modification, transfert) sont listees avec leur date.</p>
				</div>
			</section>

			<!-- Contacts -->
			<section id="contacts" class="aide-section {searchQuery && !filteredSections.includes('contacts') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">contacts</span> Contacts</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Voir la liste</h3>
					<p>La page affiche tous les contacts dans un tableau triable. Utilisez la barre de recherche pour filtrer par nom, entreprise, email ou telephone.</p>

					<h3 class="aide-h3">Creer un contact (saisie rapide)</h3>
					<p>Cliquez <strong>Nouveau contact</strong>. Les 6 champs principaux apparaissent : nom, prenom, entreprise, email, telephone, fonction. Validez avec <strong>Enregistrer</strong>.</p>

					<h3 class="aide-h3">Voir la fiche</h3>
					<p>Cliquez sur un contact dans la liste. Le panneau lateral s'ouvre avec toutes les informations : coordonnees, entreprise rattachee, historique.</p>

					<h3 class="aide-h3">Modifier un contact</h3>
					<p>Dans le panneau lateral, cliquez <strong>Modifier</strong>. Le formulaire d'edition apparait avec tous les champs.</p>

					<h3 class="aide-h3">Archiver</h3>
					<p>Dans le panneau lateral, cliquez <strong>Archiver</strong>. Le contact passe en statut archive et n'apparait plus dans la liste par defaut.</p>

					<h3 class="aide-h3">Prescripteur</h3>
					<p>Un prescripteur est un contact qui recommande vos services. Activez le badge prescripteur depuis la fiche du contact. Les prescripteurs sont identifies par un badge violet dans la liste.</p>
				</div>
			</section>

			<!-- Entreprises -->
			<section id="entreprises" class="aide-section {searchQuery && !filteredSections.includes('entreprises') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">business</span> Entreprises</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Voir la liste</h3>
					<p>Toutes les entreprises dans un tableau triable avec recherche. Les colonnes affichent : raison sociale, secteur, canton, taille estimee, statut.</p>

					<h3 class="aide-h3">Creer une entreprise</h3>
					<p>Cliquez <strong>Nouvelle entreprise</strong>. Remplissez : raison sociale (obligatoire), secteur d'activite, canton, adresse, site web, notes.</p>

					<h3 class="aide-h3">Voir la fiche</h3>
					<p>Cliquez sur une entreprise pour ouvrir le panneau lateral. Vous y trouverez les details de l'entreprise et la liste des contacts rattaches.</p>

					<h3 class="aide-h3">Modifier / Supprimer</h3>
					<p>Depuis le panneau lateral : <strong>Modifier</strong> pour editer, <strong>Supprimer</strong> pour retirer definitivement (attention, action irreversible).</p>
				</div>
			</section>

			<!-- Pipeline -->
			<section id="pipeline" class="aide-section {searchQuery && !filteredSections.includes('pipeline') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">filter_list</span> Pipeline commercial</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Vue kanban</h3>
					<p>Le pipeline affiche vos opportunites en 6 colonnes :</p>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
						<div class="px-3 py-2 rounded bg-surface-alt text-sm"><strong>Identification</strong> — Lead detecte</div>
						<div class="px-3 py-2 rounded bg-surface-alt text-sm"><strong>Qualification</strong> — Besoin confirme</div>
						<div class="px-3 py-2 rounded bg-surface-alt text-sm"><strong>Proposition</strong> — Offre envoyee</div>
						<div class="px-3 py-2 rounded bg-surface-alt text-sm"><strong>Negociation</strong> — En discussion</div>
						<div class="px-3 py-2 rounded bg-success-light text-sm"><strong>Gagne</strong> — Contrat signe</div>
						<div class="px-3 py-2 rounded bg-danger-light text-sm"><strong>Perdu</strong> — Abandonne</div>
					</div>
					<p>Chaque carte affiche : titre, entreprise, montant estime, date de relance, contact. Le total des montants est visible en haut de chaque colonne.</p>

					<h3 class="aide-h3">Creer une opportunite</h3>
					<p>Cliquez <strong>Nouvelle opportunite</strong> en haut a droite, ou le <strong>+</strong> dans une colonne. Remplissez : titre (obligatoire), entreprise, contact, montant, etape, date de relance, responsable, notes.</p>

					<h3 class="aide-h3">Deplacer (changer d'etape)</h3>
					<p>Glissez-deposez une carte d'une colonne a l'autre. L'etape est mise a jour automatiquement.</p>

					<h3 class="aide-h3">Relances en retard</h3>
					<p>Les dates de relance depassees apparaissent en rouge sur les cartes.</p>

					<h3 class="aide-h3">Modifier / Marquer perdu</h3>
					<p>Cliquez sur une carte pour ouvrir la fiche. Depuis la, vous pouvez modifier les details ou marquer l'opportunite comme perdue.</p>
				</div>
			</section>

			<!-- Prospection -->
			<section id="prospection" class="aide-section {searchQuery && !filteredSections.includes('prospection') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">search</span> Prospection</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Comprendre le scoring</h3>
					<p>Chaque lead recoit un score de pertinence automatique (0-13 points) :</p>
					<div class="overflow-x-auto my-3">
						<table class="aide-table">
							<thead>
								<tr>
									<th>Critere</th>
									<th>Points</th>
									<th>Detail</th>
								</tr>
							</thead>
							<tbody>
								<tr><td>Canton prioritaire</td><td>+3</td><td>GE, VD, VS</td></tr>
								<tr><td>Canton secondaire</td><td>+1</td><td>NE, FR, JU</td></tr>
								<tr><td>Secteur cible</td><td>+3</td><td>Construction, architecture, HVAC, electricite...</td></tr>
								<tr><td>Signal chaud</td><td>+2</td><td>Source SIMAP ou SITG</td></tr>
								<tr><td>Recent (&lt; 30j)</td><td>+2</td><td>Date de publication</td></tr>
								<tr><td>Recent (&lt; 90j)</td><td>+1</td><td>Date de publication</td></tr>
								<tr><td>Telephone disponible</td><td>+1</td><td>Numero renseigne</td></tr>
								<tr><td>Montant &gt; 100k</td><td>+1</td><td>Montant estime</td></tr>
							</tbody>
						</table>
					</div>
					<p>Badges de couleur :</p>
					<ul class="aide-list">
						<li><span class="inline-block w-3 h-3 rounded-full bg-danger mr-1"></span> <strong>Chaud</strong> (8+ pts) — A traiter en priorite</li>
						<li><span class="inline-block w-3 h-3 rounded-full bg-warning mr-1"></span> <strong>Tiede</strong> (5-7 pts) — Interessant, a qualifier</li>
						<li><span class="inline-block w-3 h-3 rounded-full bg-border-strong mr-1"></span> <strong>Froid</strong> (2-4 pts) — A surveiller</li>
					</ul>

					<h3 class="aide-h3">Ajouter un lead manuellement</h3>
					<p>Cliquez <strong>Ajouter un lead</strong>. Remplissez : raison sociale (obligatoire), source, canton, contact, telephone, adresse, email, secteur, description, montant. Le score est calcule automatiquement.</p>

					<h3 class="aide-h3">Filtrer et trier</h3>
					<p>4 filtres disponibles en haut : source, canton, statut, score minimum. La barre de recherche filtre par texte dans toutes les colonnes. Cliquez un en-tete de colonne pour trier.</p>

					<h3 class="aide-h3">Qualifier (interesse / ecarte)</h3>
					<p>Ouvrez le detail d'un lead, puis cliquez <strong>Interesse</strong> ou <strong>Ecarter</strong>. Un lead ecarte ne sera jamais reimporte depuis la meme source.</p>

					<h3 class="aide-h3">Transferer vers le CRM</h3>
					<p>Cliquez <strong>Transferer vers CRM</strong> dans la fiche du lead. Cela cree automatiquement une fiche entreprise (et un contact si le nom est renseigne). Le lead passe en statut "transfere".</p>

					<h3 class="aide-h3">Importer depuis des sources publiques</h3>
					<p>Cliquez <strong>Importer</strong> en haut a droite. Choisissez une source :</p>
					<ul class="aide-list">
						<li><strong>LINDAS</strong> (registre du commerce) — Selectionnez un canton et des mots-cles (ex: "construction, architecte")</li>
						<li><strong>Zefix REST</strong> (registre complet) — Donnees plus riches (capital, FOSC)</li>
						<li><strong>SIMAP</strong> (marches publics) — Appels d'offres construction par canton et periode</li>
					</ul>
					<p>Les doublons sont detectes automatiquement. Les leads ecartes ou transferes ne sont jamais reimportes.</p>

					<h3 class="aide-h3">Enrichir (telephone)</h3>
					<p>Sur un lead sans telephone, cliquez <strong>Enrichir telephone</strong> (bouton jaune). Le systeme cherche dans l'annuaire suisse et met a jour la fiche. Le score est recalcule (+1 pt si telephone trouve).</p>

					<h3 class="aide-h3">Recherches sauvegardees</h3>
					<p>Configurez vos filtres, puis cliquez <strong>Sauvegarder</strong>. Donnez un nom, choisissez la frequence d'alerte (quotidienne ou hebdomadaire), et activez les notifications.</p>
					<p>Pour recharger une recherche : cliquez <strong>Recherches (N)</strong> et selectionnez-la. Un badge orange indique les nouveaux leads depuis le dernier check.</p>

					<h3 class="aide-h3">Selection multiple</h3>
					<p>Cochez plusieurs leads, puis utilisez la barre d'actions : <strong>Interesse</strong> ou <strong>Ecarter</strong> en lot.</p>
				</div>
			</section>

			<!-- Signaux -->
			<section id="signaux" class="aide-section {searchQuery && !filteredSections.includes('signaux') ? 'hidden' : ''}">
				<h2 class="aide-h2"><span class="material-symbols-outlined aide-icon">notifications</span> Signaux d'affaires</h2>
				<div class="aide-content">
					<h3 class="aide-h3">Comprendre les signaux</h3>
					<p>Les signaux sont des informations detectees depuis des sources publiques : appels d'offres, permis de construire, creations d'entreprise, publications FOSC.</p>

					<h3 class="aide-h3">Consulter et filtrer</h3>
					<p>La liste affiche : type, description, maitre d'ouvrage, canton, date, statut. Filtrez par type de signal, canton ou statut via les menus deroulants.</p>

					<h3 class="aide-h3">Convertir en opportunite</h3>
					<p>Ouvrez un signal, cliquez <strong>Creer opportunite</strong>. Donnez un titre et validez. Le signal passe en "converti" et l'opportunite apparait dans le pipeline (etape Identification).</p>

					<h3 class="aide-h3">Ecarter un signal</h3>
					<p>Cliquez <strong>Ecarter</strong> dans la fiche. Le signal ne sera plus propose.</p>

					<h3 class="aide-h3">Statuts</h3>
					<ul class="aide-list">
						<li><strong>Nouveau</strong> — Vient d'etre detecte, a traiter</li>
						<li><strong>En analyse</strong> — En cours d'evaluation</li>
						<li><strong>Interesse</strong> — Retenu, action a planifier</li>
						<li><strong>Ecarte</strong> — Non pertinent</li>
						<li><strong>Converti</strong> — Transforme en opportunite pipeline</li>
					</ul>
				</div>
			</section>

		</div>
	</div>
</div>

<style>
	.aide-section {
		scroll-margin-top: 80px;
	}

	.aide-h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text);
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--color-border);
		margin-bottom: 1rem;
	}

	.aide-icon {
		font-size: 22px;
		color: var(--color-primary);
	}

	.aide-h3 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text);
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.aide-content p {
		color: var(--color-text-body);
		font-size: 0.875rem;
		line-height: 1.6;
		margin-bottom: 0.5rem;
	}

	.aide-list {
		list-style: disc;
		padding-left: 1.25rem;
		color: var(--color-text-body);
		font-size: 0.875rem;
		line-height: 1.8;
		margin-bottom: 0.75rem;
	}

	.aide-list li {
		margin-bottom: 0.25rem;
	}

	.aide-table {
		width: 100%;
		font-size: 0.8125rem;
		border-collapse: collapse;
	}

	.aide-table th {
		text-align: left;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-alt);
		border-bottom: 2px solid var(--color-border);
		font-weight: 600;
		color: var(--color-text);
	}

	.aide-table td {
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-body);
	}
</style>
