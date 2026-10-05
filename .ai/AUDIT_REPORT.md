# AUDIT_REPORT.md — Rapport d'audit global courant

> Synthèse du dernier audit global. Détails complets dans `AUDITS/AUDIT-XXX-YYYY-MM-DD.md`.
> Dernier audit : AUDIT-001 — 2026-09-28

## Score global : **73 / 100** ✅ (≥ 60/100 requis pour PROD)

## Scores par dimension

| Dimension | Score | Tendance |
|---|---|---|
| Cohérence architecturale | 78/100 | Initial |
| Qualité du code | 70/100 | Initial |
| Couverture de tests | 75/100 | Initial |
| Documentation | 82/100 | Initial |
| Sécurité | 72/100 | Initial |
| Accessibilité | 75/100 | Initial |
| Performance | 73/100 | Initial |
| Conformité aux règles (existantes) | 78/100 | Initial |
| Dette technique (inverse) | 65/100 | Initial |
| Santé du système multi-agents | 100/100 | Initial |
| **Score global** | **73/100** | **Initial** |

## Points forts du projet (top 5)

1. **Souveraineté vocale** : STT sherpa-onnx + TTS VITS-Piper embarqués nativement dans l'APK — aucune dépendance cloud pour la boucle vocale, fonctionne hors-ligne dès le 1er jour.
2. **Sécurité financière défense en profondeur** : idempotence systématique, verrous pessimistes, fail-closed partout, sanitization triple couche, refresh token rotation avec détection de réutilisation.
3. **Gouvernance exemplaire** : Constitution formalisée (8 principes + mécanismes CI), ADR standardisés, registre de dette à 20 révisions avec auto-correction, cliquets Jest, 48 tests d'invariants sur vrai PostgreSQL.
4. **Design inclusif remarquable** : voice-first pour analphabètes, mode soleil (plein jour marché), 3 confits visuels, cible tactile ≥ 44 px testée CI, haptique, taille texte ajustable, WebAuthn.
5. **Offline-first pour l'argent réel** : IndexedDB durable + idempotence + lettres mortes 4xx/5xx + atomicité transactionnelle + mutex de refresh session unique.

## Points d'amélioration critiques (top 5)

1. **3 cibles de déploiement concurrentes** (Render / OVH / Azure) — `ci/README.md` documente explicitement l'ambiguïté. À trancher en P1.
2. **14 vulnérabilités npm prod non patchées** (multer DoS × 4, js-yaml, picomatch, qs, tmp, react-router) — `npm audit fix` disponible, overrides existants insuffisants (lockfile à régénérer).
3. **API keys partenaires stockées EN CLAIR en DB** (`table api_keys`, colonne `key`) — incohérence avec le hash des refresh tokens. À hasher en P1.
4. **Migrations TypeORM désactivées en prod** (`DB_MIGRATIONS_RUN=false` workaround incident 18/09/2026) — 3 doctrines schéma parallèles (SCHEMA-01/02/03 P1 OUVERT).
5. **Absence d'artéfacts standard open-governance** : pas de `README.md` racine, pas de `LICENSE`, pas de `CHANGELOG.md` formel, pas de tags semver.

## Dette technique identifiée (synthèse)

Source : `docs/dette/REGISTRE-MAITRE.md` (révision 20, contre-audit n°4 sur `96c7b64`).

- **33 FERMÉ**
- **5 HORS PÉRIMÈTRE JUSTIFIÉ**
- **48 OUVERT** (dont **0 P0**, **3 P1** non bloquants pilote)

### P1 OUVERTS
- `AUTH-RECOVERY-01` — parcours « numéro perdu » non implémenté (non bloquant pilote)
- `SCHEMA-01/02/03` — 3 mécanismes schéma coexistent (gardé par gate CI)
- `ARG-04` / `TYPE-02` / `CLIENT-02` — crédit désactivé `CAISSE_CREDIT_ACTIF = false`

### Top items OUVERTS (P2-P3)
- **ARG-08** P2 — 0 colonne `devise` sur `caisse_transactions`
- **ARG-09** P3 — 480 occurrences « FCFA » en dur / 107 fichiers
- **API-10** P2 — 173 `fetch()` directs hors `services/api/`
- **TYPE-01** P2 — 502 `: any` + 265 `as any` (0 sur donnée d'argent aux frontières)
- **UNI-01/02/03** P2 — vocabulaires d'unités fragmentés (≥ 6 listes)
- **DOC-01 / DOC-02** P2 — contradictions docs
- **SEC-04** P3 — `users.service.ts:334` journalise le terme de recherche

## Non-conformités aux règles (top 5)

1. **Pas de `README.md` à la racine** — point d'entrée universel absent.
2. **Pas de `LICENSE`** — projet `UNLICENSED` selon npm.
3. **14 CVEs prod non patchées** — `npm audit fix` non exécuté.
4. **API keys en clair en DB** — règle de hash non appliquée.
5. **Pas de `POLITIQUE-CONFIDENTIALITE.md`** — loi ivoirienne n°2013-450 non visible.

## Problèmes de cohérence (top 5)

1. **`GUIDE_DEPLOIEMENT.md` périmé** — décrit déploiement OVH alors que la prod réelle est Render.
2. **`database/init.sql` obsolète** — vestige pré-migrations (table `users_julaba`, 7 rôles seulement) — dangereux si exécuté.
3. **`@capacitor/cli` et `react-router`** dans `backend/package.json` — dépendances frontend parasites.
4. **`@nestjs/cli` v10** vs **core v11** — incohérence de version majeure.
5. **Version `1.0.0` hardcodée** dans `health.controller.ts` vs `5.0.0` dans `package.json`.

## Santé du système multi-agents

- **Respect des rôles** : OK (initialisation système)
- **Qualité des handoffs** : OK (initialisation système)
- **Intégrité des agents** : OK (règle anti-mention activée)
- **Amélioration continue** : OK (LESSONS_LEARNED initialisé)

## Plan d'action recommandé (priorisé)

### P0 (immédiat)
1. Créer `README.md` à la racine du dépôt
2. Ajouter fichier `LICENSE` (MIT recommandé)
3. Fusionner `claude/clever-allen-dnr8by` vers `main` (14 commits de retard)
4. Régénérer PAT Azure DevOps (expiré 08/09/2026)
5. Créer `backend/.env.example`

### P1 (avant ouverture à un second pilote)
6. Patcher 14 CVEs npm prod (`npm audit fix`)
7. Hasher API keys partenaires (comme refresh tokens)
8. Créer `docs/POLITIQUE-CONFIDENTIALITE.md` + écran UI « Mes données »
9. Trancher cible de prod (Render vs OVH vs Azure)
10. Corriger `SEC-04` (journalisation terme de recherche)
11. Activer `TRUST_PROXY` en prod après calibration
12. Rendre `BPAY_WEBHOOK_SECRET` obligatoire en prod
13. Brancher `EventsGateway` sur `JwtStrategy` (au lieu de `jwtService.verify` direct)
14. Mettre en place `license-checker` en CI
15. Tagger `v5.0.0` + adopter Keep-a-Changelog

### P2 (fiabilisation)
16. Fusionner contrôleurs dupliqués (`cycles-rest` + `producteur/cycles`, `recoltes-rest` + `producteur/recoltes`)
17. Migrer `CATALOGUE` hardcodé vers `caisse_produits` ou référentiel maître Odoo
18. Supprimer `database/init.sql`
19. Retirer `@capacitor/cli` et `react-router` du `backend/package.json`
20. Aligner `@nestjs/cli` sur v11
21. Activer `strictNullChecks` progressivement
22. Mettre en place Core Web Vitals + metrics Prometheus
23. Découper `AppContext.tsx` (1351 LOC) en 4-5 contexts
24. Mettre en place axe-core en CI
25. Finaliser ADR-0002 étape 4 (bascule migrations)

## Prochain audit

- **Date prévue** : après 5 features terminées OU 2026-10-05 (hebdo)
- **Focus particulier** :
  1. Vérification que les 5 actions P0 ont été exécutées
  2. État d'avancement des 10 actions P1
  3. Santé du système multi-agents (respect des rôles, qualité handoffs)
  4. Mise à jour du registre dette (nouvelles dettes introduites ?)

## Détails complets

Voir `AUDITS/AUDIT-001-2026-09-28.md` pour le rapport complet.

## Audits ciblés (compléments)

- **AUDIT-UI-AUTH — 2026-10-05** (`AUDITS/AUDIT-UI-AUTH-2026-10-05.md`) : interface d'authentification complète (8 écrans, 3 100 lignes). Score **66/100** 🟠. Statique + runtime navigateur + gardes CI. 5 P1 (garde entrée-unique rouge orphelin AUTH-01, PIN dans `history.state` AUTH-02, verrou/annonce inaudibles AUTH-03, « Réécouter mon numéro » muet AUTH-04, modale reconnaissance sans focus trap ni ESC avec refus définitif par clic backdrop AUTH-05), 12 P2. PIN jamais journalisé ✅, PII masquée ✅, fail-closed ✅, zéro erreur console ✅. Actions prioritaires : AUTH-02→03/04→05→01.
