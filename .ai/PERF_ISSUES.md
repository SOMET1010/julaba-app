# PERF_ISSUES.md — Problèmes de performance JULABA

> Registre des problèmes de performance. Format : PERF-XXX.

## État au 2026-10-06

- **Total problèmes** : 7
- **CRITIQUES (P0)** : 0
- **MAJEURS (P1)** : 3
- **MINEURS (P2)** : 4
- **Résolus** : 0

## Problèmes identifiés (audit initial 2026-09-28)

### PERF-001 — Pas de Core Web Vitals mesurés en production (P1)
- **Statut** : OUVERT
- **Description** : Aucune métrique LCP/FID/INP/CLS/TTFB/FCP n'est mesurée en production.
- **Impact** : Régressions perf non détectées, pas de visibilité sur l'UX réelle.
- **Recommandation** : Mettre en place `web-vitals` bibliothèque + remonter dans Sentry Performance (déjà configuré côté front, `tracesSampleRate: 0.1`).

### PERF-002 — Pas de metrics Prometheus backend (P1)
- **Statut** : OUVERT
- **Description** : Pas d'endpoint `/metrics`, pas de Grafana, pas de log structured (pas de Pino/Winston).
- **Impact** : Pas de visibilité sur le temps de réponse backend, N+1 invisibles, pas d'alerting.
- **Recommandation** : Mettre en place `prometheus NestJS bundle` + log structured (Pino).

### PERF-003 — 878 `console.*` en production sans stripping (P1)
- **Statut** : OUVERT
- **Description** : 878 `console.*` dans 162 fichiers, pas de stripping configuré visible.
- **Impact** : Performance dégradée (I/O), bruit en prod.
- **Recommandation** : `vite-plugin` ou Terser pour strip en production, utiliser `eventLogger.ts` (existant).

### PERF-004 — 16 providers imbriqués + AppContext 1351 LOC (P2)
- **Statut** : OUVERT
- **Description** : God context `AppContext.tsx` (1351 LOC) + 16 providers imbriqués dans `App.tsx`.
- **Impact** : Re-renders en cascade si mal mémoïsés, coût DX (debug difficile), coût test (mock massif).
- **Recommandation** : Découper `AppContext` en 4-5 contexts ciblés.

### PERF-005 — Pas de bundle analyzer (P2)
- **Statut** : OUVERT
- **Description** : Pas de `rollup-plugin-visualizer` ni `webpack-bundle-analyzer`.
- **Impact** : Visibilité limitée sur la composition du bundle.
- **Recommandation** : Ajouter `rollup-plugin-visualizer` en devDependency.

### PERF-006 — `@nestjs/core` dans `frontend/package.json` (P2)
- **Statut** : OUVERT
- **Description** : `@nestjs/core` 11.1.28 en `dependencies` frontend — dépendance suspecte (fuite backend ? ~5+ MB).
- **Impact** : Bundle frontend alourdi inutilement.
- **Recommandation** : Retirer `@nestjs/core` du `frontend/package.json`.

### PERF-007 — Polling producteur actif hors ligne (P2)
- **Statut** : OUVERT
- **Description** : `ProducteurProduction` appelle `refreshAllData()` toutes les 30 secondes sans vérifier `isOnline` ni suspendre la boucle pendant une coupure réseau.
- **Impact** : requêtes et logs répétés pendant une coupure, feedback réseau peu lisible et charge inutile au retour de connexion.
- **Fichiers concernés** : `frontend/src/app/components/producteur/ProducteurProduction.tsx:74-84`.
- **Recommandation** : suspendre le polling hors ligne et déclencher un rafraîchissement unique sur l'événement `online`.

## Points forts perf (audit initial)

- ✅ **Lazy loading systématique** des routes via helper `L()`
- ✅ **Manual chunks** dans `vite.config.ts` (vendor-react, vendor-router, vendor-leaflet, vendor-lucide, vendor-motion, vendor-recharts, vendor-ui)
- ✅ **Sentry (~350 KB)** lazy-loadé en dynamic import
- ✅ **Modèle vocal hors-ligne** ré-échauffé via `requestIdleCallback`
- ✅ **Clips Tata** préchargés via `requestIdleCallback` (différé 2,5 s)
- ✅ **Budget bundle CI** : 800 KB max initial, `chunkSizeWarningLimit: 600`
- ✅ **Bundle actuel** : 565/800 KB (marge disponible)
- ✅ **Cache-Control: public, immutable 1y** sur assets via nginx
- ✅ **SW pré-cache intelligent** (chunks ≤ 200 KB + 137 clips voix)
- ✅ **Mutex de refresh session unique** (évite révocation serveur)
- ✅ **Pool DB** : 10 connexions, `keepAlive` + `idleTimeoutMillis: 30000`
- ✅ **Retry DB** : 10×/3s
- ✅ **Bind port AVANT db-init/seed** (healthcheck Render passe immédiatement)

## Score perf : 73/100

Architecture solide (lazy loading, manual chunks, budget bundle CI, pré-cache intelligent), mais manque d'instrumentation runtime (pas de Core Web Vitals mesurés, pas de metrics Prometheus, pas de bundle analyzer, 878 `console.*` en prod).
