import React from 'react';
import { Skeleton } from '../../ui/skeleton';
import { BO_LIGHT, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type SkeletonPreset = 'avatar' | 'line' | 'card' | 'kpi' | 'tab' | 'list' | 'detail' | 'custom';

export interface UniversalSkeletonBOProps {
  preset?: SkeletonPreset;
  count?: number;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
}

const SHIMMER_KEYFRAMES = `
@keyframes bo-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

const BASE_STYLE: React.CSSProperties = {
  background: `linear-gradient(90deg, ${BO_TINT} 0%, color-mix(in srgb, ${BO_LIGHT} 55%, white) 50%, ${BO_TINT} 100%)`,
  backgroundSize: '200% 100%',
  animation: 'bo-shimmer 1.8s ease-in-out infinite',
};

function SkeletonBlock({ style }: { style: React.CSSProperties }) {
  return <Skeleton style={{ ...BASE_STYLE, ...style }} />;
}

export function UniversalSkeletonBO({
  preset = 'line',
  count = 1,
  width,
  height,
  borderRadius,
  className,
}: UniversalSkeletonBOProps) {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    if (preset === 'avatar') {
      elements.push(
        <SkeletonBlock key={i} style={{ width: 52, height: 52, borderRadius: '50%' }} />,
      );
    } else if (preset === 'line') {
      elements.push(
        <SkeletonBlock key={i} style={{ width: width || '100%', height: height || 14, borderRadius: borderRadius ?? 6 }} />,
      );
    } else if (preset === 'card') {
      elements.push(
        <div key={i} style={{ background: 'white', borderRadius: 16, padding: 16, border: `1px solid ${BO_TINT}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <SkeletonBlock style={{ width: 52, height: 52, borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SkeletonBlock style={{ width: '60%', height: 14, borderRadius: 6 }} />
              <SkeletonBlock style={{ width: '40%', height: 12, borderRadius: 6 }} />
            </div>
            <SkeletonBlock style={{ width: 60, height: 24, borderRadius: 8 }} />
          </div>
        </div>,
      );
    } else if (preset === 'kpi') {
      elements.push(
        <div key={i} style={{ background: BO_TINT, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock style={{ width: '50%', height: 12, borderRadius: 6 }} />
          <SkeletonBlock style={{ width: '70%', height: 26, borderRadius: 6 }} />
        </div>,
      );
    } else if (preset === 'tab') {
      elements.push(
        <SkeletonBlock key={i} style={{ width: '100%', height: 48, borderRadius: 16 }} />,
      );
    } else if (preset === 'list') {
      elements.push(
        <div key={i} style={{ background: 'white', borderRadius: 16, padding: 16, border: `1px solid ${BO_TINT}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <SkeletonBlock style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBlock style={{ width: '70%', height: 13, borderRadius: 6 }} />
            <SkeletonBlock style={{ width: '50%', height: 11, borderRadius: 6 }} />
          </div>
        </div>,
      );
    } else if (preset === 'detail') {
      elements.push(
        <div key={i} style={{ background: 'white', borderRadius: 24, padding: 24, border: `1px solid ${BO_TINT}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonBlock style={{ width: '40%', height: 18, borderRadius: 6 }} />
          {[1, 2, 3, 4].map(k => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <SkeletonBlock style={{ width: 100, height: 13, borderRadius: 6 }} />
              <SkeletonBlock style={{ width: 140, height: 13, borderRadius: 6 }} />
            </div>
          ))}
        </div>,
      );
    } else {
      elements.push(
        <SkeletonBlock key={i} style={{ width: width || '100%', height: height || 14, borderRadius: borderRadius ?? 6 }} />,
      );
    }
  }

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        className={className}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}
        aria-busy="true"
        aria-live="polite"
        aria-label="Chargement"
      >
        {elements}
      </div>
    </>
  );
}

export default UniversalSkeletonBO;
