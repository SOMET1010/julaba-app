import { useEffect, useRef, useState } from 'react';
import { stopAllVoice } from '../../services/audioManager';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { X, Target, Mic, MicOff } from 'lucide-react';
import { useObjectif } from '../../contexts/ObjectifContext';
import { startLiveDictation, offlineModelReady } from '../../voice-offline/offlineStt';
import { extraireNombreBambara } from '../../voice-offline/nombresBambara';
import { vibrerSucces, vibrerTic } from '../../utils/haptique';

const P = '#C46210';
const SUGGESTIONS = [10000, 25000, 50000, 100000, 200000];

interface Props { isOpen: boolean; onClose: () => void; }

export function ObjectifModal({ isOpen, onClose }: Props) {
  const { objectif, setObjectif, loading } = useObjectif();
  const [montant, setMontant] = useState(objectif || 0);
  const [input, setInput] = useState(objectif ? objectif.toLocaleString('fr-FR') : '');

  const handleInput = (val: string) => {
    const cleaned = val.replace(/\s/g, '').replace(/[^0-9]/g, '');
    const num = parseInt(cleaned) || 0;
    setMontant(num);
    setInput(num > 0 ? num.toLocaleString('fr-FR') : '');
  };

  // Dictée de l'objectif — même rouage que la connexion : sherpa hors-ligne
  // (startLiveDictation) + extraireNombreBambara, qui lit « 12 500 » (chiffres
  // écrits par sherpa) ET les nombres bambara (« waa duuru »). Le montant se
  // remplit à l'écran au fil de la voix ; ~2 s de silence ferment le micro.
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const bestRef = useRef(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const couperMicro = () => {
    if (settleRef.current) { clearTimeout(settleRef.current); settleRef.current = null; }
    if (hardStopRef.current) { clearTimeout(hardStopRef.current); hardStopRef.current = null; }
    void stopRef.current?.(); stopRef.current = null; // stop() fait la passe finale
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    streamRef.current = null;
    setIsListeningVoice(false);
  };

  const finaliserDictee = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    couperMicro();
  };

  // Modal fermé pendant l'écoute (ou démontage) → jamais de micro fantôme.
  useEffect(() => { if (!isOpen) finaliserDictee(); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => finaliserDictee(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMic = async () => {
    if (isListeningVoice) { finaliserDictee(); return; } // re-tap = je garde ce montant
    if (!offlineModelReady()) {
      toast("La voix marche dans l'application Julaba sur le téléphone. Ici, tape ton objectif.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Le micro est fermé. Tape ton objectif au clavier.');
      return;
    }
    streamRef.current = stream;
    doneRef.current = false;
    bestRef.current = 0;
    // Verrou parole/écoute (audit voix C1) : couper TOUTES les voix (clips
    // compris), pas seulement la synthèse — sinon un clip joue dans le micro.
    try { stopAllVoice(); } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    try {
      const handle = await startLiveDictation(stream, (texte, estFinal) => {
        // La passe FINALE (tout le tampon) fait autorité, même après l'arrêt.
        if (doneRef.current && !estFinal) return;
        const n = extraireNombreBambara(texte || '');
        if (n && n > 0) {
          bestRef.current = n;
          setMontant(n);
          setInput(n.toLocaleString('fr-FR'));
          if (estFinal) vibrerSucces();
          else {
            // Un montant est là : ~2 s sans correction → on range le micro.
            if (settleRef.current) clearTimeout(settleRef.current);
            settleRef.current = setTimeout(finaliserDictee, 2000);
          }
        }
      });
      stopRef.current = handle.stop;
    } catch {
      try { stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      streamRef.current = null;
      toast.error("La voix n'a pas démarré. Tape ton objectif au clavier.");
      return;
    }
    setIsListeningVoice(true);
    vibrerTic();
    // Filet dur anti micro-ouvert (jamais un couperet : 15 s, largement assez).
    hardStopRef.current = setTimeout(finaliserDictee, 15000);
  };

  const handleSave = async () => {
    if (montant <= 0) return;
    try {
      await setObjectif(montant);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-white rounded-t-3xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${P}, #A0541F)` }}>
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-white" />
              <div>
                <p className="text-white font-black text-lg">Objectif du jour</p>
                <p className="text-white/70 text-xs">Fixe ton objectif de ventes</p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <X className="w-4 h-4 text-white" />
            </motion.button>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div className="rounded-2xl p-4" style={{ background: '#FDF8F4', border: `2px solid ${P}30` }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Montant objectif</p>
              <div className="flex items-center gap-3">
                <input type="text" inputMode="numeric" value={input}
                  onChange={e => handleInput(e.target.value)}
                  placeholder="Ex: 50 000"
                  className="flex-1 text-3xl font-black outline-none bg-transparent"
                  style={{ color: P }} />
                <span className="text-sm font-bold text-gray-400">FCFA</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <motion.button key={s} whileTap={{ scale: 0.95 }}
                    onClick={() => { setMontant(s); setInput(s.toLocaleString('fr-FR')); }}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all"
                    style={{ background: montant === s ? P : 'white', color: montant === s ? 'white' : P, borderColor: P }}>
                    {s.toLocaleString('fr-FR')}
                  </motion.button>
                ))}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleMic}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm"
              style={{ background: isListeningVoice ? '#DC2626' : `${P}15`, color: isListeningVoice ? 'white' : P, border: `2px solid ${isListeningVoice ? '#DC2626' : P}` }}>
              {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListeningVoice ? 'Écoute en cours...' : 'Dis ton objectif'}
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
              disabled={montant <= 0 || loading}
              className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${P}, #A0541F)` }}>
              {loading ? 'Enregistrement...' : `Fixer à ${montant.toLocaleString('fr-FR')} FCFA`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}