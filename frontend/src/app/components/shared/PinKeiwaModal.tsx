// ─── Modal PIN Keiwa ──────────────────────────────────────────────────────
// Extrait de UniversalParametres.tsx (Réglages) pour être réutilisé depuis
// UniversalProfil.tsx : la sécurité (mot de passe + code PIN) vit maintenant
// au même endroit — « Mon compte » — plutôt que d'être coupée entre deux
// écrans sans raison visible (audit accueil/profil).
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

export function ModalPIN({ isOpen, onClose, color, onSave, onDisable, mode }: {
  isOpen: boolean; onClose: () => void; color: string;
  onSave: (newPin: string, currentPin?: string) => Promise<void>;
  onDisable?: (currentPin: string) => Promise<void>;
  mode: 'create' | 'modify' | 'disable';
}) {
  const [current, setCurrent] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setErr('');
    if (mode === 'disable') {
      if (current.length !== 4) { setErr('Entre ton PIN actuel (4 chiffres)'); return; }
      if (onDisable) await onDisable(current);
      setDone(true);
      setTimeout(() => { setDone(false); setCurrent(''); onClose(); }, 1800);
      return;
    }
    if (nouveau.length !== 4) { setErr('Le code PIN doit contenir exactement 4 chiffres'); return; }
    if (nouveau !== confirm) { setErr('Les codes ne correspondent pas'); return; }
    if (nouveau === '1234') { setErr('Code trop simple — choisis un autre'); return; }
    await onSave(nouveau, mode === 'modify' ? current : undefined);
    setDone(true);
    setTimeout(() => { setDone(false); setCurrent(''); setNouveau(''); setConfirm(''); onClose(); }, 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold encre mb-5">
              {mode === 'disable' ? 'Désactiver le PIN' : mode === 'modify' ? 'Modifier le PIN' : 'Créer un PIN'}
            </h2>
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
                </div>
                <p className="font-bold encre">{mode === 'disable' ? 'PIN désactivé' : 'PIN enregistré'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mode !== 'create' && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">PIN actuel</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={current}
                      onChange={e => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 outline-none"
                      style={{ borderColor: current.length === 4 ? color : undefined }}
                    />
                  </div>
                )}
                {mode !== 'disable' && (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Nouveau PIN</label>
                      <input type="password" inputMode="numeric" maxLength={4} value={nouveau}
                        onChange={e => setNouveau(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 outline-none"
                        style={{ borderColor: nouveau.length === 4 ? color : undefined }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Confirmer le PIN</label>
                      <input type="password" inputMode="numeric" maxLength={4} value={confirm}
                        onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 outline-none"
                        style={{ borderColor: confirm.length === 4 && confirm === nouveau ? color : confirm.length === 4 ? '#EF4444' : undefined }}
                      />
                    </div>
                  </>
                )}
                {err && <p className="text-red-500 text-sm text-center">{err}</p>}
                <motion.button onClick={() => { void handleSave(); }} whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg"
                  style={{ backgroundColor: mode === 'disable' ? '#EF4444' : color }}>
                  {mode === 'disable' ? 'Désactiver le PIN' : 'Enregistrer le PIN'}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
