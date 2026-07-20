/**
 * 🎨 JULABA DESIGN SYSTEM
 * 
 * Système de design tokens centralisé pour garantir 
 * une cohérence visuelle à 100% entre tous les rôles.
 * 
 * Basé sur le Design System du profil Marchand.
 */

// ============================================
// 🎨 COULEURS PAR RÔLE
// ============================================

export const ROLE_COLORS = {
  marchand: '#C46210',
  producteur: '#00563B',
  cooperative: '#2072AF',
  institution: '#702963',
  identificateur: '#9F8170',
} as const;

export type UserRole = keyof typeof ROLE_COLORS;

// ============================================
// 🎨 COULEURS SÉMANTIQUES (Neutres)
// ============================================

export const COLORS = {
  // Gris neutres
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // États
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Fond
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },
  
  // Texte
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
} as const;

// ============================================
// 📏 SPACING SCALE
// ============================================

export const SPACING = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
} as const;

// ============================================
// 🔲 BORDER RADIUS
// ============================================

export const RADIUS = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
} as const;

// ============================================
// 🌑 SHADOWS
// ============================================

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
  
  // Shadows spéciales
  bottomBar: '0 -4px 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.08)',
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  cardHover: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// ============================================
// 🔤 TYPOGRAPHIE
// ============================================

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace',
  },
  
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

// ============================================
// 🎬 MOTION & ANIMATIONS
// ============================================

export const MOTION = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 400,
    slowest: 500,
  },
  
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // Présets d'animation Motion (Framer Motion)
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
  
  springStiff: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
  },
  
  springSoft: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },
  
  // Scale animations
  tap: { scale: 0.97 },
  tapMicro: { scale: 0.98 },
  hover: { scale: 1.02 },
  hoverMicro: { scale: 1.01 },
} as const;

// ============================================
// 📐 Z-INDEX
// ============================================

/**
 * HIÉRARCHIE Z-INDEX JULABA — NE PAS MODIFIER SANS RAISON
 *
 * Header:          40
 * Sidebar:         45
 * BottomBar:       50
 * Popover:         60
 * Toast:           70
 * Tooltip:         80
 * ModalBackdrop:  200   ← tous les backdrops
 * Modal:          210   ← toutes les cartes de modal
 * ModalTop:       220   ← modal sur modal (rare)
 * DevTools:      9999
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  header: 40,
  sidebar: 45,
  bottomBar: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  modalBackdrop: 200,
  modal: 210,
  modalTop: 220,
  max: 9999,
} as const;

// ============================================
// 📱 BREAKPOINTS
// ============================================

export const BREAKPOINTS = {
  sm: 640,   // Mobile
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1280,  // Large Desktop
  '2xl': 1536, // Extra Large
} as const;

export const MEDIA_QUERIES = {
  mobile: `@media (max-width: ${BREAKPOINTS.sm - 1}px)`,
  tablet: `@media (min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.lg}px)`,
  largeDesktop: `@media (min-width: ${BREAKPOINTS.xl}px)`,
} as const;

// ============================================
// 📏 LAYOUT GRID
// ============================================

export const GRID = {
  mobile: {
    columns: 4,
    gutter: 16,
    margin: 20,
  },
  tablet: {
    columns: 8,
    gutter: 20,
    margin: 40,
  },
  desktop: {
    columns: 12,
    gutter: 24,
    margin: 80,
    maxWidth: 1280,
    containerMaxWidth: 1440,
  },
} as const;

// ============================================
// 🎯 HELPER FUNCTIONS
// ============================================

/**
 * Obtenir la couleur primaire d'un rôle
 */
export function getRoleColor(role: UserRole | string): string {
  return ROLE_COLORS[role as UserRole] || ROLE_COLORS.marchand;
}

/**
 * Générer une couleur primaire avec opacité
 */
export function getRoleColorWithOpacity(role: UserRole | string, opacity: number): string {
  const color = getRoleColor(role);
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Générer un gradient de fond pour un rôle
 */
export function getRoleGradient(role: UserRole | string): string {
  const color = getRoleColor(role);
  return `linear-gradient(to bottom, ${color}10, #FFFFFF)`;
}

// ============================================
// 📦 COMPOSANT VARIANTS
// ============================================

export const COMPONENT_VARIANTS = {
  button: {
    primary: {
      solid: 'bg-[var(--role-color)] text-white hover:opacity-90',
      outline: 'border-2 border-[var(--role-color)] text-[var(--role-color)] bg-transparent hover:bg-[var(--role-color)] hover:text-white',
      ghost: 'text-[var(--role-color)] bg-transparent hover:bg-[var(--role-color)]10',
    },
    secondary: {
      solid: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      outline: 'border-2 border-gray-300 text-gray-700 bg-transparent hover:bg-gray-100',
      ghost: 'text-gray-700 bg-transparent hover:bg-gray-100',
    },
    danger: {
      solid: 'bg-red-500 text-white hover:bg-red-600',
      outline: 'border-2 border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-white',
      ghost: 'text-red-500 bg-transparent hover:bg-red-50',
    },
  },
  
  card: {
    default: 'bg-white rounded-2xl shadow-card hover:shadow-cardHover transition-shadow',
    elevated: 'bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all',
    flat: 'bg-white rounded-2xl border-2 border-gray-200',
  },
  
  badge: {
    default: 'px-3 py-1 rounded-full text-sm font-semibold',
    primary: 'bg-[var(--role-color)]10 text-[var(--role-color)]',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    error: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-700',
  },
} as const;