/**
 * JÙLABA — Onboarding « Tata se présente » (design v0.3, validé 12/08/2026)
 *
 * Ce n'est pas un tutoriel : c'est un ACCUEIL. UN SEUL écran — Tata se présente
 * et rassure — avant l'identification (Numéro → Code). Le parcours d'entrée est
 * : Bienvenue → Tata → Numéro → Code (quatre écrans avant l'accueil).
 *
 * Changements v0.3 par rapport à la version précédente :
 *  • SUPPRESSION du choix du mode d'accès (« comment veux-tu travailler ? ») —
 *    l'app s'adapte seule (accessMode 'auto'), plus d'écran abstrait.
 *  • SUPPRESSION de l'étape « Ma voix » / installation du moteur : la voix est
 *    détectée automatiquement, le message n'apparaît qu'en cas de besoin réel.
 *  • SUPPRESSION de l'écran « Touche et parle » (démonstration vocale) : la voix
 *    est un CONCEPT non validé qui appartient à la vente, pas à l'entrée.
 *
 * Principes conservés :
 *  • Voix d'abord : Tata LIT l'écran toute seule (auto-narration).
 *  • Interruption : un tap n'importe où arrête Tata et entre dans l'app.
 *  • Le haut-parleur (réécouter) est DISTINCT de l'action (continuer) et ne
 *    couvre jamais le visage de Tata.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

import { accessModeChoisi, getEffectiveMode, type EffectiveMode } from '../../utils/accessMode';
import tataAccueil from "../../../assets/redesign/tata-accueil.webp";
import bandeauMarche from "../../../assets/redesign/bandeau-marche.webp";
import { stopSpeaking } from '../../services/elevenlabs';
import { direIntro, stopIntro } from '../../services/onboardingVoix';
import { useAudioUnlockFallback } from '../../hooks/useAudioUnlockFallback';

interface OnboardingSlidesProps {
  onComplete?: () => void;
}

export function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const doneRef = useRef(false); // évite d'entrer deux fois dans l'app

  // Niveau de voix : tant que le mode n'est pas explicitement choisi (Paramètres),
  // on accompagne à fond → « voix ». Le choix du mode n'existe plus à l'entrée.
  const niveauVoix = useCallback(
    (): EffectiveMode => (accessModeChoisi() ? getEffectiveMode() : 'voix'),
    [],
  );

  const stopLocal = useCallback(() => {
    stopIntro();
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // Auto-narration : Tata se présente toute seule (« Moi, c'est Tata. Je vais
  // t'aider. »). CORRECTIF (silence constaté en recette terrain) : on ne peut
  // PAS supposer que l'audio est déjà débloqué par le geste sur l'écran
  // d'accueil — cet écran-ci est atteint dans la MÊME navigation SPA que
  // Welcome, donc le geste précédent (tap « Commencer ») aurait dû suffire en
  // théorie, mais le silence total observé montre que ce n'est pas fiable sur
  // l'appareil testé. Même filet de rattrapage que Welcome.tsx : on tente à
  // l'ouverture ET on rejoue au 1er contact si rien n'a encore joué.
  const direTata = useCallback(() => {
    if (niveauVoix() === 'lecture') return; // lectrice : silence
    setIsSpeaking(true);
    direIntro('histoire1').finally(() => setIsSpeaking(false));
  }, [niveauVoix]);

  useEffect(() => {
    const t = setTimeout(direTata, 450);
    return () => clearTimeout(t);
  }, [direTata]);

  useAudioUnlockFallback(direTata, niveauVoix() !== 'lecture');

  useEffect(() => {
    const img = new Image(); img.src = tataAccueil;
    const fond = new Image(); fond.src = bandeauMarche;
    return () => { stopIntro(); stopSpeaking(); };
  }, []);

  // Haut-parleur : RÉÉCOUTER la présentation (distinct de l'action continuer).
  const handleListen = useCallback(() => {
    if (isSpeaking) { stopLocal(); return; }
    setIsSpeaking(true);
    direIntro('histoire1').finally(() => setIsSpeaking(false));
  }, [isSpeaking, stopLocal]);

  // FIN : petite récompense parlée, puis on entre dans l'app (filet de sécurité
  // si l'audio ne se termine pas).
  const terminer = useCallback(() => {
    if (doneRef.current) return;
    const go = () => { if (!doneRef.current) { doneRef.current = true; onComplete?.(); } };
    if (niveauVoix() === 'lecture') { stopLocal(); go(); return; }
    setIsSpeaking(true);
    direIntro('bravo').finally(go);
    setTimeout(go, 6000);
  }, [niveauVoix, onComplete, stopLocal]);

  // Un tap n'importe où continue ; les commandes précises coupent la propagation.
  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-pointer onboarding-tata-redesign"
      onClick={terminer}
    >
      <img src={bandeauMarche} alt="" className="onboarding-market-backdrop" aria-hidden="true" />
      <div className="onboarding-market-veil" aria-hidden="true" />
      <motion.img
        src={tataAccueil}
        alt="Tantie Nanti Lou"
        className="onboarding-tata-figure"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />

      {/* Ondes discrètes autour de Tata (elle parle) — derrière, jamais sur les
          contrôles ; pointer-events none pour ne pas gêner le tap. */}
      <div className="absolute" style={{ top: '36%', left: '67%', width: 210, height: 210, transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-white/50"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* Contenu EN BAS : titre + rangée [haut-parleur] [flèche continuer].
          Aucun contrôle sur le visage de Tata. */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 px-3 z-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md flex flex-col items-center onboarding-tata-sheet"
        >
          <span className="onboarding-tata-pill">Ton guide dans le marché</span>
          <p className="font-extrabold onboarding-tata-title">
            Moi, c'est Tata.
          </p>
          <p className="onboarding-tata-copy">
            Tu peux toucher, parler et écouter. Je reste avec toi.
          </p>

          <div className="flex items-center justify-center gap-4">
            {/* Haut-parleur : réécouter (distinct de l'action) */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); handleListen(); }}
              whileTap={{ scale: 0.9 }}
              aria-label={isSpeaking ? 'Arrêter Tantie Nanti Lou' : 'Réécouter Tantie Nanti Lou'}
              className="grid place-items-center rounded-full bg-white shadow-lg onboarding-listen"
              style={{ width: 56, height: 56 }}
            >
              {isSpeaking ? <VolumeX style={{ width: 26, height: 26 }} /> : <Volume2 style={{ width: 26, height: 26 }} />}
            </motion.button>

            {/* Action : continuer (flèche = « avancer », compréhensible sans lire) */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); terminer(); }}
              whileTap={{ scale: 0.92 }}
              aria-label="Continuer"
              className="grid place-items-center rounded-full shadow-2xl onboarding-continue"
              style={{ width: 68, height: 68 }}
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
