/**
 * JÙLABA — Onboarding « Tata, ta première collègue »
 *
 * Ce n'est pas un tutoriel : c'est un ACCUEIL. Tata ne présente pas une appli,
 * elle raconte le commerce de l'utilisatrice et finit sur une ACTION
 * (« Ouvrons ta boutique »). Chaque phrase donne l'impression qu'une personne
 * bienveillante est à ses côtés — jamais qu'un logiciel donne des consignes.
 *
 * Principes :
 *  • Voix d'abord : Tata LIT chaque écran toute seule (plus besoin d'icône).
 *  • Interruption : dès qu'on touche l'écran, elle s'arrête net → écran suivant.
 *  • Longueur selon le profil : 🟢 lecture = silence · 🟡 mixte = court · 🟠 voix = complet.
 *    (profil pas encore connu la 1re fois → on accompagne À FOND, niveau « voix ».)
 *  • La CNPS/CMU ne sont PAS ici : découverte progressive plus tard (comme le crédit).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  ChevronRight,
  VolumeX,
  Mic,
} from 'lucide-react';
// Picto local (hors-ligne) : la tomate, produit que toute marchande reconnaît.
import imgTomate from "../../../assets/images/produit-tomate.png";
import { InstallerOffline } from '../../voice-offline/InstallerOffline';
import {
  setAccessMode,
  accessModeChoisi,
  getEffectiveMode,
  type AccessMode,
  type EffectiveMode,
} from '../../utils/accessMode';

// Images de fond — Tata (visage), puis le marché (le geste de vente)
import bgTataLou from "../../../assets/images/bg-tantie.png";
import bgVente from "../../../assets/images/bg-marche-vente.png";

import { stopSpeaking } from '../../services/elevenlabs';
import { direIntro, stopIntro } from '../../services/onboardingVoix';

interface OnboardingSlidesProps {
  onComplete?: () => void;
}

/* -- L'HISTOIRE en 4 temps ------------------------------------------------
 * Chaque écran : un texte court affiché + la clé du CLIP de la vraie Tata.
 * On parle de SON commerce, jamais de « l'application ». */
interface Slide {
  id: string;
  title: string;
  description: string;
  bgImage: string;
  accent: string;
  clip: 'histoire1' | 'histoire2' | 'histoire3' | 'histoire4'; // clip de la VRAIE Tata
}

// Maquette d'Alex (11/08/2026) : DEUX écrans, palette chaude unique.
// 1. « Moi, c'est Tata » — le visage + la voix (elle écoute qui lui parle).
// 2. « Touche et parle » — LE geste de l'appli : micro + pictos (3 tomates
//    → 1 500 F → ✓), puis « Commencer ».
const slides: Slide[] = [
  {
    id: 'tata',
    title: "Moi, c'est Tata",
    description: 'Je serai avec toi chaque jour dans ton commerce.',
    bgImage: bgTataLou,
    accent: '#C46210',
    clip: 'histoire1',
  },
  {
    id: 'parle',
    title: 'Touche et parle',
    description: 'Tu me parles, ou tu tapes. C\'est toi qui décides.',
    bgImage: bgVente,
    accent: '#C46210',
    clip: 'histoire3',
  },
];

/* -- Composant principal ------------------------------------------------- */
export function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [modeStep, setModeStep] = useState(false);
  const [voiceStep, setVoiceStep] = useState(false);
  const doneRef = useRef(false); // évite d'entrer deux fois dans l'appli
  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  // Niveau de voix à appliquer. Tant que le mode n'est pas CHOISI (1re fois),
  // on accompagne à fond → « voix ». Ensuite on respecte son profil.
  const niveauVoix = useCallback(
    (): EffectiveMode => (accessModeChoisi() ? getEffectiveMode() : 'voix'),
    [],
  );

  // Coupe toute lecture en cours (clip de Tata + robot de secours).
  const stopLocal = useCallback(() => {
    stopIntro();
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // LIT la diapo avec la VRAIE voix de Tata (auto-narration, sans bascule).
  const lireDiapo = useCallback(() => {
    if (niveauVoix() === 'lecture') return;     // lectrice : on la laisse lire
    setIsSpeaking(true);
    direIntro(slide.clip).finally(() => setIsSpeaking(false));
  }, [slide, niveauVoix]);

  const handleNext = () => {
    stopLocal();
    if (isLastSlide) {
      setModeStep(true); // fin de l'histoire → « comment veux-tu travailler avec moi ? »
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

  // Bouton haut-parleur : RÉÉCOUTER l'écran (vraie voix, même en mode lecture).
  const handleListen = useCallback(() => {
    if (isSpeaking) { stopLocal(); return; }
    setIsSpeaking(true);
    direIntro(slide.clip).finally(() => setIsSpeaking(false));
  }, [isSpeaking, slide, stopLocal]);

  // AUTO-NARRATION : Tata lit chaque écran toute seule (l'audio est déjà
  // débloqué par le geste sur l'écran d'accueil précédent).
  useEffect(() => {
    if (modeStep || voiceStep) return;
    const t = setTimeout(() => lireDiapo(), 450);
    return () => clearTimeout(t);
  }, [currentSlide, modeStep, voiceStep, lireDiapo]);

  // Préchargement des fonds (évite l'écran nu en réseau lent).
  useEffect(() => {
    [bgTataLou, bgVente].forEach((src) => {
      const img = new Image(); img.src = src;
    });
  }, []);

  // Tata lit la question du mode (vraie voix, pour celles qui ne lisent pas).
  const parleModeQuestion = useCallback(() => {
    setIsSpeaking(true);
    direIntro('mode').finally(() => setIsSpeaking(false));
  }, []);
  useEffect(() => { if (modeStep) parleModeQuestion(); }, [modeStep, parleModeQuestion]);

  // Étape voix : Tata rassure (coût, wifi, rien ne presse).
  const parleInstallVoix = useCallback(() => {
    setIsSpeaking(true);
    direIntro('voixInstall').finally(() => setIsSpeaking(false));
  }, []);
  useEffect(() => { if (voiceStep) parleInstallVoix(); }, [voiceStep, parleInstallVoix]);

  // FIN : la RÉCOMPENSE, puis on entre dans l'appli. On laisse la voix finir
  // (sinon l'écran suivant la coupe) grâce à un petit filet de sécurité.
  const terminer = useCallback(() => {
    if (doneRef.current) return;
    const go = () => { if (!doneRef.current) { doneRef.current = true; onComplete?.(); } };
    if (niveauVoix() === 'lecture') { stopLocal(); go(); return; }
    setIsSpeaking(true);
    direIntro('bravo').finally(go);       // vraie voix : « Bravo ! Ouvrons ta boutique. »
    setTimeout(go, 6000);                 // filet si l'audio ne se termine pas
  }, [niveauVoix, onComplete, stopLocal]);

  // Choix du mode → mémorise, puis : lecture → on entre ; mixte/voix → on
  // propose d'installer la voix (elle en a besoin pour écouter/parler).
  const choisirMode = (m: AccessMode) => {
    stopLocal();
    setAccessMode(m);
    setModeStep(false);
    if (m === 'lecture') { terminer(); }
    else { setVoiceStep(true); }
  };

  /* -- Variants d'animation ----------------------------------------------- */
  const bgVariants = {
    enter: { opacity: 0, scale: 1.1 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };
  const cardVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.85, rotateY: dir > 0 ? 15 : -15 }),
    center: { x: 0, opacity: 1, scale: 1, rotateY: 0 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.85, rotateY: dir > 0 ? -15 : 15 }),
  };

  /* -- ÉTAPE : comment veux-tu travailler avec moi ? (mode d'accès) -------- */
  if (modeStep) {
    const choix: { m: AccessMode; emoji: string; couleur: string; titre: string; sous: string; reco?: boolean }[] = [
      { m: 'auto',    emoji: '🔵', couleur: '#2563eb', titre: 'Laisse Julaba choisir', sous: 'Je m\'adapte à ta façon de faire', reco: true },
      { m: 'lecture', emoji: '🟢', couleur: '#16a34a', titre: 'Je sais lire et écrire', sous: 'Je tape vite, clavier direct' },
      { m: 'mixte',   emoji: '🟡', couleur: '#C46210', titre: 'Je lis un peu',          sous: 'Parfois je lis, parfois je parle' },
      { m: 'voix',    emoji: '🟠', couleur: '#DB7A2C', titre: 'Je préfère parler',      sous: 'Tata m\'accompagne, je parle' },
    ];
    return (
      <div className="fixed inset-0 overflow-hidden bg-black">
        <img src={bgTataLou} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-4 z-20">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-white/80 shadow-2xl p-5" style={{ maxHeight: '86vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-center text-xl font-extrabold" style={{ color: '#3d1a08' }}>Comment veux-tu travailler avec moi&nbsp;?</h2>
              <button onClick={() => (isSpeaking ? stopLocal() : parleModeQuestion())} aria-label="Écouter" className="shrink-0 w-9 h-9 rounded-full grid place-items-center" style={{ color: isSpeaking ? '#ef4444' : '#C46210', background: (isSpeaking ? '#ef4444' : '#C46210') + '15' }}>
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
            <div className="mx-auto h-1 w-12 rounded-full mb-4" style={{ backgroundColor: '#C46210' }} />
            <div className="flex flex-col gap-3">
              {choix.map((c) => (
                <motion.button key={c.m} whileTap={{ scale: 0.97 }} onClick={() => choisirMode(c.m)}
                  className="flex items-center gap-3 w-full text-left rounded-2xl p-4 border-2 transition"
                  style={{ borderColor: c.couleur + '55', background: c.couleur + '0d' }}>
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{c.emoji}</span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[17px] font-extrabold" style={{ color: '#2b1608' }}>{c.titre}</span>
                      {c.reco && (
                        <span className="text-[10px] font-extrabold text-white rounded-full px-2 py-0.5" style={{ background: c.couleur }}>RECOMMANDÉ</span>
                      )}
                    </span>
                    <span className="block text-[13px]" style={{ color: '#7a5638' }}>{c.sous}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 shrink-0" style={{ color: c.couleur }} />
                </motion.button>
              ))}
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-4">Il n'y a pas de mauvais choix — tu changeras quand tu veux.</p>
          </div>
        </div>
      </div>
    );
  }

  /* -- ÉTAPE : installer la voix de Tata (consenti, si mixte/voix) --------- */
  if (voiceStep) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-black">
        <img src={bgTataLou} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-4 z-20">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-white/80 shadow-2xl p-5" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 className="text-center text-2xl font-extrabold tracking-wide mb-1" style={{ color: '#C46210' }}>
              MA VOIX
            </h2>
            <div className="mx-auto h-1 w-12 rounded-full mb-3" style={{ backgroundColor: '#C46210' }} />
            <p className="text-center text-gray-600 px-1 leading-relaxed mb-3">
              Pour que je puisse <b>t'écouter</b> et <b>te parler</b> partout — même
              sans réseau. Une seule fois. C'est un gros fichier&nbsp;: fais-le
              tranquillement, quand tu as le <b>wifi</b>. Rien ne presse.
            </p>

            <div className="flex justify-center mb-4">
              <motion.button
                onClick={() => { if (isSpeaking) { stopLocal(); } else { parleInstallVoix(); } }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center justify-center w-12 h-12 rounded-full border-2"
                style={{ borderColor: isSpeaking ? '#ef4444' : '#C46210', color: isSpeaking ? '#ef4444' : '#C46210', backgroundColor: (isSpeaking ? '#ef4444' : '#C46210') + '10' }}
                aria-label="Écouter Tata"
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </motion.button>
            </div>

            <InstallerOffline onReady={() => { stopLocal(); terminer(); }} />

            <button
              onClick={() => { stopLocal(); terminer(); }}
              className="w-full mt-3 text-sm text-gray-500 font-semibold py-2"
            >
              Plus tard — ouvrons ma boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -- ONDES : anneaux qui rayonnent autour d'un bouton rond (maquette). */
  const Ondes = ({ taille }: { taille: number }) => (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-2 border-white/70"
          style={{ width: taille, height: taille, left: '50%', top: '50%', translateX: '-50%', translateY: '-50%', pointerEvents: 'none' }}
          animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
        />
      ))}
    </>
  );

  /* -- ÉCRANS DE L'HISTOIRE ------------------------------------------------
   * INTERRUPTION : un tap N'IMPORTE OÙ arrête Tata et passe à la suite. Les
   * commandes précises (retour, passer, points, haut-parleur) coupent la
   * propagation pour garder leur rôle propre. */
  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-pointer"
      onClick={handleNext}
      style={{ background: '#C46210' }}
    >
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
          <img src={slide.bgImage} alt="" className="w-full h-full object-cover" />
          {/* Voile CHAUD (maquette) : photo lisible en haut, orange franc en bas */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(196,98,16,0.20) 0%, rgba(196,98,16,0.40) 45%, rgba(196,97,15,0.90) 82%, #C4610F 100%)' }} />
        </motion.div>
      </AnimatePresence>

      {/* Écran 2 : haut-parleur en haut à droite (maquette). Écran 1 : Passer. */}
      <motion.div
        className="absolute top-6 right-6 z-30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {slide.id === 'tata' ? (
          <button
            onClick={(e) => { e.stopPropagation(); stopLocal(); setModeStep(true); }}
            className="px-5 py-2 rounded-full border-2 border-white/60 text-white/90 text-sm font-semibold backdrop-blur-sm bg-white/10 transition-all duration-300 hover:bg-white/20 active:scale-95"
          >
            Passer
          </button>
        ) : (
          <motion.button
            onClick={(e) => { e.stopPropagation(); handleListen(); }}
            whileTap={{ scale: 0.9 }}
            aria-label={isSpeaking ? 'Arrêter Tata' : 'Écouter Tata'}
            className="grid place-items-center w-11 h-11 rounded-full bg-white shadow-lg"
            style={{ color: isSpeaking ? '#ef4444' : '#C46210' }}
          >
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </motion.button>
        )}
      </motion.div>

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-6 z-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`corps-${currentSlide}`}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-md flex flex-col items-center"
          >
            {slide.id === 'tata' ? (
              <>
                {/* ÉCRAN 1 — le haut-parleur rayonne : Tata PARLE. */}
                <div className="relative mb-5" style={{ width: 96, height: 96 }}>
                  <Ondes taille={96} />
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); handleListen(); }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={isSpeaking ? 'Arrêter Tata' : 'Écouter Tata'}
                    className="relative grid place-items-center w-24 h-24 rounded-full bg-white shadow-2xl"
                    style={{ color: isSpeaking ? '#ef4444' : '#C46210' }}
                  >
                    {isSpeaking ? <VolumeX style={{ width: 40, height: 40 }} /> : <Volume2 style={{ width: 40, height: 40 }} />}
                  </motion.button>
                </div>
                <p className="text-white font-extrabold mb-6" style={{ fontSize: 24, textShadow: '0 1px 10px rgba(0,0,0,0.3)' }}>
                  {slide.title}
                </p>
              </>
            ) : (
              <>
                {/* ÉCRAN 2 — LE geste : touche le micro et parle. */}
                <p className="text-white font-bold mb-4 px-4 py-1.5 rounded-full"
                  style={{ fontSize: 17, background: 'rgba(255,255,255,0.18)', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
                  {slide.title}
                </p>
                <div className="relative mb-5" style={{ width: 116, height: 116 }}>
                  <Ondes taille={116} />
                  <div
                    className="relative grid place-items-center rounded-full shadow-2xl"
                    style={{ width: 116, height: 116, background: 'linear-gradient(135deg, #F08A24, #C46210)', border: '4px solid rgba(255,255,255,0.9)' }}
                  >
                    <Mic className="text-white" style={{ width: 52, height: 52 }} />
                  </div>
                  {/* La main qui montre le geste */}
                  <motion.span
                    className="absolute"
                    style={{ right: -26, bottom: -8, fontSize: 40, pointerEvents: 'none' }}
                    animate={{ x: [0, -8, 0], y: [0, -6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    👆🏾
                  </motion.span>
                </div>
                {/* L'histoire en PICTOS : je parle → 3 tomates → 1 500 F → c'est noté */}
                <div className="flex items-center justify-center gap-2 bg-white/95 rounded-2xl shadow-xl px-4 py-2.5 mb-5">
                  <Mic style={{ width: 22, height: 22, color: '#C46210' }} />
                  <span className="relative inline-flex items-center">
                    <img src={imgTomate} alt="tomates" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                    <span className="font-extrabold" style={{ color: '#2b1608', fontSize: 13, marginLeft: 2 }}>×3</span>
                  </span>
                  <span style={{ color: '#C46210', fontWeight: 800 }}>→</span>
                  <span className="font-extrabold rounded-full px-2.5 py-1" style={{ background: '#C4621018', color: '#C46210', fontSize: 14 }}>
                    1 500 F
                  </span>
                  <span className="grid place-items-center rounded-full" style={{ width: 26, height: 26, background: '#16a34a' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                </div>
              </>
            )}

            {/* Bouton principal — pilule blanche (maquette) */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              whileTap={{ scale: 0.96 }}
              className="w-full max-w-xs h-14 rounded-full bg-white shadow-2xl flex items-center justify-center gap-3 font-extrabold"
              style={{ color: '#C46210', fontSize: 18 }}
            >
              <span className="grid place-items-center rounded-full" style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #F08A24, #C46210)' }}>
                {isLastSlide
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
                  : <ChevronRight className="text-white" style={{ width: 20, height: 20 }} />}
              </span>
              {isLastSlide ? 'Commencer' : 'Suivant'}
            </motion.button>

            {/* Points (2 écrans) */}
            <div className="flex justify-center gap-2.5 mt-5">
              {slides.map((s, index) => (
                <motion.button
                  key={s.id}
                  onClick={(e) => { e.stopPropagation(); handleDot(index); }}
                  aria-label={`Écran ${index + 1}`}
                  animate={{
                    width: index === currentSlide ? 30 : 10,
                    backgroundColor: index === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="h-2.5 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
