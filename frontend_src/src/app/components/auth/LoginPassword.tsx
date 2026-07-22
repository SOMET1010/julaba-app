import { normalizeRole, ROLE_ROUTES } from '../../types/constants';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Fingerprint, Mic } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useBackOfficeOptional } from '../../contexts/BackOfficeContext';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import logoJulaba from '../../../assets/images/logo-julaba.png';
import tataNantiLou from '../../../assets/images/tata-nanti-lou.png';
import { authenticateWebAuthn } from '../../hooks/useWebAuthn';
import { API_URL } from '../../utils/api';
import { extractPhoneDigits } from '../../utils/frenchDigits';
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

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showDevButton, setShowDevButton] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [step, setStep] = useState<'phone' | 'password'>('phone');
  const [isListening, setIsListening] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false); // clavier caché par défaut (voix d'abord)
  const [tataSpeaking, setTataSpeaking] = useState(false);

  // Accueil personnalisé : si une marchande est déjà connue sur ce téléphone, on
  // la salue par son prénom (ton « vous », chaleureux et respectueux).
  const cachedPrenom = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('julaba_auth_user') || 'null');
      return (u?.firstName || u?.first_name || u?.prenom || '').toString().trim();
    } catch { return ''; }
  })();
  const greetTitle = cachedPrenom ? `Bonjour Maman ${cachedPrenom}` : 'Bonjour ma sœur !';
  const greetSub = cachedPrenom
    ? 'Je suis heureuse de vous revoir aujourd’hui.'
    : 'Je suis Tata Nanti Lou. Je serai à vos côtés pour vous aider.';

  // « Écouter Tata » : on joue sa VRAIE voix enregistrée (Manuela) ; à défaut, la
  // voix du navigateur. On anime pendant qu'elle parle.
  const ecouterTata = () => {
    setTataSpeaking(true);
    const finish = () => setTataSpeaking(false);
    try {
      const a = new Audio('/voix/tata/phrase-1.mp3');
      a.onended = finish;
      a.onerror = () => { finish(); parle(`${greetTitle}. ${greetSub}`); };
      a.play().catch(() => { finish(); parle(`${greetTitle}. ${greetSub}`); });
    } catch { finish(); parle(`${greetTitle}. ${greetSub}`); }
  };
  const phoneToPasswordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const micStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneRef = useRef(phone);
  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  // Voix pour la connexion (écran AVANT connexion → on utilise la voix intégrée
  // du navigateur). Une vendeuse qui ne lit pas peut ainsi entendre les consignes
  // et les erreurs au lieu de devoir lire un petit texte.
  const parle = (texte: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !texte) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      u.rate = 0.95;
      synth.speak(u);
    } catch { /* ignore */ }
  };
  // Prononce chaque message d'erreur dès qu'il apparaît (après une action de
  // l'utilisatrice, donc la lecture audio est autorisée par le navigateur).
  useEffect(() => { if (error) parle(error); }, [error]);

  const scheduleTransitionToPasswordAfterCheck = () => {
    if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
    phoneToPasswordTimeout.current = setTimeout(async () => {
      const curr = phoneRef.current;
      if (curr.length !== 10 || (!TEST_PHONES.has(curr) && !/^(01|05|07|09|21|25|27)/.test(curr))) return;

      if (import.meta.env.DEV && curr === '0501604040') {
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
      if (!TEST_PHONES.has(sliced) && !/^(01|05|07|09|21|25|27)/.test(sliced)) {
        setError('Numéro non reconnu, réessaie ou tape-le');
        return;
      }
      if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
      scheduleTransitionToPasswordAfterCheck();
    }
  };

  // Dictée vocale du numéro : la marchande DIT son numéro, l'appli le remplit.
  // On utilise la reconnaissance vocale intégrée au navigateur (gratuite, aucun
  // service payant). On l'annonce à voix haute AVANT d'écouter (une utilisatrice
  // qui ne lit pas comprend qu'on attend qu'elle parle), puis on démarre le micro
  // seulement quand la voix a fini, pour ne pas capter notre propre annonce.
  const dicterNumero = () => {
    const SR = (window as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) { setError("La dictée vocale n'est pas disponible sur ce téléphone"); return; }
    if (isListening) { try { recognitionRef.current?.stop(); } catch { /* ignore */ } return; }

    const demarrer = () => {
      try {
        const RecCtor = SR as new () => {
          lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
          start: () => void; stop: () => void; abort: () => void;
          onresult: ((e: { results: ArrayLike<{ isFinal?: boolean } & ArrayLike<{ transcript: string }>> }) => void) | null;
          onerror: ((e: { error?: string }) => void) | null;
          onend: (() => void) | null;
        };
        const rec = new RecCtor();
        recognitionRef.current = rec;
        rec.lang = 'fr-FR';
        // interimResults = true → on reçoit les chiffres AU FUR ET À MESURE que la
        // vendeuse parle, pour lui montrer en direct qu'on l'entend (sinon elle a
        // l'impression que rien ne se passe).
        rec.interimResults = true;
        rec.maxAlternatives = 4;
        rec.continuous = false;
        setIsListening(true);
        let dernierAffiche = 0; // nb de chiffres déjà affichés (pour la vibration)
        rec.onresult = (e) => {
          // Meilleure suite de chiffres sur TOUS les résultats (aperçus + final).
          let best = '';
          let final = false;
          for (let i = 0; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) final = true;
            for (let j = 0; j < res.length; j++) {
              const d = extractPhoneDigits(res[j]?.transcript || '');
              if (d.length > best.length) best = d;
            }
          }
          // RETOUR EN DIRECT : on affiche les chiffres au fur et à mesure + une
          // petite vibration à chaque nouveau chiffre entendu (confirmation tactile).
          if (best.length > 0) {
            setPhone(best.slice(0, 10));
            setError('');
            if (best.length > dernierAffiche) {
              dernierAffiche = best.length;
              try { navigator.vibrate?.(30); } catch { /* ignore */ }
            }
          }
          // Tant que ce n'est pas le résultat FINAL, on garde juste l'aperçu vivant
          // (pas de transition ni de message — la vendeuse est peut-être encore en
          // train de dire la suite).
          if (!final) return;
          if (best.length === 0) {
            setError("Je n'ai pas compris. Tape ton numéro juste ici 👇");
            parle("Je n'ai pas compris. Tape ton numéro, ou réessaie.");
            setShowKeypad(true); // on ne laisse jamais la vendeuse bloquée : clavier ouvert
            return;
          }
          remplirNumero(best);
          if (best.length < 10) {
            parle("J'ai compris " + best.split('').join(' ') + '. Continue ou tape le reste.');
          }
        };
        rec.onerror = (ev) => {
          setIsListening(false);
          if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
            setError('Autorise le micro, ou tape ton numéro 👇');
            setShowKeypad(true);
          } else if (ev?.error === 'no-speech') {
            setError("Je n'ai rien entendu. Réessaie, ou tape 👇");
            setShowKeypad(true);
          } else if (ev?.error === 'network' || ev?.error === 'audio-capture') {
            setError('Pas de réseau pour la voix. Tape ton numéro 👇');
            setShowKeypad(true);
          }
        };
        rec.onend = () => { setIsListening(false); recognitionRef.current = null; };
        rec.start();
      } catch {
        setIsListening(false);
        setError("La dictée vocale n'est pas disponible");
      }
    };

    try {
      const synth = window.speechSynthesis;
      if (synth) {
        synth.cancel();
        const u = new SpeechSynthesisUtterance('Dis ton numéro maintenant');
        u.lang = 'fr-FR';
        u.rate = 1;
        let started = false;
        const go = () => { if (!started) { started = true; demarrer(); } };
        u.onend = go;
        synth.speak(u);
        if (micStartTimeoutRef.current) clearTimeout(micStartTimeoutRef.current);
        micStartTimeoutRef.current = setTimeout(go, 2500); // filet si onend ne se déclenche pas
      } else {
        demarrer();
      }
    } catch {
      demarrer();
    }
  };

  // Tata parle AU PREMIER CONTACT (les navigateurs bloquent le son avant tout
  // geste). On accueille dès que la marchande touche l'écran — sauf si elle
  // touche directement Tata ou un bouton (ceux-là gèrent déjà leur propre voix),
  // pour ne pas se chevaucher. Une seule fois.
  useEffect(() => {
    if (step !== 'phone') return;
    const greet = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest && t.closest('button, img')) return;
      ecouterTata();
    };
    window.addEventListener('pointerdown', greet, { once: true });
    return () => window.removeEventListener('pointerdown', greet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const tel = document.querySelector('input[autocomplete="tel"]') as HTMLInputElement | null;
    tel?.focus();
    return () => {
      abortRef.current?.abort();
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
      if (focusPinTimeoutRef.current) clearTimeout(focusPinTimeoutRef.current);
      if (micStartTimeoutRef.current) clearTimeout(micStartTimeoutRef.current);
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
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

  const handleBiometric = async () => {
    setIsLoading(true);
    try {
      const result = await authenticateWebAuthn(phone);
      if (result.success && result.user) {
        setAppUser(result.user);
        setUserProfile(result.user);
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
        setError('Authentification biométrique échouée');
      }
    } catch (err) {
      console.warn('[LoginPassword] biometric failed:', err instanceof Error ? err.message : err);
      setError('Biométrie non disponible');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (pinOverride?: string) => {
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
    try {
      const controller = new AbortController();
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: phone.startsWith("+225") ? phone : "+225" + phone, password: pwd }),
        signal: controller.signal,
      });
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
        setError('Erreur serveur : réponse inattendue');
        setIsLoading(false);
        return;
      }
      if (!response.ok || result.error) {
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
      const user = result.user;
      if (!user) {
        setError('Réponse serveur invalide');
        setIsLoading(false);
        return;
      }
      const boRoles = ['super_admin', 'admin'];
      const isBackOffice = boRoles.includes(user.role);
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
        setAppUser(user); setUserProfile(user);
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
      setError('Erreur de connexion');
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
    if (step === 'phone') {
      if (phone.length < 10) {
        const next = phone + digit;
        setPhone(next);
        setError('');
        if (import.meta.env.DEV && next === '0501604040') setShowDevButton(true);
        if (next.length === 10) {
          if (!TEST_PHONES.has(next) && !/^(01|05|07|09|21|25|27)/.test(next)) {
            setError('Préfixe invalide');
            return;
          }
          if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
          scheduleTransitionToPasswordAfterCheck();
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

  const handleKeyDelete = () => {
    if (step === 'phone') {
      if (phoneToPasswordTimeout.current) clearTimeout(phoneToPasswordTimeout.current);
      setPhone(p => p.slice(0, -1));
    } else {
      if (pinInput.length === 0) {
        setStep('phone');
      } else {
        const next = pinInput.slice(0, -1);
        setPinInput(next);
      }
    }
    setError('');
  };

  return (
    <div style={{
      height: '100vh',
      minHeight: '100dvh',
      background: 'radial-gradient(120% 60% at 50% -8%, rgba(219,122,44,0.14), transparent 55%), #FFFDF9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Bandeau ivoirien orange-blanc-vert */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, display: 'flex', zIndex: 50 }}>
        <div style={{ flex: 1, background: '#F77F00' }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: '#009E60' }} />
      </div>
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
        {/* TATA NANTI LOU — présence vivante ; elle parle d'elle-même, on touche son visage pour réécouter */}
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          {tataSpeaking && (
            <motion.span
              aria-hidden
              style={{ position: 'absolute', width: 'clamp(140px, 40vw, 178px)', height: 'clamp(140px, 40vw, 178px)', borderRadius: '50%', border: '3px solid rgba(31,164,99,0.5)' }}
              animate={{ scale: [0.85, 1.18], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <motion.img
            src={tataNantiLou}
            alt="Tata Nanti Lou"
            fetchPriority="high"
            onClick={import.meta.env.DEV ? handleLogoClick : ecouterTata}
            aria-label="Tata Nanti Lou — touchez pour l'entendre"
            animate={{ scale: tataSpeaking ? [1, 1.05, 1] : [1, 1.03, 1] }}
            transition={{ duration: tataSpeaking ? 1 : 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 'clamp(124px, 36vw, 164px)',
              height: 'clamp(124px, 36vw, 164px)',
              borderRadius: '50%',
              objectFit: 'cover',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 16px 34px -14px rgba(184,92,27,0.5), 0 0 0 6px #fff, 0 0 0 9px rgba(219,122,44,0.24)',
            }}
          />
        </div>
        {/* Texte minuscule, gris clair — jamais nécessaire (pour celles qui lisent) */}
        <span style={{ marginTop: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(124,98,80,0.5)' }}>Tata Nanti Lou</span>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'rgba(124,98,80,0.65)', textAlign: 'center', maxWidth: 280 }}>
          {step === 'phone' ? (cachedPrenom ? `Bonjour Maman ${cachedPrenom}` : 'Bonjour ma sœur') : 'Votre code secret'}
        </p>
      </motion.div>

      <motion.div style={{ display: 'none' }}>
        <img
          src={logoJulaba}
          alt="Jùlaba"
          onClick={import.meta.env.DEV ? handleLogoClick : undefined}
          style={{
            width: 'clamp(140px, 45vw, 200px)',
            objectFit: 'contain',
            cursor: import.meta.env.DEV ? 'pointer' : 'default',
          }}
        />
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
          justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, pointerEvents: step === 'phone' ? 'auto' : 'none' }}
            >
            {/* Chiffres EN DIRECT — on voit les nombres apparaître au fur et à mesure.
                Les chiffres se lisent même sans savoir lire ; c'est le vrai contrôle
                « elle m'entend ». « J'écoute… » quand le micro est ouvert sans chiffre. */}
            <div style={{ textAlign: 'center', minHeight: 40, marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {phone.length > 0 ? (
                <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: 3, color: isListening ? '#1C7A4B' : '#7A4A22', fontVariantNumeric: 'tabular-nums' }}>
                  {(phone.match(/.{1,2}/g) || []).join(' ')}
                </span>
              ) : isListening ? (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ fontSize: 18, fontWeight: 800, color: '#1C7A4B', letterSpacing: 1 }}
                >
                  J'écoute… dis ton numéro
                </motion.span>
              ) : null}
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
            {/* GRAND MICRO — l'action. On touche, Tata dit « dis ton numéro », le micro devient vert. */}
            <motion.button
              type="button"
              aria-label="Touchez et dites votre numéro"
              onPointerDown={(e) => e.preventDefault()}
              onClick={dicterNumero}
              animate={{ scale: isListening ? [1, 1.05, 1] : [1, 1.02, 1] }}
              transition={{ duration: isListening ? 1 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 'clamp(184px, 62vw, 214px)', height: 'clamp(184px, 62vw, 214px)',
                alignSelf: 'center', borderRadius: '50%', border: 'none', cursor: 'pointer', color: '#fff',
                background: isListening ? 'radial-gradient(125% 125% at 30% 20%, #38A870, #1C7A4B)' : 'radial-gradient(125% 125% at 30% 20%, #EE8E3C, #C55C18)',
                boxShadow: isListening ? '0 26px 46px -14px rgba(28,122,75,0.7), inset 0 4px 0 rgba(255,255,255,0.35)' : '0 26px 46px -14px rgba(184,92,27,0.75), inset 0 4px 0 rgba(255,255,255,0.4)',
                display: 'grid', placeItems: 'center', marginTop: 6,
              }}
              whileTap={{ scale: 0.96 }}
            >
              <Mic style={{ width: '42%', height: '42%' }} />
            </motion.button>
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
            {/* Actions secondaires : clavier (taper) + bouclier (protégé) — icônes, aucun texte */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 22 }}>
              <button type="button" aria-label="Taper mon numéro sur le clavier" onClick={() => setShowKeypad(v => !v)}
                style={{ width: 58, height: 58, borderRadius: 18, background: showKeypad ? '#DB7A2C' : '#F3E7D8', color: showKeypad ? '#fff' : '#8A5A34', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/></svg>
              </button>
              <div aria-label="Vos informations sont protégées" title="Protégé" style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(47,143,99,0.14)', color: '#1FA463', display: 'grid', placeItems: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
            </div>

            {showKeypad && (
            <>
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 24, fontWeight: 700, letterSpacing: 3, color: '#3d1a08', minHeight: 30, fontVariantNumeric: 'tabular-nums' }}>{formatPhoneNumber(phone) || ' '}</div>
            <div style={{
              width: '100%', boxSizing: 'border-box', background: '#FFF9F2', borderRadius: 22, marginTop: 6,
              overflow: 'hidden', boxShadow: '0 2px 12px rgba(120,60,20,0.08)', border: '1px solid #F0E0CD',
              position: 'relative', paddingBottom: 12,
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 8, padding: '12px 0 8px',
                justifyContent: 'center', justifyItems: 'center', position: 'relative', zIndex: 1,
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <motion.button type="button" key={d} onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress(d)}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.08)', border: '1px solid rgba(198,106,44,0.15)', borderTop: '1px solid rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 500, color: '#5a2e0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(198,106,44,0.06)' }}
                    whileTap={{ scale: 0.9 }}
                  >{d}</motion.button>
                ))}
                <motion.button type="button" disabled={isLoading || phone.length === 0} aria-label="Connexion par empreinte" onPointerDown={(e) => e.preventDefault()} onClick={handleBiometric}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.04)', border: '1px solid rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isLoading || phone.length === 0 ? 0.3 : 0.65 }}
                  whileTap={{ scale: 0.9, opacity: 1 }}>
                  <Fingerprint style={{ width: 22, height: 22, color: '#C66A2C' }} />
                </motion.button>
                <motion.button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress('0')}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.08)', border: '1px solid rgba(198,106,44,0.15)', borderTop: '1px solid rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 500, color: '#5a2e0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(198,106,44,0.06)' }}
                  whileTap={{ scale: 0.9 }}>0</motion.button>
                <motion.button type="button" aria-label="Effacer le dernier chiffre" onPointerDown={(e) => e.preventDefault()} onClick={handleKeyDelete}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.04)', border: '1px solid rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.65 }}
                  whileTap={{ scale: 0.9, opacity: 1 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C66A2C" strokeWidth="2" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                </motion.button>
              </div>
            </div>
            </>
            )}
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
            <div style={{
              width: '100%', background: '#fff', borderRadius: 22,
              overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              position: 'relative',
              paddingBottom: 8,
            }}>
              <motion.div
                style={{ position: 'absolute', top: 0, left: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(198,106,44,0.04), transparent)', pointerEvents: 'none', zIndex: 0 }}
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
              />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                  {[0, 1, 2, 3].map(i => (
                    <motion.div key={i}
                      style={{ width: 13, height: 13, borderRadius: '50%', background: i < pinInput.length ? '#C66A2C' : 'transparent', border: `1.5px solid ${i < pinInput.length ? '#C66A2C' : 'rgba(198,106,44,0.25)'}` }}
                      animate={i < pinInput.length ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.15 }}
                    />
                  ))}
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
                      setStep('phone');
                      setPinInput('');
                      setError('');
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 72px)',
                gap: 8,
                padding: '8px 0',
                justifyContent: 'center',
                justifyItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <motion.button type="button" key={d} onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress(d)}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.08)', border: '1px solid rgba(198,106,44,0.15)', borderTop: '1px solid rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 500, color: '#5a2e0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(198,106,44,0.06)' }}
                    whileTap={{ scale: 0.9 }}
                  >{d}</motion.button>
                ))}
                <motion.button
                  type="button"
                  disabled={isLoading || phone.length === 0}
                  aria-label="Connexion biométrique"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={handleBiometric}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.04)', border: '1px solid rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isLoading || phone.length === 0 ? 0.3 : 0.65 }}
                  whileTap={{ scale: 0.9, opacity: 1 }}
                >
                  <Fingerprint style={{ width: 22, height: 22, color: '#C66A2C' }} />
                </motion.button>
                <motion.button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress('0')}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.08)', border: '1px solid rgba(198,106,44,0.15)', borderTop: '1px solid rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 500, color: '#5a2e0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(198,106,44,0.06)' }}
                  whileTap={{ scale: 0.9 }}
                >0</motion.button>
                <motion.button type="button" aria-label="Effacer le dernier chiffre" onPointerDown={(e) => e.preventDefault()} onClick={handleKeyDelete}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(198,106,44,0.04)', border: '1px solid rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.65 }}
                  whileTap={{ scale: 0.9, opacity: 1 }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C66A2C" strokeWidth="2" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                </motion.button>
              </div>
              <p onClick={() => !error && parle('Entre ton code secret à 4 chiffres')} title="Touche pour écouter"
                 style={{ fontSize: 11, color: 'rgba(150,80,30,0.55)', textAlign: 'center', paddingBottom: 14, position: 'relative', zIndex: 1, cursor: 'pointer', display:'inline-flex', alignItems:'center', gap:5, justifyContent:'center' }}>
                {error ? '' : (<>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C66A2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
                  Entre ton code secret
                </>)}
              </p>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
        {window.location.pathname.includes('backoffice') && (
          <a href="/admin-recovery" style={{ color: 'rgba(124,98,80,0.6)', fontSize: 11, textDecoration: 'none' }}>
            Problème de connexion admin ?
          </a>
        )}
        <p style={{ fontSize: 10, color: 'rgba(124,98,80,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '2px 0 0' }}>By Icône Solution</p>
        <p
          onClick={() => parle(`Version ${__APP_VERSION__}, ${__BUILD_ID__}`)}
          title="Version de l'application"
          style={{ fontSize: 9, color: 'rgba(124,98,80,0.45)', letterSpacing: '0.05em', margin: 0, cursor: 'pointer' }}
        >
          v{__APP_VERSION__} · {__BUILD_ID__}
        </p>
      </motion.div>
    </div>
  );
}