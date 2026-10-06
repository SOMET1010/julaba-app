import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { STATUT_CONFIG, TYPE_COLORS } from '../../../utils/role-config';
import { BO_LIGHT, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type SectionCardVariant = 'default' | 'warm' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

const CONTRAST_SURFACE = 'var(--color-white)';
const withAlpha = (color: string, alpha: string) => `${color}${alpha}`;

const VARIANT_CONFIG: Record<SectionCardVariant, { bg: string; border: string; iconColor: string; iconBg: string }> = {
  default: { bg: CONTRAST_SURFACE, border: BO_TINT, iconColor: BO_PRIMARY, iconBg: BO_TINT },
  warm: { bg: withAlpha(TYPE_COLORS.marchand, '14'), border: withAlpha(TYPE_COLORS.marchand, '40'), iconColor: TYPE_COLORS.marchand, iconBg: withAlpha(TYPE_COLORS.marchand, '18') },
  info: { bg: withAlpha(TYPE_COLORS.admin_national, '12'), border: withAlpha(TYPE_COLORS.admin_national, '35'), iconColor: TYPE_COLORS.admin_national, iconBg: withAlpha(TYPE_COLORS.admin_national, '18') },
  success: { bg: withAlpha(STATUT_CONFIG.actif.dotColor, '12'), border: withAlpha(STATUT_CONFIG.actif.dotColor, '35'), iconColor: STATUT_CONFIG.actif.dotColor, iconBg: withAlpha(STATUT_CONFIG.actif.dotColor, '18') },
  warning: { bg: withAlpha(TYPE_COLORS.operateur_terrain, '12'), border: withAlpha(TYPE_COLORS.operateur_terrain, '35'), iconColor: TYPE_COLORS.operateur_terrain, iconBg: withAlpha(TYPE_COLORS.operateur_terrain, '18') },
  danger: { bg: withAlpha(STATUT_CONFIG.suspendu.dotColor, '12'), border: withAlpha(STATUT_CONFIG.suspendu.dotColor, '35'), iconColor: STATUT_CONFIG.suspendu.dotColor, iconBg: withAlpha(STATUT_CONFIG.suspendu.dotColor, '18') },
  violet: { bg: withAlpha(TYPE_COLORS.institution, '12'), border: withAlpha(TYPE_COLORS.institution, '35'), iconColor: TYPE_COLORS.institution, iconBg: withAlpha(TYPE_COLORS.institution, '18') },
};

const SHIMMER_CONFIG: Record<SectionCardVariant, { color: string; duration: number }> = {
  default: { color: 'rgba(107, 114, 128, 0.06)', duration: 16 },
  warm: { color: `${TYPE_COLORS.marchand}10`, duration: 18 },
  info: { color: `${TYPE_COLORS.admin_national}0E`, duration: 14 },
  success: { color: `${STATUT_CONFIG.actif.dotColor}0E`, duration: 20 },
  warning: { color: `${TYPE_COLORS.operateur_terrain}10`, duration: 12 },
  danger: { color: `${STATUT_CONFIG.suspendu.dotColor}10`, duration: 10 },
  violet: { color: `${TYPE_COLORS.institution}10`, duration: 16 },
};

export interface UniversalSectionCardBOProps {
  title: string;
  icon?: LucideIcon;
  iconAnimated?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: SectionCardVariant;
  noPadding?: boolean;
  delay?: number;
  shimmer?: boolean;
  className?: string;
}

function AnimatedIcon({
  icon: Icon,
  animated,
  color,
}: {
  icon: LucideIcon;
  animated: boolean;
  color: string;
}) {
  return (
    <motion.div
      animate={animated ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
    >
      <Icon size={18} style={{ color }} />
    </motion.div>
  );
}

export function UniversalSectionCardBO({
  title,
  icon: Icon,
  iconAnimated = true,
  headerActions,
  children,
  footer,
  variant = 'default',
  noPadding = false,
  delay = 0,
  shimmer = false,
  className = '',
}: UniversalSectionCardBOProps) {
  const config = VARIANT_CONFIG[variant];
  const shimmerConfig = SHIMMER_CONFIG[variant];

  return (
    <motion.div
      className={`h-full ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card
        className="rounded-3xl border-2 shadow-md gap-0 h-full flex flex-col"
        style={{
          background: config.bg,
          borderColor: config.border,
          boxShadow: variant === 'default' ? `0 4px 12px ${withAlpha(BO_PRIMARY, '10')}` : 'none',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {shimmer && (
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              background: `linear-gradient(110deg, transparent 0%, transparent 30%, ${shimmerConfig.color} 50%, transparent 70%, transparent 100%)`,
              backgroundSize: '300% 100%',
              zIndex: 1,
            }}
            animate={{
              backgroundPosition: ['100% 0%', '-100% 0%'],
            }}
            transition={{
              duration: shimmerConfig.duration,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}
        <CardHeader
          className="flex flex-row items-center justify-between"
          style={{
            gap: 12,
            padding: noPadding ? '20px 24px 12px' : '20px 24px 16px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {Icon && (
              <motion.div
                animate={iconAnimated ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: config.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AnimatedIcon icon={Icon} animated={iconAnimated} color={config.iconColor} />
              </motion.div>
            )}
            <CardTitle style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: 0, minWidth: 0 }}>
              {title}
            </CardTitle>
          </div>
          {headerActions && <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{headerActions}</div>}
        </CardHeader>

        <CardContent style={{ padding: noPadding ? 0 : '0 24px 20px', position: 'relative', zIndex: 2, flex: 1 }}>
          {children}
        </CardContent>

        {footer && (
          <CardFooter style={{ borderTop: `1px solid ${withAlpha(BO_PRIMARY, '10')}`, padding: '12px 24px', position: 'relative', zIndex: 2 }}>
            {footer}
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}

export default UniversalSectionCardBO;
