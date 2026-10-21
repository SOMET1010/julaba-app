// Bouton + modale de notation d'une commande livrée (écart CDC 8.1.5).
// Autonome : vérifie si déjà noté, ouvre une modale d'étoiles, envoie la note.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { EtoilesSaisie } from './Etoiles';
import { getMaNote, noterCommande } from '../../services/evaluations.service';

export function NoterCommande({
  commandeId,
  cibleNom,
  color = '#E67E22',
  onNoted,
}: {
  commandeId: string;
  cibleNom?: string;
  color?: string;
  onNoted?: () => void;
}) {
  const [dejaNote, setDejaNote] = useState<boolean | null>(null);
  const [noteExistante, setNoteExistante] = useState(0);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let vivant = true;
    getMaNote(commandeId).then((r) => {
      if (!vivant) return;
      setDejaNote(r.evaluee);
      setNoteExistante(r.evaluation?.note || 0);
    });
    return () => { vivant = false; };
  }, [commandeId]);

  const envoyer = async () => {
    if (note < 1) { toast.error('Choisis une note'); return; }
    setEnvoi(true);
    try {
      const r = await noterCommande(commandeId, note, commentaire);
      if (r.success) {
        toast.success('Merci pour ta note !');
        setDejaNote(true);
        setNoteExistante(note);
        setOpen(false);
        onNoted?.();
      } else {
        toast.error(r.message || 'Note impossible');
      }
    } finally {
      setEnvoi(false);
    }
  };

  if (dejaNote === null) return null; // en cours de chargement

  if (dejaNote) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#8a7a66', fontWeight: 700 }}>
        <Star size={14} color="#F39C12" fill="#F39C12" />
        Noté {noteExistante}/5
      </div>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 12, border: `1.5px solid ${color}`, background: `${color}12`,
          color, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <Star size={15} />
        Noter {cibleNom ? cibleNom.split(' ')[0] : 'la commande'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: '24px 24px 0 0', padding: 22 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1206', margin: 0 }}>
                  Noter {cibleNom || 'la commande'}
                </h3>
                <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, borderRadius: 10, background: '#f0f0f0', border: 'none', cursor: 'pointer' }}>
                  <X size={16} color="#888" />
                </button>
              </div>
              <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 0, marginBottom: 16 }}>Ton avis aide les autres à faire confiance.</p>

              <div style={{ margin: '8px 0 18px' }}>
                <EtoilesSaisie note={note} onChange={setNote} />
              </div>

              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Un mot (facultatif) : sérieux, à l'heure, bonne qualité…"
                rows={2}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid #EDE7DE', outline: 'none', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none', marginBottom: 14 }}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={envoyer}
                disabled={envoi}
                style={{ width: '100%', background: color, border: 'none', borderRadius: 16, padding: '15px 0', fontSize: 16, fontWeight: 800, color: 'white', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: envoi ? 0.6 : 1 }}
              >
                <Check size={18} /> Envoyer ma note
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
