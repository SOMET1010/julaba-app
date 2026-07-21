/**
 * JULABA -- Onboarding (4 ecrans de presentation)
 * Design : image de fond plein ecran + carte blanche flottante
 * Integration TTS ElevenLabs pour le bouton "Ecouter"
 * Transitions fluides et animations dynamiques
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  ChevronRight,
  ChevronLeft,
  VolumeX,
} from 'lucide-react';
import { Button } from '../ui/button';

// Images de fond des 4 ecrans
import bgBienvenue from "../../../assets/images/bg-marketplace.png";
import bgMarcketplace from "../../../assets/images/bg-marche-vente.png";
import bgTataLou from "../../../assets/images/bg-tantie.png";
import bgCnpsCmu from "../../../assets/images/bg-market.png";

import { stopSpeaking } from '../../services/elevenlabs';

interface OnboardingSlidesProps {
  onComplete?: () => void;
}

const slides = [
  {
    id: 'bienvenue',
    title: 'BIENVENUE',
    description: "Julaba t'aide a bien gerer ton argent au quotidien.",
    bgImage: bgCnpsCmu,
    accent: '#C46210',
    dotActive: '#C46210',
  },
  {
    id: 'commerce',
    title: 'ACHETEZ ET VENDEZ',
    description: 'Tu vends, tu vois ce que tu gagnes. Simple et rapide.',
    bgImage: bgMarcketplace,
    accent: '#16a34a',
    dotActive: '#16a34a',
  },
  {
    id: 'assistante',
    title: 'VOTRE ASSISTANTE VOCALE',
    description: "Tata Nanti Lou t'accompagne partout, a chaque etape.",
    bgImage: bgTataLou,
    accent: '#7c3aed',
    dotActive: '#7c3aed',
  },
  {
    id: 'cotisations',
    title: 'COTISATIONS SOCIALES',
    description: 'Gere tes cotisations CNPS et CMU facilement ici.',
    bgImage: bgBienvenue,
    accent: '#2563eb',
    dotActive: '#2563eb',
  },
];

/* -- Composant principal ------------------------------------------------- */
export function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  // Coupe toute lecture en cours (voix du navigateur + TTS serveur).
  const stopLocal = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const handleNext = () => {
    stopLocal();
    if (isLastSlide) {
      onComplete?.();
    } else {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    stopLocal();
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleDot = (index: number) => {
    if (index === currentSlide) return;
    stopLocal();
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  /* -- Ecouter avec Tata Nanti Lou : LIT vraiment la diapo à voix haute ------------
   * Avant, ce bouton ne faisait qu'ARRÊTER la voix (il ne lisait jamais) : le
   * tutoriel était donc muet pour une non-lectrice. On utilise la voix intégrée
   * du navigateur (fonctionne avant connexion, sans réseau). */
  const handleListen = useCallback(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return;
    if (isSpeaking) { stopLocal(); return; }
    const texte = `${slide.title}. ${slide.description}`;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      u.rate = 0.95;
      u.pitch = 1.05;
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      synth.speak(u);
    } catch {
      setIsSpeaking(false);
    }
  }, [isSpeaking, slide, stopLocal]);

  /* -- Variants d'animation ----------------------------------------------- */
  const bgVariants = {
    enter: { opacity: 0, scale: 1.1 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  const cardVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.85,
      rotateY: dir > 0 ? 15 : -15,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.85,
      rotateY: dir > 0 ? -15 : 15,
    }),
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* -- Image de fond plein ecran avec transition -------------------- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentSlide}`}
          variants={bgVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          <img
            src={slide.bgImage}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Fond noir leger uniforme */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Overlay gradient sombre en bas pour lisibilite */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* -- Bouton Passer en haut a droite -------------------------------- */}
      <motion.div
        className="absolute top-6 right-6 z-30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <button
          onClick={() => {
            if (isSpeaking) stopSpeaking();
            onComplete?.();
          }}
          className="px-5 py-2 rounded-full border-2 border-white/60 text-white/90 text-sm font-semibold backdrop-blur-sm bg-white/10 transition-all duration-300 hover:bg-white/20 hover:border-white active:scale-95"
        >
          Passer
        </button>
      </motion.div>

      {/* -- Carte blanche flottante --------------------------------------- */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 px-4 z-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`card-${currentSlide}`}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
              rotateY: { duration: 0.6 },
            }}
            className="w-full max-w-md"
            style={{ perspective: 1000 }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-white/80 shadow-2xl p-5 pb-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* Titre */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-center text-2xl font-extrabold tracking-wide mb-3"
                style={{ color: slide.accent }}
              >
                {slide.title}
              </motion.h2>

              {/* Barre decorative animee */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                className="mx-auto h-1 w-12 rounded-full mb-4"
                style={{ backgroundColor: slide.accent }}
              />

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="text-center text-gray-600 px-2 leading-relaxed mb-5"
              >
                {slide.description}
              </motion.p>

              {/* Bouton Ecouter */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="flex justify-center"
              >
                <motion.button
                  onClick={handleListen}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300"
                  style={{
                    borderColor: isSpeaking ? '#ef4444' : slide.accent,
                    color: isSpeaking ? '#ef4444' : slide.accent,
                    backgroundColor: isSpeaking ? '#fef2f2' : slide.accent + '10',
                  }}
                >
                  {isSpeaking ? (
                    <div className="flex items-end gap-0.5 h-5">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 rounded-full"
                          style={{ backgroundColor: '#ef4444' }}
                          animate={{ height: ['4px', '16px', '6px', '14px', '4px'] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Volume2 className="w-5 h-5" />
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* -- Navigation (dots + boutons) --------------------------------- */}
        <motion.div
          className="w-full max-w-md mt-6 space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {/* Dots */}
          <div className="flex justify-center gap-3">
            {slides.map((s, index) => (
              <motion.button
                key={s.id}
                onClick={() => handleDot(index)}
                animate={{
                  width: index === currentSlide ? 32 : 10,
                  backgroundColor:
                    index === currentSlide ? slide.dotActive : 'rgba(255,255,255,0.5)',
                }}
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="h-2.5 rounded-full"
              />
            ))}
          </div>

          {/* Boutons Retour / Suivant */}
          <div className="flex gap-3">
            <AnimatePresence>
              {currentSlide > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -30, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 'auto', flex: 1 }}
                  exit={{ opacity: 0, x: -30, width: 0 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden"
                >
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    className="w-full h-14 rounded-3xl border-2 border-white/60 text-white text-base font-semibold backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Retour
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleNext}
                className="w-full h-14 rounded-3xl text-base font-bold text-white shadow-xl border-0 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}dd)`,
                  boxShadow: `0 8px 24px ${slide.accent}40`,
                }}
              >
                {isLastSlide ? (
                  'Commencer'
                ) : (
                  <>
                    Suivant
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="ml-1 inline-flex"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}