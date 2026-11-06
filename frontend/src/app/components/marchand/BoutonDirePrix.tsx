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
 * absent, matériel muet : le clavier est toujours là, et ON LE DIT (VOIX-06,
 * STK-22 — la panne se dit depuis la même clé qu'elle affiche ; avant, elle
 * n'était qu'un texte muet qu'une non-lectrice n'entendait jamais).
 *
 * LE WEB ÉCOUTE AUSSI (VOIX-06, 26/10/2026). Le composant ne connaissait que
 * `startLiveDictation` — Sherpa, réservé à l'APK : sur navigateur le modèle
 * hors-ligne n'existe pas, le micro du prix mourait au premier essai, et le
 * clavier redevenait la seule voie. Le chemin dictée web (décision du
 * 19/10) — que BoutonDireProduit et BoutonDireNom empruntent déjà — est
 * branché ici, avec la MÊME lecture `montantDit` : un seul sens pour un
 * prix, partout.
 *
 * ET LE SILENCE NE SE REFERME PLUS MUET : micro refermé sans prix lu, on
 * relance à la voix (STOCK_065). Les étapes nom et produit le faisaient
 * déjà (STOCK_046) — le prix ne restait le seul écran où on ne lui disait
 * pas qu'on ne l'avait pas comprise.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader } from 'lucide-react';
import { demarrerCaptureVocale } from '../../voice-offline/captureVocale';
import { stopAllVoice } from '../../services/audioManager';
import { montantDit } from '../../services/montantDit';
import { CONTRAINTES_MICRO_DICTEE } from '../../services/contraintesMicro';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';

/** Une seule clé pour un refus : l'écran l'affiche et la voix le dit. */
const DIRE_CLE = (id: string, dire?: (t: string) => void) => {
  void rendreMessage(resoudreMessage(id), (t) => dire?.(t));
};

const ORANGE = 'var(--commerce-action)';
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
  /** VOX-05a — si cette fonction rend une promesse, on ATTEND la fin réelle de
   *  la parole. Sinon on retombe sur le délai fixe, pour les appelants qui ne
   *  savent pas dire quand ils ont fini. */
  dire?: (texte: string) => void | Promise<void>;
  /** OUVERTURE DE CAISSE (06/11) — LA PHRASE NOMME LE GESTE DE CET ÉCRAN
   *  (STK-22) : un fond de caisse n'est pas « le prix ». Défauts inchangés
   *  (STOCK_065/063/064) — les écrans existants ne voient rien bouger. */
  cleSilence?: string;
  cleMicro?: string;
  cleReseau?: string;
}

export function BoutonDirePrix({ onMontant, ouvrirToutSeul, question, dire, cleSilence = 'STOCK_065', cleMicro = 'STOCK_063', cleReseau = 'STOCK_064' }: Props) {
  const [ecoute, setEcoute] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const arretRef = useRef<null | (() => Promise<void>)>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demarreRef = useRef(false);
  /** VOX-06 — a-t-elle été comprise ? Le silence du minuteur ne se referme
   *  muet que si NON ; sur le chemin web, c'est `conclure` qui relance. */
  const aEntenduRef = useRef(false);
  /** Le chemin actif : seul le chemin sherpa laisse le minuteur relancer
   *  (sur le chemin web, `conclure` livre le texte final et relance lui-même
   *  — relancer ici aussi ferait deux fois la phrase). */
  const cheminRef = useRef<null | 'web' | 'sherpa'>(null);

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
    aEntenduRef.current = false;
    cheminRef.current = null;
    // VERROU PAROLE / ÉCOUTE : si Tantie parle encore, le micro l'entend elle
    // et transcrit sa propre voix. On coupe tout avant d'ouvrir l'oreille.
    try { stopAllVoice(); } catch { /* ignore */ }
    try {
      // MIC-01 — anti-écho : le micro s'ouvre JUSTE APRÈS la question dite par
      // Tantie. Nu (`{ audio: true }`), il reprenait le haut-parleur et le
      // moteur transcrivait l'application elle-même. Le réglage vit dans
      // `services/contraintesMicro` — une seule liste pour tous les micros.
      const flux = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      fluxRef.current = flux;
      setEcoute(true);
      const capture = await demarrerCaptureVocale(flux, {
        interim: (texte) => {
          const m = montantDit(texte || '');
          // EN DIRECT : elle voit le chiffre monter pendant qu'elle parle.
          if (m !== null) { aEntenduRef.current = true; onMontant(m); }
        },
        conclure: (texte, moteur) => {
          const m = montantDit(texte || '');
          if (moteur === 'web') {
            void fermer();
            if (m !== null) { aEntenduRef.current = true; onMontant(m); return; }
            DIRE_CLE(cleSilence, dire);
            return;
          }
          // Sherpa finalise le tampon pendant l'arrêt. Un texte final
          // illisible suit le même filet de silence qu'avant.
          if (m !== null) { aEntenduRef.current = true; onMontant(m); void fermer(); }
        },
        erreurWeb: (code) => {
          void fermer();
          setIndisponible(true);
          setEcoute(false);
          DIRE_CLE(code === 'micro' ? cleMicro : cleReseau, dire);
        },
      });
      cheminRef.current = capture.moteur;
      arretRef.current = capture.conclure;
      // Filet : une écoute qui ne se referme jamais retient le micro et vide
      // la batterie. Le clavier reprend la main.
      minuteurRef.current = setTimeout(() => {
        void fermer();
        // VOX-06 — le silence ne se referme plus muet : elle sait qu'on ne
        // l'a pas comprise, et que le clavier reste. Le chemin web relance
        // lui-même via `conclure` ; relancer ici aussi ferait deux fois la
        // phrase.
        if (cheminRef.current === 'sherpa' && !aEntenduRef.current) DIRE_CLE(cleSilence, dire);
      }, ECOUTE_MAX_MS);
    } catch {
      // STK-22 — LA PANNE SE DIT, depuis la même clé qu'elle affiche
      // (STOCK_063). Le clavier reste le repli, et la phrase le nomme.
      DIRE_CLE(cleMicro, dire);
      setIndisponible(true);
      setEcoute(false);
    }
  };

  useEffect(() => {
    if (!ouvrirToutSeul || demarreRef.current) return;
    demarreRef.current = true;
    // Tantie pose la question, PUIS on écoute. L'inverse lui ferait entendre
    // sa propre question et transcrire n'importe quoi.
    //
    // VOX-05a — ON ATTEND LA FIN RÉELLE, PLUS UN DÉLAI FIXE.
    //
    // Mesuré sur l'APK `ea7b8e2`, journal du 03/10/2026 :
    //     01:59:47.531  TTS « Piment. Quel est ton prix ? »
    //     01:59:48.934  TTS_COUPEE depuisMs:1393      ← la question est coupée
    //     01:59:49.221  ECOUTE_DEBUT
    // Les 1 400 ms étaient une DEVINETTE sur la durée d'une phrase qu'on ne
    // connaît qu'à l'exécution : « Piment. Quel est ton prix ? » passait de
    // justesse, un nom de produit plus long serait tronqué net.
    //
    // Or la fin réelle est connue : `AppContext.speak` fait
    // `await audioManager.speak(...)`. Il suffisait de l'attendre.
    //
    // LE DÉLAI RESTE EN REPLI pour un appelant dont le `dire` ne rend rien —
    // `SaisieGuidee` et `AjoutProduitGuide` passent le leur sans promesse, et
    // leur comportement ne change pas d'une milliseconde.
    let annule = false;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    const ouvrir = () => { if (!annule) void ecouter(); };

    if (question && dire) {
      const parle = dire(question) as unknown;
      if (parle && typeof (parle as Promise<void>).then === 'function') {
        // Une marge courte après la dernière syllabe : le haut-parleur finit
        // de rendre, et le micro n'avale pas la queue de la voix de Tantie.
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
        {resoudreMessage('STOCK_063').texte}
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
