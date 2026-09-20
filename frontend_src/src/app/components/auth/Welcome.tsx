import React, { useCallback, useEffect } from 'react';
import { motion } from 'motion/react';

import logoJulabaSvg from "../../../assets/images/logo-julaba.svg";
import tataAccueil from "../../../assets/redesign/tata-accueil.webp";
import heroMarchande from "../../../assets/redesign/hero-marchande.webp";
import { ArrowRight, Volume2, Store } from "lucide-react";
import { BrandSignature } from "../shared/BrandSignature";
import { useNavigate } from "react-router";
import logoDge from "../../../assets/images/logo-dge.png";
import logoAnsut from "../../../assets/images/logo-ansut.png";
import { direIntro, stopIntro } from '../../services/onboardingVoix';
import { estHabituee } from '../../utils/parcours';

interface WelcomeProps {
  onComplete?: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  const navigate = useNavigate();
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
  const commencer = () => { stopIntro(); if (onComplete) onComplete(); else navigate('/login'); };

  return (
    <main className="login-welcome login-welcome-redesign">
      <div className="login-market-scene" aria-hidden="true">
        <img src={heroMarchande} alt="" />
      </div>
      <div className="login-market-veil" aria-hidden="true" />

      <header className="login-brand login-brand-on-scene">
        <span className="login-logo"><img src={logoJulabaSvg} alt="JÙLABA" /></span>
        <BrandSignature />
      </header>

      <section className="login-market-message" aria-labelledby="welcome-title">
        <span className="login-market-kicker"><Store aria-hidden="true" size={18} /> Mon commerce</span>
        <h1 id="welcome-title">Ton commerce,<br />dans ta main.</h1>
        <p>Vends. Compte. Avance.</p>
      </section>

      <div className="login-welcome-actions login-market-sheet">
        <button type="button" onClick={accueille} className="login-tata-inline" aria-label="Écouter Tata Nanti Lou">
          <img src={tataAccueil} alt="Tata Nanti Lou" />
          <span>
            <strong>Akwaba, je suis Tata.</strong>
            <small>Je t’aide à vendre et compter.</small>
          </span>
          <span className="login-replay"><Volume2 aria-hidden="true" size={24} /></span>
        </button>

        <motion.button type="button" onClick={commencer} className="login-primary login-market-primary" whileTap={{ scale: 0.98 }}>
          Entrer dans ma boutique <ArrowRight aria-hidden="true" size={30} />
        </motion.button>

        <div className="login-partners login-market-partners">
          <img src={logoDge} alt="Direction Générale de l’Emploi" />
          <img src={logoAnsut} alt="ANSUT" />
        </div>
      </div>
    </main>
  );
}
