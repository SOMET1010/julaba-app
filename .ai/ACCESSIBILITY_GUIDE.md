# ACCESSIBILITY_GUIDE.md — JULABA

> Règles d'accessibilité. Lue par a11y Agent et Dev Frontend.

## 1. Cible d'accessibilité

**WCAG 2.1 AA** (minimum), avec extensions spécifiques marchandes non-lectrices :
- Voice-first obligatoire pour toute information importante
- Cible tactile ≥ 44 px
- 3 confits visuels (normal / soleil / sombre)
- Taille de texte ajustable (5 niveaux)
- Haptique pour feedback

## 2. Points forts actuels (audit initial 2026-09-28)

### ✅ Implémenté
- **Radix UI** sur primitives (focus trap, ESC, ARIA, roving tabindex natifs)
- **`focus-visible` rings** dans `button.tsx` (`focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`)
- **1417 occurrences** `aria-*`/`role=` réparties sur 173 fichiers
- **`aria-label`** bouton micro Tata (« Ouvrir Tata Nanti Lou »)
- **Mode « soleil »** — contraste renforcé pour marchés en plein jour (design inclusif rare)
- **3 confits visuels exclusifs** (normal/soleil/sombre)
- **Taille de texte ajustable** (`TextSizeSlider`, préférence `text_size` 1-5)
- **`reduce_animations`** honoré via `MotionConfig reducedMotion`
- **Feedback haptique** (`utils/haptique.ts`)
- **Voice-first** pour analphabètes (Tata Nanti Lou)
- **Cible tactile ≥ 44 px** vérifiée CI (`test-cible-tactile.mjs`)
- **AccessMode switcher** (lecture/voix/mixte)
- **HTML `lang="fr"`** correct (dynamique depuis INIT-020 : pré-chargé depuis `localStorage` dans `index.html`, puis synchronisé par `i18n/config.ts`)
- **Skip-link / ScrollToTop** (`components/layout/ScrollToTop.tsx`)
- **`theme-color`** déclaré
- **WebAuthn / passkeys** (`@simplewebauthn/browser`)

## 3. Faiblesses identifiées

### ⚠️ À corriger
- **Multiplicité des systèmes de modales** : `ModalContext` + `Modal.tsx` + `ModalPortal` + Radix `Dialog` + `UniversalModalBO` + `ProfilUnifieModal` + `ChangePasswordModal` — focus trap variable
- **878 `console.*`** dans 162 fichiers — bruit potentiel en prod
- **787 `as any`** — typage faible masque potentiellement des erreurs d'attributs ARIA dynamiques
- **Couleurs hard-codées** subsistant (malgré règle explicite — `caisseCharte.test.mts` est le garde-fou)
- **Pas de skip-link visible** sur `<AppLayout>`
- **BottomBar masquée** sur plusieurs routes (`hiddenPaths`) sans alternative clavier documentée
- **Pas de test a11y automatisé** (axe-core, pa11y, lighthouse CI non détectés)
- ~~**i18n absente** : `useLangPref` expose `french`/`dioula`/`bambara` mais chaînes UI hardcoded en français~~ → **Résolu par INIT-020** (28/09/2026) : `i18next` + `react-i18next` adoptés, `i18n/config.ts` bridge avec `useLangPref`, `<html lang>` dynamique. Migration progressive — `MesDonnees`, `Welcome`, `EntryGate` migrés ; `POSCaisse`/`LoginPassword`/`UniversalParametres` en backlog (voir `frontend_src/src/app/i18n/README.md`).

## 4. Règles obligatoires pour toute nouvelle feature frontend

### Avant implémentation
1. Définir le parcours vocal en parallèle du parcours tactile (voice-first)
2. Vérifier que l'information importante n'est pas uniquement visuelle
3. Choisir le système de modale unique (Radix `Dialog` préféré)
4. Vérifier le contraste dans les 3 confits visuels (normal/soleil/sombre)
5. Prévoir le feedback haptique si action critique

### Pendant l'implémentation
1. **Tout bouton interactif** : `aria-label` si pas de texte visible
2. **Toute modale** : focus trap + `aria-modal="true"` + `role="dialog"` + retour focus à la fermeture
3. **Tout formulaire** : `<label>` associé ou `aria-label` + erreur en `aria-describedby`
4. **Toute liste dynamique** : `role="list"` + `role="listitem"` ou `aria-live="polite"` pour les mises à jour
5. **Toute notification** : `aria-live="polite"` (info) ou `aria-live="assertive"` (erreur)
6. **Cible tactile ≥ 44 px** (testé CI)
7. **Couleurs depuis tokens** (jamais hardcodées — `caisseCharte.test.mts`)
8. **Animations ≤ 300ms** + honorer `reduce_animations`

### Après implémentation
1. Test clavier seul (Tab, Shift+Tab, Enter, Space, ESC)
2. Test lecteur d'écran (NVDA / VoiceOver)
3. Test contraste (Lighthouse / WebAIM)
4. Test dans les 3 confits visuels
5. Test cible tactile ≥ 44 px
6. Validation Agent a11y obligatoire avant fusion

## 5. Patterns a11y à respecter

### Modales (préférer Radix Dialog)
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button aria-label="Ouvrir">Ouvrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titre</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* contenu */}
  </DialogContent>
</Dialog>
```

### Notifications
```tsx
// Toast info
<Toast aria-live="polite">Paiement enregistré</Toast>

// Toast erreur
<Toast aria-live="assertive" role="alert">Échec paiement</Toast>
```

### Listes dynamiques
```tsx
<ul role="list" aria-label="Articles du panier">
  {items.map(item => <li role="listitem" key={item.id}>...</li>)}
</ul>
```

### Formulaires
```tsx
<form>
  <Label htmlFor="phone">Numéro de téléphone</Label>
  <Input id="phone" aria-describedby="phone-error" aria-invalid={!!error} />
  {error && <p id="phone-error" role="alert">{error}</p>}
</form>
```

## 6. Audit a11y — checklist Agent

Avant validation finale d'une feature frontend :
- [ ] Parcours vocal défini et testé (voice-first)
- [ ] Cible tactile ≥ 44 px
- [ ] Contrastes OK dans 3 confits visuels
- [ ] Navigation clavier seule fonctionnelle
- [ ] ARIA corrects (label, role, live, describedby)
- [ ] Modales : focus trap + retour focus
- [ ] Formulaires : labels + erreurs associées
- [ ] Notifications : aria-live approprié
- [ ] Animations ≤ 300ms + `reduce_animations` honoré
- [ ] Pas de couleur hardcodée (tokens uniquement)
- [ ] Test lecteur d'écran (NVDA / VoiceOver)
- [ ] Pas de `console.*` en prod

## 7. Outils recommandés (à mettre en place)

- **axe-core** en CI (lint a11y)
- **@axe-core/playwright** pour tests E2E a11y
- **lighthouse CI** avec catégorie a11y bloquante
- **eslint-plugin-jsx-a11y** pour lint statique
- **Storybook + @storybook/addon-a11y** pour audit composants

## 8. Score a11y initial (audit 2026-09-28)

**80/100** (+5 depuis INIT-020) — design inclusif remarquable (voice-first, mode soleil, haptique, cible tactile testée CI, i18next adopté), mais dette sur la multiplicité des modales, l'absence de tests a11y automatisés, et la migration i18n progressive (écrans critiques restants : `POSCaisse`, `LoginPassword`, `UniversalParametres`).
