/**
 * 📦 JULABA SHARED COMPONENTS
 * 
 * Export centralisé de tous les composants partagés
 */

export { SharedButton } from './Button';
export type { SharedButtonProps } from './Button';

export { SharedCard } from './Card';
export type { SharedCardProps } from './Card';

export { Montant, MontantCard } from './Montant';
export type { MontantSize } from './Montant';

export { SharedBadge } from './Badge';
export type { SharedBadgeProps } from './Badge';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { SharedModal } from './Modal';
export type { SharedModalProps } from './Modal';

export { SharedInput } from './Input';
export type { SharedInputProps } from './Input';

export { Toast, useToast } from './Toast';
export type { ToastProps } from './Toast';

export { 
  Skeleton, 
  SkeletonKPI, 
  SkeletonCard, 
  SkeletonList 
} from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { ProfessionalCard } from './ProfessionalCard';
export type { ProfessionalCardProps, ProfessionalCardData } from './ProfessionalCard';

// 🌐 COMPOSANTS UNIVERSELS - S'adaptent à tous les rôles
export { UniversalProfil } from './UniversalProfil';
export { ScoreBreakdown } from './ScoreBreakdown';
export { CompactProfileCard } from './CompactProfileCard';