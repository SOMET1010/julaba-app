import { useEffect, useRef, useState } from 'react';
import {
  startLiveDictation,
  ensureOfflineModel,
  offlineModelInstalled,
  subscribeModelReady,
} from '../voice-offline/offlineStt';
import { GRAMMAR_WORDS } from '../voice-offline/vocabulaire';

// ─────────────────────────────────────────────────────────────────────────────
// Mot-réveil « Julaba » — vente MAINS LIBRES.
//
// Pour une vendeuse qui a les deux mains prises (marchandise + monnaie), toucher
// l'écran n'est pas réaliste. Ce hook écoute en continu et se déclenche quand
// elle dit « Julaba … ». Deux façons de parler :
//   • « Julaba, j'ai vendu 10 tomates »  → commande captée d'un coup
//   • « Julaba » (seul) → bip, puis la phrase suivante est prise comme commande
//
// Choix techniques :
//  - 100 % SUR L'APPAREIL : on réutilise l'écoute streaming du moteur hors-ligne
//    installé (sherpa-onnx en premier, Vosk en repli) via `startLiveDictation`.
//    AUCUN Internet : c'est ce qui débloque le mains-libres (l'ancienne version
//    reposait sur SpeechRecognition du navigateur, qui exigeait Internet).
//  - Ne s'active que si le modèle hors-ligne est INSTALLÉ sur l'appareil
//    (`offlineModelInstalled`) — le ré-échauffement se fait depuis le cache,
//    jamais un téléchargement de ~128 Mo en silence.
//  - `active` doit être coupé pendant que l'assistante réfléchit/parle : sinon le
//    micro réentend la voix de Tata Nanti Lou (boucle) et entre en conflit avec
//    l'enregistrement audio. La modale ne met `active` à vrai qu'à l'état "idle".
// ─────────────────────────────────────────────────────────────────────────────

// Variantes fréquentes de « Julaba » telles que transcrites par la reco vocale FR.
const WAKE_RE = /\b(j[ou]{1,2}la\s?ba|djoula\s?ba|joula\s?ba|jula\s?bas?)\b/i;

// Le repli Vosk a un vocabulaire FERMÉ : on ajoute les variantes du mot-réveil à
// la grammaire du marché, sinon il ne les reconnaîtrait jamais. (sherpa, lui, est
// à vocabulaire ouvert → ce paramètre est ignoré sur le moteur principal.)
const WAKE_WORDS = ['julaba', 'joulaba', 'djoulaba', 'joula', 'djoula', 'jula', 'djoulabas'];

interface Options {
  enabled: boolean;              // le mode mains-libres est activé par l'utilisatrice
  active: boolean;               // on peut écouter MAINTENANT (idle, pas en train de parler)
  onWake: () => void;            // « Julaba » seul entendu → armer + retour audio
  onCommand: (texte: string) => void; // commande captée (à envoyer à l'assistant)
  lang?: string;
}

export function useWakeWord({ enabled, active, onWake, onCommand }: Options) {
  const [installed, setInstalled] = useState(() => offlineModelInstalled());
  const armedRef = useRef(false);        // « Julaba » seul entendu → prochaine phrase = commande
  const armedBaseRef = useRef('');       // texte déjà transcrit au moment de l'armement (à retirer)
  const enabledRef = useRef(enabled);
  const activeRef = useRef(active);
  const cbRef = useRef({ onWake, onCommand });
  cbRef.current = { onWake, onCommand };
  enabledRef.current = enabled;
  activeRef.current = active;

  // Suit l'installation du modèle (bouton InstallerOffline dans la même modale).
  useEffect(() => subscribeModelReady(() => setInstalled(offlineModelInstalled())), []);

  // Le mains-libres est possible dès que le modèle hors-ligne est installé.
  const supported = installed;

  // ── Écoute continue hors-ligne (mot-réveil) ────────────────────────────────
  useEffect(() => {
    if (!enabled || !active || !installed) return;
    let disposed = false;
    let session: { stop: () => Promise<void> } | null = null;
    let mic: MediaStream | null = null;

    const stopSession = async () => {
      if (session) { try { await session.stop(); } catch { /* ignore */ } session = null; }
      if (mic) { mic.getTracks().forEach((t) => t.stop()); mic = null; }
    };

    const onText = (texte: string) => {
      const t = (texte || '').trim();
      if (!t) return;
      // Déjà armé par un « Julaba » précédent : cette phrase EST la commande.
      if (armedRef.current) {
        const base = armedBaseRef.current;
        // On retire le texte déjà entendu (l'écoute streaming accumule) pour
        // n'envoyer que la NOUVELLE phrase (« julaba » + commande → juste commande).
        const cmd = base ? t.slice(base.length) : t;
        const clean = cmd.replace(/^[\s,.:!?-]+/, '').trim();
        if (clean.length >= 1) {
          armedRef.current = false;
          armedBaseRef.current = '';
          cbRef.current.onCommand(clean);
        }
        return;
      }
      const low = t.toLowerCase();
      const m = low.match(WAKE_RE);
      if (!m) return; // pas de mot-réveil → on ignore (évite les déclenchements par erreur)
      const after = t.slice((m.index || 0) + m[0].length).replace(/^[\s,.:!?-]+/, '').trim();
      if (after.length >= 2) {
        cbRef.current.onCommand(after);
      } else {
        armedRef.current = true;
        armedBaseRef.current = t;
        cbRef.current.onWake();
      }
    };

    const start = async () => {
      try {
        // Ré-activation depuis le cache uniquement (le modèle est déjà installé —
        // jamais de téléchargement silencieux de ~128 Mo).
        if (disposed) return;
        await ensureOfflineModel();
        if (disposed || !enabledRef.current || !activeRef.current) return;
        mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1, sampleRate: 16000,
            echoCancellation: true, noiseSuppression: true, autoGainControl: true,
          },
        });
        if (disposed || !enabledRef.current || !activeRef.current) { void stopSession(); return; }
        // Vocabulaire fermé Vosk + variantes du mot-réveil (sherpa les ignore).
        session = await startLiveDictation(mic, onText, [...GRAMMAR_WORDS, ...WAKE_WORDS]);
      } catch {
        // Micro refusé ou moteur indisponible → on s'arrête proprement (l'appui-pour-
        // parler reste le mode de vente). Pas de boucle de re-tentatives infinies.
        void stopSession();
      }
    };

    void start();
    return () => { disposed = true; void stopSession(); };
  }, [enabled, active, installed]);

  return { supported };
}
