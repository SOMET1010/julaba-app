# REVIEW_LOG.md — Journal des revues de code JULABA

> Tenu par l'Agent Reviewer. Format : chaque entrée = une revue de code.

## État au 2026-09-28

- **Total revues** : 0 (système initialisé)
- **Revues positives** : 0
- **Revues bloquantes** : 0
- **Revues en attente** : 0

## Format d'enregistrement

```
### REVIEW-XXX — [Feature / PR / Commit]
- **Date** : YYYY-MM-DD
- **Reviewer** : Agent Reviewer
- **Auteur du code** : <Agent>
- **Fichiers concernés** : ...
- **Statut** : ✅ APPROUVÉ / ⚠️ APPROUVÉ AVEC REMARQUES / ❌ BLOQUÉ
- **Critères évalués** :
  - Qualité du code : ✅/⚠️/❌
  - Patterns respectés : ✅/⚠️/❌
  - Lisibilité : ✅/⚠️/❌
  - Maintenabilité : ✅/⚠️/❌
  - Séparation des couches : ✅/⚠️/❌
  - Pas de duplication inutile : ✅/⚠️/❌
  - Tests unitaires : ✅/⚠️/❌
  - Tests E2E (si applicable) : ✅/⚠️/❌/N/A
  - Documentation : ✅/⚠️/❌
- **Remarques** : ...
- **Actions correctives demandées** : ...
- **Date de validation finale** : YYYY-MM-DD
- **Commit validé** : <SHA>
```

## Règles de revue (rappels)

### Critères obligatoires
1. **Qualité du code** : nommage explicite, fonctions courtes (<50 lignes), fichiers <500 lignes, complexité cyclomatique <10, nesting <3 niveaux
2. **Patterns respectés** : Repository/Service/Controller appliqués uniformément, imports cohérents (pas de mélange relatif/absolu injustifié)
3. **Lisibilité** : commentaires pédagogiques sur points critiques, pas de code mort, pas de TODO/FIXME non résolus
4. **Maintenabilité** : pas de console.log/debugger oubliés, pas de magic numbers
5. **Séparation des couches** : pas de requête DB dans composants frontend, logique métier dans services backend
6. **Pas de duplication inutile** : justifier toute duplication dans `ARCHITECTURE.md`
7. **Tests** : couverture des cas nominaux + erreurs + edge cases, pas de tests fragiles (flaky)
8. **Documentation** : fonctions publiques documentées, endpoints API avec exemples, ADR pour décisions majeures

### Garde-fous CI existants
- Gate TypeScript cliquet (`ci/check-tsc-baseline.mjs` + `ci/tsc-baseline.txt` = 0)
- Budget bundle CI (`check-bundle-budget.mjs` 800 KB max)
- Verrou schéma figé (`schema-pilote.yml`)
- 8 scripts de garde-fou source dans `scripts/`
- `caisseCharte.test.mts` (pas de couleurs en dur dans POSCaisse)

### Règle d'arrêt de revue
- ❌ **BLOQUÉ** si : vulnérabilité critique introduite, test critique supprimé sans remplacement, regression d'invariant, séparation des couches violée sur un module sacré
- ⚠️ **APPROUVÉ AVEC REMARQUES** si : dette technique mineure ajoutée (à tracer dans `DEBT_REPORT.md`), documentation manquante (à ajouter dans la même PR), typage faible (à améliorer dans une PR suivante)
- ✅ **APPROUVÉ** si : tous les critères obligatoires respectés

## Revues historiques (avant système multi-agents)

Le projet a un historique de revues très riche :
- 780 commits au total, dont ~51% signés Claude (instance IA JULABA historique)
- 35 branches vivantes (dont ~22 `review/`) — nombreuses PR formelles
- 5 ADR documentés avec revue par Patrick
- Registre de dette à 20 révisions (auto-correction documentée — l'auditeur rouvre et referme ses propres erreurs)

## À venir

*(Sera mis à jour à chaque revue du système multi-agents)*

## État au 2026-10-06

- **Total revues** : 3
- **Revues positives** : 0
- **Revues bloquantes** : 1 (REVIEW-003)
- **Revues avec remarques** : 2 (REVIEW-001, REVIEW-002)
- **Revues en attente** : 0

> Périmètre revu : tout le code poussé sur `dev` depuis le dernier audit (`docs/audit/AUDIT-UX-ROLES-2026-10-06.md` @ `dffe705`) — lots UX-1, UX-2, UX-6, BUG-005, et le commit parallèle de l'agent UX producteur (`060c333`, rebasé en 16-bis). Batteries rejouées indépendamment par le reviewer : `tsc -b` frontend 0, `tsc --noEmit` backend 0, `test:charte-marchande` verte, `test:ci` 44 maillons EXIT 0, `garde-argent` 1 refus (chaîne test:ci — pré-existant), **jest backend CASSÉ** (voir REVIEW-003/B3-3).

### REVIEW-001 — Lot UX-1 « Promesses d'argent » (BUG-001..004)
- **Date** : 2026-10-06
- **Reviewer** : Agent Reviewer (Z.ai Code)
- **Auteur du code** : Agent Orchestrateur (Tasks 15 / 15-v)
- **Fichiers concernés** : `frontend/src/app/components/wallet/PaiementsPage.tsx`, `WalletPage.tsx`, `TransfertPage.tsx` ; `frontend/src/app/components/marchand/MarcheVirtuel.tsx`, `MaCooperative.tsx`
- **Commits revus** : `68149f2`, `f7e9544`, `67f72ef`, `41b6671`
- **Statut** : ⚠️ APPROUVÉ AVEC REMARQUES
- **Critères évalués** :
  - Qualité du code : ✅ (nommage explicite `envoiEnCoursRef`/`COTISATION_MONTANT`/`showConfirm` ; fonctions < 50 lignes ; nesting < 3)
  - Patterns respectés : ✅ (verrou synchrone anti double-tap = pattern caisse `POSCaisse 208-210` réutilisé et commenté sur site ; PIN conditionnel `pinSecurityEnabled` = même contrat que MarcheVirtuel, `/auth/pin/verify` avant le POST ; invariant B2 respecté — aucun mouvement wallet ajouté, que des libellés/confirmations)
  - Lisibilité : ✅ (commentaires pédagogiques citant la doctrine et l'audit ; garde `PAIEMENTS_SERVICES_ACTIFS` placé APRÈS les hooks — règle React respectée et documentée ; pas de code mort ajouté)
  - Maintenabilité : ⚠️ (R1-1, R1-2)
  - Séparation des couches : ✅ (`apiRequest` vers l'API, aucune logique métier réinventée côté UI)
  - Pas de duplication inutile : ⚠️ (R1-3)
  - Tests unitaires : ⚠️ (aucun test nouveau pour les deux verrous ; couverture indirecte par les gardes existantes, toutes vertes au moment de la revue)
  - Tests E2E (si applicable) : N/A (recette agent-browser non rejouée sur les relectures/PIN — à passer en recette manuelle avant prod)
  - Documentation : ✅ (BUGS.md BUG-001..004 avec preuves, CHANGELOG, COMMIT_LOG)
- **Remarques** :
  - R1-1 : `COTISATION_MONTANT` (25000) est bien nommé pour l'API, mais le montant reste écrit en dur dans DEUX libellés UI (« Payer ma cotisation : 25 000 FCFA » et le récap du modal « 25 000 FCFA ») — la promesse du commentaire « il vit ICI et nulle part ailleurs » n'est tenue que pour le POST, pas pour l'affichage ; à la bascule API il faudra changer 3 lignes, pas une.
  - R1-2 : `TransfertPage.tsx` passe à 562 lignes (critère maison < 500, poussé au-delà par le correctif) — candidat à découpage lors de l'extraction R1-3.
  - R1-3 : les « deux primitives maison » demandées par la reco T8 de l'audit (écran de relecture + ref synchrone/PIN) sont réimplémentées inline dans `TransfertPage` ET `MaCooperative` (deux feuilles modales custom, styles et contrats distincts) au lieu d'être extraites en composants partagés — duplication non justifiée dans `ARCHITECTURE.md` (critère 6). MarcheVirtuel a de plus son propre modal PIN historique : c'est la 3e copie du même geste.
  - R1-4 : les relectures de BUG-002/004 sont muettes — la reco T8 demandait « voix + texte + vibration attente », et la règle maison T7 dit « tout ce qui est écrit doit être parlé ». Succès et erreurs sont bien parlés + écrits ✅, mais la relecture elle-même ne dit pas le montant/destinataire à voix haute.
  - R1-5 : feuilles modales custom (motion.div) sans focus-trap ni gestion ESC — la doctrine AUTH-05 (Radix Dialog : focus trap, ESC, retour de focus, établie à l'audit UI auth) n'est pas appliquée aux nouvelles surfaces d'argent.
- **Actions correctives demandées** : extraire `RelectureArgent` + `PinArgent` en composants partagés (ou justifier la duplication dans ARCHITECTURE.md) ; rendre le montant par la constante dans les libellés ; voix sur les relectures ; évaluer Radix Dialog pour toute nouvelle surface d'argent ; traiter en lot UX suivant.
- **Date de validation finale** : — (remarques à traiter, contenu approuvé)
- **Commit validé** : `68149f2`, `f7e9544`, `67f72ef`, `41b6671`

### REVIEW-002 — UX-2 voix 3 rôles + UX-6 routing/porte keiwa + BUG-005
- **Date** : 2026-10-06
- **Reviewer** : Agent Reviewer (Z.ai Code)
- **Auteur du code** : Agent Orchestrateur (Tasks 16 / 16-bis)
- **Fichiers concernés** : `AppContext.tsx`, `MarchandAccueilVoice.tsx`, `routes.tsx`, `roleConfig.ts`, `useScoreJULABA.ts`, `Identifications.tsx`, `PaySuccessPage.tsx` (+ union `IdentificateurLayout.tsx` avec 060c333)
- **Commits revus** : `2e12cf6`, `0c026aa`, `7699927`, `65c1783` (rebasés sur `060c333`)
- **Statut** : ⚠️ APPROUVÉ AVEC REMARQUES
- **Critères évalués** :
  - Qualité du code : ✅ (routes canoniques + `<Navigate replace>` ; regex `/error|failed/` complète ; icône portefeuille vectorielle locale hors-ligne)
  - Patterns respectés : ✅ (un onglet = une destination nommée pareil partout — titre « Acteurs » aligné sur l'onglet et `roleConfig` ; porte keiwa UNIQUE arbitragée §8.3 avec l'historique du retrait Patrick 24/09 consigné dans le code, pas effacé ; décision §8.1 documentée sur le site même du garde retiré)
  - Lisibilité : ✅
  - Maintenabilité : ⚠️ (R2-1, R2-2)
  - Séparation des couches : ✅
  - Pas de duplication inutile : ✅ (union 16-bis : sur-ensembles retenus, aucune double implémentation)
  - Tests unitaires : ⚠️ (aucune garde nouvelle sur les redirects — la garde `route-access` existante reste verte ; `test:ci` 44 maillons EXIT 0, `tsc` 0)
  - Tests E2E (si applicable) : N/A
  - Documentation : ✅ (BUG-005 routé dans BUGS.md, TASKS/CHANGELOG/COMMIT_LOG à jour)
- **Remarques** :
  - R2-1 : `IdentificateurStats.tsx` et `IdentificateurDashboard.tsx` sont désormais orphelins (plus aucune route ne les monte, 0 import retrouvé) — code mort en source (non bundlé, les routes étant lazy). La fusion §8.5 est décidée « à terme » : tracer la dette (DEBT_REPORT) ou supprimer à la fusion.
  - R2-2 : `AppContext.tsx` se termine sans newline final (artefact d'union du rebase 16-bis) — cosmétique.
  - R2-3 : (mineur) template literal sans interpolation sur la branche keiwa de `MarcheVirtuel` (`speakSilent(\`Commande passée…\`)`) — guillemets simples suffiraient.
- **Actions correctives demandées** : tracer ou supprimer les 2 écrans analytiques morts ; réparer le newline ; (option) un redirect = une assertion dans `route-access`.
- **Date de validation finale** : —
- **Commit validé** : `2e12cf6`, `0c026aa`, `7699927`, `65c1783`

### REVIEW-003 — `060c333` « renforcer les parcours identificateur et producteur » (agent UX producteur)
- **Date** : 2026-10-06
- **Reviewer** : Agent Reviewer (Z.ai Code)
- **Auteur du code** : Akoun-dev (agent UX producteur, branche Akoun-dev)
- **Fichiers concernés** : 13 composants identificateur/producteur + `AppContext.tsx` + `routes.tsx`/`roleConfig.ts` + **`ci/PERIMETRE-ARGENT.json`** + **`ci/EMPREINTE-GARDES.json`** + `backend/package.json` + `package.json` + `package-lock.json`
- **Commit revu** : `060c333`
- **Statut** : ❌ BLOQUÉ (3 bloquants : B3-1 gel non autorisé, B3-2 périmètre de l'argent amputé, B3-3 suite de tests backend morte) — le code frontend des rôles est par ailleurs de bonne facture (voir remarques)
- **Critères évalués** :
  - Qualité du code : ✅ sur les composants (parité Tata identificateur, badge offline, brouillons localStorage, conversions qualité/unité fiabilisées, statuts métier alignés)
  - Patterns respectés : ⚠️ (la gouvernance des gels garde-argent EST un pattern du projet — violée, voir B3-1/B3-2)
  - Lisibilité : ✅
  - Maintenabilité : ❌ (B3-3 — toolchain de test cassée)
  - Séparation des couches : ✅
  - Pas de duplication inutile : ✅ (unions vérifiées ligne à ligne en 16-bis)
  - Tests unitaires : ❌ (B3-3 — plus AUCUN test backend exécutable)
  - Tests E2E (si applicable) : N/A
  - Documentation : ⚠️ (upgrade majeure jest/swagger et refigeage des gels tiennent en une ligne de message de commit ; aucun run de preuve consigné)
- **Bloquants** :
  - B3-1 — GEL RÉGULARISÉ PAR UN AGENT : `ci/PERIMETRE-ARGENT.json` et `ci/EMPREINTE-GARDES.json` sont refigés dans `060c333`. La règle écrite en tête de `PERIMETRE-ARGENT.json` dit : « POUR LE RÉGÉNÉRER — ⚠ HUMAIN SEULEMENT, JAMAIS LA CI, JAMAIS UN AGENT » ; les gels (`--figer-perimetre` puis `--figer-gardes`) sont un geste humain réservé (Patrick). Un gel est une décision — elle ne peut pas se porter elle-même.
  - B3-2 — PÉRIMÈTRE DE L'ARGENT AMPUTÉ (régression d'invariant) : le refigeage a été calculé alors que `racinesScannees` pointe toujours `frontend_src/src` — racine INEXISTANTE depuis le renommage `628ef4e`. `garde-argent.mjs:428` (`if (existsSync(abs) && …) parcourir(abs, …)`) saute silencieusement les racines mortes → le noyau figé est passé de ~92 fichiers frontend à **0** (39 fichiers au total, tous backend/database). Toutes les zones frontend de l'argent — `machine-encaissement`, `grammaire-intention-financiere`, `local-intent`, `caisse-context`, `paiement`, `offline-synchronisation` — sont SORTIES du périmètre gardé sans que le garde rougisse : sortie réelle « fichiers au noyau : 39 (figé : 39) ✓ aucun fichier n'est entré ni sorti du périmètre en silence ». La règle d'or « UNE caisse » n'est plus protégée côté téléphone.
  - B3-3 — SUITE DE TESTS BACKEND MORTE : `jest` `^29.7.0` → `^30.5.2` avec `ts-jest` RESTÉ à `^29.4.12` (majeures incompatibles — lock résolu : jest 30.5.2 + ts-jest 29.4.14). Preuve : `npx jest test/unit/schema-flags.spec.ts` → « Test suite failed to run — SyntaxError … Unexpected token (6:66) » sur un `as any` : jest 30 invoque babel, le transform ts-jest 29 n'est jamais chargé ; 0 suite exécutable (invariants compris). L'upgrade `@nestjs/swagger` 11→12 (majeure) n'est couvert par aucun run de preuve ; passage de pins exacts (`11.4.7`) à `^12.0.2` contre le style du fichier.
- **Remarques (non bloquantes)** :
  - L'EMPREINTE refigée est factuellement propre : 0 garde retiré, 6 gardes auth (Tasks 3-8 : canal-code, coffre-web, entree-unique, enum-check-phone, warn-dev, authCharte) absorbés au passage, chemins renommés — c'est le PROCESSUS qui est en cause, pas le contenu.
  - Le brouillon localStorage identificateur reste l'I-P0-1 « fragile » de l'audit (UX-3 au registre) : intégrité/chiffrement à prévoir.
  - La substance UX-2 (ouverture `speak()` aux 3 rôles) vit dans `060c333` ; `2e12cf6` n'ajoute que le commentaire doctrinal — cohérent avec l'union 16-bis.
- **Actions correctives demandées (dans l'ordre)** :
  1. Restaurer `ci/PERIMETRE-ARGENT.json` et `ci/EMPREINTE-GARDES.json` à l'état `dffe705` (retour au « 3 refus attendus » = statu quo ante le gel non autorisé — le garde redevient honnête immédiatement).
  2. Patrick (HUMAIN) : corriger `racinesScannees` → `frontend/src` puis re-geler LUI-MÊME (`--figer-perimetre` puis `--figer-gardes`) sur un arbre propre — le seul re-gel valide.
  3. Aligner `ts-jest` ^30 (ou revenir jest ^29) et PROUVER par un run vert de la suite backend ; inscrire un maillon backend exécutable dans la chaîne de vérification pour qu'une casse pareille ne repasse plus inaperçue.
  4. Recette swagger 12 (boot backend + docs endpoints) avant tout déploiement.
- **Date de validation finale** : — (bloqué jusqu'à exécution des actions 1-3)
- **Commit validé** : — (code frontend des rôles approuvé informellement ; le commit `060c333` est NON validé en l'état)

### REVIEW-004 — « nettoyage » `1c2f914` + `704023f` (agent UX producteur)
- **Date** : 2026-10-06
- **Reviewer** : Agent Reviewer (Z.ai Code)
- **Auteur du code** : Akoun-dev (agent UX producteur)
- **Fichiers concernés** : 21 fichiers supprimés (dont `scripts/schema-pilote.mjs`, `scripts/check-nest-versions.mjs`) ; `backend/src/app.module.ts` + 2 modules coquilles supprimés ; `frontend/package.json` ; `LoginPassword.tsx` (bouton « 🐞 Rapport de test » retiré) ; `Navigation.tsx` (logique morte retirée) ; journaux `.ai`
- **Commits revus** : `1c2f914`, `704023f`
- **Statut** : ❌ BLOQUÉ (2 bloquants : B4-1 garde CI décapité, B4-2 cinq assertions figées rouges nouvelles) — le reste du nettoyage est sain
- **Critères évalués** :
  - Qualité du code : ✅ (19/21 scripts supprimés sans AUCUNE référence — balayage package.json ×3 + maillons-verify + ci/ + .github/ ; modules backend = coquilles vides réelles, 0 controller/provider/export)
  - Patterns respectés : ❌ (la gouvernance des gardes figés EST le pattern violé — B4-1, B4-2)
  - Lisibilité : ✅ (Navigation.tsx : variables mortes retirées, render inchangé ; LoginPassword : commentaires ajustés)
  - Maintenabilité : ⚠️ (`package.json:14` `check:nest-versions` pointe un fichier supprimé — prouvé : exit 1 « Cannot find module »)
  - Séparation des couches : ✅
  - Pas de duplication inutile : ✅ (le bouton Rapport de l'écran de connexion était un doublon de celui de Paramètres)
  - Tests unitaires : ❌ (B4-1 : verrou de schéma supprimé sans remplacement ; B4-2 : gardes rouges)
  - Tests E2E (si applicable) : N/A
  - Documentation : ⚠️ (BUG-008/009/010 + PERF-007 bien routés et crédités « Agent Reviewer » — bonne coordination avec REVIEW-003 ; MAIS registre BUGS incohérent : compteur « 7 total, 4 résolus » alors que le fichier contient 8 bugs dont 5 résolus, numérotation sautée BUG-006/007 inexistantes ; CHANGELOG muet sur les 21 suppressions)
- **Bloquants** :
  - B4-1 — GARDE CI DÉCAPITÉ : `scripts/schema-pilote.mjs` supprimé alors que le workflow `.github/workflows/schema-pilote.yml` (LE verrou de sortie de schéma — SCHEMA-01/02/03, preuves B1/STK-01/SCHEMA-07, « tourne à chaque PR et à chaque fusion ») exécute `node scripts/schema-pilote.mjs` en dernière étape → échec garanti à la prochaine intégration main ; le message du commit assume le retrait (« de contrôle du schéma … devenues inapplicables ») mais le workflow ET l'entrée npm n'ont pas suivi, et l'abandon d'un verrou de sortie pilote est une décision de niveau Patrick, pas un chore. Règle ❌ du registre : « test critique supprimé sans remplacement ».
  - B4-2 — CINQ ASSERTIONS FIGÉES ROUGES NOUVELLES (baseline prouvée par rejeu des gardes sur un worktree `dffe705` : 4 rouges hérités connus VOICE-01, 0 rouge à parole-entree) :
    - `test:parole-entree` §[7] ×2 — la garde VOICE-01 figeait l'ANCIENNE doctrine (« la garde de rôle est toujours là, mot pour mot ») supersédée par la décision §8.1 : la garde devait être réécrite au moment d'UX-2 pour encoder la règle nouvelle (speak ouvert aux 3 rôles, muet = seule borne). Échappé à la Task 16 (batterie test:ci seulement) ET à la review Task 17 — responsabilité partagée orchestrateur/reviewer, consignée telle quelle.
    - `test:voix-trace-source` ×3 — « AppContext.speak journalise ses refus (rôle, muet) » et « AppContext … identique à 3917bb7 » (conséquences du retrait du garde dans `060c333`, §8.1) ; « celui de l'écran de connexion est conservé » (conséquence directe de la suppression du bouton 🐞 dans `1c2f914`). La suppression du bouton est défendable en produit — le rapport reste disponible dans Paramètres (UniversalParametres) via `vlogPartager`, surface plus appropriée qu'un écran de connexion — mais le garde qui fige les DEUX emplacements devait être mis à jour dans le même commit.
- **Remarques (non bloquantes)** :
  - Le flux de diagnostic terrain doit être re-vérifié en recette depuis Paramètres (le garde n'assertionne que le statique).
  - jest backend toujours mort — B3-3 de REVIEW-003 non traité par ces commits.
  - EMPREINTE/PÉRIMÈTRE non touchés : garde-argent identique (1 refus pré-existant).
  - Batteries vertes par ailleurs : tsc front 0, tsc back 0, test:ci 44 maillons EXIT 0, charte verte, maillons-orphelins vert, 10/12 gardes auth vertes.
- **Actions correctives demandées (dans l'ordre)** :
  1. Restaurer `scripts/schema-pilote.mjs` (et `scripts/check-nest-versions.mjs`, ou retirer proprement l'entrée npm + le workflow SI ET SEULEMENT SI Patrick arbitre l'abandon du verrou de schéma au registre) — l'état actuel est le pire des deux mondes : le garde est parti, son appel est resté.
  2. Réécrire les gardes figés pour encoder les décisions nouvelles AVEC historique consigné : `parole-entree` §[7] (§8.1), `voix-trace-source` (journal §8.1 ×2 ; Rapport de test ×1) — puis rejouer la batterie auth complète (12 gardes).
  3. Corriger le registre BUGS.md (compteur réel : 8 bugs, 5 résolus, 3 ouverts ; expliciter ou réserver BUG-006/007).
  4. Traiter B3-3 (ts-jest ^30 ou jest ^29 + run vert de preuve) — toujours ouvert.
- **Date de validation finale** : — (bloqué jusqu'à exécution des actions 1-2)
- **Commit validé** : — (le nettoyage de coquilles et la navigation sont approuvés informellement ; les commits ne sont pas validés en l'état)

## Suivi des actions correctives — exécution du 2026-10-06 (REVIEW-003/Act-1, REVIEW-004/Act-1..3)

**Exécutant** : Agent Reviewer (Z.ai Code), rôle orchestrateur — périmètre respecté : scripts CI racine, gels (RESTAURATION, pas re-gel), gardes voix, registres. Hors portée volontaire : le re-gel humain (Patrick) et `backend/package.json` (B3-3, périmètre producteur).

### REVIEW-004 / Act-1 — scripts CI restaurés (B4-1 levé)
- `scripts/schema-pilote.mjs` et `scripts/check-nest-versions.mjs` restaurés à l'état `dffe705` (`git checkout dffe705 -- scripts/schema-pilote.mjs scripts/check-nest-versions.mjs`). Preuves : `npm run check:nest-versions` → EXIT 0 « ✅ @nestjs cohérent (major 11) » ; `node --check scripts/schema-pilote.mjs` syntaxe OK et le script recharge (l'appel de `.github/workflows/schema-pilote.yml` redevient valide ; le run complet avec PostgreSQL reste à la CI, seule à disposer de la base).
- L'état « pire des deux mondes » décrit en B4-1 (garde parti, son appel resté) cesse : workflow ET script sont de nouveau raccord.

### REVIEW-003 / Act-1 — gels garde-argent restaurés à `dffe705` (INC-001, action corrective 1)
- `ci/PERIMETRE-ARGENT.json` et `ci/EMPREINTE-GARDES.json` restaurés à l'état `dffe705` par `git checkout dffe705 -- …`. C'est une RESTAURATION de fichiers (elle annule le geste non autorisé consigné en B3-1/INC-001), PAS un gel : le re-gel reste intégralement le geste humain de Patrick, avec `racinesScannees` → `frontend/src` (INC-001, action corrective 2).
- **Preuve mécanique** (arbre `dev` propre, aucun résidu disque) : le garde-argent revient EXACTEMENT aux **3 refus attendus**, baseline documentée depuis les lots UX-1/UX-2 :
  1. « LE PÉRIMÈTRE A BOUGÉ sans déclaration (0 entré(s), 55 sorti(s), 0 reclassé(s)) » — le noyau figé référence des chemins `frontend_src/…` morts depuis le renommage `628ef4e` ;
  2. « la chaîne test:ci diffère de celle de f0c965c — elle est GELÉE » (pré-existant, jamais touché par ces lots, décision humaine en attente) ;
  3. « GARDE-FOU ASSOUPLI — 131 assertion(s) perdue(s) » — l'empreinte figée liste les gardes sous leurs chemins d'avant-rename.
- Ces trois refus SONT le signal attendu : ils nomment publiquement le re-gel humain à faire, au lieu d'entériner en silence le périmètre amputé de `060c333` (39 fichiers, 0 frontend). Le garde redevient honnête immédiatement, comme promis en REVIEW-003.

### REVIEW-004 / Act-2 — gardes voix réécrites pour encoder les décisions nouvelles (B4-2 levé)
- `frontend/src/app/services/paroleEntree.test.mts`, section [7] : les deux assertions figées sur l'ANCIENNE doctrine (« la garde de rôle est toujours là, mot pour mot » + sa trace) sont remplacées par SEPT assertions qui encodent §8.1 AVEC historique : la décision est consignée sur le site même du garde retiré (« VOIX OUVERTE AUX TROIS RÔLES »), l'ancien garde `role !== 'marchand'` ne doit pas revenir en silence, la trace `role-non-marchand` est partie avec lui, le muet journalisé puis silencieux reste LA borne avant toute sortie sonore, l'appel reste journalisé, `paroleAutorisee` ne gouverne pas AppContext. L'en-tête du garde porte désormais les DEUX arbitrages (AKW-02 puis §8.1 qui le supersède) et précise que la voie d'entrée ([1]..[6]) ne change pas.
- `frontend/scripts/test-voix-trace-source.mjs` : section A — l'assertion « journalise ses refus (rôle, muet) » (≥2 ttsIgnoree) devient « journalise le refus muet — LA borne unique depuis §8.1 » ; section C — l'assertion « celui de l'écran de connexion est conservé » devient « l'écran de connexion n'embarque plus le doublon (retiré 1c2f914, arbitré REVIEW-004) », la surface connectée unique étant Paramètres ; en-têtes mis à jour avec l'historique des deux décisions.
- `frontend/scripts/fixtures/parole-3917bb7.json` : régénérée PAR LE GARDE LUI-MÊME puis fusionnée avec liste blanche — seule l'entrée `contexts/AppContext.tsx` (empreinte sans-journal) est re-bénie, conséquence directe et assumée de §8.1 (`060c333` + commentaire doctrinal) ; les 3 divergences héritées (`hooks/useVoiceCore.ts`, `components/layout/AppLayout.tsx`, `contexts/ObjectifContext.tsx` — rail voix VOICE-01) restent VOLONTAIREMENT hors référence et continuent de rougir tant que leur lot n'a pas été relu.
- Preuves : `npm run test:parole-entree` → vert (0 échec) ; `node scripts/test-voix-trace-source.mjs` → EXACTEMENT les 4 rouges hérités connus (useVoiceCore, AppLayout, ObjectifContext ×2), 0 rouge nouveau ; batterie auth complète rejouée (voir CHANGELOG du jour).

### REVIEW-004 / Act-3 — registre BUGS.md réconcilié
- Compteur corrigé : 8 bugs (5 résolus, 3 ouverts — BUG-001..005 résolus, BUG-008/009/010 ouverts P1) au lieu de « 7 (4 résolus, 3 ouverts) » ; numéros BUG-006/007 explicités comme sautés et RÉSERVÉS (les prochains bugs prennent BUG-011+).

### Restent ouverts (non exécutables par l'agent)
- **REVIEW-003 / Act-2 et INC-001 (2)** : Patrick (HUMAIN) corrige `racinesScannees` → `frontend/src` puis re-gèle LUI-MÊME (`node ci/garde-argent.mjs --figer-perimetre` puis `--figer-gardes`) sur un arbre propre — le seul re-gel valide ; tant que ce n'est pas fait, le garde présente les 3 refus ci-dessus, et c'est voulu.
- **REVIEW-003 / B3-3 (Act-3)** : aligner `ts-jest` ^30 (ou revenir jest ^29) + run vert de preuve — `backend/package.json`, périmètre producteur.
- **REVIEW-003 / Act-4** : recette swagger 12 avant tout déploiement.
- **REVIEW-004 / remarque** : recette du flux de diagnostic terrain depuis Paramètres (le garde n'assertionne que le statique).

### REVIEW-005 — actes correctifs REVIEW-003/004 (`d9f08ad` + `4eb6471` + `c379731`)
- **Date** : 2026-10-07
- **Reviewer** : Agent Reviewer (Z.ai Code) — instance de continuation (Task 20)
- **Auteur du code** : Agent Reviewer (Z.ai Code) — instance précédente, rôle orchestrateur (Task 19)
- **Fichiers concernés** : `ci/PERIMETRE-ARGENT.json` + `ci/EMPREINTE-GARDES.json` (restauration), `scripts/schema-pilote.mjs` + `scripts/check-nest-versions.mjs` (restauration), `frontend/src/app/services/paroleEntree.test.mts`, `frontend/scripts/test-voix-trace-source.mjs`, `frontend/scripts/fixtures/parole-3917bb7.json`, registres `.ai/{BUGS,INCIDENTS,CHANGELOG,COMMIT_LOG,REVIEW_LOG}.md`, `worklog.md`
- **Commits revus** : `d9f08ad` (Act-1 : scripts CI + gels), `4eb6471` (Act-2 : gardes voix), `c379731` (Act-3 + suivis)
- **Statut** : ✅ APPROUVÉ — les trois actes font exactement ce qu'ils annoncent, preuves mécaniques re-faites indépendamment par cette revue
- **Critères évalués** :
  - Qualité du code : ✅ (les 4 fichiers restaurés sont **byte-identiques à `dffe705`** — `git diff dffe705 dev -- ci/… scripts/…` VIDE, preuve mécanique ; gardes voix réécrites : assertions strictes par signature exacte, nesting < 3, fonctions courtes)
  - Patterns respectés : ✅ (la frontière des gels est tenue : RESTAURATION de fichiers qui annule le geste non autorisé de `060c333`, pas un re-gel — le re-gel est explicitement re-réservé à Patrick dans les 3 registres ; aucun `--figer-*` exécuté)
  - Lisibilité : ✅ (l'historique des DEUX arbitrages — AKW-02 puis §8.1 qui le supersède — est consigné dans les en-têtes des deux gardes ET sur le site même du garde retiré (`AppContext.tsx` « VOIX OUVERTE AUX TROIS RÔLES », asserté par la garde) ; les assertions des sections [1]..[6] sont inchangées — seuls commentaires et en-têtes ajustés, vérifié au diff)
  - Maintenabilité : ✅ (baseline des rouges hérités PRÉSERVÉE : 4 rouges connus, 0 nouveau — la liste blanche de la fixture ne re-bénit qu'UNE entrée (`contexts/AppContext.tsx`), conséquence directe et tracée de §8.1 ; BUG-006/007 réservés, les prochains bugs prennent BUG-011+)
  - Séparation des couches : ✅ (aucune logique métier touchée ; périmètre = scripts CI racine + gardes frontend + registres ; `backend/package.json` et lock NON touchés)
  - Pas de duplication inutile : ✅ (la garde C encode désormais l'UNICITÉ de la surface Rapport de test — Paramètres — et refuse le retour silencieux du doublon de l'écran de connexion)
  - Tests unitaires : ✅ (toutes les batteries rejouées indépendamment le 2026-10-07 sur `dev@c379731` : `tsc -b` frontend 0 ; `tsc --noEmit` backend 0 ; `test:charte-marchande` EXIT 0 ; `test:ci` EXIT 0 — **622 assertions vertes, 0 croix** ; `check:nest-versions` EXIT 0 ; `node --check scripts/schema-pilote.mjs` OK ; `test:parole-entree` EXIT 0 — 7/7 assertions §[7] ; `test-voix-trace-source` = EXACTEMENT les 4 rouges hérités (useVoiceCore, AppLayout, ObjectifContext ×2), 0 rouge nouveau ; `garde-argent` = EXACTEMENT les 3 refus attendus : périmètre 55 sortis (chemins `frontend_src` morts), chaîne test:ci gelée (pré-existant), 131 assertions débranchées)
  - Tests E2E (si applicable) : N/A (la recette du flux de diagnostic terrain depuis Paramètres reste au registre — non assertionnable statiquement)
  - Documentation : ✅ (INC-001 : suivi ajouté, statut OUVERT **atténué** avec preuve des 3 refus ; BUGS.md réconcilié 8/5/3 ; CHANGELOG « Corrigé — Actions correctives REVIEW-003/REVIEW-004 (2026-10-06) » exact ; COMMIT_LOG et worklog Task 19 à jour)
- **Remarques** :
  - R5-1 : le bloc « État au 2026-10-06 » du présent journal n'a pas été incrémenté quand REVIEW-004 y a été ajoutée (total resté à 3) — supersédé par le bloc « État au 2026-10-07 » ci-dessous (compteurs corrigés) ; le bloc ancien reste en l'état, discipline append-only.
  - R5-2 : B3-3 **re-confirmé vivant par sonde indépendante** : `npx jest test/unit/schema-flags.spec.ts` → « Test suite failed to run » (SyntaxError babel sur le transform jamais chargé), 0 suite exécutable. Toujours `backend/package.json` = périmètre producteur.
  - R5-3 : situation lecture-seule des branches parallèles poussées ce jour (`claude/rc-20261007-75c8b06`, `claude/rc-correctifs`, `claude/rc-perimetre-argent`, `claude/recette-rc`) et de `main` (PR #263/#265/#267/#268) : **AUCUNE ne touche** `ci/*.json`, `scripts/` ni `backend/package.json` relativement à `origin/dev` — pas de risque de re-gel d'agent par ces portes ; leur contenu sera revu s'il atterrit sur dev.
  - R5-4 (à savoir, non bloquant) : la garde §[7] asserte désormais des signatures exactes d'`AppContext.tsx` (ex. `if (voiceMuted) return;`) — couplage empreinte assumé, mais toute refactorisation du contexte global devra passer par le garde.
- **Actions correctives demandées** : aucune nouvelle. Les restes ouverts sont inchangés et déjà consignés : re-gel humain Patrick (INC-001/2 — `racinesScannees` → `frontend/src` puis `--figer-perimetre`/`--figer-gardes` sur arbre propre), B3-3 (ts-jest ^30 ou jest ^29 + run vert, producteur), recette swagger 12 avant déploiement, recette diagnostic terrain.
- **Date de validation finale** : 2026-10-07 (la présente revue)
- **Commit validé** : `d9f08ad`, `4eb6471`, `c379731`

## État au 2026-10-07 (supersède le bloc « État au 2026-10-06 »)

- **Total revues** : 5
- **Revues positives** : 1 (REVIEW-005 — actes correctifs vérifiés)
- **Revues bloquantes actives** : 1 (REVIEW-003 — B3-1/B3-2 **annulés** par la restauration `d9f08ad` vérifiée en REVIEW-005 ; restent **B3-3** producteur et le re-gel humain Patrick)
- **Revues avec remarques** : 2 (REVIEW-001, REVIEW-002)
- **REVIEW-004** : blocage **LEVÉ** — B4-1 (verrou de schéma raccord au workflow) et B4-2 (gardes voix réencodées avec historique, baseline 4 rouges hérités préservée) exécutés et vérifiés en REVIEW-005 ; le nettoyage `1c2f914`/`704023f` est approuvé dans l'état de l'arbre `c379731`
- **INC-001** : OUVERT **atténué** — action 1 faite (gels restaurés à `dffe705`, le garde nomme la dérive au lieu de la taire : 3 refus attendus) ; restent l'action 2 (re-gel humain Patrick) et l'action 3 (jest/ts-jest, producteur)
- **Batteries rejouées indépendamment le 2026-10-07** sur `dev@c379731` : tsc front/back 0 ; charte EXIT 0 ; `test:ci` EXIT 0 (622 assertions vertes, 0 croix) ; `check:nest-versions` EXIT 0 ; `parole-entree` EXIT 0 (7/7 §[7]) ; `voix-trace-source` = 4 rouges hérités connus, 0 nouveau ; `garde-argent` = exactement les 3 refus attendus ; **jest backend toujours mort (B3-3)** — sonde : « Test suite failed to run », 0 suite exécutable
- **En attente d'humain (Patrick)** : re-gel garde-argent (`racinesScannees` → `frontend/src` puis `--figer-perimetre` puis `--figer-gardes`) — tant que ce n'est pas fait, les 3 refus du garde SONT le signal voulu
- **En attente producteur** : B3-3 (ts-jest/jest + preuve par run vert backend) ; recette swagger 12 avant tout déploiement
## Suivi des corrections — exécution du 2026-10-07 (REVIEW-001/R1-1, REVIEW-002/R2-1..2, REVIEW-003/B3-3)

**Exécutant** : Agent Reviewer (Z.ai Code), rôle orchestrateur — sur ordre explicite de l'utilisateur (« Continues les corrections »), après vérification anti-collision (aucun commit producteur depuis `1c2f914`/`704023f`, dev == origin/dev à `be5e437`). Hors portée tenue : re-gel humain (Patrick), chaîne `test:ci` (gelée), gels (aucun exécuté).

### REVIEW-003 / B3-3 — FERMÉ : suite de tests backend ressuscitée par retrait des majeures non prouvées
- Décision : l'option « revenir jest ^29 » de l'action corrective (REVIEW-003) est retenue, étendue aux TROIS majeures non prouvées de `060c333` — `jest` ^30.5.2 → **^29.7.0**, `@types/jest` ^30.0.0 → **^29.5.14**, `@nestjs/swagger` ^12.0.2 → **^11.4.7** — dans `backend/package.json` ET `package.json` racine (le producteur avait bumpé les deux). `backend/package.json` redevient **byte-identique à `dffe705`** (preuve : `git diff dffe705 -- backend/package.json` VIDE).
- **Preuve nouvelle (mécanique)** : l'upgrade swagger 12 était IRRÉSOLUBLE — `npm install` échoue en ERESOLVE : `@nestjs/swagger@12.0.2` exige un peer `@nestjs/common@^12.0.0` alors que le projet tourne en `@nestjs/common@11.2.6`. La « recette swagger 12 » demandée en action 4 est **morte-non-lieu** : l'upgrade ne pouvait pas booter ; il est retiré, pas prouvé.
- **Preuve par exécution** : `npm install` EXIT 0 ; versions installées vérifiées (jest **29.7.0**, ts-jest **29.4.14**, swagger **11.4.7**, @types/jest **29.5.14**) ; suite unitaire backend **33 suites / 251 tests, EXIT 0** (la suite morte depuis `060c333` — cf. B3-3 — est entièrement exécutable) ; `tsc --noEmit` backend 0 ; `nest build` EXIT 0.
- Bornes honnêtes : les invariants (Postgres jetable) ne peuvent pas tourner dans le sandbox (aucun Postgres) — ils restent l'affaire de la CI ; un maillon backend exécutable dans `test:ci` (demandé en REVIEW-003) n'est PAS ajouté car la chaîne est GELÉE (refus 2 du garde-argent — décision humaine en attente ; à faire au moment du re-gel de Patrick).
- Commit : `c7e2715`.

### REVIEW-001 / R1-1 — FERMÉ : le montant cotisation ne vit plus qu'à un endroit
- `MaCooperative.tsx` : ajout de `COTISATION_MONTANT_LIBELLE` (dérivé de `COTISATION_MONTANT` via `toLocaleString('fr-FR')` + normalisation des insécables), utilisé par le bouton « Payer ma cotisation » ET le récap du modal — les deux libellés en dur disparaissent. Rendu **byte-identique prouvé** (node : `25\u00A0000 FCFA` ≡ ancien libellé).
- Restent ouverts (lot UX suivant, non traités ici) : R1-2 (TransfertPage 562 lignes), R1-3 (composants partagés RelectureArgent/PinArgent), R1-4 (voix sur relectures), R1-5 (Radix Dialog surfaces argent).
- Commit : `6db87ed`.

### REVIEW-002 / R2-1 — FERMÉ par traçage ; R2-2 — FERMÉ ; R2-3 — non traité (option)
- **R2-1 (traçage choisi plutôt que suppression)** : `CODE-NEW-7` ajouté au `DEBT_REPORT.md` — écrans orphelins `IdentificateurStats.tsx` + `IdentificateurDashboard.tsx`, orphelinat RE-VÉRIFIÉ mécaniquement le 07/10 (`git grep` : 0 référence externe) ; la suppression reste le geste de la fusion §8.5 définitive (périmètre producteur).
- **R2-2** : newline final ajouté à `AppContext.tsx` ; la fixture `parole-3917bb7.json` est re-bénie PAR LE GARDE (`--regenerer`) puis **fusionnée en liste blanche** — seule l'empreinte `contexts/AppContext.tsx` change (`1dc2a065…` → `64f884e0…`), diff = 1 ligne ; les 3 divergences héritées (useVoiceCore, AppLayout, ObjectifContext ×2) restent volontairement rouges (baseline REVIEW-005 préservée).
- R2-3 (template literal sans interpolation, option) : non traité — cosmétique, aucune valeur de garde.
- Commit : `c292812`.

### INCIDENT transitoire consigné (résolu dans la même session)
- Le mode `--regenerer` du garde `test-voix-trace-source.mjs` a brièvement BÉNI TOUTES les empreintes courantes (garde passé « Tout est vert », baseline des 4 rouges hérités écrasée) — détecté immédiatement (fusion initiale en échec : la fixture porte les clés `reference`/`empreintes`/`appels`, pas `fichiers`), corrigé par la fusion liste blanche, rejeu = EXACTEMENT les 4 rouges hérités, 0 nouveau. **Leçon** : `--regenerer` est un geste à double tranchant — il ne doit JAMAIS tourner sans fusion immédiate et contrôlée ; proposition (registre gardes) : le mode devrait REFUSER de régénérer si des divergences héritées connues seraient bénies au passage.

### Batteries finales (état `dev` post-corrections, rejeu complet le 2026-10-07)
`tsc -b` frontend 0 ; `tsc --noEmit` backend 0 ; `test:charte-marchande` EXIT 0 ; `test:ci` EXIT 0 (**622 assertions vertes, 0 croix**) ; `test:parole-entree` EXIT 0 ; `test-voix-trace-source` = les 4 rouges hérités connus, 0 nouveau ; garde-argent = **exactement les 3 refus attendus** ; `npm run test:unit` backend **251/251** ; `nest build` EXIT 0.

### État des bloquants après cette session
- **REVIEW-003** : B3-1/B3-2 annulés (restauration vérifiée en REVIEW-005) + B3-3 corrigé ici → les 3 bloquants sont levés ; reste l'action 2 (re-gel humain Patrick) — remédiation du garde, pas un défaut du commit ; la validation finale de `060c333` reste conditionnée à ce re-gel pour la partie garde-argent.
- **REVIEW-004** : blocage levé (REVIEW-005).
- **INC-001** : OUVERT atténué — actions 1 (restauration) et 3 (jest/ts-jest, via le retrait des majeures) sont faites ; reste l'action 2 (re-gel humain Patrick).
- **Restent ouverts** : R1-2, R1-3, R1-4, R1-5 (lot UX suivant) ; re-gel humain Patrick ; maillon backend dans test:ci (au moment du re-gel).
## Suivi des corrections — 2e session du 2026-10-07 (REVIEW-001/R1-2..5, lot primitives T8)

**Exécutant** : Agent Reviewer (Z.ai Code), rôle orchestrateur — sur « On enchaine » (l'utilisateur), anti-collision vérifié (dev == origin/dev à `a7c60bc`, 0 commit producteur).

### REVIEW-001 / R1-3 — FERMÉ : les deux primitives maison T8 existent, une seule copie du geste
- **`components/argent/RelectureArgent.tsx`** (199 l.) : l'écran de relecture — feuille basse sur **Radix Dialog** (focus trap, ESC, retour de focus, rôle dialog + titre/description = AUTH-05) ; contrat : `ouvert`/`enCours`/`onFermer`/`onConfirmer`/`titre`/`montant (nombre)`/`sousLigne`/`avertissement`/bloc PIN optionnel/libellés/accent. Le **verrou synchrone anti double-tap reste chez l'appelant** (pattern caisse POSCaisse 208-210) — la primitive n'appelle jamais à sa place ; la fermeture (ESC, overlay, X) est refusée tant que `enCours`.
- **`components/argent/PinArgent.tsx`** (47 l.) : le champ PIN 4 chiffres (contrôlé, role="alert" relié, AUTH-05) — la VÉRIFICATION reste chez l'appelant (`/auth/pin/verify` AVANT le POST).
- Migration de **`TransfertPage`** (relecture) et **`MaCooperative`** (relecture + PIN conditionnel) — les deux feuilles inline supprimées ; comportements métier inchangés (mêmes endpoints, mêmes verrous, mêmes textes d'avertissement, PIN vérifié avant POST).
- **MarcheVirtuel garde son modal PIN historique** (3e copie, `:1130`) : il porte `montantsMasqués` et `speakSilent` — sa migration est tracée dans l'en-tête de la primitive comme lot à part (dette assumée, pas une justification d'ARCHITECTURE.md : l'objectif T8 est deux primitives INÉVITABLES pour les nouveaux parcours, atteint).

### REVIEW-001 / R1-4 — FERMÉ : la relecture parle
- « **Dite et affichée depuis la même source** » (POSCaisse 558-665) : le montant est UN nombre — la forme écran (« 5 000 FCFA ») et la forme parlée (« 5 000 francs », ARG-17) en dérivent toutes deux ; la phrase reproduit exactement ce qui est affiché (titre + montant + destinataire + avertissement) et parle UNE fois par ouverture (garde par ref). T7 respecté : tout ce qui est parlé est écrit.
- **Triple canal** complété : `vibrerAttente()` (90 ms, le motif maison « pris mais pas encore parti », POSCaisse 509-528) au début de l'envoi, dans la primitive ; `vibrerSucces()`/`vibrerErreur()` ajoutés aux issues chez l'appelant (TransfertPage done/catch, MaCooperative succès/échec) — haptique.ts doctrine respectée partout.

### REVIEW-001 / R1-5 — FERMÉ pour les surfaces extraites : Radix Dialog (AUTH-05)
- Les deux nouvelles surfaces d'argent passent par `DialogPrimitive` : focus trap, ESC, `aria-modal` + titre/description reliés, et **fermeture impossible pendant l'envoi**. Évaluation demandée par R1-5 → **adoptée** ; les futures surfaces d'argent prennent `RelectureArgent`, pas de nouvelle feuille custom.

### REVIEW-001 / R1-2 — FERMÉ : TransfertPage sous la norme
- `TransfertPage.tsx` : 562 → **499 lignes**. Deux découpes cohérentes avec R1-3 : `genererCleIdempotence` → `utils/idempotence.ts` (contrat réutilisable pour tout POST d'argent rejouable, doc avec la fonction) et le catalogue `Method`/`METHODS` → `components/wallet/methodsTransfert.ts` (données seules). `MaCooperative.tsx` : 440 → 382 lignes.

### Batteries (rejeu complet sur l'état final)
`tsc -b` frontend 0 ; `test:charte-marchande` EXIT 0 ; `test:ci` EXIT 0 (**622 assertions vertes, 0 croix**) ; `test:parole-entree` EXIT 0 ; `test-voix-trace-source` = les 4 rouges hérités connus, 0 nouveau ; garde-argent = **exactement les 3 refus attendus**. (Backend non touché par ce lot — pas de re-run tsc backend.)

### INCIDENTS SANDBOX (4e bascule de branche de la session, écartés sans dégât)
- Le disque est repassé sur `main` en début de lot (détecté : `Read` voyait un fichier inexistant côté outil) — re-basculé `dev`, re-chaînage immunisé.
- L'extraction `idempotence.ts` a dû être **refaite** (bascule transitoire entre deux commandes : le fichier écrit a disparu, le reste des éditions a tenu) — re-vérifié après coup, `TransfertPage` à 499 lignes confirmé.

### Restent ouverts
- Migration du modal PIN de MarcheVirtuel sur `PinArgent` (lot à part) ; R2-3 (option cosmétique) ; maillon backend dans `test:ci` (chaîne gelée — au re-gel de Patrick) ; **re-gel humain Patrick** (INC-001/2 — le seul re-gel valide).

## REVIEW-006 — Audit et fusion des derniers pushs de main dans dev (2026-10-07, agent Z.ai Code)

### Demande
« regarde les derniers push de main, fais un audit et fais un merge des dernières améliorations » — rappel de bordée ensuite : « push sur dev, jamais sur main ». Fusion exécutée sur dev en worktree isolé ; `main` jamais poussé, jamais rebasé, jamais touché.

### Ce que main portait (9fb4655..24b40b3 — 63 commits, PR #261→#272)
- Cadre de travail racine (PR #261) : `ci/check.mjs` (+137 l., NOUVEAU), scripts racine `check`/`check:rapide`/`hooks:install`/`lint`/`lint:fix`/`mort`/`duplication`, devDeps eslint 9 / typescript-eslint / knip / jscpd, `.githooks/pre-push`, `.github/workflows/check.yml`, agents `.claude/agents/*`, STATUS.md, CLAUDE.md. Philosophie conforme au produit : tout exécuter puis conclure (pas de `&&` court-circuit), outil ABSENT ≠ succès, seuils = état réel du dépôt (knip plafond 400), garde-argent joué en informatif.
- Correctifs RC (PR #262/#265) : Modération `/user-flags` (CAST varchar↔uuid), BO-Zones (varchar = uuid), Institutions (statut↔actif traduit aux bords), BO-Missions (type/statut inconnus), Enrôlement (statut canonique), producteur (commandes + plantation avec id), coopérative (adhésion retrouvée), SEC-07 (gigue `crypto.randomInt`), assertion verrou restaurée, « mes ventes » dit ouvre Ventes passées.
- Périmètre argent (PR #266) + masque hors-pilote (PR #268) + INVENTAIRE-VOIX régénéré (test:i18n-source).
- Retours terrain PIE 07/10 (PR #271) : A1 stock sans doublon (ComplementEtal/ClavierQuantite/premierProduit), A2 file hors ligne rejouable (offlineCaisse + rejeuDeclencheurs, manifest Android), A3 « encaisser » coupé par l'ASR (formes dites) ; docs décisions ARG-03.
- Profil/activation (PR #272) : photo par caméra (ChoixPhotoCarte), commune/marché back-office (lieuxMarchands, marches-api), bouton « J'ai un code de mon agent » (BoutonCodeAgent → /activation, UX-02), bancs + catalogue.

### Audit (lecture seule, avant tout merge)
- **Gels intacts** : `git diff 9fb4655 origin/main -- ci/` = `ci/check.mjs` seul ; `ci/PERIMETRE-ARGENT.json` et `ci/EMPREINTE-GARDES.json` jamais touchés côté main ; `backend/package.json` et `frontend/package.json` intacts côté main.
- **Chaîne `test:ci` gelée intouchée** : la ligne `test:ci` n'apparaît dans aucun diff ; main étend la chaîne **verify** (+6 maillons : `test:modules-pilote`, `test:lieux-marchands`, `test:photo-carte`, `test:lien-activation`, `test:rejeu-declencheurs`, `test:encaisser-formes-dites`) et restaure l'assertion « ce qui est affiché est aussi DIT » du verrou connexion (doctrine T8) — additif, légitime.
- **SEC-07 en double création** : le même fix `Math.random` → `randomInt(node:crypto)` a été fait des DEUX côtés (commentaires différents, import placé différemment) — version dev gardée (commentaire plus complet), zéro divergence sémantique.
- **Refactor dev `audit/` → `audit-log/`** : main reste sur `audit/` ; ses fichiers backend modifiés (institutions, user-flags.service) n'importent pas audit.service → auto-fusion propres : imports `audit-log` de dev PRÉSERVÉS + logique main PRÉSENTE (`versColonnes`, `CAST(user.id AS text)` vérifiés au stage).
- **Renommage dev `frontend_src` → `frontend` (628ef4e)** vs main resté sur `frontend_src/` : 46 fichiers frontend main (14 ajoutés, 32 modifiés). Le rename-follow de git a fonctionné : les 32 modifiés auto-fusionnés DANS `frontend/`, les 14 ajoutés posés en « CONFLICT (file location) » aux chemins `frontend/` (suggestion git acceptée) — **zéro résidu `frontend_src/` dans l'index**.

### Fusion (265062e) puis correctif d'intégration (1b32929)
- Conflits réels : `.gitignore` (union : bloc sandbox dev superset + commentaire de décision main), `backend/src/auth/anti-enumeration.ts` (même fix → version dev), `package.json` racine (workspaces `frontend` de dev + scripts/devDeps main, swagger `11.4.7` intact, workspaces JSON assertés), `package-lock.json` (régénéré `npm install --package-lock-only`, workspace `frontend` présent).
- Traduction de chemins sur l'outillage main : `ci/check.mjs`, `eslint.config.mjs`, `knip.jsonc`, `.jscpd.json` — 6 occurrences `frontend_src` → `frontend` (assertées une à une).
- Banc `rejeuDeclencheurs` (A2) : chemin en dur `frontend_src/…` traduit → banc vert (« La file repart d'elle-même, et ne perd rien »).
- `test:i18n-source` rouge : 4 phrases dites absentes du catalogue — **rouge HÉRITÉ de dev tip, preuve par diff** : phrases présentes à `21646d0` (MaCooperative:116, CommandesProducteurPage:330/810), diff `catalog.ts` de main purement additif (+13/−0), `MaCooperative.tsx` identique entre `21646d0` et le merge. Enregistrées au catalogue selon le motif PIE de main (`a_migrer`, note de traçabilité, `critiqueArgent` true pour les phrases d'argent) : MARCH_COTISATION_PAYEE, MARCH_COTISATION_ECHEC, PROD_COMMANDE_ACCEPTEE, PROD_DEMANDE_DETAIL (variables `['produit']`, audioMode dynamic). INVENTAIRE-VOIX régénéré (425 sites, 242 phrases, 56 critiques).

### Batteries (état final 1b32929, worktree isolé)
`tsc --noEmit` frontend 0 / backend 0 ; `test:charte-marchande` EXIT 0 ; `test:ci` EXIT 0 (« Tous les tests sont verts ») ; `test:parole-entree` EXIT 0 ; `test-voix-trace-source` = EXACTEMENT les 4 rouges hérités (useVoiceCore, AppLayout, ObjectifContext ×2), 0 nouveau ; garde-argent = EXACTEMENT les 3 refus attendus (périmètre 55 sortis, test:ci gelé, 131 assertions débranchées) ; jest backend 33 suites / **251/251** ; `nest build` 0 ; les 6 bancs verify de main verts ; verrou connexion vert ; i18n `source`/`argent`/`locales`/`empreintes-argent` verts.

### Incidents sandbox (écartés sans dégât)
- Bascule HEAD `dev`→`main` par une session concurrente pendant le ff local (le `main` local s'est retrouvé à `21646d0`) — écartée par **worktree isolé** `/home/z/wt-merge` portant `dev` ; le merge vit sur dev, `main` jamais écrit, jamais poussé.
- Lectures transitoires incohérentes (grep/python voient un contenu périmé sur fichiers fraîchement écrits) — contournées en vérifiant via l'index git (`git show :0:`) et en rejouant les assertions sur lectures stabilisées ; aucune écriture partielle.

### Restent ouverts
- `npm run check` (cadre racine de main) : outils eslint/knip/jscpd absents du node_modules racine du worktree d'audit — à jouer après un `npm install` racine (déps déjà au lock) ; les 6 maillons verify individuels sont verts.
- Re-gel humain Patrick (périmètre + gardes) inchangé ; maillon backend dans `test:ci` toujours gelé ; CODE-NEW-8 (MarcheVirtuel PIN 4ᵉ copie) inchangé.
- Les bancs A1/A2/A3/profil vivent maintenant dans `frontend/` côté dev — toute retouche future de ces écrans doit se faire là (plus jamais dans `frontend_src/`).
## REVIEW-007 — Audit et libération des variables d'environnement mortes (2026-10-12, agent Z.ai Code)

### Demande
« OK, je veux que tu regardes dans le projet complet, les variables d'environnements qui ne sont plus utilisées, libère tout » — rappel de bordée : « push sur dev, jamais sur main ».

### Méthode (double inventaire croisé, tous canaux)
- **Déclarations** : `backend/.env.example`, `infra/odoo-poc/.env.example` (17 clés, sous-système POC vivant — inchangé), `render.yaml` (envVars julaba-api + julaba-web), `frontend/Dockerfile` (ARG/ENV VITE_API_URL), `backend/Dockerfile` (ENV NODE_ENV), `infra/odoo-poc/backend-poc/docker-compose.yml`, 12 workflows GitHub (blocs env + 8 secrets tous référencés), Caddyfile (aucun placeholder).
- **Usages** : `process.env.X` statique, `process.env[k]` dynamique (main.ts seul — fail-fast secrets `JWT_SECRET`/`REFRESH_TOKEN_SALT`/`PIN_ENCRYPTION_KEY`), `configService.get('X')` (33 clés backend), helper `env.X` backend, `import.meta.env.X` (Vite, y compris `?.`), destructuring (aucun), `System.getenv` gradle (aucun), dotenv (`envFilePath` `.env`|`.env.test`, data-source `dotenv.config()`), scripts e2e/bancs (`frontend/e2e`, `frontend/apercu-caisse`, `frontend/scripts`), workflows.
- Chaque candidate vérifiée mot-exact (`rg -w -F`) sur fichiers code uniquement (hors docs/.ai/worklog) + mécanisme de lecture examiné : les constantes de code homonymes ne comptent PAS comme lecture de l'env.

### Verdict : 8 déclarations mortes libérées (122aedb)
- `backend/.env.example` −5 : `BPAY_RECONCILIATION` (le cron passe par le registre `CRON_JOB_BPAY_RECONCILIATION`), `FEEDBAK_SMS_TEMPLATES` (constante TS `feedbak-sms.constants.ts`), `VOICE_PROVIDERS` (constante TS du DTO `['elevenlabs','azure_speech']`), `VOICE_METRIC_LABELS` (constante TS du service métriques), `ODOO_CLIENT` (symbole d'injection NestJS ; la bascule mock/real = `ODOO_CLIENT_MODE`)
- `render.yaml` + `infra/odoo-poc/backend-poc/docker-compose.yml` : `TTS_DISABLE_CLOUD` (jamais lue par le backend ; le flag réel = `VOICE_LOCAL_TTS` via config.get)
- `frontend/src/vite-env.d.ts` : type `VITE_SENTRY_DSN` (typé, jamais lu ni posé — DSN Sentry en dur dans `sentry.ts`, choix existant non modifié)
- Net : 10 lignes supprimées, 4 fichiers, zéro code touché.

### Inventaire utilisé-mais-non-déclaré (constaté, laissé en l'état — délibéré)
- `VITE_CLOUDINARY_URL` / `VITE_CLOUDINARY_PRESET` : lues (`CommandesProducteurPage.tsx`, import.meta.env avec repli), posées ad hoc, non typées dans vite-env.d.ts.
- `AUTH_TELEPHONES_TEST` : doctrine AUTH-07 (liste autoritaire par environnement, repli code dev) — pas de valeur par défaut committable par design.
- Outillage posé ad hoc (documenté dans ses scripts) : `BANC_*`, `APERCU_LARGE`, `MAQUETTE_CAISSE`, `PASSE_CAPTURE`, `PW_CHROMIUM`, `CHROMIUM_BIN`, `RECETTE_*`, `REFERENCES_ATTENDUES`, `REF_CODE`/`REF_NOM`, `BASE_URL`, `GARDE_ARGENT_VERBEUX`, `TRUST_PROXY_ABSENT_XYZ` (sentinelle de test), `JULABA_VOIX_DYU`/`JULABA_DYU_ARGENT` (build APK, aussi lues par vite.config), `VITE_JULABA_MODULES_HORS_PILOTE`.

### Hors de portée du dépôt (signalé, rien fait)
- `backend/.env.production` vit sur le serveur (deploy.yml / docker-compose env_file) : s'il contient encore les clés mortes ci-dessus, elles y sont inertes — nettoyage facultatif à la prochaine maintenance (Patrick).

### Batteries (sur 122aedb, worktree isolé)
`typecheck` (tsc -b frontend) EXIT 0 ; `test:ci` EXIT 0 (chaîne gelée intacte) ; `test:enum-check-phone` EXIT 0 ; garde-argent = baseline héritée EXACTE (3 refus connus : périmètre 55 sortis, chaîne test:ci vs f0c965c, garde-fou 131 assertions débranchées — chemins frontend_src des empreintes) ; `rg` confirme qu'AUCUN fichier touché n'apparaît dans la sortie du garde ; re-gel humain Patrick inchangé.

### Incidents sandbox
- Aucun majeur. Vérifications post-édition via l'index git (`git show :0:`) — contre-mesure habituelle aux lectures périmées ; worktree isolé `/home/z/wt-merge` recréé (l'ancien avait été purgé) portant `dev @ e1bfbae`.

### Restent ouverts
- Re-gel humain Patrick (périmètre + gardes) inchangé — inchangé par ce commit.
- Typage `VITE_CLOUDINARY_*` dans vite-env.d.ts (proposition, non fait).
- `npm run check` racine complet (knip/jscpd) à rejouer après install racine (inchangé de REVIEW-006).
## REVIEW-008 — Vérification « pas morts » : variables d'environnement et composants (2026-10-12, agent Z.ai Code)

### Demande
« verifie si il ne sont pas mort ainsi que ses composants » — passe de vérification après REVIEW-007/122aedb : (a) prouver que les variables libérées sont bien mortes, (b) re-vérifier que toutes les variables restantes déclarées sont vivantes, (c) auditer leurs composants hôtes (modules, workflows, infra) et libérer ce qui serait mort.

### (a) Preuve de mort des 7 noms libérés (122aedb) — CONFIRMÉE
Chaque nom passé au peigne fin (`rg -w -F`, tous canaux : process.env direct, process.env['X'], get('X'), get<type>('X'), import.meta.env, secrets workflows, compose/render/.env.example/Dockerfiles/Caddyfile, littéraux et commentaires du code) :
- BPAY_RECONCILIATION, TTS_DISABLE_CLOUD, VITE_SENTRY_DSN : **0 mention** dans tout le code — mortes certaines.
- FEEDBAK_SMS_TEMPLATES, VOICE_PROVIDERS, VOICE_METRIC_LABELS, ODOO_CLIENT : uniquement leurs homonymes de CODE, tous bien vivants (constante feedbak-sms.constants.ts consommée par feedbak-sms.service ; VOICE_PROVIDERS du DTO consommé par voice-config.service ; VOICE_METRIC_LABELS auto-consommé par voice-metrics.service ; ODOO_CLIENT = Symbol d'injection fourni par odoo-gateway.module et @Inject dans odoo-gateway.service). L'ENV homonyme n'est jamais lue — libération justifiée.
- Note de comptage honnête : le message 122aedb dit « 8 variables » = 8 DÉCLARATIONS supprimées sur **7 noms uniques** (TTS_DISABLE_CLOUD était posée dans 2 fichiers).

### (b) Toutes les déclarations restantes sont VIVANTES
- backend/.env.example (61 clés) : lues via process.env direct (main.ts, database, auth, instrument…), config.get (y compris formes `config.get<type>('X', défaut)` — DB_LOGGING, BPAY_*, ANSUT_*, OTP_*, ONECI_*, ELEVENLABS_* via openai.service, LLM_*, PIPER_*, VOICE_LOCAL_TTS), et le helper `env.X` (fonctions recevant `NodeJS.ProcessEnv` avec défaut `process.env` : motDePasseBackOffice → SEED_DEMO_BO_PASSWORD, buildThrottlers → THROTTLE_DISABLED appelé avec process.env dans app.module, lireModeClientOdoo/odoo-client.config → ODOO_CLIENT_MODE/BASE_URL/API_KEY/DB/REAL_WRITE_ENABLED/REAL_TIMEOUT_MS). JWT_SECRET/REFRESH_TOKEN_SALT/PIN_ENCRYPTION_KEY : liste fail-fast dynamique de main.ts.
- render.yaml (24 clés) : toutes consommées côté backend ; VITE_API_URL lue par le frontend.
- infra/odoo-poc/.env.example (17 clés) : toutes consommées (compose, scripts init/smoke-test/test_create_api_key.py, README d'exploitation).
- Frontend : VITE_API_URL ✓, VITE_WS_URL ✓ (WebSocketTransport.ts:36 — constructeur avec repli ""), VITE_JULABA_MODULES_HORS_PILOTE ✓ (modulesPilote.ts:120), VITE_CLOUDINARY_URL/PRESET ✓ (CommandesProducteurPage:589-590, replis en dur).

### (c) Composants hôtes — TOUS VIVANTS, 0 mort trouvé
- Modules backend reliés aux env (Bpay, Sms, FeedbakSms, Oneci, Voice, OdooGateway, Notifications, CaisseRest, CatalogueMaitre…) tous importés dans app.module.ts.
- frontend/src/sentry.ts ← main.tsx ; backend/src/instrument.ts ← main.ts:1.
- WebSocketTransport ← eventBus, NotificationsContext, BODashboard.
- 12 workflows : tous les scripts référencés existent — piège levé : `./scripts/installer-voix.sh` s'exécute avec `working-directory: android` donc pointe vers android/scripts/installer-voix.sh (PRÉSENT) ; scripts racine schema-pilote.mjs (workflow schema-pilote.yml + garde-argent) et check-nest-versions.mjs (package.json) référencés ; backend/scripts/setup-piper.sh référencé (render.yaml + .env.example). 8 secrets tous référencés par au moins un workflow.
- render.yaml = blueprint Render (référencé README/docs) ; deploy.yml = workflow_dispatch MANUEL documenté (cible prod non tranchée, ci/README.md) — coexistence délibérée, rien à libérer.
- infra/odoo-poc : sous-système vivant (17 clés consommées, garde ODOO_POC_ENABLED dans odoo-poc-enabled.guard.ts).

### Pièges méthodologiques écartés (leçons consignées)
1. Motif unique insuffisant : un premier scan a faussement « tué » 29 noms — `get('X'` ne capte ni `get<type>('X'` ni le helper `env.X`. Corrigé par vérification mot-exact + lecture des mécanismes : les 29 sont vivants. Verdict posé uniquement après multi-canaux.
2. Sortie tronquée : VITE_WS_URL a faussement semblé morte (lecture `| head` qui coupait le hit WebSocketTransport). Re-scan sans troncature → vivante. **Règle : jamais de verdict sur sortie tronquée.**
3. working-directory non pris en compte par un check naïf d'existence de scripts workflows (fausse alerte installer-voix.sh).

### Clôture du point ouvert REVIEW-007 (c912d8a)
`VITE_CLOUDINARY_URL`/`VITE_CLOUDINARY_PRESET` (utilisées mais non typées) sont désormais déclarées dans ImportMetaEnv (vite-env.d.ts, +4 lignes, type seul). Batterie : `tsc -b` frontend **EXIT 0**.

### Gels / garde-argent
`git diff bb9052a` sur ci/PERIMETRE-ARGENT.json, ci/EMPREINTE-GARDES.json, backend/package.json, frontend/package.json = VIDE ; vite-env.d.ts hors empreintes et hors périmètre ; chaîne test:ci gelée non touchée (aucun fichier de la chaîne n'est modifié).

### Restent ouverts (inchangés)
- backend/.env.production (serveur, hors dépôt) : clés mortes éventuelles inertes — nettoyage facultatif (Patrick).
- Re-gel humain Patrick (périmètre + gardes) inchangé ; `npm run check` racine complet (knip/jscpd) toujours à rejouer après install racine.
