# A11Y_BUGS.md — Problèmes d'accessibilité JULABA

> Registre des problèmes a11y. Format : A11Y-XXX.

## État au 2026-09-28

- **Total problèmes** : 7
- **CRITIQUES (P0)** : 0
- **MAJEURS (P1)** : 3
- **MINEURS (P2)** : 4
- **Résolus** : 0

## Points faibles identifiés (audit initial 2026-09-28)

### A11Y-001 — Multiplicité des systèmes de modales (P1)
- **Statut** : OUVERT
- **Description** : 7 systèmes de modales coexistent : `ModalContext` + `Modal.tsx` custom + `ModalPortal` + Radix `Dialog` + `UniversalModalBO` + `ProfilUnifieModal` + `ChangePasswordModal`.
- **Impact** : focus trap variable selon le système, inconsistencies a11y potentielles.
- **Fichiers concernés** : `src/app/contexts/ModalContext.tsx`, `src/app/components/Modal.tsx`, `src/app/components/ModalPortal.tsx`, `src/app/components/ui/dialog.tsx`, `src/app/components/backoffice/universal/UniversalModalBO.tsx`, `src/app/components/profile/ProfilUnifieModal.tsx`, `src/app/components/profile/ChangePasswordModal.tsx`.
- **Recommandation** : Uniformiser vers Radix `Dialog` exclusivement.

### A11Y-002 — Pas de test a11y automatisé (P1)
- **Statut** : OUVERT
- **Description** : Aucun test a11y automatisé en CI (axe-core, pa11y, lighthouse CI non détectés).
- **Impact** : Régressions a11y non détectées automatiquement.
- **Recommandation** : Mettre en place axe-core en CI + `@axe-core/playwright` pour tests E2E.

### A11Y-003 — i18n absente (P1)
- **Statut** : OUVERT
- **Description** : `useLangPref` expose `french`/`dioula`/`bambara` mais chaînes UI hardcoded en français. `index.html` a `<html lang="fr">` hardcoded.
- **Impact** : Marchandes dioula/bambara non servies côté UI textuelle (uniquement voice-first couvre partiellement).
- **Recommandation** : Adopter i18next ou react-intl, extraire les chaînes UI dans des fichiers de locale.

### A11Y-004 — Pas de skip-link visible sur `<AppLayout>` (P2)
- **Statut** : OUVERT
- **Description** : `components/layout/ScrollToTop.tsx` existe mais pas de skip-link visible pour la navigation clavier.
- **Impact** : Navigation clavier longue pour atteindre le contenu principal.
- **Recommandation** : Ajouter un skip-link "Aller au contenu principal" visible au focus clavier.

### A11Y-005 — BottomBar masquée sans alternative clavier documentée (P2)
- **Statut** : OUVERT
- **Description** : `BottomBar` masquée sur plusieurs routes (`hiddenPaths`) sans alternative clavier documentée.
- **Impact** : Navigation mobile réduite sur certaines routes.
- **Recommandation** : Documenter les alternatives clavier pour chaque route `hiddenPaths`.

### A11Y-006 — Couleurs hard-codées subsistantes (P2)
- **Statut** : OUVERT
- **Description** : Malgré règle explicite (tokens CSS obligatoires), couleurs hard-codées subsistantes.
- **Impact** : Contrastes non vérifiables automatiquement dans les 3 confits visuels.
- **Recommandation** : `caisseCharte.test.mts` est le garde-fou — l'étendre à tout le frontend.

### A11Y-007 — 878 `console.*` en production (P2)
- **Statut** : OUVERT
- **Description** : 878 `console.*` répartis sur 162 fichiers, pas de stripping configuré.
- **Impact** : Bruit pour lecteurs d'écran si erreurs loguées, performance dégradée.
- **Recommandation** : Mettre en place `vite-plugin` ou Terser pour strip en production, utiliser `eventLogger.ts` (existant mais sous-utilisé).

## Points forts a11y (audit initial)

- ✅ **Radix UI** sur primitives (focus trap, ESC, ARIA, roving tabindex natifs)
- ✅ **`focus-visible` rings** déclarés dans `button.tsx`
- ✅ **1417 occurrences** `aria-*`/`role=` sur 173 fichiers
- ✅ **Mode « soleil »** — contraste renforcé (design inclusif rare)
- ✅ **3 confits visuels exclusifs** (normal/soleil/sombre)
- ✅ **Taille de texte ajustable** (`TextSizeSlider`, préférence `text_size` 1-5)
- ✅ **`reduce_animations`** honoré via `MotionConfig`
- ✅ **Feedback haptique** (`utils/haptique.ts`)
- ✅ **Voice-first** pour analphabètes (Tata Nanti Lou)
- ✅ **Cible tactile ≥ 44 px** vérifiée CI (`test-cible-tactile.mjs`)
- ✅ **AccessMode switcher** (lecture/voix/mixte)
- ✅ **WebAuthn / passkeys** supportés

## Score a11y : 75/100

Design inclusif remarquable (voice-first, mode soleil, haptique, cible tactile testée CI), mais dette sur la multiplicité des modales, l'absence de tests a11y automatisés, et l'i18n absente.
