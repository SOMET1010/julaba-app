/**
 * DIRE SON PRODUIT — STK-05.
 *
 * LE DÉFAUT. Le plus gros bouton de l'écran du stock dictait « dis : "ajoute
 * 10 piments à 500" », et `intentLocal` rendait `null` sur cette phrase
 * exacte. `ajouter_stock` n'avait aucun producteur dans le dépôt : le bloc
 * qui l'attendait était inatteignable. Elle disait ce qu'on lui dictait et
 * recevait « Je n'ai pas bien compris ».
 *
 * POURQUOI ON NE PASSE PAS PAR `useVoiceCore`. Mesuré : quand `intentLocal`
 * rend `null`, `handleResponse` n'est jamais appelé — donc `onAction` non
 * plus. Brancher la nouvelle règle dans `onAction` n'aurait RIEN changé, tout
 * en donnant un test vert. Et `useVoiceCore.ts` est figé par VOICE-01 : on ne
 * le touche pas. On reprend donc le chemin déjà validé par VOX-03 — la dictée
 * brute, dont on lit nous-mêmes le texte.
 *
 * ON NE RÉÉCRIT PAS LA DICTÉE. `startLiveDictation` existe et sert déjà à
 * l'écran du numéro et à celui du prix.
 *
 * LA RÈGLE DE LECTURE VIT AILLEURS (`services/produitDit`), pure et testée.
 * Ce bouton écoute ; il ne décide pas ce qu'est un produit.
 *
 * SI LE MICRO NE VEUT PAS, ON NE BLOQUE RIEN : le bouton « Ajouter un
 * produit » est juste à côté, et on le dit.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader } from 'lucide-react';
import { startLiveDictation } from '../../voice-offline/offlineStt';
import { stopAllVoice } from '../../services/audioManager';
import { produitDit, type EcouteProduit } from '../../services/produitDit';

const ORANGE = '#B74725';
const CIBLE = 44;
/** Au-delà, ce n'est plus un produit qu'on nomme : on rend la main au tactile. */
const ECOUTE_MAX_MS = 12000;

interface Props {
  /** Son étal, pour reprendre SON orthographe au lieu d'en créer une seconde. */
  sesProduits: readonly { nom: string }[];
  /** Reçoit ce qu'elle a donné, dès que c'est lisible. */
  onProduit: (lu: EcouteProduit) => void;
  /** Dit quand rien n'a été compris — on ne prétend pas avoir entendu. */
  dire?: (texte: string) => void;
}

export function BoutonDireProduit({ sesProduits, onProduit, dire }: Props) {
  const [ecoute, setEcoute] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const arretRef = useRef<null | (() => Promise<void>)>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fermer = async () => {
    if (minuteurRef.current) { clearTimeout(minuteurRef.current); minuteurRef.current = null; }
    try { await arretRef.current?.(); } catch { /* ignore */ }
    arretRef.current = null;
    try { fluxRef.current?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    fluxRef.current = null;
    setEcoute(false);
  };

  const ecouter = async () => {
    if (ecoute) { void fermer(); return; }
    // VERROU PAROLE / ÉCOUTE : si Tantie parle encore, le micro l'entend elle.
    try { stopAllVoice(); } catch { /* ignore */ }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxRef.current = flux;
      setEcoute(true);
      const handle = await startLiveDictation(flux, (texte, estFinal) => {
        if (!estFinal) return;
        const lu = produitDit(texte || '', sesProduits);
        void fermer();
        // RIEN COMPRIS : on le dit, on n'ouvre pas un formulaire vide devant
        // elle en faisant comme si on avait entendu.
        if (!lu) { dire?.("Je n'ai pas entendu de produit. Dis-moi ce que tu vends."); return; }
        onProduit(lu);
      });
      arretRef.current = handle.stop;
      minuteurRef.current = setTimeout(() => { void fermer(); }, ECOUTE_MAX_MS);
    } catch {
      setIndisponible(true);
      setEcoute(false);
    }
  };

  useEffect(() => () => { void fermer(); }, []);

  if (indisponible) {
    return (
      <p role="status" style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre-4)', margin: 0, textAlign: 'center' }}>
        Le micro ne répond pas. Touche « Ajouter un produit ».
      </p>
    );
  }

  return (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => void ecouter()}
      aria-label={ecoute ? "Je t'écoute, dis ton produit" : 'Ajouter en parlant'}
      style={{ width: '100%', minHeight: CIBLE + 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        borderRadius: 18, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: ecoute ? ORANGE : 'white', color: ecoute ? 'white' : ORANGE,
        boxShadow: ecoute ? 'none' : `inset 0 0 0 2px ${ORANGE}` }}>
      {ecoute ? <Loader size={26} /> : <Mic size={26} />}
      <span style={{ fontSize: 18, fontWeight: 800 }}>
        {ecoute ? "Je t'écoute…" : 'Ajouter en parlant'}
      </span>
    </motion.button>
  );
}
