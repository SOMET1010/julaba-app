/**
 * DIRE SON UNITÉ, DANS LE PARCOURS GUIDÉ — VOIX-06, 26/10/2026.
 *
 * LE DÉFAUT QU'ON FERME. L'étape « unité » posait sa question À VOIX HAUTE
 * (STK-23 : « {nom}, tu le vends comment ? ») et n'écoutait PAS la réponse :
 * quatre boutons écrits et un champ libre. Pour une non-lectrice, c'était la
 * seule question du parcours où la voix ne suffisait pas — elle entendait la
 * question, elle savait la réponse, et il fallait quand même LIRE pour la
 * donner. Mesuré au navigateur : dire « au sac » ne servait à rien.
 *
 * CE COMPOSANT EST L'OREILLE DE CETTE ÉTAPE. Il ne décide rien : il écoute,
 * et la règle pure (`services/uniteDite`) lit SON mot — les étiquettes
 * proposées d'abord, son mot du marché ensuite, jamais d'invention. L'unité
 * posée, l'écran la lui RELIT (TATA_UNITE_CHOISIE, dit par le parent) — elle
 * entend ce qui a été écrit, et le refait dire si c'est faux.
 *
 * LE MICRO S'OUVRE TOUT SEUL — même arbitrage de Patrick que le prix (VOX-03)
 * : Tantie pose la question, elle répond en parlant. LA GRILLE RESTE, en
 * second, avec « Autre » : la voix est le geste par défaut, pas le seul.
 *
 * ON NE RÉÉCRIT PAS LA DICTÉE. Les mêmes primitives que BoutonDirePrix :
 * `demarrerRecoWeb` (navigateur, décision du 19/10) puis `startLiveDictation`
 * (Sherpa, APK), les contraintes anti-écho MIC-01, et les refus DITS depuis
 * le catalogue (STK-22) — chaque phrase nomme le geste DE CET ÉCRAN.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader } from 'lucide-react';
import { startLiveDictation } from '../../voice-offline/offlineStt';
import { demarrerRecoWeb, recoWebDispo } from '../../voice-offline/webReco';
import { stopAllVoice } from '../../services/audioManager';
import { uniteDite } from '../../services/uniteDite';
import { CONTRAINTES_MICRO_DICTEE } from '../../services/contraintesMicro';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';

const ORANGE = 'var(--commerce-action)';
/** Même cible tactile que le reste de la caisse : un doigt, pas un curseur. */
const CIBLE = 44;
/** Au-delà, ce n'est plus une unité qu'on dit : on rend la main à la grille. */
const ECOUTE_MAX_MS = 12000;

interface Props {
  /** Les étiquettes affichées — sa voix écrit celle qu'elle aurait touchée. */
  proposees: readonly string[];
  /** Reçoit SON unité, telle que la grille l'aurait écrite. */
  onUnite: (unite: string) => void;
  /** Vrai pour ouvrir le micro de lui-même dès l'arrivée sur l'écran. */
  ouvrirToutSeul?: boolean;
  /** Dit avant d'écouter. Rien n'est écouté tant que Tantie parle. */
  question?: string;
  /** Fait parler l'écran (le guidage vocal de la caisse). */
  dire?: (texte: string) => void | Promise<void>;
}

/** Une seule clé pour un refus : l'écran l'affiche et la voix le dit. */
const DIRE_CLE = (id: string, dire?: (t: string) => void) => {
  void rendreMessage(resoudreMessage(id), (t) => dire?.(t));
};

export function BoutonDireUnite({ proposees, onUnite, ouvrirToutSeul, question, dire }: Props) {
  const [ecoute, setEcoute] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const arretRef = useRef<null | (() => Promise<void>)>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demarreRef = useRef(false);
  /** VOX-06 — a-t-elle été comprise ? Le silence du minuteur ne se referme
   *  muet que si NON ; sur le chemin web, c'est `conclure` qui relance. */
  const aEntenduRef = useRef(false);
  /** Le chemin actif : seul le chemin sherpa laisse le minuteur relancer. */
  const cheminRef = useRef<null | 'web' | 'sherpa'>(null);

  const fermer = async () => {
    if (minuteurRef.current) { clearTimeout(minuteurRef.current); minuteurRef.current = null; }
    try { await arretRef.current?.(); } catch { /* ignore */ }
    arretRef.current = null;
    try { fluxRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    fluxRef.current = null;
    setEcoute(false);
  };

  const lire = (texte: string): string | null => uniteDite(texte || '', proposees);

  const ecouter = async () => {
    if (ecoute) { void fermer(); return; }
    aEntenduRef.current = false;
    cheminRef.current = null;
    // VERROU PAROLE / ÉCOUTE : si Tantie parle encore (la question, la relecture
    // d'une unité précédente), le micro l'entendrait elle. On coupe tout.
    try { stopAllVoice(); } catch { /* ignore */ }
    try {
      // MIC-01 — anti-écho : même réglage que tous les micros de la caisse
      // (`services/contraintesMicro`, une seule liste).
      const flux = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      fluxRef.current = flux;
      setEcoute(true);
      // Web d'abord : même motif que BoutonDireNom et BoutonDirePrix — Sherpa
      // reste le moteur de l'APK, la reconnaissance du navigateur sert le web.
      if (recoWebDispo()) {
        cheminRef.current = 'web';
        const web = demarrerRecoWeb({
          interim: () => {},
          conclure: (texte) => {
            const u = lire(texte);
            void fermer();
            if (u) { aEntenduRef.current = true; onUnite(u); return; }
            // Rien de lisible : on le dit, on ne referme pas le micro en
            // silence. Les boutons restent là.
            DIRE_CLE('STOCK_066', dire);
          },
          erreur: (code) => {
            void fermer();
            setIndisponible(true);
            setEcoute(false);
            DIRE_CLE(code === 'micro' ? 'STOCK_067' : 'STOCK_068', dire);
          },
        });
        if (web) {
          arretRef.current = web.conclure;
          minuteurRef.current = setTimeout(() => { void fermer(); }, ECOUTE_MAX_MS);
          return;
        }
      }
      cheminRef.current = 'sherpa';
      const handle = await startLiveDictation(flux, (texte, estFinal) => {
        if (!estFinal) return;
        const u = lire(texte);
        void fermer();
        if (u) { aEntenduRef.current = true; onUnite(u); return; }
        DIRE_CLE('STOCK_066', dire);
      });
      arretRef.current = handle.stop;
      minuteurRef.current = setTimeout(() => {
        void fermer();
        // VOX-06 — le silence ne se referme plus muet. Le chemin web relance
        // lui-même via `conclure` ; relancer ici aussi ferait deux fois la
        // phrase.
        if (cheminRef.current === 'sherpa' && !aEntenduRef.current) DIRE_CLE('STOCK_066', dire);
      }, ECOUTE_MAX_MS);
    } catch {
      // STK-22 — LA PANNE SE DIT, depuis la même clé qu'elle affiche. La
      // grille reste le repli, et la phrase nomme son geste à elle.
      DIRE_CLE('STOCK_067', dire);
      setIndisponible(true);
      setEcoute(false);
    }
  };

  useEffect(() => {
    if (!ouvrirToutSeul || demarreRef.current) return;
    demarreRef.current = true;
    // Tantie pose la question, PUIS on écoute — VOX-05a, même mécanique que
    // le prix : on attend la fin réelle de la parole quand l'appelant sait la
    // dire, sinon le délai fixe.
    let annule = false;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    const ouvrir = () => { if (!annule) void ecouter(); };

    if (question && dire) {
      const parle = dire(question) as unknown;
      if (parle && typeof (parle as Promise<void>).then === 'function') {
        void (parle as Promise<void>).then(
          () => { minuteur = setTimeout(ouvrir, 250); },
          () => { minuteur = setTimeout(ouvrir, 250); },
        );
      } else {
        minuteur = setTimeout(ouvrir, 1400);
      }
    } else {
      minuteur = setTimeout(ouvrir, 250);
    }
    return () => { annule = true; if (minuteur) clearTimeout(minuteur); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule ouverture par écran
  }, []);

  useEffect(() => () => { void fermer(); }, []);

  if (indisponible) {
    return (
      <p role="status" style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre-4)', margin: 0, textAlign: 'center' }}>
        {resoudreMessage('STOCK_067').texte}
      </p>
    );
  }

  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => void ecouter()}
      aria-label={ecoute ? "Je t'écoute, dis comment tu le vends" : 'Dis comment tu le vends'}
      style={{ width: '100%', minHeight: CIBLE + 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: ecoute ? ORANGE : 'white', color: ecoute ? 'white' : ORANGE,
        boxShadow: ecoute ? 'none' : `inset 0 0 0 2px ${ORANGE}` }}>
      {ecoute ? <Loader size={22} /> : <Mic size={22} />}
      <span style={{ fontSize: 16, fontWeight: 800 }}>
        {ecoute ? "Je t'écoute…" : 'Dis comment tu le vends'}
      </span>
    </motion.button>
  );
}
