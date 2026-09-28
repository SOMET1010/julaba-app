// Barrel d'exports du layer composite BO (INIT-018, 2026-09-29).
//
// Les composants `Universal*BO` de ce dossier sont des composites de haut
// niveau : ils s'appuient sur les primitives shadcn de `components/ui/`
// (Dialog, AlertDialog, DropdownMenu, Tabs, Table, Card, Button, Skeleton,
// Avatar, Badge) et y ajoutent une couche métier backoffice (thème `BO_*`,
// `role-config`, animations framer-motion, presets métier).
//
// Le double design system décrit par FRONT-NEW-2 est résorbé : il n'y a plus
// qu'un seul DS avec deux couches (primitives dans `ui/`, composites BO dans
// `backoffice/universal/`). Les composants legacy `UniversalSearchBarBO`,
// `UniversalFilterPanelBO`, `UniversalToastBO`, `UniversalBadgeBO`,
// `UniversalAvatarBO` et `UniversalTableBO` ont été supprimés (code mort,
// jamais importé hors de ce barrel).

export { UniversalModalBO, default as UniversalModalBODefault } from './UniversalModalBO';
export type { UniversalModalBOProps, ModalSize } from './UniversalModalBO';

export { UniversalConfirmModalBO, default as UniversalConfirmModalBODefault } from './UniversalConfirmModalBO';
export type { UniversalConfirmModalBOProps, ConfirmSeverity } from './UniversalConfirmModalBO';

export { UniversalActionButtonBO, default as UniversalActionButtonBODefault } from './UniversalActionButtonBO';
export type { UniversalActionButtonBOProps, ButtonVariant, ButtonSize } from './UniversalActionButtonBO';

export { UniversalTabsBO, default as UniversalTabsBODefault } from './UniversalTabsBO';
export type { UniversalTabsBOProps, TabItem, TabsOrientation } from './UniversalTabsBO';

export { UniversalSectionCardBO, default as UniversalSectionCardBODefault } from './UniversalSectionCardBO';
export type { UniversalSectionCardBOProps, SectionCardVariant } from './UniversalSectionCardBO';

export { UniversalSkeletonBO, default as UniversalSkeletonBODefault } from './UniversalSkeletonBO';
export type { UniversalSkeletonBOProps, SkeletonPreset } from './UniversalSkeletonBO';

export { UniversalDropdownMenuBO, default as UniversalDropdownMenuBODefault } from './UniversalDropdownMenuBO';
export type { UniversalDropdownMenuBOProps, DropdownItem, DropdownDivider, DropdownEntry, DropdownItemType } from './UniversalDropdownMenuBO';

export { UniversalPaginationBO, default as UniversalPaginationBODefault } from './UniversalPaginationBO';
export type { UniversalPaginationBOProps } from './UniversalPaginationBO';

export { UniversalErrorStateBO, default as UniversalErrorStateBODefault } from './UniversalErrorStateBO';
export type { UniversalErrorStateBOProps, ErrorType, ErrorLayout } from './UniversalErrorStateBO';

export { UniversalDrawerBO } from './UniversalDrawerBO';

export { UniversalRechercheBO, default as UniversalRechercheBODefault } from './UniversalRechercheBO';
export type { UniversalRechercheBOProps, SearchSuggestion } from './UniversalRechercheBO';

export { UniversalFiltreBO, default as UniversalFiltreBODefault } from './UniversalFiltreBO';
export type { UniversalFiltreBOProps, FilterGroup, FilterOption, FilterValue } from './UniversalFiltreBO';

export { default as UniversalActionWithReasonModalBO } from './UniversalActionWithReasonModalBO';
export type { UniversalActionWithReasonModalBOProps } from './UniversalActionWithReasonModalBO';
