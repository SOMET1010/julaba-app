import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTRAINTES_MICRO_DICTEE } from '../services/contraintesMicro';
import { vlog } from '../utils/voiceDebug';
import { demarrerRecoWeb, recoWebDispo } from '../voice-offline/webReco';
import { offlineModelReady, startLiveDictation } from '../voice-offline/offlineStt';
import { intentionConfirmationNumero, type CommandeNumero } from '../voice-offline/commandesEntree';

/**
 * ── L'ÉCOUTE DES COMMANDES — LA CONFIRMATION DU NUMÉRO DEVIENT PARLABLE ─────
 *
 * L'AUDIT (rapport Patrick, 26/10) : « après la dictée du numéro, la
 * confirmation demande encore de toucher "C'est mon numéro" » et « il
 * n'existe pas encore de reconnaissance de commandes vocales comme "oui",
 * "c'est mon numéro" ou "utiliser les chiffres" ». Pour une utilisatrice qui
 * ne sait ni lire ni écrire, le clignotement d'un bouton n'est pas une
 * réponse possible : la voix doit l'être.
 *
 * CE HOOK EST LE ROUAGE, PAS LA POLITIQUE (même frontière que
 * `useDicteeLive`, AUTH-10) : il ouvre le micro, traite le texte entendu
 * par la grammaire déclarée `commandesEntree.intentionConfirmationNumero`,
 * et REND LE MICRO AVANT de prévenir l'écran. Chaque clip, chaque action
 * reste écrit dans `LoginPassword` — aucun appel de parole ne franchit
 * cette frontière.
 *
 * LES DEUX RÈGLES D'OR, HÉRITÉES :
 *
 *   MIC-01 (anti-écho) — l'écoute s'ouvre APRÈS la consigne dite, et une
 *   garde de 600 ms ignore tout ce qui arrive tout de suite après
 *   l'ouverture : la queue du clip de Tantie qui revient par la pièce ne
 *   doit jamais se transformer en commande (« dis oui » entendu par
 *   l'application elle-même = confirmation sans réponse humaine). Sur l'APK
 *   le micro est ouvert avec les contraintes anti-écho
 *   (`services/contraintesMicro`) ; sur le web, SpeechRecognition applique
 *   l'annulation d'écho du système.
 *
 *   B5 (le code ne s'écoute pas) — ce rouage ne sert QUE la confirmation du
 *   NUMÉRO. À l'étape du code secret il n'est jamais démarré : un marché est
 *   un lieu public, le code ne se dit pas, il se tape (pavé auto-validé à 4
 *   chiffres) ou se fait reconnaître (empreinte/visage).
 *
 * UNE SEULE FENÊTRE (défaut 10 s) : l'écoute ne harcèle pas. Si rien de
 * clair n'arrive, elle se referme silencieusement — le bouton clignotant
 * reste là, le micro central aussi. La grammaire rend `null` sur le doute :
 * « ça fait combien ? », une dictée parasite, un bruit de marché — l'écoute
 * continue jusqu'au bout de la fenêtre au lieu de réagir à côté.
 */

export type CommandesVocalesCfg = {
  /** Prévenu quand une commande est comprise — le micro est DÉJÀ rendu. */
  surCommande: (c: CommandeNumero) => void;
  /** Durée totale de la fenêtre d'écoute (ms). Défaut 10 000. */
  dureeMs?: number;
  /** Silence obligatoire après l'ouverture, anti-écho (ms). Défaut 600. */
  gardeAntiEchoMs?: number;
};

const DUREE_DEFAUT_MS = 10_000;
const GARDE_DEFAUT_MS = 600;

export function useCommandesVocales() {
  const [ecoute, setEcoute] = useState(false);
  const cfgRef = useRef<CommandesVocalesCfg | null>(null);
  const stopRef = useRef<null | (() => void)>(null);
  const fenetreRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Horodatage d'ouverture : sert À LA FOIS de garde anti-écho et de drapeau
  // « une demande est en vol » (le vrai stop n'existe qu'après l'await du
  // moteur natif — sans ce drapeau, deux démarrages pouvaient empiler deux
  // moteurs sur un seul micro).
  const ouvertARef = useRef(0);

  const arreter = useCallback(() => {
    ouvertARef.current = 0;
    if (fenetreRef.current) { clearTimeout(fenetreRef.current); fenetreRef.current = null; }
    const stop = stopRef.current;
    stopRef.current = null;
    cfgRef.current = null;
    if (stop) { try { stop(); } catch { /* déjà arrêté */ } }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      streamRef.current = null;
    }
    setEcoute((v) => (v ? false : v));
  }, []);

  const demarrer = useCallback((cfg: CommandesVocalesCfg) => {
    if (stopRef.current || ouvertARef.current) return; // déjà en écoute (ou en vol)
    const surWeb = recoWebDispo();
    if (!surWeb && !offlineModelReady()) { vlog('COMMANDES_NON_PRETE'); return; }

    cfgRef.current = cfg;
    ouvertARef.current = Date.now();
    const garde = cfg.gardeAntiEchoMs ?? GARDE_DEFAUT_MS;

    const traiter = (texte: string) => {
      if (!stopRef.current) return; // arrêté entre-temps
      const intention = intentionConfirmationNumero(texte);
      if (!intention) return;
      const depuisOuverture = Date.now() - ouvertARef.current;
      if (depuisOuverture < garde) {
        // La queue du clip de Tantie qui revient par la pièce : JAMAIS une
        // commande. On l'inscrit au journal et on continue d'écouter.
        vlog('COMMANDE_ECHO_IGNORE', { intention, ms: depuisOuverture });
        return;
      }
      vlog('COMMANDE', { intention, ms: depuisOuverture });
      // LE MICRO EST RENDU AVANT L'ACTION : la suite peut redicter
      // (getUserMedia) ou reparler sans qu'un second moteur se batte pour
      // le même micro.
      arreter();
      cfg.surCommande(intention);
    };

    const armerFenetre = (dureeMs: number) => {
      if (fenetreRef.current) clearTimeout(fenetreRef.current);
      fenetreRef.current = setTimeout(() => { vlog('COMMANDES_FENETRE_FERMEE'); arreter(); }, dureeMs);
    };

    if (surWeb) {
      // WEB — SpeechRecognition du navigateur : le canal vivant est `interim`
      // (le texte arrive au fil de la phrase). La grammaire juge chaque
      // instantané ; les résultats partiels d'un « non » en train de se dire
      // ne matchent aucun motif avant d'être complets.
      const reco = demarrerRecoWeb({
        interim: traiter,
        conclure: () => { /* la fenêtre tranche, pas la fin du moteur */ },
        erreur: (code) => { vlog('COMMANDES_ERR', code); arreter(); },
      });
      if (!reco) { cfgRef.current = null; ouvertARef.current = 0; return; }
      stopRef.current = () => { try { reco.annuler(); } catch { /* ignore */ } };
      setEcoute(true);
      armerFenetre(cfg.dureeMs ?? DUREE_DEFAUT_MS);
      return;
    }

    // APK — sherpa natif, le MÊME rouage que la dictée : micro contraint
    // (MIC-01), moteur live, texte final par morceau.
    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      } catch {
        vlog('COMMANDES_MIC_REFUSE');
        cfgRef.current = null; ouvertARef.current = 0;
        return;
      }
      // Un arrêt a pu être demandé PENDANT la demande de micro (démontage,
      // dictée lancée) : on ne laisse pas un moteur orphelin derrière soi.
      if (!cfgRef.current) {
        try { stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        return;
      }
      streamRef.current = stream;
      try {
        const handle = await startLiveDictation(
          stream,
          (texte, estFinal) => { if (estFinal) traiter(texte); },
          undefined,
          (tag, data) => vlog(tag, data),
        );
        if (!cfgRef.current) {
          try { void handle.stop(); } catch { /* ignore */ }
          try { stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
          streamRef.current = null;
          return;
        }
        stopRef.current = () => { try { void handle.stop(); } catch { /* ignore */ } };
        setEcoute(true);
        armerFenetre(cfg.dureeMs ?? DUREE_DEFAUT_MS);
      } catch {
        vlog('COMMANDES_LIVE_FAIL');
        try { stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        streamRef.current = null;
        cfgRef.current = null; ouvertARef.current = 0;
      }
    })();
  }, [arreter]);

  // Au démontage : micro rendu, moteur arrêté, fenêtre effacée — le même
  // nettoyage que useDicteeLive à sa place propre.
  useEffect(() => () => arreter(), [arreter]);

  return { ecoute, demarrer, arreter };
}
