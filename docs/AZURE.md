# Cap Azure — du lab à la plateforme ANSUT

Position actée par l'équipe : **le lab GitHub + Render sert au développement** ;
la cible de production est **l'infrastructure Azure de l'équipe** (organisation
Azure DevOps `DevOps-ANSUT`, projet `Julaba`). Ce document est la carte de
migration : chaque brique du lab, son équivalent cible, et ce qui change.

## 1. Le code — miroir automatique (en place)

Le workflow `.github/workflows/mirror-azure.yml` pousse `main` et les tags vers
`https://dev.azure.com/DevOps-ANSUT/Julaba/_git/Julaba` à chaque merge.

**À faire une fois** : poser le secret GitHub `AZURE_DEVOPS_PAT` (PAT Azure
DevOps avec le droit « Code : Read & Write » sur le projet Julaba). Sans lui, le
miroir sort en « succès avec avertissement » sans rien pousser. Côté Azure,
mettre `main` comme branche par défaut du dépôt.

Le développement continue sur le lab (petits lots → CI → recette → merge) ;
Azure reçoit l'état consolidé. La bascule complète (PR et CI côté Azure) se
fait quand l'équipe est prête — le miroir garantit qu'il n'y a rien à rattraper
ce jour-là.

## 2. La carte de migration

| Brique | Lab (aujourd'hui) | Cible Azure | Ce qui change |
|---|---|---|---|
| Code + revues | GitHub (PR, checks obligatoires) | Azure Repos + PR policies | Reprendre les 2 checks bloquants comme *build validation* |
| CI | GitHub Actions : `ci.yml` (build + tests + gate TS), `invariants.yml` (Postgres jetable) | Azure Pipelines | Port direct : mêmes commandes npm ; le Postgres jetable devient un *service container* du pipeline |
| Backend | Render web service (`render.yaml`) | App Service (Linux, Node) ou AKS si l'équipe y est déjà | Mêmes variables d'env ; `TRUST_PROXY` à recalibrer derrière le front Azure (via `/api/v1/health/net`) |
| Frontend | Render static site | Azure Static Web Apps ou Blob Storage + Front Door | `VITE_API_URL` au build, comme aujourd'hui |
| Base de données | Render PostgreSQL (plan free, expire ~90 j) | **Azure Database for PostgreSQL Flexible Server** | Gros gain : sauvegardes automatiques intégrées (rétention 7–35 j, restauration point-in-time) — le risque R3 disparaît nativement ; le workflow de dump GitHub reste utile comme copie *hors* plateforme |
| Secrets | Render `generateValue` + secrets GitHub | **Azure Key Vault** (+ Managed Identity) | `JWT_SECRET`, `PIN_ENCRYPTION_KEY`, `REFRESH_TOKEN_SALT` sortent des dashboards ; le fail-fast au boot reste la garde |
| Sauvegardes | `sauvegarde-db.yml` (GitHub Actions, artefacts chiffrés) | Sauvegardes natives Flexible Server + copie Blob Storage (règle de cycle de vie) | Porter le cron en Azure Pipelines *scheduled* si on veut garder la copie externe |
| Télémétrie | Sentry (activable par `SENTRY_DSN`) | **Application Insights** (ou Sentry conservé) | L'init Sentry est optionnelle et isolée dans `instrument.ts` : brancher App Insights au même endroit, sans toucher au reste |
| Packs de voix (chantier V1) | — (à construire) | **Blob Storage + Azure CDN/Front Door** | Le manifeste est agnostique de l'hébergeur (`base_url` dans le JSON, URL du manifeste en variable d'env) : la migration = changer une URL |
| Supervision | UptimeRobot sur `/api/v1/health` | Azure Monitor (availability test) | Même endpoint |
| Migration des données | — | `pg_dump` du lab → `pg_restore` vers Flexible Server | Exactement le runbook `docs/SAUVEGARDES.md` § 3 ; répétition générale = le test mensuel de restauration |

## 3. Les invariants qui ne changent PAS avec la plateforme

- **Argent gelé** : transactions atomiques, idempotence, ledger — c'est du code
  et des tests, pas de l'infra. Les 65 invariants doivent tourner dans Azure
  Pipelines exactement comme dans Actions **avant** toute bascule de prod.
- **Hors-ligne d'abord** : le téléphone ne sait pas sur quel cloud est le
  serveur, et c'est le but.
- **Toute évolution de schéma par migration TypeORM** — d'autant plus important
  que la bascule se fera par dump/restore.
- **Zéro voix par Internet** : la voix vit dans l'APK, aucun service cloud
  n'entre dans la boucle vocale, Azure compris.

## 4. Ordre conseillé de bascule

1. **Maintenant** : poser `AZURE_DEVOPS_PAT` → le miroir tourne à chaque merge.
2. **Avant le pilote** : rien ne change — le pilote tourne sur le lab (les
   prérequis de `docs/PILOTE.md` s'appliquent au lab).
3. **Pendant/après le pilote** : monter la cible (Flexible Server + App
   Service + Key Vault), porter les 2 pipelines CI, jouer une restauration de
   dump comme répétition générale.
4. **Bascule** : gel court des écritures → dump → restore → repointer
   `VITE_API_URL`/DNS → recette de `docs/PILOTE.md` § 2 rejouée sur la cible.
