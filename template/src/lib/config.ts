/**
 * Configuration specifique client — miroir TypeScript de project.yaml.
 * Tout le code applicatif importe depuis ici au lieu de hardcoder.
 * Pour changer de client : modifier project.yaml puis regenerer ce fichier.
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
	},

	pipeline: {
		etapes: [
			{ key: 'identification', label: 'Identification', icon: 'search', color: 'text-text-muted' },
			{ key: 'qualification', label: 'Qualification', icon: 'fact_check', color: 'text-primary' },
			{ key: 'proposition', label: 'Proposition', icon: 'description', color: 'text-accent' },
			{ key: 'negociation', label: 'Negociation', icon: 'handshake', color: 'text-warning' },
			{ key: 'gagne', label: 'Gagne', icon: 'emoji_events', color: 'text-success' },
			{ key: 'perdu', label: 'Perdu', icon: 'block', color: 'text-danger' },
		] as const,
	},

	scoring: {
		cantonsPrioritaires: { points: 3, values: ['GE', 'VD', 'VS'] },
		cantonsSecondaires: { points: 1, values: ['NE', 'FR', 'JU'] },
		secteursCibles: {
			points: 3,
			keywords: [
				'construction', 'architecte', 'architecture', 'hvac', 'chauffage',
				'ventilation', 'climatisation', 'regie', 'facility', 'batiment',
				'menuiserie', 'charpente', 'electricite', 'plomberie', 'peinture',
				'renovation', 'genie civil', 'bureau technique', 'ingenieur',
			],
		},
		sourcesChaudes: { points: 2, values: ['simap', 'sitg'] },
		recence: [
			{ maxJours: 30, points: 2 },
			{ maxJours: 90, points: 1 },
		],
		telephoneDisponible: { points: 1 },
		montantMinimum: { seuil: 100000, points: 1 },
		labels: { chaud: 8, tiede: 5, froid: 2 },
	},

	prospection: {
		sources: {
			lindas: { label: 'LINDAS (registre du commerce)', enabled: true, cantons: ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'] },
			zefix: { label: 'Zefix REST (registre complet)', enabled: false },
			simap: { label: 'SIMAP (marches publics)', enabled: true, cantons: ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'] },
			search_ch: { label: 'search.ch (annuaire)', enabled: true },
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
		} as Record<string, string[]>,
	},

	signaux: {
		types: [
			{ key: 'appel_offres', label: "Appel d'offres" },
			{ key: 'permis_construire', label: 'Permis de construire' },
			{ key: 'creation_entreprise', label: "Creation d'entreprise" },
			{ key: 'demenagement', label: 'Demenagement' },
			{ key: 'expansion', label: 'Expansion' },
			{ key: 'fusion_acquisition', label: 'Fusion / Acquisition' },
			{ key: 'autre', label: 'Autre' },
		],
	},

	navigation: {
		primary: [
			{ href: '/', label: 'Dashboard', icon: 'dashboard' },
			{ href: '/contacts', label: 'Contacts', icon: 'contacts' },
			{ href: '/entreprises', label: 'Entreprises', icon: 'business' },
			{ href: '/pipeline', label: 'Pipeline', icon: 'filter_list' },
			{ href: '/prospection', label: 'Prospection', icon: 'search' },
			{ href: '/signaux', label: 'Signaux', icon: 'notifications' },
		],
		secondary: [
			{ href: '/aide', label: 'Aide', icon: 'help_outline' },
		],
	},
} as const;
