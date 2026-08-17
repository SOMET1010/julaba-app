/**
 * Vente guidée — CONFIRMATION D'UNE LIGNE (présentation).
 *
 * Affiche la répétition de Tata (« J'ai compris : 3 tas à 500, c'est bon ? »),
 * les gros boutons VERT (confirmer) / ORANGE (corriger), la levée d'ambiguïté
 * prix (« d'un seul » / « de tous les N ») et un panneau de correction tactile.
 *
 * 100 % piloté par les modules PURS (ligneProvisoire, dialoguesTata) : ce composant
 * ne calcule aucun prix lui-même et ne touche ni au panier ni à l'enregistrement.
 * Il émet la ligne CONFIRMÉE via onConfirmer ; le parent décide de l'ajout.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  type LigneProvisoire, estResolue, confirmer,
  corrigerQuantite, corrigerPrix, resoudreAmbiguite,
} from '../../services/ligneProvisoire';
import { phraseConfirmation, phraseAmbiguite, resumeLigne } from '../../services/dialoguesTata';

const VERT = '#0E7A47';
const ORANGE = '#C66A2C';

interface Props {
  ligne: LigneProvisoire;
  /** Montant dicté ambigu (unitaire OU total), pour la question de levée d'ambiguïté. */
  montantAmbigu?: number | null;
  onLigneChange: (l: LigneProvisoire) => void;
  onConfirmer: (l: LigneProvisoire) => void;
  onAnnuler: () => void;
}

const btnBase: React.CSSProperties = {
  minHeight: 52, borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: 'pointer',
  fontFamily: 'inherit', border: 'none', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, width: '100%',
};

export function ConfirmationLigne({ ligne, montantAmbigu, onLigneChange, onConfirmer, onAnnuler }: Props) {
  const [corrige, setCorrige] = useState(false);
  const [prixSaisi, setPrixSaisi] = useState('');
  const [modePrix, setModePrix] = useState<'unitaire' | 'total'>('unitaire');

  const resolue = estResolue(ligne);
  const ambigu = ligne.interpretationPrix === 'a_confirmer';

  // Cas AMBIGU avec un montant connu → question « d'un seul / de tous les N » (§5).
  if (ambigu && montantAmbigu && montantAmbigu > 0) {
    return (
      <div style={{ background: '#FFF8F0', border: `2px solid ${ORANGE}`, borderRadius: 20, padding: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 14, lineHeight: 1.35 }}>
          {phraseAmbiguite(ligne.quantite, montantAmbigu)}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileTap={{ scale: 0.97 }} style={{ ...btnBase, background: 'white', color: ORANGE, border: `2px solid ${ORANGE}` }}
            onClick={() => onLigneChange(resoudreAmbiguite(ligne, montantAmbigu, 'unitaire'))}>
            D'un seul
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} style={{ ...btnBase, background: ORANGE, color: 'white' }}
            onClick={() => onLigneChange(resoudreAmbiguite(ligne, montantAmbigu, 'total'))}>
            De tous les {ligne.quantite}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFF8F0', border: `2px solid ${ORANGE}`, borderRadius: 20, padding: 16 }}>
      {/* Répétition de Tata */}
      <p style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 14, lineHeight: 1.35 }}>
        {phraseConfirmation(ligne)}
      </p>

      {/* Panneau de CORRECTION */}
      {corrige ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quantité */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Combien ?</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.button whileTap={{ scale: 0.9 }} aria-label="Moins"
                onClick={() => onLigneChange(corrigerQuantite(ligne, Math.max(1, ligne.quantite - 1)))}
                style={{ width: 48, height: 48, borderRadius: 14, background: 'white', border: '1.5px solid #e5e0d8', fontSize: 24, fontWeight: 800, color: '#555', cursor: 'pointer', flexShrink: 0 }}>−</motion.button>
              <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--encre)', minWidth: 40, textAlign: 'center' }}>{ligne.quantite}</span>
              <motion.button whileTap={{ scale: 0.9 }} aria-label="Plus"
                onClick={() => onLigneChange(corrigerQuantite(ligne, ligne.quantite + 1))}
                style={{ width: 48, height: 48, borderRadius: 14, background: ORANGE, border: 'none', fontSize: 24, fontWeight: 800, color: 'white', cursor: 'pointer', flexShrink: 0 }}>+</motion.button>
              <span style={{ fontSize: 14, color: 'var(--encre-4)', fontWeight: 700 }}>{ligne.unite}</span>
            </div>
          </div>
          {/* Prix */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Le prix ?</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['unitaire', 'total'] as const).map(m => (
                <button key={m} onClick={() => setModePrix(m)}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${modePrix === m ? ORANGE : '#e5e0d8'}`, background: modePrix === m ? '#FDE9D6' : 'white', color: modePrix === m ? ORANGE : '#888' }}>
                  {m === 'unitaire' ? "Prix d'un" : 'Prix du tout'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input inputMode="numeric" value={prixSaisi} onChange={e => setPrixSaisi(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0" style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1.5px solid #e5e0d8', borderRadius: 12, padding: '12px 14px', fontSize: 17, fontWeight: 800, color: 'var(--encre)', textAlign: 'center', outline: 'none', fontFamily: 'inherit', background: 'white' }} />
              <motion.button whileTap={{ scale: 0.96 }} disabled={!prixSaisi}
                onClick={() => { const v = parseInt(prixSaisi, 10); if (v > 0) { onLigneChange(corrigerPrix(ligne, v, modePrix)); setCorrige(false); setPrixSaisi(''); } }}
                style={{ flexShrink: 0, background: prixSaisi ? ORANGE : '#d9cfc3', color: 'white', border: 'none', borderRadius: 12, padding: '0 18px', fontSize: 14, fontWeight: 800, cursor: prixSaisi ? 'pointer' : 'default', fontFamily: 'inherit' }}>OK</motion.button>
            </div>
          </div>
          <button onClick={() => setCorrige(false)}
            style={{ background: 'none', border: 'none', color: 'var(--encre-4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', alignSelf: 'center' }}>
            Retour
          </button>
        </div>
      ) : (
        <>
          {/* Résumé chiffré */}
          {resolue && (
            <div style={{ background: 'white', borderRadius: 14, padding: '10px 12px', marginBottom: 14, border: '1px solid #F0E4D4' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--encre)', textAlign: 'center', margin: 0 }}>{resumeLigne(ligne)}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button whileTap={{ scale: 0.97 }} disabled={!resolue}
              onClick={() => { const c = confirmer(ligne); if (c) onConfirmer(c); }}
              style={{ ...btnBase, background: resolue ? VERT : '#c7d6cd', color: 'white', cursor: resolue ? 'pointer' : 'default' }}>
              ✓ Oui, c'est bon
            </motion.button>
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCorrige(true)}
                style={{ ...btnBase, background: 'white', color: ORANGE, border: `2px solid ${ORANGE}` }}>
                Non, corriger
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onAnnuler}
                style={{ ...btnBase, background: 'white', color: '#9ca3af', border: '2px solid #e5e0d8' }}>
                Annuler
              </motion.button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
