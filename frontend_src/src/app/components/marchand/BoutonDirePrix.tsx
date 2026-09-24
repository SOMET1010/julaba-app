/**
 * DIRE SON PRIX — VOX-03.
 *
 * LE DÉFAUT QU'ON FERME. L'écran du prix tendait un pavé de chiffres et un
 * champ texte. Rien pour parler. Patrick, terrain du 24/09 : « il me demande
 * mon prix, mais avec une interface pour saisir — si je ne sais pas lire ? »
 *
 * ET UN MICRO DÉCORATIF, PIRE QUE RIEN. `AjoutProduitGuide` affichait une
 * icône `aria-hidden` sous « ou dis-le à Tantie », dans un paragraphe, non
 * cliquable. Un écran muet est mauvais ; un écran qui MENT sur ce qu'il sait
 * faire est pire — c'est CAI-08 (un bouton câblé sur le vide) et ACC-05 (un
 * clip absent qui passe pour joué).
 *
 * ARBITRAGE DE PATRICK : le micro s'ouvre TOUT SEUL, Tantie demande à voix
 * haute, elle répond en parlant. Le clavier reste, en second. Le geste par
 * défaut doit être celui qu'elle sait faire.
 *
 * ON NE RÉÉCRIT PAS LA DICTÉE. `startLiveDictation` existe et sert déjà à
 * l'écran du numéro ; le fichier est figé par VOICE-01 et on ne le touche
 * pas — on l'utilise. Un montant est d'ailleurs plus simple qu'un numéro :
 * pas de fusion de dix chiffres, on prend ce que la phrase donne.
 *
 * LA RÈGLE DE LECTURE VIT AILLEURS (`services/montantDit`), pure et testée.
 * Cet écran ne décide pas ce qu'est un prix ; il écoute et le lui donne.
 *
 * SI LE MICRO NE VEUT PAS, ON NE BLOQUE RIEN. Permission refusée, modèle
 * absent, matériel muet : le clavier est toujours là, et on le dit.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader } from 'lucide-react';
import { startLiveDictation } from '../../voice-offline/offlineStt';
import { stopAllVoice } from '../../services/audioManager';
import { montantDit } from '../../services/montantDit';

const ORANGE = '#B74725';
/** Même cible tactile que le reste de la caisse : un doigt, pas un curseur. */
const CIBLE = 44;
/** Au-delà, ce n'est plus un prix qu'on dit : on rend la main au clavier. */
const ECOUTE_MAX_MS = 12000;

interface Props {
  /** Reçoit le montant dès qu'il est lisible — en direct, elle voit monter. */
  onMontant: (montant: number) => void;
  /** Vrai pour ouvrir le micro de lui-même dès l'arrivée sur l'écran du prix. */
  ouvrirToutSeul?: boolean;
  /** Dit avant d'écouter. Rien n'est écouté tant que Tantie parle. */
  question?: string;
  dire?: (texte: string) => void;
}

export function BoutonDirePrix({ onMontant, ouvrirToutSeul, question, dire }: Props) {
  const [ecoute, setEcoute] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const arretRef = useRef<null | (() => Promise<void>)>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demarreRef = useRef(false);

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
    // VERROU PAROLE / ÉCOUTE : si Tantie parle encore, le micro l'entend elle
    // et transcrit sa propre voix. On coupe tout avant d'ouvrir l'oreille.
    try { stopAllVoice(); } catch { /* ignore */ }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxRef.current = flux;
      setEcoute(true);
      const handle = await startLiveDictation(flux, (texte, estFinal) => {
        const m = montantDit(texte || '');
        // EN DIRECT : elle voit le chiffre monter pendant qu'elle parle, donc
        // elle sait qu'on l'entend. `null` ne remplit rien — on n'efface pas
        // ce qu'elle a déjà donné parce qu'un lot de son n'a rien rendu.
        if (m !== null) onMontant(m);
        if (estFinal && m !== null) void fermer();
      });
      arretRef.current = handle.stop;
      // Filet : une écoute qui ne se referme jamais retient le micro et vide
      // la batterie. Le clavier reprend la main.
      minuteurRef.current = setTimeout(() => { void fermer(); }, ECOUTE_MAX_MS);
    } catch {
      // Permission refusée, modèle absent, matériel muet : on ne bloque rien.
      setIndisponible(true);
      setEcoute(false);
    }
  };

  useEffect(() => {
    if (!ouvrirToutSeul || demarreRef.current) return;
    demarreRef.current = true;
    // Tantie pose la question, PUIS on écoute. L'inverse lui ferait entendre
    // sa propre question et transcrire n'importe quoi.
    if (question && dire) dire(question);
    const t = setTimeout(() => { void ecouter(); }, question ? 1400 : 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule ouverture par écran
  }, []);

  useEffect(() => () => { void fermer(); }, []);

  if (indisponible) {
    return (
      <p role="status" style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre-4)', margin: 0, textAlign: 'center' }}>
        Le micro ne répond pas. Tape le prix.
      </p>
    );
  }

  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => void ecouter()}
      aria-label={ecoute ? 'Je t\'écoute, dis ton prix' : 'Dire le prix'}
      style={{ width: '100%', minHeight: CIBLE + 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: ecoute ? ORANGE : 'white', color: ecoute ? 'white' : ORANGE,
        boxShadow: ecoute ? 'none' : `inset 0 0 0 2px ${ORANGE}` }}>
      {ecoute ? <Loader size={22} /> : <Mic size={22} />}
      <span style={{ fontSize: 16, fontWeight: 800 }}>
        {ecoute ? 'Je t\'écoute…' : 'Dire le prix'}
      </span>
    </motion.button>
  );
}
