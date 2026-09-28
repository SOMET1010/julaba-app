# MIGRATION_GUIDE.md — Consolidation du design system backoffice (INIT-018)

> **Statut : TERMINÉ le 2026-09-29.**
> Cette migration résout la dette `FRONT-NEW-2` (« 2 design systems BO parallèles »)
> identifiée par l'audit AUDIT-001.

## 1. Contexte initial

Avant INIT-018, deux couches UI cohabitaient pour le backoffice :

| Couche | Dossier | Rôle |
|---|---|---|
| Primitives shadcn | `src/app/components/ui/` (16 composants) | `Button`, `Card`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Tabs`, `Table`, `Avatar`, `Badge`, `Label`, `Input`, `Skeleton`, `Sonner`, etc. |
| Composites BO | `src/app/components/backoffice/universal/` (19 composants `Universal*BO.tsx`) | Wrappers de haut niveau qui consomment les primitives shadcn et y ajoutent le thème `BO_*` (`BO_PRIMARY`, `BO_TINT`, `BO_LIGHT`), les couleurs par rôle (`role-config.ts`), les animations framer-motion et des presets métier. |

L'audit AUDIT-001 qualifiait à tort cet empilement de « 2 design systems parallèles ».
En pratique, **les composites BO s'appuient déjà sur les primitives shadcn** (10 sur 19
importent explicitement un ou plusieurs composants de `components/ui/`). Le véritable
problème était plutôt :

1. **6 composants `Universal*BO` morts** (jamais importés hors du barrel `index.ts`)
   représentaient ~1 740 lignes de code mort maintenues en double.
2. **L'absence de documentation** explicite du contrat entre les deux couches laissait
   croire à un fork.

## 2. Décision

- **Supprimer les 6 composants `Universal*BO` morts** (voir §3) — gain net de
  maintenance sans aucune régression fonctionnelle.
- **Conserver les 13 composites BO vivants** dans `backoffice/universal/` (voir §4)
  parce qu'ils ne dupliquent pas shadcn mais l'enrichissent d'une couche métier
  (thème `BO_*`, `role-config`, presets, animations).
- **Documenter** le contrat deux-couches dans `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`,
  `DEBT_REPORT.md`, `TASKS.md` et le présent fichier.
- **Aucune migration** des composites BO vers les primitives shadcn « en place » :
  cela exigerait de réécrire les 11 écrans backoffice qui les consomment, avec un
  risque élevé de régression visuelle (animations, thème `BO_*`) pour un bénéfice
  nul (les composites utilisent déjà shadcn en interne).

## 3. Composants supprimés (6 — code mort)

| Composant | Lignes | Raison de la suppression |
|---|---|---|
| `UniversalSearchBarBO.tsx` | 437 | Remplacé en production par `UniversalRechercheBO` (consommé par 7 modules BO). Légué non supprimé lors d'une migration antérieure (mentionné dans `JULABA_DECISIONS.md`). |
| `UniversalFilterPanelBO.tsx` | 766 | Remplacé en production par `UniversalFiltreBO` (consommé par 7 modules BO). Légué non supprimé. |
| `UniversalBadgeBO.tsx` | 93 | Wrapper `Badge` + `STATUT_CONFIG`/`TYPE_COLORS` jamais consommé hors barrel. |
| `UniversalAvatarBO.tsx` | 140 | Wrapper `Avatar` + dot de statut jamais consommé hors barrel. |
| `UniversalTableBO.tsx` | 167 | Wrapper `Table` + colonnes typées jamais consommé hors barrel. |
| `UniversalToastBO.tsx` | 136 | API custom au-dessus de `sonner.custom` jamais consommée hors barrel. |
| **Total** | **1 739** | **Aucune référence de production, aucun test.** |

Vérification préalable : `rg "Universal(SearchBar|FilterPanel|Badge|Avatar|Table|Toast)BO"`
ne renvoie que les fichiers eux-mêmes, le barrel `index.ts` et `JULABA_DECISIONS.md`
(documentation narrative). Aucun écran BO, aucun test, aucune story.

## 4. Composants conservés (13 — composites vivants)

| Composant | Primitive shadcn sous-jacente | Spécificité métier ajoutée | Consommateurs BO |
|---|---|---|---|
| `UniversalModalBO` | `Dialog` | Layout modal (header icon+titre+subtitle, footer, bouton close), presets `sm/md/lg/xl`, animation `motion`, thème `BO_*`, contrôle escape/outside-click | `BOEnrolement`, `BOSupervision`, `BOZones` |
| `UniversalConfirmModalBO` | `AlertDialog` | Sévérités `info/warning/danger`, icône animée, thème `BO_*` | `BOActeurs`, `BOEnrolement`, `BOModeration`, `BOZones` |
| `UniversalActionWithReasonModalBO` | (compose `UniversalModalBO`) | Modale d'action avec champ raison + sévérité, validation | `BOEnrolement`, `BOSupervision`, `BOZones` |
| `UniversalActionButtonBO` | `Button` | Variantes `primary/secondary/danger/ghost/outline`, tailles `sm/md/lg/xl`, icône, full-width, animation | `BOActeurs`, `BOEnrolement`, `BOModeration` |
| `UniversalTabsBO` | `Tabs` | Onglets typés (`TabItem[]`) avec icône, badge, animation | `BOEnrolement`, `BOMarketplace` |
| `UniversalSectionCardBO` | `Card` | 7 variantes couleur (warm/info/success/warning/danger/violet), icône animée, option `shimmer`, presets padding | `BODashboard`, `BOEnrolement`, `BORapports`, `BOSupervision`, `BOSupervisionMap` |
| `UniversalSkeletonBO` | `Skeleton` | Presets `list/grid/detail/kpi` + compte | `BOActeurs`, `BOEnrolement` |
| `UniversalDropdownMenuBO` | `DropdownMenu` | Items typés (`DropdownEntry`), dividers, handlers, icônes | `BOActeurs`, `BOAudit`, `BOZones`, `BOEnrolement`, `BOSupervision`, `BODashboard`, `UniversalCardBO`, `UniversalCardBOZone` |
| `UniversalPaginationBO` | (aucune — Radix `Pagination` non embarquée dans `ui/`) | Pagination BO avec icônes, thème `BO_*`, jump-to-page | `BOActeurs`, `BOAudit`, `BOSupervision` |
| `UniversalErrorStateBO` | (aucune primitive équivalente) | États d'erreur typés (`network/not-found/forbidden/server/empty`), CTA recharger | `BOActeurs`, `BOEnrolement` |
| `UniversalDrawerBO` | (aucune — Radix `Dialog` sideVariants non embarqué) | Panneau latéral animé, thème `BO_*` | `BOSupervisionMap`, `LiveActivityDrawer` |
| `UniversalRechercheBO` | (composé à partir de `Input` + suggestions) | Recherche avec debounce, suggestions, état vide | `BOActeurs`, `BOAudit`, `BOEnrolement`, `BOMarketplace`, `BOModeration`, `BOSupervision`, `BOZones` |
| `UniversalFiltreBO` | (composé à partir de `Button` + popover custom) | Filtres multi-groupes, options + dates, reset | `BOActeurs`, `BOAudit`, `BOEnrolement`, `BOMarketplace`, `BOModeration`, `BOSupervision`, `BOZones` |

## 5. Contrat deux-couches (règle obligatoire)

- **Toute nouvelle primitive UI** (bouton, input, carte, etc.) va dans
  `components/ui/` (style shadcn, basée sur Radix + `cva`).
- **Tout nouveau composite BO** (qui consomme une ou plusieurs primitives +
  thématise `BO_*` + ajoute du métier `role-config`) va dans
  `components/backoffice/universal/` avec le préfixe `Universal*BO`.
- **Jamais de primitive Radix brute** dans un écran BO : passer par le composite
  `Universal*BO` correspondant pour garantir la cohérence du thème.
- Si un composite `Universal*BO` n'existe pas encore, le créer plutôt que d'utiliser
  la primitive shadcn directement dans l'écran.

## 6. Vérifications post-migration (2026-09-29)

- `npx tsc -b` : **0 erreur** (baseline identique).
- `npm run test:route-access` : vert ✅
- `npm run test:tokens` : vert ✅
- `npm run test:jargon` : vert ✅
- `npm run test:caisse-charte` : vert ✅
- `npm run check:bundle-budget` : vert ✅ (639 Ko / 800 Ko)

## 7. Suivi futur (hors INIT-018)

- Si l'on souhaite à terme supprimer les 13 composites restants pour n'avoir
  qu'une seule couche, il faudra :
  1. Étendre les primitives shadcn (`button.tsx`, `card.tsx`, etc.) avec les
     variantes `BO_*` via `cva` (couleurs, animations).
  2. Migrer les 11 écrans BO un par un (PR atomique par écran).
  3. Supprimer les composites BO devenus morts.
  Coût estimé : ~2 semaines. Bénéfice : marginal (la couche composite actuelle
  est fine et utilise déjà shadcn). Priorité : P3 (backlog).
