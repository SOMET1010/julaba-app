# CI — filet d'intégration (`.github/workflows/ci.yml`)

Ce dossier porte le **filet d'intégration continue** de Julaba. Objectif : offrir
une **garantie automatique minimale** (install, build, tests, non-régression
TypeScript) sur chaque `pull_request` et `push` vers `main`, **avant** d'ouvrir
les chantiers financiers (stock, crédit, idempotence).

## CI ≠ CD — cible de production **tranchée : Render**

Ce filet **ne déploie rien**. La cible de production est **désormais tranchée** par
l'`ADR-0004 — Cible de production : Render` (2026-09-28), qui formalise la correction
explicite du 13/08/2026 déjà consignée dans `JULABA_DECISIONS.md` §9.

Le dépôt porte **trois chaînes de déploiement**, aux rôles désormais distincts :

| Chaîne | Rôle | Déclenchement | Fichier |
|---|---|---|---|
| **Render** | **PROD RÉELLE** | `autoDeploy: true` sur `main` | `render.yaml` |
| **OVH VPS** `julaba.online` | **Chaîne secondaire** (DR / tests), non utilisée pour servir en nominal | `workflow_dispatch` manuel | `.github/workflows/deploy.yml` |
| **Azure DevOps** | **Miroir lecture seule**, aucun déploiement | `push: main` + tags | `.github/workflows/mirror-azure.yml` |

### Détail

- **Render = prod réelle** — `julaba-db` (PostgreSQL 16, `basic_256mb` payant),
  `julaba-api` (NestJS, `starter` 7 $/mois, `autoDeploy: true`) et `julaba-web`
  (statique gratuit, `autoDeploy: true`). Un push sur `main` redeploie automatiquement
  l'API et le frontend. Runbook : `docs/DEPLOIEMENT_RENDER.md`.
- **OVH VPS julaba.online = chaîne secondaire** — `deploy.yml` reste en
  `workflow_dispatch` manuel (jamais branché sur `push`). Il sert de **disaster
  recovery** et de plateforme de tests, mais **ne sert pas la prod en conditions
  nominales**. Runbook : `GUIDE_DEPLOIEMENT.md` (marqué secondaire).
- **Azure DevOps = miroir lecture seule** — `mirror-azure.yml` pousse `main` + tags
  vers Azure DevOps (aucun déploiement). `azure-pipelines.yml` est **désactivé**
  (`trigger: none`) — le déclenchement historique sur `master` visait une branche
  inexistante, le pipeline ne s'est jamais exécuté. Le PAT Azure DevOps a expiré le
  08/09/2026 — sa régénération est une action ops (P0 listé dans
  `.ai/PROJECT_CONTEXT.md` §10), hors scope de la documentation CI.

### Ce que ça change pour ce filet CI

- Aucun push sur `main` ne déclenche de déploiement OVH ou Azure — le filet CI
  reste strictement **build + tests**, sans effet CD.
- Le seul auto-déploiement nominal vient de Render (`autoDeploy: true`), qui est
  externe à GitHub Actions et piloté par le Blueprint `render.yaml`.
- `deploy.yml` reste utilisable à la demande pour un exercice DR ou une bascule
  manuelle — c'est son rôle désormais assumé.

## Ce que le filet vérifie

1. **Install reproductible** — `npm ci` à la **racine** (npm workspaces + lock
   racine ; les sous-dossiers `frontend_src/` et `backend/` n'ont pas de lock).
2. **Build** — frontend (`vite build`) et backend (`nest build`).
3. **Tests frontend** — 11 harnais `tsx` (`npm run test:ci -w frontend_src`).
4. **Déterminisme du manifeste voix** — auto-activant : régénère et vérifie que
   `docs/voix/` est inchangé, **quand** `voix:manifest` est présent (après merge
   de Studio Voix). S'ignore proprement sinon.
5. **Gate TypeScript à baseline** — `ci/check-tsc-baseline.mjs`.

## Gate TypeScript — baseline = plafond **temporaire**

`ci/tsc-baseline.txt` fixe le **plafond** d'erreurs `tsc` toléré. C'est un
**cliquet** :

| Mesure vs baseline | Résultat |
|---|---|
| `> baseline` | **échec** — régression : la PR introduit des erreurs |
| `< baseline` | **échec** — progrès à entériner : **abaisse la baseline dans la même PR** |
| `= baseline` | OK |

**La baseline n'est pas un niveau acceptable permanent.** Elle vaut aujourd'hui
**0** : sur une install **propre** (`npm ci` à la racine), TypeScript ne remonte
**aucune** erreur — `@types/leaflet` et `@types/qrcode` sont des dépendances
déclarées et se résolvent. Le « 10 » observé un temps venait d'un `node_modules`
local **incomplet** (types non installés), pas d'une vraie dette : c'est
précisément le run CI à froid qui a rétabli la vérité, et le cliquet qui a forcé
l'abaissement à `0`. Toute erreur future doit donc être corrigée **avant** merge,
et non « absorbée » par la baseline. Le câblage des tests backend reste **hors du
périmètre** de ce filet.

## Node

**Node 22 LTS** — base stable et durable. Aucune dépendance n'exige Node 24 et
aucun `engines.node` n'est déclaré ; si une contrainte réelle apparaissait, il
faudrait la **documenter** ici plutôt que la deviner.
