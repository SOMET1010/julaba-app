import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsContent } from '../../ui/tabs';
import { STATUT_CONFIG, TYPE_COLORS } from '../../../utils/role-config';
import { BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type TabsOrientation = 'vertical' | 'horizontal';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  badgeColor?: 'red' | 'green' | 'amber' | 'blue' | 'gray' | string;
  tabColor?: string;
  disabled?: boolean;
  hidden?: boolean;
  content?: React.ReactNode;
}

export interface UniversalTabsBOProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  orientation?: TabsOrientation;
  iconAnimated?: boolean;
  lazyContent?: boolean;
}

const withAlpha = (color: string, alpha: string) => `${color}${alpha}`;

const BADGE_COLORS = {
  red: { bg: withAlpha(STATUT_CONFIG.suspendu.dotColor, '18'), text: STATUT_CONFIG.suspendu.dotColor },
  green: { bg: withAlpha(STATUT_CONFIG.actif.dotColor, '18'), text: STATUT_CONFIG.actif.dotColor },
  amber: { bg: withAlpha(TYPE_COLORS.operateur_terrain, '18'), text: TYPE_COLORS.operateur_terrain },
  blue: { bg: withAlpha(TYPE_COLORS.admin_national, '18'), text: TYPE_COLORS.admin_national },
  gray: { bg: BO_TINT, text: BO_MEDIUM },
};

function resolveBadgeStyle(tabColor?: string, badgeColor?: string) {
  if (badgeColor && badgeColor in BADGE_COLORS) {
    return BADGE_COLORS[badgeColor as keyof typeof BADGE_COLORS];
  }
  const accent = badgeColor || tabColor || BO_PRIMARY;
  return { bg: withAlpha(accent, '18'), text: accent };
}

export function UniversalTabsBO({
  tabs,
  activeId,
  onChange,
  orientation = 'vertical',
  iconAnimated = true,
  lazyContent = true,
}: UniversalTabsBOProps) {
  const visibleTabs = tabs.filter(tab => !tab.hidden);
  const hasContent = visibleTabs.some(tab => tab.content !== undefined);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const renderContent = () => {
    if (!hasContent) return null;
    return visibleTabs.map(tab => {
      if (lazyContent && tab.id !== activeId) return null;
      return (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      );
    });
  };

  const renderTabButton = (tab: TabItem) => {
    const isActive = tab.id === activeId;
    const isHovered = hoveredId === tab.id;
    const Icon = tab.icon;
    const activeAccent = tab.tabColor || BO_PRIMARY;
    const badgeStyle = resolveBadgeStyle(tab.tabColor, tab.badgeColor);

    return (
      <motion.button
        key={tab.id}
        type="button"
        role="tab"
        disabled={tab.disabled}
        aria-selected={isActive}
        aria-label={tab.label}
        whileHover={!tab.disabled && !isActive ? { y: -1 } : {}}
        whileTap={!tab.disabled ? { scale: 0.97 } : {}}
        onClick={() => {
          if (!tab.disabled) onChange(tab.id);
        }}
        onMouseEnter={() => setHoveredId(tab.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '16px',
          border: isActive ? `2px solid ${activeAccent}` : `1.5px solid ${isHovered ? 'var(--color-border-secondary, #D1D5DB)' : 'var(--color-border-tertiary, #E5E7EB)'}`,
          background: isActive ? activeAccent : (isHovered ? 'var(--color-bg-secondary, #F9FAFB)' : 'transparent'),
          color: isActive ? 'var(--color-white, #FFFFFF)' : 'var(--color-text-secondary, #6B7280)',
          fontWeight: isActive ? 600 : 500,
          fontSize: '14px',
          cursor: tab.disabled ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease',
          boxShadow: isActive ? `0 4px 12px ${withAlpha(activeAccent, '33')}` : 'none',
          opacity: tab.disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
          width: orientation === 'vertical' ? '100%' : undefined,
          justifyContent: orientation === 'vertical' ? 'flex-start' : 'center',
        }}
      >
        {Icon && (
          <motion.span
            aria-hidden="true"
            animate={iconAnimated && isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-flex' }}
          >
            <Icon className="w-4 h-4" style={{ color: isActive ? '#FFFFFF' : '#9CA3AF' }} />
          </motion.span>
        )}
        <span>{tab.label}</span>
        {tab.badge !== undefined && (
          <span
            style={{
              background: isActive ? 'rgba(255,255,255,0.22)' : badgeStyle.bg,
              color: isActive ? '#FFFFFF' : badgeStyle.text,
              fontSize: '12px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              minWidth: '20px',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {tab.badge}
          </span>
        )}
      </motion.button>
    );
  };

  return (
    <Tabs value={activeId} onValueChange={onChange} orientation={orientation}>
      <div
        role="tablist"
        aria-orientation={orientation}
        style={{
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          flexWrap: orientation === 'vertical' ? 'nowrap' : 'wrap',
          gap: '10px',
          alignItems: orientation === 'vertical' ? 'stretch' : 'center',
          marginBottom: '24px',
        }}
      >
        {visibleTabs.map(renderTabButton)}
      </div>
      {renderContent()}
    </Tabs>
  );
}

export default UniversalTabsBO;
