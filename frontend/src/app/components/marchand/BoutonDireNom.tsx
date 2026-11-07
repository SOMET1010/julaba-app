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
 * écrit. Si c'est faux, TROIS gestes, une seule règle : REMPLACER.
 *   · elle appuie encore et REDIT — le micro reste là, redire remplace ;
 *   · elle corrige la correction mot à mot À LA VOIX : « non, pas kasso,
 *     gombo » — les mots qui réfutent sortent, le nom réfuté (celui affiché,
 *     `nomActuel`) sort, ce qui reste est SON produit (`nomLibreDicte`) ;
 *   · ou elle corrige mot à mot au clavier (le champ reste éditable).
 * Redire = remplacer, jamais mélanger : une dictée n'ajoute pas des mots à
 * une dictée.
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
import { demarrerCaptureVocale } from '../../voice-offline/captureVocale';
import { stopAllVoice } from '../../services/audioManager';
import { nomLibreDicte, produitDit, type EcouteProduit } from '../../services/produitDit';
import { CONTRAINTES_MICRO_DICTEE } from '../../services/contraintesMicro';
import { resoudreMessage } from '../../i18n/voice/runtime';
import type { MessageVocal } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';
import { EcranEcoutePleinEcran } from './EcranEcoutePleinEcran';
import type { SessionCaptureVocale } from '../../voice-offline/captureVocale';
import { creerSessionAsyncExclusive } from '../../services/sessionAsyncExclusive';
import type { JetonSessionAsync } from '../../services/sessionAsyncExclusive';

const ORANGE = 'var(--commerce-action)';
/** Même cible tactile que le reste de la caisse : un doigt, pas un curseur. */
const CIBLE = 44;
/** Au-delà, ce n'est plus un nom qu'on dit : on rend la main au champ. */
const ECOUTE_MAX_MS = 12000;

interface CaptureNomEnCours {
  jeton: JetonSessionAsync;
  flux: MediaStream | null;
  capture: SessionCaptureVocale | null;
  finale: boolean;
  annulee: boolean;
  fermeture: Promise<void> | null;
  minuteur: ReturnType<typeof setTimeout> | null;
}

interface Props {
  /** Son étal, pour reprendre SON orthographe au lieu d'en créer une seconde. */
  sesProduits: readonly { nom: string }[];
  /** Reçoit ce qu'elle a donné, dès que c'est lisible. Rien d'inventé. */
  onNom: (lu: EcouteProduit) => void;
  /** Fait parler l'écran (le guidage vocal de la caisse). Une promesse = le
   *  micro attend la fin réelle de la parole (VOX-05a). */
  dire?: (texte: string) => void | Promise<void>;
  /** Le nom affiché dans le champ — celui qu'elle peut RÉFUTER à la voix
   *  (« non, pas kasso, gombo »). Sans lui, la correction mot à mot garde
   *  quand même les marqueurs de réfutation hors du nom. */
  nomActuel?: string;
  /** Vrai pour ouvrir le micro de lui-même dès l'arrivée sur l'écran du nom —
   *  le même arbitrage que l'unité, le prix et la quantité (VOX-03). */
  ouvrirToutSeul?: boolean;
  /** Dit avant d'écouter. Rien n'est écouté tant que Tantie parle. */
  question?: string;
  /** Passe par le rendu du catalogue lorsqu'un message résolu est disponible. */
  messageQuestion?: MessageVocal;
  /** Présentation de l'écoute sans texte, réservée aux parcours qui la demandent. */
  afficherEcoutePleinEcran?: boolean;
  /** Ferme aussi le parcours parent quand l'écoute plein écran est quittée. */
  onAnnulerEcoute?: () => void;
}

/** Une seule clé pour un refus : l'écran l'affiche et la voix le dit. */
const DIRE_CLE = (id: string, dire?: (t: string) => void) => {
  void rendreMessage(resoudreMessage(id), (t) => dire?.(t));
};

export function BoutonDireNom({ sesProduits, onNom, dire, nomActuel, ouvrirToutSeul, question, messageQuestion, afficherEcoutePleinEcran, onAnnulerEcoute }: Props) {
  const [ecoute, setEcoute] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const ecouteRef = useRef(false);
  const gardeRef = useRef(creerSessionAsyncExclusive());
  const sessionRef = useRef<CaptureNomEnCours | null>(null);
  const demarreRef = useRef(false);

  const sessionCourante = (run: CaptureNomEnCours) =>
    gardeRef.current.estCourante(run.jeton) && sessionRef.current === run && !run.annulee;

  const libererMicro = (run: CaptureNomEnCours) => {
    if (!sessionCourante(run)) return;
    if (run.minuteur) clearTimeout(run.minuteur);
    run.minuteur = null;
    try { run.flux?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    run.flux = null;
    run.capture = null;
    sessionRef.current = null;
    ecouteRef.current = false;
    gardeRef.current.terminer(run.jeton);
    setEcoute(false);
  };

  const fermer = (run: CaptureNomEnCours): Promise<void> => {
    if (!sessionCourante(run)) return Promise.resolve();
    if (run.fermeture) return run.fermeture;
    run.fermeture = (async () => {
      try { await run.capture?.conclure(); } catch { /* résultat vide */ }
      libererMicro(run);
    })();
    return run.fermeture;
  };

  const annulerCapture = async (run = sessionRef.current) => {
    if (!run || !sessionCourante(run)) return;
    run.annulee = true;
    gardeRef.current.annuler(run.jeton);
    sessionRef.current = null;
    ecouteRef.current = false;
    setEcoute(false);
    if (run.minuteur) clearTimeout(run.minuteur);
    run.minuteur = null;
    try { run.flux?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    run.flux = null;
    const capture = run.capture;
    run.capture = null;
    try { await capture?.annuler(); } catch { /* annulation best effort */ }
  };

  const demarrerCapture = async (run: CaptureNomEnCours) => {
    try {
      // MIC-01 — anti-écho : même réglage que tous les micros de la caisse
      // (`services/contraintesMicro`, une seule liste).
      const flux = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      if (!sessionCourante(run)) {
        flux.getTracks().forEach(t => t.stop());
        return;
      }
      run.flux = flux;
      const capture = await demarrerCaptureVocale(flux, {
        interim: () => {},
        conclure: (texte) => {
          if (!sessionCourante(run) || run.finale) return;
          run.finale = true;
          // STK-25 AUX DEUX OREILLES — le lexique, puis SON étal, puis le nom
          // libre. « Ajoute dix kassos » ne peut pas être jeté par le seul
          // chemin qui l'a pourtant transcrit. Et la correction mot à mot
          // (« non, pas kasso, gombo ») réfute le nom affiché.
          const lu = produitDit(texte || '', sesProduits) ?? nomLibreDicte(texte || '', nomActuel);
          libererMicro(run);
          if (lu) { onNom(lu); return; }
          DIRE_CLE('STOCK_046', dire);
        },
        erreurWeb: (code) => {
          if (!sessionCourante(run)) return;
          void annulerCapture(run);
          setIndisponible(true);
          DIRE_CLE(code === 'micro' ? 'STOCK_060' : 'STOCK_061', dire);
        },
      });
      if (!sessionCourante(run)) {
        try { await capture.annuler(); } catch { /* annulation best effort */ }
        try { flux.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        return;
      }
      run.capture = capture;
      ecouteRef.current = true;
      setEcoute(true);
      // Filet : une écoute qui ne se referme jamais retient le micro et vide
      // la batterie. Le champ reprend la main.
      run.minuteur = setTimeout(() => { void fermer(run).catch(() => {}); }, ECOUTE_MAX_MS);
    } catch {
      if (!sessionCourante(run)) return;
      void annulerCapture(run);
      // STK-22 — LA PANNE SE DIT, depuis la même clé qu'elle affiche
      // (STOCK_060). Le champ texte reste le repli, et la phrase le nomme.
      DIRE_CLE('STOCK_060', dire);
      setIndisponible(true);
    }
  };

  const ecouter = () => {
    const existante = sessionRef.current;
    if (existante) {
      if (ecouteRef.current) void fermer(existante).catch(() => {});
      return;
    }
    const jeton = gardeRef.current.demarrer();
    if (!jeton) return;
    const run: CaptureNomEnCours = {
      jeton, flux: null, capture: null, finale: false,
      annulee: false, fermeture: null, minuteur: null,
    };
    sessionRef.current = run;
    try { stopAllVoice(); } catch { /* ignore */ }
    void demarrerCapture(run);
  };

  useEffect(() => () => { void annulerCapture(); }, []);

  useEffect(() => {
    if (!ouvrirToutSeul || demarreRef.current) return;
    demarreRef.current = true;
    // Tantie pose la question, PUIS on écoute. L'inverse lui ferait entendre
    // sa propre question et transcrire n'importe quoi.
    //
    // VOX-05a — ON ATTEND LA FIN RÉELLE, PLUS UN DÉLAI FIXE (même mécanique
    // que BoutonDirePrix) : le `dire` qui rend une promesse est attendu, sinon
    // le délai de 1 400 ms revient — et avec lui la question coupée en plein
    // mot sur l'APK (TTS_COUPEE depuisMs:1393, journal du 03/10).
    let annule = false;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    const ouvrir = () => { if (!annule) void ecouter(); };

    if ((messageQuestion || question) && dire) {
      const parle = messageQuestion
        ? rendreMessage(messageQuestion, dire)
        : dire(question!) as unknown;
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

  if (afficherEcoutePleinEcran && ecoute) {
    return <EcranEcoutePleinEcran onFermer={() => { void annulerCapture(); onAnnulerEcoute?.(); }} />;
  }

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
