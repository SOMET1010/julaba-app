import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Fingerprint, Delete } from 'lucide-react';

/**
 * ── AUTH-10 (audit UI auth 05/10/2026) — LE PAVÉ, UNE SEULE FOIS ─────────────
 *
 * L'écran dessinait DEUX pavés identiques (étape numéro, étape code) :
 * mêmes 12 touches, mêmes classes `login-key`, même empreinte, même effacement.
 * Seules différences réelles : les labels ARIA des chiffres (le pavé du code
 * annonce « Chiffre N » ou le glyphe imagé), le glyphe affiché (chiffre nu ou
 * image) et le libellé de l'empreinte. Ce composant porte la GRILLE ; l'écran
 * passe les différences en props.
 *
 * AUCUNE PAROLE ICI : les touches VIBRENT et écrivent — `onChiffre` / `surEffacer`
 * renvoient aux handlers de l'écran, où vit le contrat vocal (`parle()`,
 * retour de frappe, apprentissage de canal). Le pavé ne décide rien.
 * Couleurs : l'empreinte et l'effacement LISENT `--commerce-action` (AUTH-08).
 */
export type PaveSaisieProps = {
  /** Désactivé pour les CHIFFRES (connexion en cours / écoute — l'écran décide). */
  disabled: boolean;
  /** La touche empreinte a SA PROPRE logique (activée dès qu'un numéro existe).
   *  Séparée volontairement : ne pas la coupler à l'écoute ou au chargement. */
  empreinteDisabled: boolean;
  /** Une touche chiffre est pressée (0-9). */
  onChiffre: (d: string) => void;
  /** « Effacer le dernier chiffre ». */
  surEffacer: () => void;
  /** La touche empreinte (connexion par reconnaissance). */
  surEmpreinte: () => void;
  /** Libellé ARIA de la touche empreinte (il diffère selon l'étape). */
  empreinteLabel: string;
  /** Label ARIA d'une touche chiffre ; absent = le chiffre affiché fait foi. */
  ariaLabelPour?: (d: string) => string;
  /** Contenu d'une touche chiffre ; par défaut le chiffre lui-même. */
  contenuPour?: (d: string) => ReactNode;
};

export function PaveSaisie({ disabled, empreinteDisabled, onChiffre, surEffacer, surEmpreinte, empreinteLabel, ariaLabelPour, contenuPour }: PaveSaisieProps) {
  return (
    <div className="login-keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
        <motion.button type="button" key={d} disabled={disabled}
          aria-label={ariaLabelPour?.(d)}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onChiffre(d)}
          className="login-key"
          whileTap={{ scale: 0.9 }}
        >{contenuPour ? contenuPour(d) : d}</motion.button>
      ))}
      <motion.button type="button" disabled={empreinteDisabled}
        aria-label={empreinteLabel}
        onPointerDown={(e) => e.preventDefault()}
        onClick={surEmpreinte}
        className="login-key"
        whileTap={{ scale: 0.9, opacity: 1 }}
      >
        <Fingerprint style={{ width: 22, height: 22, color: 'var(--commerce-action)' }} />
      </motion.button>
      <motion.button type="button" disabled={disabled}
        aria-label={ariaLabelPour?.('0')}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onChiffre('0')}
        className="login-key"
        whileTap={{ scale: 0.9 }}
      >{contenuPour ? contenuPour('0') : '0'}</motion.button>
      <motion.button type="button" aria-label="Effacer le dernier chiffre"
        onPointerDown={(e) => e.preventDefault()}
        onClick={surEffacer}
        className="login-key"
        whileTap={{ scale: 0.9, opacity: 1 }}
      >
        <Delete aria-hidden="true" size={19} color="var(--commerce-action)" />
      </motion.button>
    </div>
  );
}
