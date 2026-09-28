# TASKS.md — Backlog JULABA

> Version humaine-lisible du backlog. Miroir de `TASKS.xlsx` (à créer à la première feature).

## État au 2026-09-28

- **Total tâches** : 12 (toutes issues de l'audit initial)
- **Terminées** : 0
- **En cours** : 0
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
| INIT-010 | Dette | Finaliser ADR-0002 étape 4 (bascule migrations : `DB_MIGRATIONS_RUN=true`, `synchronize` off) | Tech Lead | TODO | P1 |

## Tâches P2 (fiabilisation)

| ID | Epic | Description | Rôle | Statut | Priorité |
|---|---|---|---|---|---|
| INIT-011 | Architecture | Fusionner contrôleurs dupliqués : `cycles-rest` + `producteur/cycles`, `recoltes-rest` + `producteur/recoltes` | Back | TODO | P2 |
| INIT-012 | Dette | Migrer `CATALOGUE` hardcodé (15 produits vivriers dans `caisse-rest.controller.ts`) vers `caisse_produits` ou référentiel maître Odoo | Back | TODO | P2 |

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
