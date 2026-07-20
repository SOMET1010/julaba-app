import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { ROLE_COLORS, getRoleConfig } from '../../config/roleConfig';

type Role = keyof typeof ROLE_COLORS;

interface SubPageLayoutProps {
  role: Role;
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
  headerChildren?: ReactNode;
  bottomAction?: ReactNode;
  noPadding?: boolean;
  children: ReactNode;
  onBackOverride?: () => void;
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function SubPageLayout({
  role, title, subtitle, rightContent, headerChildren,
  bottomAction, noPadding = false, children, onBackOverride
}: SubPageLayoutProps) {
  const navigate = useNavigate();
  const config = getRoleConfig(role);
  const primaryColor = config.primaryColor;
  const bgWarm = ('bgWarm' in config ? (config as { bgWarm?: string }).bgWarm : undefined) || '#FAFAFA';
  const pbContent = bottomAction ? 180 : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: bgWarm }}>
      {/* ZONE 1 : HEADER FIXE */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          background: `linear-gradient(160deg,${primaryColor},${darken(primaryColor, 30)})` }}
        className="lg:pl-[280px]"
      >
        <div style={{ height: 16 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onBackOverride ? onBackOverride : () => navigate(-1)}
              style={{ width: 38, height: 38, borderRadius: 13,
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0 }}
            >
              <ChevronLeft size={16} color="white" strokeWidth={2.5} />
            </button>
            <div>
              <div style={{ fontSize: 19, fontWeight: 900, color: 'white',
                letterSpacing: '-0.3px', lineHeight: 1.2 }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{subtitle}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {rightContent ?? null}
          </div>
        </div>
        {headerChildren && (
          <div style={{ padding: '0 16px 12px' }}>{headerChildren}</div>
        )}
      </div>

      {/* ZONE 2 : CONTENU SCROLLABLE */}
      <div
        style={{
          flex: 1,
          paddingTop: headerChildren ? 110 : 80,
          paddingBottom: pbContent,
          paddingLeft: noPadding ? 0 : 16,
          paddingRight: noPadding ? 0 : 16,
        }}
        className="lg:pl-[296px]"
      >
        {children}
      </div>

      {/* ZONE 2b : BOUTON ACTION FIXE (optionnel) */}
      {bottomAction && (
        <div
          style={{ position: 'fixed', bottom: 80, left: 0, right: 0,
            padding: '8px 16px', background: bgWarm,
            borderTop: `1px solid ${primaryColor}22`, zIndex: 30 }}
          className="lg:pl-[296px]"
        >
          {bottomAction}
        </div>
      )}
    </div>
  );
}
