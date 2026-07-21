import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VolumeX, Volume1, Volume2 } from 'lucide-react';

interface VoiceLevelSelectorProps {
  value: number;
  onChange: (v: number) => void;
  color: string;
}

const LEVELS = [
  { icon: VolumeX,  label: 'Silencieux' },
  { icon: Volume1,  label: 'Essentiel'  },
  { icon: Volume2,  label: 'Complet'    },
] as const;

const DESCRIPTIONS = [
  'Tata Nanti Lou reste silencieuse. Tu navigues seul, sans assistance vocale.',
  'Tata Nanti Lou te parle uniquement pour les alertes importantes et les confirmations.',
  "Tata Nanti Lou t'accompagne sur toutes les actions — ventes, navigation et conseils.",
];

function WaveBars({ active, level, color }: { active: boolean; level: number; color: string }) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const BASE_HEIGHTS = [
    [3, 3, 3, 3, 3],
    [8, 16, 12, 20, 10],
    [14, 22, 18, 26, 16],
  ];

  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);
    const base = BASE_HEIGHTS[level];
    barsRef.current.forEach((b, i) => {
      if (b) { b.style.height = base[i] + 'px'; b.style.backgroundColor = color; }
    });
    if (level === 0) return;
    animRef.current = setInterval(() => {
      barsRef.current.forEach((b, i) => {
        if (!b) return;
        const h = base[i] + (Math.random() - 0.5) * (level === 2 ? 12 : 6);
        b.style.height = Math.max(3, Math.round(h)) + 'px';
      });
    }, 200);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [level, color]);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28, flexShrink: 0 }}>
      {[0,1,2,3,4].map(i => (
        <div
          key={i}
          ref={el => { if (el) barsRef.current[i] = el; }}
          style={{
            width: 4,
            borderRadius: 2,
            backgroundColor: color,
            height: BASE_HEIGHTS[level][i],
            transition: 'height 0.15s ease',
          }}
        />
      ))}
    </div>
  );
}

export function VoiceLevelSelector({ value, onChange, color }: VoiceLevelSelectorProps) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <p style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>Voix de Tata Nanti Lou</p>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Choisir quand Tata Nanti Lou te parle</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {LEVELS.map((level, idx) => {
          const Icon = level.icon;
          const isActive = value === idx;
          return (
            <motion.button
              key={idx}
              onClick={() => onChange(idx)}
              whileTap={{ scale: 0.96 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 8px', borderRadius: 14,
                border: `2px solid ${isActive ? color : '#E5E7EB'}`,
                backgroundColor: isActive ? `${color}10` : 'white',
                cursor: 'pointer',
              }}
            >
              <Icon
                style={{ width: 28, height: 28, color: isActive ? color : '#9CA3AF' }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? color : '#6b7280' }}>
                {level.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 14px', borderRadius: 14,
            backgroundColor: `${color}08`,
            border: `1.5px solid ${color}25`,
            minHeight: 56,
          }}
        >
          <WaveBars active={true} level={value} color={color} />
          <p style={{ fontSize: 13, color: '#6b4226', lineHeight: 1.5, flex: 1 }}>
            {DESCRIPTIONS[value]}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
