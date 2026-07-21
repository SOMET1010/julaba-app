import { useEffect, useRef } from 'react';

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
//  - Utilise la reconnaissance vocale du navigateur (SpeechRecognition). Léger,
//    aucun téléchargement. NÉCESSITE INTERNET (le cœur de la vente reste, lui,
//    utilisable hors-ligne en appui-pour-parler).
//  - `active` doit être coupé pendant que l'assistante réfléchit/parle : sinon le
//    micro réentend la voix de Tata Lou (boucle) et entre en conflit avec
//    l'enregistrement audio. La modale ne met `active` à vrai qu'à l'état "idle".
// ─────────────────────────────────────────────────────────────────────────────

// Variantes fréquentes de « Julaba » telles que transcrites par la reco vocale FR.
const WAKE_RE = /\b(j[ou]{1,2}la\s?ba|djoula\s?ba|joula\s?ba|jula\s?bas?)\b/i;

interface Options {
  enabled: boolean;              // le mode mains-libres est activé par l'utilisatrice
  active: boolean;               // on peut écouter MAINTENANT (idle, pas en train de parler)
  onWake: () => void;            // « Julaba » seul entendu → armer + retour audio
  onCommand: (texte: string) => void; // commande captée (à envoyer à l'assistant)
  lang?: string;
}

export function useWakeWord({ enabled, active, onWake, onCommand, lang = 'fr-FR' }: Options) {
  const recRef = useRef<any>(null);
  const armedRef = useRef(false);        // « Julaba » seul entendu → prochaine phrase = commande
  const enabledRef = useRef(enabled);
  const activeRef = useRef(active);
  const cbRef = useRef({ onWake, onCommand });
  cbRef.current = { onWake, onCommand };
  enabledRef.current = enabled;
  activeRef.current = active;

  const SR: any = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;
  const supported = !!SR;

  // Création unique de l'instance de reconnaissance.
  useEffect(() => {
    if (!supported) return;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const txt = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r: any) => r[0]?.transcript || '')
        .join(' ')
        .toLowerCase()
        .trim();
      if (!txt) return;
      // Déjà armé par un « Julaba » précédent : cette phrase EST la commande.
      if (armedRef.current) {
        armedRef.current = false;
        cbRef.current.onCommand(txt);
        return;
      }
      const m = txt.match(WAKE_RE);
      if (!m) return; // pas de mot-réveil → on ignore (évite les déclenchements par erreur)
      const after = txt.slice((m.index || 0) + m[0].length).replace(/^[\s,.:!?-]+/, '').trim();
      if (after.length >= 2) {
        cbRef.current.onCommand(after);
      } else {
        armedRef.current = true;
        cbRef.current.onWake();
      }
    };

    // La reco s'arrête toute seule après un silence : on la relance tant que le
    // mode est actif (sinon le mains-libres ne durerait que quelques secondes).
    rec.onend = () => {
      if (enabledRef.current && activeRef.current) {
        try { rec.start(); } catch { /* déjà démarrée */ }
      }
    };
    rec.onerror = (ev: any) => {
      // no-speech / aborted sont normaux ; onend relancera si besoin.
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        enabledRef.current = false; // micro refusé → on n'insiste pas
      }
    };

    recRef.current = rec;
    return () => {
      try { rec.onend = null; rec.onresult = null; rec.onerror = null; rec.stop(); } catch { /* ignore */ }
      recRef.current = null;
    };
  }, [supported, lang, SR]);

  // Démarre / arrête selon enabled + active.
  useEffect(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (enabled && active) {
      try { rec.start(); } catch { /* déjà démarrée */ }
    } else {
      armedRef.current = false;
      try { rec.stop(); } catch { /* déjà arrêtée */ }
    }
  }, [enabled, active]);

  return { supported };
}
