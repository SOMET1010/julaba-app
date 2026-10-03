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

## 3. Composants UI (2 systèmes parallèles — dette)

### Système 1 : shadcn local (`src/app/components/ui/`)
16 composants :
- `button.tsx` (cva + variants default/destructive/outline/secondary/ghost/link)
- `card.tsx`, `input.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`
- `tabs.tsx`, `avatar.tsx`, `badge.tsx`, `label.tsx`, `table.tsx`, `skeleton.tsx`
- `sonner.tsx` (toasts), `UniversalKPI.tsx`, `AnimatedChart.tsx`
- `utils.ts` (helper `cn()`)

### Système 2 : Universal BO (`src/app/components/backoffice/universal/`)
22 composants `Universal*BO.tsx` (Table, Modal, Drawer, Tabs, Filter, Search, Pagination, Confirm, Action…)
- Migration en cours (voir `MIGRATION_GUIDE.md`)
- **Double maintenance** : à terminer pour fusionner vers un seul DS

### Modales — multiplicité (dette a11y)
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
- Tout nouveau composant UI passe dans `src/app/components/ui/` (shadcn style)
- Tout nouveau composant BO passe dans `src/app/components/backoffice/universal/` (Universal*BO)
- Ne pas mélanger les 2 systèmes dans un même écran

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

1. **2 design systems BO parallèles** — migration incomplète
2. **7 fichiers CSS** avec override OKLCH->hex workarounds pour Motion
3. **Multiplicité des modales** — inconsistance a11y
4. **Pas de Storybook** — pas de démo interactive des composants
5. **Radix en version `*`** — instabilité potentielle (à pinner en semver)

## 11. Recommandations UX/UI (sans modifier le code)

1. **Terminer la migration Universal BO** vers un seul DS
2. **Uniformiser les modales** vers Radix `Dialog` exclusivement
3. **Pinner les versions Radix** en semver explicite
4. **Mettre en place Storybook** pour documenter les composants
5. **Consolider les 7 fichiers CSS** en 1 design tokens + 1 overrides
6. **Ajouter un test a11y automatisé** (axe-core en CI)
