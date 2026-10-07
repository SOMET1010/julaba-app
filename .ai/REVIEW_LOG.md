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
