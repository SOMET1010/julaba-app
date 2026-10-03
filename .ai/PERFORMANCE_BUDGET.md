# PERFORMANCE_BUDGET.md — JULABA

> Budgets performance et métriques Core Web Vitals. Lue par Perf Agent et Dev Frontend.

## 1. Budgets actuels

### Bundle frontend
- **Bundle initial max** : **800 KB** (vérifié CI via `scripts/check-bundle-budget.mjs`)
- **Bundle actuel** : ~565 KB (marge disponible)
- **`chunkSizeWarningLimit`** : 600 KB (Vite)
- **Manual chunks** (`vite.config.ts`) :
  - `vendor-react`, `vendor-router`, `vendor-leaflet`, `vendor-lucide`, `vendor-motion`, `vendor-recharts`, `vendor-ui`
- **Sentry (~350 KB)** lazy-loadé en dynamic import (`main.tsx`)
- **Toutes les routes métier** lazy-loadées via helper `L()` (React.lazy + Suspense + `PageLoader`)
- **Cache-Control** : `public, immutable 1y` sur assets via nginx

### Pré-cache Service Worker
- Chunks ≤ 200 KB : pré-cachés (`__PRECACHE_JSON__`)
- 137 clips voix Tata Nanti Lou (~7 Mo) : pré-cachés à l'install (`__PRECACHE_VOICE_JSON__`)
- Tampon build `__SW_BUILD__` (hash git + date) : détection nouvelle version + reload unique

### Backend
- **Pool DB** : 10 connexions, `idleTimeoutMillis: 30000`, `keepAlive` activé
- **Retry DB** : 10 tentatives / 3s délai
- **Body parser** : 10 MB (ATTENTION potentiellement abusif pour DoS mémoire)
- **Timeout HTTP client** : 30 s (AbortSignal)
- **Throttler global** : 300 req/min/IP/endpoint

## 2. Core Web Vitals — cibles

| Métrique | Cible | Mesure actuelle | Statut |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | Non mesuré | À instrumenter |
| **FID** / **INP** (First Input Delay / Interaction) | < 200ms | Non mesuré | À instrumenter |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Non mesuré | À instrumenter |
| **TTFB** (Time To First Byte) | < 800ms | Non mesuré (Render healthcheck immédiat) | À instrumenter |
| **FCP** (First Contentful Paint) | < 1.8s | Non mesuré | À instrumenter |

⚠️ **Aucune métrique Core Web Vitals n'est actuellement mesurée en production.**

## 3. Risques performance identifiés

### Frontend
- **16 providers imbriqués** dans `App.tsx` → re-renders en cascade si mal mémoïsés
- **AppContext 1351 LOC** (god context) — propice aux re-renders globaux
- **878 `console.*`** en production (pas de stripping configuré visible)
- **Pas de bundle analyzer** (pas de `rollup-plugin-visualizer`)
- **`@nestjs/core`** dans `frontend_src/package.json` — dépendance suspecte (5+ MB dans node_modules)

### Backend
- **592 `manager.query()`** SQL brut — potentielles N+1 invisibles
- **Throttler global 300/min/IP/endpoint** — sans `TRUST_PROXY`, plafond partagé Render
- **`Sentry.expressErrorHandler` désactivé** — erreurs 500 non capturées automatiquement
- **Pas de metrics Prometheus** — pas de visibilité perf runtime

### Mobile
- **APK 190+ Mo** (sherpa-onnx 71 Mo + VITS-Piper 79 Mo + app)
- **`minifyEnabled false`** sur release — pas d'obfuscation R8 (taille APK + reverse engineering)

## 4. Plan d'instrumentation (à mettre en place)

### Frontend
1. **Lighthouse CI** dans GitHub Actions (seuil a11y/perf/SEO)
2. **web-vitals** bibliothèque pour mesurer LCP/FID/CLS/FCP/TTFB
3. **Sentry Performance** (`tracesSampleRate: 0.1` au lieu de `0`) — déjà configuré côté front
4. **Bundle analyzer** : `rollup-plugin-visualizer` en devDependency
5. **Strip `console.*`** en production (vite-plugin ou Terser)

### Backend
1. **Prometheus `/metrics`** endpoint (prometheus NestJS bundle)
2. **Sentry Performance** (`tracesSampleRate` > 0 sur backend)
3. **Log structured** (Pino ou Winston) avec métriques temps de réponse
4. **APM** (Datadog / New Relic optionnel)

### Mobile
1. **Maestro** tests perf (déjà écrits, jamais exécutés — à brancher)
2. **Android Vitals** (Play Console quand publié)
3. **APK size analyzer** (`bundletool`)

## 5. Règles de performance obligatoires

### Frontend
- **Toute nouvelle route** : lazy-load via `L()` obligatoire
- **Tout nouveau vendor > 100 KB** : manual chunk explicite dans `vite.config.ts`
- **Pas de `console.*`** en production (utiliser `eventLogger.ts`)
- **Mémoization** : `useMemo` / `useCallback` sur calculs lourds dans contexts
- **Code splitting** : préferer dynamic import pour features secondaires

### Backend
- **Pas de N+1** : utiliser les relations TypeORM `relations:` ou `QueryBuilder` avec `leftJoin`
- **Index DB** : tout champ filtré en `WHERE` doit avoir un index
- **Pagination** : obligatoire sur les endpoints liste (`common/paginate.ts`)
- **Cache** : envisager Redis pour lectures fréquentes (catalogue, referentiel)
- **Verrous pessimistes** : uniquement sur mutations financières

### Mobile
- **Pas de téléchargement de modèle au runtime** (sherpa-onnx embarqué)
- **Pré-cache** via `requestIdleCallback` pour assets non critiques

## 6. Budgets à respecter (seuils CI)

| Métrique | Seuil bloquant | Seuil warning |
|---|---|---|
| Bundle initial | 800 KB | 700 KB |
| Chunk size | 600 KB | 500 KB |
| APK size | 200 Mo | 180 Mo |
| Lighthouse Perf | 80 | 90 |
| Lighthouse a11y | 90 | 95 |
| Backend p95 response | 500ms | 200ms |
| DB query slow | 100ms | 50ms |

## 7. Score perf initial (audit 2026-09-28)

**73/100** — architecture solide (lazy loading, manual chunks, budget bundle CI, pré-cache intelligent), mais manque d'instrumentation runtime (pas de Core Web Vitals mesurés, pas de metrics Prometheus, pas de bundle analyzer, 878 `console.*` en prod).
