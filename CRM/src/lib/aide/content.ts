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
 * zéro jargon SaaS). Pas d'emoji, pas de gradient, pas de bordure pointillée, pas de tiret long.
 *
 * Mise à jour 2026-06-30 (revue exhaustive) : portail multi-outils, écran Campagnes,
 * Entreprises 100 % serveur, éditeur de veille, Daily Email, 6 crons Vercel + veille
 * GitHub Actions, sources prospection V5. Tous les faits vérifiés dans le code.
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
	| 'portail'
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
	'/crm/campagnes',
	'/crm/signaux',
	'/crm/veille',
	'/crm/veille/editeur',
	'/crm/veille/themes',
	'/crm/reporting',
	'/crm/dashboard/couts',
	'/crm/log',
	'/crm/aide'
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
					type: 'paragraph',
					text: 'Le CRM est l\'un des outils du portail FilmPro : une seule connexion donne accès à tous les outils maison. Le logo en haut de la barre latérale ramène à l\'accueil du portail, d\'où l\'on bascule entre le CRM et Découpe Films (l\'optimiseur de plans de coupe). Pour l\'instant, le travail commercial vit entièrement dans le CRM.'
				},
				{ type: 'diagram', name: 'portail', caption: 'Le portail FilmPro : un seul accès, plusieurs outils. Le CRM est celui décrit dans cette aide.' },
				{
					type: 'list',
					items: [
						'Tableau de bord : ce qui demande ton attention aujourd\'hui (relances dues, leads chauds, alertes du secteur).',
						'Prospection : trouver des entreprises à démarcher depuis les registres et annuaires suisses, avec un score de priorité automatique.',
						'Pipeline : faire avancer chaque opportunité d\'une colonne à la suivante, du premier contact à la pose ou à la perte.',
						'Veille : la synthèse hebdomadaire des appels d\'offres, chantiers et mouvements d\'entreprises du secteur, à lire chaque semaine.'
					]
				},
				{
					type: 'callout',
					tone: 'note',
					title: 'C\'est un outil de travail, pas une démo',
					text: 'Pas de tour guidé, pas de score inventé, pas d\'animation. Les chiffres affichés sont réels (date de relance, score de priorité, nom d\'entreprise). Si une ligne est vide, c\'est qu\'il n\'y a rien à afficher, pas un bug.'
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
					text: 'Étape 1 - Se connecter. Tu saisis ton adresse @filmpro.ch, tu reçois un code à six chiffres par e-mail, tu le valides, tu es dedans. Pas de mot de passe à retenir. La session reste ouverte une semaine.'
				},
				{
					type: 'paragraph',
					text: 'Étape 2 - Regarder le tableau de bord. C\'est la page d\'accueil du CRM, pensée comme l\'inbox du matin : combien de leads chauds sont à trier, quelles relances sont dues, quels signaux du secteur méritent un coup d\'œil. Tu pars de là chaque matin.'
				},
				{
					type: 'paragraph',
					text: 'Étape 3 - Faire le tour des écrans principaux. La barre de gauche liste Tableau de bord, Contacts, Entreprises, Pipeline, Prospection, Signaux, Veille et Reporting (plus Campagnes si l\'affichage avancé est activé sur ton compte). Chacun a un rôle précis (voir la carte ci-dessous). Tu n\'as pas besoin de tout maîtriser le premier jour.'
				},
				{ type: 'diagram', name: 'ecosysteme', caption: 'Les écrans du CRM, rangés en deux familles, avec le rôle de chacun.' },
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
						{ id: 'connexion', text: 'Me connecter avec mon adresse @filmpro.ch et le code reçu par e-mail, puis arriver sur le tableau de bord.', link: { href: '/crm', label: 'Ouvrir le tableau de bord' } },
						{ id: 'tour', text: 'Ouvrir chacun des écrans principaux une fois pour voir ce qu\'ils contiennent.', link: { href: '/crm/contacts', label: 'Commencer par Contacts' } },
						{ id: 'prospection', text: 'Lancer une recherche de prospection sur mon canton et regarder les leads remonter avec leur score.', link: { href: '/crm/prospection', label: 'Ouvrir la prospection' } },
						{ id: 'qualif', text: 'Ouvrir un lead chaud dans le panneau de détail et le convertir en entreprise du CRM.', link: { href: '/crm/prospection', label: 'Voir les leads' } },
						{ id: 'pipeline', text: 'Faire glisser une opportunité d\'une colonne du pipeline à la suivante.', link: { href: '/crm/pipeline', label: 'Ouvrir le pipeline' } },
						{ id: 'relance', text: 'Programmer une relance sur une opportunité et vérifier qu\'elle remonte au tableau de bord.', link: { href: '/crm/pipeline', label: 'Ouvrir le pipeline' } },
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
					text: 'Le score de priorité (la « pastille ») classe un lead ou un signal sur une échelle de chaleur, sur 10. Plus c\'est haut, plus ça mérite ton attention rapidement. Il est calculé automatiquement (voir le détail dans la fiche Prospection).'
				},
				{
					type: 'table',
					head: ['Pastille', 'Sens', 'Score'],
					rows: [
						['Prioritaire', 'À traiter en premier - bon canton, secteur cible, mots-clés vitrage.', '7 et plus'],
						['À qualifier', 'Du potentiel, à creuser avant d\'investir du temps.', '4 à 6'],
						['Faible signal', 'Peu d\'indices favorables pour l\'instant.', '0 à 3'],
						['Non scoré', 'Pas encore évalué (par exemple un lead terrain non enrichi).', '-']
					],
					caption: 'Le score est plafonné à 10 à l\'affichage. « Non scoré » n\'est pas « Faible signal » : c\'est un lead qui n\'a pas encore été évalué.'
				},
				{
					type: 'list',
					items: [
						'Vert = validé, terminé, OK. Ambre = en cours, à qualifier, attention. Rouge = refus, perte, action destructive.',
						'Les boutons d\'action carrés (intéressant / écarter / plus tard / voir) apparaissent au survol d\'une ligne dense ou dans le panneau de détail.',
						'Toute suppression passe par une fenêtre de confirmation. Rien ne s\'efface au clic accidentel.'
					]
				},
				{
					type: 'callout',
					tone: 'warning',
					title: 'Ce que l\'outil ne fait pas',
					text: 'Pas d\'e-mail automatique aux prospects, pas d\'export vers un autre logiciel, pas de relance qui part toute seule chez un client. Les relances sont des rappels dans le CRM : c\'est toi qui appelles ou écris. Seule exception, interne : un récap matinal des relances peut être envoyé aux fondateurs (le Daily Email), désactivé par défaut.'
				}
			]
		}
	]
};

// --------------------------------------------------------------------------
// Niveau 2 - Fonctions détaillées (une fiche par écran, ordre de la barre latérale)
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
				{ type: 'paragraph', text: 'Le tableau de bord est conçu comme « l\'inbox du matin ». En haut, un message d\'accueil résume la journée (leads prioritaires à trier, signaux, relances). En dessous, trois indicateurs cliquables, la file de triage, l\'activité récente, les relances dues et, quand il y a lieu, un bandeau « À surveiller ». Tu n\'es pas censé y rester : tu le lis, tu cliques sur ce qui compte, tu vas travailler.' },
				{
					type: 'list',
					ordered: false,
					items: [
						'Trois indicateurs de tête : « À trier ce matin » (leads chauds en file), « Signaux ouverts » (à analyser), « Relances dues » (opportunités à recontacter). Ce sont des comptes globaux exacts, pas le nombre de lignes affichées.',
						'File de triage : jusqu\'à douze leads chauds non encore touchés, avec pour chacun quatre boutons - Intéressant, Écarter, Plus tard (sept jours), Détails. Trois clics et la file du matin est faite.',
						'Activité récente et relances : les derniers échanges et les prochaines relances dues, avec un repère d\'urgence (en retard / aujourd\'hui / demain).',
						'« À surveiller » : n\'apparaît que s\'il y a au moins un signal ouvert ou une alerte de recherche sauvegardée. Invisible = il n\'y a rien à surveiller, pas un bug.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Vide la file de triage chaque matin. Un lead « plus tard » disparaît sept jours puis revient automatiquement.' },
				{ type: 'callout', tone: 'note', title: 'Le Daily Email', text: 'Un récap des relances du jour (dues et en retard) peut être envoyé chaque matin par e-mail aux fondateurs. Il est déterministe, désactivé par défaut, et n\'envoie rien les jours calmes. Cliquer une relance renvoie vers le pipeline, pas vers une fiche précise.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'La file de triage est partagée entre les fondateurs : un lead traité par l\'un disparaît pour tous. Et si le tableau de bord paraît vide, vérifie la prospection pour réalimenter le haut de l\'entonnoir.' },
				{ type: 'link', link: { href: '/crm', label: 'Ouvrir le tableau de bord' } }
			]
		},
		{
			id: 'fn-contacts',
			title: 'Contacts',
			icon: 'contacts',
			lead: 'Les personnes : interlocuteurs et prescripteurs chez les entreprises clientes ou prospects.',
			blocks: [
				{ type: 'paragraph', text: 'L\'écran Contacts liste les personnes physiques, rattachées ou non à une entreprise. C\'est là que tu notes qui appeler et ce qui s\'est dit. En haut, une file de validation regroupe les contacts capturés sur le terrain (mobile) : tu valides, rejettes ou fusionnes en un clic. Chaque contact a une fiche avec son entreprise, son rôle et ses coordonnées.' },
				{
					type: 'list',
					ordered: true,
					items: [
						'Filtrer la liste par onglet (Tous, Prescripteurs, À qualifier, Sans entreprise) et rechercher : le tri et la recherche se font dans le navigateur, instantanément.',
						'Valider les contacts terrain en attente depuis la file en haut de page.',
						'Cliquer une ligne pour ouvrir la fiche détail dans le panneau latéral.',
						'Lier le contact à une entreprise par autocomplétion : taper deux lettres suffit ; un nom inconnu crée l\'entreprise (avec dédoublonnage) à l\'enregistrement.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Après chaque appel, ouvre la fiche, note l\'essentiel en deux lignes. Trente secondes, sinon ça se perd.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Les relances ne se programment pas ici : elles vivent sur les opportunités (Pipeline). « Archiver » un contact ne l\'efface pas, il est masqué et reste récupérable. La recherche du tableau est sensible aux accents.' },
				{ type: 'link', link: { href: '/crm/contacts', label: 'Ouvrir les contacts' } }
			]
		},
		{
			id: 'fn-entreprises',
			title: 'Entreprises',
			icon: 'business',
			lead: 'Les sociétés : régies, bureaux d\'architectes, entreprises de construction, facility managers, clients posés.',
			blocks: [
				{ type: 'paragraph', text: 'L\'écran Entreprises est l\'annuaire des sociétés connues du CRM. Chaque fiche regroupe l\'identité (raison sociale, canton, numéro d\'identification suisse, adresse), les contacts rattachés, les opportunités et l\'historique terrain. La liste est gérée côté serveur : la recherche, les filtres, le tri et la pagination interrogent la base à chaque fois - l\'écran reste rapide même quand l\'annuaire grossit.' },
				{
					type: 'list',
					items: [
						'Rechercher une entreprise (raison sociale, secteur, canton) ; filtrer par onglet (Toutes, Qualifiées, À qualifier, Sans contact) ; trier par colonne ; paginer 25, 50 ou 100 lignes.',
						'Basculer entre vue Table et vue Cartes (le choix est mémorisé sur cet ordinateur).',
						'Ouvrir la fiche pour voir d\'un coup les contacts, les affaires en cours et les notes ; un lien ouvre l\'adresse dans Google Maps.',
						'Enrichir une fiche depuis le registre du commerce (Zefix) : numéro IDE, canton et adresse du siège sont complétés sans écraser tes notes.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Les indicateurs en haut (total, qualifiées, affaires en cours...) sont des comptes globaux, pas le total de la page affichée ou de la recherche en cours. Le CRM dédoublonne à la création : une entreprise déjà connue n\'est pas recréée, le lead est rattaché.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'La recherche est sensible aux accents : « geneve » ne trouve pas « Genève ». Et l\'onglet « Qualifiées » reste vide tant qu\'aucune action ne marque une entreprise comme qualifiée (le statut n\'est pas modifiable depuis le formulaire). Supprimer une entreprise demande d\'abord de détacher ses contacts et affaires.' },
				{ type: 'link', link: { href: '/crm/entreprises', label: 'Ouvrir les entreprises' } }
			]
		},
		{
			id: 'fn-pipeline',
			title: 'Pipeline',
			icon: 'conversion_path',
			lead: 'Les affaires en cours, colonne par colonne, du premier contact à la pose ou à la perte.',
			blocks: [
				{ type: 'paragraph', text: 'Le pipeline est un tableau en colonnes (kanban) : chaque carte est une opportunité (un projet de vitrage chiffré), chaque colonne est une étape. Tu fais glisser une carte vers la colonne suivante quand l\'affaire progresse. C\'est le seul écran du CRM où le glisser-déposer est autorisé, et seulement sur ordinateur.' },
				{ type: 'diagram', name: 'cycle-opportunite', caption: 'Les six étapes d\'une opportunité, de l\'identification à la conclusion (gagné ou perdu).' },
				{
					type: 'list',
					ordered: true,
					items: [
						'Lire les six étapes : Identification, Qualification, Proposition, Négociation, Gagné, Perdu. Trois onglets cadrent la vue : En cours, Conclues, Toutes.',
						'Glisser une carte d\'une colonne à la suivante quand l\'étape est franchie.',
						'Ouvrir une carte pour voir le détail (entreprise, contact, montant estimé, relance) et la modifier.',
						'Marquer « perdu » avec un motif (liste fermée de six raisons + précisions). Pour « gagné », il suffit de glisser la carte dans la colonne Gagné.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Tiens le pipeline à jour en temps réel, pas une fois par semaine. Une carte mal placée fausse la lecture de tout le tableau et les relances du tableau de bord.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Il n\'y a pas de bouton « marquer gagné » : on gagne en glissant la carte dans la colonne Gagné. Une opportunité « gagnée » = soumission acceptée, pas pose terminée (la pose se suit sur la fiche entreprise). Le montant s\'affiche en format compact (« 213.6 k CHF »).' },
				{ type: 'link', link: { href: '/crm/pipeline', label: 'Ouvrir le pipeline' } }
			]
		},
		{
			id: 'fn-prospection',
			title: 'Prospection',
			icon: 'search',
			lead: 'Trouver de nouvelles entreprises à démarcher depuis les registres et annuaires suisses, avec un score automatique.',
			blocks: [
				{ type: 'paragraph', text: 'La prospection est l\'usine à leads : tu lances une recherche, le CRM interroge une source publique, te ramène des entreprises, leur attribue un score de priorité, et tu décides lesquelles transférer dans le CRM. Depuis la refonte de juin, c\'est un outil de recherche à la demande, orienté qualité, pas un moteur d\'acquisition de masse.' },
				{
					type: 'table',
					head: ['Source', 'Ce qu\'elle apporte', 'Coût'],
					rows: [
						['Zefix', 'Registre du commerce suisse : recherche par nom, numéro d\'identification, forme juridique.', 'Gratuit'],
						['search.ch', 'Annuaire : entreprises locales par activité et lieu, avec téléphone.', 'Gratuit (1000 requêtes/mois)'],
						['Google Places', 'Établissements opérationnels par type d\'activité, pour le réseau de partenaires.', 'Quota plafonné à 900/mois (zéro coût réel)'],
						['Saisie terrain', 'Création rapide d\'une fiche sur place, en rendez-vous chantier.', 'Gratuit'],
						['Veille sectorielle', 'Termes générés par la veille, à lancer en un clic dans la prospection.', 'Gratuit']
					],
					caption: 'SIMAP (marchés publics) et RegBL (chantiers) ne sont plus des sources de prospection manuelle : les marchés publics arrivent désormais par le radar Signaux.'
				},
				{ type: 'diagram', name: 'scoring-prospection', caption: 'Comment le score de priorité (sur 10) est composé. Les mots-clés métier pèsent le plus.' },
				{
					type: 'list',
					ordered: true,
					items: [
						'Ouvrir la fenêtre de recherche, choisir une source, saisir les critères (activité + canton + lieu, ou nom pour Zefix), lancer la recherche.',
						'Lire l\'aperçu : rien n\'est encore ajouté. Cocher les entreprises voulues dans la liste de résultats.',
						'Importer : le serveur revalide, recalcule le score et dédoublonne avant d\'enregistrer (le score envoyé par le navigateur n\'est jamais cru).',
						'Ouvrir un lead dans le panneau latéral pour voir le détail du score critère par critère, puis le convertir en entreprise, le marquer intéressé, ou l\'écarter.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Le panneau de détail montre le score décomposé (canton, téléphone, mots-clés vitrage, montant). Sers-t\'en pour comprendre pourquoi un lead est prioritaire, pas seulement combien il vaut.' },
				{ type: 'callout', tone: 'warning', title: 'Piège', text: 'Google Places se débite dès l\'aperçu (une recherche = un crédit), même sans import : à utiliser à bon escient. Le score est une aide à la priorisation, pas un verdict : un « faible signal » peut être un excellent client si tu connais le contexte.' },
				{ type: 'link', link: { href: '/crm/prospection', label: 'Ouvrir la prospection' } }
			]
		},
		{
			id: 'fn-campagnes',
			title: 'Campagnes',
			icon: 'sell',
			lead: 'Regrouper des prospects par action commerciale grâce à des étiquettes nommées et colorées.',
			blocks: [
				{ type: 'paragraph', text: 'Les campagnes sont des étiquettes que tu poses sur les prospects pour les regrouper : un salon (« Salon Habitat 2026 »), un secteur, une région, une opération ciblée. Une même entreprise peut porter plusieurs campagnes à la fois : ce n\'est pas un statut unique, c\'est un système d\'étiquettes cumulables. L\'écran liste les campagnes, leur couleur, leur nombre de prospects et leur statut.' },
				{
					type: 'list',
					items: [
						'Créer une campagne : nom, couleur (huit teintes de la palette FilmPro), description optionnelle.',
						'Étiqueter des prospects : depuis la fiche d\'un lead, ou en lot à l\'import d\'une recherche, via le sélecteur de campagnes (cocher / décocher, enregistré aussitôt).',
						'Ouvrir une campagne : un clic sur son nom (ou son compteur de prospects) ouvre sa page dédiée, qui regroupe tout le travail de campagne : prospects et groupes, validation externe, étiquettes, PDF et envoi au pipeline.',
						'Renommer, archiver (réversible) ou supprimer une campagne depuis le menu de la ligne.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Supprimer une campagne ne supprime jamais les prospects : elle retire seulement l\'étiquette. Cet écran fait partie de l\'affichage avancé, activé pour les fondateurs ; il n\'apparaît dans la barre latérale que si ce mode est actif sur ton compte.' },
				{ type: 'link', link: { href: '/crm/campagnes', label: 'Ouvrir les campagnes' } }
			]
		},
		{
			id: 'fn-signaux',
			title: 'Signaux',
			icon: 'notifications',
			lead: 'Les événements du secteur captés automatiquement : appels d\'offres et mouvements d\'entreprises.',
			blocks: [
				{ type: 'paragraph', text: 'Les signaux sont la matière première brute, captée automatiquement chaque matin par un robot du CRM : un appel d\'offres sur SIMAP (marchés publics de construction en Suisse romande). C\'est l\'amont commercial. Chaque signal porte un score de priorité et des critères ; tu tries la file : ceux à travailler passent « À suivre », les autres sont « Archivés ».' },
				{
					type: 'list',
					items: [
						'La page ouvre sur les signaux « À trier » ; un second onglet regroupe ceux marqués « À suivre ». Les archivés sont rangés dans une vue à part.',
						'Trier par pertinence (défaut) ou par date ; rechercher et filtrer par canton ; masquer les signaux hors-scope (score nul ou négatif).',
						'Ouvrir un signal pour voir les acteurs, la source et le détail. Le bouton « Statut » le passe « À suivre » ou « Archivé » ; un lien ouvre la fiche officielle sur SIMAP.',
						'La file courte (vingt-cinq signaux) affiche la tête de liste ; un bouton déplie le reste, à plus faible score.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Le mot « signal » a deux sens : ici, c\'est un lead d\'affaires brut. Dans la Veille, un « signal » est un item éditorial de l\'édition hebdomadaire. Les deux ne sont pas la même chose. La liste de mots-clés qui pilote le score se règle dans un panneau réservé aux administrateurs.' },
				{ type: 'link', link: { href: '/crm/signaux', label: 'Ouvrir les signaux' } }
			]
		},
		{
			id: 'fn-veille',
			title: 'Veille sectorielle',
			icon: 'radar',
			lead: 'La synthèse hebdomadaire du secteur vitrage et bâtiment romand : à lire chaque semaine.',
			blocks: [
				{ type: 'paragraph', text: 'La veille est le magazine interne : chaque vendredi, une édition reprend les mouvements de la semaine (marchés, films solaires, vitrages, réglementation), les vérifie, et les met en forme - signaux, impacts stratégiques, et termes de recherche à lancer dans la prospection. Elle est générée puis relue, jamais publiée brute. Un brief PDF et un e-mail résument l\'édition pour les fondateurs.' },
				{ type: 'diagram', name: 'veille-hebdo', caption: 'Le déroulé d\'une édition de veille, de la captation à la lecture.' },
				{
					type: 'list',
					items: [
						'Lire l\'édition de la semaine de bout en bout : c\'est court et c\'est trié pour ça. Cliquer un item pour le détail long-format et la source.',
						'Lancer un terme dans la prospection en un clic depuis la section « termes générés », ou exporter le brief en PDF.',
						'Régler ce que la veille surveille depuis l\'éditeur : les thèmes recherchés et les sources consultées (avec leur niveau de confiance).',
						'Les réglages de l\'éditeur prennent effet à la prochaine génération du vendredi, pas immédiatement.'
					]
				},
				{ type: 'callout', tone: 'tip', title: 'Action clé', text: 'Bloque dix minutes en début de semaine pour lire la veille. C\'est le meilleur ratio temps / contexte du CRM.' },
				{ type: 'callout', tone: 'note', title: 'Comment elle est produite', text: 'La veille est générée par une tâche planifiée externe (GitHub Actions) le vendredi matin, pas par le CRM lui-même. C\'est aussi le seul endroit du système qui fait appel à l\'intelligence artificielle. En cas de besoin, elle peut être relancée manuellement.' },
				{ type: 'link', link: { href: '/crm/veille', label: 'Ouvrir la veille' } },
				{ type: 'link', link: { href: '/crm/veille/editeur', label: 'Ouvrir l\'éditeur (thèmes et sources)' } }
			]
		},
		{
			id: 'fn-reporting',
			title: 'Reporting',
			icon: 'bar_chart',
			lead: 'La vue d\'ensemble chiffrée : volumes, conversions, activité sur la période.',
			blocks: [
				{ type: 'paragraph', text: 'Le reporting agrège les chiffres : valeur du pipeline actif, conversion des leads, contacts et opportunités créés sur les dernières semaines. Quatre indicateurs en tête, puis quatre onglets - Synthèse, Pipeline, Activité, Export. Pas de graphique décoratif : des indicateurs factuels qui répondent à « où on en est ». Tout est calculé côté serveur.' },
				{
					type: 'list',
					items: [
						'Lire les quatre indicateurs : pipeline actif (en CHF), conversion des leads, contacts créés, opportunités créées.',
						'Onglet Synthèse : pipeline par étape + évolution mensuelle + cartes d\'activité.',
						'Onglet Pipeline : la table détaillée étape par étape, avec les montants.',
						'Onglet Export : télécharger en CSV les contacts, les entreprises ou les leads de prospection.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Le reporting est descriptif, pas prédictif : il dit ce qui s\'est passé. La « conversion des leads » est une approximation (part des leads transférés), pas un taux exact lead vers affaire. Les montants du pipeline sont estimés, pas réalisés. La table détaillée et les exports sont réservés à l\'ordinateur.' },
				{ type: 'link', link: { href: '/crm/reporting', label: 'Ouvrir le reporting' } }
			]
		},
		{
			id: 'fn-couts',
			title: 'Coûts API',
			icon: 'payments',
			lead: 'Le suivi du coût de l\'intelligence artificielle utilisée par la veille hebdomadaire.',
			blocks: [
				{ type: 'paragraph', text: 'L\'écran Coûts API trace les dépenses de l\'API Claude consommée par la génération de la veille, sur douze semaines glissantes. C\'est aujourd\'hui le seul service facturé à l\'usage dans le CRM : il sert à garder un œil sur la facture et à détecter une dérive.' },
				{
					type: 'list',
					items: [
						'Voir les quatre indicateurs : coût sur trente jours, sur douze semaines, coût moyen par édition, tendance sur sept jours.',
						'Lire le graphe d\'évolution semaine par semaine et repérer un pic.',
						'Si aucune donnée : les coûts apparaîtront après la première édition de veille publiée.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'À clarifier', text: 'Cette page suit uniquement le coût de la veille (API Claude), en euros. Les sources de prospection sont gratuites ou plafonnées sous le seuil gratuit (Google Places), donc elles n\'apparaissent pas ici. L\'écran est réservé à l\'ordinateur.' },
				{ type: 'link', link: { href: '/crm/dashboard/couts', label: 'Ouvrir les coûts API' } }
			]
		},
		{
			id: 'fn-log',
			title: 'Log des retours',
			icon: 'bug_report',
			lead: 'Signaler un bug, une suggestion ou une question, et suivre son traitement.',
			blocks: [
				{ type: 'paragraph', text: 'Le log centralise les retours sur le CRM : tout bug, suggestion ou question rencontré pendant l\'usage. Un bouton flottant présent sur toutes les pages ouvre le formulaire de saisie ; le contexte technique (page, navigateur, erreurs récentes) est capturé automatiquement. C\'est la mémoire des améliorations à venir.' },
				{
					type: 'list',
					items: [
						'Signaler un retour depuis n\'importe quelle page via le bouton flottant, ou depuis cet écran.',
						'Voir le tableau des retours (type, sévérité, page, auteur, statut) et déplier une ligne pour le détail.',
						'Suivre le statut : Nouveau, À actionner, Traité, Loggé.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Bon à savoir', text: 'Tout le monde peut signaler et lire ; la gestion (changer un statut, exporter, annoter) est réservée à l\'administrateur. L\'écran est réservé à l\'ordinateur (masqué sur mobile et tablette).' },
				{ type: 'link', link: { href: '/crm/log', label: 'Ouvrir le log des retours' } }
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
						'Suivre les liens « Ouvrir... » pour aller directement à l\'écran décrit.'
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
	tagline: 'Pour l\'administration : portail, architecture, infrastructure, sécurité, procédures.',
	sections: [
		{
			id: 'tech-portail',
			title: 'Portail multi-outils',
			icon: 'grid_view',
			lead: 'Un seul accès, plusieurs outils FilmPro : le CRM et Découpe Films.',
			blocks: [
				{ type: 'paragraph', text: 'Depuis la réorganisation de juin 2026, l\'application est un portail : l\'adresse racine affiche l\'accueil (« Bonjour, par où commencer ? ») et une grille d\'outils. Le CRM vit sous /crm ; Découpe Films, l\'optimiseur de plans de coupe, sous /decoupe. Une seule connexion couvre les deux. Le logo de la barre latérale ramène toujours à l\'accueil du portail.' },
				{
					type: 'list',
					items: [
						'CRM : prospection, pipeline, signaux, veille - toujours actif.',
						'Découpe Films : optimisation des découpes de film pour limiter les chutes - réservé aux fondateurs.',
						'Les anciennes adresses internes (avant le portail) sont redirigées automatiquement vers /crm/...',
						'Production : filmpro-portail.vercel.app (l\'ancien hôte filmpro-crm redirige vers le nouveau).'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Accès par outil', text: 'L\'accès à Découpe Films est contrôlé par un indicateur de fonctionnalité (feature flag) activé pour les fondateurs. Tant qu\'il n\'est pas actif sur un compte, la carte « Découpe Films » apparaît grisée. Le CRM, lui, n\'est jamais restreint.' }
			]
		},
		{
			id: 'tech-archi',
			title: 'Architecture',
			icon: 'account_tree',
			lead: 'Comment les briques s\'assemblent : interface, serveur, base de données, services externes.',
			blocks: [
				{ type: 'paragraph', text: 'Le CRM est une application web rendue côté serveur. L\'interface (SvelteKit) appelle des actions serveur qui lisent et écrivent dans une base de données PostgreSQL hébergée chez Supabase (région Europe). Des tâches planifiées (crons) tournent en arrière-plan pour les signaux, les alertes et l\'entretien des données. Quelques services externes complètent l\'ensemble.' },
				{ type: 'diagram', name: 'architecture', caption: 'Vue d\'ensemble : navigateur, application, base de données, services externes.' },
				{
					type: 'list',
					items: [
						'Interface : SvelteKit + Tailwind v4, rendu serveur, hydratation côté client.',
						'Données : PostgreSQL (Supabase EU), avec sécurité au niveau des lignes (RLS) active.',
						'Authentification : code par e-mail (OTP), session sept jours en cookie httpOnly.',
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
						['Code', 'GitHub', 'Versionnement, un dépôt pour le portail.']
					]
				},
				{ type: 'callout', tone: 'note', title: 'Design system', text: 'L\'apparence est régie par le golden standard (tokens couleurs, typographie DM Sans, échelle d\'espacement 8px, primitives partagées). Toute page rendue dans le CRM s\'y conforme. Accent unique : le bleu FilmPro #2F5A9E.' }
			]
		},
		{
			id: 'tech-bdd',
			title: 'Base de données et sécurité des lignes',
			icon: 'database',
			lead: 'Les principales tables et le modèle d\'accès.',
			blocks: [
				{ type: 'paragraph', text: 'La base PostgreSQL stocke les entités du CRM : contacts, entreprises, opportunités du pipeline, leads de prospection, campagnes, signaux, éditions de veille, journaux de quota et de coûts. Les migrations SQL sont versionnées dans le dépôt et appliquées en production de façon traçable.' },
				{ type: 'paragraph', text: 'La sécurité au niveau des lignes (RLS) est active : seul un utilisateur authentifié accède aux données. Le modèle actuel est « mono-tenant plat » : les fondateurs FilmPro voient et modifient les mêmes données, par décision. Les suppressions sensibles (photos, visites) sont journalisées quand un fondateur agit sur la donnée d\'un autre.' },
				{ type: 'callout', tone: 'warning', title: 'À durcir avant un quatrième utilisateur non-fondateur', text: 'Le modèle « tout le monde voit tout » est assumé tant que l\'équipe se limite aux fondateurs. L\'arrivée d\'un commercial junior, d\'un profil terrain ou d\'un prestataire imposerait de passer à des politiques par propriétaire (created_by = utilisateur) et d\'ajouter des tests d\'intégration RLS contre une vraie base.' }
			]
		},
		{
			id: 'tech-auth',
			title: 'Authentification',
			icon: 'lock',
			lead: 'Code par e-mail (OTP), un seul chemin de connexion.',
			blocks: [
				{ type: 'paragraph', text: 'Le CRM utilise un code à usage unique envoyé par e-mail (OTP) : l\'utilisateur saisit son adresse @filmpro.ch, reçoit un code à six chiffres, le valide, et une session de sept jours est ouverte dans un cookie httpOnly. Pas de mot de passe, pas d\'OAuth tiers, pas de fallback - un seul chemin.' },
				{
					type: 'list',
					items: [
						'Domaine autorisé : adresses @filmpro.ch uniquement ; une adresse non autorisée est déconnectée.',
						'Envoi des e-mails : Resend (domaine vérifié).',
						'Session : sept jours, cookie httpOnly, renouvelée à la connexion ; expiration prouvée en production.',
						'Page de connexion expirée : message explicite, possibilité de redemander un code.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Sécurité applicative', text: 'Validation Zod sur les formulaires, limitation de débit (10 requêtes/min par client), en-têtes CSP / X-Frame-Options / HSTS / Referrer-Policy / Permissions-Policy, comparaison à temps constant des secrets de cron, protection anti-CSRF par contrôle d\'origine sur les routes sensibles.' }
			]
		},
		{
			id: 'tech-apis',
			title: 'APIs externes',
			icon: 'api',
			lead: 'Les services tiers appelés par le système, et pourquoi.',
			blocks: [
				{
					type: 'table',
					head: ['Service', 'Usage', 'Coût'],
					rows: [
						['Zefix (REST)', 'Registre du commerce suisse : enrichissement et prospection entreprises, détection des créations.', 'Gratuit'],
						['search.ch', 'Annuaire : prospection d\'entreprises locales avec téléphone.', 'Gratuit (1000 requêtes/mois)'],
						['SIMAP', 'Marchés publics : appels d\'offres, captés par le radar Signaux.', 'Gratuit'],
						['Google Places (New)', 'Établissements opérationnels par type d\'activité (réseau de partenaires).', 'Quota plafonné à 900/mois, sous le seuil gratuit Google.'],
						['fal.ai (Flux 1.1 Pro)', 'Génération d\'images, clé partagée avec le projet Enseignement.', 'Facturé à l\'usage.'],
						['Resend', 'E-mails de connexion, relances quotidiennes, brief de veille.', 'Gratuit (plan free, domaine vérifié).'],
						['Anthropic (Claude)', 'Génération de la veille hebdomadaire, uniquement (tâche externe).', 'Facturé à l\'usage (voir Coûts API).']
					]
				},
				{ type: 'callout', tone: 'warning', title: 'Garde-fou quota', text: 'Google Places est la seule source de prospection potentiellement payante : un compteur en base réserve le créneau avant chaque appel et bloque à 900/mois (sous le seuil gratuit). RegBL (registre des bâtiments) reste codé mais désactivé comme source de prospection.' }
			]
		},
		{
			id: 'tech-crons',
			title: 'Tâches planifiées',
			icon: 'schedule',
			lead: 'Six crons sur Vercel + la génération de la veille en tâche externe.',
			blocks: [
				{ type: 'paragraph', text: 'Six tâches planifiées tournent côté Vercel (horaires en UTC ; ajouter deux heures pour l\'heure suisse d\'été). Chacune est protégée par un secret de cron (comparé en temps constant) et utilise la clé de service Supabase. La génération de la veille, elle, ne tourne pas sur Vercel : c\'est une tâche externe (voir l\'encart).' },
				{
					type: 'table',
					head: ['Cron', 'Horaire', 'Rôle'],
					rows: [
						['signaux', '06:00', 'Capter les nouveaux événements du secteur (appels d\'offres SIMAP, créations d\'entreprise Zefix) et scorer les leads.'],
						['alertes', '07:00', 'Évaluer les seuils et remonter les leads chauds vers le tableau de bord.'],
						['lead-rescore', '05:00', 'Recalculer le score des leads dont le bonus « signal Veille » décroît dans le temps.'],
						['daily-email', '05:00', 'Envoyer aux fondateurs le récap des relances du jour (désactivé par défaut).'],
						['intelligence-archive', '04:00', 'Archiver les éditions de veille de plus d\'un an.'],
						['nettoyage-crm', '03:00 (1er du mois)', 'Vérifier le statut des entreprises au registre, archiver les radiées.']
					]
				},
				{ type: 'callout', tone: 'note', title: 'La veille tourne hors Vercel', text: 'La génération hebdomadaire de la veille est une tâche GitHub Actions (le vendredi matin, avec un rattrapage), pas un cron Vercel. Elle est déportée pour s\'affranchir de la limite de durée des fonctions Vercel, qui avait fait échouer le pipeline. C\'est le seul endroit qui appelle l\'IA.' }
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
						'Variables d\'environnement : gérées dans la configuration Vercel (clés Supabase, secrets de cron, clés API, activation du Daily Email).',
						'Rollback : tags Git de point de bascule posés avant les changements structurels ; commande vercel rollback en cas de souci.'
					]
				},
				{ type: 'callout', tone: 'warning', title: 'Push = production', text: 'Tout push sur la branche principale auto-déploie en production (intégration Git Vercel). Il n\'y a pas d\'étape de validation manuelle entre le merge et la mise en ligne : tester avant de pousser.' }
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
						'En-têtes HTTP : Content-Security-Policy, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (deux ans, includeSubDomains, preload).',
						'Limitation de débit : 10 requêtes par minute et par client sur les routes sensibles.',
						'Validation des entrées : schémas Zod sur les formulaires, échappement systématique des sorties dynamiques, filtres de base toujours paramétrés (pas d\'interpolation de saisie).',
						'Crons : secret partagé comparé en temps constant, clé de service côté serveur uniquement.',
						'Anti-CSRF : contrôle d\'origine sur les routes de mutation sensibles.'
					]
				},
				{ type: 'callout', tone: 'note', title: 'Décisions assumées', text: 'Le CSP autorise les styles et scripts inline : c\'est un prérequis de l\'hydratation SvelteKit ; le risque résiduel est jugé acceptable pour un CRM mono-tenant de dix administrateurs au plus, sans contenu utilisateur tiers. Le modèle RLS « plat » est assumé tant que l\'équipe se limite aux fondateurs.' },
				{ type: 'callout', tone: 'warning', title: 'Limite des tests', text: 'Les tests unitaires simulent la base de données : ils ne prouvent rien sur le comportement RLS réel, qui n\'existe qu\'au runtime PostgreSQL. Avant de bâtir sur un contrôle d\'autorisation, vérifier le code et tester manuellement en production avec un compte au rôle visé.' }
			]
		},
		{
			id: 'tech-runbook',
			title: 'Runbook ops',
			icon: 'checklist',
			lead: 'Cinq procédures d\'exploitation courantes, pas à pas.',
			blocks: [
				{
					type: 'paragraph',
					text: 'Procédure 1 - Réinitialiser l\'accès d\'un utilisateur. L\'authentification étant par code e-mail, il n\'y a pas de mot de passe à réinitialiser : si quelqu\'un n\'arrive pas à se connecter, vérifier que son adresse est bien @filmpro.ch, qu\'elle figure dans les utilisateurs autorisés côté Supabase (Authentication puis Users), puis lui demander de redemander un code depuis /login. Vérifier aussi les spams. En dernier recours, l\'administrateur Supabase peut inviter l\'utilisateur manuellement.'
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
					text: 'Procédure 4 - Lancer la veille manuellement. La veille hebdomadaire est produite par un workflow GitHub Actions (« Cron veille hebdomadaire FilmPro », vendredi matin), et non par une route de l\'application. Pour la relancer hors planning, déclencher le workflow manuellement dans l\'onglet Actions du dépôt GitHub (bouton « Run workflow », champ semaine ISO optionnel). Vérifier ensuite l\'édition produite dans l\'écran Veille avant de la considérer publiée.'
				},
				{
					type: 'paragraph',
					text: 'Procédure 5 - Activer ou couper le Daily Email. Le récap quotidien des relances est désactivé par défaut. Pour l\'activer, poser la variable d\'environnement EMAIL_DAILY_ENABLED à « true » dans la configuration Vercel (aucun redéploiement nécessaire) ; les destinataires par défaut sont les fondateurs. Pour le couper, retirer la variable ou la mettre à autre chose que « true ». Le module n\'envoie jamais les jours sans relance.'
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
