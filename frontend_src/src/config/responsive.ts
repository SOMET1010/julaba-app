/**
 * 🎨 JULABA - Configuration Responsive
 * 
 * ⚠️ RÈGLE STRICTE : NE JAMAIS TOUCHER AU MOBILE (< 768px)
 * 
 * Breakpoints Tailwind :
 * - Mobile:    < 640px  (sm) - INTOUCHABLE
 * - Phablet:   640-768px (sm-md) - INTOUCHABLE  
 * - Tablette:  768-1024px (md-lg) - OPTIMISATIONS ICI
 * - Desktop:   1024-1280px (lg-xl) - OPTIMISATIONS ICI
 * - Large:     1280-1536px (xl-2xl) - OPTIMISATIONS ICI
 * - XLarge:    > 1536px (2xl+) - OPTIMISATIONS ICI
 */

// ============================================================
// 📐 MAX-WIDTH PAR TYPE DE PAGE
// ============================================================

/**
 * Layouts responsive par contexte
 * Base mobile (max-w-2xl) reste INTACTE
 */
export const RESPONSIVE_LAYOUTS = {
  // Pages Dashboard (Accueil, Stats)
  dashboard: "max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl",
  
  // Pages avec listes (Stock, Membres, Identifications)
  list: "max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl",
  
  // Pages formulaires (Identification, Profil)
  form: "max-w-2xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl",
  
  // Pages profil (Moi)
  profile: "max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl",
  
  // Modals/Dialogs
  modal: "max-w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl",
  
  // Modals larges (avec beaucoup de contenu)
  modalLarge: "max-w-full md:max-w-3xl lg:max-w-4xl xl:max-w-5xl",
  
  // Pages spécifiques (Fiche marchand, détails)
  detail: "max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl",
} as const;

// ============================================================
// 📏 PADDING & SPACING
// ============================================================

/**
 * Padding responsive pour les pages
 * Base mobile (px-4, pb-32, pt-12) reste INTACTE
 */
export const RESPONSIVE_PADDING = {
  // Padding horizontal (avec compensation sidebar desktop)
  pageX: "px-4 md:px-6 lg:pl-[280px] xl:pl-[320px]",
  
  // Padding bottom (éviter le BottomBar mobile)
  pageBottom: "pb-32 lg:pb-8",
  
  // Padding top (header/spacing)
  pageTop: "pt-12 lg:pt-16",
  
  // Padding combiné complet pour une page
  pageFull: "px-4 md:px-6 lg:pl-[280px] xl:pl-[320px] pb-32 lg:pb-8 pt-12 lg:pt-16",
  
  // Padding pour les headers fixes
  headerX: "px-4 md:px-6 lg:pl-[280px] xl:pl-[320px]",
  
  // Padding pour les containers internes
  containerX: "px-4 md:px-6 lg:px-8",
  containerY: "py-4 md:py-6 lg:py-8",
} as const;

// ============================================================
// 🎴 GRIDS RESPONSIVE
// ============================================================

/**
 * Grilles responsive par contexte
 * Base mobile reste INTACTE (grid-cols-1 ou grid-cols-2)
 */
export const RESPONSIVE_GRIDS = {
  // Stats cards (2 colonnes mobile → jusqu'à 4 desktop)
  stats: "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  
  // Stats cards large (1 colonne mobile → jusqu'à 3 desktop)
  statsLarge: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  
  // Product cards / Items (2 colonnes mobile → jusqu'à 4 desktop)
  products: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  
  // Liste membres/producteurs (1 colonne mobile → 2 desktop)
  members: "grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2",
  
  // Features/Actions (2 colonnes mobile → jusqu'à 4 desktop)
  features: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  
  // Menu actions (2 colonnes mobile → jusqu'à 3 desktop)
  menuActions: "grid-cols-2 md:grid-cols-2 lg:grid-cols-3",
} as const;

// ============================================================
// 📱 SIDEBAR DIMENSIONS
// ============================================================

/**
 * Dimensions de la Sidebar
 * Mobile : masquée (BottomBar à la place)
 * Tablette : masquée (BottomBar à la place)
 * Desktop : visible avec largeur adaptative
 */
export const SIDEBAR_WIDTH = {
  // Largeur sidebar desktop
  desktop: "lg:w-[280px] xl:w-[320px]",
  
  // Padding left des pages pour compenser sidebar
  pageOffset: "lg:pl-[280px] xl:pl-[320px]",
  
  // Version collapsée (future feature)
  collapsed: "lg:w-20",
  collapsedPageOffset: "lg:pl-20",
} as const;

// ============================================================
// 🖼️ IMAGES & MÉDIAS
// ============================================================

/**
 * Tailles responsive pour images et médias
 * Base mobile reste INTACTE
 */
export const RESPONSIVE_IMAGES = {
  // Tata Lou image (cards dashboard)
  tataLou: "w-32 md:w-36 lg:w-40 xl:w-44",
  
  // Tata Lou modal (grande image)
  tataLouModal: "w-40 md:w-48 lg:w-56 xl:w-64",
  
  // Logos principaux
  logo: "h-12 md:h-14 lg:h-16",
  
  // Logos secondaires
  logoSmall: "h-8 md:h-10 lg:h-12",
  
  // Avatar utilisateur
  avatar: "w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24",
  
  // Icônes dans cards
  iconCard: "w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16",
} as const;

// ============================================================
// 📝 TYPOGRAPHIE
// ============================================================

/**
 * Tailles de texte responsive
 * Base mobile reste INTACTE pour la lisibilité
 * Ajustements légers pour grands écrans uniquement
 */
export const RESPONSIVE_TEXT = {
  // Titres principaux (H1)
  h1: "text-[28px] md:text-3xl lg:text-4xl xl:text-5xl",
  
  // Titres secondaires (H2)
  h2: "text-2xl md:text-2xl lg:text-3xl xl:text-4xl",
  
  // Titres tertiaires (H3)
  h3: "text-xl md:text-xl lg:text-2xl xl:text-3xl",
  
  // Sous-titres
  subtitle: "text-lg md:text-lg lg:text-xl",
  
  // Body text - PAS DE CHANGEMENT (Inter optimal à 16px)
  body: "text-base",
  
  // Small text
  small: "text-sm",
  
  // Tiny text
  tiny: "text-xs",
} as const;

// ============================================================
// 🎯 MODALS & DIALOGS
// ============================================================

/**
 * Configuration responsive pour modals
 * Mobile : plein écran
 * Tablette+ : format card centré
 */
export const RESPONSIVE_MODAL = {
  // Container du modal
  container: "fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6",
  
  // Contenu du modal - standard
  content: "relative w-full h-full max-w-full md:max-w-2xl md:h-auto md:rounded-3xl lg:max-w-3xl xl:max-w-4xl",
  
  // Contenu du modal - large
  contentLarge: "relative w-full h-full max-w-full md:max-w-3xl md:h-auto md:rounded-3xl lg:max-w-4xl xl:max-w-5xl",
  
  // Contenu du modal - small
  contentSmall: "relative w-full h-full max-w-full md:max-w-lg md:h-auto md:rounded-3xl lg:max-w-xl",
  
  // Padding interne
  padding: "p-6 md:p-8 lg:p-10",
} as const;

// ============================================================
// 🎨 CARDS & CONTAINERS
// ============================================================

/**
 * Styles responsive pour cards et containers
 */
export const RESPONSIVE_CARDS = {
  // Padding de card standard
  padding: "p-4 md:p-5 lg:p-6",
  
  // Padding de card large
  paddingLarge: "p-6 md:p-8 lg:p-10",
  
  // Gap entre éléments
  gap: "gap-3 md:gap-4 lg:gap-5",
  
  // Gap small
  gapSmall: "gap-2 md:gap-3 lg:gap-4",
  
  // Border radius
  rounded: "rounded-2xl md:rounded-3xl",
} as const;

// ============================================================
// 🔧 UTILITAIRES
// ============================================================

/**
 * Fonction helper pour combiner classes responsive
 */
export function getResponsiveClass(
  type: keyof typeof RESPONSIVE_LAYOUTS,
  additionalClasses = ''
): string {
  return `${RESPONSIVE_LAYOUTS[type]} ${additionalClasses}`.trim();
}

/**
 * Fonction helper pour obtenir padding complet d'une page
 */
export function getPageClasses(
  layoutType: keyof typeof RESPONSIVE_LAYOUTS = 'dashboard',
  includeMinHeight = true
): string {
  const classes = [
    RESPONSIVE_PADDING.pageFull,
    RESPONSIVE_LAYOUTS[layoutType],
    'mx-auto',
  ];
  
  if (includeMinHeight) {
    classes.push('min-h-screen');
  }
  
  return classes.join(' ');
}

/**
 * Fonction helper pour classes de header fixe
 */
export function getHeaderClasses(role?: string): string {
  const baseClasses = [
    'fixed top-0 left-0 right-0 z-40',
    'backdrop-blur-md bg-white/80',
    RESPONSIVE_PADDING.headerX,
    'py-5',
  ];
  
  return baseClasses.join(' ');
}
