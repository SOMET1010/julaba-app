import React, { useCallback, useEffect } from 'react';
import { motion } from 'motion/react';

import logoJulabaBlanc from "../../../assets/images/logo-julaba.png";
import { speakBrowser, stopSpeaking } from '../../services/elevenlabs';
import { estHabituee } from '../../utils/parcours';

interface WelcomeProps {
  onComplete?: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  // Tata ACCUEILLE (elle ne présente pas une appli) : elle parle du COMMERCE de
  // la marchande, et crée tout de suite un lien d'appartenance. Le navigateur
  // bloque l'audio avant tout geste → on tente à l'ouverture ET on débloque au
  // tout premier contact. Dès qu'elle touche l'écran, on entre.
  const accueille = useCallback(() => {
    try {
      const texte = estHabituee()
        ? 'Re-bonjour ! On y va.'
        : "Bonjour ! Moi, c'est Tata. Je serai avec toi pour vendre, compter ton argent " +
          'et faire grandir ton commerce. Beaucoup de commerçantes travaillent déjà avec moi. ' +
          "Maintenant, c'est ton tour. On commence ?";
      speakBrowser(texte);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(accueille, 350);
    const onFirst = () => accueille();
    window.addEventListener('pointerdown', onFirst, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onFirst);
      stopSpeaking();
    };
  }, [accueille]);

  // Toucher l'écran = commencer (Tata s'arrête, on entre).
  const commencer = () => { stopSpeaking(); onComplete?.(); };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-8 cursor-pointer"
      style={{ backgroundColor: '#C46210' }}
      onClick={commencer}
    >
      <div className="flex-1" />

      {/* Logo */}
      <motion.div
        className="flex flex-col items-center text-center w-full max-w-sm px-4"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img src={logoJulabaBlanc} alt="Julaba" className="w-full h-auto" />
      </motion.div>

      <div className="flex-1" />

      {/* Bouton Commencer */}
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center", marginBottom: 8 }}>By ICONE SOLUTION</p>
      <motion.div
        className="w-full max-w-xs pb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
      >
        <motion.button
          onClick={(e) => { e.stopPropagation(); commencer(); }}
          className="w-full h-14 bg-white rounded-full text-lg font-bold shadow-lg"
          style={{ color: '#C46210' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Commencer
        </motion.button>
      </motion.div>
    </div>
  );
}
