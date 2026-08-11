import React, { useCallback, useEffect } from 'react';
import { motion } from 'motion/react';

import logoJulabaSvg from "../../../assets/images/logo-julaba.svg";
import bgMarche from "../../../assets/images/bg-marche-vente.png";
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

  // Maquette d'Alex (11/08/2026) : photo de marché plein écran sous un voile
  // orange, logo Jùlaba (SVG propre, sans cartouche), carte DGE + ANSUT,
  // Commencer, et « by icone » discret en bas à droite.
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-8 cursor-pointer"
      style={{
        backgroundColor: '#C46210',
        backgroundImage: `linear-gradient(180deg, rgba(196,98,16,0.30) 0%, rgba(196,98,16,0.42) 52%, rgba(196,97,15,0.92) 88%, #C4610F 100%), url(${bgMarche})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        position: 'relative',
      }}
      onClick={commencer}
    >
      <div className="flex-1" />

      {/* Logo (SVG rendu en blanc) + devise */}
      <motion.div
        className="flex flex-col items-center text-center w-full max-w-sm px-4"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Le SVG complet contient la devise ET le cartouche « By icone » :
            on ne montre que la MARQUE (bande haute du viewBox), le reste est
            recadré. La devise est réécrite en HTML juste dessous. */}
        <div style={{ width: '100%', maxWidth: 330, overflow: 'hidden', aspectRatio: '841.89 / 205' }} aria-label="Jùlaba" role="img">
          <img
            src={logoJulabaSvg} alt=""
            style={{ width: '100%', height: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <p style={{ color: '#fff', fontFamily: 'Georgia, serif', fontSize: 20, margin: '12px 0 0', textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>
          Ton djè est bien géré
        </p>
      </motion.div>

      <div className="flex-1" />

      {/* Le projet est porté par la DGE et l'ANSUT (logos officiels seuls) ;
          Icone Solution, simple éditeur, figure en tout petit en bas d'écran. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ width: '100%', maxWidth: 300, marginBottom: 12 }}
      >
        <div style={{ background: 'rgba(255,252,247,0.92)', borderRadius: 18, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
          <img src={logoDge} alt="Direction Générale de l'Emploi"
            style={{ height: 46, width: 'auto', display: 'block' }} />
          <img src={logoAnsut} alt="ANSUT — Agence Nationale du Service Universel des Télécommunications-TIC"
            style={{ height: 42, width: 'auto', display: 'block' }} />
        </div>
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
      </motion.div>

      {/* Éditeur : discret, en bas à droite (demande d'Alex). */}
      <p style={{ position: 'absolute', right: 14, bottom: 8, margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>
        by icone
      </p>
    </div>
  );
}
