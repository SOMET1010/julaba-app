import React from 'react';
import { motion } from 'motion/react';
import { MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { STATUT_CONFIG, TYPE_COLORS } from '../../../utils/role-config';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type DropdownItemType = 'default' | 'danger' | 'success' | 'info';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  type?: DropdownItemType;
  disabled?: boolean;
  onClick: () => void;
}

export interface DropdownDivider {
  id: string;
  divider: true;
}

export type DropdownEntry = DropdownItem | DropdownDivider;

export interface UniversalDropdownMenuBOProps {
  trigger?: React.ReactNode;
  triggerAriaLabel?: string;
  items: DropdownEntry[];
  align?: 'left' | 'right';
  minWidth?: number;
}

const TYPE_STYLES: Record<DropdownItemType, { color: string; hoverBg: string; iconColor: string }> = {
  default: { color: BO_PRIMARY, hoverBg: BO_TINT, iconColor: BO_MEDIUM },
  danger: { color: STATUT_CONFIG.suspendu.dotColor, hoverBg: `${STATUT_CONFIG.suspendu.dotColor}12`, iconColor: STATUT_CONFIG.suspendu.dotColor },
  success: { color: STATUT_CONFIG.actif.dotColor, hoverBg: `${STATUT_CONFIG.actif.dotColor}12`, iconColor: STATUT_CONFIG.actif.dotColor },
  info: { color: TYPE_COLORS.admin_national, hoverBg: `${TYPE_COLORS.admin_national}12`, iconColor: TYPE_COLORS.admin_national },
};

function isDivider(entry: DropdownEntry): entry is DropdownDivider {
  return (entry as DropdownDivider).divider === true;
}

function AnimatedIcon({ icon: Icon, size, color }: { icon: LucideIcon; size: number; color: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex', flexShrink: 0 }}
    >
      <Icon size={size} style={{ color }} />
    </motion.div>
  );
}

export function UniversalDropdownMenuBO({
  trigger,
  triggerAriaLabel = "Plus d'actions",
  items,
  align = 'right',
  minWidth = 200,
}: UniversalDropdownMenuBOProps) {
  const [open, setOpen] = React.useState(false);
  const contentAlign = align === 'right' ? 'end' : 'start';

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    setOpen(false);
    item.onClick();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05, backgroundColor: BO_TINT }}
          whileTap={{ scale: 0.9 }}
          aria-label={triggerAriaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center justify-center transition-all"
          style={{
            minWidth: trigger ? undefined : 32,
            width: trigger ? 'auto' : 32,
            height: trigger ? 'auto' : 32,
            borderRadius: trigger ? 12 : 8,
            border: trigger ? 'none' : `1px solid ${BO_LIGHT}`,
            background: trigger ? 'transparent' : 'var(--color-white)',
            cursor: 'pointer',
            padding: trigger ? 0 : undefined,
          }}
        >
          {trigger || <AnimatedIcon icon={MoreVertical} size={16} color={BO_MEDIUM} />}
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        asChild
        align={contentAlign}
        sideOffset={6}
        style={{
          minWidth,
          background: 'color-mix(in srgb, var(--color-white) 92%, transparent)',
          borderRadius: 16,
          border: `0.5px solid color-mix(in srgb, ${BO_LIGHT} 75%, transparent)`,
          boxShadow: `0 18px 48px color-mix(in srgb, ${BO_PRIMARY} 28%, transparent)`,
          padding: 6,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 100,
        } as React.CSSProperties}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map(entry => {
            if (isDivider(entry)) {
              return (
                <DropdownMenuSeparator
                  key={entry.id}
                  role="separator"
                  style={{ height: 0.5, background: `color-mix(in srgb, ${BO_LIGHT} 65%, transparent)`, margin: '4px 0' }}
                />
              );
            }

            const item = entry as DropdownItem;
            const itemType = item.type || 'default';
            const styles = TYPE_STYLES[itemType];
            const Icon = item.icon;

            return (
              <DropdownMenuItem
                key={item.id}
                asChild
                disabled={item.disabled}
                onSelect={(event) => event.preventDefault()}
              >
                <motion.button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  whileHover={!item.disabled ? { backgroundColor: styles.hoverBg } : { backgroundColor: 'transparent' }}
                  whileTap={!item.disabled ? { scale: 0.97 } : { scale: 1 }}
                  role="menuitem"
                  aria-disabled={item.disabled}
                  className="transition-all"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'transparent',
                    color: item.disabled ? BO_LIGHT : styles.color,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    {Icon && <AnimatedIcon icon={Icon} size={15} color={item.disabled ? BO_LIGHT : styles.iconColor} />}
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <DropdownMenuShortcut style={{ fontSize: 11, color: BO_MEDIUM, fontFamily: 'monospace', letterSpacing: 0 }}>
                      {item.shortcut}
                    </DropdownMenuShortcut>
                  )}
                </motion.button>
              </DropdownMenuItem>
            );
          })}
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UniversalDropdownMenuBO;
