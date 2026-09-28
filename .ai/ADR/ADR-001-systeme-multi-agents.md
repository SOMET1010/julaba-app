# ADR-001 — Adoption du système multi-agents autonome pour julaba-app

## Métadonnées

- **ID** : ADR-001 (système multi-agents)
- **Titre** : Adoption du système multi-agents autonome de développement, normalisation, test et suivi de projet sur julaba-app
- **Statut** : accepté
- **Date** : 2026-09-28
- **Décideur** : Utilisateur (CTO / Product Owner)
- **Périmètre** : gouvernance (transverse à tout le projet)

## Contexte

Le projet julaba-app est un pilote agri-fintech mature (780 commits, 5 versions, 35 branches vivantes, registre de dette à 20 révisions) déjà en production réelle sur Render. Il bénéficie d'une gouvernance existante exemplaire (Constitution formalisée, 5 ADR, 48 tests d'invariants, contre-audits multi-révisions, cliquets Jest).

Cependant, l'équipe actuelle est réduite (Alex Degny lead dev + Marco Mancini co-dev + Marc Kouassi chef de projet + Patrick Somet auditeur humain + instance IA JULABA historique). Pour structurer la suite du développement, améliorer la traçabilité des décisions, et fiabiliser la production avant un passage à l'échelle, l'utilisateur a demandé l'application d'un système multi-agents autonome formalisé.

Ce système, défini dans le prompt utilisateur, instaure 13 rôles d'agents (Tech Lead, QA, Backend, Frontend, DevOps, Security, Commit, Reviewer, Doc, a11y, Perf, UX/UI, Audit Global) avec un cycle de vie de feature en 7 phases + audit global périodique. Il exige un dossier `.ai/` avec 30+ fichiers de pilotage et des règles strictes (API-FIRST, séparation des couches, non-duplication, atomicité des commits, validation multi-agents).

## Décision

Nous décidons d'adopter le système multi-agents autonome sur julaba-app avec les adaptations suivantes :

1. **Conservation de la gouvernance existante** : `CONSTITUTION.md`, `JULABA_DECISIONS.md`, `docs/adr/` (5 ADR existants), `docs/dette/REGISTRE-MAITRE.md` (révision 20), `docs/invariants/TABLEAU_DE_BORD.md` (I1-I7), `coordination/` restent les sources de vérité produit/architecture.
2. **Ajout du dossier `.ai/`** comme cockpit de pilotage du système multi-agents, en miroir et complément des fichiers existants.
3. **Mapping des rôles** :
   - Agent 1 (Tech Lead) ↔ Alex Degny (CEO / lead dev)
   - Agent 2 (QA / PO) ↔ Marc Kouassi (chef de projet)
   - Audit Global ↔ Patrick Somet (auditeur humain)
   - Équipe opérationnelle ↔ Instance IA JULABA historique (Claude) + Marco Mancini
4. **Initialisation par audit global** : AUDIT-001 (2026-09-28), score 73/100 — autorise PROD (≥ 60/100 requis).
5. **Respect de la règle d'intégrité absolue (anti-menterie)** : 6 sous-règles non négociables héritées du prompt.
6. **Cycle de vie des features** : 7 phases + audit global périodique (toutes les 5 features ou hebdo).
7. **Règle d'arrêt** : PROD autorisée uniquement si score audit ≥ 60/100 + aucun bug bloquant + aucune vuln CRITIQUE/HAUTE + aucun problème a11y CRITIQUE + aucun problème perf CRITIQUE.

## Alternatives considérées

### Alternative A : Continuer avec la gouvernance existante uniquement
- **Description** : Ne pas ajouter le système multi-agents, garder CONSTITUTION + ADR + registre dette.
- **Avantages** : Pas de surcoût d'initialisation, équipe déjà familière.
- **Inconvénients** : Pas de structure formelle pour les handoffs inter-agents, pas d'audit global périodique, pas de forcing function sur la conformité aux règles.
- **Rejetée parce que** : L'utilisateur a explicitement demandé l'application du système multi-agents.

### Alternative B : Système multi-agents en remplacement de la gouvernance existante
- **Description** : Supprimer CONSTITUTION.md, JULABA_DECISIONS.md, docs/adr/, docs/dette/, etc. et tout basculer dans `.ai/`.
- **Avantages** : Une seule source de vérité, pas de redondance.
- **Inconvénients** : Perte de l'historique (20 révisions du registre), perte des 5 ADR existants avec leurs invariants testables, rupture avec la pratique établie.
- **Rejetée parce que** : La gouvernance existante est exemplaire et efficace. Le système multi-agents vient en complément, pas en remplacement.

### Alternative C : Système multi-agents avec mapping 1:1 sur la gouvernance existante
- **Description** : Faire pointer les fichiers `.ai/` vers les fichiers existants (symlinks ou redirections).
- **Avantages** : Pas de duplication.
- **Inconvénients** : Le système multi-agents attend des formats spécifiques (TASKS.xlsx, HANDOFF/, AUDITS/), qui n'existent pas dans la gouvernance actuelle.
- **Rejetée parce que** : Le système multi-agents apporte des artefacts nouveaux (handoffs, audits périodiques, registres de bugs par catégorie) qui n'ont pas d'équivalent.

## Conséquences

### Positives
- Structure formelle pour les handoffs inter-agents (8 fichiers `HANDOFF/`)
- Audit global périodique indépendant des audits par feature
- Forcing function sur la conformité aux règles (SYSTEM_COMPLIANCE.md)
- Registres séparés pour bugs / vulnérabilités / a11y / perf / régressions / incidents
- Plan de test E2E formalisé
- Budget perf et Core Web Vitals à mesurer
- Leçons apprises explicitement tracées

### Négatives
- 30+ fichiers à maintenir dans `.ai/`
- Risque de duplication entre gouvernance existante et `.ai/` (mitigé par le fait que `.ai/` est un miroir synthétique)
- Surcoût d'écriture pour chaque feature (toutes les phases documentées)

### Risques neutres
- L'équipe actuelle doit s'approprier le système (courbe d'apprentissage)
- Le score 73/100 initial peut être perçu comme faible — mais il est bon pour un pilote (la règle d'arrêt est ≥ 60/100 pour PROD)

## Invariants testables

- Invariant 1 : Le dossier `.ai/` contient les 30+ fichiers prévus (vérification manuelle ou par script)
- Invariant 2 : Aucune feature n'est validée sans validation explicite de TOUS les agents (vérification dans `TASKS.md`)
- Invariant 3 : Aucune livraison PROD sans audit global valide (score ≥ 60/100) — vérifié par `AUDIT_REPORT.md`
- Invariant 4 : La règle d'intégrité (anti-menterie) est respectée — vérifié par `SYSTEM_COMPLIANCE.md` score 100%

## Modules impactés

Aucun module de code n'est impacté directement. Cette décision concerne uniquement la gouvernance et le pilotage.

## Plan de mise en œuvre

### Étape 1 : Initialisation (réalisée le 2026-09-28)
- **Effort** : M (demi-journée)
- **Responsable** : Système multi-agents (orchestrateur)
- **Fichiers créés** : 30+ fichiers dans `.ai/`
- **Tests** : Audit initial AUDIT-001 (2026-09-28), score 73/100

### Étape 2 : Actions P0 (à réaliser sous 1 semaine)
- **Effort** : S (1 jour)
- **Responsable** : Agent Doc + Agent Tech Lead
- **Tâches** : INIT-001 à INIT-005 (README, LICENSE, fusion branche, PAT Azure, .env.example)

### Étape 3 : Actions P1 (à réaliser sous 2 semaines)
- **Effort** : L
- **Responsable** : Agent Security + Agent DevOps + Agent Doc
- **Tâches** : INIT-006 à INIT-010 (CVEs, RGPD, SEC-04, cible prod, ADR-0002 étape 4)

### Étape 4 : Premier audit de suivi
- **Effort** : S
- **Responsable** : Agent Audit Global
- **Date prévue** : après 5 features terminées OU 2026-10-05 (hebdo)

## Références

- `CONSTITUTION.md` — Loi du dépôt (8 principes + mécanismes CI)
- `JULABA_DECISIONS.md` — 10 décisions arch majeures + roadmap
- `docs/adr/ADR-001` (source unique argent), `ADR-002` (P0.0 activation), `ADR-0001` (décrément stock), `ADR-0002` (convergence schéma), `ADR-0003` (unités/devise/stockabilité)
- `docs/dette/REGISTRE-MAITRE.md` — Registre dette (révision 20)
- `docs/invariants/TABLEAU_DE_BORD.md` — Invariants I1-I7
- `coordination/README.md` — Bus IA↔humain
- `.ai/PROJECT_CONTEXT.md` — Vision produit + stack + équipe
- `.ai/ARCHITECTURE.md` — Architecture globale
- `.ai/AUDIT_REPORT.md` — Score global 73/100
- `.ai/WORKFLOWS.md` — Cycle de vie feature en 7 phases + audit

## Historique des révisions

| Date | Révision | Auteur | Description |
|---|---|---|---|
| 2026-09-28 | 1 | Système multi-agents | Création — initialisation du système |

## Post-mortem (à remplir après implémentation)

[À venir après les 5 premières features terminées et le premier audit de suivi.]
