/**
 * DIRE LE NOM DU PRODUIT, DANS LE PARCOURS GUIDÉ — audit 20/10 §5.3.
 *
 * LE DÉFAUT QU'ON FERME. L'étape « nom » d'`AjoutProduitGuide` n'acceptait
 * que le TACTILE. La voix ne nommait un produit que depuis DEUX AUTRES
 * endroits : la caisse (« J'ajoute "X" à ta boutique ? ») et le gros bouton
 * « Ajouter en parlant » de l'écran du stock (STK-05), qui préremplit le
 * parcours AVANT qu'il s'ouvre. Mais une fois DANS le parcours — venue par le
 * tactile, ou après une dictée manquée — il n'y avait plus aucun micro : une
 * non-lectrice devait taper un nom, précisément ce qu'elle ne sait pas faire.
 *
 * CE COMPOSANT EST LE BLOC DICTÉE DE CETTE ÉTAPE. Il ne décide rien : il
 * écoute, et donne à l'écran ce qu'il a compris. L'unité et le prix éventuels
 * dits dans la même phrase sont conservés (elle les a donnés — les jeter
 * serait le défaut même que STK-25 a fermé) ; Rien n'avance tout seul, le
 * parcours reste un enchaînement de ses gestes.
 *
 * LA CORRECTION D'UNE NON-LECTRICE PASSE PAR L'OREILLE. Le nom transcrit est
 * relu à voix haute (STOCK_059, dit par l'écran) : elle entend ce qui a été
 * écrit. Si c'est faux, elle appuie encore et REDIT — le micro reste là — ou
 * corrige mot à mot au clavier (le champ reste éditable). Redire = remplacer,
 * jamais mélanger : une dictée n'ajoute pas des mots à une dictée.
 *
 * ON NE RÉÉCRIT PAS LA DICTÉE. Les mêmes primitives que `BoutonDireProduit`
 * (STK-05) et `BoutonDirePrix` (VOX-03) : `startLiveDictation` (Sherpa, APK),
 * `demarrerRecoWeb` (reconnaissance navigateur, décision du 19/10), et LA
 * MÊME lecture (`produitDit`, puis `nomLibreDicte` — STK-25) : une seule
 * façon de reconnaître un produit dans l'application.
 *
 * LES REFUS SE DISENT DEPUIS LE CATALOGUE (STOCK_060/061, STOCK_046). Le
 * texte affiché et la voix sortent de la même clé — jamais deux sources.
 *
 * SI LE MICRO NE VEUT PAS, ON NE BLOQUE RIEN : le champ reste là, et on le
 * dit — en nommant le geste DE CET ÉCRAN (« Tape son nom »), pas celui d'un
 * autre.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader } from 'lucide-react';
import { startLiveDictation } from '../../voice-offline/offlineStt';
import { demarrerRecoWeb, recoWebDispo } from '../../voice-offline/webReco';
import { stopAllVoice } from '../../services/audioManager';
import { nomLibreDicte, produitDit, type EcouteProduit } from '../../services/produitDit';
import { CONTRAINTES_MICRO_DICTEE } from '../../services/contraintesMicro';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';

const ORANGE = 'var(--commerce-action)';
/** Même cible tactile que le reste de la caisse : un doigt, pas un curseur. */
const CIBLE = 44;
/** Au-delà, ce n'est plus un nom qu'on dit : on rend la main au champ. */
const ECOUTE_MAX_MS = 12000;

interface Props {
  /** Son étal, pour reprendre SON orthographe au lieu d'en créer une seconde. */
  sesProduits: readonly { nom: string }[];
  /** Reçoit ce qu'elle a donné, dès que c'est lisible. Rien d'inventé. */
  onNom: (lu: EcouteProduit) => void;
  /** Fait parler l'écran (le guidage vocal de la caisse). */
  dire?: (texte: string) => void;
}

/** Une seule clé pour un refus : l'écran l'affiche et la voix le dit. */
const DIRE_CLE = (id: string, dire?: (t: string) => void) => {
  void rendreMessage(resoudreMessage(id), (t) => dire?.(t));
};

export function BoutonDireNom({ sesProduits, onNom, dire }: Props) {
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
    // VERROU PAROLE / ÉCOUTE : si Tantie parle encore (STOCK_047, la relecture
    // d'une dictée précédente), le micro l'entendrait elle. On coupe tout
    // avant d'ouvrir l'oreille.
    try { stopAllVoice(); } catch { /* ignore */ }
    try {
      // MIC-01 — anti-écho : même réglage que tous les micros de la caisse
      // (`services/contraintesMicro`, une seule liste).
      const flux = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      fluxRef.current = flux;
      setEcoute(true);
      // Web : Sherpa est réservé à l'APK ; le même geste utilise la
      // reconnaissance du navigateur quand elle existe (décision du 19/10),
      // puis repasse au chemin Sherpa natif sur Capacitor.
      if (recoWebDispo()) {
        const web = demarrerRecoWeb({
          interim: () => {},
          conclure: (texte) => {
            const lu = produitDit(texte || '', sesProduits) ?? nomLibreDicte(texte || '');
            void fermer();
            if (!lu) { DIRE_CLE('STOCK_046', dire); return; }
            onNom(lu);
          },
          erreur: (code) => {
            void fermer();
            setIndisponible(true);
            setEcoute(false);
            DIRE_CLE(code === 'micro' ? 'STOCK_060' : 'STOCK_061', dire);
          },
        });
        if (web) {
          arretRef.current = web.conclure;
          minuteurRef.current = setTimeout(() => { void fermer(); }, ECOUTE_MAX_MS);
          return;
        }
      }
      const handle = await startLiveDictation(flux, (texte, estFinal) => {
        if (!estFinal) return;
        // STK-25 AUX DEUX OREILLES — le lexique, puis SON étal, puis le nom
        // libre. « Ajoute dix kassos » ne peut pas être jeté par le seul
        // chemin qui l'a pourtant transcrit.
        const lu = produitDit(texte || '', sesProduits) ?? nomLibreDicte(texte || '');
        void fermer();
        if (lu) { onNom(lu); return; }
        DIRE_CLE('STOCK_046', dire);
      });
      arretRef.current = handle.stop;
      // Filet : une écoute qui ne se referme jamais retient le micro et vide
      // la batterie. Le champ reprend la main.
      minuteurRef.current = setTimeout(() => { void fermer(); }, ECOUTE_MAX_MS);
    } catch {
      // STK-22 — LA PANNE SE DIT, depuis la même clé qu'elle affiche
      // (STOCK_060). Le champ texte reste le repli, et la phrase le nomme.
      DIRE_CLE('STOCK_060', dire);
      setIndisponible(true);
      setEcoute(false);
    }
  };

  useEffect(() => () => { void fermer(); }, []);

  if (indisponible) {
    return (
      <p role="status" style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre-4)', margin: 0, textAlign: 'center' }}>
        {resoudreMessage('STOCK_060').texte}
      </p>
    );
  }

  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => void ecouter()}
      aria-label={ecoute ? "Je t'écoute, dis son nom" : 'Dis son nom'}
      style={{ width: '100%', minHeight: CIBLE + 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: ecoute ? ORANGE : 'white', color: ecoute ? 'white' : ORANGE,
        boxShadow: ecoute ? 'none' : `inset 0 0 0 2px ${ORANGE}` }}>
      {ecoute ? <Loader size={22} /> : <Mic size={22} />}
      <span style={{ fontSize: 16, fontWeight: 800 }}>
        {ecoute ? "Je t'écoute…" : 'Dis son nom'}
      </span>
    </motion.button>
  );
}
