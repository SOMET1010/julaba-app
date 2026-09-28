# HANDOFF — TEAM_TO_AUDIT

> Passation de l'équipe vers l'Agent Audit Global : demande d'audit global.

## Contexte de la demande d'audit

- **Date de la demande** : YYYY-MM-DD
- **Demandeur** : Agent 1 (Tech Lead) / Agent 2 (QA) / Utilisateur (CTO)
- **Raison** :
  - [ ] Audit périodique (5 features terminées / hebdo)
  - [ ] Avant livraison en production
  - [ ] Après modification architecturale importante
  - [ ] Après incident majeur
  - [ ] Sur signaux faibles (3+ mensonges / 3+ PR bloquées / 3+ CVEs CRITIQUES / vélocité chute > 30%)
  - [ ] À la demande du CTO

## Focus particulier demandé

- [ ] Cohérence architecturale
- [ ] Qualité du code
- [ ] Couverture de tests
- [ ] Documentation
- [ ] Sécurité
- [ ] Accessibilité
- [ ] Performance
- [ ] Conformité aux règles
- [ ] Dette technique
- [ ] Santé du système multi-agents

## Features terminées depuis le dernier audit

| Feature ID | Titre | Date | Commits | Score audit feature |
|---|---|---|---|---|
| FEATURE-XXX | ... | YYYY-MM-DD | <SHA> | 85/100 |
| FEATURE-YYY | ... | YYYY-MM-DD | <SHA> | 78/100 |

## État actuel du projet

- **Score audit précédent** : 73/100 (AUDIT-001, 2026-09-28)
- **Dette technique** : 63 items OUVERTS
- **Vulnérabilités** : 24 (14 prod + 10 dev)
- **Bugs** : X
- **Problèmes a11y** : 7
- **Problèmes perf** : 6
- **Incidents** : X
- **Commits** : Y total, dernier <SHA>

## Questions spécifiques pour l'audit

1. ...
2. ...

## Livrables attendus

- `AUDITS/AUDIT-XXX-YYYY-MM-DD.md` (rapport complet)
- Mise à jour de `AUDIT_REPORT.md` (synthèse)
- Mise à jour de `DEBT_REPORT.md` (dette technique)
- Mise à jour de `SYSTEM_COMPLIANCE.md` (conformité)
- Décision : ✅ PROD autorisée / ❌ PROD bloquée (si score < 60/100)

## Date de passation

YYYY-MM-DD
