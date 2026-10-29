import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { KeyRound, CheckCircle, ShieldCheck, Delete } from 'lucide-react';
import { activerCompte } from '../../services/authService';
import { glyphePourChiffre } from '../../services/clavierImage';
import { speakClipOrText } from '../../services/audioManager';
import { vibrerErreur, vibrerSucces } from '../../utils/haptique';
import { guidageVocal } from '../../utils/accessMode';
import { useAudioUnlockFallback } from '../../hooks/useAudioUnlockFallback';
import { tParle } from '../../i18n/voice/runtime';

// ────────────────────────────────────────────────────────────────────────────
// ÉCRAN D'ACTIVATION — LOT-ACTIVATION (P0-AUTH-02, SPEC-AUTH-CIBLE §1).
//
// CE QUI CHANGE, ET POURQUOI. L'ancien écran (P0.0, ADR-002) demandait un
// code d'activation, un PIN et sa confirmation dans TROIS CHAMPS DE TEXTE —
// sans geste, sans trace : une marchande qui ne lit pas y restait devant des
// mots. La cible (§1.1) exige : enrôlement sur SON téléphone, UN CONSENTEMENT
// EXPLICITE horodaté (le geste d'elle), un secret CHOISI PAR ELLE, jamais
// 0000. L'écran suit donc le même scénario que la récupération — trois
// marches, une par écran :
//
//   1. « Le code reçu »  — l'agent peut le taper ou le lui épeler ; le code
//      est usage unique, consommé à l'activation : pas un secret, un billet.
//   2. « Choisis ton code » — LE PAVÉ (décision B5 : le secret ne passe JAMAIS
//      par un champ libre ni par la voix), avec les ronds qui se remplissent
//      et les glyphes images (même préférence que la connexion,
//      julaba_pin_images). Deux fois : choisir, puis redire.
//   3. « C'est mon compte » — LE GESTE D'ELLE : toucher long ≥ 800 ms,
//      remplissage visible, son + vibration à la levée du geste COMPLET
//      seulement. L'appel serveur n'existe qu'après un geste tenu — le
//      serveur horodate (ACTIV_CONSENTEMENT), c'est la trace du consentement.
//
// LA CHARTE : zéro hex en dur (budget 0 de authCharte.test.mts) — les jetons
// commerce portent chaque couleur, comme partout dans l'auth (AUTH-08).
// ────────────────────────────────────────────────────────────────────────────

/** La durée du toucher long « C'est mon compte » (même geste que la récupération). */
export const DUREE_CONSENTEMENT_MS = 800;

/** Interdits côté écran — le serveur refuse les mêmes (activation.service). */
const PINS_INTERDITS = new Set(['0000', '1234']);

type Etape = 'code' | 'secret' | 'presence';
type EtapeCode = 'nouveau' | 'confirme';

const BG = 'rgba(255,247,237,0.9)';
const BORDER = 'rgba(198,106,44,0.3)';
const ACTION = 'var(--commerce-action)';

export function ActivationScreen() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState<Etape>('code');
  const [code, setCode] = useState('');
  const [etapeCode, setEtapeCode] = useState<EtapeCode>('nouveau');
  const [pin, setPin] = useState('');
  const [premierPin, setPremierPin] = useState('');
  const [pinEnImages, setPinEnImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // La voix part par le catalogue (ACTIV_*) — le texte affiché EST le texte
  // dit : la leçon login-41 (un mot d'écart = muet). Le clip viendra quand
  // la séance studio aura enregistré la famille (CLIPS-VOIX-A-ENREGISTRER).
  const dire = useCallback((texte: string) => {
    if (!guidageVocal() || !texte) return;
    try { void speakClipOrText({ text: texte }); } catch { /* la voix n'est jamais bloquante */ }
  }, []);

  const direAccueil = useCallback(() => dire(tParle('ACTIV_ACCUEIL')), [dire]);
  useEffect(() => { direAccueil(); }, [direAccueil]);
  // FILET DE RATTRAPAGE : /activation est une route de premier niveau (lien
  // direct reçu par SMS) — elle peut être le TOUT PREMIER écran d'une page
  // fraîchement chargée, sans geste préalable : sans lui, écran muet.
  useAudioUnlockFallback(direAccueil, guidageVocal());

  useEffect(() => {
    if (!error) return;
    vibrerErreur();
    dire(error);
  }, [error, dire]);

  useEffect(() => {
    if (!success) return;
    vibrerSucces();
    dire(tParle('ACTIV_SUCCES'));
  }, [success, dire]);

  // ── MARCHE 1 — le code reçu ──────────────────────────────────────────────
  const continuer = () => {
    if (!code.trim()) {
      setError(tParle('ACTIV_CODE_MANQUANT'));
      return;
    }
    setError('');
    setEtape('secret');
    setEtapeCode('nouveau');
    setPin('');
    setPremierPin('');
    dire(tParle('ACTIV_CONSIGNE_CHOISIR'));
  };

  // ── MARCHE 2 — elle choisit son code sur le pavé (B5) ───────────────────
  const toucheChiffre = (d: string) => {
    if (loading || pin.length >= 4) return;
    const suite = pin + d;
    setPin(suite);
    setError('');
    if (suite.length < 4) return;
    if (etapeCode === 'nouveau') {
      if (PINS_INTERDITS.has(suite)) {
        vibrerErreur();
        setError(tParle('ACTIV_CODE_TROP_SIMPLE'));
        setPin('');
        return;
      }
      setPremierPin(suite);
      setPin('');
      setEtapeCode('confirme');
      vibrerSucces();
      dire(tParle('ACTIV_CONSIGNE_REDIS'));
      return;
    }
    if (suite !== premierPin) {
      vibrerErreur();
      setPin('');
      setPremierPin('');
      setEtapeCode('nouveau');
      setError(tParle('ACTIV_CODE_DIFFERENT'));
      return;
    }
    vibrerSucces();
    setError('');
    setEtape('presence');
    dire(tParle('ACTIV_CONSIGNE_PRESENCE'));
  };

  const effacerChiffre = () => { if (!loading) { setPin((v) => v.slice(0, -1)); setError(''); } };

  // ── MARCHE 3 — LE GESTE D'ELLE, puis le serveur ──────────────────────────
  // Même mécanisme que la récupération : le serveur ne peut pas voir un
  // doigt ; l'écran garantit la durée AVANT d'appeler — le trace serveur
  // (ACTIV_CONSENTEMENT, horodaté) n'arrive qu'après un geste complet.
  const presenceDemarreeRef = useRef(0);
  const presenceTenueRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [presenceRemplie, setPresenceRemplie] = useState(0);
  useEffect(() => () => { if (presenceTenueRef.current) clearTimeout(presenceTenueRef.current); }, []);

  const activer = useCallback(async (secret: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await activerCompte(code.trim(), secret);
      if (res.success) {
        setSuccess(true);
        timeoutRef.current = setTimeout(() => navigate('/'), 2200);
      } else {
        // Code expiré, déjà utilisé, inconnu : le billet est mort, on reprend
        // à la marche 1 — le secret choisi ne part nulle part, rien n'est perdu.
        setError(tParle('ACTIV_CODE_REFUSE'));
        setEtape('code');
        setPin('');
        setPremierPin('');
      }
    } catch {
      setError(tParle('ACTIV_HORS_LIGNE'));
    } finally {
      setLoading(false);
    }
  }, [code, navigate]);

  const presenceDemarrer = () => {
    if (loading) return;
    presenceDemarreeRef.current = Date.now();
    presenceTenueRef.current = setTimeout(() => {
      setPresenceRemplie(100);
      vibrerSucces();
      void activer(premierPin);
    }, DUREE_CONSENTEMENT_MS);
  };

  const presenceAvorter = () => {
    if (presenceTenueRef.current) {
      clearTimeout(presenceTenueRef.current);
      presenceTenueRef.current = null;
    }
    const tenu = Date.now() - presenceDemarreeRef.current;
    if (presenceDemarreeRef.current > 0 && tenu < DUREE_CONSENTEMENT_MS && !loading) {
      setPresenceRemplie(0);
      vibrerErreur();
      dire(tParle('ACTIV_PRESENCE_TROP_COURTE'));
    }
  };

  const basculerImages = () => {
    setPinEnImages((v) => {
      const next = !v;
      try { localStorage.setItem('julaba_pin_images', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
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
            {etape === 'presence'
              ? <ShieldCheck className="w-10 h-10" style={{ color: ACTION }} />
              : <KeyRound className="w-10 h-10" style={{ color: ACTION }} />}
          </div>
          <h1 id="activation-title" className="text-2xl font-black text-gray-900">
            {etape === 'code' ? 'Active ton compte'
              : etape === 'secret' ? (etapeCode === 'nouveau' ? 'Choisis ton code' : 'Redis ton code')
              : 'C\u2019est ton compte'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm" aria-live="polite">
            {etape === 'code' ? 'Tape le code que tu as reçu. Personne d\u2019autre ne doit connaître ton code secret.'
              : etape === 'secret' ? (etapeCode === 'nouveau' ? 'Quatre chiffres, ceux que tu utiliseras tous les jours.' : 'Une deuxième fois, pour être sûre.')
              : 'Maintiens ton doigt sur le gros bouton jusqu\u2019au son.'}
          </p>
        </div>

        {/* MARCHE 1 — le code reçu (le billet d'une seule fois, pas un secret). */}
        {etape === 'code' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 space-y-4" style={{ borderColor: BORDER }}>
            <div>
              <label htmlFor="activation-code" className="block text-sm font-bold text-gray-700 mb-2">Code d&apos;activation</label>
              {/* AUTH-11 — one-time-code est ici le VRAI sens. */}
              <input id="activation-code" type="text" inputMode="text" autoCapitalize="none" autoComplete="one-time-code"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'activation-erreur' : undefined}
                value={code} onChange={e => setCode(e.target.value)} placeholder="Code reçu à l'enrôlement"
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold"
                style={{ borderColor: BORDER }} />
            </div>
            {error && <p id="activation-erreur" role="alert" aria-live="assertive" className="text-red-500 text-sm font-semibold">{error}</p>}
            {/* Indice visuel (décision Patrick 26/10) : le geste à faire
                CLIGNOTE à l'arrivée sur la vue — 6 clignements puis silence. */}
            <motion.button type="button" onClick={continuer} disabled={loading}
              className="login-cue-clignote w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-50"
              style={{ backgroundColor: ACTION }} whileTap={{ scale: 0.98 }}>
              Continuer
            </motion.button>
          </div>
        )}

        {/* MARCHE 2 — le pavé (B5 : le secret se tape, il ne se dicte pas). */}
        {etape === 'secret' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2" style={{ borderColor: BORDER }}>
            {/* Les ronds se remplissent : le seul retour lisible sans savoir lire. */}
            <div className="flex justify-center gap-3 mb-6" role="status" aria-live="polite"
              aria-label={`${pin.length} chiffre${pin.length > 1 ? 's' : ''} sur 4`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: i < pin.length ? ACTION : 'transparent',
                  border: `2px solid ${ACTION}`, display: 'inline-block',
                }} />
              ))}
            </div>

            {error && <p className="text-center text-sm font-bold mb-4 text-red-700" role="alert">{error}</p>}

            {/* Indice visuel : le geste à faire CLIGNOTE à l'arrivée. */}
            <div className="login-cue-clignote grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} type="button" disabled={loading}
                  onPointerDown={(e) => e.preventDefault()} onClick={() => toucheChiffre(d)}
                  aria-label={pinEnImages ? glyphePourChiffre(d, true) : `Chiffre ${d}`}
                  style={{ minHeight: 56, borderRadius: 16, fontSize: 24, fontWeight: 800,
                    background: 'var(--commerce-surface)', border: `2px solid var(--commerce-line)`,
                    color: 'var(--commerce-ink)' }}>
                  {glyphePourChiffre(d, pinEnImages)}
                </button>
              ))}
              <span />
              <button type="button" disabled={loading}
                onPointerDown={(e) => e.preventDefault()} onClick={() => toucheChiffre('0')}
                aria-label={pinEnImages ? glyphePourChiffre('0', true) : 'Chiffre 0'}
                style={{ minHeight: 56, borderRadius: 16, fontSize: 24, fontWeight: 800,
                  background: 'var(--commerce-surface)', border: `2px solid var(--commerce-line)`,
                  color: 'var(--commerce-ink)' }}>
                {glyphePourChiffre('0', pinEnImages)}
              </button>
              <button type="button" disabled={loading} onClick={effacerChiffre} aria-label="Effacer le dernier chiffre"
                style={{ minHeight: 56, borderRadius: 16, fontSize: 22, fontWeight: 800,
                  background: 'var(--commerce-surface)', border: `2px solid var(--commerce-line)`,
                  color: 'var(--commerce-ink)' }}>
                <Delete aria-hidden="true" className="inline-block" />
              </button>
            </div>

            {/* Elle a choisi son code avec des images : elle doit pouvoir en
                choisir un nouveau de la même façon. Même préférence que la
                connexion (julaba_pin_images), pas un réglage de plus. */}
            <button type="button" onClick={basculerImages}
              aria-label={pinEnImages ? 'Revenir aux chiffres' : 'Afficher des images à la place des chiffres'}
              style={{ display: 'block', margin: '18px auto 0', minHeight: 44, padding: '0 12px',
                background: 'transparent', border: 'none', fontWeight: 700, color: ACTION }}>
              {pinEnImages ? 'Revenir aux chiffres' : 'Utiliser des images'}
            </button>
          </div>
        )}

        {/* MARCHE 3 — LE GESTE D'ELLE. Toucher long ≥ 800 ms ; l'appel serveur
            (et sa trace horodatée) n'existe qu'après un geste complet. */}
        {etape === 'presence' && (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              aria-label="C'est mon compte — maintiens ton doigt"
              onPointerDown={presenceDemarrer}
              onPointerUp={presenceAvorter}
              onPointerLeave={presenceAvorter}
              onPointerCancel={presenceAvorter}
              onContextMenu={(e) => e.preventDefault()}
              disabled={loading}
              className="relative w-full rounded-3xl text-white text-xl font-extrabold overflow-hidden select-none touch-none"
              style={{ minHeight: 96, backgroundColor: 'var(--commerce-green)', touchAction: 'none' }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-green-800/70 transition-none"
                style={{ width: `${presenceRemplie}%` }}
              />
              <span className="relative flex items-center justify-center gap-2">
                <ShieldCheck aria-hidden="true" size={28} />
                C&apos;est mon compte
              </span>
            </button>
            {loading && <p className="text-center text-sm text-gray-500">Un instant…</p>}
          </div>
        )}
      </motion.div>
    </div>
  );
}
