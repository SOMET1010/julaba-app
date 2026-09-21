import React, { useCallback, useEffect, useRef } from 'react';
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
  const laisserPresentationContinuer = useRef(false);
  // Tata ACCUEILLE (elle ne présente pas une appli) : elle parle du COMMERCE de
  // la marchande, et crée tout de suite un lien d'appartenance. Clip local
  // uniquement : jamais de voix du navigateur en repli.
  const accueille = useCallback(() => {
    try { direIntro(estHabituee() ? 'retour' : 'accueil'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(accueille, 350);
    return () => {
      clearTimeout(t);
      if (!laisserPresentationContinuer.current) stopIntro();
    };
  }, [accueille]);

  // Démarre la présentation SUR le geste autorisé, puis la laisse accompagner
  // l'écran suivant. Cela évite à la fois le blocage autoplay et le chevauchement
  // accueil/présentation : stopIntro coupe d'abord l'éventuel accueil en cours.
  const commencer = () => {
    stopIntro();
    laisserPresentationContinuer.current = true;
    void direIntro('histoire1');
    if (onComplete) onComplete(); else navigate('/login');
  };

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
        <button type="button" onClick={accueille} className="login-tata-inline" aria-label="Écouter Tantie Nanti Lou">
          <img src={tataAccueil} alt="Tantie Nanti Lou" />
          <span>
            <strong>Akwaba, je suis Tantie Nanti Lou.</strong>
            <small>Touche ici pour écouter ma voix.</small>
          </span>
          <span className="login-replay"><Volume2 aria-hidden="true" size={24} /></span>
        </button>

        <motion.button type="button" onClick={commencer} className="login-primary login-market-primary" whileTap={{ scale: 0.98 }}>
          Écouter et entrer <ArrowRight aria-hidden="true" size={30} />
        </motion.button>

        <div className="login-partners login-market-partners">
          <img src={logoDge} alt="Direction Générale de l’Emploi" />
          <img src={logoAnsut} alt="ANSUT" />
        </div>
      </div>
    </main>
  );
}
