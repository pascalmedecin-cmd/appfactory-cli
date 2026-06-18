/**
 * Contenu structuré de la page d'aide CRM FilmPro.
 *
 * Source unique data-driven (audit 360 H-28 : remplace le HTML monolithe de 1443 lignes).
 * L'arbre est consommé par :
 *  - `src/routes/crm/aide/+page.svelte` (rendu : onglets / TOC / contenu / « sur cette page »)
 *  - `src/lib/aide/search.ts` (index full-text)
 *  - `src/lib/aide/checklist.ts` (état des cases de la checklist de démarrage)
 *
 * Contraintes (testées dans `content.test.ts`) :
 *  - chaque `id` de section est unique sur tout l'arbre
 *  - chaque lien interne (`href` commençant par `/`) pointe vers une route CRM connue
 *  - chaque `link`/`steps[].link` externe est en `https://`
 *  - aucune section orpheline (toutes apparaissent dans le TOC de leur niveau)
 *
 * Registre éditorial : GOLDEN_STANDARD § 1 (CRM interne FilmPro, vocabulaire métier vitrage,
 * zéro jargon SaaS). Pas d'emoji, pas de gradient, pas de bordure pointillée.
 */

import { APP_URL } from '$lib/app-url';

/** Lien (interne `/...` ou externe `https://...`). */
export type AideLink = { href: string; label: string; external?: boolean };

/** Étape cochable de la checklist de démarrage (niveau 1). */
export type AideStep = { id: string; text: string; link?: AideLink };

/** Tonalité d'un encart designé. */
export type AideCalloutTone = 'tip' | 'warning' | 'note';

/** Nom d'un diagramme SVG sur-mesure rendu par `AideDiagram.svelte`. */
export type AideDiagramName =
	| 'ecosysteme'
	| 'cycle-opportunite'
	| 'veille-hebdo'
	| 'scoring-prospection'
	| 'architecture';

/** Bloc de contenu (unité de rendu de `AideBlock.svelte`). */
export type AideBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'list'; ordered?: boolean; items: string[] }
	| { type: 'steps'; id: string; intro?: string; items: AideStep[] }
	| { type: 'table'; head: string[]; rows: string[][]; caption?: string }
	| { type: 'callout'; tone: AideCalloutTone; title: string; text: string }
	| { type: 'code'; lang?: string; code: string; caption?: string }
	| { type: 'diagram'; name: AideDiagramName; caption?: string }
	| { type: 'link'; link: AideLink };

/** Section d'aide (= une entrée du TOC + une ancre `id` dans la page). */
export type AideSection = {
	id: string;
	title: string;
	/** Clé `icon-map.ts` (Lucide). */
	icon: string;
	/** Phrase d'accroche affichée sous le titre. */
	lead: string;
	blocks: AideBlock[];
};

/** Niveau = un onglet de la page (`Tabs` primitive). */
export type AideLevelKey = 'demarrage' | 'fonctions' | 'technique';

export type AideLevel = {
	key: AideLevelKey;
	label: string;
	icon: string;
	tagline: string;
	sections: AideSection[];
};

// --------------------------------------------------------------------------
// Routes CRM connues - utilisé pour valider les liens internes (cf. content.test.ts).
// --------------------------------------------------------------------------

export const KNOWN_ROUTES = [
	'/crm',
	'/crm/contacts',
	'/crm/entreprises',
	'/crm/pipeline',
	'/crm/prospection',
	'/crm/signaux',
	'/crm/veille',
	'/crm/veille/themes',
	'/crm/reporting',
	'/crm/dashboard/couts',
	'/crm/aide',
] as const;

// --------------------------------------------------------------------------
// Niveau 1 - Prise en main
// --------------------------------------------------------------------------

const niveau1: AideLevel = {
	key: 'demarrage',
	label: 'Prise en main',
	icon: 'rocket_launch',
	tagline: 'Cinq minutes pour comprendre l\'outil et faire ta première action.',
	sections: [
		{
			id: 'bienvenue',
			title: 'À quoi sert ce CRM',
			icon: 'waving_hand',
			lead: 'Un outil interne pour suivre les leads, le pipeline commercial et la veille du secteur vitrage.',
			blocks: [
				{
					type: 'paragraph',
					text: 'Le CRM FilmPro centralise le travail commercial : trouver des entreprises à démarcher, qualifier les leads, faire avancer les opportunités jusqu\'à la soumission, et garder un œil sur ce qui bouge dans le bâtiment romand. Il est conçu pour être lu vite, debout entre deux rendez-vous, pas en réunion.'
				},
				{
					type: 'list',
					items: [
						'Tableau de bord : ce qui demande ton attention aujourd\'hui (relances dues, leads chauds, alertes).',
						'Prospection : générer des leads depuis sept sources gratuites (registres, marchés publics, chantiers, etc.).',
						'Pipeline : faire avancer chaque opportunité d\'une colonne à la suivante jusqu\'à la pose ou la perte.',
						'Veille : la synthèse hebdomadaire des appels d\'offres, chantiers et mouvements d\'entreprises du secteur.'
					]
				},
				{
					type: 'callout',
					tone: 'note',
					title: 'C\'est un outil de travail, pas une démo',
					text: 'Pas de tour guidé, pas de score inventé, pas d\'animation. Les chiffres affichés sont réels (date de relance, score de priorité, nom d\'entreprise). Si une ligne est vide, c\'est qu\'il n\'y a rien à afficher.'
				}
			]
		},
		{
			id: 'parcours-5min',
			title: 'Le parcours en cinq minutes',
			icon: 'play_circle',
			lead: 'Se connecter, faire le tour des écrans, faire une première action concrète.',
			blocks: [
				{
					type: 'paragraph',
					text: 'Étape 1 - Se connecter. Tu reçois un lien de connexion par e-mail (magic link), tu cliques dessus, tu es dedans. Pas de mot de passe à retenir. La session dure une semaine.'
				},
				{
					type: 'paragraph',
					text: 'Étape 2 - Regarder le tableau de bord. C\'est la page d\'accueil. Elle te dit en un coup d\'œil : combien de relances sont dues, quels leads sont chauds, quelles alertes du secteur méritent un coup d\'œil. Tu pars de là chaque matin.'
				},
				{
					type: 'paragraph',
					text: 'Étape 3 - Faire le tour des six écrans principaux. Contacts, Entreprises, Pipeline, Prospection, Signaux, Veille. Chacun a un rôle précis (voir la carte ci-dessous). Tu n\'as pas besoin de tout maîtriser le premier jour.'
				},
				{ type: 'diagram', name: 'ecosysteme', caption: 'Les six écrans du CRM, rangés en deux familles, avec le rôle de chacun.' },
				{
					type: 'paragraph',
					text: 'Étape 4 - Faire une première action. Ouvre la prospection, lance une recherche d\'entreprises sur ton canton, et regarde les leads remonter avec leur score. Ou ouvre le pipeline et fais avancer une opportunité d\'une colonne. C\'est tout. Le reste vient à l\'usage.'
				},
				{
					type: 'callout',
					tone: 'tip',
					title: 'Le bon réflexe',
					text: 'Commence ta journée par le tableau de bord, finis-la par le pipeline. Entre les deux, la prospection et les signaux alimentent le haut de l\'entonnoir.'
				}
			]
		},
		{
			id: 'checklist-demarrage',
			title: 'Checklist de démarrage',
			icon: 'checklist',
			lead: 'Sept étapes pour être opérationnel. Coche au fur et à mesure - ta progression est gardée sur cet ordinateur.',
			blocks: [
				{
					type: 'steps',
					id: 'onboarding',
					intro: 'Chaque étape ouvre l\'écran concerné dans un nouvel onglet.',
					items: [
						{ id: 'connexion', text: 'Me connecter via le lien e-mail et arriver sur le tableau de bord.', link: { href: '/crm', label: 'Ouvrir le tableau de bord' } },
						{ id: 'tour', text: 'Ouvrir chacun des six écrans principaux une fois pour voir ce qu\'ils contiennent.', link: { href: '/crm/contacts', label: 'Commencer par Contacts' } },
						{ id: 'prospection', text: 'Lancer une recherche de prospection sur mon canton et regarder les leads remonter.', link: { href: '/crm/prospection', label: 'Ouvrir la prospection' } },
						{ id: 'qualif', text: 'Ouvrir un lead chaud dans le panneau de détail et le transférer dans le CRM.', link: { href: '/crm/prospection', label: 'Voir les leads' } },
						{ id: 'pipeline', text: 'Faire avancer une opportunité d\'une colonne du pipeline à la suivante.', link: { href: '/crm/pipeline', label: 'Ouvrir le pipeline' } },
						{ id: 'relance', text: 'Programmer une relance sur un contact et vérifier qu\'elle apparaît au tableau de bord.', link: { href: '/crm/contacts', label: 'Ouvrir les contacts' } },
						{ id: 'veille', text: 'Lire la dernière édition de la veille sectorielle de bout en bout.', link: { href: '/crm/veille', label: 'Ouvrir la veille' } }
					]
				}
			]
		},
		{
			id: 'reperes',
			title: 'Repères de lecture',
			icon: 'thermostat',
			lead: 'Trois codes visuels reviennent partout : le score de priorité, les statuts colorés, les actions inline.',
			blocks: [
				{
					type: 'paragraph',
					text: 'Le score de priorité (la « pastille ») classe un lead ou une opportunité sur une échelle de chaleur. Plus c\'est haut, plus ça mérite ton attention rapidement.'
				},
				{
					type: 'table',
					head: ['Pastille', 'Sens', 'Score'],
					rows: [
						['Prioritaire', 'À traiter en premier - bon canton, secteur cible, source chaude.', '7 et plus'],
						['À qualifier', 'Du potentiel, à creuser avant d\'investir du temps.', '4 à 6'],
						['Faible signal', 'Peu d\'indices favorables pour l\'instant.', '0 à 3'],
						['Non scoré', 'Pas encore évalué.', '-']
					],
					caption: 'Le score est calculé automatiquement à partir du canton, du secteur et de la source du lead.'
				},
				{
					type: 'list',
					items: [
						'Vert = validé, terminé, OK. Ambre = en cours, à qualifier, attention. Rouge = refus, perte, action destructive.',
						'Les boutons d\'action carrés (oui / non / plus tard / voir) apparaissent au survol d\'une ligne dense ou dans le panneau de détail.',
						'Toute suppression passe par une fenêtre de confirmation. Rien ne s\'efface au clic accidentel.'
					]
				},
				{
					type: 'callout',
					tone: 'warning',
					title: 'Ce que l\'outil ne fait pas',
					text: 'Pas d\'e-mails automatiques aux prospects, pas d\'export vers un autre logiciel, pas de relance qui part toute seule. Les relances sont des rappels dans le CRM - c\'est toi qui appelles ou écris.'
				}
			]
		}
	]
};

// --------------------------------------------------------------------------
// Niveau 2 - Fonctions détaillées (9 fiches écran)
// --------------------------------------------------------------------------

const niveau2: AideLevel = {
	key: 'fonctions',
	label: 'Fonctions détaillées',
	icon: 'menu_book',
	tagline: 'Une fiche par écran : à quoi il sert, les actions clés, les pièges.',
	sections: [
		{
			id: 'fn-dashboard',
			title: 'Tableau de bord',
			icon: 'dashboard',
			lead: 'La page d\'accueil : ce qui demande ton attention aujourd\'hui, en soixante secondes.',
			blocks: [
				{ type: 'paragraph', text: 'Le tableau de bord est conçu comme « l\'inbox du matin ». Il regroupe la file de triage (leads à arbitrer), les relances dues, les indicateurs clés et les alertes du secteur. Tu n\'es pas censé y rester : tu le lis, tu cliques sur ce qui compte, tu vas travailler.' },
				{
					type: 'list',
					ordered: false,
					items: [
						'File de triage : pour chaque lead, un bouton oui / non / plus tard. Trois clics et la file du jour est faite.',
						'Relances dues : les contacts à recontacter aujourd\'hui ou en retard, triés par urgence.',
						'Indicateurs : leads actifs, opportunités ouvertes, transferts du mois - des chiffres factuels, pas de jauge décorative.',
						'Alertes signaux : les appels d\'offres et chantiers à fort enjeu remontés par la veille.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Vide la file de triage chaque matin. Un lead « plus tard » revient automatiquement après quelques jours.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Si le tableau de bord paraît vide, ce n\'est pas un bug : il n\'y a peut-être rien à traiter. Vérifie la prospection pour réalimenter le haut de l\'entonnoir.' },
				{ type: 'link', link: { href: '/crm', label: 'Ouvrir le tableau de bord' } }
			]
		},
		{
			id: 'fn-contacts',
			title: 'Contacts',
			icon: 'contacts',
			lead: 'Les personnes : interlocuteurs chez les entreprises clientes ou prospects.',
			blocks: [
				{ type: 'paragraph', text: 'L\'écran Contacts liste les personnes physiques rattachées aux entreprises. C\'est là que tu notes qui appeler, quand, et ce qui s\'est dit. Chaque contact a une fiche avec son entreprise, son rôle, ses échanges et sa prochaine relance.' },
				{
					type: 'list',
					ordered: true,
					items: [
						'Filtrer la liste (par canton, par statut) - les filtres se reflètent dans l\'adresse de la page, donc partageables.',
						'Cliquer une ligne pour ouvrir la fiche détail dans le panneau latéral.',
						'Programmer une relance : elle remonte ensuite au tableau de bord à la date prévue.',
						'Lier le contact à une opportunité du pipeline si une affaire se dessine.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Après chaque appel, ouvre la fiche, note l\'essentiel en deux lignes, programme la prochaine relance. Trente secondes - sinon ça se perd.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Ne crée pas un contact en double : utilise la recherche entreprise pour vérifier si la personne existe déjà sous une autre orthographe.' },
				{ type: 'link', link: { href: '/crm/contacts', label: 'Ouvrir les contacts' } }
			]
		},
		{
			id: 'fn-entreprises',
			title: 'Entreprises',
			icon: 'business',
			lead: 'Les sociétés : régies, bureaux d\'architectes, entreprises de construction, clients posés.',
			blocks: [
				{ type: 'paragraph', text: 'L\'écran Entreprises est l\'annuaire des sociétés connues du CRM. Chaque fiche regroupe l\'identité (raison sociale, canton, numéro d\'identification suisse), les contacts rattachés, les opportunités et l\'historique. Les entreprises arrivent ici par la prospection, par import, ou par création manuelle.' },
				{
					type: 'list',
					items: [
						'Rechercher une entreprise par nom - la recherche tolère les accents et les variantes d\'écriture.',
						'Ouvrir la fiche pour voir d\'un coup les contacts, les affaires en cours et les notes.',
						'Enrichir une fiche depuis le registre du commerce (Zefix) si les données sont incomplètes.',
						'Marquer une entreprise comme cliente posée une fois la pose réalisée.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Le CRM dédoublonne automatiquement à l\'import : une entreprise déjà connue par le registre du commerce n\'est pas recréée, le lead est juste rattaché.' },
				{ type: 'link', link: { href: '/crm/entreprises', label: 'Ouvrir les entreprises' } }
			]
		},
		{
			id: 'fn-pipeline',
			title: 'Pipeline',
			icon: 'conversion_path',
			lead: 'Les affaires en cours, colonne par colonne, du premier contact à la pose ou à la perte.',
			blocks: [
				{ type: 'paragraph', text: 'Le pipeline est un tableau en colonnes (kanban) : chaque carte est une opportunité, chaque colonne est une étape. Tu fais glisser une carte vers la colonne suivante quand l\'affaire progresse. C\'est le seul écran du CRM où le glisser-déposer est autorisé.' },
				{ type: 'diagram', name: 'cycle-opportunite', caption: 'Le cycle de vie d\'une opportunité, du lead qualifié à la conclusion.' },
				{
					type: 'list',
					ordered: true,
					items: [
						'Glisser une carte d\'une colonne à la suivante quand l\'étape est franchie.',
						'Ouvrir une carte pour voir le détail : entreprise, contact, montant estimé, prochaine action.',
						'Marquer « gagné » (pose à réaliser) ou « perdu » (avec le motif) en fin de cycle.',
						'Repérer les cartes immobiles : une opportunité qui ne bouge pas depuis longtemps est un signal.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Tiens le pipeline à jour en temps réel, pas une fois par semaine. Une carte mal placée fausse la lecture de tout le tableau.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Une opportunité « gagnée » ne veut pas dire « pose terminée » : c\'est la soumission acceptée. La pose réelle se suit sur la fiche entreprise.' },
				{ type: 'link', link: { href: '/crm/pipeline', label: 'Ouvrir le pipeline' } }
			]
		},
		{
			id: 'fn-prospection',
			title: 'Prospection',
			icon: 'search',
			lead: 'Trouver de nouvelles entreprises à démarcher depuis sept sources gratuites, avec un score automatique.',
			blocks: [
				{ type: 'paragraph', text: 'La prospection est l\'usine à leads : tu lances une recherche, le CRM interroge les sources publiques, te ramène des entreprises, leur attribue un score de priorité, et tu décides lesquelles transférer dans le CRM. Toutes les sources sont gratuites (sauf Google Places, plafonnée), aucune donnée n\'est achetée.' },
				{
					type: 'table',
					head: ['Source', 'Ce qu\'elle apporte'],
					rows: [
						['Zefix', 'Registre du commerce suisse : entreprises inscrites, numéro d\'identification, forme juridique.'],
						['search.ch', 'Annuaire : entreprises locales avec téléphone et catégorie d\'activité.'],
						['SIMAP', 'Marchés publics : appels d\'offres en cours (source « chaude », bonus de score).'],
						['RegBL', 'Registre des bâtiments : chantiers et permis de construire récents.'],
						['Google Places', 'Établissements opérationnels par type d\'activité (réseau de partenaires) - quota mensuel limité.'],
						['Autres sources', 'Saisie manuelle d\'un lead terrain, import d\'un fichier CSV.']
					]
				},
				{ type: 'diagram', name: 'scoring-prospection', caption: 'Comment le score de priorité (sur 12) est composé.' },
				{
					type: 'list',
					ordered: true,
					items: [
						'Ouvrir la fenêtre d\'import, choisir une source et un canton, lancer la recherche.',
						'Lire les résultats : la table affiche le score, le canton, le secteur détecté.',
						'Ouvrir un lead prometteur dans le panneau latéral pour voir le détail et la source.',
						'Transférer le lead dans le CRM : il devient une entreprise (ou se rattache à une existante) et peut entrer dans le pipeline.',
						'Écarter les leads hors cible : ils ne reviendront pas dans les prochaines recherches.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Sauvegarde une recherche utile (source + canton + critères) pour la rejouer plus tard d\'un clic. Google Places fait exception : source payante, non rejouable automatiquement.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Le score est une aide à la priorisation, pas un verdict. Un « faible signal » peut être un excellent client si tu connais le contexte.' },
				{ type: 'link', link: { href: '/crm/prospection', label: 'Ouvrir la prospection' } }
			]
		},
		{
			id: 'fn-signaux',
			title: 'Signaux',
			icon: 'notifications',
			lead: 'Les événements du secteur captés automatiquement : appels d\'offres, chantiers, mouvements d\'entreprises.',
			blocks: [
				{ type: 'paragraph', text: 'Les signaux sont les événements bruts détectés par les robots du CRM avant qu\'ils ne soient mis en forme dans la veille. C\'est la matière première : un nouvel appel d\'offres sur SIMAP, un permis de construire qui sort, une entreprise du bâtiment qui change de raison sociale. Chaque signal porte une étiquette de conformité (utilisable / à vérifier).' },
				{
					type: 'list',
					items: [
						'Parcourir les signaux récents, filtrés par type ou par canton.',
						'Ouvrir un signal pour voir la source et le détail.',
						'Repérer ceux qui méritent une action : un appel d\'offres pertinent devient une opportunité.',
						'S\'appuyer sur les alertes du tableau de bord, qui remontent les signaux à fort enjeu.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Les signaux alimentent la veille hebdomadaire : ce que tu vois ici en vrac sera trié, vérifié et synthétisé dans l\'édition de la semaine.' },
				{ type: 'link', link: { href: '/crm/signaux', label: 'Ouvrir les signaux' } }
			]
		},
		{
			id: 'fn-veille',
			title: 'Veille sectorielle',
			icon: 'radar',
			lead: 'La synthèse hebdomadaire du secteur vitrage et bâtiment romand : à lire chaque semaine.',
			blocks: [
				{ type: 'paragraph', text: 'La veille est le magazine interne : chaque édition reprend les signaux de la semaine, les vérifie, et les met en forme - appels d\'offres à suivre, chantiers, mouvements d\'entreprises, enseignements. Elle est générée puis relue, jamais publiée brute. Une page d\'administration permet de gérer les thèmes suivis.' },
				{ type: 'diagram', name: 'veille-hebdo', caption: 'Le déroulé d\'une édition de veille, de la captation à la lecture.' },
				{
					type: 'list',
					items: [
						'Lire l\'édition de la semaine de bout en bout : c\'est court et c\'est trié pour ça.',
						'Cliquer un item pour voir le détail long-format et la source.',
						'Repérer les opportunités : un appel d\'offres ou un chantier mentionné peut devenir une affaire.',
						'Ajuster les thèmes suivis depuis la page d\'administration de la veille si un sujet manque.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Bloque dix minutes en début de semaine pour lire la veille. C\'est le meilleur ratio temps / contexte du CRM.' },
				{ type: 'link', link: { href: '/crm/veille', label: 'Ouvrir la veille' } },
				{ type: 'link', link: { href: '/crm/veille/themes', label: 'Gérer les thèmes suivis' } }
			]
		},
		{
			id: 'fn-reporting',
			title: 'Reporting',
			icon: 'bar_chart',
			lead: 'La vue d\'ensemble chiffrée : volumes, conversions, activité sur la période.',
			blocks: [
				{ type: 'paragraph', text: 'Le reporting agrège les chiffres : combien de leads générés, combien transférés, combien d\'opportunités ouvertes, combien gagnées, sur une période donnée. Pas de graphique décoratif - des indicateurs factuels qui répondent à « où on en est ».' },
				{
					type: 'list',
					items: [
						'Choisir la période d\'analyse.',
						'Lire les volumes : prospection, pipeline, transferts.',
						'Comparer à la période précédente pour repérer une tendance.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Le reporting est descriptif, pas prédictif : il dit ce qui s\'est passé, pas ce qui va se passer. Les décisions restent humaines.' },
				{ type: 'link', link: { href: '/crm/reporting', label: 'Ouvrir le reporting' } }
			]
		},
		{
			id: 'fn-couts',
			title: 'Coûts API',
			icon: 'payments',
			lead: 'Le suivi des dépenses des services externes utilisés par le CRM (génération d\'images, etc.).',
			blocks: [
				{ type: 'paragraph', text: 'L\'écran Coûts API trace ce que coûtent les services externes appelés par le CRM (par exemple la génération d\'images pour la veille). Il sert à garder un œil sur la facture et à détecter une dérive. La plupart des sources de prospection sont gratuites ; seuls quelques services payants apparaissent ici.' },
				{
					type: 'list',
					items: [
						'Voir le cumul des appels facturés sur la période.',
						'Repérer un pic anormal.',
						'Croiser avec les quotas (par exemple le quota mensuel Google Places).'
					]
				},
				{ type: 'link', link: { href: '/crm/dashboard/couts', label: 'Ouvrir les coûts API' } }
			]
		},
		{
			id: 'fn-aide',
			title: 'Aide',
			icon: 'help_outline',
			lead: 'Cette page : prise en main, fonctions détaillées, documentation technique.',
			blocks: [
				{ type: 'paragraph', text: 'La page d\'aide est organisée en trois niveaux, accessibles par les onglets en haut : « Prise en main » pour démarrer, « Fonctions détaillées » pour chaque écran, « Documentation technique » pour l\'administration et les procédures. La recherche en haut filtre les sections sur leur contenu, pas seulement leur titre.' },
				{
					type: 'list',
					items: [
						'Utiliser les onglets pour changer de niveau.',
						'Utiliser le sommaire à gauche pour sauter à une section.',
						'Utiliser la recherche pour retrouver un terme précis n\'importe où dans l\'aide.',
						'Suivre les liens « Ouvrir ... » pour aller directement à l\'écran décrit.'
					]
				}
			]
		}
	]
};

// --------------------------------------------------------------------------
// Niveau 3 - Documentation technique + runbook
// --------------------------------------------------------------------------

const niveau3: AideLevel = {
	key: 'technique',
	label: 'Documentation technique',
	icon: 'engineering',
	tagline: 'Pour l\'administration : architecture, infrastructure, sécurité, procédures.',
	sections: [
		{
			id: 'tech-archi',
			title: 'Architecture',
			icon: 'account_tree',
			lead: 'Comment les briques s\'assemblent : interface, serveur, base de données, services externes.',
			blocks: [
				{ type: 'paragraph', text: 'Le CRM est une application web rendue côté serveur. L\'interface (SvelteKit) appelle des actions serveur qui lisent et écrivent dans une base de données PostgreSQL hébergée chez Supabase. Des tâches planifiées (crons) tournent en arrière-plan pour la veille et l\'entretien des données. Quelques services externes complètent l\'ensemble.' },
				{ type: 'diagram', name: 'architecture', caption: 'Vue d\'ensemble : navigateur, application, base de données, services externes.' },
				{
					type: 'list',
					items: [
						'Interface : SvelteKit + Tailwind, rendu serveur, hydratation côté client.',
						'Données : PostgreSQL (Supabase EU), avec sécurité au niveau des lignes (RLS) active.',
						'Authentification : magic link e-mail, session sept jours en cookie httpOnly.',
						'Hébergement : Vercel (déploiement automatique depuis GitHub, previews par branche).'
					]
				}
			]
		},
		{
			id: 'tech-stack',
			title: 'Stack technique',
			icon: 'layers',
			lead: 'Les outils utilisés, couche par couche.',
			blocks: [
				{
					type: 'table',
					head: ['Couche', 'Outil', 'Rôle'],
					rows: [
						['Interface', 'SvelteKit + Tailwind v4', 'Pages web, composants testables, design system tokens.'],
						['Serveur', 'Actions SvelteKit', 'Logique métier, validation des formulaires (Zod).'],
						['Base de données', 'Supabase (PostgreSQL)', 'Stockage, authentification, API, sécurité au niveau des lignes.'],
						['Hébergement', 'Vercel', 'Déploiement, previews, domaines, CDN, crons.'],
						['Tests', 'Vitest + Playwright', 'Tests unitaires (logique) et de bout en bout (navigation).'],
						['Code', 'GitHub', 'Versionnement, un dépôt pour l\'application.']
					]
				},
				{ type: 'callout', tone: 'note', title: 'Design system', text: 'L\'apparence est régie par le golden standard (tokens couleurs, typographie DM Sans, échelle d\'espacement 8px, primitives partagées). Toute page rendue dans le CRM s\'y conforme.' }
			]
		},
		{
			id: 'tech-bdd',
			title: 'Base de données et sécurité des lignes',
			icon: 'database',
			lead: 'Les principales tables et le modèle d\'accès.',
			blocks: [
				{ type: 'paragraph', text: 'La base PostgreSQL stocke les entités du CRM : contacts, entreprises, opportunités du pipeline, leads de prospection, signaux, éditions de veille, journaux de quota et de coûts. Les migrations SQL sont versionnées dans le dépôt et appliquées en production de façon traçable.' },
				{ type: 'paragraph', text: 'La sécurité au niveau des lignes (RLS) est active : seul un utilisateur authentifié accède aux données. Le modèle actuel est « mono-tenant plat » - les fondateurs FilmPro voient et modifient les mêmes données, par décision. Les suppressions sensibles (photos, visites) sont journalisées quand un fondateur agit sur la donnée d\'un autre.' },
				{ type: 'callout', tone: 'warning', title: 'À durcir avant un quatrième utilisateur non-fondateur', text: 'Le modèle « tout le monde voit tout » est assumé tant que l\'équipe se limite aux fondateurs. L\'arrivée d\'un commercial junior, d\'un profil terrain ou d\'un prestataire impose de passer à des politiques par propriétaire (created_by = utilisateur) et d\'ajouter des tests d\'intégration RLS contre une vraie base.' }
			]
		},
		{
			id: 'tech-auth',
			title: 'Authentification',
			icon: 'lock',
			lead: 'Magic link e-mail, un seul chemin de connexion.',
			blocks: [
				{ type: 'paragraph', text: 'Le CRM utilise un lien de connexion envoyé par e-mail (magic link) : l\'utilisateur saisit son adresse @filmpro.ch, reçoit un lien, clique, et une session de sept jours est ouverte dans un cookie httpOnly. Pas de mot de passe, pas d\'OAuth tiers, pas de fallback - un seul chemin.' },
				{
					type: 'list',
					items: [
						'Domaine autorisé : adresses @filmpro.ch uniquement.',
						'Envoi des e-mails : Resend (domaine vérifié).',
						'Session : sept jours, cookie httpOnly, renouvelée à la connexion.',
						'Page de connexion expirée : message explicite, bouton pour redemander un lien.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Sécurité applicative', text: 'Validation Zod sur les formulaires, limitation de débit (10 requêtes/min), en-têtes CSP / X-Frame-Options / HSTS, comparaison à temps constant des secrets de cron, protection anti-CSRF par contrôle d\'origine sur les routes sensibles.' }
			]
		},
		{
			id: 'tech-apis',
			title: 'APIs externes',
			icon: 'api',
			lead: 'Les services tiers appelés par le CRM, et pourquoi.',
			blocks: [
				{
					type: 'table',
					head: ['Service', 'Usage', 'Coût'],
					rows: [
						['Zefix (REST)', 'Registre du commerce suisse : enrichissement et prospection entreprises.', 'Gratuit'],
						['search.ch', 'Annuaire : prospection d\'entreprises locales avec téléphone.', 'Gratuit'],
						['SIMAP', 'Marchés publics : détection des appels d\'offres.', 'Gratuit'],
						['RegBL', 'Registre des bâtiments : chantiers et permis récents.', 'Gratuit'],
						['Google Places (New)', 'Établissements opérationnels par type d\'activité (réseau de partenaires).', 'Quota mensuel ≈ 900 appels, sous le seuil gratuit Google.'],
						['fal.ai (Flux 1.1 Pro)', 'Génération d\'images pour la veille.', 'Facturé à l\'usage (voir Coûts API).'],
						['Resend', 'Envoi des e-mails de connexion.', 'Gratuit (plan free, domaine vérifié).']
					]
				},
				{ type: 'callout', tone: 'warning', title: 'Garde-fou quota', text: 'Google Places est la seule source payante : un compteur en base réserve le créneau avant chaque appel et bloque à 900/mois. Les recherches sauvegardées et les alertes ne peuvent pas rejouer cette source automatiquement.' }
			]
		},
		{
			id: 'tech-crons',
			title: 'Tâches planifiées',
			icon: 'schedule',
			lead: 'Les cinq crons qui tournent en arrière-plan, sécurisés par secret partagé.',
			blocks: [
				{ type: 'paragraph', text: 'Cinq tâches planifiées tournent côté Vercel. Chacune est protégée par un secret de cron (CRON_SECRET, comparé en temps constant) et utilise la clé de service Supabase. Elles sont déclenchées par planning Vercel ou GitHub Actions selon la tâche.' },
				{
					type: 'table',
					head: ['Cron', 'Rôle'],
					rows: [
						['signaux', 'Capter les nouveaux événements du secteur (appels d\'offres, chantiers, mouvements d\'entreprises).'],
						['alertes', 'Évaluer les seuils et remonter les signaux à fort enjeu vers le tableau de bord.'],
						['nettoyage-crm', 'Entretien des données : purges, expirations, cohérence.'],
						['intelligence', 'Construire l\'édition de veille à partir des signaux de la période.'],
						['intelligence-archive', 'Archiver les éditions de veille passées.']
					]
				}
			]
		},
		{
			id: 'tech-deploy',
			title: 'Déploiement',
			icon: 'cloud_upload',
			lead: 'Du commit GitHub à la production Vercel, automatiquement.',
			blocks: [
				{ type: 'paragraph', text: `Le déploiement est automatique : un push sur la branche principale du dépôt déclenche un build Vercel et une mise en production sur ${APP_URL}. Les branches de fonctionnalité obtiennent une preview isolée. La racine du projet côté Vercel est le dossier CRM/.` },
				{
					type: 'list',
					items: [
						'Avant déploiement : tests Vitest verts + svelte-check sans nouvelle erreur + build local OK.',
						'Migrations SQL : appliquées en production de façon traçable (scripts dédiés), versionnées dans le dépôt.',
						'Variables d\'environnement : gérées dans la configuration Vercel (clés Supabase, secrets de cron, clés API).',
						'Rollback : tags Git de point de bascule posés avant les changements structurels.'
					]
				}
			]
		},
		{
			id: 'tech-securite',
			title: 'Sécurité',
			icon: 'shield',
			lead: 'Les contrôles en place et les décisions assumées.',
			blocks: [
				{
					type: 'list',
					items: [
						'Authentification obligatoire sur toutes les pages applicatives (redirection vers /login sinon).',
						'En-têtes HTTP : Content-Security-Policy, X-Frame-Options, Referrer-Policy, HSTS (deux ans, includeSubDomains, preload).',
						'Limitation de débit : 10 requêtes par minute et par client sur les routes sensibles.',
						'Validation des entrées : schémas Zod sur les formulaires, échappement systématique des sorties dynamiques.',
						'Crons : secret partagé comparé en temps constant, clé de service côté serveur uniquement.',
						'Anti-CSRF : contrôle d\'origine sur les routes de mutation sensibles.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Décisions assumées', text: 'Le CSP autorise les styles et scripts inline - c\'est un prérequis de l\'hydratation SvelteKit ; le risque résiduel est jugé acceptable pour un CRM mono-tenant ≤ 10 administrateurs sans contenu utilisateur tiers. Le modèle RLS « plat » est assumé tant que l\'équipe se limite aux fondateurs.' },
				{ type: 'callout', tone: 'warning', title: 'Limite des tests', text: 'Les tests unitaires simulent la base de données : ils ne prouvent rien sur le comportement RLS réel, qui n\'existe qu\'au runtime PostgreSQL. Avant de bâtir sur un contrôle d\'autorisation, vérifier le code et tester manuellement en production avec un compte au rôle visé.' }
			]
		},
		{
			id: 'tech-runbook',
			title: 'Runbook ops',
			icon: 'checklist',
			lead: 'Quatre procédures d\'exploitation courantes, pas à pas.',
			blocks: [
				{
					type: 'paragraph',
					text: 'Procédure 1 - Réinitialiser l\'accès d\'un utilisateur. L\'authentification étant par magic link, il n\'y a pas de mot de passe à réinitialiser : si quelqu\'un n\'arrive pas à se connecter, vérifier que son adresse est bien @filmpro.ch, qu\'elle figure dans les utilisateurs autorisés côté Supabase (Authentication → Users), puis lui demander de redemander un lien depuis /login. Vérifier aussi les spams. En dernier recours, l\'administrateur Supabase peut inviter l\'utilisateur manuellement.'
				},
				{
					type: 'paragraph',
					text: 'Procédure 2 - Appliquer une migration en production. Les fichiers de migration vivent dans supabase/migrations/. Vérifier que la migration est versionnée dans le dépôt, exécuter le script d\'application dédié contre la base de production, puis vérifier le résultat dans information_schema (colonne ajoutée, contrainte présente). Toujours poser un tag Git de point de bascule avant un changement structurel.'
				},
				{
					type: 'paragraph',
					text: 'Procédure 3 - Régénérer les types de la base. Après un changement de schéma, lancer la régénération des types TypeScript (supabase gen types) pour que l\'application reste alignée. Les casts temporaires « as never » posés en attendant la régénération doivent être retirés à cette occasion.'
				},
				{
					type: 'paragraph',
					text: 'Procédure 4 - Lancer la veille manuellement. La veille hebdomadaire est produite par un workflow GitHub Actions (« Cron veille hebdomadaire FilmPro », vendredi matin), et non plus par une route de l\'application. Pour la relancer hors planning, déclencher le workflow manuellement dans l\'onglet Actions du dépôt GitHub (bouton « Run workflow », champ semaine ISO optionnel). Vérifier ensuite l\'édition produite dans l\'écran Veille avant de la considérer publiée.'
				},
				{
					type: 'callout',
					tone: 'warning',
					title: 'Règle d\'or des opérations',
					text: 'Aucune intervention destructive en production sans tag Git de point de bascule préalable et sans avoir lu le code concerné. En cas de doute, on s\'arrête et on demande.'
				}
			]
		}
	]
};

export const aideContent: AideLevel[] = [niveau1, niveau2, niveau3];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Retourne le niveau correspondant à une clé, ou le premier niveau par défaut. */
export function levelByKey(key: string | null | undefined): AideLevel {
	return aideContent.find((l) => l.key === key) ?? aideContent[0];
}

/** Toutes les étapes de checklist déclarées dans l'arbre (utilisé par checklist.ts). */
export function allChecklistStepIds(): string[] {
	const ids: string[] = [];
	for (const level of aideContent) {
		for (const section of level.sections) {
			for (const block of section.blocks) {
				if (block.type === 'steps') {
					for (const step of block.items) ids.push(`${block.id}:${step.id}`);
				}
			}
		}
	}
	return ids;
}
