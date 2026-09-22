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
import { stopIntro } from '../../services/onboardingVoix';
import { direEntreeAvantConnexion } from '../../services/entreeVoixAvantConnexion';
import { tParle } from '../../i18n/voice/runtime';
import { speak as direTexte } from '../../services/audioManager';
import { estHabituee } from '../../utils/parcours';

interface WelcomeProps {
  onComplete?: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  const navigate = useNavigate();
  const laisserPresentationContinuer = useRef(false);

  // Tata ACCUEILLE (elle ne présente pas une appli) : elle parle du COMMERCE de
  // la marchande, et crée tout de suite un lien d'appartenance.
  //
  // ── AKW-01 — CE BONJOUR N'ARRIVAIT JAMAIS ────────────────────────────────
  // Banc terrain, écran 1 : « MUET » et « 1 impasse /2 ». `direIntro` ne joue
  // qu'un clip enregistré et rend `Promise<void>` quand il n'y en a pas — donc
  // dans TOUT build livré, le drapeau des prototypes étant éteint. Le premier
  // écran du téléphone ne disait pas bonjour, et le bouton qui le promettait
  // ne faisait rien.
  //
  // `direEntreeAvantConnexion` joue le MÊME clip (registre figé, règle inchangée) mais
  // RAPPORTE ce qu'il en advient. Le texte ne part que s'il ne reste rien à
  // dire — jamais par-dessus le clip, et jamais après une coupure : quand la
  // marchande touche « Écouter et entrer » pendant le bonjour, ce silence est
  // sa décision. Preuve : services/entreeVoixAvantConnexion.test.mts.
  //
  // ── POURQUOI PAS `speakMessage` ICI ──────────────────────────────────────
  // Le banc l'a montré, et c'est la vraie leçon de cet écran : le rendu de
  // `speakMessage` passe par `AppContext.speak`, qui refuse tout ce qui n'est
  // pas un marchand connecté (`role-non-marchand`). Or SUR CET ÉCRAN PERSONNE
  // N'EST CONNECTÉ — c'est le premier du téléphone. La phrase partait, était
  // refusée, et l'écran restait muet en silence.
  //
  // On garde donc la CLÉ de catalogue (`tParle` en donne la forme parlée dans
  // la langue active) et on la remet au moteur audio directement, comme la
  // caisse le fait. Le muet global reste respecté : il vit dans `audioManager`,
  // pas dans la garde de rôle.
  const accueille = useCallback(() => {
    const habituee = estHabituee();
    void direEntreeAvantConnexion(habituee ? 'retour' : 'accueil')
      .then((r) => {
        if (!r.doitDireLeTexte) return;
        void direTexte(tParle(habituee ? 'AKWABA_RETOUR' : 'AKWABA_ACCUEIL'));
      })
      .catch(() => { /* un bonjour qui casse ne bloque pas l'entrée */ });
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
    // LA PRÉSENTATION APPARTIENT DÉSORMAIS À L'ÉCRAN 2 (TNT-01). Elle était
    // lancée ici pour contourner le blocage autoplay, et « accompagnait »
    // l'écran suivant. Mais l'écran 2 la dit maintenant lui-même : la laisser
    // partir des deux endroits donnerait DEUX sources pour une seule phrase —
    // avec clip, la seconde supplanterait la première en plein milieu.
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
