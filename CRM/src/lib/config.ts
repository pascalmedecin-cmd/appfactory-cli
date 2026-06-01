/**
 * Configuration specifique FilmPro (CRM + portail multi-outils). Fichier statique, edite directement.
 */

/**
 * Segment d'URL racine du CRM dans le portail FilmPro. Le CRM vit sous `/crm/*`
 * (la home portail occupe `/`). Source unique : tout lien interne CRM se prefixe par CRM_BASE
 * plutot que d'etre remplace string-by-string (revue specs portail 2026-06-01, point E).
 */
export const CRM_BASE = '/crm';

export const config = {
	app: {
		name: 'FilmPro',
		slug: 'filmpro',
		description: 'Traitements pour vitrage (films + vernis) - Suisse romande',
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
				href: CRM_BASE,
				label: 'Dashboard',
				icon: 'dashboard',
			},
			{
				href: `${CRM_BASE}/contacts`,
				label: 'Contacts',
				icon: 'contacts',
			},
			{
				href: `${CRM_BASE}/entreprises`,
				label: 'Entreprises',
				icon: 'business',
			},
			{
				href: `${CRM_BASE}/pipeline`,
				label: 'Pipeline',
				icon: 'conversion_path',
			},
			{
				href: `${CRM_BASE}/prospection`,
				label: 'Prospection',
				icon: 'search',
			},
			{
				href: `${CRM_BASE}/signaux`,
				label: 'Signaux',
				icon: 'notifications',
			},
			{
				href: `${CRM_BASE}/veille`,
				label: 'Veille Sectorielle',
				icon: 'radar',
			},
			{
				href: `${CRM_BASE}/reporting`,
				label: 'Reporting',
				icon: 'bar_chart',
			},
		],
		secondary: [
			{
				href: `${CRM_BASE}/log`,
				label: 'Log',
				icon: 'bug_report',
				external: true,
				desktopOnly: true,
			},
			{
				href: `${CRM_BASE}/aide`,
				label: 'Aide',
				icon: 'help_outline',
				external: true,
			},
			{
				href: `${CRM_BASE}/dashboard/couts`,
				label: 'Coûts API',
				icon: 'payments',
			},
		],
	},
} as const;
