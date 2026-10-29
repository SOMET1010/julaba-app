# A11Y_BUGS.md — Problèmes d'accessibilité JULABA

> Registre des problèmes a11y. Format : A11Y-XXX.

## État au 2026-10-29 (rattrapé sur le code réel, commit 138a2630)

- **Résolu ce jour** : A11Y-004 (skip-link sur AppLayout — commit `138a2630`, vu dans le source : `<a href="#contenu-principal">` avant le `<main id>`, visible au focus, jamais au repos).
- **Inventaires corrigés sur le code réel** (le registre du 28/09 mentait par péremption) :
  - A11Y-001 : `Modal.tsx`, `ProfilUnifieModal.tsx`, `ChangePasswordModal.tsx` N'EXISTENT PLUS. Systèmes réellement en place : `ModalContext.tsx`, `ModalPortal.tsx` (shared), `UniversalModalBO.tsx` + `UniversalDrawerBO.tsx` (back-office), portails `createPortal` maison (WalletPage, NotificationToast, NotificationsPanel). Radix `Dialog` : **1 seul import** dans tout `src` ; Radix `AlertDialog` : 1.
  - A11Y-007 : recompte — **1750 appels** `console.*` dans **93 fichiers** (1410 `log`, 276 `warn`, 63 `error`, 1 `info`).
  - A11Y-006 : mesure — **4262 hexadécimaux** dans **199 fichiers** hors tests. La dette est une mer, pas une flaque : une interdiction zéro-hex d'un coup est fausse (régression visuelle non prouvée). La garde qui convient : **figer la base, refuser toute aggravation**.
- **Ouverts** : A11Y-001, A11Y-002, A11Y-003, A11Y-005, A11Y-006, A11Y-007.

## État au 2026-09-28 (audit initial — conservé pour l'histoire)

- **Total problèmes** : 7
- **CRITIQUES (P0)** : 0
- **MAJEURS (P1)** : 3
- **MINEURS (P2)** : 4
- **Résolus** : 0

## Points faibles identifiés (audit initial 2026-09-28)

### A11Y-001 — Multiplicité des systèmes de modales (P1)
- **Statut** : OUVERT
- **Description** (inventaire CORRIGÉ le 29/10 sur le code réel — les fichiers cités le 28/09 ont disparu) : 5 systèmes coexistent aujourd'hui : `ModalContext` (custom, trap maison) + `ModalPortal` (shared, portail brut) + `UniversalModalBO` / `UniversalDrawerBO` (back-office, portail brut) + portails `createPortal` disséminés (WalletPage, NotificationToast, NotificationsPanel). Radix `Dialog` n'a qu'un import dans tout `src` — la recommandation initiale (Radix exclusif) n'est suivie nulle part.
- **Impact** : focus trap variable selon le système, `aria-modal` et ESC incohérents, inconsistencies a11y potentielles.
- **Fichiers concernés** : `src/app/contexts/ModalContext.tsx`, `src/app/components/shared/ModalPortal.tsx`, `src/app/components/backoffice/universal/UniversalModalBO.tsx`, `src/app/components/backoffice/universal/UniversalDrawerBO.tsx`, `src/app/components/wallet/WalletPage.tsx`, `src/app/components/shared/NotificationToast.tsx`, `src/app/components/shared/NotificationsPanel.tsx`.
- **Recommandation** : uniformiser vers Radix `Dialog` exclusivement — par pas réversibles, un système à la fois, avec preuve axe + terrain, jamais en bloc.

### A11Y-002 — Pas de test a11y automatisé (P1)
- **Statut** : OUVERT
- **Description** : Aucun test a11y automatisé (axe-core, pa11y, lighthouse CI non détectés).
- **Impact** : Régressions a11y non détectées automatiquement.
- **Recommandation** : harnais axe-core sur le DOM RÉELLEMENT RENDU (jsdom + testing-library, composants réels — pas une maquette), branché dans `verify`. Un rouge d'axe est un défaut d'usage, pas du style.

### A11Y-003 — i18n UI absente (P1)
- **Statut** : OUVERT — HORS RANG 6 (lot dédié ; la voix couvre déjà dioula/bambara pour l'ORAL : `test:i18n-*`, `test:voix-dyu-argent` ; c'est le TEXTE UI qui reste français).
- **Description** : `useLangPref` expose `french`/`dioula`/`bambara` mais chaînes UI hardcoded en français. `index.html` a `<html lang="fr">` hardcoded.
- **Impact** : Marchandes dioula/bambara non servies côté UI textuelle (uniquement voice-first couvre partiellement).
- **Recommandation** : Adopter i18next ou react-intl, extraire les chaînes UI dans des fichiers de locale.

### A11Y-004 — Pas de skip-link visible sur `<AppLayout>` (P2)
- **Statut** : RÉSOLU le 29/10 — commit `138a2630` « fix(a11y): le clavier saute la navigation — skip-link sur AppLayout ». Vu dans le source : le lien est le PREMIER tab du DOM, `sr-only focus:not-sr-only`, il rejoint `<main id="contenu-principal" tabIndex={-1}>`. Registre rattrapé le même jour.
- **Description** : `components/layout/ScrollToTop.tsx` existe mais pas de skip-link visible pour la navigation clavier.
- **Impact** : Navigation clavier longue pour atteindre le contenu principal.
- **Recommandation** : Ajouter un skip-link "Aller au contenu principal" visible au focus clavier. → FAIT.

### A11Y-005 — BottomBar masquée sans alternative clavier documentée (P2)
- **Statut** : OUVERT
- **Description** : `BottomBar` masquée sur 11 routes (`hiddenPaths` dans AppLayout.tsx : academy, cahier, ventes-passees, commandes, support ×4, alertes ×2, cooperative/commandes) sans alternative clavier documentée.
- **Impact** : Navigation mobile réduite sur certaines routes.
- **Recommandation** : Documenter les alternatives clavier pour chaque route `hiddenPaths`.

### A11Y-006 — Couleurs hard-codées subsistantes (P2)
- **Statut** : OUVERT — base mesurée le 29/10 : **4262 hex dans 199 fichiers** hors tests.
- **Description** : Malgré règle explicite (tokens CSS obligatoires), couleurs hard-codées subsistantes.
- **Impact** : Contrastes non vérifiables automatiquement dans les 3 confits visuels.
- **Recommandation** : `caisseCharte.test.mts` est le garde-fou — l'étendre à tout le frontend. Réalité du 29/10 : l'extension zéro-hex immédiate est impossible (4262 occurrences, chaque remise au token est un changement visuel à prouver). La garde honnête : **figer la base et refuser toute aggravation**, puis descendre le chiffre rang après rang.

### A11Y-007 — 1750 `console.*` dans le code (P2)
- **Statut** : OUVERT — recompte du 29/10 : 1750 appels dans 93 fichiers (1410 `log`, 276 `warn`, 63 `error`, 1 `info`).
- **Description** : pas de stripping configuré au build.
- **Impact** : Bruit en production, performance dégradée, indice pour qui sonde (cf. AUTH-14 qui a déjà taillé le `warn` auth).
- **Recommandation** : strip au build via esbuild (`pure`) — `log`/`info`/`debug` retirés du bundle livré, `warn`/`error` conservés comme diagnostic légitime ; le dev garde tout.

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

## Historique des clôtures

- **2026-10-29** : A11Y-004 RÉSOLU (`138a2630`, skip-link AppLayout). Registre rattrapé sur le code réel : inventaires A11Y-001/006/007 corrigés et mesurés.
