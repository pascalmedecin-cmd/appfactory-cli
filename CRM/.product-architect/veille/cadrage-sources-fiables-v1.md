# Cadrage « Sources fiables » - Veille FilmPro

Statut : VALIDÉ par Pascal le 2026-06-23 (décision + taxonomie). Base = recherche
approfondie 9 agents (5 angles sources primaires + 3 sceptiques adversariaux) + arbitrage.
Origine de la demande : Pascal veut se fier à une source reconnue plutôt qu'au filtre IA,
cadrer largement « sources fiables » (au-delà de presse/science/public), atteindre >= 3
signaux/semaine. Décision mécanique tranchée par Pascal (AskUserQuestion) : confiance sauf
contradiction, y compris sur les chiffres, avec 2 garde-fous stricts.

## 1. Principe (la décision de Pascal)

Une source **fiable** bénéficie de la **confiance** : on ne vérifie plus chaque fait
mot-pour-mot sur la page. Garde unique : on publie **sauf si la page contredit franchement
le résumé** (divergence factuelle réelle), et l'URL doit être **active** (déjà garanti, 2
verrous : amont + refetch). Une source **non fiable** conserve le **filtre strict verbatim**
actuel : chaque fait absent de la page = rejet.

Décision Pascal (renverse la reco prudente de l'analyse) : la confiance s'applique **aussi
aux faits durs** (chiffres, dates, noms). Sur une source reconnue, un chiffre **absent** de
la page extraite **ne bloque plus** l'article ; seul un chiffre **contredit** par la page
bloque. Justification : l'extracteur de texte est grossier (rate tableaux, PDF, images, SPA)
- sur une source reconnue, un chiffre « introuvable » est le plus souvent un faux négatif de
l'extracteur, pas une invention. Pascal assume le risque résiduel (chiffre réellement
fabriqué, absent et non contredit) car il préfère se fier à une source reconnue.

**Deux garde-fous stricts conservés** (les seuls vrais trous trouvés par les sceptiques),
même sur une source reconnue :
1. **Héritage de flag** : un chiffre que l'article **attribue à un cabinet d'études**
   (Mordor, Fortune Business, MarketsandMarkets, SNS, Grand View, Allied, « selon une
   étude de marché »...) repasse en strict verbatim. Sinon une presse fiable blanchirait
   une hallucination W18 sous sa signature.
2. **Chiffres de lobby** : sur un domaine d'**association / fédération** sectorielle, tout
   chiffre de **marché / performance / superlatif** reste strict (organes financés par
   l'industrie). Les faits techniques/normatifs/auto-déclaratifs restent en confiance.

La fiabilité est un attribut **du DOMAINE** (allowlist tiérée, bâtie par recherche humaine),
**jamais re-jugée par le LLM article par article**. **Règle d'or : dans le doute, strict.**
Un domaine inconnu (hors allowlist) reste strict.

Rappel : la séparation faits / voix d'analyste (le « so what ») est **déjà codée depuis le
2026-06-22** (le bypass de l'interprétation existe déjà). Ce cadrage ajoute le bypass des
**faits durs** pour les sources reconnues, sous les 2 garde-fous ci-dessus.

## 2. Définition opérationnelle d'une source fiable

Un domaine est fiable s'il coche **contrôle éditorial** ET **indépendance du sujet** ET
reste **hors denylist** :

1. **Contrôle éditorial vérifiable** : rédaction / ours / éditeur responsable, chaîne de
   relecture avant publication (presse à rédaction, revue à comité de lecture, organisme
   officiel). Distingue une publication d'un blog auto-publié.
2. **Redevabilité et correction publique** : la source corrige ses erreurs (politique de
   correction, conseil de presse, droit de réponse). C'est ce qui justifie le bypass.
3. **Indépendance vis-à-vis du sujet couvert** : la source ne vend pas le produit dont elle
   parle. Bloque fabricants/installateurs/marques et cabinets qui vendent le rapport chiffré.
4. **Séparation éditorial / publicité** : pas de contenu sponsorisé non signalé ; une
   rubrique advertorial n'hérite pas de la fiabilité du titre.
5. **Signature + responsabilité identifiable** : articles signés, propriétaire identifiable.
6. **Autorité institutionnelle / normative / scientifique** : organisme public mandaté,
   institut de normes, statistique officielle, registre officiel (brevet délivré), revue
   peer-reviewed. La source est alors productrice primaire de la donnée.
7. **Primaire vs agrégateur** : producteur de l'information, pas un repompeur SEO ni un wiki
   ouvert modifiable.

## 3. Catégories FIABLES (confiance + garde contradiction)

| # | Catégorie | Région | Tier | Exemples de domaines | Caveat |
|---|---|---|---|---|---|
| 3.1 | Officiel / normatif / légal | CH/FR/EU/monde | T1 | admin.ch, bafu.admin.ch, bfe.admin.ch, fedlex.admin.ch, sia.ch, snv.ch, minergie.ch, iso.org, cen.eu, ademe.fr, cstb.fr, afnor.org, legifrance.gouv.fr, eur-lex.europa.eu, commission.europa.eu, iea.org, irena.org | Aucun (la plus sûre) |
| 3.2 | Statistiques officielles | CH/FR/EU | T1 | bfs.admin.ch, ofs.admin.ch, ec.europa.eu (eurostat), insee.fr, destatis.de | Aucun. **À AJOUTER** (absents) |
| 3.3 | Agences publiques énergie/bâtiment | CH/FR/EU | T1 | energieschweiz.ch, suisseenergie.ch, leprogrammebatiments.ch, cecb.ch, are.admin.ch | Chiffres de bilan/projection à attribuer |
| 3.4 | Associations / fédérations sectorielles | CH/FR/EU | T1 | ewfa.org, iwfa.com, glassforeurope.com, apfv.org, asffv.fr, sigab.ch, sfv-asvp.ch, ffpv.org | **Advocacy** : strict verbatim sur tout chiffre de marché / % perf / superlatif (garde-fou 2) |
| 3.5 | Presse pro bâtiment / vitrage / façade | CH/FR/EU/monde | T2 | espazium.ch, batiactu.com, lemoniteur.fr, detail.de, glassonweb.com, glassmagazine.com, hochparterre.ch, baublatt.ch, glaswelt.de, gff-magazin.de, baunetzwissen.de, lechodelabaie.fr | Strict sur rubriques sponsorisées (5.2) + héritage de flag (5.4) |
| 3.6 | Presse généraliste de qualité | CH/FR | T4 | rts.ch, srf.ch, rsi.ch, swissinfo.ch, letemps.ch, nzz.ch, 24heures.ch, tdg.ch, watson.ch, heidi.news, bilan.ch, handelszeitung.ch, lemonde.fr, lesechos.fr, latribune.fr | Strict si paywall sans corps (5.1) + opinion/sponsorisé (5.2) + héritage de flag (5.4) |
| 3.7 | Agence de presse nationale | CH | T4 | keystone-sda.ch, ats.ch | Aucun. **keystone-sda.ch à AJOUTER** |
| 3.8 | Recherche peer-reviewed / brevets / labos | monde/CH/FR | T5 | nature.com, sciencedirect.com, science.org, ieee.org, link.springer.com, onlinelibrary.wiley.com, espacenet.com, patents.google.com, wipo.int, empa.ch, epfl.ch, ethz.ch, heia-fr.ch, fraunhofer.de, cnrs.fr | **Preprints exclus** (section 4) |

## 4. Lignes rouges - RESTENT strict ou denylist

| Catégorie | Statut | Raison |
|---|---|---|
| Cabinets d'études de marché à chiffres payants | STRICT (STRICT_VERBATIM_DOMAINS) | Hallucination W18. + grandviewresearch.com, researchandmarkets.com, giiresearch.com, alliedmarketresearch.com |
| Grands cabinets conseil (T3) | STRICT en bloc | « Confiance si méthodo publiée » non codable déterministe. McKinsey/JLL/CBRE/Deloitte inclus |
| Fils de communiqués (PR wires) | STRICT | Contenu soumis par l'émetteur. Préexistants : globenewswire.com, businesswire.com. Ajouts 06-23 : prnewswire.com, accesswire.com, einpresswire.com, newswire.ca |
| Concurrents / installateurs / marques sur leurs produits | STRICT (T6/T7) | Biais marketing. Signal auto-déclaratif seul, chiffres attribués |
| Contenu sponsorisé / publireportage | STRICT même sous domaine fiable | La fiabilité ne se transmet pas à la rubrique payée (5.2) |
| Tribunes d'opinion / éditoriaux | STRICT / étiqueté avis | Opinion subjective, pas un fait (5.2) |
| Preprints académiques | STRICT (set dédié) | Non peer-reviewed. arxiv.org, medrxiv.org, biorxiv.org, preprints.org, ssrn.com, researchsquare.com |
| Agrégateurs SEO / blogs marketing / spam prouvés (W18) | DENYLIST | Sources PROUVÉES toxiques. Le filtre anti-hallu ne peut pas les rattraper (il vérifie que le résumé colle à la source, pas que la source dit vrai). Denylist volontairement ÉTROITE |
| Réseaux sociaux / forums / wikis ouverts / UGC | **STRICT (filtre anti-hallu, PAS exclus)** | Décision Pascal 2026-06-23 : non « fiable » != exclu. Passent par le filtre strict verbatim (chaque fait doit être sur la page). wikipedia.org, reddit.com, x.com, etc. ne sont PAS denylistés |
| Revendeur qui CITE une norme | STRICT | Mentionner EN 1279 / CE n'hérite pas de l'autorité de la norme |
| Domaine inconnu (tier=null) | STRICT par défaut | La confiance est un privilège par domaine nommé ; mais inconnu = filtré, jamais exclu |

**Principe transversal (décision Pascal 2026-06-23) :** une source qui n'est PAS dans la
liste « fiable » n'est **jamais exclue** d'office - elle passe par le **filtre anti-hallu**
(régime strict : chaque fait doit être présent verbatim sur la page, sinon rejet). La seule
EXCLUSION (denylist) est réservée aux sources **prouvées toxiques** (blogs marketing / spam
SEO identifiés en W18), que le filtre ne peut pas rattraper. Tout le reste (T3 cabinets, T6/T7
concurrents, réseaux sociaux, wikis, domaines inconnus) = filtre strict, pas exclusion.

## 5. Cas particuliers / caveats viables

**5.1 - Paywall sur une source fiable.** « Publier sauf contradiction » suppose qu'on lit la
page. Sur paywall (corps inaccessible / teaser seul), le vérificateur ne peut constater
aucune contradiction -> le bypass devient un chèque en blanc. Règle : le bypass ne s'applique
que si le **corps réel** a été extrait (longueur significative). Sinon -> strict (et si le
fait n'y est pas, rejet). Jamais denylister le domaine : caveat par-item. Étendre
PAYWALL_DOMAINS aux T4 payants (nzz.ch, lesechos.fr, lefigaro.fr, handelszeitung.ch,
bilan.ch).

**5.2 - Rubrique sponsorisée / opinion sur un média fiable.** Vecteur de faille principal du
bypass. Détecteur déterministe par pattern URL/titre force le strict même sur domaine fiable.
Patterns sponsorisé : `/sponsored/`, `/partner/`, `/partenaire/`, `/publi/`, `/advertorial/`,
`/brandstudio/`, `/native/`, `/communique/`, `/press-release/`, + titre « en collaboration
avec », « présenté par », « contenu de marque », « publi-communiqué ». Patterns opinion :
`/opinion/`, `/tribune/`, `/edito/`, `/chronique/`, `/debat/`, `/idees/`, `/meinung/` + titre
« Opinion : ». Logger chaque rétrogradation (mesurer faux positifs).

**5.3 - « Absent de la page » dû à un extracteur grossier.** C'est précisément le cas que la
décision Pascal couvre : sur une source reconnue, un fait absent du texte extrait n'entraîne
PAS le rejet (faux négatif probable de l'extracteur). Garde de sûreté conservée : si le corps
est trop pauvre/non extractible (page quasi vide), on retombe en unverifiable -> rejet (on ne
publie pas un article qu'on n'a pas pu lire du tout). La distinction « page riche sans le
fait » -> strict, proposée par l'analyse, est **écartée** par décision Pascal (elle annulerait
le bénéfice volume).

**5.4 - Héritage de flag (chiffre relayé d'une source strict).** Garde-fou 1. Si l'article
attribue un chiffre à un domaine de STRICT_VERBATIM_DOMAINS ou à un cabinet à chiffres
nommé (Mordor, Fortune Business, MarketsandMarkets, SNS, Grand View, Allied), ce chiffre
**repasse en strict verbatim** même si le domaine porteur est fiable.

## 6. Traduction en implémentation

**Tiers -> régime :**

| Tier | Régime |
|---|---|
| T1 officiel/normatif/stats/légal/agences | Fiable |
| T1 associations/lobbies (3.4) | Fiable + clause advocacy (strict sur chiffre marché/perf) |
| T2 presse pro | Fiable + détecteur sponsorisé/opinion + héritage de flag |
| T4 presse généraliste + agence | Fiable + garde paywall + détecteur sponsorisé/opinion + héritage de flag |
| T5 revues peer-reviewed / brevets / labos | Fiable (hors preprints) |
| T5 preprints | STRICT (set ACADEMIC_PREPRINT_STRICT) |
| T3 cabinets / conseil | STRICT en bloc |
| T6 / T7A / T7B | STRICT |
| STRICT_VERBATIM_DOMAINS | STRICT (+ extensions) |
| Denylist | REJET (+ extensions) |
| Domaine inconnu (tier=null) | STRICT par défaut |

**Mécanisme (clé de voûte, anti-régression) :** le **gate déterministe reste inchangé** -
rejet si `facts_ok=false` (brèche H-04 fermée, gate superlatif/exclusivité actif partout). Ce
qui change = le **CRITÈRE** du vérificateur selon le régime de la source :
- Source **strict** -> SYSTEM actuel (« l'absence d'un fait suffit à rejeter »).
- Source **fiable** -> SYSTEM « confiance » : un fait dur n'est rejeté que s'il est
  **contredit** par la page (l'absence seule ne rejette plus), SAUF (a) chiffre attribué à un
  cabinet d'études (héritage de flag, strict) et (b) chiffre marché/perf sur domaine advocacy
  (strict). La voix d'analyste reste traitée comme aujourd'hui.

Helper `classifyVerificationRegime(host, item) -> 'strict' | 'trusted' | 'trusted_advocacy'` :
retourne `strict` si `isDeniedSource` (déjà rejeté avant), `requiresStrictVerbatim`, tier
T3/T6/T7, preprint, sponsorisé/opinion (5.2), `tier === null`. Retourne `trusted_advocacy`
si association (3.4). Sinon `trusted`. Le gate paywall (5.1) et l'héritage de flag (5.4) sont
gérés dans le vérificateur (corps réel lu ; clause attribution dans le SYSTEM trusted).

**Domaines à AJOUTER :** stats (bfs/ofs.admin.ch, ec.europa.eu, insee.fr, destatis.de),
légal/normes (eur-lex.europa.eu, fedlex.admin.ch, iso.org, cen.eu, cencenelec.eu, ige.ch),
agences CH (energieschweiz.ch, suisseenergie.ch, leprogrammebatiments.ch, cecb.ch), assos
films (apfv.org, asffv.fr, sigab.ch, sfv-asvp.ch, ffpv.org), presse pro DE
(glaswelt.de, gff-magazin.de, baunetzwissen.de, lechodelabaie.fr), presse/agence
(keystone-sda.ch, rsi.ch, watson.ch, latribune.fr), revues/labos (link.springer.com,
onlinelibrary.wiley.com, tandfonline.com, cnrs.fr, fraunhofer.de).

**Corrections allowlist :** `glass-for-europe.eu` (mort) -> `glassforeurope.com`. NE PAS
ajouter « SVS » (Schweissverein, hors sujet) ; la vraie assoc verre = `sfv-asvp.ch`.

**Extensions strict :** STRICT_VERBATIM += grandviewresearch.com, researchandmarkets.com,
giiresearch.com, alliedmarketresearch.com, snsinsider.com, prnewswire.com, accesswire.com,
einpresswire.com, newswire.ca (régime strict, PAS exclusion : ces sources passent par le
filtre anti-hallu). Nouveau set ACADEMIC_PREPRINT_STRICT (arxiv.org sort du régime fiable de
T5). **DENYLIST : inchangée** (décision Pascal 2026-06-23) - on n'AJOUTE PAS les réseaux
sociaux / wikis ; ils passent par le filtre strict, jamais exclus. La denylist reste la liste
W18 historique (blogs marketing / spam SEO prouvés).

## 7. Effet attendu sur le volume

W25 = 1 item sur ~6 générés parce que des **chiffres** (17 %, 249 TWh, 1,2 Md m²) n'étaient
pas retrouvés sur la page (faux négatifs probables de l'extracteur sur des sources reconnues),
ET parce que l'allowlist ratait des sources locales légitimes. Le bypass des faits durs sur
sources reconnues (décision Pascal) + l'élargissement de l'allowlist (stats officielles,
normes, assos films, presse pro DE, agence Keystone-ATS, presse romande) récupèrent ces
signaux sans rien fabriquer. Objectif >= 3 signaux/semaine atteignable, les 2 garde-fous
fermant les seuls vrais trous. À mesurer en prod sur W26+ (hypothèse, non validée).
