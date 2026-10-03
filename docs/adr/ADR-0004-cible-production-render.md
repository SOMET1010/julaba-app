# ADR-0004 — Cible de production : Render (clarification des 3 chaînes)

- **Statut** : Accepté.
- **Date** : 2026-09-28.
- **Décideurs** : Patrick Somet (arbitrage produit) + Alex Degny (lead dev), formalisant
  la correction explicite du 13/08/2026 déjà consignée dans `JULABA_DECISIONS.md` §9.
- **Périmètre** : documentation et gouvernance des chaînes de déploiement. **Aucune
  modification de code applicatif** — `render.yaml`, `deploy.yml`, `mirror-azure.yml`
  et `docker-compose.prod.yml` ne sont pas touchés dans leur logique métier.

---

## Contexte — trois chaînes concurrentes, ambiguïté non levée

Le dépôt porte aujourd'hui **trois chaînes de déploiement** qu'aucun document ne
désignait clairement comme servant la production réelle :

1. **Render** (`render.yaml`) — Blueprint qui monte `julaba-db` (PostgreSQL 16
   managé, plan `basic_256mb` payant), `julaba-api` (NestJS, plan `starter` 7 $/mois,
   `autoDeploy: true`) et `julaba-web` (site statique gratuit, `autoDeploy: true`).
   `healthCheckPath: /api/v1/health`. Un push sur `main` redéploie automatiquement
   l'API et le web.
2. **OVH VPS** `149.56.17.9` / `julaba.online` — Docker Compose local
   (`docker-compose.yml`), workflow `.github/workflows/deploy.yml` en
   `workflow_dispatch` manuel (rsync + build + `docker compose up -d`), Nginx vhost
   `nginx/julaba.conf` (TLS 1.2/1.3, HSTS sans preload). Health check
   `https://julaba.online/api/v1/health`.
3. **Azure DevOps** — `azure-pipelines.yml` déclencheur `trigger: branches.include:
   [master]` alors que la branche par défaut du dépôt est `main` : le pipeline ne se
   déclenchait **jamais**. Miroir GitHub → Azure assuré par
   `.github/workflows/mirror-azure.yml` (poussé sur `main` + tags). Le PAT Azure
   DevOps a expiré le 08/09/2026 — le miroir est donc lui-même muet depuis cette
   date.

Cette ambiguïté était explicitement consignée dans `ci/README.md` (« cible de prod
**NON VÉRIFIÉE** ») et dans le commentaire d'en-tête de `.github/workflows/deploy.yml`.

Le 13/08/2026, `JULABA_DECISIONS.md` §9 a acté la correction : **Render est la
production réelle**, l'OVH est conservé mais **non utilisé pour servir**, Azure
reste un miroir. Cette décision n'avait pas encore été formalisée en ADR — c'est
l'objet du présent document.

---

## Décision

> **Render est la cible de production officielle de JULABA.** L'OVH VPS
> `julaba.online` devient une chaîne **secondaire** de disaster recovery (DR) et de
> tests, conservée mais **non utilisée pour servir en conditions nominales**. Azure
> DevOps reste un **miroir en lecture seule**, sans déploiement.

### D1 — Render = production réelle

Les trois services Render constituent la prod :

- `julaba-db` (PostgreSQL 16, `basic_256mb` payant — la base gratuite expire à 90
  jours, ce qui est inacceptable pour une base qui porte les données d'une
  marchande).
- `julaba-api` (NestJS, `starter` 7 $/mois — le plan gratuit s'endort à la première
  requête, une marchande n'attend pas devant sa caisse ; `autoDeploy: true`).
- `julaba-web` (statique gratuit, `autoDeploy: true`).

`render.yaml` est laissé **intact** : il est déjà aligné sur l'existant (cf. bloc
commenté en tête de fichier, mise à jour 17/09/2026).

### D2 — OVH VPS `julaba.online` = chaîne secondaire (DR / tests)

- `deploy.yml` reste en `workflow_dispatch` manuel. Il ne se branche **jamais** sur
  un `push`.
- Le VPS n'est **pas utilisé pour servir** la prod en conditions nominales. Il sert
  de :
  - **disaster recovery** : en cas d'indisponibilité Render prolongée, déclencher
    `deploy.yml` manuellement, basculer le DNS `julaba.online` si besoin, et servir
    depuis le VPS le temps de la récupération.
  - **tests d'intégration bout-en-bout** sur une plateforme réaliste, hors du
    trafic réel.
- `nginx/julaba.conf`, `docker-compose.yml`, `install-server.sh`, `scripts/deploy.sh`
  sont **conservés** (DR). `GUIDE_DEPLOIEMENT.md` est marqué comme secondaire.

### D3 — Azure DevOps = miroir lecture seule

- `azure-pipelines.yml` est **désactivé** (`trigger: none` + commentaire
  explicatif). Le déploiement Azure n'a jamais tourné en prod (trigger sur branche
  inexistante `master`), et l'objectif du miroir Azure est uniquement de tenir à
  disposition de l'équipe ANSUT une copie à jour du code — pas de déployer.
- `mirror-azure.yml` reste en place : c'est lui qui porte le miroir. Son PAT ayant
  expiré le 08/09/2026, il est muet depuis — la régénération du PAT est une action
  **ops hors scope** de cette décision, déjà listée dans
  `.ai/PROJECT_CONTEXT.md` §10 (P0) et §5.

---

## Alternatives envisagées

| Alternative | Pour | Contre | Verdict |
|---|---|---|---|
| **Render seul** (supprimer OVH + Azure) | Un seul environnement à maintenir, fini l'ambiguïté | Perte de la capacité DR ; perte du miroir Azure pour l'équipe ANSUT | Rejeté — DR et miroir ont une valeur réelle. |
| **OVH seul** (supprimer Render) | Souveraineté, maîtrise totale, coûts directs maîtrisés | Le pipeline `deploy.yml` est manuel, pas d'auto-déploiement sur `main` ; l'équipe a déjà fait le choix Render pour la simplicité de déploiement automatique | Rejeté — contredit la décision du 13/08/2026 et le pilotage Render en place. |
| **Azure DevOps seul** (utiliser la pipeline Azure pour déployer sur la VM `VMenv`) | Conforme au modèle Azure DevOps de l'ANSUT | PAT expiré, pipeline jamais déclenché (`master`), aucun historique de prod Azure | Rejeté — aucun signe que cette chaîne ait jamais servi. |
| **Hybride Render + OVH actifs** (les deux servent en load-balancing) | Capacité de bascule temps réel | Double coût, double complexité opérateur, divergence de schéma entre les deux bases | Rejeté — adopté en variante DR passive (D2), pas en actif. |
| **Hybride Render (prod) + OVH (DR passif) + Azure (miroir)** | Préserve la capacité DR sans divergence de données ; un seul chemin sert | Maintien de trois chaînes documentées | **Retenu** — c'est la décision actée. |

---

## Conséquences

### Positives

- **Une seule source de vérité** pour la prod : Render. Tout nouveau dev lit
  `render.yaml` et sait ce qui tourne.
- **Auto-déploiement fiable** sur `main` via `autoDeploy: true` — la friction
  opérationnelle de `deploy.yml` (workflow manuel + SSH + Docker build) est éliminée
  du chemin nominal.
- **DR préservé** : la chaîne OVH reste disponible et testée en cas d'incident
  Render (indisponibilité, perte de données, facturation).
- **Dette d'ambiguïté levée** : `ci/README.md`, `GUIDE_DEPLOIEMENT.md` et les
  en-têtes de workflows ne disent plus « Non vérifiée » — la doctrine est écrite.
- **Aucun code métier modifié** : risque de régression nul pour ce lot.

### Négatives

- **Coût Render mensuel** non nul (`basic_256mb` + `starter` ≈ 12 $/mois).
  Documenté et assumé (free = base qui expire à 90 jours).
- **Maintenance de trois chaînes** : `render.yaml`, `deploy.yml`, `mirror-azure.yml`
  + `azure-pipelines.yml` (désactivé). Charge de documentation réelle.
- **DR non testé régulièrement** : tant qu'on ne déclenche pas `deploy.yml`, on ne
  sait pas s'il fonctionne encore. À planifier en exercice DR périodique (action
  distincte, hors scope).
- **PAT Azure expiré** : le miroir est muet depuis le 08/09/2026. À régénérer (P0
  déjà listé).

### Neutres

- `docker-compose.prod.yml` (images ACR) reste dans le dépôt comme **référence**
  pour une éventuelle bascule Azure à terme — il n'est pas utilisé actuellement et
  cette décision ne change rien à son statut.
- L'APK Android continue d'être distribué via GitHub Releases (`pilote-latest`),
  indépendamment de cette décision.

---

## Invariants testables

1. **Health check prod Render** — `GET https://julaba-api.onrender.com/api/v1/health`
   renvoie **HTTP 200**. C'est l'invariant porté par `render.yaml`
   (`healthCheckPath: /api/v1/health`).
2. **Health check DR OVH** — `GET https://julaba.online/api/v1/health` renvoie
   **HTTP 200** **lorsque la chaîne OVH a été activée** (exercice DR ou bascule). En
   conditions nominales, cet endpoint peut être injoignable ou ne pas être maintenu
   à jour — ce n'est **pas** une régression de la prod, dont la source de vérité est
   l'invariant 1.
3. **Auto-déploiement Render** — un push sur `main` déclenche un rebuild de
   `julaba-api` et `julaba-web` (visible dans le tableau de bord Render).
4. **`deploy.yml` non auto** — aucune `push:` dans le déclencheur de
   `.github/workflows/deploy.yml` : un push sur `main` ne déploie **jamais** sur
   OVH sans action humaine.
5. **`azure-pipelines.yml` désactivé** — le fichier porte `trigger: none` (et un
   commentaire pointant vers cet ADR). Aucun build Azure ne se déclenche sur push.
6. **`mirror-azure.yml` est le seul canal Azure actif** — `mirror-azure.yml` pousse
   `main` + tags vers Azure DevOps, et uniquement cela (aucun déploiement).

---

## Modules impactés

**Aucun module applicatif.** Cette décision est purement documentaire et de
gouvernance CI/CD :

- `render.yaml` — **non modifié** (déjà correct).
- `.github/workflows/deploy.yml` — **non modifié** (reste `workflow_dispatch`).
- `.github/workflows/mirror-azure.yml` — **non modifié** (reste miroir `main`+tags).
- `azure-pipelines.yml` — **trigger désactivé** (`trigger: none`) + commentaire
  pointant vers cet ADR. Aucune logique de build n'est touchée.
- `docker-compose.yml`, `docker-compose.prod.yml`, `nginx/julaba.conf` — **non
  modifiés** (DR / référence).

---

## Plan de mise en œuvre

1. **Créer le présent ADR** — fait (ce fichier).
2. **Mettre à jour `ci/README.md`** — remplacer la section « CI ≠ CD — et cible de
   production **NON VÉRIFIÉE** » par une doctrine claire pointant vers cet ADR :
   Render = prod, OVH = DR manuel, Azure = miroir.
3. **Mettre à jour `GUIDE_DEPLOIEMENT.md`** — ajouter en tête un avertissement
   marquant le document comme **secondaire** (DR), avec renvoi vers
   `docs/DEPLOIEMENT_RENDER.md` pour la prod réelle. Le contenu OVH est conservé.
4. **Mettre à jour `azure-pipelines.yml`** — passer le `trigger` à `none`, ajouter
   un commentaire expliquant la désactivation (PAT expiré + décision Render = prod).
5. **Mettre à jour `.ai/PROJECT_CONTEXT.md`** et `.ai/ARCHITECTURE.md` — faire
   référence à l'ADR-0004 dans la section déploiement pour clôturener l'ambiguïté.
6. **Ne pas commiter** — l'orchestrateur prend en charge le commit.

**Hors scope de cette tâche (actions ops distinctes) :**

- Régénération du PAT Azure DevOps (P0 déjà listé dans
  `.ai/PROJECT_CONTEXT.md` §10).
- Exercice DR périodique sur l'OVH (à planifier).
- Audit de l'utilité réelle de `mirror-azure.yml` une fois le PAT régénéré.

---

## Références

- `JULABA_DECISIONS.md` §9 — correction explicite du 13/08/2026 :
  « la production réelle est RENDER, pas le VPS OVH ».
- `ci/README.md` — doctrine CI/CD (mise à jour par ce lot).
- `docs/DEPLOIEMENT_RENDER.md` — runbook Render (prod réelle).
- `GUIDE_DEPLOIEMENT.md` — runbook OVH (marqué secondaire par ce lot).
- `render.yaml` — Blueprint Render (source de vérité de l'infra prod).
- `.github/workflows/deploy.yml` — workflow OVH (DR manuel).
- `.github/workflows/mirror-azure.yml` — miroir Azure.
- `azure-pipelines.yml` — pipeline Azure désactivée par ce lot.
- `docker-compose.yml` — stack OVH (DR).
- `docker-compose.prod.yml` — stack Azure (référence, non active).
- ADR-0001, ADR-0002, ADR-0003 — ADR antérieurs (format suivi).
