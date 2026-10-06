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
