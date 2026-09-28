# .ai/ — Système Multi-Agents Autonome de Développement

Ce dossier est le **cockpit de pilotage** du système multi-agents appliqué au projet `julaba-app`.
Tous les agents (Tech Lead, Backend, Frontend, DevOps, Security, Commit, Reviewer, Doc, a11y, Perf, UX/UI, Audit, QA) lisent et écrivent ici.

## Règle d'or

> **AUCUN AGENT NE MODIFIE LE CODE AVANT D'AVOIR LU `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `TASKS.md`, `TEAM_STATUS.md` ET LE DERNIER `AUDITS/AUDIT-XXX.md`.**

## Structure

| Fichier / Dossier | Rôle | Propriétaire principal |
|---|---|---|
| `README.md` | Ce fichier — point d'entrée | Tous |
| `PROJECT_CONTEXT.md` | Vision produit, stack, équipe, état courant | Tech Lead |
| `ARCHITECTURE.md` | Architecture globale (Back/Front/Mobile/DB) | Tech Lead |
| `API_CONTRACTS.md` | Contrats d'API (synthèse des 361 endpoints) | Backend |
| `DESIGN_SYSTEM.md` | Design system, tokens, composants | UX/UI |
| `ACCESSIBILITY_GUIDE.md` | Règles WCAG, patterns a11y | a11y |
| `PERFORMANCE_BUDGET.md` | Budgets perf, métriques Core Web Vitals | Perf |
| `REQUIREMENTS.md` | Exigences fonctionnelles et non-fonctionnelles | QA / PO |
| `TASKS.md` | Backlog humain-lisible (miroir de TASKS.xlsx) | QA |
| `TASKS.xlsx` | Backlog structuré (à créer à la première feature) | QA |
| `TEAM_STATUS.md` | État temps réel de chaque agent | Tech Lead |
| `CHANGELOG.md` | Journal des versions | Doc |
| `BUGS.md` | Bugs fonctionnels | QA |
| `SEC_BUGS.md` | Vulnérabilités | Security |
| `A11Y_BUGS.md` | Problèmes d'accessibilité | a11y |
| `PERF_ISSUES.md` | Problèmes de performance | Perf |
| `SECURITY_AUDIT.md` | Synthèse audit sécurité courant | Security |
| `INCIDENTS.md` | Journal des incidents | Tech Lead |
| `COMMIT_LOG.md` | Journal des commits (atomicité, conventions) | Commit |
| `REVIEW_LOG.md` | Journal des revues de code | Reviewer |
| `LESSONS_LEARNED.md` | Leçons apprises | Tous |
| `DAILY_STANDUP.md` | Standup quotidien simulé | QA |
| `AUDIT_REPORT.md` | Rapport d'audit global courant | Audit Global |
| `DEBT_REPORT.md` | Dette technique (synthèse du registre existant) | Audit Global |
| `SYSTEM_COMPLIANCE.md` | Conformité aux règles du prompt | Audit Global |
| `REGRESSIONS.md` | Régressions détectées | QA |
| `TEST_PLAN.md` | Plan de test E2E | QA |
| `WORKFLOWS.md` | Workflows des 7 phases du Feature Lifecycle | Tech Lead |
| `ADR/` | Architecture Decision Records | Tech Lead |
| `AUDITS/` | Historique des audits globaux | Audit Global |
| `SPECS/` | Spécifications de features (FEATURE-XXX*.md) | UX/UI + Tech Lead |
| `HANDOFF/` | Passations inter-agents | Tous |

## Cycle de vie d'une feature (rappel)

```
PHASE 0 : CONCEPTION UX/UI       -> UX/UI Designer
PHASE 1 : CAPTURE & SPECIFICATION -> QA / PO
PHASE 2 : DESIGN TECHNIQUE        -> Tech Lead (+ ADR)
PHASE 3 : DECOUPAGE & PLANIFICATION -> Tech Lead + QA
PHASE 4 : IMPLEMENTATION PARALLELE -> Back / Front / DevOps
PHASE 5 : REVUE, INTEGRATION & TESTS -> Commit -> Reviewer -> Doc -> Security -> a11y -> Perf -> QA
PHASE 6 : VALIDATION & DOC FINALE   -> Tous
PHASE 7 : RETROSPECTIVE             -> Tous
PHASE 8 : AUDIT GLOBAL PERIODIQUE   -> Audit Global
```

## Règle de validation finale

Une feature n'est **VALIDEE** que si **TOUS** les agents ont validé leur domaine.
Une livraison en PROD exige un **score audit global >= 60/100**.

## État initial (au 2026-09-28)

Le projet `julaba-app` est un pilote agri-fintech en production réelle sur Render.
Le système multi-agents est **initialisé** mais **aucune feature n'est encore en cours**.
Le premier audit global (`AUDITS/AUDIT-001-2026-09-28.md`) donne un **score global de 73/100** -- autorise la livraison PROD sous conditions.
