# SLI / SLO / Error budget - CRM FilmPro mobile V3 « outil terrain »

Phase 2 product-architect. Date : 2026-05-31.
Stack : SvelteKit + Supabase + Vercel. Cible : <= 10 utilisateurs fondateurs, usage terrain (visite client, chantier), réseau 4G parfois faible.

## Cadrage et hypothèses

- Périmètre = les 5 features critiques de la boucle terrain V3. Pas de SLO sur les écrans desktop (hors pivot mobile).
- Faible volume (<= 10 fondateurs) : les ratios sont calculés sur fenêtre glissante 7 jours (rolling 7j) pour lisser le bruit statistique, sauf l'error budget qui se raisonne sur 30 jours. Sous ce volume, un échec isolé peut représenter plusieurs points de pourcentage : les cibles ci-dessous tiennent compte de cette sensibilité (on ne vise pas du « 5 neuf »).
- Le réseau 4G faible est un facteur terrain assumé : les SLO de latence excluent par construction les requêtes où le client n'a aucune connectivité (échec réseau côté device, jamais arrivé au serveur). On mesure la fiabilité serveur + le temps perçu sur un lien dégradé mais existant.
- Disponibilité d'infra (Vercel + Supabase) : non gérée ici comme SLO propriétaire (hébergement managé, hors de notre contrôle direct). Les incidents d'indisponibilité fournisseur sont exclus du calcul d'error budget feature (voir politique ci-dessous).

## 1. Tableau SLI / SLO par feature critique

Légende latence : p95 = 95e centile (95 % des requêtes sous ce seuil).

| # | Feature (endpoint) | SLI mesurable | SLO cible | Fenêtre | Instrument |
|---|---|---|---|---|---|
| 1a | Compte-rendu de visite - fiabilité (`POST /api/visits`) | Taux de succès = (réponses 2xx) / (réponses 2xx + 5xx). Les 4xx légitimes (400/401/404) sont exclus du dénominateur (erreur client attendue, pas une panne). | > 99 % | rolling 7j | Logs Vercel (codes HTTP) + smoke manuel |
| 1b | Compte-rendu de visite - latence | Latence serveur du `POST /api/visits` hors temps réseau client | p95 < 1 200 ms | rolling 7j | Logs Vercel (durée fonction) + smoke manuel |
| 2a | Upload photo - fiabilité (`POST /api/photos`) | Taux de succès = (2xx) / (2xx + 5xx). 413 (photo > 5 Mo) et 409 (limite 10 photos) exclus (erreur client attendue, gérée par l'UI). | > 98 % | rolling 7j | Logs Vercel + smoke manuel 4G |
| 2b | Upload photo - latence sur 4G | Temps de bout en bout perçu côté device, de l'envoi à la confirmation `2xx` (inclut transfert d'un fichier <= 5 Mo sur 4G) | p95 < 4 000 ms | rolling 7j | Smoke manuel chronométré sur iPhone réel en 4G |
| 3a | Recherche entreprise - latence (`GET /api/entreprises/search`) | Latence serveur de la requête de recherche (index trgm sur `raison_sociale`) | p95 < 600 ms | rolling 7j | Logs Vercel + smoke manuel |
| 3b | Recherche entreprise - fiabilité | Taux de succès = (2xx) / (2xx + 5xx) | > 99,5 % | rolling 7j | Logs Vercel + smoke manuel |
| 4a | Brouillon contact - fiabilité (`POST /api/contact-suggestions`) | Taux de succès = (2xx) / (2xx + 5xx). 400 (au moins un identifiant requis) exclu. | > 99 % | rolling 7j | Logs Vercel + smoke manuel |
| 4b | Brouillon contact - intégrité (qualité de donnée) | Part des brouillons mobile écrits dans `contact_suggestions` et JAMAIS directement dans `contacts` (un brouillon ne doit jamais polluer le référentiel) | = 100 % | rolling 7j | Requête de contrôle Supabase (audit `created_by` mobile sur `contacts`) ; couvert aussi par AC-009 |
| 5 | Gate auth (tous endpoints d'écriture V3) | Part des appels d'écriture non authentifiés (sans session valide) recevant un `401` | = 100 % | en continu | Test Vitest AC-014 (gate) + logs Vercel + smoke manuel (toute écriture 2xx sans session = anomalie) |

### Justification des cibles (réalisme terrain)

- **Visites > 99 %** : écriture la plus critique (la seule écriture « pleine » de la boucle, AC-006). On accepte ~1 échec serveur pour 100 envois sur 7j ; en dessous, focus reliability.
- **Photo > 98 %** : seuil légèrement plus tolérant que les visites car la photo dépend fortement du lien 4G et de Supabase Storage (transfert d'un fichier <= 5 Mo). L'UI rend tout échec rattrapable par « Réessayer » sans perte de la note (AC-011), ce qui réduit l'impact utilisateur d'un échec ponctuel.
- **Photo p95 < 4 s sur 4G** : un upload de 5 Mo sur 4G moyenne (~5-10 Mbit/s utile) prend déjà 4-8 s de transfert pur ; le seuil de 4 s vise un cas 4G correct, pas dégradé. Sur 4G très faible, l'UI affiche l'état « envoi » (AC-011) et la mesure de latence est complétée par l'observation qualitative au smoke.
- **Recherche p95 < 600 ms** : requête indexée (trgm), cap 20 résultats. Doit rester sous la barre de la perception « instantanée » pour un usage debout sur le terrain.
- **Gate auth = 100 %** : binaire et non négociable. Tout `2xx` d'écriture sans session est un défaut de sécurité, pas une dégradation graduelle. Vérifié par test automatisé (AC-014) en plus de l'observation runtime.

## 2. Error budget policy

### Définition

L'error budget est la part d'échec tolérée avant que le SLO ne soit « cramé ». Pour un SLO de fiabilité X %, le budget = (100 - X) % des requêtes sur la fenêtre. Pour la latence, la consommation se mesure par la part de requêtes au-dessus du seuil p95 cible.

Fenêtre de référence error budget : **30 jours glissants** (les SLI individuels se lisent en 7j ; le budget cumulé se raisonne en 30j pour décider des releases).

### Seuils et déclencheurs

| Consommation du budget (sur 30j) | État | Action |
|---|---|---|
| 0 - 75 % | Vert | Releases feature normales. Aucune contrainte. |
| 75 - 100 % | Orange | Alerte. Toute nouvelle release feature touchant la boucle terrain (visites, photo, recherche, brouillon, auth) passe une revue fiabilité avant merge. Pas de gel, mais vigilance. |
| > 100 % (budget épuisé) | Rouge | **Gel des releases feature** sur le périmètre V3. Toute capacité bascule sur la fiabilité (correction de la cause racine, tests de non-régression) jusqu'à retour sous 100 %. Seuls les correctifs de fiabilité et de sécurité sont mergés. |

### Règles d'application

- Le gel s'applique **par feature critique** : si seul l'upload photo crame son budget, on gèle les releases qui touchent le chemin photo, pas l'ensemble du CRM. La gate auth, elle, gèle tout (défaut de sécurité = priorité absolue, traité comme incident, pas comme budget).
- Les incidents d'indisponibilité fournisseur avérés (panne Vercel ou Supabase confirmée côté statut fournisseur) sont exclus du calcul du budget consommé : ils ne sont pas sous notre contrôle et ne doivent pas déclencher un gel injustifié. Ils sont consignés mais neutralisés dans le ratio.
- Toute consommation > 75 % déclenche une entrée de suivi (mémoire ou cockpit) avec la cause racine identifiée.
- Le budget se « recharge » mécaniquement par glissement de la fenêtre 30j une fois la cause corrigée.

## 3. Note instrumentation

### Observabilité : logs Vercel + smoke manuel (Sentry retiré le 2026-06-07)

Sentry a été **retiré du CRM le 2026-06-07** (décision Pascal « pas nécessaire » ; détail méta `project_sentry_removal_2026-06-07.md`). L'observabilité des SLI ci-dessus repose donc, de façon **permanente**, sur deux relais - suffisants pour <= 10 fondateurs en V3 :

- **Smoke manuel** : à chaque jalon (et au smoke iPhone réel Pascal, AC-017), exécuter la boucle terrain complète et noter manuellement les échecs et la latence perçue. L'upload photo p95 sur 4G se chronomètre à la main sur iPhone réel en 4G (pas de Wi-Fi, pas d'émulateur, conformément à la règle de test mobile DevTools projet).
- **Logs serveur Vercel** : les logs des fonctions SvelteKit fournissent les codes HTTP et la durée d'exécution serveur. Ils permettent un calcul approximatif des taux 2xx/5xx et de la latence serveur (hors temps réseau client) en cas d'investigation, sans collecte continue automatisée.

Limite explicite assumée : sans collecteur dédié, pas de p95 agrégé en continu ni d'alerte automatique sur consommation d'error budget. La mesure est ponctuelle (au smoke) et réactive (sur log à l'investigation), pas proactive. Un suivi SLO continu nécessiterait de réintroduire un outil d'observabilité - décision produit à rouvrir si le volume le justifie.

### Core Web Vitals (perception UI mobile) - via Lighthouse CI

Lighthouse CI en profil mobile, sur les écrans de la boucle terrain, gate les vitales perçues :

| Métrique | Cible | Note |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2,5 s | Contenu principal visible vite, debout sur le terrain |
| INP (Interaction to Next Paint) | < 200 ms | Réactivité au tap (cibles >= 44x44 px, AC-012) |
| CLS (Cumulative Layout Shift) | < 0,1 | Pas de saut de mise en page (lisibilité, verdict V2) |

Lighthouse CI tourne en profil mobile (throttling réseau/CPU mobile). Ces seuils complètent les SLI serveur : les logs Vercel mesurent la fiabilité et la latence côté API, Lighthouse mesure la qualité perçue côté rendu mobile.

## 4. Hors-scope SLO V3 (non mesuré)

Ces éléments ne font **pas** l'objet d'un SLI/SLO en V3, par décision de périmètre :

- **Mode offline** : il n'y a pas de mode hors-ligne en V3. L'app suppose une connectivité (même dégradée). Aucun SLI sur la résilience offline, la synchronisation différée ou la file d'attente locale. Un échec total de connectivité côté device est exclu des dénominateurs de fiabilité (la requête n'atteint jamais le serveur).
- **Notifications push** : pas de push en V3. Aucun SLI sur le taux de livraison ou la latence de notification.

Si l'un de ces deux périmètres entre dans une version future, ses SLI/SLO devront être ajoutés explicitement à ce document.
