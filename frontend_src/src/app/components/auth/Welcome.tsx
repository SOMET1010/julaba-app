import React from 'react';
import { motion } from 'motion/react';

import logoJulabaBlanc from "../../../assets/images/logo-julaba.png";

interface WelcomeProps {
  onComplete?: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-8"
      style={{ backgroundColor: '#C46210' }}
    >
      <div className="flex-1" />

      {/* Logo SVG */}
      <motion.div
        className="flex flex-col items-center text-center w-full max-w-sm px-4"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img
          src={logoJulabaBlanc}
          alt="Julaba"
          className="w-full h-auto"
        />
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
          onClick={() => onComplete?.()}
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