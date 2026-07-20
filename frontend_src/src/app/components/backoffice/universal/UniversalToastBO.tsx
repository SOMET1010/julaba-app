import React from 'react';
import { motion } from 'motion/react';
import { toast as sonnerToast } from 'sonner';
import { AlertCircle, AlertTriangle, CheckCircle2, Flag, Info, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { STATUT_CONFIG, TYPE_COLORS } from '../../../utils/role-config';
import { BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'signalement';

const variantBg = (color: string) => `color-mix(in srgb, ${color} 12%, white)`;

const VARIANT_CONFIG: Record<ToastVariant, { icon: LucideIcon; iconColor: string; bgColor: string; titleColor: string }> = {
  success: { icon: CheckCircle2, iconColor: STATUT_CONFIG.actif.dotColor, bgColor: variantBg(STATUT_CONFIG.actif.dotColor), titleColor: STATUT_CONFIG.actif.dotColor },
  error: { icon: AlertCircle, iconColor: STATUT_CONFIG.suspendu.dotColor, bgColor: variantBg(STATUT_CONFIG.suspendu.dotColor), titleColor: STATUT_CONFIG.suspendu.dotColor },
  warning: { icon: AlertTriangle, iconColor: STATUT_CONFIG.en_attente.dotColor, bgColor: variantBg(STATUT_CONFIG.en_attente.dotColor), titleColor: TYPE_COLORS.operateur_terrain },
  info: { icon: Info, iconColor: TYPE_COLORS.admin_national, bgColor: variantBg(TYPE_COLORS.admin_national), titleColor: TYPE_COLORS.admin_national },
  loading: { icon: Loader2, iconColor: BO_PRIMARY, bgColor: BO_TINT, titleColor: BO_PRIMARY },
  signalement: { icon: Flag, iconColor: TYPE_COLORS.operateur_terrain, bgColor: variantBg(TYPE_COLORS.operateur_terrain), titleColor: TYPE_COLORS.operateur_terrain },
};

export interface UniversalToastBOOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function ToastContent({
  variant,
  title,
  description,
  action,
}: {
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: UniversalToastBOOptions['action'];
}) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const isLoading = variant === 'loading';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: config.bgColor,
        borderRadius: 16,
        boxShadow: `0 4px 12px color-mix(in srgb, ${BO_PRIMARY} 14%, transparent)`,
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      <motion.div
        animate={isLoading ? { rotate: 360 } : { scale: [1, 1.1, 1] }}
        transition={isLoading
          ? { duration: 1, repeat: Infinity, ease: 'linear' }
          : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
        style={{ display: 'inline-flex', flexShrink: 0, marginTop: 1 }}
      >
        <Icon size={20} style={{ color: config.iconColor }} />
      </motion.div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: config.titleColor, lineHeight: 1.3 }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 13, color: BO_MEDIUM, marginTop: 4, lineHeight: 1.4 }}>
            {description}
          </div>
        )}
        {action && (
          <motion.button
            type="button"
            onClick={action.onClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 8,
              padding: '5px 12px',
              background: 'var(--color-white)',
              border: `1px solid color-mix(in srgb, ${config.iconColor} 25%, transparent)`,
              color: config.titleColor,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {action.label}
          </motion.button>
        )}
      </div>
    </div>
  );
}

export const UniversalToastBO = {
  success: (opts: UniversalToastBOOptions) => sonnerToast.custom(
    () => <ToastContent variant="success" title={opts.title} description={opts.description} action={opts.action} />,
    { duration: opts.duration ?? 4000, position: 'bottom-right' },
  ),
  error: (opts: UniversalToastBOOptions) => sonnerToast.custom(
    () => <ToastContent variant="error" title={opts.title} description={opts.description} action={opts.action} />,
    { duration: opts.duration ?? 5000, position: 'bottom-right' },
  ),
  warning: (opts: UniversalToastBOOptions) => sonnerToast.custom(
    () => <ToastContent variant="warning" title={opts.title} description={opts.description} action={opts.action} />,
    { duration: opts.duration ?? 4500, position: 'bottom-right' },
  ),
  info: (opts: UniversalToastBOOptions) => sonnerToast.custom(
    () => <ToastContent variant="info" title={opts.title} description={opts.description} action={opts.action} />,
    { duration: opts.duration ?? 4000, position: 'bottom-right' },
  ),
  loading: (opts: UniversalToastBOOptions) => sonnerToast.custom(
    () => <ToastContent variant="loading" title={opts.title} description={opts.description} />,
    { duration: opts.duration ?? Infinity, position: 'bottom-right' },
  ),
  signalement: (opts: UniversalToastBOOptions) => sonnerToast.custom(
    () => <ToastContent variant="signalement" title={opts.title} description={opts.description} action={opts.action} />,
    { duration: opts.duration ?? 5000, position: 'bottom-right' },
  ),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};

export default UniversalToastBO;
