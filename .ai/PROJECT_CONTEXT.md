# PROJECT_CONTEXT.md — JULABA

> Source de vérité du projet. Lue par TOUS les agents au démarrage.

## 1. Vision produit

**JULABA** est un système d'exploitation du commerce informel agricole en Côte d'Ivoire, principalement destiné aux **marchandes non-lectrices**. La doctrine produit est formalisée dans `CONSTITUTION.md` (8 principes) et `JULABA_DECISIONS.md`.

- **Public cible** : commerçantes (majoritairement femmes), identificateurs, producteurs, coopératives, grossistes, demi-grossistes, institutions (ANSUT).
- **Problème résolu** : gérer argent, stock, crédit, vente à crédit, fermeture de caisse et synchronisation hors-ligne **à la voix** pour des femmes qui ne savent pas lire.
- **Assistante vocale** : « Tata Nanti Lou » (synthèse ElevenLabs cloud + VITS-Piper hors-ligne embarquée dans l'APK).
- **Doctrine voice-first** (Patrick, 20/09/2026) : « Aucune information importante ne doit exister uniquement sous forme de texte. Aucune ÉTAPE importante ne doit exister uniquement sous forme tactile. La voix est une propriété du PARCOURS, pas de l'écran. »

## 2. Porteur et partenaires

- **ICONE Solutions** — Alex Degny (CEO / lead dev), Marco Mancini (co-dev), Marc Kouassi (chef de projet).
- **Partenaire réglementaire** : ANSUT (Hervé Paré, Youssouf Diakité).
- **Auditeur humain / arbitre produit** : Patrick Somet.
- **Instance IA historique** : « JULABA » (Claude) — auteur de ~51 % des 780 commits.

## 3. Stack technique (synthèse)

| Couche | Choix | Version |
|---|---|---|
| Backend | NestJS + TypeORM + PostgreSQL | 11 / 0.3 / 16 |
| Frontend | React + Vite + TypeScript + Tailwind v4 + shadcn/Radix | 18.3 / 6.3 / 5.9 / 4.1 |
| Mobile | Capacitor 8 (APK Android, compileSdk 36, minSdk 24) | 8.5 |
| Voix offline | sherpa-onnx (STT zipformer2 FR) + VITS-Piper (TTS siwis CC-BY 4.0) | 1.13.5 |
| Voix cloud | ElevenLabs (TTS Tata Nanti Lou) | — |
| Auth | JWT + Refresh rotation + WebAuthn + PIN AES-256-GCM | — |
| Tests | Jest (back) + tsx helpers maison (front) + Playwright (E2E) + Maestro (mobile, non exécutés) | 29 / — / latest |
| CI/CD | GitHub Actions (9 workflows) + Azure Pipeline (miroir) + Render (prod) | — |
| Observabilité | Sentry (optionnel back, hardcodé front) | 10.x |
| Déploiement | Render (prod réelle), OVH julaba.online (chaîne secondaire non utilisée pour servir), GitHub Releases (APK pilote) | — |

## 4. État courant (snapshot 2026-09-28)

- **Branche active** : `main` (commit `0553c10`, 22/09/2026)
- **Branches vivantes** : 35 (dont ~22 `review/`, 6 `claude/`, 2 `manus/`, 2 `design/`)
- **Tags** : 1 (`pilote-latest`) — pas de semver formel
- **Working tree** : propre
- **Retard `main` <-> branche de travail** : 14 commits (`claude/clever-allen-dnr8by` non fusionnée)
- **Version package.json** : `5.0.0` (mais `/health` back retourne `1.0.0` hardcodé)

## 5. Production réelle

> **Décision formalisée : `docs/adr/ADR-0004-cible-production-render.md`** (28/09/2026).
> La production réelle est sur **Render**. L'OVH VPS est une chaîne secondaire de DR
> (non utilisée pour servir en nominal). Azure DevOps est un miroir lecture seule.

- **Render** : `julaba-api` (starter 7$/mois, ne s'endort pas), `julaba-web` (statique gratuit), `julaba-db` (PostgreSQL 16, `basic_256mb` payant — free expire 90 jrs). `autoDeploy: true` sur `main` pour `julaba-api` et `julaba-web`. Health check `/api/v1/health`. Runbook : `docs/DEPLOIEMENT_RENDER.md`.
- **OVH VPS** `149.56.17.9` / `julaba.online` : conservé mais **non utilisé pour servir** en conditions nominales (correction explicite 13/08/2026, ADR-0004). Rôle : disaster recovery + tests. Workflow `.github/workflows/deploy.yml` en `workflow_dispatch` manuel (jamais branché sur `push`). Runbook : `GUIDE_DEPLOIEMENT.md` (marqué secondaire).
- **Azure DevOps** : miroir lecture seule via `.github/workflows/mirror-azure.yml` (push `main` + tags, aucun déploiement). `azure-pipelines.yml` **désactivé** (`trigger: none` — l'ancien trigger `master` visait une branche inexistante). PAT Azure expiré le 08/09/2026 (à régénérer, P0 — voir §10).
- **APK Android** : debug-signed, distribué via GitHub Releases (`pilote-latest`, retention 14 jrs).

## 6. Conventions de gouvernance existantes

- **Constitution** (`CONSTITUTION.md`) : 8 principes avec mécanismes CI actionnables.
- **ADR** : 6 existants (`ADR-001`, `ADR-002`, `ADR-0001`, `ADR-0002`, `ADR-0003`, `ADR-0004`) dans `docs/adr/`. ADR-0004 tranche la cible de production (Render).
- **Registre de dette** : `docs/dette/REGISTRE-MAITRE.md` (révision 20, 33 FERME / 5 HORS PERIMETRE / 48 OUVERT, **0 P0 OUVERT**).
- **Invariants business** : `docs/invariants/TABLEAU_DE_BORD.md` (I1-I7, 4 en `it.failing`).
- **Coordination IA<->Humain** : `coordination/` (règle « un fichier = un écrivain », 3 types d'arrêt formalisés).

## 7. Équipe virtuelle multi-agents (rôles)

| Agent | Rôle | Périmètre courant |
|---|---|---|
| Agent 1 — Tech Lead | Architecture, découpage, revue | Pilotage initial |
| Agent 2 — QA / PO | Backlog, tests E2E, validation | Plan de test initial |
| Dev Backend | API, DB, métier | Lecture seule |
| Dev Frontend | UI, UX, état client | Lecture seule |
| Dev Fullstack / Data | Migrations, scripts | Lecture seule |
| DevOps | CI/CD, Docker, déploiement | Lecture seule |
| Security | Audit, vulnérabilités | Audit initial |
| Commit | Commits Git | — |
| Reviewer | Revue de code | — |
| Doc | Documentation | Cartographie docs |
| a11y | WCAG, ARIA, contrastes | Audit initial |
| Perf | Lighthouse, bundle, N+1 | Audit initial |
| UX/UI | Wireframes, design system | Cartographie DS |
| Audit Global | Audit transversal, dette, conformité | **Audit #001 en cours** |

## 8. Règles critiques héritées du projet

1. **Modules sacrés** : Auth, Caisse, Crédit, Fermeture, Synchro, Argent — toute modification exige tests complets + invariants verts + ADR.
2. **Argent = journal append-only** (`ADR-001`) : `caisse == fond_initial + somme(mouvements du journal du jour)`.
3. **P0.0 — Fin du takeover `0000`** (`ADR-002`) : code d'activation à usage unique (30 min), PIN choisi par la marchande sur son téléphone.
4. **Pin jamais définitivement verrouillé** — échelle d'attente (3->5min, 6->15min, 9+->1h), supprime l'ancienne politique « 100 ans ».
5. **Argent gelé pour Keiwa / B-Pay / mobile money** — invariant `argent-gele-b2.spec.ts`.
6. **Annulation : rien n'est jamais supprimé** — événement TRACÉ.
7. **Pin jamais lisible, jamais choisi par un admin, jamais journalisé** (`SEC-05/07/08` fermés).
8. **Allow-list rôles fail-closed** — `super_admin` jamais créable par signup générique.

## 9. Score de santé initial (audit #001, 2026-09-28)

| Dimension | Score |
|---|---|
| Cohérence architecturale | 78/100 |
| Qualité du code | 70/100 |
| Couverture de tests | 75/100 |
| Documentation | 82/100 |
| Sécurité | 72/100 |
| Accessibilité | 75/100 |
| Performance | 73/100 |
| Conformité aux règles (existantes) | 78/100 |
| Dette technique (inverse) | 65/100 |
| Santé du système multi-agents | 100/100 (initialisation) |
| **Score global** | **73/100** |

-> Autorise livraison PROD sous conditions (>= 60/100 requis).

## 10. Prochaines actions prioritaires (P0)

1. Fusionner `claude/clever-allen-dnr8by` vers `main` (14 commits de retard).
2. Créer `README.md` racine (point d'entrée universel absent).
3. Ajouter `LICENSE` (projet `UNLICENSED`).
4. Régénérer PAT Azure DevOps expiré.
5. Documenter variables d'env dans `backend/.env.example`.

## 11. Prochaines actions P1

6. Créer `docs/POLITIQUE-CONFIDENTIALITE.md` + écran UI « Mes données » (loi ivoirienne n°2013-450).
7. Mettre en place `license-checker` en CI.
8. Tagger `v5.0.0` + adopter Keep-a-Changelog.
9. Corriger `SEC-04` (journalisation terme de recherche dans `users.service.ts:334`).
10. Réécrire invariant `I6` (spécification périmée).

## 12. Fichiers source à connaître

- `CONSTITUTION.md` — loi du dépôt (8 principes).
- `JULABA_DECISIONS.md` — 10 décisions arch majeures + roadmap.
- `GUIDE_DEPLOIEMENT.md` — runbook OVH VPS (chaîne secondaire DR, voir ADR-0004). La prod réelle est documentée dans `docs/DEPLOIEMENT_RENDER.md`.
- `todo.md` — todo audit Patrick.
- `docs/adr/` — 6 ADR (ADR-0004 = cible de production Render).
- `docs/dette/REGISTRE-MAITRE.md` — registre dette (révision 20).
- `docs/invariants/TABLEAU_DE_BORD.md` — invariants I1-I7.
- `coordination/` — bus IA<->humain.
- `.audit_ui_*.md` / `.audit_ui_*.txt` — 4 audits UI existants.
