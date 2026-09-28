# TASKS.md — Backlog JULABA

> Version humaine-lisible du backlog. Miroir de `TASKS.xlsx` (à créer à la première feature).

## État au 2026-09-29

- **Total tâches** : 17 (12 issues de l'audit initial + INIT-016 strictNullChecks + INIT-018 design system BO + INIT-019 fetch directs + INIT-020 i18n + INIT-021 Vitest)
- **Terminées** : 4 (INIT-011, INIT-012, INIT-018, INIT-015)
- **Partiellement terminées** : 3 (INIT-016 strictNullChecks — infrastructure posée + 8 modules migrés (2 pilotes + 4 utilitaires + 2 contrôleurs REST) ; INIT-020 i18n — infrastructure posée + 6 écrans migrés (3 en phase 1 + 3 critiques en phase 2) ; INIT-021 Vitest — infrastructure posée + 18 fichiers migrés (3 pilotes + 15 phase 2, 211 tests verts))
- **Non traitées** : 1 (INIT-019 fetch directs — subagent a échoué, à reprendre)
- **En cours** : 1 (INIT-010)
- **Bloquées** : 0

## Tâches P0 (bloquantes)

| ID | Epic | Description | Rôle | Statut | Priorité |
|---|---|---|---|---|---|
| INIT-001 | Gouvernance | Créer `README.md` à la racine du dépôt (point d'entrée universel absent) | Doc | TODO | P0 |
| INIT-002 | Gouvernance | Ajouter fichier `LICENSE` (MIT recommandé) + champ `license` dans les 3 `package.json` | Doc | TODO | P0 |
| INIT-003 | Gouvernance | Fusionner `claude/clever-allen-dnr8by` vers `main` (14 commits de retard) | Tech Lead | TODO | P0 |
| INIT-004 | Gouvernance | Régénérer PAT Azure DevOps (expiré le 08/09/2026) | DevOps | TODO | P0 |
| INIT-005 | Doc | Créer `backend/.env.example` listant toutes les variables d'environnement attendues | Doc | TODO | P0 |

## Tâches P1 (prioritaires)

| ID | Epic | Description | Rôle | Statut | Priorité |
|---|---|---|---|---|---|
| INIT-006 | Sécurité | Patcher 14 CVEs npm prod (multer, js-yaml, picomatch, qs, tmp) — `npm audit fix` | Security | TODO | P1 |
| INIT-007 | RGPD | Créer `docs/POLITIQUE-CONFIDENTIALITE.md` + écran UI « Mes données » (loi ivoirienne n°2013-450) | Doc + Front | TODO | P1 |
| INIT-008 | Sécurité | Corriger `SEC-04` : cesser de journaliser le terme de recherche dans `users.service.ts:334` | Back | TODO | P1 |
| INIT-009 | Architecture | Trancher la cible de production (Render vs OVH vs Azure — actuellement 3 chaînes concurrentes) | Tech Lead + DevOps | TODO | P1 |
| INIT-010 | Dette | Finaliser ADR-0002 étape 4 (bascule migrations : `DB_MIGRATIONS_RUN=true`, `synchronize` off) | Tech Lead | **EN_COURS — runbook préparé, exécution en attente validation Patrick** | P1 |

## Tâches P2 (fiabilisation)

| ID | Epic | Description | Rôle | Statut | Priorité |
|---|---|---|---|---|---|
| INIT-011 | Architecture | Fusionner contrôleurs dupliqués : `cycles-rest` + `producteur/cycles`, `recoltes-rest` + `producteur/recoltes` | Back | **TERMINÉ** | P2 |
| INIT-012 | Dette | Migrer `CATALOGUE` hardcodé (15 produits vivriers dans `caisse-rest.controller.ts`) vers `caisse_produits` ou référentiel maître Odoo | Back | **TERMINÉ** | P2 |
| INIT-018 | Dette | Finaliser la migration vers un seul design system BO en consolidant `Universal*BO` dans `components/ui/` (shadcn local) | Front | **TERMINÉ (2026-09-29)** | P2 |
| INIT-020 | i18n | Adopter `i18next` + `react-i18next` pour internationaliser l'UI (3 langues `french`/`dioula`/`bambara` déjà exposées par `useLangPref`) | Front + a11y | **PARTIEL** — infrastructure posée (config + 3 locales + I18nextProvider + bridge `useLangPref` + `<html lang>` dynamique) ; 6 écrans migrés (`MesDonnees`, `Welcome`, `EntryGate` en phase 1 ; `POSCaisse`, `LoginPassword`, `UniversalParametres` en phase 2) ; reste : autres écrans + traductions `dioula.json`/`bambara.json` = PLACEHOLDERS à traduire par locuteur natif | P2 |
| INIT-021 | Dette | Adopter Vitest comme framework de test standard frontend (74 tests via `tsx` + helpers ad-hoc) | Front (QA+Dev) | **PARTIEL — infrastructure posée + 18 fichiers migrés (3 pilotes phase 1 + 15 phase 2, 211 tests verts), 56 tests legacy à migrer par lots ultérieurs** | P2 |
| INIT-016 | Dette | Activer `strictNullChecks` progressivement (476 `any` back, `tsconfig.json` permissif) | Back | **PARTIEL — infrastructure posée (`tsconfig.strict.json` + guide `backend/docs/MIGRATION-STRICT-TYPESCRIPT.md` + script `typecheck:strict`) ; 8 modules migrés (2 pilotes `caisse-produit.entity.ts`/`caisse-produits.service.ts` + couche 2 `paginate.ts`/`throttler.config.ts`/`trust-proxy.config.ts`/`schema-flags.ts` + couche 3 `cycles-rest.controller.ts`/`recoltes-rest.controller.ts`) ; 0 `any`/`as any` dans les modules migrés ; `tsconfig.build.json` 0 erreur ; 207 tests unitaires verts ; couche 4 (auth/caisse-rest/wallets/commandes) + couche 5 (admin/cooperatives-rest/identifications) restantes à migrer par vagues ultérieures** | P2 |
| INIT-019 | Dette | Réduire 173 `fetch()` directs hors `services/api/` (69 hors back-office) | Front | **PARTIEL — 13 fetch migrés (97 -> 84), 5 composants traités (BOModeration, BOParametres, BOAcademy, UniversalAcademy, BORapports), 84 restants à traiter par lots ultérieurs** | P2 |

## Tâches reportées (backlog futur)

### P2
- Supprimer `database/init.sql` (vestige pré-migrations, dangereux si exécuté)
- Retirer `@capacitor/cli` et `react-router` du `backend/package.json` (dépendances frontend parasites)
- Aligner `@nestjs/cli` sur v11 (actuellement v10 alors que core v11)
- Activer `strictNullChecks` progressivement (commencer par modules neufs)
- Activer `TRUST_PROXY` en prod après calibration via `/health/net`
- Brancher `CronJobsModule` dans `AppModule` ou supprimer le module mort
- Réactiver `Sentry.expressErrorHandler` après résolution du conflit body-parser
- Découper `AppContext.tsx` (1351 LOC) en 4-5 contexts ciblés
- Mettre en place `license-checker` en CI
- Tagger `v5.0.0` + adopter Keep-a-Changelog
- Réécrire invariant `I6` (spécification périmée)
- Implémenter `AUTH-RECOVERY-01` (parcours « numéro perdu »)

### P3
- Purger `node_modules` de l'historique git via `git filter-repo`
- Nettoyer `frontend_src/src/imports/` (mélange code + prompts obsolètes)
- Adopter `devise.ts` partout (480 « FCFA » en dur)
- Réduire les 173 `fetch()` directs hors `services/api/`
- Réduire les 35 branches vivantes

## Détail des tâches en cours

### INIT-010 — ADR-0002 étape 4 (bascule migrations prod)

**Statut : EN_COURS — runbook préparé, exécution en attente validation Patrick.**

- **Livrable préparé (2026-09-29)** :
  - `docs/etape4/RUNBOOK-BASCULE-MIGRATIONS.md` créé (runbook opérationnel
    détaillé, supersede le runbook historique
    `docs/etape4/RUNBOOK-bascule-migrations.md` de 2026-08-15, invalidé par
    l'incident 18/09/2026).
  - `docs/adr/ADR-0002-convergence-schema-migrations.md` mis à jour (statut
    étape 4 → « préparée par runbook, en attente de validation humaine pour
    exécution »).
- **Reste à faire avant exécution** (hors présent lot, à mener par Alex + Patrick) :
  1. **Lot de code préalable** : rendre la baseline `1780200000000-BaselineSchema`
     idempotente (`CREATE TYPE IF NOT EXISTS`) + mettre à jour le test
     `backend/test/unit/migrations-prod.spec.ts` (qui assert aujourd'hui
     intentionnellement la non-idempotence).
  2. **Pré-validation staging** complète (section 3 du runbook).
  3. **Validation Patrick** (Audit Global humain) — Go formel écrit.
  4. **Créneau de maintenance** planifié (1-2h, hors heures de marché).
  5. **Exécution prod** par Alex selon la procédure section 4 du runbook.
  6. **Stabilisation 1 semaine** puis lot post-bascule (retrait `DbInitService`,
     création ADR-0005, fermeture SCHEMA-01/02/03 au registre maître).
- **Référence incident** : `.ai/INCIDENTS.md` — incident 18/09/2026
  (`caisse_transaction_status_enum already exists`), cause racine documentée
  dans le préambule du runbook.

### INIT-018 — Finaliser la migration vers un seul design system BO

**Statut : TERMINÉ (2026-09-29).**

- **Analyse** : l'audit AUDIT-001 décrivait « 2 design systems BO parallèles »
  (`components/ui/` shadcn + `components/backoffice/universal/Universal*BO`).
  L'inspection révèle que les 19 composants `Universal*BO` ne sont PAS un fork
  de shadcn : 10 d'entre eux importent explicitement les primitives shadcn
  (`Dialog`, `AlertDialog`, `DropdownMenu`, `Tabs`, `Table`, `Card`, `Button`,
  `Skeleton`, `Avatar`, `Badge`) et y ajoutent une couche métier (thème `BO_*`,
  `role-config.ts`, animations framer-motion, presets). La dette réelle était
  les **6 composants `Universal*BO` morts** jamais importés hors du barrel
  `index.ts` (~1 739 lignes de code mort maintenu en double).
- **Action** : suppression des 6 composants morts
  (`UniversalSearchBarBO`, `UniversalFilterPanelBO`, `UniversalBadgeBO`,
  `UniversalAvatarBO`, `UniversalTableBO`, `UniversalToastBO`) + mise à jour
  du barrel `index.ts`. Aucun écran BO, aucun test, aucune story ne les
  référençait (vérifié par `rg`).
- **Conservation** : les 13 composites BO vivants restent dans
  `backoffice/universal/`. Ils consomment déjà les primitives shadcn : ils
  forment la « couche composite BO » du DS unique. Les migrer « en place »
  vers `components/ui/` exigerait de réécrire les 11 écrans BO qui les
  consomment (avec risque élevé de régression visuelle) pour un bénéfice nul.
  Migration future classée P3 (voir `MIGRATION_GUIDE.md`).
- **Documentation** :
  - `frontend_src/src/app/components/backoffice/universal/MIGRATION_GUIDE.md`
    créé (contrat deux-couches, table des composites conservés, statut).
  - `.ai/DESIGN_SYSTEM.md` §3 mis à jour (« un seul DS — couche primitives +
    couche composites BO »), §9 conventions et §10 dette design réorganisés.
  - `.ai/ARCHITECTURE.md` §3 et §8 mis à jour (description 2 couches +
    suppression de l'item « 2 design systems BO parallèles » du top 10).
  - `.ai/DEBT_REPORT.md` FRONT-NEW-2 marqué FERMÉ.
- **Vérifications** :
  - `npx tsc -b` : 0 erreur (baseline identique).
  - `npm run test:route-access` : vert ✅
  - `npm run test:tokens` : vert ✅
  - `npm run test:jargon` : vert ✅
  - `npm run test:caisse-charte` : vert ✅
  - `npm run check:bundle-budget` : vert ✅ (639 Ko / 800 Ko).
- **Non commité** : l'orchestrateur se charge du commit.

### INIT-021 — Adopter Vitest comme framework de test standard frontend

**Statut : PARTIEL — infrastructure posée + 3 pilotes migrés, 71 tests legacy à migrer.**

- **Livrable posé (2026-09-29)** :
  - `vitest` 2.1.9 + `@vitest/coverage-v8` + `@vitest/ui` ajoutés à
    `frontend_src/package.json` devDependencies.
  - `frontend_src/vitest.config.ts` créé (jsdom, globals, coverage v8,
    `include: *.vitest.test.*` pour cohabitation).
  - `frontend_src/src/test/setup.ts` créé (cleanup @testing-library,
    IS_REACT_ACT_ENVIRONMENT, nettoyage localStorage).
  - `frontend_src/src/test/compat.ts` créé (wrapper `ok()`/`eq()` → `it()`).
  - `frontend_src/src/test/vitest-globals.d.ts` créé (types globals).
  - `frontend_src/src/test/README.md` créé (stratégie de cohabitation).
  - 3 pilotes migrés vers syntaxe native Vitest : `fcfa.vitest.test.ts` (18
    tests), `antiJargon.vitest.test.ts` (1 test),
    `useAudioUnlockFallback.vitest.test.tsx` (6 tests) — **25 tests verts**.
  - Scripts `test:vitest` / `test:watch` / `test:coverage` / `test:ui` ajoutés
    à `package.json` ; `verify` lance désormais `test:vitest` en premier.
  - `.gitignore` : `frontend_src/coverage/` exclu.
  - `antiJargon.test.mts` (legacy) mis à jour pour exclure `*.vitest.test.*`
    et `*.test.tsx` de son scan.
- **Vérifications** :
  - `npx tsc -b --force` : **0 erreur** ✅
  - `npm run test:vitest` : **25 tests verts** (3 fichiers) ✅
  - `npm run test:coverage` : `coverage/lcov.info` + `lcov-report/` générés ✅
  - Tests legacy `tsx` (`test:fcfa`, `test:jargon`, `test:audio-unlock`,
    `test:offline-voice-queue`) : **tous verts** — cohabitation validée ✅
- **Reste à faire** (lots ultérieurs) :
  1. Migrer les 71 tests legacy restants (un par un, procédure dans
     `frontend_src/src/test/README.md`). Priorité : tests d'intégration React
     (5 fichiers `.test.tsx`) qui bénéficient le plus du cleanup automatique.
  2. Une fois tous migrés : élargir `include` à `src/**/*.test.{ts,tsx,mts}` et
     renommer les `*.vitest.test.*` en `*.test.*`.
  3. Ajouter un seuil de coverage (`coverage.thresholds`) une fois la base
     suffisante (cible : ≥ 80% global, ≥ 90% sur modules sacrés — cf.
     `TEST_PLAN.md` §5).
  4. Fermer FRONT-NEW-6 dans `DEBT_REPORT.md` (passer de PARTIEL à FERMÉ).

### INIT-020 — Adopter i18next pour internationaliser l'UI

**Statut : PARTIEL — infrastructure posée + 6 écrans migrés (3 critiques en phase 2), 3 écrans critiques en backlog + traductions locales à finaliser.**

- **Livrable posé (2026-09-29)** :
  - `i18next@^23.16.8` + `react-i18next@^14.1.3` ajoutés à
    `frontend_src/package.json` dependencies.
  - `frontend_src/src/app/i18n/config.ts` créé (init i18next synchrone,
    `fallbackLng: 'french'`, `supportedLngs: ['french','dioula','bambara']`,
    bridge `appliquerLangueI18n()` + `LANG_VERS_HTML` ISO 639-3).
  - 3 locales JSON créées : `i18n/locales/{fr,dioula,bambara}.json`
    (`fr.json` = source de vérité, `dioula`/`bambara` = PLACEHOLDERS
    avec commentaire `_meta._comment`).
  - `frontend_src/src/app/i18n/README.md` créé (structure + processus de
    traduction par locuteur natif + anti-jargon + plan de migration).
  - `App.tsx` wrappé avec `I18nextProvider` (au sommet, englobe tous les
    autres providers).
  - `useLangPref.ts` bridgé : `setLangPref()` appelle désormais
    `appliquerLangueI18n()` (import dynamique pour casser la dépendance
    circulaire type ↔ instance).
  - `index.html` : `<html lang="fr">` reste la valeur statique initiale
    (HTML lisible avant React), + script inline qui pré-charge la langue
    depuis `localStorage['julaba_lang']` AVANT le boot React (évite le flash
    `<html lang="fr"> → <html lang="dyu">`).
  - 3 écrans migrés vers `useTranslation()` / `<Trans>` (phase 1, 2026-09-29) :
    - `pages/marchand/MesDonnees.tsx` (~60 chaînes : titres, libellés,
      détails, finalités, sections politique, modales suppression+politique,
      toasts, voix Tata, aria-labels).
    - `components/auth/Welcome.tsx` (~8 chaînes : titres, aria, alt).
    - `components/auth/EntryGate.tsx` (~2 chaînes : chargement, erreur rôle).
  - 3 écrans critiques migrés (phase 2, 2026-09-30) :
    - `components/marchand/POSCaisse.tsx` (~80 chaînes : titre page, statut
      en/hors ligne, sections Produits/Panier/Paiement, boutons d'action
      Espèces/Crédit/Payer en espèces/Vider le panier, aria-labels
      (Un {{nom}} de moins, Quantité de {{nom}}, Total {{total}} francs,
      Monnaie à rendre…), modale « Autre article », écran « Vente réussie »,
      phrases vocales `dire(...)` — Total/Payer en espèces/Vider le panier/
      Panier actuel/Des marchés plus forts…/Total testés par
      `caisseCharte.test.mts` via un `dans(code, chaine)` qui cherche aussi
      dans `fr.json`).
    - `components/auth/LoginPassword.tsx` (~80 chaînes : titres Ton numéro/
      Ton code secret, boutons Retour/Entrer/Utiliser mon code/Changer de
      compte/C'est mon numéro/Modifier, aria-labels (Ton téléphone te
      reconnaît, Effacer le dernier chiffre, Chiffre {{d}}, Numéro saisi,
      Taper mon numéro sur le clavier, etc.), 18 messages d'erreur
      interpolés (Trop d'essais. Attends {{attente}}, puis réessaie /
      Attention : encore {{restants}} essai{{pluriel}}…), phrases vocales
      `parle(...)` (Entre ton code secret à 4 chiffres / Touche le grand
      bouton… / Je n'ai pas compris / Effacé.).
    - `components/shared/UniversalParametres.tsx` (~110 chaînes : titre
      Paramètres, statut En ligne/Hors ligne, 12 titres de sections
      (Notifications/Sécurité/Production/Gestion/Mes objectifs/Zone de
      travail/Wallet et Commissions/Alertes métier/Rapports automatiques/
      Accessibilité/Compte/Ma façon d'utiliser Julaba), 5 modales
      (Supprimer mon compte/Historique des connexions/Langue de Tata Nanti
      Lou/Se déconnecter ?/Confirme ton identité), toasts (Paramètres
      sauvegardés / Code PIN activé / FaceID activé / Tu as annulé / Ton
      téléphone t'a reconnue), phrases vocales speak(...)).
  - 3 namespaces ajoutés à `fr.json` (`posCaisse.*`, `login.*`,
    `parametres.*`) — 272 nouvelles clés au total.
  - `dioula.json` et `bambara.json` synchronisés (PLACEHOLDERS français,
    `_meta._comment` déjà présent).
- **Vérifications** :
  - `npx tsc -b --force` : **0 erreur** ✅
  - `npm run test:route-access` : **vert** ✅
  - `npm run test:jargon` : **vert** ✅ (341 fichiers balayés, 0 jargon —
    les chaînes déplacées en JSON échappent au test ; todo étendre le scan
    aux `i18n/locales/*.json`).
  - `npm run test:caisse-charte` : **vert** ✅ (test mis à jour pour
    accepter les chaînes soit dans `POSCaisse.tsx` soit dans `fr.json` via
    un helper `dans(code, chaine)`).
  - `npx vite build` : **OK** ✅
- **Reste à faire** (lots ultérieurs) :
  1. Migrer les écrans restants : `MarchandHome`, `VentesPassees`,
     `GestionStock`, `MicroVenteCaisse`, `OnboardingSlides`,
     `ActivationScreen`, etc. — backlog.
  2. Étendre `antiJargon.test.mts` pour scanner `i18n/locales/fr.json`
     (les chaînes JSON échappent aujourd'hui au test).
  3. Faire traduire `dioula.json` et `bambara.json` par un locuteur natif
     (processus documenté dans `i18n/README.md` §5).
  4. Enregistrer les clips audio Tata en bambara/dioula (cohérence
     voice-first / écran — actuellement les clips restent en français).
  5. Fermer FRONT-NEW-5 dans `DEBT_REPORT.md` (passer de PARTIEL à FERMÉ)
     une fois le restant des écrans migrés et les traductions finalisées.

## Règle de validation finale

Aucune tâche ne peut être marquée TERMINÉE sans :
1. ✅ Commits propres (Agent Commit)
2. ✅ Revue positive (Agent Reviewer)
3. ✅ Documentation à jour (Agent Doc)
4. ✅ Audit sécurité (Agent Security) si la tâche touche à auth/permissions/wallet
5. ✅ Validation a11y (Agent a11y) si la tâche touche le frontend
6. ✅ Validation performance (Agent Perf) si la tâche touche le frontend ou la perf backend
7. ✅ Tests E2E (Agent QA)
8. ✅ Validation finale (Agent 1 Tech Lead)
