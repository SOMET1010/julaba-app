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
  /** Habillage de l'en-tête. `'caisse'` : en-tête CLAIR de la maquette de la
   *  caisse (VOIX-01, lot F) — fond sable, encre foncée, titre en Inter
   *  semibold. Par défaut, l'en-tête sombre de tous les autres sous-écrans :
   *  cette prop ne change RIEN pour eux. */
  variante?: 'defaut' | 'caisse';
  /** Pleine largeur sur web/desktop (sans décalage sidebar) */
  fullWidth?: boolean;
}

export function SubPageLayout({
  role, title, subtitle, rightContent, headerChildren,
  bottomAction, noPadding = false, children, onBackOverride, variante = 'defaut', fullWidth = false
}: SubPageLayoutProps) {
  const navigate = useNavigate();
  const config = getRoleConfig(role);
  const primaryColor = config.primaryColor;
  const bgWarm = variante === 'caisse' ? 'var(--caisse-sable)' : 'var(--commerce-paper)';
  const pbContent = bottomAction ? 180 : 100;
  const clair = variante === 'caisse';
  // Les sous-écrans marchands prennent l'en-tête de « Mes dépenses » : même
  // gradient orange, même bouton retour (44 px, rayon 13, flèche 16 px). La
  // caisse garde son en-tête clair (`variante="caisse"`), et les autres rôles
  // gardent l'en-tête sombre par défaut — rien ne change pour eux.
  const orange = role === 'marchand' && !clair;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: bgWarm, width: '100%' }}>
      {/* ZONE 1 : HEADER FIXE */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          background: clair
            ? 'var(--caisse-ivoire)'
            : orange
              ? 'linear-gradient(160deg, var(--commerce-action) 0%, var(--commerce-orange-700) 100%)'
              : 'var(--commerce-sidebar)',
          borderBottom: clair ? '1px solid var(--commerce-line)' : 'none' }}
        className={fullWidth ? '' : 'lg:pl-[280px]'}
      >
        <div style={{ height: clair ? 12 : 16 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: clair ? '0 16px 12px' : '0 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              aria-label={orange ? 'Revenir en arrière' : 'Retour'}
              onClick={onBackOverride ? onBackOverride : () => navigate(-1)}
              style={{ width: 44, height: 44, borderRadius: clair ? 'var(--caisse-rayon-3)' : orange ? 13 : 14,
                background: clair ? 'var(--caisse-sable)' : 'rgba(255,255,255,0.18)',
                border: clair ? '1px solid var(--commerce-line)' : '1px solid rgba(255,255,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0 }}
            >
              {orange
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                : <ChevronLeft size={clair ? 24 : 20} color={clair ? 'var(--encre)' : 'white'} strokeWidth={2.5} />}
            </button>
            <div>
              <div style={clair
                ? { font: 'var(--caisse-font-h2)', color: 'var(--encre)' }
                : { fontSize: 19, fontWeight: 900, color: 'white', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 13, color: clair ? 'var(--caisse-gris-texte)' : '#D3C6D4', marginTop: 2 }}>{subtitle}</div>
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
          width: '100%',
          paddingTop: headerChildren ? 116 : 86,
          paddingBottom: pbContent,
          paddingLeft: noPadding ? 0 : 16,
          paddingRight: noPadding ? 0 : 16,
        }}
        className={fullWidth ? '' : 'lg:pl-[296px]'}
      >
        {children}
      </div>

      {/* ZONE 2b : BOUTON ACTION FIXE (optionnel) */}
      {bottomAction && (
        <div
          style={{ position: 'fixed', bottom: 80, left: 0, right: 0,
            padding: '8px 16px', background: bgWarm,
            borderTop: `1px solid ${primaryColor}22`, zIndex: 30 }}
          className={fullWidth ? '' : 'lg:pl-[296px]'}
        >
          {bottomAction}
        </div>
      )}
    </div>
  );
}
