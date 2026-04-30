# Spécifications : CRM FilmPro mobile V2 - features terrain

**Version :** 2.0
**Date :** 2026-04-30
**Statut :** Cadrage validé, implémentation à venir
**Auteur cadrage :** Pascal + Claude (S127)
**Précédent :** `SPECS_CRM_MOBILE.md` (V1, S121)

---

## 1. Vision et principe directeur V2

V1 a livré un mobile lisible (responsive sweep + PWA légère). V2 ajoute la **valeur terrain** : capacités qu'un commercial utilise réellement en visite chantier ou en RDV bâtiment.

**Principe directeur (inchangé V1) :** pas d'UX mobile fondamentalement différente. V2 ajoute des features sans casser le pattern Linear/Notion/Stripe Dashboard. Les 4 features V2 s'intègrent dans les écrans existants (formulaire création lead, fiche entreprise, fiche RDV) sans bottom sheet, sans FAB, sans rupture de paradigme.

**Cas d'usage cibles :**

- Photographier la façade d'un bâtiment vitrage juste avant de quitter le chantier, l'attacher à l'entreprise prospect.
- Créer un lead en moins de 30 secondes en sortant d'un RDV impromptu.
- Marquer une étape pipeline « faite » d'un tap depuis la fiche entreprise sur le trottoir.
- Capturer la position GPS au check-in d'une visite pour valider la traçabilité.

---

## 2. Périmètre V2 (4 features)

### F1 - Photo bâtiment intégrée à un lead

**Comportement :**

- Bouton « Ajouter photo » sur la fiche entreprise et sur la modale création lead.
- Sur mobile : ouvre l'appareil photo natif via `<input type="file" accept="image/*" capture="environment">`.
- Upload vers Supabase Storage bucket dédié `prospect_photos/`, lien stocké dans table `prospect_photos` (ou colonne JSON sur `prospect_leads`).
- Affichage thumbnail dans la fiche, tap = visualisation pleine taille.
- Limite : 10 photos par lead, 5 Mo par photo (compression côté client si dépassement).

**Pages concernées :** `/prospection`, `/contacts`, `/entreprises` (fiche détail).

**Critères acceptation :**

- Upload fonctionne mobile iOS Safari + desktop Chrome.
- Photo s'affiche dans la fiche en moins de 2 sec après upload.
- Stockage RLS Supabase scope user_id correct.
- 0 régression desktop (le bouton fonctionne aussi en desktop avec sélection fichier classique).

### F2 - Géoloc visite RDV

**Comportement :**

- Bouton « Check-in visite » sur la fiche RDV (ou fiche entreprise si pas de modèle RDV explicite).
- Au tap : capture `navigator.geolocation.getCurrentPosition()`, stockage lat/lng dans `prospect_visits` (nouvelle table) ou colonne JSON sur l'événement existant.
- Comparaison automatique avec adresse Zefix/search.ch de l'entreprise : si écart > 100m, flagger l'écart (info pour Pascal, pas blocage).
- Affichage discret « visite confirmée à [adresse retro-géocodée] le [date] » dans l'historique fiche.

**Pages concernées :** fiche entreprise (`/entreprises/[id]`), fiche RDV si applicable.

**Critères acceptation :**

- Permission geoloc demandée proprement avec rationale claire.
- Si user refuse permission, message explicite « Géoloc désactivée, check-in manuel possible ».
- Stockage RLS correct.
- Comparaison adresse Zefix fonctionne (écart calculé via distance Haversine).

### F3 - Création lead express mobile

**Comportement :**

- Bouton « Lead express » accessible depuis le dashboard `/` et depuis `/prospection` (sticky search bar mobile).
- Modale 4 champs : nom contact + téléphone + nom entreprise + note libre (texte court).
- Auto-complétion contact iOS native (`autocomplete="name"`, `autocomplete="tel"`).
- Submit : crée `prospect_lead` minimal + `contact` minimal, redirige vers fiche pour enrichissement ultérieur (Zefix, signaux, scoring) en mode différé.
- Cible : saisie complète en moins de 30 secondes.

**Pages concernées :** `/` (dashboard), `/prospection` (sticky bar).

**Critères acceptation :**

- 4 champs visibles sans scroll sur iPhone 14 Pro Max (430×932).
- Submit crée bien lead + contact en base avec scoring 0 (à enrichir manuellement plus tard).
- Pas de régression création lead desktop standard.
- Bouton tap target ≥ 44px partout.

### F4 - Mise à jour pipeline rapide

**Comportement :**

- Sur fiche entreprise, bouton « Étape suivante » avec étape pipeline courante affichée + étape suivante prévue.
- Tap : avance l'étape pipeline + ouvre une mini-modale « prochaine action ? » (date + texte court).
- Pattern : 2 taps maximum pour avancer un lead post-RDV.

**Pages concernées :** fiche entreprise, fiche lead.

**Critères acceptation :**

- Avance pipeline fonctionne sans rechargement page.
- État optimistic UI (basculement immédiat, rollback si erreur Supabase).
- Toast confirmation discret « Pipeline avancé à [étape] ».
- 0 régression desktop.

---

## 3. Stack technique

| Capacité | API web utilisée | Support iOS Safari | Fallback |
|---|---|---|---|
| Photo capture | `<input type="file" capture="environment">` | Oui | Sélection fichier classique |
| Géoloc | `navigator.geolocation.getCurrentPosition()` | Oui (HTTPS only, prompt user) | Adresse manuelle |
| Storage photos | Supabase Storage `prospect_photos` bucket | N/A | – |
| Compression photo | `canvas.toBlob()` côté client | Oui | – |

**Pas de service worker queue, pas d'IndexedDB, pas de WebRTC, pas de Web Speech API.**

---

## 4. Modèle de données (additions)

```sql
-- Photos prospects
CREATE TABLE prospect_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_lead_id uuid REFERENCES prospect_leads(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  caption text
);
ALTER TABLE prospect_photos ENABLE ROW LEVEL SECURITY;

-- Visites avec géoloc
CREATE TABLE prospect_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_lead_id uuid REFERENCES prospect_leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  visited_at timestamptz DEFAULT now(),
  lat numeric(10, 7),
  lng numeric(10, 7),
  address_resolved text,
  distance_from_zefix_m numeric(8, 1)
);
ALTER TABLE prospect_visits ENABLE ROW LEVEL SECURITY;
```

Bucket Supabase Storage `prospect_photos` à créer avec policy RLS scope user_id.

---

## 5. Plan livraison V2 (3 sessions séquencées)

| Session | Périmètre | Effort | Mode |
|---|---|---|---|
| α | Migration DB (2 tables + bucket) + F1 photo (upload + affichage) | ~2h | EXÉCUTABLE |
| β | F2 géoloc visite + comparaison adresse Zefix | ~1.5h | EXÉCUTABLE |
| γ | F3 création lead express + F4 pipeline rapide + tests Playwright mobile + golden v7 | ~2h | EXÉCUTABLE |

Total : ~5.5h cumulées (vs estimation cockpit 6h, confiance Faible → confiance Élevé après cadrage).

---

## 6. Tests

### 6.1 Playwright mobile

Étendre la suite mobile existante (`template/tests/mobile.spec.ts`) avec :

- Upload photo (mock fichier, vérifier appel Supabase Storage).
- Géoloc (mock `navigator.geolocation`, vérifier insertion DB).
- Création lead express (4 champs remplis, submit, vérifier redirection fiche).
- Pipeline rapide (tap étape suivante, vérifier optimistic UI + DB update).

### 6.2 Audit chrome MCP visuel

Screenshots iPhone 14 Pro Max (430×932) sur les 3 pages impactées (fiche entreprise, dashboard, prospection) avant/après chaque session.

### 6.3 DevTools manuel Pascal

Validation finale qualitative sur iPhone Pascal réel : capture photo terrain, géoloc en mobilité, création lead en sortie de RDV simulé.

---

## 7. Hors scope V2 (verrouillé)

| Feature | Statut |
|---|---|
| Note vocale → texte (Web Speech API) | **Retirée définitivement** (pas même V3+) |
| Offline queue création lead | **Retirée définitivement** (pas même V3+) |
| Push notifications signaux/veille | Hors V2, ouvert V3 si données d'usage |
| Recherche entreprise par proximité (<5km) | Hors V2, ouvert V3 si densité base le justifie |
| Bottom sheets / FAB | Hors V2, principe directeur conservé |
| Pivot natif Expo / React Native | Hors V2, à reconsidérer si adoption mobile > 50% post-V2 |
| Caller ID intégré | Hors V2 (pattern natif) |

---

## 8. Performance budgets V2

Mêmes budgets que V1 (cf SPECS_CRM_MOBILE.md section 5). Vérification post-V2 :

- LCP < 2.5s sur 4G simulée
- INP < 200ms (capture photo et géoloc ne doivent pas dégrader INP)
- CLS < 0.1 (modale lead express ne doit pas provoquer layout shift)
- Bundle JS par route < 200kb gzipped (compression image client-side ne doit pas alourdir route)

---

## 9. Risques V2

| Risque | Mitigation |
|---|---|
| Permission géoloc refusée par user | Message clair, fallback adresse manuelle, pas de blocage workflow |
| Upload photo échoue en zone faible réseau | Retry 3 fois + toast erreur explicite + photo conservée localement le temps de l'upload (pas queue persistante) |
| iOS Safari refuse `capture="environment"` sur certaines versions | Fallback automatique vers sélection fichier classique |
| Régression desktop pendant ajout features mobile | Tests Playwright desktop maintenus + audit chrome MCP desktop avant chaque commit |
| Compression photo côté client trop lente sur vieux iPhone | Skipper compression si fichier < 2 Mo, compresser uniquement si > 2 Mo |

---

## 10. Métriques succès V2

À mesurer post-déploiement S+8 :

- **Adoption photo** : ≥ 30% des leads créés mobile ont au moins 1 photo.
- **Adoption géoloc** : ≥ 50% des visites confirmées ont une position GPS.
- **Adoption lead express** : ≥ 40% des créations lead mobile passent par la modale express.
- **Adoption pipeline rapide** : ≥ 25% des avancements pipeline sur mobile.
- **0 bug bloquant** sur les 4 features pendant les 8 premières semaines.

Si un seuil n'est pas atteint S+8 → cadrage V3 ciblé sur le pain point.

---

## 11. Décisions structurelles tranchées (référence S127)

- Option A : PWA poussée sur 4 features terrain ciblées, principe Linear V1 préservé.
- Note vocale retirée définitivement (pas même V3+).
- Offline queue retirée définitivement (pas même V3+).
- Stack inchangée : SvelteKit + Supabase + Vercel, pas de pivot natif.
- Cycle V2 propre dans `SPECS_CRM_MOBILE_V2.md`, V1 figé dans `SPECS_CRM_MOBILE.md` comme référence historique.

---

## Annexes

- Cadrage V1 : `SPECS_CRM_MOBILE.md`
- Branding et golden : `template/src/app.css` + `.claude/goldens/golden-v6-mobile.json`
- Layout : `template/src/routes/(app)/+layout.svelte`
- Composants partagés : `template/src/lib/components/`
- Tests Playwright mobile : `template/tests/mobile.spec.ts`
- Specs métier prospection : `SPECS_PROSPECTION.md`
