import { useEffect } from 'react';
import { motion } from 'motion/react';
import { appliquerTailleTexteAuDocument, zoomPourTaille } from '../../utils/tailleTexte';

interface TextSizeSliderProps {
  value: number;
  onChange: (v: number) => void;
  color: string;
}

const LABELS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'MAX'];

// Curseur de taille du texte — branché sur un ZOOM réel (utils/tailleTexte) :
// tout grandit, cibles tactiles comprises, comme le mode soleil (les deux se
// multiplient). Avant v5.0.0.15 il n'écrivait qu'une variable quasi sans
// consommateur : il était cosmétique.
export function TextSizeSlider({ value, onChange, color }: TextSizeSliderProps) {
  useEffect(() => {
    appliquerTailleTexteAuDocument(value);
  }, [value]);

  const zoom = zoomPourTaille(value);

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontWeight: 700, color: 'var(--encre)' }}>Taille du texte</p>
        <span style={{
          fontSize: 11, fontWeight: 700, color: color,
          backgroundColor: `${color}15`, padding: '3px 10px', borderRadius: 20,
        }}>
          {LABELS[value]} — {Math.round(zoom * 100)} %
        </span>
      </div>

      <div style={{ position: 'relative', paddingBottom: 8 }}>
        <input
          type="range"
          min={0}
          max={6}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: color,
            cursor: 'pointer',
            height: 4,
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 6, paddingLeft: 2, paddingRight: 2,
        }}>
          {LABELS.map((l, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                fontWeight: i === value ? 700 : 400,
                color: i === value ? color : 'var(--encre-4)',
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>

      <motion.div
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          marginTop: 10, padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: `${color}08`,
          border: `1.5px solid ${color}20`,
        }}
      >
        <p style={{ fontSize: Math.round(15 * zoom), color: 'var(--encre-2)', lineHeight: 1.5 }}>
          Vente de manioc — 500 FCFA
        </p>
      </motion.div>
    </div>
  );
}
