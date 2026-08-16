import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { KeyRound, CheckCircle } from 'lucide-react';
import { activerCompte } from '../../services/authService';

// Écran d'ACTIVATION (P0.0, ADR-002). Une marchande fraîchement enrôlée n'a AUCUN
// secret utilisable : elle saisit le code d'activation reçu (lu par l'identificateur)
// et POSE SON propre code. Après succès, elle se connecte avec ce code.
// UX minimale (fonctionnelle) ; le mot de passe imagé (déc.3) la remplacera.
const P = '#C66A2C';
const BG = 'rgba(255,247,237,0.9)';
const BORDER = 'rgba(198,106,44,0.3)';
const PINS_INTERDITS = new Set(['0000', '1234']);

export function ActivationScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) { setError("Saisis le code d'activation."); return; }
    if (!pin.trim() || pin.length < 4) { setError('Ton code doit avoir au moins 4 chiffres.'); return; }
    if (PINS_INTERDITS.has(pin)) { setError('Ce code est trop simple. Choisis-en un autre.'); return; }
    if (pin !== confirm) { setError('Les deux codes ne sont pas pareils.'); return; }
    setLoading(true);
    setError('');
    const res = await activerCompte(code.trim(), pin);
    if (res.success) {
      setSuccess(true);
      timeoutRef.current = setTimeout(() => navigate('/'), 2200);
    } else {
      setError(res.error || "Code d'activation invalide ou expiré.");
    }
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center" role="status" aria-live="polite">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-gray-900">Compte activé !</h2>
        <p className="text-gray-500 mt-2">Tu peux maintenant te connecter avec ton code.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: BORDER }}>
            <KeyRound className="w-10 h-10" style={{ color: P }} />
          </div>
          <h1 id="activation-title" className="text-2xl font-black text-gray-900">Active ton compte</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Saisis le code d'activation, puis choisis TON code secret. Personne d'autre ne doit le connaître.
          </p>
        </div>

        <form onSubmit={handleSubmit} aria-labelledby="activation-title"
          className="bg-white rounded-3xl p-6 shadow-xl border-2 space-y-4" style={{ borderColor: BORDER }}>
          <div>
            <label htmlFor="activation-code" className="block text-sm font-bold text-gray-700 mb-2">Code d'activation</label>
            <input id="activation-code" type="text" inputMode="text" autoCapitalize="none" autoComplete="off"
              value={code} onChange={e => setCode(e.target.value)} placeholder="Code reçu à l'enrôlement"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold"
              style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label htmlFor="activation-pin" className="block text-sm font-bold text-gray-700 mb-2">Ton code secret</label>
            <input id="activation-pin" type="password" inputMode="numeric" autoComplete="new-password"
              value={pin} onChange={e => setPin(e.target.value)} placeholder="Choisis ton code (4 chiffres minimum)"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold tracking-widest"
              style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label htmlFor="activation-confirm" className="block text-sm font-bold text-gray-700 mb-2">Répète ton code</label>
            <input id="activation-confirm" type="password" inputMode="numeric" autoComplete="new-password"
              value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répète le même code"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold tracking-widest"
              style={{ borderColor: BORDER }} />
          </div>
          {error && <p role="alert" aria-live="assertive" className="text-red-500 text-sm font-semibold">{error}</p>}
          <motion.button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-50"
            style={{ backgroundColor: P }} whileHover={loading ? {} : { scale: 1.02 }} whileTap={loading ? {} : { scale: 0.98 }}>
            {loading ? 'Activation...' : 'Activer mon compte'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
