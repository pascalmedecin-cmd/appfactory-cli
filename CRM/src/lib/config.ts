/**
 * Configuration specifique CRM FilmPro. Fichier statique, edite directement.
 */

export const config = {
	app: {
		name: 'FilmPro CRM',
		slug: 'filmpro',
		description: 'CRM de gestion commerciale pour le secteur de la production audiovisuelle et construction',
		locale: 'fr-CH',
	},

	branding: {
		primary: '#2F5A9E',
		primaryLight: '#F0F4F8',
		primaryDark: '#0A1628',
		accent: '#3B6CB7',
		logo: 'FilmPro_logo.svg',
		logoWhite: 'FilmPro_logo_white.svg',
		font: 'DM Sans',
		loginBackground: 'login-bg.webp',
	},

	pipeline: {
		etapes: [
			{
				key: 'identification',
				label: 'Identification',
				icon: 'search',
				color: 'text-text-muted',
			},
			{
				key: 'qualification',
				label: 'Qualification',
				icon: 'fact_check',
				color: 'text-primary',
			},
			{
				key: 'proposition',
				label: 'Proposition',
				icon: 'description',
				color: 'text-primary',
			},
			{
				key: 'negociation',
				label: 'Négociation',
				icon: 'handshake',
				color: 'text-warning',
			},
			{
				key: 'gagne',
				label: 'Gagné',
				icon: 'emoji_events',
				color: 'text-success',
			},
			{
				key: 'perdu',
				label: 'Perdu',
				icon: 'block',
				color: 'text-danger',
			},
		],
	},

	scoring: {
		// V4 (S189) : maxPoints réduit de 12 → 10 après retrait de la temporalité
		// (bloc `recence` supprimé). Plafond théorique = canton prio (2) + entreprise
		// identifiée (1) + secteur (3) + simap (2) + regbl (1) [exclusif] + tel (1)
		// + montant (1). Veille (max +4) est un bonus cross-table non comptabilisé ici.
		maxPoints: 10,
		cantonsPrioritaires: {
			points: 2,
			values: ['GE', 'VD', 'VS'],
		},
		cantonsSecondaires: {
			points: 1,
			values: ['NE', 'FR', 'JU'],
		},
		entrepriseIdentifiee: {
			points: 1,
			// Sources qui identifient une entreprise réelle et active : Zefix (inscription RC + UID)
			// et Google Places (établissement opérationnel avec adresse + tél vérifiés par Google).
			sources: ['zefix', 'google_places'],
		},
		secteursCibles: {
			points: 3,
			keywords: ['construction', 'architecte', 'architecture', 'hvac', 'chauffage', 'ventilation', 'climatisation', 'regie', 'facility', 'batiment', 'menuiserie', 'charpente', 'electricite', 'plomberie', 'peinture', 'renovation', 'genie civil', 'bureau technique', 'ingenieur'],
		},
		sourcesChaudes: {
			points: 2,
			values: ['simap'],
		},
		sourcesIntervention: {
			points: 1,
			values: ['regbl'],
		},
		triage: {
			scoreMin: 5,
			snoozeDays: 7,
			queueCap: 25,
			visibleLimit: 12,
		},
		telephoneDisponible: {
			points: 1,
		},
		montantMinimum: {
			seuil: 100000,
			points: 1,
		},
		labels: {
			chaud: 7,
			tiede: 4,
		},
	},

	prospection: {
		sources: {
			zefix: {
				label: 'Registre du commerce',
				enabled: true,
			},
			simap: {
				label: 'SIMAP (marchés publics)',
				enabled: true,
				cantons: ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'],
			},
			search_ch: {
				label: 'search.ch (annuaire)',
				enabled: true,
			},
			regbl: {
				label: 'RegBL (registre des bâtiments)',
				enabled: true,
			},
			google_places: {
				label: 'Google Places (entreprises locales)',
				enabled: true,
				cantons: ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'],
			},
			lead_express: {
				label: 'Saisie terrain (mobile)',
				enabled: true,
			},
			veille: {
				label: 'Veille sectorielle',
				enabled: true,
			},
		},
		secteurKeywords: {
			construction: ['construction', 'batiment', 'bau', 'genie civil'],
			architecture: ['architecte', 'architecture', 'architektur'],
			hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung'],
			electricite: ['electricite', 'elektro', 'electricien'],
			renovation: ['renovation', 'transformation', 'umbau'],
			menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei'],
			ingenieur: ['ingenieur', 'bureau technique', 'ingenieurbuero'],
			regie: ['regie', 'facility', 'immobilier', 'verwaltung'],
		},
	},

	signaux: {
		types: [
			{
				key: 'appel_offres',
				label: 'Appel d\'offres',
			},
			{
				key: 'permis_construire',
				label: 'Permis de construire',
			},
			{
				key: 'creation_entreprise',
				label: 'Création d\'entreprise',
			},
			{
				key: 'demenagement',
				label: 'Déménagement',
			},
			{
				key: 'expansion',
				label: 'Expansion',
			},
			{
				key: 'fusion_acquisition',
				label: 'Fusion / Acquisition',
			},
			{
				key: 'autre',
				label: 'Autre',
			},
		],
	},

	navigation: {
		primary: [
			{
				href: '/',
				label: 'Dashboard',
				icon: 'dashboard',
			},
			{
				href: '/contacts',
				label: 'Contacts',
				icon: 'contacts',
			},
			{
				href: '/entreprises',
				label: 'Entreprises',
				icon: 'business',
			},
			{
				href: '/pipeline',
				label: 'Pipeline',
				icon: 'conversion_path',
			},
			{
				href: '/prospection',
				label: 'Prospection',
				icon: 'search',
			},
			{
				href: '/signaux',
				label: 'Signaux',
				icon: 'notifications',
			},
			{
				href: '/veille',
				label: 'Veille Sectorielle',
				icon: 'radar',
			},
			{
				href: '/reporting',
				label: 'Reporting',
				icon: 'bar_chart',
			},
		],
		secondary: [
			{
				href: '/log',
				label: 'Log',
				icon: 'bug_report',
				external: true,
				desktopOnly: true,
			},
			{
				href: '/aide',
				label: 'Aide',
				icon: 'help_outline',
				external: true,
			},
			{
				href: '/dashboard/couts',
				label: 'Coûts API',
				icon: 'payments',
			},
		],
	},
} as const;
