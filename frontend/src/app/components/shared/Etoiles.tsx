// Affichage / saisie d'une note en étoiles (écart CDC 8.1.5). Icône-first :
// une vendeuse qui ne lit pas comprend les étoiles.
import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

/** Affichage lecture seule d'une moyenne (avec demi-étoiles visuelles). */
export function EtoilesMoyenne({ note, total, size = 16 }: { note: number; total?: number; size?: number }) {
  const pleines = Math.round(note); // arrondi simple, lisible
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={2}
          color="#F39C12"
          fill={i <= pleines ? '#F39C12' : 'none'}
        />
      ))}
      {total != null && (
        <span style={{ fontSize: size - 3, color: '#8a7a66', fontWeight: 700, marginLeft: 2 }}>
          {note > 0 ? note.toFixed(1) : '—'}{total > 0 ? ` (${total})` : ''}
        </span>
      )}
    </span>
  );
}

/** Saisie interactive : 1 à 5 étoiles. */
export function EtoilesSaisie({ note, onChange, size = 40 }: { note: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.button
          key={i}
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
          aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
        >
          <Star size={size} strokeWidth={2} color="#F39C12" fill={i <= note ? '#F39C12' : 'none'} />
        </motion.button>
      ))}
    </div>
  );
}
