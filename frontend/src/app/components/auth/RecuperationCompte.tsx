/**
 * ═════════════════════════════════════════════════════════════════════════
 * JÙLABA — Récupération guidée (LOT-RECOVERY, front)
 * ═════════════════════════════════════════════════════════════════════════
 * Route : /recuperation — SPEC-ECRAN-RECUPERATION.md fait foi.
 *
 * LE SCÉNARIO. Son téléphone est perdu, neuf, réinstallé : l'identifiant
 * WebAuthn est mort avec l'appareil. Elle revient ASSISTÉE — l'agent sait
 * lire et taper, elle, non. L'écran ne lui demande donc JAMAIS de taper :
 * le numéro et le code sont de l'agent (marche 1), le reste est son corps —
 * son geste « C'est mon compte » (marche 2), son doigt sur le capteur du
 * NOUVEAU téléphone (marche 3). À la fin, elle est connectée : le serveur
 * renvoie les jetons comme une connexion par empreinte.
 *
 * LA RÈGLE QUI STRUCTURE TOUT (serveur déjà verrouillé, l'écran ne fait que
 * la respecter) : LE CODE SEUL NE SUFFIT JAMAIS. La marche 3 n'existe pas
 * tant que la marche 2 n'est pas posée — l'écran ne montre même pas le
 * bouton du doigt avant le geste.
 *
 * LA VOIX. Aucun clip n'est encore enregistré pour ce parcours (scripts
 * prêts dans SPEC-ECRAN-RECUPERATION.md) : tout part par speakClipOrText
 * en texte — la porte qu'emprunte /non-enregistre et EntryGate, le filet
 * useAudioUnlockFallback en plus (rechargement frais = un écran muet).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Fingerprint, KeyRound, ShieldCheck, UserCheck } from 'lucide-react';
import { normalizeRole, ROLE_ROUTES } from '../../types/constants';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/api';
import { stockerJetonsSiMobile } from '../../utils/stockerJetonsSiMobile';
import { vibrerSucces, vibrerErreur } from '../../utils/haptique';
import { speakClipOrText } from '../../services/audioManager';
import { guidageVocal } from '../../utils/accessMode';
import { useAudioUnlockFallback } from '../../hooks/useAudioUnlockFallback';
import { navigateurWebAuthn } from '../../hooks/useWebAuthn';
import { tParle } from '../../i18n/voice/runtime';

/**
 * La durée du toucher long « C'est mon compte » (SPEC-ECRAN-RECUPERATION §2).
 * Les PHRASES, elles, vivent au catalogue voix (RECOUV_*) — une seule source,
 * la leçon login-41 : un mot d'écart = muet.
 */
export const DUREE_PRESENCE_MS = 800;

type Etape = 'code' | 'presence' | 'doigt';

export function RecuperationCompte() {
  const navigate = useNavigate();
  const { setUser: setAppUser, setAccessToken, refreshUserData } = useApp();
  const { setUser: setUserProfile } = useUser();

  const [etape, setEtape] = useState<Etape>('code');
  const [phone, setPhone] = useState('');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [jeton, setJeton] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState('');
  const [occupation, setOccupation] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const dire = useCallback((texte: string) => {
    if (!guidageVocal()) return;
    void speakClipOrText({ text: texte })
      .catch(() => { /* la voix n'est jamais bloquante */ });
  }, []);

  const direAccueil = useCallback(() => { dire(tParle('RECOUV_ACCUEIL')); }, [dire]);
  useEffect(() => { direAccueil(); }, [direAccueil]);
  useAudioUnlockFallback(direAccueil, guidageVocal());

  // ── MARCHE 1 — le code de l'agent ────────────────────────────────────────
  const initier = async () => {
    setMessageErreur('');
    if (!phone.trim() || !codeSaisi.trim()) return;
    setOccupation(true);
    try {
      const res = await fetch(`${API_URL}/auth/recuperation/initier`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: codeSaisi.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!mountedRef.current) return;
      if (data?.success && data?.jeton) {
        setJeton(data.jeton);
        setEtape('presence');
        vibrerSucces();
        dire(tParle('RECOUV_CONSIGNE_PRESENCE'));
      } else if (data?.code === 'ATTENTE') {
        setMessageErreur(data.message || 'Trop d\'essais. Attends un peu.');
        vibrerErreur();
        dire(tParle('RECOUV_ATTENTE'));
      } else {
        // Le serveur ne dit JAMAIS quoi, exactement (anti-énumération) :
        // l'écran reste sur la même uniformité, parlée.
        setMessageErreur('Numéro ou code refusé');
        vibrerErreur();
        dire(tParle('RECOUV_CODE_REFUSE'));
      }
    } catch {
      if (!mountedRef.current) return;
      setMessageErreur('Pas de réseau. Connecte-toi puis réessaie.');
      vibrerErreur();
      dire(tParle('RECOUV_HORS_LIGNE'));
    } finally {
      if (mountedRef.current) setOccupation(false);
    }
  };

  // ── MARCHE 2 — « C'est mon compte », toucher long ≥ 800 ms ───────────────
  // Le serveur ne peut pas voir un doigt : c'est l'écran qui garantit la
  // durée AVANT d'appeler consentement — le trace serveur n'arrive qu'après
  // un geste complet.
  const presenceDemarreeRef = useRef(0);
  const presenceTenueRef = useRef<number | null>(null);
  const [presenceRemplie, setPresenceRemplie] = useState(0);

  const presenceDemarrer = () => {
    if (occupation) return;
    presenceDemarreeRef.current = Date.now();
    presenceTenueRef.current = window.setTimeout(async () => {
      setPresenceRemplie(100);
      vibrerSucces();
      setOccupation(true);
      try {
        const res = await fetch(`${API_URL}/auth/recuperation/consentement`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jeton }),
        });
        const data = await res.json().catch(() => ({}));
        if (!mountedRef.current) return;
        if (data?.success) {
          setEtape('doigt');
          dire(tParle('RECOUV_CONSIGNE_DOIGT'));
        } else {
          setMessageErreur('Session expirée. Reprends du début.');
          dire(tParle('RECOUV_SESSION_EXPIREE'));
          setEtape('code');
          setJeton(null);
        }
      } catch {
        if (!mountedRef.current) return;
        setMessageErreur('Pas de réseau. Reprends du début.');
        dire(tParle('RECOUV_HORS_LIGNE'));
        setEtape('code');
        setJeton(null);
      } finally {
        if (mountedRef.current) setOccupation(false);
      }
    }, DUREE_PRESENCE_MS);
  };

  const presenceAvorter = () => {
    if (presenceTenueRef.current !== null) {
      clearTimeout(presenceTenueRef.current);
      presenceTenueRef.current = null;
    }
    const tenu = Date.now() - presenceDemarreeRef.current;
    if (presenceDemarreeRef.current > 0 && tenu < DUREE_PRESENCE_MS) {
      setPresenceRemplie(0);
      vibrerErreur();
      dire(tParle('RECOUV_PRESENCE_TROP_COURTE'));
    }
  };
  useEffect(() => () => { if (presenceTenueRef.current !== null) clearTimeout(presenceTenueRef.current); }, []);

  // ── MARCHE 3 — pose ton doigt (ré-enrôlement) ────────────────────────────
  const reEnroler = async () => {
    if (!jeton) return;
    setMessageErreur('');
    setOccupation(true);
    try {
      const optRes = await fetch(`${API_URL}/auth/recuperation/webauthn/options`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton }),
      });
      const options = await optRes.json().catch(() => ({}));
      if (!mountedRef.current) return;
      if (!options || options.error || !options.challenge) {
        setMessageErreur('Session expirée. Reprends du début.');
        dire('Session expirée. Reprends du début.');
        setEtape('code');
        setJeton(null);
        return;
      }
      let reponse: unknown;
      try {
        reponse = await navigateurWebAuthn.enregistrer({ optionsJSON: options });
      } catch {
        // Le doigt s'est posé trop tôt, ou le capteur a dit non : rien n'est
        // brûlé — le serveur attend un nouveau geste sur la même session.
        vibrerErreur();
        dire(tParle('RECOUV_DOIGT_ENCORE'));
        return;
      }
      const verRes = await fetch(`${API_URL}/auth/recuperation/re-enroler`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton, reponse }),
      });
      const data = await verRes.json().catch(() => ({}));
      if (!mountedRef.current) return;
      if (data?.verified && data?.user) {
        // Le serveur l'a reconnectée : mêmes gestes que la connexion par
        // empreinte (jetons APK + contexts + routage par rôle).
        vibrerSucces();
        dire(tParle('RECOUV_SUCCES'));
        setAppUser(data.user);
        setUserProfile(data.user);
        stockerJetonsSiMobile(data.accessToken, data.refreshToken);
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          setTimeout(() => refreshUserData(), 100);
        }
        window.dispatchEvent(new CustomEvent('julaba:token-ready'));
        const roleRoutes: Record<string, string> = {
          ...ROLE_ROUTES,
          super_admin: '/backoffice/dashboard',
          admin: '/backoffice/dashboard',
        };
        navigate(roleRoutes[normalizeRole(data.user.role)] || '/marchand');
      } else {
        vibrerErreur();
        dire(tParle('RECOUV_DOIGT_ENCORE'));
        setMessageErreur('Le doigt n\'a pas passé. Réessaie.');
      }
    } catch {
      if (!mountedRef.current) return;
      setMessageErreur('Pas de réseau. Réessaie.');
      vibrerErreur();
      dire(tParle('RECOUV_HORS_LIGNE'));
    } finally {
      if (mountedRef.current) setOccupation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#B74725] to-[#A85108] flex flex-col items-center justify-center p-4" style={{ minHeight: '100dvh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center"
        aria-labelledby="recuperation-titre"
      >
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          {etape === 'code' && <KeyRound className="w-8 h-8 text-amber-600" aria-hidden="true" />}
          {etape === 'presence' && <UserCheck className="w-8 h-8 text-green-700" aria-hidden="true" />}
          {etape === 'doigt' && <Fingerprint className="w-8 h-8 text-[#B74725]" aria-hidden="true" />}
        </div>

        <h1 id="recuperation-titre" className="text-2xl font-bold text-gray-900 mb-2">
          {etape === 'code' && 'Récupérer ton accès'}
          {etape === 'presence' && 'C\'est ton compte ?'}
          {etape === 'doigt' && 'Pose ton doigt'}
        </h1>
        <p aria-live="polite" role="status" className="text-gray-600 mb-6 text-sm">
          {etape === 'code' && 'La personne qui t\'aide tape ton numéro et le code reçu par message.'}
          {etape === 'presence' && 'Maintiens ton doigt sur le gros bouton jusqu\'au son.'}
          {etape === 'doigt' && 'Ton nouveau téléphone te reconnaît. Pose ton doigt.'}
        </p>

        {messageErreur && (
          <div role="alert" className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 mb-4 text-red-800 text-sm font-medium">
            {messageErreur}
          </div>
        )}

        {etape === 'code' && (
          <div className="flex flex-col gap-4">
            <label className="text-left text-sm font-semibold text-gray-700" htmlFor="recup-phone">
              Ton numéro (tape par la personne qui aide)
            </label>
            <input
              id="recup-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setMessageErreur(''); }}
              placeholder="07 00 00 00 00"
              className="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg"
              style={{ minHeight: 56 }}
              disabled={occupation}
            />
            <label className="text-left text-sm font-semibold text-gray-700" htmlFor="recup-code">
              Le code reçu par message (4 + 4)
            </label>
            <input
              id="recup-code"
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={codeSaisi}
              onChange={(e) => { setCodeSaisi(e.target.value.toUpperCase()); setMessageErreur(''); }}
              placeholder="ABCD-1234"
              className="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg tracking-widest uppercase"
              style={{ minHeight: 56 }}
              disabled={occupation}
            />
            <button
              type="button"
              onClick={initier}
              disabled={occupation || !phone.trim() || !codeSaisi.trim()}
              className="w-full h-14 rounded-2xl text-lg font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#B74725', minHeight: 56 }}
            >
              {occupation ? 'Un instant…' : 'Continuer'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 underline py-3"
              style={{ minHeight: 44 }}
            >
              Revenir à la connexion
            </button>
          </div>
        )}

        {etape === 'presence' && (
          <div className="flex flex-col items-center gap-4">
            {/* LE GESTE D'ELLE. Un seul gros bouton, toucher long ≥ 800 ms :
                le remplissage montre le temps, le son et la vibration disent
                la fin. Pression levée trop tôt → tout recommence, dit à voix. */}
            <button
              type="button"
              aria-label="C'est mon compte — maintiens ton doigt"
              onPointerDown={presenceDemarrer}
              onPointerUp={presenceAvorter}
              onPointerLeave={presenceAvorter}
              onPointerCancel={presenceAvorter}
              onContextMenu={(e) => e.preventDefault()}
              disabled={occupation}
              className="relative w-full rounded-3xl text-white text-xl font-extrabold overflow-hidden select-none touch-none"
              style={{ minHeight: 96, backgroundColor: '#2E7D32', touchAction: 'none' }}
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
          </div>
        )}

        {etape === 'doigt' && (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={reEnroler}
              disabled={occupation}
              className="w-full h-16 rounded-2xl text-lg font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#B74725', minHeight: 64 }}
            >
              <Fingerprint aria-hidden="true" size={26} />
              {occupation ? 'Un instant…' : 'Poser mon doigt'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
