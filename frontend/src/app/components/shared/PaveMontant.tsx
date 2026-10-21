import { motion } from 'motion/react';
import { Delete, Trash2, Volume2 } from 'lucide-react';
import { vibrerTic } from '../../utils/haptique';

interface PaveMontantProps {
  value: string;
  onChange: (value: string) => void;
  color?: string;
  maxDigits?: number;
  onSpeak?: (montant: number) => void;
  ariaLabel?: string;
}

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'] as const;

export function valeurApresToucheMontant(value: string, touche: string, maxDigits = 8): string {
  if (touche === '<') return value.slice(0, -1);
  if (touche === 'clear') return '';
  if (touche === '000') {
    if (!value || value === '0' || value.length + 3 > maxDigits) return value;
    return value + '000';
  }
  if (!/^\d$/.test(touche) || value.length >= maxDigits) return value;
  return value === '0' ? touche : value + touche;
}

/**
 * Pavé de montant pour une utilisation au marché : grandes cibles, valeur
 * visible, réécoute explicite et aucune dépendance au clavier système.
 */
export function PaveMontant({
  value,
  onChange,
  color = '#AF5B23',
  maxDigits = 8,
  onSpeak,
  ariaLabel = 'Montant saisi',
}: PaveMontantProps) {
  const montant = Number(value || 0);
  const appliquer = (touche: string) => {
    vibrerTic();
    onChange(valeurApresToucheMontant(value, touche, maxDigits));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={() => onSpeak?.(montant)}
        aria-label={onSpeak ? `${ariaLabel}. ${montant.toLocaleString('fr-FR')} francs. Appuyer pour écouter.` : ariaLabel}
        style={{
          minHeight: 68, borderRadius: 16, border: `2px solid ${color}`,
          background: '#fff', color, padding: '8px 12px', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          cursor: onSpeak ? 'pointer' : 'default', fontFamily: 'inherit',
        }}
      >
        <strong aria-live="polite" style={{ fontSize: 34, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {montant.toLocaleString('fr-FR')} F
        </strong>
        {onSpeak && <Volume2 aria-hidden="true" size={24} />}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {TOUCHES.map((touche) => (
          <motion.button
            type="button"
            key={touche}
            whileTap={{ scale: 0.9 }}
            onClick={() => appliquer(touche)}
            aria-label={touche === '000' ? 'trois zéros' : touche}
            style={{
              minHeight: 58, borderRadius: 15, border: '1.5px solid #E8D7C8',
              background: touche === '0' ? color : '#FFF3E8', color: touche === '0' ? '#fff' : color,
              fontSize: 25, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {touche}
          </motion.button>
        ))}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => appliquer('<')}
          aria-label="Effacer le dernier chiffre"
          style={{ minHeight: 58, borderRadius: 15, border: '1.5px solid #D8D8D8', background: '#F1F1F1', color: '#666', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
        >
          <Delete aria-hidden="true" size={26} />
        </motion.button>
      </div>

      {value && (
        <button
          type="button"
          onClick={() => appliquer('clear')}
          style={{ minHeight: 46, borderRadius: 13, border: '1.5px solid #D8D8D8', background: '#fff', color: '#6B5A50', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, cursor: 'pointer' }}
        >
          <Trash2 aria-hidden="true" size={19} /> Tout effacer
        </button>
      )}
    </div>
  );
}
