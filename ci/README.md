# CI — filet d'intégration (`.github/workflows/ci.yml`)

Ce dossier porte le **filet d'intégration continue** de Julaba. Objectif : offrir
une **garantie automatique minimale** (install, build, tests, non-régression
TypeScript) sur chaque `pull_request` et `push` vers `main`, **avant** d'ouvrir
les chantiers financiers (stock, crédit, idempotence).

## CI ≠ CD — et cible de production **NON VÉRIFIÉE**

Ce filet **ne déploie rien**. Il **ne choisit aucune cible de production**.

Le dépôt contient **deux chaînes de déploiement concurrentes** :

- **Render** (site statique + API, `render.yaml`) ;
- **serveur SSH/Docker `julaba.online`** (`.github/workflows/deploy.yml`).

Rien, dans le dépôt ou la documentation interne consultée, ne prouve **laquelle
sert réellement la production**. Tant que ce n'est pas tranché par une **preuve
d'infrastructure ou d'administration** (pas par inférence depuis le dépôt), la
cible de prod reste **Non vérifiée** et **aucun auto-déploiement n'est branché**.

- `deploy.yml` et `mirror-azure.yml` restent en **déclenchement manuel**
  (`workflow_dispatch`) — voir lot L2 de ce chantier.
- Aucun push sur `main` ne déclenche de déploiement.

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
