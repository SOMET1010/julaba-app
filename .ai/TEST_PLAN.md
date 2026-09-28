# TEST_PLAN.md — JULABA

> Plan de test E2E. Lue par QA Agent.

## 1. Stratégie de test actuelle

### Backend (78 specs)
- **27 tests unitaires** (`jest-unit.config.cjs`, sans DB) — `backend/test/unit/*.spec.ts`
- **48 tests d'invariants** (`jest-invariants.config.cjs`, Postgres 16 jetable) — `backend/test/invariants/*.spec.ts`
- **3 tests controller** — `src/**/*.spec.ts`
- **1 test E2E Playwright** — `tests/specs/api.spec.ts` (smoke test prod réelle)

### Frontend (74 tests)
- **74 fichiers `.test.{ts,tsx,mts}`** via `tsx` (Node direct, **pas de Jest/Vitest**)
- Helpers ad-hoc `ok(cond, label)` / `eq(a, b, label)`
- **5 tests d'intégration React** avec `@testing-library/react` + `jsdom`
- **7 scripts E2E Playwright** `.mjs` dans `e2e/`
- **8 scripts de garde-fou source** dans `scripts/`

### Mobile (Maestro)
- **5 flux Maestro** dans `maestro/` — ⚠️ **jamais exécutés** (écrits sans appareil ni émulateur)

### CI
- **`ci.yml`** : filet intégration (build + tests unit + gate TS cliquet)
- **`invariants.yml`** : tests d'invariants métier (Postgres 16 jetable en service container)
- **`schema-pilote.yml`** : verrou schéma figé

## 2. Couverture par domaine

### Caisse & argent (critique)
- `argent-3-dettes-fermees.spec.ts`, `argent-4-encaissement-unique.spec.ts`, `argent-4b-cloture-encaissements.spec.ts`
- `argent-alerte-rupture-marchande.spec.ts`, `argent-gele-b2.spec.ts`, `argent-marge-panier-mixte.spec.ts`
- `argent-depense-jour-comptable.spec.ts`, `argent-agregats-administrateur.spec.ts`
- `arg-02-unite-historique.spec.ts`
- `i1-i3-atomicite-stock.spec.ts`, `i2-idempotence-vente.spec.ts`
- `caisse-fond-declare.spec.ts` (unit + invariant)
- E2E : `recette-caisse-especes.mjs`, `recette-fidelite.mjs`, `recette-keiwa-paiement-commande.mjs`

### Offline (critique)
- `recette-pilote2-offline.mjs` (7+1 invariants : vente en ligne, coupure au paiement, rejeu unique, double rejeu, réponse perdue, terminal partagé, cohérence finale DB)
- Frontend : `useVoiceCore.offline.integration.test.tsx`, `useOfflineVoiceQueue.test.tsx`, `useVoiceCore.offline.multiuser.test.tsx`

### Auth & sécurité
- `p0-activation.spec.ts`, `p0-activation-backoffice.spec.ts`, `p0-activation-sms-honnete.spec.ts`
- `m6-m8-role-escalation.spec.ts`, `sec-2-pin-identificateur.spec.ts`
- `verrou-pin.spec.ts`, `pin-jamais-journalise.spec.ts`, `pin-jamais-rendu.spec.ts`, `seed-bo-password.spec.ts`
- `institution-isolation.spec.ts`, `fuite-champs-sensibles-membres.spec.ts`
- `financial-score-self-access.spec.ts`, `suppression-compte-anonymisation.spec.ts`

### Stock
- `stock-reservation.spec.ts`, `negociation-reservation-stock.spec.ts`, `stock-commun-cooperative.spec.ts`, `annulation-remise-stock.spec.ts`

### Coopératives & tontines
- `tontine-cycle-complet.spec.ts`, `cooperatives-liste-colonnes.spec.ts`, `score-membres-cooperative.spec.ts`

### Voice
- `voice-metrics.spec.ts`, `voice-config.service.spec.ts`, `tts-fallback-sans-cle.spec.ts`
- Frontend : `useVoiceCore.confirmationBypass.test.tsx`, `useAudioUnlockFallback.test.tsx`

### Odoo gateway
- `odoo-gateway.spec.ts`, `odoo-gateway.contract.spec.ts`, `odoo-real.client.spec.ts`, `odoo-poc-enabled.guard.spec.ts`
- `produit-mapper.spec.ts`, `referentiel-mapper.spec.ts`, `mouvement-mapper.spec.ts`
- `catalogue-maitre.service.spec.ts`

### Configuration & infrastructure
- `trust-proxy.config.spec.ts`, `throttler.config.spec.ts`, `schema-flags.spec.ts`, `migrations-prod.spec.ts`
- `readiness-garde-fous.spec.ts`, `blockers.spec.ts`
- `bo-cron-toggle-reel.spec.ts`, `bo-communication-send-bulk.spec.ts`

## 3. Plan de test E2E (à compléter)

### Scénarios critiques à couvrir (P0)
1. ✅ Vente espèces complète (recette-caisse-especes.mjs)
2. ✅ Vente à crédit (cycle complet) — ATTENTION crédit désactivé actuellement
3. ✅ Paiement commande Keiwa (recette-keiwa-paiement-commande.mjs)
4. ✅ Fidélité client (recette-fidelite.mjs)
5. ✅ Offline : vente hors-ligne + rejeu (recette-pilote2-offline.mjs)
6. ✅ Catalogue maître (recette-pilote3-catalogue.mjs)
7. ⚠️ **Activation P0.0** — couvert par invariants mais pas de E2E bout-en-bout
8. ⚠️ **WebAuthn** — pas de E2E
9. ⚠️ **Refresh token rotation** — pas de E2E
10. ⚠️ **Verrou PIN progressif** — pas de E2E
11. ⚠️ **Mutation de zone** — pas de E2E
12. ⚠️ **Institution scope guard** — pas de E2E
13. ⚠️ **Notifications push web** — pas de E2E
14. ⚠️ **Maestro mobile** — 5 flux écrits, jamais exécutés

### Scénarios à ajouter (P1)
15. Crash backend pendant vente offline → reprise
16. Perte réseau pendant refresh token → recouvrement
17. Concurrence : 2 devices même user → révocation
18. Webhook BPay rejoué → idempotence
19. Reset DB → restauration depuis dump
20. Migration TypeORM en prod → retour arrière

## 4. Tests à automatiser (manquants)

### Frontend
- **Framework de test standard** : Vitest ou Jest (actuellement helpers ad-hoc)
- **Coverage report** : pas de coverage mesuré
- **Tests a11y automatisés** : axe-core en CI
- **Tests visuels** : Storybook + Chromatic
- **Bundle analyzer** : `rollup-plugin-visualizer`

### Backend
- **Coverage report** : Istanbul / c8
- **Tests de charge** : k6 ou Artillery
- **Tests de mutation** : Stryker
- **Tests contrat API** : Pact
- **Tests fuzzing** : fast-check sur endpoints sensibles

### Mobile
- **Émulateur Android en CI** : pour exécuter les 5 flux Maestro
- **Tests sur appareils réels** : BrowserStack / Sauce Labs
- **APK size analyzer** : bundletool

### E2E
- **Lighthouse CI** : sur pages critiques (caisse, login, backoffice)
- **Tests cross-browser** : Chrome, Firefox, Safari (Playwright)
- **Tests cross-device** : mobile, tablet, desktop

## 5. Stratégie de régression

### Garde-fous existants
- **Cliquets Jest** (`it.failing` → `it`) : un blocker corrigé mais non promu fait échouer la CI
- **Gate TypeScript cliquet** (`ci/check-tsc-baseline.mjs` + `ci/tsc-baseline.txt` = 0)
- **Verrou schéma figé** (`schema-pilote.yml`)
- **Budget bundle CI** (`check-bundle-budget.mjs` 800 KB max)
- **8 scripts de garde-fou source** dans `scripts/`

### À mettre en place
- **Coverage threshold** : ≥ 80% global, ≥ 90% sur modules sacrés
- **Mutation testing** : Stryker sur modules sacrés
- **Tests de non-régression visuelle** : Storybook + Chromatic
- **Snapshots API** : sur les endpoints critiques

## 6. Plan de test par feature (template)

Toute nouvelle feature doit :
1. Définir ses scénarios de test E2E avant implémentation
2. Couvrir les cas nominaux + erreurs + edge cases
3. Ajouter un invariant business si la feature touche un module sacré
4. Ajouter un test de non-régression si la feature touche un flux critique
5. Valider par QA avant fusion

## 7. Score test initial (audit 2026-09-28)

**75/100** — couverture logique métier très bonne (caisse, argent, voix, idempotence) avec 48 tests d'invariants sur vrai PostgreSQL, mais dette sur le manque de framework standard frontend, l'absence de coverage report, les tests Maestro jamais exécutés, et l'absence de tests a11y/visuel/charge.
