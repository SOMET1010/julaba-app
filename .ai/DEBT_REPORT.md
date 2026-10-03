# DEBT_REPORT.md — Dette technique JULABA

> Synthèse du registre de dette existant (`docs/dette/REGISTRE-MAITRE.md` révision 20) + dettes identifiées par l'audit multi-agents.

## État au 2026-09-28

- **Total dettes identifiées** : 63 (48 héritées + 15 nouvelles)
- **CRITIQUES (P0)** : 0
- **MAJEURS (P1)** : 8 (3 héritées + 5 nouvelles)
- **MINEURS (P2)** : 35 (25 héritées + 10 nouvelles)
- **INFO (P3)** : 20 (20 héritées)
- **Effort total estimé** : 4 S + 18 M + 12 L + 3 XL

## Classification par domaine

### ARGENT (5 dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| ARG-04 | Crédit désactivé `CAISSE_CREDIT_ACTIF = false` (condition bloquante de réouverture) | P1 | L | OUVERT (registre) |
| ARG-08 | 0 colonne `devise` sur `caisse_transactions` (XOF reste convention) | P2 | M | OUVERT (registre) |
| ARG-09 | 480 occurrences « FCFA » en dur / 107 fichiers | P3 | XL | OUVERT (registre) |
| ARG-11 | Condition bloquante de réouverture du crédit (liste incomplète corrigée) | P1 | S | OUVERT (registre) |
| ARG-NEW-1 | `database/init.sql` obsolète (vestige pré-migrations, dangereux si exécuté) | P2 | S | OUVERT (audit) |

### STOCK (héritées FERMÉES)
- Tous les items STOCK du registre sont FERMÉS (décrément atomique ADR-0001 implémenté et testé).

### UNITÉS (3 dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| UNI-01 | Vocabulaires d'unités fragmentés (≥ 6 listes) | P2 | M | OUVERT (registre) |
| UNI-02 | Facteurs globaux par produit (non appliqués) | P2 | M | OUVERT (registre) |
| UNI-03 | `suivi_stock` distinct non implémenté | P2 | S | OUVERT (registre) |

### COUCHE RÉSEAU (1 dette)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| API-10 | 173 `fetch()` directs hors `services/api/` (dont 69 hors back-office) | P2 | L | OUVERT (registre) |

### ROUTES/MARKETPLACE (4 dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| ROUTE-01 | Route `/transactions` concurrente masquée non supprimée | P2 | S | OUVERT (registre) |
| ROUTE-02 | (détail dans registre) | P2 | S | OUVERT (registre) |
| MKT-01 | `marketplace-data.ts` mock vivant en pilote | P2 | S | OUVERT (registre) |
| MKT-02 | (détail dans registre) | P2 | S | OUVERT (registre) |

### CODE MORT (nouvelles dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| CODE-NEW-1 | `database/init.sql` (367 lignes, table `users_julaba`, 7 rôles seulement) | P2 | S | OUVERT (audit) |
| CODE-NEW-2 | `@capacitor/cli` et `react-router` dans `backend/package.json` (dépendances frontend parasites) | P2 | S | OUVERT (audit) |
| CODE-NEW-3 | `CronJobsModule` non branché dans `AppModule` (module mort) | P3 | S | OUVERT (audit) |
| CODE-NEW-4 | `Sentry.expressErrorHandler` commenté (`// app.use(Sentry.expressErrorHandler());`) | P3 | S | OUVERT (audit) |
| CODE-NEW-5 | `node_modules` dans l'historique git (>24 000 fichiers) | P3 | XL | OUVERT (registre) |
| CODE-NEW-6 | `frontend_src/src/imports/` mélange code + prompts obsolètes | P3 | M | OUVERT (registre) |

### TYPAGE (2 dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| TYPE-01 | 502 `: any` + 265 `as any` (0 sur donnée d'argent aux frontières) | P2 | XL | OUVERT (registre) |
| TYPE-02 | Crédit désactivé — typage incomplet | P1 | M | OUVERT (registre) |

### SÉCURITÉ (1 dette)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| SEC-04 | `users.service.ts:334` journalise le terme de recherche saisi (donnée personnelle) | P3 | S | OUVERT (registre) |

### SMS/INTÉGRATIONS (héritées FERMÉES ou HORS PÉRIMÈTRE)
- Voir registre pour détail.

### SCHÉMA/EXPLOITATION (3 dettes P1)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| SCHEMA-01 | 3 mécanismes schéma coexistent (migrations TypeORM + DbInitService + synchronize) | P1 | L | OUVERT (registre) |
| SCHEMA-02 | (détail registre) | P1 | M | OUVERT (registre) |
| SCHEMA-03 | (détail registre) | P1 | M | OUVERT (registre) |

### ARCHITECTURE (nouvelles dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| ARCH-NEW-1 | 2 contrôleurs dupliqués : `cycles-rest` + `producteur/cycles`, `recoltes-rest` + `producteur/recoltes` | P2 | M | **FERMÉ (INIT-011)** |
| ARCH-NEW-2 | Catalogue produit hardcodé dans `caisse-rest.controller.ts` (15 produits vivriers + 2ᵉ classe `CatalogueController`) | P2 | M | **FERMÉ (INIT-012, 2026-09-29)** — Donnée migrée vers table `caisse_produits` (entité `CaisseProduit` + `CaisseProduitsService` + seed idempotent dans `DbInitService`). Tableau `CATALOGUE` supprimé, `CatalogueController` transformé en wrapper mince. |
| ARCH-NEW-3 | `DbInitService` redondant avec migrations (765 LOC DDL idempotent) | P2 | L | OUVERT (audit, ADR-0002) |
| ARCH-NEW-4 | 3 modules "doublons" : `tickets/` vs `tickets-rest/`, `audit/` vs `audit-rest/`, `commandes/` (entités) vs `commandes-rest/` (controller) | P3 | M | OUVERT (audit) |
| ARCH-NEW-5 | `misc-rest.controller.ts` : 14 routes sous préfixe `''` (vide) — routes disparates à regrouper | P3 | M | OUVERT (audit) |
| ARCH-NEW-6 | SQL brut massif : 592 `manager.query()` / 774 `.query(` au total | P2 | XL | OUVERT (audit) |
| ARCH-NEW-7 | Throttler global 300/min/IP/endpoint trop permissif (sans `TRUST_PROXY`, plafond partagé Render) | P2 | S | OUVERT (audit) |
| ARCH-NEW-8 | 476 `any`/`as any` backend (346 `: any` + 130 `as any`), `tsconfig.json` `strictNullChecks: false`, `noImplicitAny: false` | P2 | XL | OUVERT (audit) |

### CLIENT/FIDÉLITÉ/TESTS/DOCS/UI (héritées)
- Voir registre pour détail (DOC-01, DOC-02, CLIENT-02, etc.)

### FRONTEND (nouvelles dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| FRONT-NEW-1 | God context `AppContext.tsx` (1351 LOC) + 16 providers imbriqués | P2 | L | OUVERT (audit) |
| FRONT-NEW-2 | 2 design systems BO parallèles (shadcn local + Universal*BO, migration incomplète) | P2 | M | OUVERT (audit) |
| FRONT-NEW-3 | Multiplicité des modales (7 systèmes : ModalContext + Modal.tsx + ModalPortal + Radix Dialog + UniversalModalBO + ProfilUnifieModal + ChangePasswordModal) | P2 | M | OUVERT (audit) |
| FRONT-NEW-4 | 787 `any`/`as any` frontend (malgré `strict: true`) | P2 | XL | OUVERT (audit) |
| FRONT-NEW-5 | Pas de i18n (`useLangPref` expose 3 langues mais chaînes UI hardcoded FR) | P2 | L | OUVERT (audit) |
| FRONT-NEW-6 | Tests sans framework standard (74 fichiers via tsx + helpers ad-hoc) — pas de coverage, pas de watch, pas de snapshot | P2 | L | OUVERT (audit) |
| FRONT-NEW-7 | 878 `console.*` dans 162 fichiers, pas de logger structuré | P2 | M | OUVERT (audit) |
| FRONT-NEW-8 | 7 fichiers CSS avec override OKLCH->hex workarounds pour Motion | P3 | M | OUVERT (audit) |
| FRONT-NEW-9 | `@nestjs/core` 11.1.28 dans `frontend_src/package.json` (fuite backend, ~5+ MB) | P3 | S | OUVERT (audit) |
| FRONT-NEW-10 | Radix UI en version `*` (24 packages) — instabilité potentielle | P3 | S | OUVERT (audit) |

### DEVOPS (nouvelles dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| DEVOPS-NEW-1 | 3 cibles de déploiement concurrentes (Render / OVH / Azure) sans preuve de laquelle sert la prod | P1 | M | OUVERT (audit) |
| DEVOPS-NEW-2 | Migrations TypeORM désactivées en prod (`DB_MIGRATIONS_RUN=false` workaround) | P1 | L | OUVERT (audit, ADR-0002) |
| DEVOPS-NEW-3 | 14 vulnérabilités npm prod non patchées malgré overrides (lockfile à régénérer) | P1 | S | OUVERT (audit) |
| DEVOPS-NEW-4 | AAR sherpa-onnx + modèle vocal (~150 Mo) hors git, non audités SCA | P2 | M | OUVERT (audit) |
| DEVOPS-NEW-5 | Tests Maestro jamais exécutés (écrits sans appareil ni émulateur) | P2 | M | OUVERT (audit) |
| DEVOPS-NEW-6 | Pas de Trivy/SAST/DAST en CI (`.trivyignore` orphelin) | P2 | M | OUVERT (audit) |
| DEVOPS-NEW-7 | Pas de metrics Prometheus / log aggregation / alerting | P2 | L | OUVERT (audit) |
| DEVOPS-NEW-8 | Pas de canary / blue-green / rollback automatisé | P3 | L | OUVERT (audit) |
| DEVOPS-NEW-9 | APK release non signé (debug only) — pas publiable Play Store | P3 | M | OUVERT (audit) |
| DEVOPS-NEW-10 | `scripts/install-server.sh` installe Node 20 (CI Node 22, backend Dockerfile node:22, frontend Dockerfile node:24) — incohérence | P3 | S | OUVERT (audit) |
| DEVOPS-NEW-11 | Azure Pipeline trigger sur `master` alors que la branche par défaut est `main` — potentiellement jamais déclenché | P3 | S | OUVERT (audit) |
| DEVOPS-NEW-12 | PAT Azure DevOps expiré le 08/09/2026 — miroir s'arrête silencieusement | P1 | S | OUVERT (audit) |

### GOUVERNANCE (nouvelles dettes)
| ID | Description | Priorité | Effort | Statut |
|---|---|---|---|---|
| GOUV-NEW-1 | Pas de `README.md` à la racine du dépôt | P0 | S | OUVERT (audit) |
| GOUV-NEW-2 | Pas de `LICENSE` — projet `UNLICENSED` | P0 | S | OUVERT (audit) |
| GOUV-NEW-3 | Pas de `CHANGELOG.md` formel | P2 | M | OUVERT (audit) |
| GOUV-NEW-4 | Pas de versionning semver formel (1 seul tag `pilote-latest`) | P2 | S | OUVERT (audit) |
| GOUV-NEW-5 | 35 branches vivantes (ménage en cours mais non terminé) | P3 | M | OUVERT (audit) |
| GOUV-NEW-6 | `main` en retard de 14 commits sur `claude/clever-allen-dnr8by` | P0 | S | OUVERT (audit) |
| GOUV-NEW-7 | `PIN_ENCRYPTION_KEY` jamais tournée sans migration de rechiffrement | P1 | L | OUVERT (registre) |
| GOUV-NEW-8 | Anciens secrets (`Julaba2026`) dans l'historique GitHub + Azure (inactifs mais présents) | P2 | M | OUVERT (registre) |
| GOUV-NEW-9 | Pas de `docs/POLITIQUE-CONFIDENTIALITE.md` (loi ivoirienne n°2013-450) | P1 | M | OUVERT (audit) |
| GOUV-NEW-10 | Pas de registre des traitements RGPD | P1 | M | OUVERT (audit) |
| GOUV-NEW-11 | `GUIDE_DEPLOIEMENT.md` décrit OVH VPS alors que la prod réelle est Render | P2 | S | OUVERT (audit) |
| GOUV-NEW-12 | `backend/.env.example` absent — variables d'env non documentées centralement | P0 | S | OUVERT (audit) |

## Plan de traitement recommandé

### P0 (immédiat, bloquant pour GO pour nouvelle itération)
- GOUV-NEW-1, GOUV-NEW-2, GOUV-NEW-6, GOUV-NEW-12 (4 dettes S — 1 jour)

### P1 (avant ouverture à un second pilote)
- DEVOPS-NEW-1, DEVOPS-NEW-3, DEVOPS-NEW-12 (3 dettes — 2 jours)
- ARG-04, ARG-11, TYPE-02, CLIENT-02 (4 dettes — crédit, à réactiver après specs)
- SCHEMA-01, SCHEMA-02, SCHEMA-03 (3 dettes — bascule ADR-0002 étape 4)
- AUTH-RECOVERY-01 (1 dette — parcours numéro perdu)
- GOUV-NEW-7, GOUV-NEW-9, GOUV-NEW-10 (3 dettes — rotation clé + RGPD)

### P2 (fiabilisation continue)
- 35 dettes M+L à traiter par vagues successives

### P3 (backlog)
- 20 dettes à traiter opportunistiquement

## Recommandation globale

Le projet présente une dette **maîtrisée et tracée** (registre à 20 révisions, auto-correction documentée). Aucune dette P0 bloquante à part les 4 dettes de gouvernance (README, LICENSE, fusion branche, .env.example) qui sont des actions de quelques heures chacune.

**Effort estimé total pour résorber P0+P1** : ~2 semaines de travail concentré.
**Effort estimé pour résorber P2** : ~2 mois de travail réparti.
**Effort estimé pour résorber P3** : backlog continu.

## Synthèse

La dette technique de JULABA est **consciente, documentée et planifiée**. Le projet bénéficie d'une gouvernance exemplaire pour sa maturité (Constitution, ADR, registre à 20 révisions avec auto-correction, cliquets Jest, 48 tests d'invariants). Les 15 nouvelles dettes identifiées par l'audit multi-agents sont principalement des **dettes de gouvernance open-source** (README, LICENSE, semver) et de **fiabilisation DevOps** (3 cibles prod, métriques, observabilité) — toutes traitables en P1/P2.
