# Archive CLAUDE.md CRM - condensation du 2026-07-03 (fin de session workflow validation)

Versions longues verbatim retirées du CLAUDE.md courant (politique : préserver les 5 derniers livrés, archiver le reste + resserrer le volatile).

## Livré (au-delà des 5 derniers)

- [x] ~~**Message de partage du lien de validation : mention usage à plusieurs**~~ - 2026-07-03 (**LIVRÉ PROD** `6f385c0`). Vérifié code : le token EST l'autorisation (pas d'identité), dernier choix gagne par prospect → 1 ligne dans le message copié. **Smoke prod Pascal fait** (« lien généré en prod ok ») : workflow campagne e2e clos. 2518 verts.

## Chez Pascal - gestes faits (retirés du CLAUDE.md)

- [x] ~~Faire le smoke OTP de production end-to-end~~ - Fait 2026-07-03 : login OTP + lien de validation réel OK (« lien généré en prod ok ») ; autres surfaces à l'œil en Watch.

## Watch list - versions longues (resserrées dans le CLAUDE.md, fond inchangé)

- **[WATCH] Validation externe - 3 Low différés (bug-hunter 2026-07-02)** : (1) re-typer `patches` étiquettes en `ProspectCampagne` (fragile si le `select` prospects est rétréci) ; (2+3) reset `[id]` incomplet + flash filtre → `{#key campagne.id}`, mais flux campagne→campagne direct non-occurrent (retour via liste = remount). Validation protégée (filtre lu de `data.prospects`). → [[project_validation_externe_campagne_2026-07-02]] + [[audit_secu_2026-07-02_validation_externe]].
- **[WATCH] Surfaces refondues restantes** : OTP + page campagne + lien validation prouvés prod 03/07 ; restent à l'œil à l'usage (Signaux, Étiquettes, Aide, Découpe, layerchart, 16 leads réparés). Rollback = flag OFF ou `vercel rollback` (migrations additives). → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]] + [[project_groupes_campagne_etiquettes_transition_2026-07-02]].
- **[WATCH] Récidive « importé mais non attaché » (2026-07-02)** : cause des 16 leads indéterminée (logs expirés) ; depuis `c7efdd4` tout non-étiquetage est VISIBLE. Re-signalement SANS alerte vue → flux UI (modale sans preset) ; AVEC alerte → `console.warn` Vercel dans l'heure. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Veille W28 (vendredi 10/07)** = 1er cron auto post-fix pause_turn : vérifier qu'il passe sans intervention (W27 : cron du 03/07 en échec pause_turn → fix `2a5207e` + rattrapage manuel publié 4 items / 100 % local / low_volume ; le 2e cron anti-skip du soir doit faire idempotent_skip). Densité à l'œil : 2 runs W27 ont donné 6 puis 4 items gardés (variance réelle, cible 8-12 jamais atteinte depuis Bloc 0). → [[project_veille_sourcing_w26_2026-06-23]] + [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

## Header « Dernière mise à jour » (version longue du 2026-07-03)

**Dernière mise à jour :** 2026-07-03 après-midi (**validation externe : workflow révisé `d629cd3`** - décidés restent affichés, bouton « Envoyer la validation » → badge « Validation reçue », étiquettes jamais bloquantes ; plus tôt : veille fix pause_turn `2a5207e` + W27 publiée, aperçu étiquettes = PDF réel `1643435`, workflow campagne e2e clos `640cda2`+`6f385c0`, smoke prod Pascal OK). Trunk = `main` ; Flag `ffCrmListesV2` **ON fondateurs**. Prod = `filmpro-portail.vercel.app` (push `main` auto-déploie, intermittent - cf. Watch). **À FAIRE Pascal** : variable Daily Email (§ Chez Pascal). **Prochain bug :** #001.
