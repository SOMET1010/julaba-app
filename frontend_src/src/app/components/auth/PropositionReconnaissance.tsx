import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { Fingerprint, Volume2, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { registerWebAuthn } from '../../hooks/useWebAuthn';
import { doitProposerReconnaissance, marquerBiometrie, noterRefusProposition } from '../../services/comptesMemorises';
import { guidageVocal } from '../../utils/accessMode';
import { vibrerSucces } from '../../utils/haptique';
import { direAccueilMarchand } from '../../services/accueilMarchandVoix';

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
 *
 * ── AUTH-05 (audit UI auth 05/10/2026) — LA MODALE EST PASSÉE SOUS RADIX ──
 *
 * CE QU'ON A TROUVÉ EN COURANT, MESURÉ AU NAVIGATEUR (R5/R7). La modale était
 * un `motion.div` dessiné main : pas de focus trap (Tab s'échappait sous la
 * modale), ESC inopérant, aucun retour de focus à la fermeture, bouton
 * « Fermer » de 32×32 px sous la cible tactile des normes (.ai ACCESSIBILITY_
 * GUIDE §4/§5 : ≥ 44 px) — et surtout : UN TAP MAL PLACÉ SUR LE FOND valait
 * refus DÉFINITIF mémorisé (`noterRefusProposition`). Une marchande qui
 * manquait l'écran de trois pixels perdait la proposition pour toujours.
 *
 * CE QUE C'EST DEVENU. Les primitives Radix `Dialog` portent ce que la norme
 * exige sans qu'on le réécrive (DESIGN_SYSTEM.md §9 : « Préférer Radix Dialog
 * (focus trap natif) » ; ACCESSIBILITY_GUIDE §5 : focus trap + aria-modal +
 * role dialog + retour focus) : piège de focus, ESC, retour de focus à la
 * fermeture, `aria-modal`, `role="dialog"` — tout est natif. La question est
 * un vrai `Title` ; la feuille du bas reste stylée à l'identique.
 *
 * LES SORTIES, REPARTIES SANS PIÈGE :
 *   · « Oui, je veux » → enrôlement (échec → refus noté, comme avant) ;
 *   · « Non » → refus mémorisé — la SEULE façon de dire non ;
 *   · « Fermer », ESC, tap sur le fond → fermeture SANS refus : elle n'a pas
 *     répondu, on ne la punit pas d'un tap manqué — la proposition reviendra
 *     au prochain lancement. Le fond n'est plus un piège à refus.
 *
 * LES CIBLES : « Fermer » passe à 44×44 px. « Oui, je veux » est reçu au
 * focus à l'ouverture (le geste recommandé d'abord, comme sur le pavé).
 */
export function PropositionReconnaissance() {
  const { user } = useApp();
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const phoneRef = useRef('');
  const ouiRef = useRef<HTMLButtonElement>(null);
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
        void direAccueilMarchand('reconnaissanceProposition');
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const repondreOui = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      const r = await registerWebAuthn();
      if (r.etat === 'ok') {
        try { marquerBiometrie(window.localStorage, phoneRef.current, true); } catch { /* ignore */ }
        vibrerSucces();
        if (guidageVocal()) void direAccueilMarchand('reconnaissanceReussie');
      } else if (r.etat === 'session_expiree') {
        // API-01b : on ne note PAS un refus, et on ne lui dit pas que « ça n'a
        // pas marché ». Elle n'a rien raté — c'est sa session qui a fini.
        // Noter un refus ici la priverait de la proposition à l'avenir, pour
        // une raison qui ne la concerne pas.
        if (guidageVocal()) void direAccueilMarchand('reconnaissanceSession');
      } else {
        // Échec ou annulation : on n'insiste pas (même politesse qu'un « Non »).
        // L'activation reste possible à tout moment dans Paramètres → Sécurité.
        try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
        if (guidageVocal()) void direAccueilMarchand('reconnaissanceErreur');
      }
    } catch {
      try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
      if (guidageVocal()) void direAccueilMarchand('reconnaissanceErreur');
    } finally {
      setEnCours(false);
      setVisible(false);
    }
  };

  // « Non » — la seule sortie qui mémorise un refus. Deliberate : elle a lu
  // (ou entendu) la question et répond. « Une seule proposition » tient.
  const repondreNon = () => {
    try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
    if (guidageVocal()) void direAccueilMarchand('reconnaissanceRefus');
    setVisible(false);
  };

  // AUTH-05 — ESC, « Fermer », tap sur le fond : fermeture SANS refus. Elle
  // n'a pas dit non — un tap manqué ou une touche pressée par accident ne
  // doit pas lui fermer la porte pour toujours. La proposition reviendra au
  // prochain lancement ; le jour où elle répond « Non », elle s'arrête.
  const fermerSansRepondre = () => {
    setVisible(false);
  };

  return (
    <DialogPrimitive.Root open={visible} onOpenChange={(o) => { if (!o) fermerSansRepondre(); }}>
      <AnimatePresence>
        {visible && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.45)' }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild forceMount
              aria-describedby={undefined}
              // Radix 1.1 masque les voisins via aria-hidden (hideOthers) et ne
              // pose pas l'attribut — on l'expose explicitement pour la
              // checklist a11y (.ai ACCESSIBILITY_GUIDE : modale aria-modal).
              aria-modal="true"
              // Le geste recommandé d'abord : « Oui, je veux » reçoit le focus
              // à l'ouverture (à défaut du bouton Fermer, premier du DOM).
              onOpenAutoFocus={(e) => { e.preventDefault(); ouiRef.current?.focus(); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 28 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 121,
                  margin: '0 auto', width: '100%', maxWidth: 480, background: '#fff',
                  borderTopLeftRadius: 26, borderTopRightRadius: 26,
                  padding: '22px 20px calc(24px + env(safe-area-inset-bottom))',
                  textAlign: 'center',
                }}
              >
                {/* AUTH-05 — Radix `Close` : le clic déclenche la fermeture SANS
                    refus (via onOpenChange), et la cible passe à 44×44 px. */}
                <DialogPrimitive.Close asChild>
                  <button type="button" aria-label="Fermer"
                    style={{ position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <X size={18} color="#8A5A34" />
                  </button>
                </DialogPrimitive.Close>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  <Fingerprint style={{ width: 32, height: 32, color: '#B74725' }} />
                </div>
                {/* AUTH-05 — la question est un vrai `Title` de dialogue (le
                    lecteur d'écran la nomme à l'entrée dans la modale). */}
                <DialogPrimitive.Title asChild>
                  <p style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 800, color: '#3d1a08', lineHeight: 1.35 }}>
                    {prenom ? `${prenom}, veux-tu` : 'Veux-tu'} que Tantie Nanti Lou te reconnaisse la prochaine fois ?
                  </p>
                </DialogPrimitive.Title>
                <button type="button" onClick={() => { void direAccueilMarchand('reconnaissanceProposition'); }}
                  aria-label="Écouter Tantie Nanti Lou"
                  style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', border: '2px solid rgba(198,106,44,0.35)', background: '#fff7ef', color: '#B74725', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <Volume2 aria-hidden="true" size={25} />
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={repondreNon} disabled={enCours}
                    style={{ flex: 1, padding: '15px 0', borderRadius: 16, fontWeight: 800, fontSize: 15, color: '#8A5A34', background: '#fff', border: '2px solid rgba(198,106,44,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Non
                  </button>
                  <button ref={ouiRef} type="button" onClick={repondreOui} disabled={enCours}
                    style={{ flex: 1.4, padding: '15px 0', borderRadius: 16, fontWeight: 800, fontSize: 15, color: '#fff', background: enCours ? '#CBB9A8' : 'linear-gradient(135deg, #EE8E3C, #B74725)', border: 'none', cursor: enCours ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                    {enCours ? 'Un instant…' : 'Oui, je veux'}
                  </button>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
