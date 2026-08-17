/**
 * Vente guidée — SAISIE GUIDÉE SANS MICRO (repli tactile, SPEC §8).
 *
 * Sur le Web/PWA il n'y a pas de reconnaissance vocale : on offre le MÊME parcours
 * guidé au doigt. La marchande dit le produit / la quantité / le prix au clavier,
 * on construit une LIGNE PROVISOIRE (modules purs), puis Tata répète et demande
 * confirmation via <ConfirmationLigne>. Rien n'est enregistré : à la confirmation,
 * le parent reçoit la ligne (typiquement pour l'ajouter au panier).
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { creerLigneProvisoire, type LigneProvisoire } from '../../services/ligneProvisoire';
import { ConfirmationLigne } from './ConfirmationLigne';

const ORANGE = '#C66A2C';

interface Props {
  /** Reçoit la ligne CONFIRMÉE (statut 'confirmee'). Le parent l'ajoute au panier. */
  onValider: (l: LigneProvisoire) => void;
}

const champStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e0d8', borderRadius: 12,
  padding: '12px 14px', fontSize: 16, fontWeight: 700, color: 'var(--encre)', outline: 'none',
  fontFamily: 'inherit', background: 'white',
};

export function SaisieGuidee({ onValider }: Props) {
  const [etape, setEtape] = useState<'saisie' | 'confirmation'>('saisie');
  const [produit, setProduit] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [prix, setPrix] = useState('');
  const [mode, setMode] = useState<'unitaire' | 'total'>('unitaire');
  const [ligne, setLigne] = useState<LigneProvisoire | null>(null);

  const verifier = () => {
    const q = Math.max(1, parseInt(quantite || '1', 10) || 1);
    const p = parseInt(prix || '0', 10) || 0;
    const l = creerLigneProvisoire(
      { nomParle: produit, quantite: q, montant: p > 0 ? p : null, prixExplicite: mode },
      { produitId: null },
    );
    setLigne(l);
    setEtape('confirmation');
  };

  const recommencer = () => { setEtape('saisie'); setLigne(null); };

  if (etape === 'confirmation' && ligne) {
    return (
      <ConfirmationLigne
        ligne={ligne}
        onLigneChange={setLigne}
        onAnnuler={recommencer}
        onConfirmer={(l) => { onValider(l); setProduit(''); setQuantite('1'); setPrix(''); recommencer(); }}
      />
    );
  }

  const pret = produit.trim().length >= 2 && parseInt(prix || '0', 10) > 0;

  return (
    <div style={{ background: '#FFFDF9', border: '1.5px solid #F0E4D4', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: ORANGE, letterSpacing: '0.05em', margin: 0 }}>SAISIR SANS PARLER</p>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-4)' }}>Qu'as-tu vendu ?</label>
        <input value={produit} onChange={e => setProduit(e.target.value)} placeholder="ex. tomate" style={{ ...champStyle, marginTop: 4 }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 96 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-4)' }}>Combien ?</label>
          <input inputMode="numeric" value={quantite} onChange={e => setQuantite(e.target.value.replace(/[^0-9]/g, ''))} style={{ ...champStyle, marginTop: 4, textAlign: 'center' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-4)' }}>Prix (FCFA)</label>
          <input inputMode="numeric" value={prix} onChange={e => setPrix(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" style={{ ...champStyle, marginTop: 4, textAlign: 'center' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['unitaire', 'total'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{ flex: 1, minHeight: 44, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${mode === m ? ORANGE : '#e5e0d8'}`, background: mode === m ? '#FDE9D6' : 'white', color: mode === m ? ORANGE : '#888' }}>
            {m === 'unitaire' ? "Prix d'un" : 'Prix du tout'}
          </button>
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} disabled={!pret} onClick={verifier}
        style={{ minHeight: 52, borderRadius: 16, fontWeight: 800, fontSize: 16, border: 'none', fontFamily: 'inherit',
          background: pret ? ORANGE : '#e0d5c8', color: 'white', cursor: pret ? 'pointer' : 'default' }}>
        Vérifier
      </motion.button>
    </div>
  );
}
