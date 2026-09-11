import { normalizeRole, ROLE_ROUTES } from '../../types/constants';
import { stopAllVoice } from '../../services/audioManager';
import { stopIntro } from '../../services/onboardingVoix';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Fingerprint, Mic, Volume2, KeyRound, Users, UserRound, ChevronLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useBackOfficeOptional } from '../../contexts/BackOfficeContext';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import logoJulaba from '../../../assets/images/logo-julaba.svg';
import tataNantiLou from '../../../assets/images/tata-nanti-lou.png';
import { BrandSignature } from '../shared/BrandSignature';
import { authenticateWebAuthn } from '../../hooks/useWebAuthn';
import { API_URL } from '../../utils/api';
import { extractPhoneDigits, fusionnerChiffresDictes } from '../../utils/frenchDigits';
import { tataUiClipForText } from '../../services/tataUiClips';
import { voixSecoursNom } from '../../services/elevenlabs';
import { speak as managerSpeak, speakClipOrText } from '../../services/audioManager';
import { startLiveDictation, offlineModelReady, offlineModelInstalled } from '../../voice-offline/offlineStt';
import { InstallerOffline } from '../../voice-offline/InstallerOffline';
import { getEffectiveMode, guidageVocal, clavierParDefaut, noterCanal, suggestionAuto, marquerDemande, setAccessMode, type EffectiveMode } from '../../utils/accessMode';
import { numeroCIComplet, operateurDe, OP_COULEUR, type Operateur } from '../../utils/civNumbers';
import { dernierCompte, memoriserCompte, type CompteMemorise } from '../../services/comptesMemorises';
import { vibrerSucces, vibrerErreur } from '../../utils/haptique';
import { glyphePourChiffre } from '../../services/clavierImage';
import { useAudioUnlockFallback } from '../../hooks/useAudioUnlockFallback';

// Configuration d'une dictée de chiffres EN DIRECT (numéro OU code). Le moteur est
// le MÊME (un seul rouage) ; seuls la longueur, la validité et l'aiguillage changent.
type DicteeCfg = {
  max: number;                       // nb de chiffres attendus (10 = numéro, 4 = code)
  estComplet: (d: string) => boolean; // quand la valeur est « bonne » → on s'arrête
  onLive: (d: string) => void;        // remplissage à l'écran au fil de la voix
  onFinal: (d: string) => void;       // valeur figée → aiguillage
  buildTag: string;
  siPasPrete: () => void;             // moteur pas installé
  siMicRefuse: () => void;            // micro refusé
  siEchec: () => void;                // démarrage moteur échoué
};
import { vlog, vlogStart, vlogPartager } from '../../utils/voiceDebug';
/**
 * BACKLOG ESCALATION P0 BACKEND (à traiter côté serveur, hors périmètre frontend) :
 * 1. /auth/check-phone : timing attack possible (énumération comptes existants)
 *    -> backend doit retourner réponse uniforme + délai constant
 * 2. /auth/login : rate limit côté serveur OBLIGATOIRE
 *    -> loginAttempts clientside (RAM) est cosmétique, contournable par refresh
 * 3. TEST_PHONES bypass régex actif en PRODUCTION (décision métier ANSUT)
 *    -> backend doit logger ces accès + valider liste autorisée
 * Ne PAS retirer ces protections frontend tant que le backend ne les implémente pas.
 */
const loginAttempts: Record<string, { count: number; lastAttempt: number }> = {};
// Blocage progressif des tentatives PIN : paliers de 3 échecs consécutifs.
const PALIER_STEP = 3;
const PALIER_1 = 3;   // 3 échecs  -> blocage temporaire court
const PALIER_2 = 6;   // 6 échecs  -> blocage temporaire moyen
const PALIER_3 = 9;   // 9 échecs  -> blocage total (déblocage identificateur, cosmétique pour l'instant)
const DUREE_1 = 5 * 60 * 1000;   // 5 minutes
const DUREE_2 = 15 * 60 * 1000;  // 15 minutes
/**
 * Durée de blocage (ms) déclenchée par `count` échecs consécutifs.
 * - null      : aucun palier atteint, pas de blocage.
 * - Infinity  : palier 3 atteint, blocage total (déblocage identificateur).
 * - autre     : durée du blocage temporaire (paliers 1 et 2).
 */
function dureeBlocagePalier(count: number): number | null {
  if (count >= PALIER_3) return Infinity;
  if (count % PALIER_STEP !== 0) return null;
  if (count >= PALIER_2) return DUREE_2;
  if (count >= PALIER_1) return DUREE_1;
  return null;
}
/**
 * Numéros de test attribués au client institutionnel ANSUT pour la recette.
 * Ces numéros bypassent la regex de préfixe opérateur (01/05/07/09/21/25/27)
 * car ils n'appartiennent pas aux opérateurs télécom standards.
 *
 * MAINTENIR cette liste à jour si ANSUT/DGE ajoute des comptes test.
 * Format : 10 chiffres sans le préfixe pays (+225).
 *
 * Actif en développement ET en production (décision métier).
 */
const TEST_PHONES = new Set<string>([
  '0840404040', // Anvo KOBENAN (test ANSUT)
  '0850505050', // Zadi MIAN (test ANSUT)
  '0860606060', // Adele EHUI (test ANSUT)
  '0820202020', // Yves KOUKOUGNON (test ANSUT)
  '2100000000', // Compte institutionnel ANSUT
  '2200000000', // Compte institutionnel DGE
]);

export function LoginPassword() {
  const navigate = useNavigate();
  const { setUser: setAppUser, setAccessToken, refreshUserData } = useApp();
  const { setUser: setUserProfile } = useUser();
  const backOfficeCtx = useBackOfficeOptional();
  const setBOUser = backOfficeCtx?.setBOUser ?? (() => {});

  // « Tata se souvient de moi » (connexion inclusive, lot 1) : si une personne
  // est déjà connue sur CE téléphone, Tata l'accueille par son prénom et ne lui
  // redemande JAMAIS ses 10 chiffres — reconnaissance (visage/doigt) ou code.
  // « Ce n'est pas moi » ramène au parcours classique (téléphone partagé).
  const [compteConnu] = useState<CompteMemorise | null>(() => {
    try { return dernierCompte(window.localStorage); } catch { return null; }
  });
  const [phone, setPhone] = useState(compteConnu?.phone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showDevButton, setShowDevButton] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [step, setStep] = useState<'reconnaissance' | 'phone' | 'password'>(compteConnu ? (compteConnu.biometrie ? 'reconnaissance' : 'password') : 'phone');
  const [isListening, setIsListening] = useState(false);
  const [isFinalizingDictation, setIsFinalizingDictation] = useState(false);
  // Mode d'accès EFFECTIF (résout 'auto' via l'usage observé) : l'écran S'ADAPTE
  // (lecture = clavier direct, mixte = les deux, voix = micro au centre).
  const accessMode: EffectiveMode = getEffectiveMode();
  const [showKeypad, setShowKeypad] = useState(clavierParDefaut(accessMode)); // ouvert d'office en mode lecture
  // Voix (écoute) réellement disponible sur l'appareil (moteur natif prêt) :
  // signal de certification MINIMAL (design v0.3). Fausse aujourd'hui sur le web
  // et sur l'APK sans moteur → le NUMÉRO se saisit au PAVÉ, sans micro trompeur.
  // (Lot 5 remplacera ce signal par une certification vocale complète.)
  const voixEcouteDispo = (() => { try { return offlineModelReady(); } catch { return false; } })();
  // Le pavé est la référence : toujours visible tant que la voix n'écoute pas.
  const clavierVisible = showKeypad || !voixEcouteDispo;
  // Clavier imagé (variante A, doc « mot de passe imagé ») : correspondance
  // FIXE et publique chiffre→image sur le pavé PIN, en OPTION — jamais le mode
  // par défaut (personne n'est surprise par un pavé déjà connu). Le PIN envoyé
  // reste les mêmes chiffres ; seul le glyphe affiché change.
  const [pinEnImages, setPinEnImages] = useState<boolean>(() => {
    try { return localStorage.getItem('julaba_pin_images') === '1'; } catch { return false; }
  });
  const basculerPinEnImages = () => {
    setPinEnImages((v) => {
      const next = !v;
      try { localStorage.setItem('julaba_pin_images', next ? '1' : '0'); } catch { /* ignore */ }
      // Annonce le CHANGEMENT DE MODE, jamais le PIN — la correspondance est
      // publique (variante A), donc rien de secret n'est dit ici.
      if (guidageVocal(accessMode)) {
        parle(next ? 'Maintenant, des images à la place des chiffres.' : 'Retour aux chiffres.');
      }
      return next;
    });
  };
  // Canal utilisé pour CETTE identification (clavier / voix) → apprentissage 'auto'.
  const dernierCanalRef = useRef<'clavier' | 'voix' | null>(null);
  // Proposition d'adaptation de Tata (mode 'auto' + préférence franche observée).
  const [suggestion] = useState(() => suggestionAuto());
  const [suggReponse, setSuggReponse] = useState(false); // déjà répondu → on masque
  const [tataSpeaking, setTataSpeaking] = useState(false);
  const [operateur, setOperateur] = useState<Operateur | null>(null); // opérateur déduit du numéro
  const [showVoiceInstall, setShowVoiceInstall] = useState(false);    // proposer d'installer la voix (consenti)
  // MODE DÉVELOPPEUR (caché) : outils de test (rapport, version, tutoriel…). Masqué
  // pour la marchande (expérience simple). On l'active en tapant 5× le coin haut-gauche.
  const [devMode, setDevMode] = useState<boolean>(() => {
    try { return import.meta.env.DEV || localStorage.getItem('julaba_dev_mode') === '1'; } catch { return false; }
  });
  const devTapRef = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
  const toggleDevMode = () => {
    const now = Date.now();
    const s = devTapRef.current;
    s.n = (now - s.t < 600) ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 5) {
      s.n = 0;
      setDevMode((v) => {
        const nv = !v;
        try { localStorage.setItem('julaba_dev_mode', nv ? '1' : '0'); } catch { /* ignore */ }
        try { navigator.vibrate?.(nv ? [30, 40, 30] : 20); } catch { /* ignore */ }
        return nv;
      });
    }
  };

  // Accueil personnalisé : si une marchande est déjà connue sur ce téléphone, on
  // la salue par son prénom (ton « vous », chaleureux et respectueux).
  // Source de vérité : le COMPTE MÉMORISÉ (comptesMemorises, survit à la
  // déconnexion) ; julaba_auth_user en simple repli (effacé au logout).
  const cachedPrenom = (() => {
    const memorise = (compteConnu?.prenom || '').trim();
    if (memorise) return memorise;
    try {
      const u = JSON.parse(localStorage.getItem('julaba_auth_user') || 'null');
      return (u?.firstName || u?.first_name || u?.prenom || '').toString().trim();
    } catch { return ''; }
  })();
  const greetTitle = cachedPrenom ? `Bonjour Maman ${cachedPrenom}` : 'Bonjour ma sœur !';
  const greetSub = cachedPrenom
    ? 'Je suis heureuse de vous revoir aujourd’hui.'
    : 'Je suis Tata Nanti Lou. Je serai à vos côtés pour vous aider.';

  // « Écouter Tata » : accueil vocal. On utilise la VOIX DU NAVIGATEUR (fiable et
  // correcte) — le clip enregistré /voix/tata/phrase-1.mp3 côté serveur contenait
  // une phrase de CAISSE (« vendu 10 tomates… »), rien à voir avec le login.
  // Quand un vrai enregistrement d'accueil sera fourni, on pourra le rebrancher.
  const ecouterTata = () => {
    setTataSpeaking(true);
    // La consigne suit l'ÉTAPE : accueil reconnu (geste unique) ou numéro à dire.
    const consigne = step === 'reconnaissance' && compteConnu
      ? (compteConnu.biometrie
        ? 'Touche le grand bouton, ton téléphone va te reconnaître.'
        : 'Touche le grand bouton et entre ton code.')
      : 'Dis ton numéro, ou tape-le.';
    // UNE SEULE voix de secours dans toute l'appli (speakBrowser) : même voix FR,
    // même débit, même timbre partout → fini le « mélange de voix ».
    try { managerSpeak(`${greetTitle}. ${greetSub}. ${consigne}`).finally(() => setTataSpeaking(false)); }
    catch { setTataSpeaking(false); }
    setTimeout(() => setTataSpeaking(false), 8000); // filet
  };
  const phoneToPasswordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dictée EN DIRECT : poignée d'arrêt du moteur, garde anti-double-fin, meilleurs
  // chiffres entendus jusqu'ici, minuteur d'apaisement (fin de phrase incomplète).
  const liveStopRef = useRef<null | (() => Promise<void>)>(null);
  const dictDoneRef = useRef(false);
  const bestDigitsRef = useRef('');
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Minuteur de STABILITÉ des 10 chiffres : quand on atteint 10 sur un partiel, on
  // attend que la valeur ne bouge plus (le temps qu'un « vingt » devienne « vingt-six »)
  // avant de figer. Évite de couper un nombre composé à moitié formé.
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTenRef = useRef('');
  const dictCfgRef = useRef<DicteeCfg | null>(null); // config de la dictée en cours
  const phoneRef = useRef(phone);
  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  // Voix pour la connexion (écran AVANT connexion → on utilise la voix intégrée
  // du navigateur). Une vendeuse qui ne lit pas peut ainsi entendre les consignes
  // et les erreurs au lieu de devoir lire un petit texte.
  // Voix intégrée du téléphone (hors-ligne, PAS Internet) — dernier recours. On
  // Toute la voix de cet écran passe par l'audioManager (créneau exclusif,
  // hygiène post-audit C3) : clip de la VRAIE Tata quand la phrase correspond à
  // un clip enregistré, sinon voix de secours FR — le repli est géré DANS le
  // même créneau, donc jamais deux voix superposées, et stopAllVoice() coupe tout.
  const parle = (texte: string) => {
    if (!texte) return;
    let clip: string | null = null;
    try { clip = tataUiClipForText(texte); } catch { /* ignore */ }
    try { void speakClipOrText({ clipUrl: clip ?? undefined, text: texte }); } catch { /* ignore */ }
  };
  // GUIDAGE VOCAL selon le mode : en mode « lecture » (elle lit vite), on ne parle
  // PAS automatiquement (le texte suffit). En mixte/voix, Tata annonce erreurs et
  // consignes. La lecture manuelle (toucher Tata, le cadenas…) reste toujours possible.
  // L'erreur se SENT (vibration longue) quel que soit le profil — et se dit
  // en guidage vocal. Une sourde ou une marchande dans le bruit la perçoit.
  useEffect(() => { if (error) { vibrerErreur(); if (guidageVocal(accessMode)) parle(error); } }, [error]);
  useEffect(() => { if (step === 'password' && guidageVocal(accessMode)) parle('Entre ton code secret à 4 chiffres'); }, [step]);
  // « Tata se souvient de moi » : à l'arrivée, Tata SALUE par le prénom et dit le
  // geste à faire — l'écran n'a rien à lire. (Une seule fois, au montage.)
  // FILET DE RATTRAPAGE : cet écran ('reconnaissance') peut être le TOUT
  // PREMIER de la page à un retour d'app (EntryGate saute Welcome/Onboarding
  // via ses drapeaux persistés dès que compteConnu existe) — sans geste
  // préalable dans CETTE session, l'audio reste bloqué par le navigateur.
  // Même filet que Welcome.tsx/OnboardingSlides.tsx.
  const direAccueilReconnaissance = useCallback(() => {
    if (!(step === 'reconnaissance' && compteConnu && guidageVocal(accessMode))) return;
    const salut = compteConnu.prenom ? `Bonjour ${compteConnu.prenom} !` : 'Bonjour ma sœur !';
    const geste = compteConnu.biometrie
      ? 'Touche le grand bouton, ton téléphone va te reconnaître.'
      : 'Touche le grand bouton et entre ton code.';
    try { void managerSpeak(`${salut} ${geste}`); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, compteConnu, accessMode]);

  useEffect(() => {
    direAccueilReconnaissance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAudioUnlockFallback(direAccueilReconnaissance, step === 'reconnaissance' && !!compteConnu && guidageVocal(accessMode));
  // Tata propose l'adaptation (mode 'auto') : elle le DIT (une fois) — c'est une
  // question, pas un réglage à trouver. On l'énonce dès l'affichage.
  useEffect(() => {
    if (suggestion && !suggReponse) { try { void managerSpeak(suggestion.texte); } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Réponse à la proposition de Tata : oui → on adopte le mode ; non → on met en pause.
  const repondreSuggestion = (oui: boolean) => {
    if (!suggestion) return;
    if (oui) {
      setAccessMode(suggestion.mode);
      parle('C\'est fait. Je m\'adapte à toi.');
    } else {
      marquerDemande();
      parle('D\'accord, on ne change rien.');
    }
    setSuggReponse(true);
  };

  // Pré-réveil du backend. Sur Render gratuit, le serveur se met EN VEILLE après
  // inactivité et met ~50 s à redémarrer ; la 1re requête de login tombait alors
  // dans le vide → « Erreur de connexion ». On envoie un ping /health dès que
  // l'écran s'affiche (pendant que l'utilisatrice tape son numéro/code), pour que
  // le serveur soit déjà réveillé au moment du « Se connecter ». Silencieux.
  useEffect(() => {
    let annule = false;
    const reveiller = () => { try { fetch(`${API_URL}/health`, { method: 'GET', cache: 'no-store' }).catch(() => {}); } catch { /* ignore */ } };
    reveiller();
    // Un 2e ping ~8 s après, au cas où le 1er a lancé le démarrage sans le finir.
    const t = setTimeout(() => { if (!annule) reveiller(); }, 8000);
    return () => { annule = true; clearTimeout(t); };
  }, []);

  const scheduleTransitionToPasswordAfterCheck = (confirmedPhone: string) => {
    if (isLoading || isListening || isFinalizingDictation || !numeroCIComplet(confirmedPhone, TEST_PHONES)) return;
    setIsLoading(true);
    if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
    phoneToPasswordTimeout.current = setTimeout(async () => {
      const curr = confirmedPhone;
      if (phoneRef.current !== curr) { setIsLoading(false); return; }

      if (import.meta.env.DEV && curr === '0501604040') {
        setIsLoading(false);
        setStep('password');
        if (focusPinTimeoutRef.current) clearTimeout(focusPinTimeoutRef.current);
        focusPinTimeoutRef.current = setTimeout(() => {
          const pinEl = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement | null;
          pinEl?.focus();
        }, 50);
        return;
      }

      const focusPin = () => {
        if (focusPinTimeoutRef.current) clearTimeout(focusPinTimeoutRef.current);
        focusPinTimeoutRef.current = setTimeout(() => {
          const pinEl = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement | null;
          pinEl?.focus();
        }, 50);
      };

      try {
        setIsLoading(true);
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const res = await fetch(`${API_URL}/auth/check-phone`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: curr.startsWith('+225') ? curr : '+225' + curr }),
          signal: abortRef.current.signal,
        });
        let data: { exists?: boolean };
        try {
          data = await res.json();
        } catch (err) {
          console.warn('[LoginPassword] check-phone json parse failed:', err instanceof Error ? err.message : err);
          if (phoneRef.current === curr) {
            setStep('password');
            setIsLoading(false);
            focusPin();
          }
          return;
        }
        if (phoneRef.current !== curr) {
          setIsLoading(false);
          return;
        }
        if (!data.exists) {
          setIsLoading(false);
          navigate('/non-enregistre', { state: { phone: curr } });
          return;
        }
        setStep('password');
        setIsLoading(false);
        focusPin();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[LoginPassword] check-phone fetch failed:', err instanceof Error ? err.message : err);
        if (phoneRef.current !== curr) {
          setIsLoading(false);
          return;
        }
        setStep('password');
        setIsLoading(false);
        focusPin();
      }
    }, 500);
  };

  // Remplit le champ numéro à partir d'une suite de chiffres (dictée vocale ou clavier).
  const remplirNumero = (sliced: string) => {
    setPhone(sliced);
    setError('');
    if (sliced.length === 10) {
      if (!numeroCIComplet(sliced, TEST_PHONES)) {
        setError('Numéro non reconnu, réessaie ou tape-le');
        return;
      }
      if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
      // Le numéro complet reste affiché jusqu’à sa confirmation explicite.
    }
  };

  // Dictée vocale du numéro — 100 % HORS-LIGNE via sherpa-onnx (natif), EN DIRECT. On transcrit
  // pendant qu'elle parle : les chiffres se remplissent à l'écran et on s'ARRÊTE
  // DÈS QU'ON A UN NUMÉRO COMPLET ET VALIDE (10 chiffres, règle CI) — jamais sur un
  // minuteur. Clavier = filet. Aucune reconnaissance navigateur (Internet).

  // Termine la dictée avec les chiffres retenus : range le micro, coupe le moteur,
  // puis AIGUILLE selon la config en cours (numéro ou code).
  //
  // CORRECTIF (numéro erroné affiché en recette, ex. « 70 00 00 00 00 ») :
  // digitsBruts n'est qu'un INSTANTANÉ — la dernière passe intermédiaire à
  // 900 ms, sur un tampon audio qui pouvait encore être incomplet. Le moteur
  // fait ENSUITE, dans stop(), une VRAIE repasse finale (re-transcription de
  // TOUT l'audio capté depuis le début, la plus fiable) — mais l'ancien code
  // AIGUILLAIT déjà cfg.onFinal(...) avec l'instantané, PUIS jetait le
  // résultat de cette repasse finale (le handler onText l'ignorait car
  // dictDoneRef.current était déjà vrai). On décidait donc sur un texte
  // partiellement traité au lieu du résultat définitif du STT. On attend
  // maintenant la fin de stop() (qui met à jour bestDigitsRef via la
  // repasse finale, cf. le handler onText plus bas) avant de conclure.
  const finaliserDictee = (digitsBruts: string) => {
    if (dictDoneRef.current) return;
    dictDoneRef.current = true;
    setIsFinalizingDictation(true);
    const cfg = dictCfgRef.current;
    if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null; }
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
    if (micStartTimeoutRef.current) { clearTimeout(micStartTimeoutRef.current); micStartTimeoutRef.current = null; }
    const stopFn = liveStopRef.current;
    liveStopRef.current = null;
    setIsListening(false); // retour visuel immédiat (micro éteint), avant même la repasse finale
    const conclure = () => {
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      mediaStreamRef.current = null;
      // bestDigitsRef a pu être mis à jour par la repasse finale pendant l'attente
      // de stopFn() (cf. onText) ; sinon on retombe sur l'instantané reçu.
      const digits = (bestDigitsRef.current || digitsBruts).slice(0, cfg?.max ?? 10);
      vlog('FINALISE', { digits, n: digits.length, ok: cfg ? cfg.estComplet(digits) : false });
      try { cfg?.onFinal(digits); } finally { setIsFinalizingDictation(false); }
    };
    if (stopFn) { void stopFn().then(conclure, conclure); } else { conclure(); }
  };

  // Re-tap micro / filet → on termine avec ce qui a été compris jusqu'ici.
  const arreterEcoute = () => { finaliserDictee(bestDigitsRef.current); };

  // ── LE ROUAGE UNIQUE de dictée EN DIRECT (numéro ET code) ───────────────────
  // On transcrit pendant qu'elle parle ; les chiffres se remplissent à l'écran ;
  // on s'ARRÊTE dès que la valeur est complète et valide (jamais sur un minuteur).
  // Gère les nombres composés (« vingt-six » : on ne fige pas sur le « vingt »).
  const demarrerDictee = async (cfg: DicteeCfg) => {
    if (isListening) { vlog('RE_TAP_STOP'); arreterEcoute(); return; }
    vlogStart('dictée'); vlog('BUILD', cfg.buildTag);
    vlog('MODEL_READY', { ready: offlineModelReady(), installed: offlineModelInstalled() });
    vlog('TTS_VOICE', voixSecoursNom());

    if (!offlineModelReady()) { vlog('STT_NOT_READY'); cfg.siPasPrete(); return; }

    vlog('MIC_ASK');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vlog('MIC_OK');
    } catch (e) {
      vlog('MIC_DENIED', String(e));
      cfg.siMicRefuse();
      return;
    }
    mediaStreamRef.current = stream;
    dictCfgRef.current = cfg;
    dernierCanalRef.current = 'voix'; // elle a choisi de PARLER (apprentissage 'auto')

    // Réinitialise l'état de dictée pour cette session d'écoute.
    dictDoneRef.current = false;
    bestDigitsRef.current = '';
    lastTenRef.current = '';
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
    if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null; }
    setError('');
    // Verrou parole/écoute (audit voix C1) : couper TOUTES les voix (clips du
    // manager, clip local de parle(), intro d'onboarding, synthèse) — le seul
    // speechSynthesis.cancel() laissait les clips HTMLAudio jouer dans le micro.
    try { stopAllVoice(); } catch { /* ignore */ }
    try { stopIntro(); } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }

    let handle: { stop: () => Promise<void> };
    try {
      handle = await startLiveDictation(stream, (texte, estFinal) => {
        // Une repasse FINALE (estFinal) fait TOUJOURS autorité sur bestDigitsRef,
        // même après le début de la finalisation (dictDoneRef déjà vrai) : c'est
        // elle que finaliserDictee() attend pour conclure sur le résultat
        // définitif du STT plutôt que sur un instantané intermédiaire (cf. le
        // commentaire de finaliserDictee). Seule la suite du handler (remplissage
        // écran, auto-arrêt) ne doit plus s'exécuter une fois la dictée finalisée.
        if (dictDoneRef.current && !estFinal) return;
        const digits = extractPhoneDigits(texte || '').slice(0, cfg.max);
        if (estFinal || digits.length > bestDigitsRef.current.length) {
          vlog('TXT', { fin: estFinal, brut: (texte || '').slice(0, 40), digits });
        }
        // Le résultat FINAL fait autorité (corrige) ; un partiel ne fait que grandir.
        bestDigitsRef.current = fusionnerChiffresDictes(estFinal, digits, bestDigitsRef.current);
        if (dictDoneRef.current) return; // déjà en cours de finalisation : bestDigitsRef mis à jour, rien d'autre à faire
        const best = bestDigitsRef.current;
        cfg.onLive(best); // remplissage EN DIRECT (contrôle à l'œil)
        // Valeur complète + valide → on s'arrête. Nombre composé (« vingt-six »)
        // arrive en 2 temps : on ne fige PAS sur un partiel, on attend la fin de
        // phrase du moteur OU une valeur STABLE ~0,8 s (le « six » corrige le « vingt »).
        if (best.length >= cfg.max && cfg.estComplet(best)) {
          if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null; }
          if (estFinal) { finaliserDictee(best); return; }
          if (best !== lastTenRef.current) {
            lastTenRef.current = best;
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            confirmTimerRef.current = setTimeout(() => finaliserDictee(bestDigitsRef.current), 800);
          }
          return;
        }
        if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
        lastTenRef.current = '';
        // Incomplet : ~1,6 s pour continuer (sans jamais couper), sinon on termine.
        if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null; }
        if (estFinal) {
          settleTimerRef.current = setTimeout(() => finaliserDictee(bestDigitsRef.current), 1600);
        }
      }, undefined, (tag, data) => vlog(tag, data));
      vlog('LIVE_START');
    } catch (e) {
      vlog('LIVE_FAIL', String(e));
      try { stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      mediaStreamRef.current = null;
      cfg.siEchec();
      return;
    }
    liveStopRef.current = handle.stop;

    setIsListening(true);
    try { navigator.vibrate?.(60); } catch { /* ignore */ }
    // Filet DUR ultime : 15 s (garde-fou anti micro-ouvert, PAS un couperet de dictée).
    if (micStartTimeoutRef.current) clearTimeout(micStartTimeoutRef.current);
    micStartTimeoutRef.current = setTimeout(() => finaliserDictee(bestDigitsRef.current), 15000);
  };

  // Dictée du NUMÉRO (10 chiffres, règle CI).
  const dicterNumero = () => demarrerDictee({
    max: 10,
    estComplet: (d) => numeroCIComplet(d, TEST_PHONES),
    onLive: (d) => { setPhone(d); setOperateur(operateurDe(d)); },
    onFinal: (num) => {
      if (num.length >= 10 && numeroCIComplet(num, TEST_PHONES)) {
        try { navigator.vibrate?.(30); } catch { /* ignore */ }
        remplirNumero(num); return;
      }
      if (num.length >= 10) { setPhone(num); setError('Vérifie ton numéro et corrige 👇'); setShowKeypad(true); parle('Vérifie ton numéro, corrige sur le clavier.'); return; }
      if (num.length > 0) { setPhone(num); setError(''); setShowKeypad(true); parle('Complète ton numéro sur le clavier.'); return; }
      setError("Je n'ai pas compris. Tape ton numéro juste ici 👇"); setShowKeypad(true); parle("Je n'ai pas compris. Tape ton numéro juste ici.");
    },
    buildTag: 'sherpa-login-live-v1',
    siPasPrete: () => { setShowVoiceInstall(true); parle("Pour que je puisse t'écouter, je vérifie ma voix. Touche le bouton, ou tape ton numéro."); },
    siMicRefuse: () => { setError('Autorise le micro, ou tape ton numéro 👇'); parle('Autorise le micro, ou tape ton numéro.'); setShowKeypad(true); },
    siEchec: () => { setShowKeypad(true); parle('Tape ton numéro juste ici.'); },
  });

  // AUDIT UX B5 (11/08/2026) : le CODE SECRET ne se dicte JAMAIS à voix
  // haute — un marché est un lieu public, même chuchoté c'est un secret
  // divulgué. L'ancienne dictée du code est SUPPRIMÉE : le code s'entre au
  // pavé (ou par la reconnaissance « Tata me reconnaît »). La dictée
  // vocale reste réservée au NUMÉRO de téléphone.

  // Tata parle DÈS L'ENTRÉE dans l'écran numéro.
  //
  // AVANT : on supposait qu'à ce stade du parcours (après Welcome +
  // Onboarding, dans la même session SPA) un geste utilisateur avait déjà eu
  // lieu, donc rien ne bloquait la voix — un filet de rattrapage avait même
  // été essayé puis RETIRÉ pour cette raison. CORRECTIF (silence encore
  // constaté en recette terrain sur CET écran précisément) : cette hypothèse
  // est FAUSSE dès qu'on revient dans l'app après l'avoir quittée — EntryGate
  // saute directement à cet écran (drapeaux julaba_seen_splash et
  // julaba_completed_onboarding persistés en localStorage), sans passer par
  // Welcome/Onboarding dans CETTE page fraîchement chargée, donc sans aucun
  // geste préalable pour débloquer l'audio.
  //
  // Le filet est donc RÉINTRODUIT, mais SANS le piège de la version d'avant :
  // l'ancien filet filtrait la cible du geste (closest sur button/img) et,
  // comme l'écouteur était en mode « une seule fois », un premier tap sur le
  // gros micro consommait l'écouteur SANS jamais jouer le son — silence pour
  // le reste de la session. Le nouveau filet (useAudioUnlockFallback) ne
  // filtre RIEN : le tout premier toucher, où qu'il tombe, rejoue la même
  // consigne — comme sur Welcome.tsx et OnboardingSlides.tsx.
  //
  // On explique aussi le GESTE, pas seulement le champ ("tape un chiffre à la
  // fois, les ronds se remplissent") — lire seulement "entre ton numéro" ne
  // suffit pas à quelqu'un qui ne lit pas et n'a jamais vu cet écran.
  const direConsigneNumero = useCallback(() => {
    if (step !== 'phone') return;
    if (!guidageVocal(accessMode)) return; // mode lecture : pas d'accueil vocal auto
    const consigne = voixEcouteDispo
      ? 'Pour entrer, dis ton numéro à voix haute, ou tape les chiffres un par un. Les ronds en haut se rempliront.'
      : 'Tape les chiffres de ton numéro, un par un. Les ronds en haut se rempliront.';
    parle(consigne);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, accessMode, voixEcouteDispo]);

  useEffect(() => {
    direConsigneNumero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useAudioUnlockFallback(direConsigneNumero, step === 'phone' && guidageVocal(accessMode));

  useEffect(() => {
    const tel = document.querySelector('input[autocomplete="tel"]') as HTMLInputElement | null;
    tel?.focus();
    return () => {
      abortRef.current?.abort();
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
      if (focusPinTimeoutRef.current) clearTimeout(focusPinTimeoutRef.current);
      if (micStartTimeoutRef.current) clearTimeout(micStartTimeoutRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      // Coupe une dictée EN DIRECT en cours (moteur + micro) au démontage.
      try { void liveStopRef.current?.(); } catch { /* ignore */ }
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      if (phoneToPasswordTimeout.current) {
        clearTimeout(phoneToPasswordTimeout.current);
        phoneToPasswordTimeout.current = null;
      }
    };
  }, []);

  const isPhoneLocked = (phoneNum: string): boolean => {
    const entry = loginAttempts[phoneNum];
    if (!entry) return false;
    const duree = dureeBlocagePalier(entry.count);
    if (duree === null) return false;              // aucun palier de blocage atteint
    if (duree === Infinity) return true;           // palier 3 : blocage total
    // Paliers 1/2 : verrou actif tant que la durée n'est pas écoulée.
    // Le compteur n'est jamais supprimé ici : il continue de monter vers le palier suivant.
    return Date.now() - entry.lastAttempt < duree;
  };

  const recordFailedAttempt = (phoneNum: string) => {
    if (!loginAttempts[phoneNum]) loginAttempts[phoneNum] = { count: 0, lastAttempt: Date.now() };
    loginAttempts[phoneNum].count++;
    loginAttempts[phoneNum].lastAttempt = Date.now();
  };

  const resetAttempts = (phoneNum: string) => { delete loginAttempts[phoneNum]; };

  // Mémorise la personne sur CE téléphone après une entrée réussie (lot 1) —
  // jamais bloquant : si le stockage échoue, la connexion continue normalement.
  const memoriserApresEntree = (u: Record<string, unknown> | undefined, biometrie: boolean) => {
    try {
      const prenom = String((u as any)?.firstName || (u as any)?.first_name || (u as any)?.prenoms || '').trim();
      const photoBrute = (u as any)?.photo;
      const photo = typeof photoBrute === 'string' && photoBrute ? photoBrute : undefined;
      memoriserCompte(window.localStorage, { phone, prenom, photo, ...(biometrie ? { biometrie: true } : {}) }, new Date().toISOString());
    } catch { /* ignore */ }
  };

  const handleBiometric = async () => {
    setIsLoading(true);
    try {
      const result = await authenticateWebAuthn(phone);
      if (result.success && result.user) {
        setAppUser(result.user);
        setUserProfile(result.user);
        // La reconnaissance a marché ICI → au prochain retour, geste unique.
        memoriserApresEntree(result.user as Record<string, unknown>, true);
        vibrerSucces();
        // Persiste le jeton (auth mobile sans cookie cross-domaine), comme la connexion par code.
        try {
          if (result.accessToken) localStorage.setItem('julaba_access_token', result.accessToken);
          if ((result as { refreshToken?: string }).refreshToken) localStorage.setItem('julaba_refresh_token', (result as { refreshToken?: string }).refreshToken!);
        } catch { /* ignore */ }
        if (result.accessToken) { setAccessToken(result.accessToken); setTimeout(() => refreshUserData(), 100); }
        window.dispatchEvent(new CustomEvent('julaba:token-ready'));
        const roleRoutes: Record<string, string> = {
          ...ROLE_ROUTES,
          super_admin: '/backoffice/dashboard',
          admin: '/backoffice/dashboard',
        };
        navigate(roleRoutes[normalizeRole(result.user.role)] || '/marchand');
      } else {
        // Mots de la MARCHANDE (pas « biométrie ») : dire le problème et le geste
        // de secours. L'effet vocal sur `error` l'énonce automatiquement.
        setError('Ton téléphone ne t\'a pas reconnue. Utilise ton code.');
      }
    } catch (err) {
      console.warn('[LoginPassword] biometric failed:', err instanceof Error ? err.message : err);
      setError('La reconnaissance n\'a pas marché ici. Utilise ton code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (pinOverride?: string, retry = 0) => {
    const pwd = pinOverride ?? pinInput;
    if (phone.length !== 10) { setError('Le numéro doit contenir 10 chiffres'); return; }
    if (import.meta.env.DEV && phone === '0501604040') { setShowDevButton(true); setError(''); return; }
    if (!pwd || pwd.length === 0) { setError('Entre ton mot de passe'); return; }
    if (isPhoneLocked(phone)) {
      const duree = dureeBlocagePalier(loginAttempts[phone].count);
      if (duree === Infinity) {
        setError('Compte bloqué. Contacte ton identificateur pour le débloquer.');
      } else if (duree !== null) {
        const remainingTime = Math.max(1, Math.ceil((duree - (Date.now() - loginAttempts[phone].lastAttempt)) / 60000));
        setError(`Compte bloqué. Réessaie dans ${remainingTime} minutes.`);
      }
      return;
    }
    setIsLoading(true); setError('');
    // Espion de connexion : trace l'URL réellement appelée + le résultat, visible
    // dans « 🐞 Rapport de test ». Permet de diagnostiquer « Erreur de connexion »
    // (URL fausse ? CORS ? statut HTTP ?) sans outils développeur.
    vlog('LOGIN_TRY', { url: `${API_URL}/auth/login` });
    try {
      const controller = new AbortController();
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: phone.startsWith("+225") ? phone : "+225" + phone, password: pwd }),
        signal: controller.signal,
      });
      vlog('LOGIN_HTTP', { status: response.status, ok: response.ok });
      let result: {
        error?: string;
        user?: {
          role?: string;
          mustChangePassword?: boolean;
          id?: string;
          phone?: string;
          lastName?: string;
          last_name?: string;
          firstName?: string;
          first_name?: string;
          region?: string;
          [key: string]: unknown;
        };
        accessToken?: string;
        [key: string]: unknown;
      };
      try {
        result = await response.json();
      } catch (err) {
        console.warn('[LoginPassword] login json parse failed:', err instanceof Error ? err.message : err);
        vlog('LOGIN_JSON_FAIL', { msg: err instanceof Error ? err.message : String(err) });
        setError('Réponse inattendue. Réessaie dans un instant.');
        setIsLoading(false);
        return;
      }
      if (!response.ok || result.error) {
        // Trop de tentatives en 1 minute (rate-limiter) : ce N'EST PAS un mauvais
        // code -> on ne compte pas d'échec et on affiche un message clair.
        if (response.status === 429) {
          setError('Trop d\'essais. Attends une minute puis réessaie.');
          setPinInput(""); setIsLoading(false); return;
        }
        // Source de vérité backend : verrouillage total après 9 échecs cumulés.
        // Prioritaire sur le compteur RAM (qui ne sert qu'à l'affichage progressif 5/15 min).
        if (result.locked === true) {
          resetAttempts(phone);
          setError('Compte bloqué. Contacte ton identificateur pour le débloquer.');
          setPinInput(""); setIsLoading(false); return;
        }
        recordFailedAttempt(phone);
        const count = loginAttempts[phone].count;
        const duree = dureeBlocagePalier(count);
        if (duree === Infinity) {
          setError('Compte bloqué. Contacte ton identificateur pour le débloquer.');
        } else if (duree !== null) {
          const minutes = Math.round(duree / 60000);
          setError(`Compte bloqué. Réessaie dans ${minutes} minutes.`);
        } else {
          const prochainPalier = count < PALIER_1 ? PALIER_1 : count < PALIER_2 ? PALIER_2 : PALIER_3;
          const attemptsLeft = prochainPalier - count;
          setError(`Identifiants incorrects. ${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''} avant blocage.`);
        }
        setPinInput(""); setIsLoading(false); return;
      }
      resetAttempts(phone);
      // Apprentissage 'auto' : on note comment elle s'est identifiée (clavier/voix).
      try { if (dernierCanalRef.current) noterCanal(dernierCanalRef.current); } catch { /* ignore */ }
      const user = result.user;
      if (!user) {
        setError('Réponse serveur invalide');
        setIsLoading(false);
        return;
      }
      const boRoles = ['super_admin', 'admin'];
      const isBackOffice = boRoles.includes(user.role ?? '');
      if (result.user?.mustChangePassword) {
        setError('Mot de passe temporaire, redirection en cours...');
        if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          navigate('/change-password');
        }, 1500);
        return;
      }
      if (isBackOffice) {
        if (!window.location.pathname.includes('backoffice')) {
          setError('Accès non autorisé. Utilise le portail administrateur sur julaba.online/backoffice/login');
          setIsLoading(false);
          return;
        }
        const boUser = { id: user.id, phone: user.phone || '', nom: user.lastName || user.last_name || 'Admin', prenom: user.firstName || user.first_name || '', email: `${user.phone}@julaba.local`, role: user.role, region: user.region || 'National', lastLogin: new Date().toISOString(), actif: true };
        setBOUser(boUser);
        window.dispatchEvent(new CustomEvent('julaba:token-ready'));

      } else {
        // La réponse de connexion est plus lâche que User (champs optionnels) ;
        // le runtime a toujours fourni ces champs — conversion documentée.
        setAppUser(user as unknown as import('../../contexts/AppContext').User); setUserProfile(user as unknown as import('../../contexts/AppContext').User);
        // Entrée par code réussie → Tata se souvient d'elle sur ce téléphone
        // (le drapeau « la reconnaissance marche ici » déjà acquis est conservé).
        memoriserApresEntree(user as Record<string, unknown>, false);
        vibrerSucces();
        // Auth mobile : on STOCKE le jeton (cookie cross-domaine bloqué sur mobile).
        // L'intercepteur fetch l'enverra en en-tête Authorization sur chaque appel.
        try {
          if (result.accessToken) localStorage.setItem('julaba_access_token', result.accessToken);
          if ((result as any).refreshToken) localStorage.setItem('julaba_refresh_token', (result as any).refreshToken);
        } catch { /* ignore */ }
        if (result.accessToken) {
          setAccessToken(result.accessToken);
          setTimeout(() => refreshUserData(), 100);
        } else {
          setAccessToken('cookie'); // au cas où (desktop même-domaine)
        }
        window.dispatchEvent(new CustomEvent('julaba:token-ready'));
      }
      setPinInput('');
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = setTimeout(() => {
        const roleRoutes: Record<string, string> = {
          ...ROLE_ROUTES,
          'super_admin': '/backoffice/dashboard', 'admin_national': '/backoffice/dashboard',
          'gestionnaire_zone': '/backoffice/dashboard', 'operateur_terrain': '/backoffice/dashboard'
        };
        navigate(roleRoutes[normalizeRole(user.role)] || '/marchand');
      }, 300);
      setIsLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[LoginPassword] login failed:', err instanceof Error ? err.message : err);
      vlog('LOGIN_FAIL', { name: err instanceof Error ? err.name : '', msg: err instanceof Error ? err.message : String(err), retry });
      // « Failed to fetch » = souvent le backend gratuit encore en train de se
      // réveiller. On RETENTE automatiquement (jusqu'à 2 fois) en laissant le
      // temps au serveur de démarrer, plutôt que d'échouer sèchement.
      const estReseau = err instanceof TypeError;
      if (estReseau && retry < 2) {
        setError('Réveil du serveur… reconnexion automatique, patiente 🔄');
        setTimeout(() => { handleLogin(pwd, retry + 1); }, 7000);
        return;
      }
      setError('Connexion impossible. Le serveur se réveille (~1 min) — réessaie dans un instant.');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  const handleLogoClick = () => {
    if (!import.meta.env.DEV) return;
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) { setShowDevButton(true); setLogoClickCount(0); }
  };

  const handleKeyPress = (digit: string) => {
    if (isLoading || isFinalizingDictation || (step === 'phone' && isListening)) return;
    dernierCanalRef.current = 'clavier'; // elle TAPE (apprentissage 'auto')
    if (step === 'phone') {
      if (phone.length < 10) {
        const next = phone + digit;
        setPhone(next);
        setError('');
        // Retour tactile à CHAQUE chiffre tapé — perceptible sans lire ni entendre,
        // et sans jamais révéler le chiffre à voix haute (confidentialité du numéro).
        try { navigator.vibrate?.(12); } catch { /* ignore */ }
        if (import.meta.env.DEV && next === '0501604040') setShowDevButton(true);
        if (next.length === 10) {
          if (!numeroCIComplet(next, TEST_PHONES)) {
            setError('Préfixe invalide');
            return;
          }
          if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
          // Le numéro complet reste affiché jusqu’à sa confirmation explicite.
        }
      }
    } else {
      if (!isLoading && pinInput.length < 4) {
        const next = pinInput + digit;
        setPinInput(next);
        setError('');
        if (next.length === 4) setTimeout(() => { void handleLogin(next); }, 300);
      }
    }
  };

  // Retour depuis l'écran du code : si Tata se souvient d'elle (et que le numéro
  // n'a pas été changé), on revient à l'ACCUEIL par prénom — jamais aux 10 chiffres.
  const retourDepuisCode = () => {
    setPinInput('');
    setError('');
    setStep(compteConnu && phone === compteConnu.phone ? 'reconnaissance' : 'phone');
  };

  const handleKeyDelete = () => {
    if (isLoading || isFinalizingDictation || (step === 'phone' && isListening)) return;
    if (step === 'phone') {
      if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
      setPhone(p => p.slice(0, -1));
      // Effacer est ANNONCÉ — geste distinct du simple ajout d'un chiffre (motif
      // de vibration différent) + un mot dit à voix haute. « Effacé » ne révèle
      // aucun chiffre : rien à cacher, contrairement au numéro lui-même.
      try { navigator.vibrate?.([10, 30, 10]); } catch { /* ignore */ }
      if (guidageVocal(accessMode)) parle('Effacé.');
    } else {
      if (pinInput.length === 0) {
        retourDepuisCode();
      } else {
        const next = pinInput.slice(0, -1);
        setPinInput(next);
      }
    }
    setError('');
  };

  return (
    <div className="login-page" style={{
      minHeight: '100dvh',
      background: 'var(--commerce-paper)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      // Défilement vertical autorisé : quand le clavier s'ouvre, l'écran devient
      // plus haut que le téléphone → il faut pouvoir descendre jusqu'aux touches
      // (sinon le clavier était coupé sous la barre du téléphone).
      overflowY: 'auto',
      overflowX: 'hidden',
      // On garde de la place sous le clavier pour la barre de navigation Android.
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      position: 'relative',
    }}>
      {/* Zone invisible (coin haut-gauche) : 5 tapes = mode développeur (caché à la marchande) */}
      <div onClick={toggleDevMode} aria-hidden style={{ position: 'absolute', top: 0, left: 0, width: 54, height: 54, zIndex: 60 }} />
      {import.meta.env.DEV && showDevButton && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 }}
        >
          <ProfileSwitcher forceShow={true} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          padding: '22px 24px 4px',
        }}
      >
        <div className="login-brand">
          <span className="login-logo"><img src={logoJulaba} alt="JULABA" /></span><BrandSignature />
        </div>
        <h1>{step === 'phone' ? 'Ton numéro' : step === 'password' ? 'Ton code secret' : `Bonjour ${compteConnu?.prenom || 'ma sœur'}`}</h1>
        <div className="login-guide">
          <img src={tataNantiLou} alt="Tata Nanti Lou" />
          <button type="button" onClick={ecouterTata} className="login-replay"
            aria-label={tataSpeaking ? 'Réécouter la consigne de Tata' : 'Écouter Tata Nanti Lou'}>
            <Volume2 aria-hidden="true" size={26} />
          </button>
        </div>
        {step === 'password' && <button type="button" onClick={retourDepuisCode} className="login-help" disabled={isLoading}><ChevronLeft aria-hidden="true" size={22} />Retour</button>}
        {devMode && (
          <span style={{ marginTop: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--encre-4)' }}>Tata Nanti Lou · dev</span>
        )}
      </motion.div>



      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '0 24px',
          margin: '0 auto',
          flex: 1,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Centré quand il n'y a que le micro ; aligné en haut quand le clavier
          // est ouvert (sinon le haut sortait de l'écran, non atteignable).
          justifyContent: 'flex-start',
          paddingTop: clavierVisible ? 12 : 0,
        }}
      >
        <AnimatePresence mode="wait">
          {step === 'reconnaissance' && compteConnu ? (
            <motion.div
              key="reconnaissance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
            >
              {/* « Tata me reconnaît » (lot 1) : elle se VOIT (photo) et lit UN mot
                  (son prénom) — confirmation immédiate que c'est bien son compte.
                  Le geste est DIT par Tata ; l'écran ne l'écrit pas. */}
              <div className="login-account">
                {compteConnu.photo ? <img src={compteConnu.photo} alt="" /> : <span className="login-account-placeholder"><UserRound aria-hidden="true" size={40} /></span>}
                <p>Mon compte</p>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div key="reco-error-banner"
                    initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.2 }} style={{ overflow: 'hidden', width: '100%' }}>
                    <div role="alert" aria-live="assertive" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontWeight: 500 }}>{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* UN SEUL grand geste, comme le grand micro du parcours classique :
                  reconnaissance (visage/doigt) si elle marche ici, sinon le code. */}
              {compteConnu.biometrie ? (
                <motion.button
                  type="button"
                  aria-label="Ton téléphone te reconnaît — touche pour entrer"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={handleBiometric}
                  disabled={isLoading}
                  style={{
                    width: '100%', height: 96,
                    borderRadius: 14, border: 'none', cursor: isLoading ? 'wait' : 'pointer', color: '#fff',
                    background: 'var(--commerce-action)',
                    boxShadow: '0 2px 8px #3325330C',
                    display: 'grid', placeItems: 'center', marginTop: 4, opacity: isLoading ? 0.7 : 1,
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, fontWeight: 750 }}><Fingerprint aria-hidden="true" size={36} />{isLoading ? 'En cours…' : 'Entrer'}</span>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  aria-label="Entre ton code secret"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => { setError(''); setStep('password'); }}
                  style={{
                    width: '100%', height: 96,
                    borderRadius: 14, border: 'none', cursor: 'pointer', color: '#fff',
                    background: 'var(--commerce-action)',
                    boxShadow: '0 2px 8px #3325330C',
                    display: 'grid', placeItems: 'center', marginTop: 4,
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 20, fontWeight: 750 }}><KeyRound aria-hidden="true" size={30} />Utiliser mon code</span>
                </motion.button>
              )}
              {/* Secours toujours visible : son code à 4 chiffres — sans redonner le numéro. */}
              {compteConnu.biometrie && (
                <button type="button" onClick={() => { setError(''); setStep('password'); }}
                  style={{ marginTop: 4, padding: '13px 26px', borderRadius: 16, border: '2px solid rgba(198,106,44,0.35)', background: '#fff', color: '#8A5A34', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <KeyRound aria-hidden="true" size={22} /> Utiliser mon code
                </button>
              )}
              {/* Téléphone partagé : quelqu'un d'autre peut entrer — sans rien effacer. */}
              <button type="button"
                onClick={() => { setStep('phone'); setPhone(''); setPinInput(''); setError(''); }}
                style={{ marginTop: 2, background: 'none', border: 'none', color: 'var(--encre-3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: '8px 12px' }}>
                <Users aria-hidden="true" size={22} /> Changer de compte
              </button>
            </motion.div>
          ) : step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, pointerEvents: step === 'phone' ? 'auto' : 'none' }}
            >
            {/* TATA PROPOSE de s'adapter (mode auto + préférence franche). Une question,
                pas un réglage : elle l'a dite, ici les deux réponses. */}
            {suggestion && !suggReponse && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: '#EEF4FF', border: '1px solid #C7D8FF', borderRadius: 16, padding: '12px 14px', marginBottom: 6 }}>
                <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e3a8a', textAlign: 'center' }}>{suggestion.texte}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => repondreSuggestion(false)}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, color: '#1e3a8a', background: '#fff', border: '2px solid #C7D8FF', cursor: 'pointer' }}>Non</button>
                  <button type="button" onClick={() => repondreSuggestion(true)}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, color: '#fff', background: '#2563eb', border: 'none', cursor: 'pointer' }}>Oui, adapte</button>
                </div>
              </motion.div>
            )}
            {/* Chiffres EN DIRECT — on voit les nombres apparaître au fur et à mesure.
                Les chiffres se lisent même sans savoir lire ; c'est le vrai contrôle
                « elle m'entend ». « J'écoute… » quand le micro est ouvert sans chiffre. */}
            <div className="login-number">
              <span style={{ color: 'var(--encre-3)' }}>+225</span>
              <span className="login-number-value" aria-label={phone.length ? 'Numéro saisi' : 'Numéro à saisir'}>
                {(phone.match(/.{1,2}/g) || []).join(' ') || '— — — — —'}
              </span>
              {phone.length === 10 && <button type="button" className="login-replay" style={{ width: 44, height: 44, flexShrink: 0 }}
                disabled={isListening || isLoading} onClick={() => parle(phone.split('').join(' '))} aria-label="Réécouter mon numéro">
                <Volume2 aria-hidden="true" size={20} />
              </button>}
            </div>
            {/* Un point vert par chiffre entendu — on voit que ça avance, sans lire */}
            <div style={{ display: 'flex', gap: 9, justifyContent: 'center', minHeight: 16, marginBottom: 2 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.span key={i}
                  animate={i === phone.length - 1 ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ width: 14, height: 14, borderRadius: '50%', background: i < phone.length ? '#2F8F63' : '#EDE0CE', boxShadow: i < phone.length ? '0 0 0 4px rgba(47,143,99,0.14)' : 'none' }}
                />
              ))}
            </div>
            {/* GRAND MICRO — l'action, UNIQUEMENT si la voix écoute réellement.
                Sinon (cas actuel) : aucun micro trompeur, le pavé est la référence. */}
            {voixEcouteDispo && (
            <motion.button
              type="button"
              aria-label="Touchez et dites votre numéro"
              onPointerDown={(e) => e.preventDefault()}
              onClick={dicterNumero}
              className="login-dictate"
              aria-pressed={isListening}
              disabled={isLoading || isFinalizingDictation}
              whileTap={{ scale: 0.96 }}
            >
              <Mic aria-hidden="true" size={36} /><span>{isListening ? 'Écoute en cours…' : 'Dire mon numéro'}</span>
            </motion.button>
            )}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="phone-error-banner"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', width: '100%' }}
                >
                  <div role="alert" aria-live="assertive" style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontWeight: 500 }}>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {isLoading && step === 'phone' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '4px 0' }}
              >
                <p style={{ fontSize: 11, color: 'rgba(198,106,44,0.6)', margin: 0 }}>
                  Vérification...
                </p>
              </motion.div>
            )}
            {/* Installer la VOIX (consenti) — apparaît quand la voix n'est pas encore
                là. Tata a déjà expliqué à voix haute ; ici le bouton d'installation
                avec l'avertissement coût + double validation. Après installation,
                Tata invite à parler. Le clavier reste dispo comme filet en dessous. */}
            {showVoiceInstall && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', marginBottom: 8 }}
              >
                <InstallerOffline onReady={() => {
                  setShowVoiceInstall(false);
                  parle('Voilà, tu peux parler maintenant. Touche le micro et dis ton numéro.');
                }} />
              </motion.div>
            )}
            {/* Bascule clavier : uniquement en mode voix (sinon le pavé est déjà
                la référence, toujours affiché). */}
            {voixEcouteDispo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 22 }}>
              <button type="button" aria-label="Taper mon numéro sur le clavier" onClick={() => setShowKeypad(v => !v)}
                style={{ width: 58, height: 58, borderRadius: 18, background: showKeypad ? '#DB7A2C' : '#F5D6BD', color: showKeypad ? '#fff' : '#8A5A34', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/></svg>
              </button>
            </div>
            )}

            {clavierVisible && (
            <>
            <div style={{
              width: '100%', boxSizing: 'border-box', background: '#FFF9F2', borderRadius: 22, marginTop: 6,
              overflow: 'hidden', boxShadow: '0 2px 12px rgba(120,60,20,0.08)', border: '1px solid #F0E0CD',
              position: 'relative', paddingBottom: 12,
            }}>
              <div className="login-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <motion.button type="button" key={d} disabled={isLoading || isListening} onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress(d)}
                    className="login-key"
                    whileTap={{ scale: 0.9 }}
                  >{d}</motion.button>
                ))}
                <motion.button type="button" disabled={isLoading || phone.length === 0} aria-label="Connexion par empreinte" onPointerDown={(e) => e.preventDefault()} onClick={handleBiometric}
                  className="login-key"
                  whileTap={{ scale: 0.9, opacity: 1 }}>
                  <Fingerprint style={{ width: 22, height: 22, color: '#B74725' }} />
                </motion.button>
                <motion.button type="button" disabled={isLoading || isListening} onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress('0')}
                  className="login-key"
                  whileTap={{ scale: 0.9 }}>0</motion.button>
                <motion.button type="button" aria-label="Effacer le dernier chiffre" onPointerDown={(e) => e.preventDefault()} onClick={handleKeyDelete}
                  className="login-key"
                  whileTap={{ scale: 0.9, opacity: 1 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B74725" strokeWidth="2" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                </motion.button>
              </div>
            </div>
            </>
            )}
            <button type="button" className="login-primary" style={{ marginTop: 16 }}
              disabled={phone.length !== 10 || !numeroCIComplet(phone, TEST_PHONES) || isListening || isFinalizingDictation || isLoading}
              onClick={() => scheduleTransitionToPasswordAfterCheck(phone)}>
              <CheckCircle aria-hidden="true" size={26} />{isLoading ? 'Vérification…' : 'C’est mon numéro'}
            </button>
            </motion.div>
          ) : (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, pointerEvents: step === 'password' ? 'auto' : 'none' }}
            >
            <div style={{
              width: '100%', background: '#fff', borderRadius: 16,
              padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <span style={{ flex: 1, fontSize: 15, color: '#3d1a08', fontWeight: 500, letterSpacing: 1.5 }}>
                {formatPhoneNumber(phone)}
              </span>
              <motion.button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setPinInput('');
                  setError('');
                  if (focusPinTimeoutRef.current) clearTimeout(focusPinTimeoutRef.current);
                  focusPinTimeoutRef.current = setTimeout(() => {
                    const tel = document.querySelector('input[autocomplete="tel"]') as HTMLInputElement | null;
                    tel?.focus();
                  }, 50);
                }}
                style={{ fontSize: 11, color: 'rgba(198,106,44,0.65)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                whileTap={{ scale: 0.95 }}
              >Modifier</motion.button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div
                  key="pin-error-banner"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', width: '100%' }}
                >
                  <div role="alert" aria-live="assertive" style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontWeight: 500 }}>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Cadenas SEUL (icône) — Tata dit « entre ton code », l'écran ne l'écrit pas.
                On touche le cadenas pour réentendre la consigne. */}
            <button
              type="button"
              aria-label="Ton code secret — touche pour écouter"
              onClick={() => parle('Entre ton code secret à 4 chiffres')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0 4px', display: 'flex', justifyContent: 'center', width: '100%' }}
            >
              <span style={{ fontSize: 30, lineHeight: 1 }}>🔒</span>
            </button>
            {/* AUDIT B5 : plus de micro sur le code — un secret ne se dit pas.
                Le pavé reste le chemin ; la reconnaissance évite même le code. */}
            <div style={{
              width: '100%', background: '#fff', borderRadius: 22,
              overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              position: 'relative',
              paddingBottom: 8,
            }}>
              <div style={{ position: 'relative' }}>
                <div className="login-pin-slots" aria-hidden="true">
                  {[0, 1, 2, 3].map(i => <span key={i} className="login-pin-slot" data-filled={i < pinInput.length} />)}
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    if (step !== 'password' || isLoading) return;
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPinInput(val);
                    setError('');
                    if (val.length === 4) {
                      setTimeout(() => { void handleLogin(val); }, 300);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && pinInput.length === 0) {
                      retourDepuisCode();
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    caretColor: 'transparent',
                    zIndex: 2,
                    cursor: 'default',
                  }}
                  aria-label="Code secret à 4 chiffres"
                  tabIndex={0}
                />
              </div>
              <div className="login-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <motion.button type="button" key={d} disabled={isLoading} aria-label={pinEnImages ? glyphePourChiffre(d, true) : `Chiffre ${d}`} onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress(d)}
                    className="login-key"
                    whileTap={{ scale: 0.9 }}
                  ><span className={pinEnImages ? 'login-key-image' : undefined}>{glyphePourChiffre(d, pinEnImages)}</span></motion.button>
                ))}
                <motion.button
                  type="button"
                  disabled={isLoading || phone.length === 0}
                  aria-label="Ton téléphone te reconnaît — touche pour entrer"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={handleBiometric}
                  className="login-key"
                  whileTap={{ scale: 0.9, opacity: 1 }}
                >
                  <Fingerprint style={{ width: 22, height: 22, color: '#B74725' }} />
                </motion.button>
                <motion.button type="button" disabled={isLoading} aria-label={pinEnImages ? glyphePourChiffre('0', true) : 'Chiffre 0'} onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress('0')}
                  className="login-key"
                  whileTap={{ scale: 0.9 }}
                ><span className={pinEnImages ? 'login-key-image' : undefined}>{glyphePourChiffre('0', pinEnImages)}</span></motion.button>
                <motion.button type="button" aria-label="Effacer le dernier chiffre" onPointerDown={(e) => e.preventDefault()} onClick={handleKeyDelete}
                  className="login-key"
                  whileTap={{ scale: 0.9, opacity: 1 }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B74725" strokeWidth="2" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                </motion.button>
              </div>
              {/* Bascule OPT-IN, jamais le mode par défaut (doc « mot de passe imagé »,
                  variante A) : la correspondance chiffre↔image est fixe et publique —
                  seul le glyphe affiché change, le PIN envoyé reste les mêmes chiffres. */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 12px' }}>
                <button type="button" onClick={basculerPinEnImages}
                  aria-label={pinEnImages ? 'Revenir aux chiffres' : 'Afficher des images à la place des chiffres'}
                  style={{ background: 'none', border: 'none', color: '#8A5A34', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: '6px 10px' }}>
                  {pinEnImages ? '🔢 Revenir aux chiffres' : '🍅 Utiliser des images'}
                </button>
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Lien secours admin — uniquement sur le portail backoffice (jamais marchande). */}
      {window.location.pathname.includes('backoffice') && (
        <a href="/admin-recovery" style={{ margin: '12px 0', color: 'var(--encre-4)', fontSize: 11, textDecoration: 'none' }}>
          Problème de connexion admin ?
        </a>
      )}
      {/* Pied de page OUTILS — MODE DÉVELOPPEUR uniquement (5 tapes coin haut-gauche).
          Masqué pour la marchande : l'écran ne montre que Tata + champ + micro + clavier. */}
      {devMode && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 8, padding: '14px 0 18px' }}
      >
        <button
          type="button"
          onClick={() => { localStorage.removeItem('julaba_completed_onboarding'); window.location.href = '/'; }}
          style={{ border: '1px solid rgba(124,98,80,0.3)', borderRadius: 22, padding: '9px 22px', color: '#7C6250', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7C6250" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          Revoir le tutoriel
        </button>
        <p style={{ fontSize: 10, color: 'var(--encre-4)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '2px 0 0' }}>By Icône Solution</p>
        <p
          onClick={() => parle(`Version ${__APP_VERSION__}, ${__BUILD_ID__}`)}
          title="Version de l'application"
          style={{ fontSize: 9, color: 'var(--encre-4)', letterSpacing: '0.05em', margin: 0, cursor: 'pointer' }}
        >
          v{__APP_VERSION__} · {__BUILD_ID__}
        </p>
        {/* Rapport de test : copie le journal de la dernière dictée pour l'envoyer
            à Claude et déboguer précisément (phase de test). */}
        <button
          type="button"
          onClick={async () => {
            const r = await vlogPartager();
            if (r.methode === 'copie') window.alert('Rapport copié ✅\nColle-le dans la conversation avec Claude.');
            else if (r.methode === 'aucune') window.alert('Rapport :\n\n' + r.texte);
          }}
          style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#8A5A34', background: '#F5D6BD', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer' }}
        >
          🐞 Rapport de test
        </button>
      </motion.div>
      )}
    </div>
  );
}
