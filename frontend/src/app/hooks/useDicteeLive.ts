import { useState, useRef, useEffect } from 'react';
import { stopAllVoice } from '../services/audioManager';
import { stopIntro } from '../services/onboardingVoix';
import { startLiveDictation, offlineModelReady, offlineModelInstalled } from '../voice-offline/offlineStt';
import { extractPhoneDigits, fusionnerChiffresDictes } from '../utils/frenchDigits';
import { vlog, vlogStart } from '../utils/voiceDebug';
import { CONTRAINTES_MICRO_DICTEE } from '../services/contraintesMicro';

/**
 * ── AUTH-10 (audit UI auth 05/10/2026) — LE ROUAGE DE DICTÉE, SORTI DE L'ÉCRAN ──
 *
 * LoginPassword.tsx portait 1 700+ lignes dont celle-ci : toute la mécanique
 * de dictée EN DIRECT (micro, moteur STT hors-ligne, partielles, stabilisation
 * des nombres composés, filets). L'écran n'en consommait que la SURFACE :
 * « démarre avec cette config, dis-moi si tu écoutes ». Le hook isole le
 * mécanisme ; la POLITIQUE reste dans l'écran — chaque callback de config
 * (consignes, erreurs, aiguillage) est écrit là-bas, avec ses clips et son
 * contrat vocal `parle()` INTACT (aucun appel de parole ne franchit cette
 * frontière : la garde voix-trace fige l'inventaire des appels par fichier).
 *
 * CE QUI A DÉMÉNAGÉ (à l'identique, commentaires compris) :
 *   · les refs du moteur (stream, stop, meilleurs chiffres, minuteurs) ;
 *   · `finaliserDictee` (garde anti-double-fin, repasse finale autoritaire) ;
 *   · `demarrerDictee` (micro anti-écho MIC-01, coupe toutes les voix avant
 *     d'écouter, filet DUR 15 s, auto-arrêt sur valeur complète) ;
 *   · le nettoyage au démontage (micro coupé, minuteurs effacés).
 *
 * SEULE NÉGOCIATION : le canal « elle a choisi de PARLER » (apprentissage
 * 'auto') est signalé par `cfg.onCanalVoix?.()` — l'écran tient ses propres
 * refs `dernierCanal` / `aTenteVoix`, qui lui appartiennent.
 */

// Configuration d'une dictée de chiffres EN DIRECT (numéro OU code). Le moteur est
// le MÊME (un seul rouage) ; seuls la longueur, la validité et l'aiguillage changent.
export type DicteeCfg = {
  max: number;                       // nb de chiffres attendus (10 = numéro, 4 = code)
  estComplet: (d: string) => boolean; // quand la valeur est « bonne » → on s'arrête
  onLive: (d: string) => void;        // remplissage à l'écran au fil de la voix
  onFinal: (d: string) => void;       // valeur figée → aiguillage
  buildTag: string;
  siPasPrete: () => void;             // moteur pas installé
  siMicRefuse: () => void;            // micro refusé
  siEchec: () => void;                // démarrage moteur échoué
  onCanalVoix?: () => void;           // micro obtenu → elle a CHOISI la voix
};

export function useDicteeLive() {
  const [isListening, setIsListening] = useState(false);
  const [isFinalizingDictation, setIsFinalizingDictation] = useState(false);
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
    vlogStart('dictée');
    vlog('BUILD', cfg.buildTag);
    vlog('MODEL_READY', { ready: offlineModelReady(), installed: offlineModelInstalled() });
    vlog('VOIX_ENTREE', 'Tantie Nanti Lou · clips locaux uniquement');

    if (!offlineModelReady()) { vlog('STT_NOT_READY'); cfg.siPasPrete(); return; }

    vlog('MIC_ASK');
    let stream: MediaStream;
    try {
      // MIC-01 — anti-écho : la dictée du numéro et du code s'ouvre juste
      // après la consigne dite. Nu, ce micro entendait le haut-parleur, et des
      // chiffres venus de la voix de Tantie entraient dans le numéro de
      // téléphone. Réglage unique : `services/contraintesMicro`.
      stream = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      vlog('MIC_OK');
    } catch (e) {
      vlog('MIC_DENIED', String(e));
      cfg.siMicRefuse();
      return;
    }
    mediaStreamRef.current = stream;
    dictCfgRef.current = cfg;
    // Apprentissage 'auto' : le canal « voix » appartient à l'écran, le mécanisme
    // au hook — le hook SIGNALE, l'écran note.
    cfg.onCanalVoix?.();

    // Réinitialise l'état de dictée pour cette session d'écoute.
    dictDoneRef.current = false;
    bestDigitsRef.current = '';
    lastTenRef.current = '';
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
    if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null; }
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

  // Au démontage : micro coupé, moteur arrêté, minuteurs effacés — le même
  // nettoyage que faisait l'écran, à la même place (son propre effet mount).
  useEffect(() => {
    return () => {
      if (micStartTimeoutRef.current) clearTimeout(micStartTimeoutRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      // Coupe une dictée EN DIRECT en cours (moteur + micro) au démontage.
      try { void liveStopRef.current?.(); } catch { /* ignore */ }
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    };
  }, []);

  return { isListening, isFinalizingDictation, demarrerDictee, arreterEcoute };
}
