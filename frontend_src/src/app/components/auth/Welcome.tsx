import React, { useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import logoJulabaSvg from "../../../assets/images/logo-julaba.svg";
import tataNantiLou from "../../../assets/images/tata-nanti-lou.png";
import { ArrowRight, Volume2 } from "lucide-react";
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
  const { t } = useTranslation();
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
    <main className="login-welcome">
      <div className="login-brand">
        <span className="login-logo"><img src={logoJulabaSvg} alt={t('welcome.altLogoJulaba')} /></span>
        <BrandSignature />
      </div>
      <section className="login-welcome-body">
        <button type="button" onClick={accueille} className="login-tata-welcome" aria-label={t('welcome.ecouterTata')}>
          <img src={tataNantiLou} alt={t('welcome.altTata')} />
          <span className="login-replay"><Volume2 aria-hidden="true" size={28} /></span>
        </button>
        <h1>{t('welcome.bienvenue')}</h1>
        <p>{t('welcome.jeSuisTata')}</p>
      </section>
      <div className="login-welcome-actions">
        <motion.button type="button" onClick={commencer} className="login-primary" whileTap={{ scale: 0.98 }}>
          {t('welcome.commencer')} <ArrowRight aria-hidden="true" size={30} />
        </motion.button>
        <button type="button" onClick={accueille} className="login-help">
          <Volume2 aria-hidden="true" size={22} /> {t('welcome.ecouterAide')}
        </button>
        <div className="login-partners">
          <img src={logoDge} alt={t('welcome.altDge')} />
          <img src={logoAnsut} alt={t('welcome.altAnsut')} />
        </div>
      </div>
    </main>
  );
}
