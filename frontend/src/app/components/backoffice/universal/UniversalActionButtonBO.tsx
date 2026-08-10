import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { STATUT_CONFIG, TYPE_COLORS } from '../../../utils/role-config';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const CONTRAST_TEXT = 'var(--color-white)';
const TRANSPARENT_BG = 'transparent';

const shade = (color: string) => `color-mix(in srgb, ${color} 84%, black)`;
const tint = (color: string) => `color-mix(in srgb, ${color} 12%, white)`;

const VARIANT_CONFIG: Record<ButtonVariant, { bg: string; bgHover: string; text: string; border: string; iconColor: string }> = {
  primary: { bg: BO_PRIMARY, bgHover: shade(BO_PRIMARY), text: CONTRAST_TEXT, border: BO_PRIMARY, iconColor: CONTRAST_TEXT },
  secondary: { bg: BO_TINT, bgHover: tint(BO_MEDIUM), text: BO_PRIMARY, border: BO_LIGHT, iconColor: BO_PRIMARY },
  success: { bg: STATUT_CONFIG.actif.dotColor, bgHover: shade(STATUT_CONFIG.actif.dotColor), text: CONTRAST_TEXT, border: STATUT_CONFIG.actif.dotColor, iconColor: CONTRAST_TEXT },
  warning: { bg: TYPE_COLORS.operateur_terrain, bgHover: shade(TYPE_COLORS.operateur_terrain), text: CONTRAST_TEXT, border: TYPE_COLORS.operateur_terrain, iconColor: CONTRAST_TEXT },
  danger: { bg: STATUT_CONFIG.suspendu.dotColor, bgHover: shade(STATUT_CONFIG.suspendu.dotColor), text: CONTRAST_TEXT, border: STATUT_CONFIG.suspendu.dotColor, iconColor: CONTRAST_TEXT },
  info: { bg: TYPE_COLORS.admin_national, bgHover: shade(TYPE_COLORS.admin_national), text: CONTRAST_TEXT, border: TYPE_COLORS.admin_national, iconColor: CONTRAST_TEXT },
  ghost: { bg: TRANSPARENT_BG, bgHover: BO_TINT, text: BO_PRIMARY, border: TRANSPARENT_BG, iconColor: BO_PRIMARY },
};

const SIZE_CONFIG: Record<ButtonSize, { padding: string; fontSize: number; iconSize: number; borderRadius: number; gap: number }> = {
  sm: { padding: '6px 12px', fontSize: 12, iconSize: 14, borderRadius: 8, gap: 6 },
  md: { padding: '10px 20px', fontSize: 14, iconSize: 16, borderRadius: 12, gap: 8 },
  lg: { padding: '14px 24px', fontSize: 15, iconSize: 18, borderRadius: 16, gap: 10 },
};

export interface UniversalActionButtonBOProps {
  label: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  iconAnimated?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

function AnimatedButtonIcon({
  icon: Icon,
  size,
  color,
  loading,
  animated,
}: {
  icon: LucideIcon;
  size: number;
  color: string;
  loading?: boolean;
  animated?: boolean;
}) {
  return (
    <motion.div
      animate={loading ? { rotate: 360 } : animated ? { scale: [1, 1.08, 1] } : {}}
      transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <Icon size={size} style={{ color }} />
    </motion.div>
  );
}

export function UniversalActionButtonBO({
  label,
  icon: Icon,
  iconPosition = 'left',
  iconAnimated = true,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  ariaLabel,
}: UniversalActionButtonBOProps) {
  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const isInteractive = !disabled && !loading;
  const DisplayIcon = loading ? Loader2 : Icon;
  const displayLabel = loading ? 'En cours...' : label;

  const iconElement = DisplayIcon ? (
    <AnimatedButtonIcon
      icon={DisplayIcon}
      size={sizeConfig.iconSize}
      color={isInteractive ? variantConfig.iconColor : BO_MEDIUM}
      loading={loading}
      animated={iconAnimated}
    />
  ) : null;

  return (
    <Button asChild>
      <motion.button
        type={type}
        onClick={isInteractive ? onClick : undefined}
        disabled={!isInteractive}
        whileHover={isInteractive ? { scale: 1.02, y: -1, backgroundColor: variantConfig.bgHover } : { scale: 1 }}
        whileTap={isInteractive ? { scale: 0.97 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
        aria-label={ariaLabel || label}
        aria-busy={loading}
        className="transition-all"
        style={{
          background: isInteractive ? variantConfig.bg : BO_TINT,
          color: isInteractive ? variantConfig.text : BO_MEDIUM,
          border: `2px solid ${isInteractive ? variantConfig.border : BO_LIGHT}`,
          padding: sizeConfig.padding,
          fontSize: sizeConfig.fontSize,
          fontWeight: 700,
          borderRadius: sizeConfig.borderRadius,
          cursor: isInteractive ? 'pointer' : 'not-allowed',
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sizeConfig.gap,
          whiteSpace: 'nowrap',
        }}
      >
        {iconPosition === 'left' && iconElement}
        <span>{displayLabel}</span>
        {iconPosition === 'right' && iconElement}
      </motion.button>
    </Button>
  );
}

export default UniversalActionButtonBO;
