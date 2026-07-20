import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CircleCheck,
  MapPin,
  MoreVertical,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import type { DropdownEntry } from './universal/UniversalDropdownMenuBO';

function activityLabelColor(t: number): string {
  if (t <= 0) return '#A32D2D';
  if (t <= 10) return '#EF9F27';
  return '#854F0B';
}

function activityFill(t: number): string {
  if (t <= 0) return '#F7C1C1';
  if (t <= 10) return '#EF9F27';
  return '#854F0B';
}

export interface UniversalCardBOZoneRowProps {
  index?: number;
  nom: string;
  regionLabel: string;
  marchesCount: number;
  nbActeurs: number;
  nbIdentificateurs: number;
  volumeFcfaLabel: string;
  volumePositive: boolean;
  tauxActivite: number;
  active: boolean;
  menuItems: DropdownEntry[];
  showMenu: boolean;
}

export function UniversalCardBOZoneRow({
  index = 0,
  nom,
  regionLabel,
  marchesCount,
  nbActeurs,
  nbIdentificateurs,
  volumeFcfaLabel,
  volumePositive,
  tauxActivite,
  active,
  menuItems,
  showMenu,
}: UniversalCardBOZoneRowProps) {
  const t = Math.round(Number(tauxActivite) || 0);
  const barFill = activityFill(t);
  const labelCol = activityLabelColor(t);
  const acteursCol = nbActeurs > 0 ? '#185FA5' : '#9CA3AF';
  const volCol = volumePositive ? '#3B6D11' : '#9CA3AF';
  const avatarGrad = active
    ? 'linear-gradient(135deg, #2E8B57 0%, #57A878 100%)'
    : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)';
  const dotCol = active ? '#3B6D11' : '#9CA3AF';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '52px minmax(0,1fr) 90px auto 40px',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
        }}
      >
        <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: avatarGrad,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={24} color="#fff" strokeWidth={2.2} />
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: dotCol,
              border: '2px solid #fff',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1F1F1F', lineHeight: 1.25 }}>{nom}</div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#6B7280',
            }}
          >
            <span style={{ color: '#5B5248', fontWeight: 500 }}>{regionLabel}</span>
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Store size={12} style={{ color: '#5B5248', flexShrink: 0 }} />
              <span style={{ color: '#5B5248', fontWeight: 500 }}>
                {marchesCount} marché{marchesCount > 1 ? 's' : ''}
              </span>
            </span>
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} style={{ color: acteursCol, flexShrink: 0 }} />
              <span style={{ color: acteursCol, fontWeight: 500 }}>{nbActeurs} acteurs</span>
            </span>
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 500, color: '#9CA3AF', fontSize: 11 }}>Ident.</span>
              <span style={{ color: '#185FA5', fontWeight: 500 }}>{nbIdentificateurs}</span>
            </span>
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={12} style={{ color: volCol, flexShrink: 0 }} />
              <span style={{ color: volCol, fontWeight: 500 }}>{volumeFcfaLabel}</span>
            </span>
          </div>
        </div>

        <div style={{ width: 90, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: labelCol, marginBottom: 4 }}>
            {'Activité '}
            {t}%
          </span>
          <div style={{ width: 80, height: 5, borderRadius: 3, background: '#F5F3EF', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, t)}%`, height: '100%', background: barFill, borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {active ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: '#EAF3DE',
                color: '#3B6D11',
              }}
            >
              <CircleCheck size={13} strokeWidth={2.4} />
              Active
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: '#F3F4F6',
                color: '#4B5563',
              }}
            >
              Inactive
            </span>
          )}
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          {showMenu && menuItems.length > 0 ? (
            <UniversalDropdownMenuBO
              trigger={
                <button
                  type="button"
                  aria-label="Actions"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid #E5E1D8',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={15} color="#6B7280" />
                </button>
              }
              items={menuItems}
              align="right"
            />
          ) : (
            <div style={{ width: 32, height: 32 }} aria-hidden />
          )}
        </div>
      </div>
    </motion.div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  couvert: 'Couvert',
  decouvert: 'Découvert',
  mixte: 'Mixte',
  autre: 'Autre',
};

export interface UniversalCardBOMarcheRowProps {
  index?: number;
  nom: string;
  typeKey: string;
  adresse?: string | null;
  hasGps: boolean;
  active: boolean;
  menuItems: DropdownEntry[];
  showMenu: boolean;
}

export function UniversalCardBOMarcheRow({
  index = 0,
  nom,
  typeKey,
  adresse,
  hasGps,
  active,
  menuItems,
  showMenu,
}: UniversalCardBOMarcheRowProps) {
  const typeLabel = TYPE_LABELS[typeKey] || typeKey || 'Autre';
  const avatarGrad = active
    ? 'linear-gradient(135deg, #5B5248 0%, #8B7E70 100%)'
    : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)';
  const dotCol = active ? '#3B6D11' : '#9CA3AF';
  const addr = (adresse || '').trim();
  const addrStyle: React.CSSProperties = addr
    ? { fontStyle: 'normal', color: '#6B7280' }
    : { fontStyle: 'italic', color: '#9CA3AF' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden"
      style={{ borderRadius: 16 }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '52px minmax(0,1fr) auto 40px',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
        }}
      >
        <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: avatarGrad,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={24} color="#fff" strokeWidth={2.2} />
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: dotCol,
              border: '2px solid #fff',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1F1F1F', lineHeight: 1.25 }}>{nom}</div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
            }}
          >
            <span style={{ color: '#5B5248', fontWeight: 500 }}>{typeLabel}</span>
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            {hasGps ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#185FA5' }}>
                <MapPin size={12} />
                <span>GPS renseigné</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#854F0B' }}>
                <AlertTriangle size={12} />
                <span>GPS manquant</span>
              </span>
            )}
            <span aria-hidden style={{ color: '#D1D5DB' }}>
              ·
            </span>
            <span style={addrStyle}>{addr || 'Adresse non renseignée'}</span>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {active ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: '#EAF3DE',
                color: '#3B6D11',
              }}
            >
              <CircleCheck size={13} strokeWidth={2.4} />
              Active
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: '#F3F4F6',
                color: '#4B5563',
              }}
            >
              Inactive
            </span>
          )}
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          {showMenu && menuItems.length > 0 ? (
            <UniversalDropdownMenuBO
              trigger={
                <button
                  type="button"
                  aria-label="Actions marché"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid #E5E1D8',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={15} color="#6B7280" />
                </button>
              }
              items={menuItems}
              align="right"
            />
          ) : (
            <div style={{ width: 32, height: 32 }} aria-hidden />
          )}
        </div>
      </div>
    </motion.div>
  );
}
