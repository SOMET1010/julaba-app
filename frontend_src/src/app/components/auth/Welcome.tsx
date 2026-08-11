import React, { useCallback, useEffect } from 'react';
import { motion } from 'motion/react';

import logoJulabaBlanc from "../../../assets/images/logo-julaba.png";
import logoDge from "../../../assets/images/logo-dge.png";
import logoAnsut from "../../../assets/images/logo-ansut.png";
import { direIntro, stopIntro } from '../../services/onboardingVoix';
import { estHabituee } from '../../utils/parcours';

interface WelcomeProps {
  onComplete?: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  // Tata ACCUEILLE (elle ne présente pas une appli) : elle parle du COMMERCE de
  // la marchande, et crée tout de suite un lien d'appartenance. VRAIE voix
  // (clip enregistré), le robot n'est qu'un filet. Le navigateur bloque l'audio
  // avant tout geste → on tente à l'ouverture ET on débloque au 1er contact.
  const accueille = useCallback(() => {
    try { direIntro(estHabituee() ? 'retour' : 'accueil'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(accueille, 350);
    const onFirst = () => accueille();
    window.addEventListener('pointerdown', onFirst, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onFirst);
      stopIntro();
    };
  }, [accueille]);

  // Toucher l'écran = commencer (Tata s'arrête, on entre).
  const commencer = () => { stopIntro(); onComplete?.(); };

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

      {/* Le projet est porté par la DGE et l'ANSUT (logos officiels seuls) ;
          Icone Solution, simple éditeur, figure en tout petit en bas d'écran. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ width: '100%', maxWidth: 300, marginBottom: 12 }}
      >
        <div style={{ background: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <img src={logoDge} alt="Direction Générale de l'Emploi"
            style={{ height: 44, width: 'auto', display: 'block' }} />
          <img src={logoAnsut} alt="ANSUT — Agence Nationale du Service Universel des Télécommunications-TIC"
            style={{ height: 40, width: 'auto', display: 'block' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.35 }}>
          Un projet de la Direction Générale de l'Emploi et de l'ANSUT
        </p>
      </motion.div>

      {/* Bouton Commencer */}
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
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, textAlign: 'center', margin: '10px 0 0' }}>
          Édité par Icone Solution
        </p>
      </motion.div>
    </div>
  );
}
