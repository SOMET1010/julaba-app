import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { registerWebAuthn } from '../../hooks/useWebAuthn';
import { doitProposerReconnaissance, marquerBiometrie, noterRefusProposition } from '../../services/comptesMemorises';
import { guidageVocal } from '../../utils/accessMode';
import { vibrerSucces } from '../../utils/haptique';

/**
 * « Tata propose de me reconnaître » (connexion inclusive, lot 2).
 *
 * Juste après une entrée réussie par CODE, Tata propose — vocalement — de
 * simplifier les prochaines visites : « Veux-tu que Tata te reconnaisse la
 * prochaine fois ? ». Oui → le téléphone lance ce qu'il sait faire (visage,
 * doigt…) via l'enrôlement WebAuthn existant. Non → refus mémorisé, on ne
 * redemande pas (l'activation reste possible dans Paramètres → Sécurité).
 *
 * L'écran parle le langage de la personne (« te reconnaître », « pose ton
 * doigt ») — jamais « biométrie » ni « WebAuthn ». Une seule proposition par
 * compte et par téléphone (mémoire dans comptesMemorises).
 */
export function PropositionReconnaissance() {
  const { user, speak } = useApp();
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const phoneRef = useRef('');
  const prenom = (user?.firstName || (user as any)?.prenoms || (user as any)?.prenom || '').toString().trim();

  useEffect(() => {
    // Conditions pour proposer : compte mémorisé sans reconnaissance ni refus,
    // téléphone capable (WebAuthn) et en ligne (l'enrôlement parle au serveur).
    const tel = String((user as any)?.phone || '').replace(/^\+225/, '');
    if (!/^\d{10}$/.test(tel)) return;
    if (typeof window.PublicKeyCredential === 'undefined') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    let propose = false;
    try { propose = doitProposerReconnaissance(window.localStorage, tel); } catch { /* ignore */ }
    if (!propose) return;
    phoneRef.current = tel;
    // Petite respiration : l'accueil s'installe, PUIS Tata pose sa question.
    const t = setTimeout(() => {
      setVisible(true);
      if (guidageVocal()) {
        speak(`${prenom || 'Ma sœur'}, veux-tu que Tata te reconnaisse la prochaine fois ? Ce sera plus rapide.`);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const repondreOui = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      const result = await registerWebAuthn();
      if (result.success) {
        try { marquerBiometrie(window.localStorage, phoneRef.current, true); } catch { /* ignore */ }
        vibrerSucces();
        if (guidageVocal()) speak('C\'est fait ! La prochaine fois, ton téléphone te reconnaîtra.');
      } else {
        // Échec ou annulation : on n'insiste pas (même politesse qu'un « Non »).
        // L'activation reste possible à tout moment dans Paramètres → Sécurité.
        try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
        if (guidageVocal()) speak('Ça n\'a pas marché ici. Tu pourras réessayer plus tard dans les réglages.');
      }
    } catch {
      try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
      if (guidageVocal()) speak('Ça n\'a pas marché ici. Tu pourras réessayer plus tard dans les réglages.');
    } finally {
      setEnCours(false);
      setVisible(false);
    }
  };

  const repondreNon = () => {
    try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
    if (guidageVocal()) speak('D\'accord, on ne change rien.');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          role="dialog" aria-modal="true" aria-label="Tata propose de te reconnaître"
        >
          <motion.div
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', damping: 28 }}
            style={{ width: '100%', maxWidth: 480, background: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center' }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <Fingerprint style={{ width: 32, height: 32, color: '#C66A2C' }} />
            </div>
            <p style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 800, color: '#3d1a08', lineHeight: 1.35 }}>
              {prenom ? `${prenom}, veux-tu` : 'Veux-tu'} que Tata te reconnaisse la prochaine fois ?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={repondreNon} disabled={enCours}
                style={{ flex: 1, padding: '15px 0', borderRadius: 16, fontWeight: 800, fontSize: 15, color: '#8A5A34', background: '#fff', border: '2px solid rgba(198,106,44,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Non
              </button>
              <button type="button" onClick={repondreOui} disabled={enCours}
                style={{ flex: 1.4, padding: '15px 0', borderRadius: 16, fontWeight: 800, fontSize: 15, color: '#fff', background: enCours ? '#CBB9A8' : 'linear-gradient(135deg, #EE8E3C, #C55C18)', border: 'none', cursor: enCours ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                {enCours ? 'Un instant…' : 'Oui, je veux'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
