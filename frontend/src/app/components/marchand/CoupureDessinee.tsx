/**
 * Un billet ou une pièce DESSINÉS, pas un bouton coloré avec un nombre écrit.
 *
 * LE DÉFAUT QU'ON CORRIGE, relevé par Patrick sur appareil réel : « les
 * billets ne sont pas dessinés ». Un rectangle violet marqué « 10 000 »
 * demande de LIRE. Pour une marchande qui ne lit pas, c'est du texte déguisé
 * en image — exactement ce que la règle voice-first interdit.
 *
 * CE QU'UNE MARCHANDE RECONNAÎT VRAIMENT, elle qui manipule ces coupures tous
 * les jours, et qu'on reproduit ici :
 *   1. la COULEUR dominante (déjà dans utils/fcfa.ts) ;
 *   2. la TAILLE — les vraies coupures grandissent avec la valeur ;
 *   3. la FORME — un billet est un rectangle allongé, une pièce est ronde ;
 *   4. la TEXTURE — le guillochis, ces fines lignes concentriques qui font
 *      qu'un billet ressemble à de l'argent et pas à un bouton ;
 *   5. un THÈME simplifié — technologie, agriculture, transport ou éducation.
 *
 * CE QU'ON NE REPRODUIT PAS : le dessin des vraies coupures. La BCEAO encadre
 * la reproduction des billets XOF. On imite l'ALLURE, jamais l'œuvre. Aucun
 * logo BCEAO, numéro de série, animal, signature ni signe de sécurité n'est
 * reproduit.
 *
 * Le chiffre reste affiché, en gros : lire un NOMBRE et lire un MOT sont deux
 * compétences différentes, et beaucoup de marchandes ont la première.
 */
import { motion } from 'motion/react';
import { BookOpen, BusFront, RadioTower, Sprout, type LucideIcon } from 'lucide-react';
import { type Coupure, formatF, hauteurBillet } from '../../utils/fcfa';

interface Props {
  coupure: Coupure;
  onTouche: () => void;
}

/** Guillochis : fines lignes obliques répétées, comme sur un vrai billet. */
function Guillochis({ id, teinte }: { id: string; teinte: string }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={teinte} strokeWidth="1.1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

const ICONES_BILLET: Record<NonNullable<Coupure['repere']>, LucideIcon> = {
  technologie: RadioTower,
  agriculture: Sprout,
  transport: BusFront,
  education: BookOpen,
};

export function BilletDessine({ coupure, onTouche }: Props) {
  const hauteur = hauteurBillet(coupure.valeur);
  const idMotif = `guilloche-${coupure.valeur}`;
  const IconeRepere = coupure.repere ? ICONES_BILLET[coupure.repere] : null;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onTouche}
      aria-label={`Ajouter un billet de ${formatF(coupure.valeur)} francs`}
      style={{
        position: 'relative',
        flex: '1 0 30%',
        minHeight: hauteur,
        height: hauteur,
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        background: `linear-gradient(118deg, ${coupure.couleur}, ${coupure.couleur}CC 55%, ${coupure.couleur} 100%)`,
        color: coupure.encre,
        boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
        padding: 0,
      }}
    >
      <Guillochis id={idMotif} teinte="rgba(255,255,255,0.16)" />

      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: 3,
          border: '1.5px solid rgba(255,255,255,0.45)',
          pointerEvents: 'none',
        }}
      />

      {IconeRepere && (
        <span
          aria-hidden="true"
          data-billet-repere={coupure.repere}
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
          }}
        >
          <IconeRepere size={18} strokeWidth={2.2} />
        </span>
      )}

      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 8,
          top: 6,
          fontSize: 8,
          fontWeight: 800,
          letterSpacing: '0.12em',
          opacity: 0.86,
        }}
      >
        FCFA
      </span>

      <span
        style={{
          position: 'relative',
          fontWeight: 900,
          fontSize: hauteur >= 58 ? 17 : 15,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          marginLeft: IconeRepere ? 22 : 0,
        }}
      >
        {formatF(coupure.valeur)}
      </span>
    </motion.button>
  );
}

export function PieceDessinee({ coupure, onTouche }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onTouche}
      aria-label={`Ajouter une pièce de ${formatF(coupure.valeur)} francs`}
      style={{
        position: 'relative',
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: `radial-gradient(120% 120% at 30% 25%, ${coupure.couleur}, ${coupure.couleur}AA 60%, ${coupure.couleur}DD)`,
        color: coupure.encre,
        fontWeight: 900,
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 2px 5px rgba(0,0,0,0.22)',
        padding: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 3,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.55)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 7,
          borderRadius: '50%',
          border: '1px solid rgba(0,0,0,0.12)',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative' }}>{coupure.valeur}</span>
    </motion.button>
  );
}
