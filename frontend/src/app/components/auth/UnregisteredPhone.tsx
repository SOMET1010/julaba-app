/**
 * UnregisteredPhone : écran affiché quand le numéro saisi n’est pas enregistré.
 * Route : /non-enregistre
 * Accessible uniquement via navigation programmatique (Login.tsx) avec state.phone.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Phone, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { getSystemSettings } from '../../utils/api';
import { speakClipOrText } from '../../services/audioManager';
import { ENTREE_VOICE_CLIPS } from '../../services/entreeVoix';
import { guidageVocal } from '../../utils/accessMode';
import { useAudioUnlockFallback } from '../../hooks/useAudioUnlockFallback';
// AUTH-14 — le diagnostic technique se tait dans le build livré (DEV seulement).
import { warnDev } from '../../utils/warnDev';

/**
 * Masque partiellement un numéro de téléphone pour limiter l’exposition PII.
 * Format : "+225 XX XX XX 12 34" (4 derniers chiffres visibles).
 * Si format inconnu, masque tout sauf les 4 derniers caractères.
 */
function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 5) return phone;
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.startsWith('+225') ? '+225' : '';
  const middleLen = cleaned.length - last4.length - prefix.length;
  if (middleLen <= 0) return phone;
  const masked = 'X'.repeat(Math.min(middleLen, 6));
  return `${prefix} ${masked} ${last4}`.trim();
}

export function UnregisteredPhone() {
  const location = useLocation();
  const navigate = useNavigate();
  const phone: string = location.state?.phone || '';
  const [supportPhone, setSupportPhone] = useState<string>('');
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Si pas de numéro transmis, retour direct à la connexion
  useEffect(() => {
    if (!phone && mountedRef.current) {
      navigate('/', { replace: true });
    }
  }, [phone, navigate]);

  // ── L'ERREUR DE NUMÉRO SE DIT — « toutes les éventualités », 26/10 ────────
  // Patrick : « quand il y a une erreur de numéro, on doit avoir également
  // un clip ». Avant ce lot, cet écran était ENTIERMENT muet : la marchande
  // dont le numéro n'est pas enregistré voyait une page, vibrait de rien,
  // et ne comprenait pas. Deux clips enchaînés — l'état (« pas encore
  // enregistré »), puis le geste (« contacte un agent… ») — les mêmes textes
  // que la page affiche, cités DEPUIS entreeVoix (une seule source : la
  // leçon login-41 — un mot d'écart = muet).
  const direNumeroInconnu = useCallback(() => {
    if (!guidageVocal()) return;
    const accueil = ENTREE_VOICE_CLIPS.numeroNonEnregistre;
    const geste = ENTREE_VOICE_CLIPS.numeroNonEnregistreAide;
    void speakClipOrText({ clipUrl: accueil.file, text: accueil.texte })
      .then(() => speakClipOrText({ clipUrl: geste.file, text: geste.texte }))
      .catch(() => { /* la voix n'est jamais bloquante */ });
  }, []);

  useEffect(() => {
    direNumeroInconnu();
  }, [direNumeroInconnu]);

  // FILET DE RATTRAPAGE : /non-enregistre peut être rechargée fraîche (la
  // navigation arrive d'un tap, mais un refresh la rejoue sans geste) — même
  // filet que Welcome/ActivationScreen.
  useAudioUnlockFallback(direNumeroInconnu, guidageVocal());

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    getSystemSettings().then(response => {
      if (!mountedRef.current) return;
      if (response.success && response.settings?.supportPhone) {
        setSupportPhone(response.settings.supportPhone);
      }
    }).catch((err) => {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      warnDev('[UnregisteredPhone] getSystemSettings failed:', err instanceof Error ? err.message : err);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#B74725] to-[#A85108] flex flex-col items-center justify-center p-4" style={{ minHeight: '100dvh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center"
        aria-labelledby="unregistered-phone-title"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5"
        >
          <UserX className="w-8 h-8 text-amber-600" aria-hidden="true" />
        </motion.div>

        <h1 id="unregistered-phone-title" className="text-2xl font-bold text-gray-900 mb-3">
          Numéro non enregistré
        </h1>
        
        <p role="alert" aria-live="polite" className="text-gray-600 mb-6">
          Le numéro <span className="font-bold text-[#B74725]">{maskPhone(phone)}</span> n’est pas encore enregistré sur Jùlaba.
        </p>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
          <p className="text-sm text-amber-800 font-medium mb-4">
            Pour créer ton compte, contacte un agent identificateur ou un administrateur Jùlaba.
          </p>
          
          {supportPhone && (
            <motion.a
              href={`tel:${supportPhone}`}
              aria-label={`Appeler le support au ${supportPhone}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 text-[#B74725]/70 text-sm px-4 py-2 rounded-lg hover:text-[#B74725] hover:bg-[#B74725]/10 transition-all"
            >
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{supportPhone}</span>
            </motion.a>
          )}
        </div>

        <Button
          onClick={() => navigate('/')}
          className="login-cue-clignote w-full h-14 rounded-2xl text-lg font-semibold"
          style={{ backgroundColor: '#B74725' }}
        >
          Retour à la connexion
          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
        </Button>
      </motion.div>
    </div>
  );
}
