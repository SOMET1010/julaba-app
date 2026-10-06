# TASKS.md — Backlog JULABA

> Version humaine-lisible du backlog. Miroir de `TASKS.xlsx` (à créer à la première feature).

## État au 2026-09-29

- **Total tâches** : 12 (toutes issues de l'audit initial)
- **Terminées** : 2 (INIT-011, INIT-012)
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

## Tâches UX (audit UX des 3 rôles, 2026-10-06)

> Source : `docs/audit/AUDIT-UX-ROLES-2026-10-06.md` (12 P0 / 21 P1 / ~25 P2, 8 motifs transversaux, 6 lots). Décisions §8 tranchées le 06/10 (détail dans le §8 du document).

| ID | Lot | Description | Statut | Priorité |
|---|---|---|---|---|
| UX-1 | Promesses d'argent | Paiements services masqués (BUG-001), transfert relu + verrouillé (BUG-002), marché virtuel honnête (BUG-003), cotisation relecture + PIN (BUG-004) | **TERMINÉ** (commits `68149f2`, `f7e9544`, `67f72ef`, `41b6671`) | P0 |
| UX-2 | Voix pour tous | Ouvrir `speak()` aux producteurs/identificateurs (décision §8.1, doctrine voice-first) + monter Tata dans IdentificateurLayout | TODO | P0 |
| UX-3 | Perdu = retrouvé | Brouillon identification en localStorage (I-P0-1), modes complément/edit branchés (I-P0-2/3), RecolteForm : confirmation backdrop + quantité conservée + compression photo (P-P1-1), consentement signé (décision §8.6) | TODO | P0 |
| UX-4 | Le réseau dit la vérité | Trois situations trois phrases (T3), badge offline dans les 3 layouts (T6), gardes offline wallet, outbox récolte/fiche | TODO | P1 |
| UX-5 | Contrats alignés | computeRevenus unique (T4/P-P0-4), énumération qualité, mapping statuts API, KPIs | TODO | P1 |
| UX-6 | IA/routing | Routes canoniques + redirects (T5), porte keiwa marchand restaurée (décision §8.3), onglets renommés, callbacks /pay à vérifier | TODO | P1 |

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
- Nettoyer `frontend/src/imports/` (mélange code + prompts obsolètes)
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
