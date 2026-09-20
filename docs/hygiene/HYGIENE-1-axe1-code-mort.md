# HYGIÈNE-1 — Axe 1 : code mort, prouvé inatteignable

**Base de récupération : `59b9142`.** Aucun fichier n'est perdu. Pour en ramener un :
`git checkout 59b9142 -- <chemin>`.

## La règle appliquée

> « Aucun fichier supprimé parce qu'il apparaît dans les 182 candidats. Il faut
> prouver absence d'import, absence de chargement dynamique, absence de
> route/configuration, absence de script/build/test qui le consomme. »

Les 182 « jamais importés » ne sont pas la bonne mesure : ils comptent aussi les
points d'entrée (`main.tsx`, les tests), qui ne sont importés par personne et
sont pourtant vivants. La mesure retenue est **l'atteignabilité réelle** : on
part des entrées et on marche le graphe d'imports, statiques et dynamiques.

**519 fichiers analysés, 419 atteints, 100 hors parcours.** Ces 100 forment un
graphe **fermé** : chaque importeur d'un candidat est lui-même un candidat.
Ce sont des îlots, pas des feuilles isolées.

### Les quatre preuves

| Preuve | Méthode | Résultat |
|---|---|---|
| Absence d'import statique | graphe d'imports `import`/`export … from`/`require` avec résolution d'index et d'alias `@/` | 72 candidats sans aucun importeur ; les 28 autres importés **uniquement** par d'autres candidats |
| Absence de chargement dynamique | recherche de `import()` à spécificateur non littéral (variable/gabarit) et de `import.meta.glob` dans tout `frontend_src/src` | **aucun**. Les seuls imports dynamiques sont littéraux (`routes.tsx`, `BOSupervision`, `BOZones`) et donc déjà dans le graphe |
| Absence de route/configuration | `routes.tsx` est dans le graphe ; `vite.config.ts`, `tsconfig.json` (`include: ["src"]`), `capacitor.config.ts` ne nomment aucun fichier individuellement | aucune référence |
| Absence de script/build/test | recherche du chemin de chaque candidat hors `frontend_src/src` (CI, `scripts/`, `maestro/`, `package.json`, docs) | seules occurrences : les rapports `.audit_ui_*` (dumps de chaînes, pas des consommateurs) et `ADR-0003` pour `devise.ts` |

`tsconfig.tsbuildinfo` cite bien les 100 fichiers — c'est un artefact de build non
versionné, produit *par* `include: ["src"]`, pas un consommateur. Il a été écarté.

## Registre

### CONSERVÉ (1)

| Fichier | Raison |
|---|---|
| `app/config/devise.ts` | Module canonique de la devise décidé en **ADR-0003 (#5)**. Non encore câblé : c'est le point de convergence prévu par l'axe 3, pas du code mort. |

### SUPPRIMÉ (99)

#### Primitives shadcn/ui jamais montées (33)

Bibliothèque vendorisée. Aucune n'est atteinte depuis une route. `sidebar.tsx` tire `separator`/`sheet`/`tooltip`/`use-mobile` : l'îlot se referme sur lui-même. Se réinstallent d'une commande si un écran en a besoin.

- `app/components/ui/AnimatedKPI.tsx`
- `app/components/ui/accordion.tsx`
- `app/components/ui/alert.tsx`
- `app/components/ui/aspect-ratio.tsx`
- `app/components/ui/breadcrumb.tsx`
- `app/components/ui/calendar.tsx`
- `app/components/ui/chart.tsx`
- `app/components/ui/checkbox.tsx`
- `app/components/ui/collapsible.tsx`
- `app/components/ui/command.tsx`
- `app/components/ui/context-menu.tsx`
- `app/components/ui/counter.tsx`
- `app/components/ui/form.tsx`
- `app/components/ui/hover-card.tsx`
- `app/components/ui/menubar.tsx`
- `app/components/ui/navigation-menu.tsx`
- `app/components/ui/pagination.tsx`
- `app/components/ui/popover.tsx`
- `app/components/ui/progress.tsx`
- `app/components/ui/radio-group.tsx`
- `app/components/ui/resizable.tsx`
- `app/components/ui/scroll-area.tsx`
- `app/components/ui/select.tsx`
- `app/components/ui/separator.tsx`
- `app/components/ui/sheet.tsx`
- `app/components/ui/sidebar.tsx`
- `app/components/ui/slider.tsx`
- `app/components/ui/switch.tsx`
- `app/components/ui/textarea.tsx`
- `app/components/ui/toggle-group.tsx`
- `app/components/ui/toggle.tsx`
- `app/components/ui/tooltip.tsx`
- `app/components/ui/use-mobile.ts`

#### Second système de design « shared » (27)

Un design system parallèle (Button, Input, Badge, Toast, Skeleton…) avec sa vitrine (`DesignSystemShowcase`), ses démos (`GamificationDemo`, `UniversalDemo`) et son baril (`index.ts`). Aucun écran vivant ne l'importe : les écrans utilisent `components/ui/*`. **C'était une double vérité d'interface.**

- `app/components/shared/AlertesBanner.tsx`
- `app/components/shared/AppError.tsx`
- `app/components/shared/AppLoader.tsx`
- `app/components/shared/Badge.tsx`
- `app/components/shared/BadgeCollection.tsx`
- `app/components/shared/BottomModal.tsx`
- `app/components/shared/Button.tsx`
- `app/components/shared/DesignSystemShowcase.tsx`
- `app/components/shared/EmptyState.tsx`
- `app/components/shared/GamificationDemo.tsx`
- `app/components/shared/IdentificationInfoBadge.tsx`
- `app/components/shared/InfoPersonnellesModalUniversal.tsx`
- `app/components/shared/Input.tsx`
- `app/components/shared/ProfessionalCard.tsx`
- `app/components/shared/ProfilWalletSection.tsx`
- `app/components/shared/ScoreBreakdown.tsx`
- `app/components/shared/Skeleton.tsx`
- `app/components/shared/TantieSagesseCard.tsx`
- `app/components/shared/Toast.tsx`
- `app/components/shared/UniversalDemo.tsx`
- `app/components/shared/UniversalQuiz.tsx`
- `app/components/shared/index.ts`
- `app/components/shared/universal/UniversalAccueil.tsx`
- `app/components/shared/universal/UniversalMarche.tsx`
- `app/components/shared/universal/UniversalProduits.tsx`
- `app/components/shared/universal/index.ts`
- `app/components/shared/universal/types.ts`

#### Îlot « mode développeur » (6)

La route `/dev-mode` existe et pointe sur `pages/DevModeHome`, qui **n'importe rien de cet îlot**. `hooks/useDevMode.ts` et `contexts/DevModeContext.tsx` exportaient tous deux un `useDevMode` — deux sens pour un même nom. `hooks/useAccessMode.ts` s'annonçait « socle unique de l'expérience adaptative » et n'était appelé nulle part ; le vrai socle est `utils/accessMode.ts`, lui bien vivant.

- `app/components/DevModeBadge.tsx`
- `app/components/DevModeInfo.tsx`
- `app/components/DevModeToggle.tsx`
- `app/contexts/DevModeContext.tsx`
- `app/hooks/useDevMode.ts`
- `app/hooks/useAccessMode.ts`

#### Chemin vocal serveur, retiré en 9cbe711 (2)

`aiIntentService.ts` appelait le serveur pour interpréter la parole. Ce chemin a été supprimé : le téléphone écoute, comprend et parle seul. `AIIntentTester` était sa console d'essai. Les garder, c'était laisser croire qu'un repli serveur existe.

- `app/components/dev/AIIntentTester.tsx`
- `app/services/aiIntentService.ts`

#### Second appareil vocal (4)

`VoiceButton.tsx` est un **deuxième micro** bâti sur `useVoiceCore`, jamais monté — alors que six écrans vivants utilisent `useVoiceCore` directement. `CommandesVocales` + `tantieSagesseConfig` + `useCurrentModule` formaient une seconde Tantie Sagesse, que `TantieSagesseModal` (vivant) n'utilise pas. Un micro qui ne fait rien contredit la doctrine : **un micro visible est une instruction fonctionnelle, pas une décoration.**

- `app/components/voice/VoiceButton.tsx`
- `app/components/assistant/CommandesVocales.tsx`
- `app/config/tantieSagesseConfig.ts`
- `app/hooks/useCurrentModule.ts`

#### Contenu d'académie non branché (10)

`formations/*` et `quizData.ts` sont une seconde source de contenu ; l'académie vivante lit `academyConfig.ts` et `academyQuestions.ts`. `academyService.ts` est listé **non fait** dans `components/academy/IMPLEMENTATION_STATUS.md`.

- `app/components/academy/FormationDuJour.tsx`
- `app/components/academy/StreakShieldModal.tsx`
- `app/components/academy/formations/cooperative.ts`
- `app/components/academy/formations/identificateur.ts`
- `app/components/academy/formations/index.ts`
- `app/components/academy/formations/institution.ts`
- `app/components/academy/formations/marchand.ts`
- `app/components/academy/formations/producteur.ts`
- `app/services/academyService.ts`
- `app/data/quizData.ts`

#### Doublons remplacés par un équivalent vivant (12)

Chacun a sa contrepartie en service : `WalletInline` → `WalletPage`/`WalletCard` ; `FicheMarchand` → `FicheIdentificationDynamique`/`ActeurDetails` ; les cinq modales marchand → `MarchandModals`/`MarchandAccueilVoice` (objectif, raccourcis et rapport hebdo sont bien vivants ailleurs) ; `config/images.ts` → `assets/images.ts` ; `data/acteursData.ts` se déclarait « SOURCE UNIFIÉE DES ACTEURS » sans qu'aucun écran ne la lise ; `data/marches-ci.ts` était une liste de marchés figée dans le code, concurrente du serveur.

- `app/components/marchand/DocumentModal.tsx`
- `app/components/marchand/FicheIdentificationModal.tsx`
- `app/components/marchand/ObjectifModal.tsx`
- `app/components/marchand/RaccourcisModal.tsx`
- `app/components/marchand/RapportHebdoModal.tsx`
- `app/components/identificateur/FicheMarchand.tsx`
- `app/components/institution/InstitutionModals.tsx`
- `app/components/wallet/WalletInline.tsx`
- `app/components/marche/CommandeCard.tsx`
- `app/config/images.ts`
- `app/data/acteursData.ts`
- `app/data/marches-ci.ts`

#### Souches vides et fausses constantes (5)

`Header.tsx` retourne `null` (6 lignes). `SimulateurBO.tsx` se disait « conservé pour compatibilité d'import » — il ne restait aucun import. `NotificationCenter.tsx` était un « wrapper de compatibilité ». `utils/MotDePasseUniversel.ts` tenait une ligne, `MOT_DE_PASSE_DEFAUT = '0000'`, jamais lue : le vrai défaut vit côté serveur (`auth.service.ts`) et `'0000'` y est d'ailleurs un **PIN interdit** à l'activation. `safeLocalStorage.ts` n'a jamais été adopté ; le motif retenu partout est le `try/catch` en ligne.

- `app/components/layout/Header.tsx`
- `app/components/layout/NotificationCenter.tsx`
- `app/components/shared/SimulateurBO.tsx`
- `app/utils/MotDePasseUniversel.ts`
- `app/utils/safeLocalStorage.ts`

## Mesures d'entrée et de sortie

| Métrique | Avant | Après |
|---|---|---|
| Fichiers de `frontend_src/src/app` (hors tests et `.d.ts`) | 519 | **420** |
| Hors parcours depuis les points d'entrée | 100 | **1** (conservé, documenté) |
| Lignes supprimées | — | **17 899** |
| Fichiers de plus de 400 lignes | 124 | **116** |
| `fetch()` hors `services/api/` | 222 appels / 68 fichiers | **218 / 64** |
| `any` sur les parcours d'argent | 440 | **433** |
| Poids de `frontend/dist` | 18 304 Ko | **18 264 Ko** |

## Ce que ces chiffres disent vraiment

**Le poids n'a bougé que de 40 Ko.** Il faut le dire net : ce code mort ne pesait
pas sur l'APK — le bundler l'écartait déjà. Il pesait sur le **lecteur**. Sa
suppression n'accélère rien ; elle enlève ce qui trompe : un micro qui ne
répond pas, un fichier qui s'annonce « source unifiée » et que personne ne lit,
deux `useDevMode`, un mot de passe universel côté téléphone.

Les métriques 5 et 6 bougent à peine, et c'est attendu : **les `fetch()`
dispersés et les `any` sont dans le code VIVANT**, pas dans le code mort. Ils
sont l'objet des axes 2 et 4.

Correction d'une de mes mesures d'entrée : j'avais annoncé **415** `any` ; le
même motif de recherche appliqué des deux côtés en donne **440** avant, 433
après. Le 415 venait d'un motif plus étroit. La bonne paire est 440 → 433.

## Portes franchies

- `node ci/check-tsc-baseline.mjs` — 0 erreur, cliquet tenu
- `npm run test:ci -w frontend_src` (gelé) — vert
- `npm run verify -w frontend_src` (54 scripts) — vert
- `npm run build -w frontend_src` — vert, 184 chunks + 137 clips voix pré-cachés

Aucun test n'a été modifié, ajouté ni supprimé. Mêmes tests à l'entrée qu'à la sortie.

## Question ouverte pour Patrick

Douze des fichiers supprimés étaient des **doublons remplacés**, donc sans
décision de produit à prendre. Mais dix portaient du **contenu de formation**
(`academy/formations/*`, `quizData.ts`) : ce n'est pas du code, c'est de la
matière pédagogique qui n'a jamais été branchée. Je l'ai sortie du code parce
qu'elle y était inatteignable, pas parce qu'elle est sans valeur. Si ce contenu
doit vivre, il vaut mieux qu'il vive **à côté de l'académie qui tourne**
(`academyConfig`/`academyQuestions`) que dans un second jeu de fichiers muets.
Dis-moi si tu veux que je l'y reverse — c'est un arbitrage de contenu, il est à toi.
