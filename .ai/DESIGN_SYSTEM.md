# DESIGN_SYSTEM.md — JULABA

> Source de vérité du design system. Lue par UX/UI et Dev Frontend avant toute création de composant.

## 1. Stack visuelle

- **Framework UI** : React 18.3 + TypeScript 5.9 strict
- **Build** : Vite 6.3
- **CSS** : Tailwind CSS v4 (`@tailwindcss/vite` + `tw-animate-css`)
- **UI primitives** : Radix UI (24 packages `@radix-ui/react-*`) — ⚠️ versions en `*` (instabilité potentielle)
- **Design system local** : shadcn/ui-style (`cva` + `tailwind-merge` + `clsx`)
- **Animations** : framer-motion 12.36 + motion 12.38 (`MotionConfig` global avec `reducedMotion`)
- **Icônes** : lucide-react 0.487 + 19 icônes Tabler embarquées localement (`icons-tabler.css`)
- **Charts** : recharts 2.15
- **Maps** : leaflet 1.9
- **Toasts** : sonner 2.0
- **Forms** : react-hook-form 7.55
- **Police** : Inter via `@fontsource/inter` (aucun preconnect Google)

## 2. Tokens CSS (7 fichiers — dette de complexité)

| Fichier | Rôle | Conflits connus |
|---|---|---|
| `theme.css` | Variables shadcn (`--background`, `--primary`, etc.) + override OKLCH->hex pour Motion | OKLCH non reconnu par framer-motion — workaround nécessaire |
| `tokens.css` | Palette « encre » (4 niveaux) avec variantes normal/soleil/dark | — |
| `commerce.css` | Charte « L'esprit du marché » (`--commerce-ink`, `--commerce-paper`, `--commerce-action`, `--commerce-green`) | Source unique pour POSCaisse (garde-fou `caisseCharte.test.mts`) |
| `soleil.css` | Surcharges mode soleil (plein jour marché) | Mode inclusif rare |
| `index.css` | Global, fonts, dark mode, scrollbar utilities | — |
| `login.css` | Styles spécifiques écran login | — |
| `fonts.css` | Déclarations `@font-face` | — |

## 3. Composants UI (un seul DS — couche primitives + couche composites BO)

> **INIT-018 (2026-09-29) :** la dette `FRONT-NEW-2` « 2 design systems BO
> parallèles » est **FERMÉE**. Les 6 composants `Universal*BO` morts ont été
> supprimés (`UniversalSearchBarBO`, `UniversalFilterPanelBO`, `UniversalBadgeBO`,
> `UniversalAvatarBO`, `UniversalTableBO`, `UniversalToastBO` — 1 739 lignes
> de code mort éliminées). Les 13 composites BO vivants restent dans
> `backoffice/universal/` et **consomment déjà** les primitives shadcn de
> `components/ui/` : ils forment la « couche composite BO » du DS unique, pas un
> fork. Voir `frontend_src/src/app/components/backoffice/universal/MIGRATION_GUIDE.md`.

### Couche 1 — primitives shadcn (`src/app/components/ui/`)
16 composants :
- `button.tsx` (cva + variants default/destructive/outline/secondary/ghost/link)
- `card.tsx`, `input.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`
- `tabs.tsx`, `avatar.tsx`, `badge.tsx`, `label.tsx`, `table.tsx`, `skeleton.tsx`
- `sonner.tsx` (toasts), `UniversalKPI.tsx`, `AnimatedChart.tsx`
- `utils.ts` (helper `cn()`)

### Couche 2 — composites BO (`src/app/components/backoffice/universal/`)
13 composants `Universal*BO.tsx` qui enveloppent les primitives shadcn en y
ajoutant le thème `BO_*` (`BO_PRIMARY`, `BO_TINT`, `BO_LIGHT`), les couleurs par
rôle (`role-config.ts`), des animations framer-motion et des presets métier :

| Composite BO | Primitive shadcn | Spécificité |
|---|---|---|
| `UniversalModalBO` | `Dialog` | Layout modal header/footer + presets `sm/md/lg/xl` |
| `UniversalConfirmModalBO` | `AlertDialog` | Sévérités `info/warning/danger` |
| `UniversalActionWithReasonModalBO` | (compose `UniversalModalBO`) | Modale action + champ raison |
| `UniversalActionButtonBO` | `Button` | Variantes + tailles BO |
| `UniversalTabsBO` | `Tabs` | Onglets typés avec icône/badge |
| `UniversalSectionCardBO` | `Card` | 7 variantes couleur + option `shimmer` |
| `UniversalSkeletonBO` | `Skeleton` | Presets `list/grid/detail/kpi` |
| `UniversalDropdownMenuBO` | `DropdownMenu` | Items typés `DropdownEntry` |
| `UniversalPaginationBO` | (aucune — Pagination non embarquée) | Pagination BO animée |
| `UniversalErrorStateBO` | (aucune) | États d'erreur typés |
| `UniversalDrawerBO` | (aucune — Dialog sideVariants non embarqué) | Panneau latéral animé |
| `UniversalRechercheBO` | (compose `Input`) | Recherche + debounce + suggestions |
| `UniversalFiltreBO` | (compose `Button`) | Filtres multi-groupes |

Voir `MIGRATION_GUIDE.md` du dossier `backoffice/universal/` pour le détail.

### Modales — multiplicité (dette a11y — toujours ouverte, FRONT-NEW-3)
- `ModalContext` + `Modal.tsx` custom + `ModalPortal` + Radix `Dialog` + `UniversalModalBO` + `ProfilUnifieModal` + `ChangePasswordModal`
- **Inconsistance focus trap** selon le système — à uniformiser

## 4. 3 confits visuels exclusifs (design inclusif remarquable)

Arbitrés par module pur `confortVisuel.ts` (testable) :
- **Normal** : thème standard
- **Soleil** : contraste renforcé pour marchés en plein jour
- **Sombre** : thème sombre classique

Migration automatique de l'ancien `julaba_dark_mode` vers le nouveau système.

## 5. Voice-first — charte Tata Nanti Lou

- **Assistante vocale** : Tata Nanti Lou (synthèse ElevenLabs cloud + VITS-Piper hors-ligne)
- **137 clips mp3 pré-cachés** (~7 Mo) dans `public/voix/` — préchargés via `requestIdleCallback`
- **Bouton micro** : `aria-label="Ouvrir Tata Nanti Lou"`
- **Grammaire d'encaissement** : `grammaireEncaissement.ts` (testable)
- **Vocabulaire bambara/dioula** : `nombresBambara.ts`, `vocabulaire.ts`, `localIntent.ts`
- **Doctrine** (Patrick, 20/09/2026) : « La voix est une propriété du PARCOURS, pas de l'écran »

## 6. Cible tactile & typographie

- **Cible tactile ≥ 44 px** : vérifiée par CI `scripts/test-cible-tactile.mjs`
- **Taille de texte ajustable** : `TextSizeSlider` + préférence `text_size` (1-5) + `appliquerTailleTexteAuDocument`
- **Anti-jargon** : test `anti-jargon.test.mts` (vocabulaire marchandes non-lectrices)
- **Haptique** : `utils/haptique.ts` (`vibrerSucces`, `vibrerErreur`, `vibrerTic`)

## 6.bis. Internationalisation (i18n) — adoptée INIT-020 (28/09/2026)

- **Stack** : `i18next@^23.16` + `react-i18next@^14.1`
- **Config** : `frontend_src/src/app/i18n/config.ts` — `fallbackLng: 'french'`, `supportedLngs: ['french', 'dioula', 'bambara']`, `interpolation.escapeValue: false` (React échappe déjà).
- **Locales** : `frontend_src/src/app/i18n/locales/{fr,dioula,bambara}.json`
  - `fr.json` : source de vérité (chaînes françaises extraites des écrans).
  - `dioula.json` / `bambara.json` : **PLACEHOLDERS** (chaînes françaises non traduites) — à finaliser par un locuteur natif (processus documenté dans `i18n/README.md`).
- **Bridge `useLangPref` ↔ i18next** : `setLangPref(lang)` appelle `appliquerLangueI18n(lang)` qui fait `i18n.changeLanguage(lang)` + met à jour `document.documentElement.lang` (codes ISO 639-3 : `fr`/`dyu`/`bm`).
- **`<html lang>` dynamique** : pré-chargé dans `index.html` (script inline qui lit `localStorage['julaba_lang']`) pour éviter un flash au boot, puis synchronisé au 1er render.
- **Wrapping app** : `I18nextProvider` au sommet de `App.tsx` (englobe tous les autres providers).
- **Migration progressive** : écrans migrés → `MesDonnees.tsx`, `Welcome.tsx`, `EntryGate.tsx`. Backlog → `POSCaisse.tsx`, `LoginPassword.tsx`, `UniversalParametres.tsx` (effort L chacun).
- **Anti-jargon** : `anti-jargon.test.mts` ne scanne QUE les `.ts`/`.tsx` (pas les `.json`). Les chaînes déplacées vers les locales JSON échappent donc au test — il faudra étendre le test pour scanner aussi `i18n/locales/fr.json` (todo quality).

## 7. Routes / pages (95 routes)

Toutes les routes métier sont **lazy-loadées** via helper `L()` (React.lazy + Suspense + `PageLoader`).

### Espace Marchand (28 routes)
`/marchand/caisse` (POSCaisse — cœur métier), `/marchand/cahier`, `/marchand/depense`, `/marchand/stock`, `/marchand/marche`, `/marchand/recoltes-prevues`, `/marchand/profil`, `/marchand/ventes-passees`, `/marchand/resume-caisse`, `/marchand/commandes`, `/marchand/alertes`, `/marchand/parametres`, `/marchand/cooperative`, `/marchand/tontines`, `/marchand/protection-sociale`, `/marchand/fidelite`, `/marchand/academy`, `/marchand/keiwa` (+5 wallet), `/marchand/support`

### Backoffice (33 routes)
`/backoffice/dashboard`, `/backoffice/acteurs`, `/backoffice/enrolement`, `/backoffice/supervision`, `/backoffice/zones`, `/backoffice/carte`, `/backoffice/academy`, `/backoffice/missions`, `/backoffice/parametres`, `/backoffice/audit`, `/backoffice/utilisateurs`, `/backoffice/institutions`, `/backoffice/rapports`, `/backoffice/notifications`, `/backoffice/support`, `/backoffice/moderation`, `/backoffice/mutations`, `/backoffice/contenus`, `/backoffice/monitoring-ia`, `/backoffice/event-monitor`, `/backoffice/analytics`, `/backoffice/score-financier`, `/backoffice/api-keys`, `/backoffice/marketplace`, `/backoffice/livraison`, `/backoffice/communication`, `/backoffice/cron`, `/backoffice/config-institution`, `/backoffice/keiwa`

### Autres espaces
- Producteur (~12 routes), Cooperative (~17), Institution (~5), Identificateur (~7)
- `/marketplace`, `/pay/success`, `/pay/error`, `/paiement/success`, `/paiement/failed`, `/pay/:marchandId`

### Routes publiques
`/` (EntryGate), `/non-enregistre`, `/welcome`, `/login`, `/change-password`, `/activation`, `/studio-voix`, `/collecte-voix`, `/collecte-voix/validation`

### Routes DEV uniquement (`import.meta.env.DEV`)
`/database`, `/create-super-admin`, `/admin-recovery`, `/setup-marchand`, `/dev-mode`

## 8. Garde-fous CI design

- `caisseCharte.test.mts` : POSCaisse ne contient pas de couleurs en dur (sinon double source avec `commerce.css`)
- `check-bundle-budget.mjs` : 800 KB max initial
- `test-cible-tactile.mjs` : ≥ 44 px
- `test-icones.mjs` : cohérence icônes
- `test-verrou-connexion.mjs` : écran connexion verrouillé
- `test-source-vente.mjs` : source de vente unique
- `test-unite-persistée.mjs` : unité persistée
- `test-fusion-panier.mjs` : fusion panier
- `generer-icones.mjs` : génération automatique

## 9. Conventions à respecter (règles obligatoires)

### Couleurs
- **JAMAIS de couleurs hardcodées** dans les composants (utilisez `tokens.css` / `commerce.css` / `theme.css`)
- `caisseCharte.test.mts` est le garde-fou

### Composants
- Toute nouvelle primitive UI (bouton, input, carte, etc.) va dans `src/app/components/ui/` (style shadcn, Radix + `cva`)
- Tout nouveau composite BO (qui consomme une ou plusieurs primitives + thématise `BO_*` + métier `role-config`) va dans `src/app/components/backoffice/universal/` avec le préfixe `Universal*BO`
- Ne pas utiliser de primitive Radix brute dans un écran BO : passer par le composite `Universal*BO` correspondant
- Si un composite `Universal*BO` n'existe pas encore, le créer plutôt que d'utiliser la primitive shadcn directement dans l'écran

### Modales
- Préférer Radix `Dialog` (focus trap natif)
- Documenter le choix si nouvelle modale custom

### Animations
- Toujours honorer `reduce_animations` via `MotionConfig reducedMotion`
- Pas d'animations bloquantes (durée max 300ms pour feedback)

### Voix
- Bouton micro : `aria-label="Ouvrir Tata Nanti Lou"` obligatoire
- Clips pré-cachés via `requestIdleCallback` (jamais bloquant)

### Icônes
- lucide-react par défaut
- Tabler uniquement si non disponible dans lucide (19 icônes déjà embarquées)

## 10. Dette design (top 5)

1. **7 fichiers CSS** avec override OKLCH->hex workarounds pour Motion
2. **Multiplicité des modales** — inconsistance a11y (FRONT-NEW-3)
3. **Pas de Storybook** — pas de démo interactive des composants
4. **Radix en version `*`** — instabilité potentielle (à pinner en semver)
5. **Composites BO sur shadcn** — 13 `Universal*BO` restants (P3, voir MIGRATION_GUIDE.md) : si l'on veut à terme tout fusionner dans `components/ui/`, il faudrait étendre les primitives shadcn avec variantes `BO_*` via `cva` puis migrer les 11 écrans BO un par un (~2 semaines, bénéfice marginal).

> FERMÉ (INIT-018, 2026-09-29) : « 2 design systems BO parallèles » — les 6
> composants `Universal*BO` morts ont été supprimés (1 739 lignes). Les 13
> composites BO restants consomment déjà les primitives shadcn : le DS est
> unique avec deux couches (primitives + composites BO). Voir
> `frontend_src/src/app/components/backoffice/universal/MIGRATION_GUIDE.md`.

## 11. Recommandations UX/UI (sans modifier le code)

1. **Uniformiser les modales** vers Radix `Dialog` exclusivement (FRONT-NEW-3)
2. **Pinner les versions Radix** en semver explicite
3. **Mettre en place Storybook** pour documenter les composants
4. **Consolider les 7 fichiers CSS** en 1 design tokens + 1 overrides
5. **Ajouter un test a11y automatisé** (axe-core en CI)
