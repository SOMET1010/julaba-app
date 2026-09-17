# Branches supprimées le 17/09/2026 — leur contenu était déjà dans `main`

> Écrit AVANT la suppression, pour qu'aucune ne soit irrécupérable.
> Restaurer l'une d'elles : `git push origin <sha>:refs/heads/<nom>`

## Pourquoi

Le dépôt portait 107 branches réputées « non fusionnées ». Mesure faite le
17/09 en comparant le CONTENU de chacune à celui de `main` :
**105 n'avaient aucune différence**. Elles paraissaient vivantes parce que
leurs PR ont été fusionnées par écrasement (squash) : git ne reconnaît plus
le lien, mais le travail avait bien atterri.

Ce bruit avait un coût réel : il donnait l'impression que du travail validé
n'était pas pris en compte, et il masquait la SEULE branche qui portait
vraiment quelque chose (`doc-voice-omnilingual-asr`, fusionnée par la PR #241).

## Ce qui N'A PAS été supprimé, et pourquoi

- **`main`** — la ligne principale.
- **`claude/clever-allen-dnr8by`** — la branche de travail en cours au moment
  du ménage, non encore fusionnée.
- **`dev`** — son contenu était pourtant identique à `main`, mais c'est un nom
  de branche conventionnel, pas une branche de tâche jetable. La supprimer
  relève d'une décision de flux de travail, pas d'un nettoyage. Laissée en
  place, à trancher séparément.

## Les branches supprimées, et leur dernier commit

| branche | SHA |
|---|---|
| `claude/accents-autres-roles` | `35dd96a` |
| `claude/accents-coeur-cible` | `faec737` |
| `claude/accueil-titre-marge` | `36b3249` |
| `claude/accueil-tuiles-locales` | `3c55410` |
| `claude/anonymisation-complete` | `97f3099` |
| `claude/api-url-backoffice` | `baeb784` |
| `claude/api-url-objectifs-raccourcis` | `2015c34` |
| `claude/audit-ui-code` | `16d68d4` |
| `claude/backlog-2026-08` | `5054127` |
| `claude/backlog-a-jour` | `39bc64c` |
| `claude/blocage-wallet-reel` | `1690218` |
| `claude/bo-communication-reelle` | `43ca8a5` |
| `claude/bo-cron-reel` | `59807fd` |
| `claude/bo-monitoring-ia-reel` | `993a971` |
| `claude/bo-parametres-voix` | `e53b230` |
| `claude/bo-rapports-pdf-reels` | `4591cad` |
| `claude/caisse-plus-cercle` | `6a6da79` |
| `claude/caisse-plus-contraste` | `fb194cc` |
| `claude/cap-azure` | `fab8105` |
| `claude/clavier-image` | `b162d89` |
| `claude/cloche-44` | `b05834e` |
| `claude/cnps-cnam-backend` | `360ce16` |
| `claude/commande-negociation-lien` | `dce6536` |
| `claude/coop-inbox-partagee` | `21a0076` |
| `claude/dates-jour-local` | `f249817` |
| `claude/decisions-entree` | `948e858` |
| `claude/durcir-confirm-suppression` | `6848b07` |
| `claude/ecran-activation` | `04e665b` |
| `claude/entete-retour-tactile` | `5d3708f` |
| `claude/fiche-cibles-tactiles` | `a699ec4` |
| `claude/fidelite-paiement-recompenses` | `3a61bae` |
| `claude/fix-acces-marchand-stock-commun` | `22f2d5c` |
| `claude/fix-activation-critique` | `42fa3c6` |
| `claude/fix-annulation-en-cours` | `fe9c5ab` |
| `claude/fix-audio-unlock-onboarding` | `a431798` |
| `claude/fix-bo-cross-domain-auth-token` | `434a4d0` |
| `claude/fix-change-password-bo-role` | `87f6277` |
| `claude/fix-cooperatives-liste-500` | `b1b8415` |
| `claude/fix-cosmetique-annulee-credits` | `1e020e5` |
| `claude/fix-distribution-stock-commun-visible` | `1fdb117` |
| `claude/fix-flakiness-m6-m8` | `81731c7` |
| `claude/fix-icone-apk-android` | `c046d91` |
| `claude/fix-marche-zone-creation` | `0b1fe7d` |
| `claude/fix-nom-tata-nanti-lou` | `5f2c01c` |
| `claude/fix-notif-caisse-obsolete` | `e21dfb2` |
| `claude/fix-passwordhash-leak-residuel` | `c50514a` |
| `claude/fix-phone-collision-ps-tontine` | `2f36bf6` |
| `claude/fix-prix-achat-marge` | `122847d` |
| `claude/fix-reappro-tronque` | `1d044b0` |
| `claude/fix-recolte-prix-unite` | `12386b0` |
| `claude/fix-reset-password-mechanism` | `cddda86` |
| `claude/fix-seed-demo-password-coherence` | `aebb754` |
| `claude/fix-suppression-stock` | `444e057` |
| `claude/fix-tresorerie-stocks-500` | `8886279` |
| `claude/fix-verite-argent-caisse` | `670f052` |
| `claude/fix-webdir-capacitor` | `aebcfef` |
| `claude/fuite-passwordhash-membres` | `c6103a3` |
| `claude/guidage-vocal-auto` | `2b0e761` |
| `claude/hygiene-voix` | `c106964` |
| `claude/hygiene-voix-canaux` | `85ec12d` |
| `claude/inbox-negociation-producteur` | `860f295` |
| `claude/institution-isolation-donnees` | `ef2012d` |
| `claude/invariants-readiness` | `2f5b7a4` |
| `claude/julaba-conversation-6zfdaz` | `24045db` |
| `claude/julaba-voice-audit-fixes-hi3jlq` | `1d7f01b` |
| `claude/keiwa-paiement-e2e` | `bd1c986` |
| `claude/keiwa-transfert-comptes` | `571274d` |
| `claude/microcredit-palier-reel` | `db266e5` |
| `claude/migration-gps-communes` | `7cae8a6` |
| `claude/mouvements-produit` | `f63dcb8` |
| `claude/mutations-zone-reelles` | `e2f6fa2` |
| `claude/negociation-contre-offre` | `715d084` |
| `claude/negociation-reservation-stock` | `96c4647` |
| `claude/nettoyage-clips-voix` | `a3882b0` |
| `claude/p0-activation` | `aa1eee5` |
| `claude/packs-voix` | `d11f5cf` |
| `claude/protocole-pilote` | `604582b` |
| `claude/raccourcis-rapport-montage` | `bb64b46` |
| `claude/raccourcis-validation` | `9373c67` |
| `claude/readiness-pilote` | `35186d2` |
| `claude/recu-sans-pdf` | `2c10c7f` |
| `claude/routeur-intentions` | `5f99c71` |
| `claude/sauvegarde-auto` | `0728b63` |
| `claude/score-membres-cooperative` | `1791450` |
| `claude/session-ticgbm` | `4b32fbc` |
| `claude/sherpa-onnx-apk` | `9005434` |
| `claude/skill-identifier-acteur` | `8255209` |
| `claude/stock-commun-cooperative` | `3bbeb00` |
| `claude/studio-v1-collecte` | `d3dc3ed` |
| `claude/studio-voix` | `6ff229f` |
| `claude/suppression-cible-exacte` | `ebde4a8` |
| `claude/suppression-modale-fiable` | `77598bc` |
| `claude/tontine-reelle` | `8bd5b75` |
| `claude/unify-unites` | `4333076` |
| `claude/ux-creation-produit` | `49eb5cf` |
| `claude/vente-guidee-catalogue` | `e1d6808` |
| `claude/vente-guidee-confirmation` | `daf5fba` |
| `claude/vente-guidee-grammaire` | `9f09cf1` |
| `claude/vente-guidee-ligne-provisoire` | `2868c7d` |
| `claude/ventes-filtre-voix` | `b00b388` |
| `claude/verrou-parole-ecoute` | `7de70a0` |
| `claude/voix-code-mort` | `c01c5da` |
| `claude/voix-first-activation` | `f955644` |
| `claude/voix-first-numero` | `6dc84f4` |
