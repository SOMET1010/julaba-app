# Branches à supprimer — leur travail est déjà dans `main`

> ⚠ Elles ne sont PAS encore supprimées : la passerelle git de la session a
> refusé l'opération (HTTP 403). La commande vérifiée est dans
> [`scripts/supprimer-branches-fusionnees.sh`](../scripts/supprimer-branches-fusionnees.sh).

> Écrit AVANT la suppression, pour qu'aucune ne soit irrécupérable.
> Restaurer l'une d'elles : `git push origin <sha>:refs/heads/<nom>`

## Pourquoi

Le dépôt portait 107 branches réputées « non fusionnées ». Elles paraissaient
vivantes parce que leurs PR ont été fusionnées par écrasement (squash) : git ne
reconnaît plus le lien, mais le travail avait bien atterri.

Ce bruit avait un coût réel : il donnait l'impression que du travail validé
n'était pas pris en compte.

## La première mesure était fausse — 18/09

La mesure du 17/09 concluait que **105 branches n'avaient aucune différence
avec `main`**. Elle a été faite sur un dépôt **cloné en surface** (*shallow*).
Dans ce mode, git ne voit qu'une tranche d'histoire et répond « aucune base
commune » à toute question d'ascendance : la conclusion ne mesurait rien.

Refaite le 18/09 sur l'histoire complète (`git fetch --unshallow`, 645 commits
au lieu de 171) :

| | branches | preuve |
|---|---|---|
| ancêtres directs de `main` | **68** | `git merge-base --is-ancestor` |
| fusionnées par écrasement | **35** | contenu retrouvé fichier par fichier dans `main` |
| portait encore quelque chose | **1** | voir ci-dessous — abandonnée sur arbitrage |

Les 35 « écrasées » ont été vérifiées une par une, pas déduites : `CONSTITUTION.md`,
`docs/adr/ADR-001`, `ADR-002`, `backend/src/fidelite-rest/`, la migration GPS des
communes, `backend/test/invariants/keiwa-paiement-commande.spec.ts`,
`frontend_src/src/app/services/ligneProvisoire.ts` — tous présents dans `main`.

### `claude/julaba-voice-audit-fixes-hi3jlq` — tranchée le 18/09

Elle porte 17 commits dont le contenu n'est **pas** dans `main` : le moteur
sherpa-onnx compilé en **WASM pour le navigateur** (`frontend/public/voix/sherpa/`
— reconnaissance ET synthèse côté web). `main` n'a que la voix **native** de
l'APK.

**Arbitrage de Patrick : on abandonne le chemin web.** Le produit du pilote est
l'APK, et sa voix native fonctionne — il l'a entendue sur son téléphone. Porter
cette branche dans `main` supposerait de la replacer intégralement (elle date
d'avant l'unification `frontend/` → `frontend_src/`), pour une capacité dont
aucune marchande du pilote n'a besoin.

Elle est donc supprimée avec les autres. Son SHA est dans le tableau ci-dessous
comme tous les autres : si le besoin d'une voix web revient, une ligne la
ramène.

## Ce qui n'est pas concerné, et pourquoi

- **`main`** — la ligne principale.
- **`claude/clever-allen-dnr8by`** — la branche de travail en cours au moment
  du ménage, non encore fusionnée.
- **`dev`** — son contenu était pourtant identique à `main`, mais c'est un nom
  de branche conventionnel, pas une branche de tâche jetable. La supprimer
  relève d'une décision de flux de travail, pas d'un nettoyage. Laissée en
  place, à trancher séparément.

## Les 104 branches archivées, et leur dernier commit

Les 104 sont supprimables depuis l'arbitrage du 18/09.

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
