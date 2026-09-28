# WORKFLOWS.md — Feature Lifecycle JULABA

> Source de vérité des workflows. Lue par tous les agents.

## 1. Cycle de vie d'une feature (7 phases + audit)

```
PHASE 0 : CONCEPTION UX/UI       -> UX/UI Designer
PHASE 1 : CAPTURE & SPECIFICATION -> QA / PO
PHASE 2 : DESIGN TECHNIQUE        -> Tech Lead (+ ADR)
PHASE 3 : DECOUPAGE & PLANIFICATION -> Tech Lead + QA
PHASE 4 : IMPLEMENTATION PARALLELE -> Back / Front / DevOps
PHASE 5 : REVUE, INTEGRATION & TESTS -> Commit -> Reviewer -> Doc -> Security -> a11y -> Perf -> QA
PHASE 6 : VALIDATION & DOC FINALE   -> Tous
PHASE 7 : RETROSPECTIVE             -> Tous
PHASE 8 : AUDIT GLOBAL PERIODIQUE   -> Audit Global (toutes les 5 features ou hebdo)
```

## 2. PHASE 0 — Conception UX/UI

**Propriétaire** : Agent UX/UI Designer
**Livrables** :
- `SPECS/FEATURE-XXX_UX.md` : wireframes, user flows, design system
- Validation de la faisabilité technique avec Tech Lead

**Règles** :
- Voice-first : tout parcours tactile doit avoir un équivalent vocal
- 3 confits visuels (normal/soleil/sombre)
- Cible tactile ≥ 44 px
- Tokens CSS existants (pas de couleurs hardcodées)
- Composants existants en priorité (shadcn local + Universal*BO)

## 3. PHASE 1 — Capture & Spécification

**Propriétaire** : Agent 2 (QA / PO)
**Livrables** :
- `SPECS/FEATURE-XXX.md` : user stories, critères d'acceptation, scénarios BDD
- Mise à jour de `TASKS.md` et `TASKS.xlsx` avec la feature et ses sous-tâches
- Définition des dépendances inter-agents

**Règles** :
- Une user story = un critère d'acceptation = un scénario de test
- Toute feature doit définir ses invariants business testables
- Priorité (P0-P4) définie explicitement

## 4. PHASE 2 — Design Technique

**Propriétaire** : Agent 1 (Tech Lead)
**Livrables** :
- `SPECS/FEATURE-XXX_TECH_DESIGN.md` : architecture, endpoints, modèles DB, migrations
- ADR si décision majeure (`ADR/ADR-XXX-*.md`)
- Mise à jour de `API_CONTRACTS.md` si nouveaux endpoints

**Règles** :
- **API-FIRST** : contrat API validé avant tout développement frontend
- Séparation des couches : pas de requête DB dans composants frontend
- Non-duplication : justifier toute duplication dans `ARCHITECTURE.md`
- Idempotence si mutation financière
- Fail-closed par défaut sur permissions

## 5. PHASE 3 — Découpage & Planification

**Propriétaires** : Agent 1 (Tech Lead) + Agent 2 (QA)
**Livrables** :
- Mise à jour de `TASKS.xlsx` avec sous-tâches, rôles assignés, dépendances, fichiers concernés
- Mise à jour de `HANDOFF/LEAD_TO_TEAM.md`

**Règles de dépendance** :
- Frontend bloqué tant que contrat API non validé
- Backend bloqué sur auth/permissions tant que Security non validé
- Aucune tâche TERMINÉE sans commits propres (Commit)
- Aucune tâche TERMINÉE sans revue positive (Reviewer)
- Aucune tâche FRONTEND TERMINÉE sans validation a11y
- Aucune tâche FRONTEND TERMINÉE sans validation performance
- Aucune livraison en PROD sans audit global valide (Audit ≥ 60/100)

## 6. PHASE 4 — Implémentation parallèle

**Propriétaires** : Équipe opérationnelle (Back / Front / DevOps / Fullstack)
**Livrables** :
- Code implémenté avec tests unitaires
- Mise à jour des `HANDOFF/` correspondants :
  - `BACKEND_TO_FRONTEND.md` : API prête
  - `FRONTEND_TO_BACKEND.md` : besoin d'API
  - `TEAM_TO_QA.md` : code prêt à tester
  - `TEAM_TO_REVIEWER.md` : code prêt pour revue
  - `TEAM_TO_COMMIT.md` : code prêt à commiter

**Règles** :
- Modules sacrés : tests complets + invariants verts + ADR obligatoire
- Argent = journal append-only (jamais de mise à jour d'une transaction existante)
- Pin jamais lisible, jamais choisi par un admin, jamais journalisé
- Allow-list rôles fail-closed

## 7. PHASE 5 — Revue, Intégration & Tests

**Ordre strict** :

1. **AGENT COMMIT** vérifie et commit le code
   - Commits conventionnels (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`, `perf:`, `style:`)
   - Atomicité : un commit = une préoccupation
   - Pas de `git add .` (ajout explicite par fichier)
   - Mise à jour de `COMMIT_LOG.md`

2. **AGENT REVIEWER** fait la revue de code indépendante
   - Qualité, patterns, lisibilité, maintenabilité
   - Pas de duplication inutile
   - Séparation des couches respectée
   - Mise à jour de `REVIEW_LOG.md`

3. **AGENT DOCUMENTATION** met à jour la doc
   - README, JSDoc, guides, changelogs, ADR
   - Mise à jour de `API_CONTRACTS.md`, `ARCHITECTURE.md` si besoin

4. **DEV SECURITÉ** audite les commits
   - Vulnérabilités, dépendances, conformité
   - Mise à jour de `SEC_BUGS.md` et `SECURITY_AUDIT.md`

5. **AGENT a11y** valide l'accessibilité (si feature frontend)
   - WCAG 2.1 AA, navigation clavier, ARIA, contrastes
   - Mise à jour de `A11Y_BUGS.md`

6. **AGENT PERFORMANCE** valide les métriques (si feature frontend/perf-critique)
   - Bundle, lazy loading, N+1, Core Web Vitals
   - Mise à jour de `PERF_ISSUES.md`

7. **AGENT 2 (QA)** teste E2E
   - Scénarios nominaux + erreurs + edge cases
   - Mise à jour de `BUGS.md` ou `REGRESSIONS.md`

8. **AGENT 2** valide ou crée `BUG-XXX` / `SEC-XXX` / `A11Y-XXX` / `PERF-XXX`

**RÈGLE** : Une feature n'est VALIDÉE que si TOUS les agents ont validé leur domaine.

## 8. PHASE 6 — Validation & Documentation Finale

**Propriétaires** : Tous
**Livrables** :
- Mise à jour de `CHANGELOG.md`
- Mise à jour de `TASKS.xlsx` (statut TERMINÉ)
- Mise à jour de `TEAM_STATUS.md`
- Mise à jour de `DAILY_STANDUP.md`
- Création d'ADR si décision majeure

## 9. PHASE 7 — Rétrospective & Apprentissage

**Propriétaires** : Tous
**Livrables** :
- Mise à jour de `LESSONS_LEARNED.md` (ce qui a marché, ce qui a coincé, ce qu'on améliore)
- Mise à jour de `WORKFLOWS.md` si processus à ajuster
- Mise à jour de `SYSTEM_COMPLIANCE.md` si règle à faire évoluer

## 10. PHASE 8 — Audit Global Périodique

**Propriétaire** : Agent Audit Global
**Déclenchement** :
- Toutes les 5 features terminées
- OU chaque semaine (pour les projets actifs)
- OU à chaque milestone majeur
- OU sur demande du CTO
- OU après un incident majeur
- OU avant une livraison en production
- OU après une modification architecturale importante
- OU sur signaux faibles (3+ mensonges d'affilée, 3+ PR bloquées Reviewer, 3+ vulnérabilités CRITIQUES, vélocité chute > 30%)

**Livrables** :
- `AUDITS/AUDIT-XXX-YYYY-MM-DD.md` (rapport complet)
- Mise à jour de `AUDIT_REPORT.md` (synthèse)
- Mise à jour de `DEBT_REPORT.md` (dette technique)
- Mise à jour de `SYSTEM_COMPLIANCE.md` (conformité)

**Pouvoirs** :
- Bloquer une livraison PROD si score < 60/100
- Exiger un plan de correction de la dette technique
- Recommander des refactoring majeurs

## 11. Détection de bug et routage

```
QA détecte un bug
  |
  +-- Si bug fonctionnel       -> BUG-XXX dans BUGS.md         -> Priorité P0-P4
  +-- Si vulnérabilité          -> SEC-XXX dans SEC_BUGS.md     -> Priorité P0-P2
  +-- Si problème a11y          -> A11Y-XXX dans A11Y_BUGS.md   -> Priorité P0-P2
  +-- Si problème perf          -> PERF-XXX dans PERF_ISSUES.md -> Priorité P0-P2
  +-- Si régression             -> REG-XXX dans REGRESSIONS.md  -> Priorité P0-P1
  +-- Si incident intégrité     -> INC-XXX dans INCIDENTS.md    -> Priorité P0 (bloquant)
  +-- Si non-conformité critique -> AUDIT-XXX dans AUDIT_REPORT.md -> Bloque PROD
```

## 12. Règle de priorité

| Priorité | Définition | Action |
|---|---|---|
| **P0** | Blocage critique / Vulnérabilité CRITIQUE / Problème a11y CRITIQUE / Problème perf CRITIQUE / Non-conformité CRITIQUE | Interrompt les travaux non prioritaires |
| **P1** | Fonctionnalité majeure / Vulnérabilité HAUTE / Problème a11y MAJEUR / Problème perf MAJEUR | Prioritaire |
| **P2** | Bug fonctionnel / Vulnérabilité MOYENNE / Problème a11y MINEUR / Problème perf MINEUR | Normal |
| **P3** | Dette technique / Vulnérabilité BASSE / Recommandation Audit | Backlog |
| **P4** | Amélioration / INFO | Optionnel |

## 13. Boucle autonome

```
SCAN -> COMPRENDRE -> CONCEPTION UX (UX/UI) -> PLANIFIER (Tech Lead + ADR)
     -> DELEGUER (Back/Front/DevOps) -> COMMIT -> REVIEW -> DOCUMENTER
     -> AUDITER (Security) -> VALIDER (a11y + Perf) -> TESTER (QA)
     -> DETECTER -> CORRIGER -> RETESTER -> VALIDER
     -> METTRE A JOUR TASKS.xlsx -> DAILY STANDUP -> LESSONS LEARNED
     -> AUDIT GLOBAL (periodique) -> PROCHAINE TACHE
```

## 14. Règle d'arrêt

Le système peut considérer le projet comme terminé uniquement lorsque :

```
Toutes les fonctionnalités demandées
  -> implémentées
  -> testées (QA + Securite + a11y + Perf)
  -> revues (Reviewer)
  -> documentées (Doc)
  -> commits propres (Commit)
  -> conformes au design (UX/UI)
  -> auditées globalement (Audit >= 60/100)
  -> sans bug bloquant
  -> sans vulnérabilité CRITIQUE ou HAUTE
  -> sans problème a11y CRITIQUE
  -> sans problème perf CRITIQUE
  -> sans régression connue
  -> dette technique documentée et planifiée
ET :
  TASKS.xlsx à jour
  SECURITY_AUDIT.md validé
  COMMIT_LOG.md propre
  REVIEW_LOG.md propre
  ADR à jour
  LESSONS_LEARNED.md à jour
  AUDIT_REPORT.md validé (score >= 60/100)
  DEBT_REPORT.md à jour
  SYSTEM_COMPLIANCE.md à jour
```
