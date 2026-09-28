# Jùlaba — Système d'exploitation du commerce informel

> **Une commerçante doit pouvoir faire confiance à Jùlaba pour gérer TOUT son
> argent — avant que Jùlaba apprenne à faire une chose de plus.**
> — [CONSTITUTION.md](CONSTITUTION.md)

Pilote agri-fintech en Côte d'Ivoire (ICONE Solutions). Application voice-first
pour marchandes non-lectrices : l'assistante vocale **« Tata Nanti Lou »** guide
les ventes, le crédit, la fermeture de caisse et la gestion de stock, en français
et en langues locales, avec STT/TTS **offline** embarqués dans l'APK.

[![CI — filet d'intégration](https://github.com/ICONE-Solutions/julaba-app/actions/workflows/ci.yml/badge.svg)](https://github.com/ICONE-Solutions/julaba-app/actions/workflows/ci.yml)
[![Invariants financiers](https://github.com/ICONE-Solutions/julaba-app/actions/workflows/invariants.yml/badge.svg)](https://github.com/ICONE-Solutions/julaba-app/actions/workflows/invariants.yml)
[![SCHEMA-PILOTE](https://github.com/ICONE-Solutions/julaba-app/actions/workflows/schema-pilote.yml/badge.svg)](https://github.com/ICONE-Solutions/julaba-app/actions/workflows/schema-pilote.yml)
[![Version](https://img.shields.io/badge/version-5.0.0-blue)](./package.json)
[![Licence](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 1. Vision produit

Jùlaba est la caisse en téléphone de la marchande qui ne sait ni lire ni écrire.
On lui parle — elle encaisse, tient le crédit, suit le stock, ferme la caisse,
et tout reste **juste**, même hors-ligne, même avec un téléphone d'entrée de
gamme. L'argent est tenu comme un **journal append-only** dont toutes les vues
(caisse, marge, bénéfice, fermeture) sont **dérivées** — jamais recalculées en
parallèle. La confiance n'est pas un ressenti : un chiffre contradictoire ou un
écart de caisse est un **incident** détecté par invariant (voir
[docs/invariants/TABLEAU_DE_BORD.md](docs/invariants/TABLEAU_DE_BORD.md)).

## 2. Stack technique

| Couche         | Technologies                                                                 |
|----------------|------------------------------------------------------------------------------|
| **Backend**    | NestJS 11, TypeORM 0.3, Passport-JWT, Socket.IO, Swagger, Throttler          |
| **Frontend**   | React 18, Vite 6, TypeScript 5.9, Tailwind 4, Radix UI, React Router 7       |
| **Mobile**     | Capacitor 8 (Android), plugins natifs Sherpa STT/TTS, JDK 21, Gradle 8       |
| **Base**       | PostgreSQL 16                                                                |
| **Voix**       | STT `sherpa-onnx` (offline) · TTS `vits-piper` (offline, CC-BY 4.0) · 137 clips enregistrés |
| **CI/CD**      | GitHub Actions (9 workflows) · Render Blueprint · miroir Azure DevOps        |
| **Observabilité** | Sentry (`@sentry/node` + `@sentry/react`), endpoint `/api/v1/health`, sauvegardes chiffrées |

## 3. Démarrage rapide

Monorepo **npm workspaces** : un seul `package-lock.json` à la racine, deux
workspaces (`frontend_src`, `backend`). Node 22 LTS recommandé.

```bash
# 1. Cloner
git clone https://github.com/ICONE-Solutions/julaba-app.git
cd julaba-app

# 2. Installer (toutes les dépendances, racine + workspaces)
npm install

# 3. Configurer l'environnement backend
#    Voir GUIDE_DEPLOIEMENT.md / docs/DEPLOIEMENT_RENDER.md pour les variables
#    (DB_*, JWT_SECRET, JWT_REFRESH_SECRET, PIN_ENCRYPTION_KEY, CORS_ORIGIN…)
cp backend/.env.example backend/.env 2>/dev/null || nano backend/.env

# 4. Lancer frontend + backend en parallèle
npm run dev

# 5. Construire pour production
npm run build
```

Le frontend Vite sert sur `http://localhost:5173`, le backend Nest sur
`http://localhost:3000`. La configuration API du frontend se règle via
`VITE_API_URL`.

## 4. Structure du dépôt

```text
julaba-app/
├── CONSTITUTION.md          # La loi du dépôt : 8 principes, modules sacrés, DoD
├── JULABA_DECISIONS.md      # Source de vérité produit (à lire en début de session)
├── GUIDE_DEPLOIEMENT.md     # Déploiement OVH VPS (chaîne secondaire)
├── package.json             # Workspaces racine (frontend_src + backend)
├── render.yaml              # Blueprint Render = chaîne de production réelle
├── docker-compose.yml       # Stack locale (backend + postgres)
├── capacitor.config.ts      # Pont React → Android
├── .github/workflows/       # 9 workflows CI/CD
├── backend/                 # NestJS : src/ + migrations TypeORM + tests (unit, invariants)
├── frontend_src/            # React + Vite : src/app/{pages,services,contexts,hooks,voice-offline}
├── android/                 # Projet Capacitor Android + scripts/installer-voix.sh
├── database/                # (historique — schéma géré par migrations TypeORM + DbInitService)
├── docs/                    # Documentation vivante (ADR, dette, invariants, parcours…)
├── .ai/                     # Cockpit multi-agents (audit, dette, conformité, handoffs)
├── coordination/            # Bus IA↔humain (instructions, statut, preuves)
├── ci/                      # Garde-fous CI (baseline TypeScript)
├── infra/odoo-poc/          # POC gateway Odoo (référentiel maître)
├── maestro/                 # Plans de tests mobiles Maestro
├── nginx/                   # Configs Nginx pour la chaîne OVH
└── tests/                   # Tests Playwright d'intégration
```

## 5. Documentation

Le dépôt porte une gouvernance dense. À lire dans cet ordre pour un nouvel
intervenant :

| Document | Rôle |
|---|---|
| [CONSTITUTION.md](CONSTITUTION.md) | La loi : 8 principes, modules sacrés, interdiction de duplication, Definition of Done |
| [JULABA_DECISIONS.md](JULABA_DECISIONS.md) | Source de vérité produit, à lire en début de chaque session |
| [GUIDE_DEPLOIEMENT.md](GUIDE_DEPLOIEMENT.md) | Runbook déploiement OVH VPS (chaîne secondaire) |
| [docs/DEPLOIEMENT_RENDER.md](docs/DEPLOIEMENT_RENDER.md) | Runbook déploiement Render (chaîne de prod réelle) |
| [docs/adr/](docs/adr/) | **5 ADR** : source unique de l'argent, décrément stock, convergence schéma, unités/devise, P0 activation |
| [docs/dette/REGISTRE-MAITRE.md](docs/dette/REGISTRE-MAITRE.md) | Registre maître de dette technique (révision 20, photo fidèle) |
| [docs/invariants/TABLEAU_DE_BORD.md](docs/invariants/TABLEAU_DE_BORD.md) | Invariants financiers I1–I7 (🟢/🟡/🔴), cliquet Jest |
| [docs/PARCOURS.md](docs/PARCOURS.md) & [docs/parcours/](docs/parcours/) | Parcours verticaux sur noyau sacré |
| [docs/PILOTE.md](docs/PILOTE.md) | Protocole du pilote terrain (3–5 marchandes) |
| [docs/REGLE-VOICE-FIRST.md](docs/REGLE-VOICE-FIRST.md) | Pourquoi tout est voice-first |
| [docs/POUR_LE_DEV.md](docs/POUR_LE_DEV.md) & [docs/PIEGES_DEV.md](docs/PIEGES_DEV.md) | Pièges connus (Nest v10/v11, trust proxy, VITE_API_URL…) |
| [.ai/](.ai/) | Cockpit multi-agents autonome (audit global 73/100, dette, conformité, handoffs, ADR-001) |
| [coordination/](coordination/) | Bus IA↔humain (un fichier = un écrivain) |
| [ci/README.md](ci/README.md) | Doctrine CI/CD et cibles de production |

## 6. Scripts principaux

### Racine (`package.json`)

| Script | Action |
|---|---|
| `npm run dev` | Lance frontend + backend en parallèle (`concurrently`) |
| `npm run build` | Build frontend + backend |
| `npm run typecheck` | TypeScript check frontend |
| `npm run check:nest-versions` | Cohérence versions Nest (anti-500 `instanceof`) |

### Backend (`backend/package.json`)

| Script | Action |
|---|---|
| `npm run start:dev` | Nest en mode watch |
| `npm run start:prod` | Exécution depuis `dist/` |
| `npm run build` | `nest build` |
| `npm run test:unit` | Jest (config `jest-unit.config.cjs`) |
| `npm run test:invariants` | Jest invariants (Postgres jetable, `--runInBand`) |
| `npm run migration:show` | État des migrations TypeORM |
| `npm run migration:run` | Applique les migrations en attente |
| `npm run migration:revert` | Annule la dernière migration |

### Frontend (`frontend_src/package.json`)

| Script | Action |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Vite build (sortie `../frontend/dist`) |
| `npm run typecheck` | `tsc -b` |
| `npm run verify` | Harnais complet : typecheck + ~50 tests métier (voix, caisse, FCFA, marge…) |
| `npm run test:ci` | Sous-ensemble déterministe joué en CI |

Les tests frontend sont joués via `tsx` sur des fichiers `.test.mts` (pas de
runner Jest). Chaque test métier est un script dédié : `test:voix`,
`test:cart`, `test:fcfa`, `test:machine-encaissement`, etc.

## 7. CI/CD — 9 workflows GitHub Actions

| Workflow | Déclencheur | Rôle |
|---|---|---|
| [ci.yml](.github/workflows/ci.yml) | `push`/`pull_request` sur `main` | Filet d'intégration : install, build, tests unit + frontend, cohérence Nest, gate TS (baseline cliquet) |
| [invariants.yml](.github/workflows/invariants.yml) | `push`/`pull_request` sur `main` | Invariants financiers I1–I7 contre Postgres 16 jetable |
| [schema-pilote.yml](.github/workflows/schema-pilote.yml) | `push`/`pull_request` sur `main` | Verrou de schéma figé : reconstruction base vierge + garde-fou tables/colonnes + invariants complets |
| [deploy.yml](.github/workflows/deploy.yml) | `workflow_dispatch` (manuel) | Déploiement SSH/Docker vers julaba.online — jamais automatique |
| [apk.yml](.github/workflows/apk.yml) | `workflow_dispatch` (manuel) | Construit l'APK debug de la branche choisie + publie en GitHub Releases |
| [mirror-azure.yml](.github/workflows/mirror-azure.yml) | `push` sur `main` + manuel | Miroir `main` + tags vers Azure DevOps (DevOps-ANSUT/Julaba) |
| [sauvegarde-db.yml](.github/workflows/sauvegarde-db.yml) | `cron 30 1 * * *` + manuel | Dump quotidien chiffré de la base Render (rétention 7/35 jours) |
| [reinitialiser-db.yml](.github/workflows/reinitialiser-db.yml) | `workflow_dispatch` | Efface et reconstruit la base — sauvegarde obligatoire d'abord |
| [spike-tts.yml](.github/workflows/spike-tts.yml) | `workflow_dispatch` | Spike : écouter un modèle TTS sherpa-onnx avant embarquement |

> **Aucun auto-déploiement** n'est branché sur `main` : la cible de production
> est volontairement non tranchée par la CI (voir [ci/README.md](ci/README.md)).

## 8. Déploiement

Le dépôt héberge **deux chaînes concurrentes**. La prod réelle est sur Render :

- **Render (prod réelle)** — [`render.yaml`](render.yaml) monte trois briques :
  `julaba-db` (PostgreSQL `basic_256mb`), `julaba-api` (NestJS, `starter`),
  `julaba-web` (statique). Auto-déploiement sur `main`. Voir
  [docs/DEPLOIEMENT_RENDER.md](docs/DEPLOIEMENT_RENDER.md).
- **OVH `julaba.online` (chaîne secondaire)** — VPS Ubuntu + Nginx + Docker
  Compose, déployé par [deploy.yml](.github/workflows/deploy.yml) sur action
  manuelle uniquement. Voir [GUIDE_DEPLOIEMENT.md](GUIDE_DEPLOIEMENT.md).
- **APK Android** — construit par [apk.yml](.github/workflows/apk.yml),
  distribué via **GitHub Releases** (tag `pilote-latest`, pré-release). APK de
  debug signé par la clé de debug, installable en « sources inconnues ».

La sauvegarde quotidienne de la base Render est chiffrée et stockée hors Render
(artefacts privés GitHub) — voir [docs/SAUVEGARDES.md](docs/SAUVEGARDES.md).

## 9. Conventions de contribution

### Commits conventionnels (français)

Préfixes : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`,
`perf:`, `style:`. Exemple : `feat(caisse): fermeture avec écart explicite`.

### Branches

- `main` = production (audité, seule branche construite en APK par défaut)
- `dev` = intégration
- `review/*`, `claude/*`, `manus/*`, `design/*` = branches de travail et d'audit

### Règles non négociables

1. **Jamais de `git add .`** — stage explicite des fichiers modifiés.
2. **ADR obligatoire** pour toute décision d'architecture ou modification d'un
   module sacré (voir [docs/adr/](docs/adr/)).
3. **Modules sacrés** (`CONSTITUTION.md` §2) : Authentification · Caisse ·
   Crédit · Fermeture · Synchronisation · Argent. **Ils ne changent jamais sans
   tests complets ET invariantes vertes.**
4. **Interdiction de duplication** : suffixes `V2`, `New`, `Bis`, `Old`,
   `Copy`, `2` font échouer la CI.
5. **Definition of Done** (`CONSTITUTION.md` §6) : une seule implémentation,
   code mort supprimé, prouvé sur données réelles, migrations idempotentes,
   invariantes vertes, typecheck sans régression, parcours de bout en bout.
6. **Pas de code mort** « au cas où » : on supprime, on n'archive pas.
7. Un désaccord avec la Constitution se règle par **ADR**, jamais par exception
   silencieuse.

### Bus IA↔humain

[coordination/](coordination/) est le fil entre Patrick et les instances IA.
**Un fichier = un seul écrivain.** JULABA historique est le chef d'orchestre et
le seul qui écrit dans le code ; les autres instances rendent leur verdict dans
la conversation ou dans `PREUVE-RESULTAT.md`. Voir
[coordination/README.md](coordination/README.md).

## 10. Sécurité

L'argent de femmes qui ne savent pas lire exige une sécurité par défaut
fermée :

- **Authentification** : JWT courte durée (15 min) + **rotation de refresh
  tokens** (7 j, store en base, révocable) + **WebAuthn** (`@simplewebauthn`)
  pour les appareils capables + **PIN AES-256-GCM** pour les identificateurs
  (`PIN_ENCRYPTION_KEY`, jamais journalisé — testé par
  `pin-jamais-journalise.spec.ts`).
- **Autorisation** : allow-list de rôles **fail-closed** (RolesGuard + décorateur
  `@Roles`). Aucun rôle ⇒ aucun accès. Testée par `m6-m8-role-escalation.spec.ts`.
- **Verrou PIN** : lockout après tentatives (migration `VerrouPinIdentificateur`).
- **Throttling** : quotas par IP correctement calibrés derrière le trust proxy
  Render (sans quoi le login devient un verrou collectif — voir
  [docs/AUDIT_THROTTLING.md](docs/AUDIT_THROTTLING.md)).
- **Audit logs** : module `audit-rest` trace les actions sensibles (back-office,
  wallets, mutations).
- **Sauvegardes** : dump quotidien chiffré (passphrase hors Render), rétention
  7 jours / 35 jours pour le dump du dimanche.
- **Isolation institutions** : guard `InstitutionScope` + invariant
  `institution-isolation.spec.ts`.
- **Sanitisation** : fuite de champs sensibles testée par
  `fuite-champs-sensibles-membres.spec.ts`.

## 11. Licence

Distribué sous licence **MIT** — voir [./LICENSE](./LICENSE).

Copyright © 2026 ICONE Solutions.

## 12. Crédits

**ICONE Solutions** — Côte d'Ivoire.

- **Alex Degny** — CEO & lead dev
- **Marco Mancini** — co-développeur
- **Marc Kouassi** — chef de projet
- **Patrick Somet** — auditeur externe (décisions de recette et de sécurité)

**Partenaire** : ANSUT (Agence Nationale des Services Numériques Universels et
du Télécentres) — voir [docs/AZURE.md](docs/AZURE.md) pour le miroir Azure
DevOps de l'équipe ANSUT.

---

*Cette Constitution est vivante. On la modifie par ADR, jamais par exception
silencieuse.* — [CONSTITUTION.md](CONSTITUTION.md)
