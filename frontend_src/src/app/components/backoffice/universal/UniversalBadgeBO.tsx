import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Flag } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { STATUT_CONFIG, TYPE_COLORS, getRoleLabel } from '../../../utils/role-config';

export type BadgeVariant = 'status' | 'role' | 'count' | 'flag' | 'custom';
export type BadgeSize = 'sm' | 'md';

export interface UniversalBadgeBOProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  status?: string;
  role?: string;
  count?: number;
  flagCount?: number;
  flagTooltip?: string;
  customLabel?: string;
  customIcon?: LucideIcon;
  customBgClass?: string;
  customTextClass?: string;
  animated?: boolean;
  tooltip?: string;
}

export function UniversalBadgeBO(props: UniversalBadgeBOProps) {
  const size = props.size || 'sm';
  const fontSize = size === 'sm' ? 10 : 12;
  const iconSize = size === 'sm' ? 10 : 12;
  const padding = size === 'sm' ? '2px 7px' : '4px 10px';
  const borderRadius = size === 'sm' ? 6 : 8;

  let label = '';
  let bgClass = '';
  let textClass = '';
  let Icon: LucideIcon | null = null;
  let style: React.CSSProperties = {};
  let displayTooltip = props.tooltip;

  if (props.variant === 'status' && props.status) {
    const config = STATUT_CONFIG[props.status];
    if (config) {
      label = config.label;
      bgClass = config.bg;
      textClass = config.text;
      Icon = config.icon;
    }
  } else if (props.variant === 'role' && props.role) {
    label = getRoleLabel(props.role);
    const color = TYPE_COLORS[props.role] || TYPE_COLORS.administrateur;
    style = { background: `${color}15`, color };
  } else if (props.variant === 'count' && typeof props.count === 'number') {
    label = String(props.count);
    bgClass = STATUT_CONFIG.rejete.bg;
    textClass = STATUT_CONFIG.rejete.text;
  } else if (props.variant === 'flag') {
    label = props.flagCount ? String(props.flagCount) : 'Signalé';
    bgClass = STATUT_CONFIG.suspendu.bg;
    textClass = STATUT_CONFIG.suspendu.text;
    Icon = Flag;
    displayTooltip = props.flagTooltip || props.tooltip;
  } else if (props.variant === 'custom') {
    label = props.customLabel || '';
    bgClass = props.customBgClass || STATUT_CONFIG.rejete.bg;
    textClass = props.customTextClass || STATUT_CONFIG.rejete.text;
    Icon = props.customIcon || null;
  }

  const iconElement = Icon ? (
    <motion.div
      animate={props.animated ? { scale: [1, 1.1, 1] } : {}}
      transition={props.animated ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
    >
      <Icon size={iconSize} />
    </motion.div>
  ) : null;

  return (
    <Badge
      className={`${bgClass} ${textClass} inline-flex items-center gap-1 border-transparent`}
      style={{ padding, borderRadius, fontSize, fontWeight: 700, ...style }}
      title={displayTooltip}
    >
      {iconElement}
      {label}
    </Badge>
  );
}

export default UniversalBadgeBO;
