import { motion } from 'motion/react';
import { Mic, X } from 'lucide-react';

interface Props {
  onFermer: () => void;
}

/** État d'écoute de l'aperçu : aucun texte, seul le micro animé reste visible. */
export function EcranEcoutePleinEcran({ onFermer }: Props) {
  return (
    <div role="status" aria-label="Écoute en cours"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'var(--caisse-sable)' }}>
      <button type="button" onClick={onFermer} aria-label="Fermer l'écoute"
        style={{ position: 'absolute', top: 'var(--caisse-esp-4)', right: 'var(--caisse-esp-4)', width: 'var(--caisse-cible-tactile)',
          height: 'var(--caisse-cible-tactile)', display: 'grid', placeItems: 'center', border: '1px solid var(--commerce-line)',
          borderRadius: 'var(--caisse-rayon-4)', background: 'var(--caisse-ivoire)', color: 'var(--caisse-vert-fonce)',
          cursor: 'pointer', fontFamily: 'inherit' }}>
        <X aria-hidden="true" />
      </button>
      <div aria-hidden="true" style={{ position: 'relative', width: 'calc(var(--caisse-icone) * 6)', height: 'calc(var(--caisse-icone) * 6)', display: 'grid', placeItems: 'center' }}>
        {[0, 0.8].map((delay) => (
          <motion.span key={delay} style={{ position: 'absolute', inset: 0, border: '2px solid var(--caisse-orange-voix)', borderRadius: '50%' }}
            animate={{ scale: [0.58, 1], opacity: [0.8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay }} />
        ))}
        <span style={{ zIndex: 1, width: 'calc(var(--caisse-icone) * 3)', height: 'calc(var(--caisse-icone) * 3)', display: 'grid',
          placeItems: 'center', borderRadius: '50%', background: 'var(--caisse-orange-voix)', color: 'var(--caisse-vert-fonce)' }}>
          <Mic aria-hidden="true" style={{ width: 'calc(var(--caisse-icone) * 2)', height: 'calc(var(--caisse-icone) * 2)' }} />
        </span>
      </div>
    </div>
  );
}
