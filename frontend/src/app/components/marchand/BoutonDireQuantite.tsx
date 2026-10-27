/**
 * DIRE SA QUANTITÉ, DANS LE PARCOURS GUIDÉ — VOIX-06, 26/10/2026.
 *
 * LE DÉFAUT QU'ON FERME. « Tu en as combien ? Si tu ne sais pas, passe. »
 * (STOCK_054) était DITE et n'écoutait PAS : pavé de chiffres et bouton
 * « Je ne sais pas ». La phrase disait elle-même qu'on pouvait passer — rien
 * n'écoutait le mot. Cette étape était la seconde du parcours (avec l'unité,
 * fermée le même jour) où la voix ne suffisait pas.
 *
 * CE COMPOSANT EST L'OREILLE DE CETTE ÉTAPE. Il ne décide rien : la règle
 * pure `services/quantiteDite` lit SON nombre (ou son « passe »). Le nombre
 * posé, l'écran le lui RELIT (STOCK_072, dit par le parent) — elle entend ce
 * qui a été écrit, comme au pavé. Le « passe » déclenche EXACTEMENT le geste
 * du bouton « Je ne sais pas » : stock INCONNU, jamais un zéro inventé.
 *
 * LE MICRO S'OUVRE TOUT SEUL — même arbitrage de Patrick que le prix (VOX-03)
 * : Tantie pose la question, elle répond en parlant. LE PAVÉ ET LE BOUTON
 * RESTENT : la voix est le geste par défaut, pas le seul. Le ✓ vert reste le
 * geste qui enregistre — rien n'avance seul (décision du 24/09).
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader } from 'lucide-react';
import { startLiveDictation } from '../../voice-offline/offlineStt';
import { demarrerRecoWeb, recoWebDispo } from '../../voice-offline/webReco';
import { stopAllVoice } from '../../services/audioManager';
import { quantiteDite, type QuantiteEntendue } from '../../services/quantiteDite';
import { CONTRAINTES_MICRO_DICTEE } from '../../services/contraintesMicro';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';

const ORANGE = 'var(--commerce-action)';
/** Même cible tactile que le reste de la caisse : un doigt, pas un curseur. */
const CIBLE = 44;
/** Au-delà, ce n'est plus une quantité qu'on dit : on rend la main au pavé. */
const ECOUTE_MAX_MS = 12000;

interface Props {
  /** Reçoit SON nombre — zéro compris : son zéro est une réponse (STK-04). */
  onNombre: (nombre: number) => void;
  /** Elle passe — EXACTEMENT le geste du bouton « Je ne sais pas ». */
  onPasse: () => void;
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

export function BoutonDireQuantite({ onNombre, onPasse, ouvrirToutSeul, question, dire }: Props) {
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

  const livrer = (lu: QuantiteEntendue | null): boolean => {
    if (!lu) return false;
    aEntenduRef.current = true;
    if (lu.genre === 'passe') onPasse();
    else onNombre(lu.nombre);
    return true;
  };

  const ecouter = async () => {
    if (ecoute) { void fermer(); return; }
    aEntenduRef.current = false;
    cheminRef.current = null;
    // VERROU PAROLE / ÉCOUTE : si Tantie parle encore (la question, la relecture
    // d'un nombre), le micro l'entendrait elle. On coupe tout.
    try { stopAllVoice(); } catch { /* ignore */ }
    try {
      // MIC-01 — anti-écho : même réglage que tous les micros de la caisse
      // (`services/contraintesMicro`, une seule liste).
      const flux = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      fluxRef.current = flux;
      setEcoute(true);
      // Web d'abord : même motif que les trois autres micros du parcours.
      if (recoWebDispo()) {
        cheminRef.current = 'web';
        const web = demarrerRecoWeb({
          interim: (texte) => {
            const lu = quantiteDite(texte || '');
            // EN DIRECT : elle voit le nombre poser pendant qu'elle parle.
            if (lu && lu.genre === 'nombre') { aEntenduRef.current = true; onNombre(lu.nombre); }
          },
          conclure: (texte) => {
            const lu = quantiteDite(texte || '');
            void fermer();
            if (livrer(lu)) return;
            // Rien de lisible : on le dit, on ne referme pas le micro en
            // silence. Le pavé reste là.
            DIRE_CLE('STOCK_069', dire);
          },
          erreur: (code) => {
            void fermer();
            setIndisponible(true);
            setEcoute(false);
            DIRE_CLE(code === 'micro' ? 'STOCK_070' : 'STOCK_071', dire);
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
        const lu = quantiteDite(texte || '');
        void fermer();
        if (livrer(lu)) return;
        DIRE_CLE('STOCK_069', dire);
      });
      arretRef.current = handle.stop;
      minuteurRef.current = setTimeout(() => {
        void fermer();
        // VOX-06 — le silence ne se referme plus muet. Le chemin web relance
        // lui-même via `conclure` ; relancer ici aussi ferait deux fois la
        // phrase.
        if (cheminRef.current === 'sherpa' && !aEntenduRef.current) DIRE_CLE('STOCK_069', dire);
      }, ECOUTE_MAX_MS);
    } catch {
      // STK-22 — LA PANNE SE DIT, depuis la même clé qu'elle affiche. Le
      // pavé reste le repli, et la phrase nomme son geste à elle.
      DIRE_CLE('STOCK_070', dire);
      setIndisponible(true);
      setEcoute(false);
    }
  };

  useEffect(() => {
    if (!ouvrirToutSeul || demarreRef.current) return;
    demarreRef.current = true;
    // Tantie pose la question, PUIS on écoute — VOX-05a, même mécanique que
    // le prix et l'unité.
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
        {resoudreMessage('STOCK_070').texte}
      </p>
    );
  }

  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => void ecouter()}
      aria-label={ecoute ? "Je t'écoute, dis combien tu en as" : 'Dis combien tu en as'}
      style={{ width: '100%', minHeight: CIBLE + 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: ecoute ? ORANGE : 'white', color: ecoute ? 'white' : ORANGE,
        boxShadow: ecoute ? 'none' : `inset 0 0 0 2px ${ORANGE}` }}>
      {ecoute ? <Loader size={22} /> : <Mic size={22} />}
      <span style={{ fontSize: 16, fontWeight: 800 }}>
        {ecoute ? "Je t'écoute…" : 'Dis combien tu en as'}
      </span>
    </motion.button>
  );
}
