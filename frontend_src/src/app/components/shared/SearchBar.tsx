/**
 * JÙLABA — Composant SearchBar unifié
 * =====================================
 * Utilisé par toutes les barres de recherche de la plateforme.
 *
 * Props :
 *  - value / onChange        : état contrôlé
 *  - placeholder             : texte affiché quand vide
 *  - primaryColor            : couleur d'accentuation du profil
 *  - onVoiceSearch?          : callback déclenché quand la voix démarre
 *  - voiceEnabled?           : afficher ou non le bouton micro (défaut : true)
 *  - isListening?            : état actif du micro
 *  - className?              : classes Tailwind supplémentaires sur le wrapper
 *  - inputClassName?         : classes Tailwind supplémentaires sur l'input
 */

import React, { useState, useRef } from 'react';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, MicOff, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  primaryColor?: string;
  voiceEnabled?: boolean;
  isListening?: boolean;
  onVoiceResult?: (transcript: string) => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  primaryColor = '#9F8170',
  voiceEnabled = true,
  isListening: externalListening,
  onVoiceResult,
  className = '',
  inputClassName = '',
  autoFocus = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalListening, setInternalListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const voiceDisabledByRole =
    typeof window !== 'undefined' && localStorage.getItem('julaba_voice_disabled') === 'true';
  const effectiveVoiceEnabled = voiceEnabled && !voiceDisabledByRole;

  const isListening = externalListening ?? internalListening;
  const isActive = value.length > 0 || isFocused;

  /* ── Icône loupe : 3 états ────────────────────────────── */
  const IconSearch = () => {
    if (isListening) {
      // Anneaux radar
      return (
        <div className="relative w-5 h-5 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: primaryColor }}
            animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: primaryColor }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
          <Mic className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        </div>
      );
    }
    if (isFocused) {
      // Pulse focus
      return (
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Search className="w-5 h-5" style={{ color: primaryColor }} />
        </motion.div>
      );
    }
    // Shimmer idle
    return (
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Search className="w-5 h-5 text-gray-400" />
      </motion.div>
    );
  };

  /* ── Recherche vocale ─────────────────────────────────── */
  // STT via Groq Whisper
  const { startRecording: _groqStart_startVoiceSearch, stopRecording: _groqStop_startVoiceSearch } = useVoiceCore({
    onTranscript: (text) => { onChange(text); onVoiceResult?.(text); setInternalListening(false); },
    onError: () => setInternalListening(false),
  });

  const startVoiceSearch = () => {
    if (isListening) { _groqStop_startVoiceSearch(); setInternalListening(false); }
    else { setInternalListening(true); _groqStart_startVoiceSearch(); }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Icône loupe */}
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <IconSearch />
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full pl-11 pr-${effectiveVoiceEnabled ? '20' : value ? '10' : '4'} py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none text-sm placeholder:text-gray-400 shadow-sm transition-all duration-200 ${inputClassName}`}
        style={{
          borderColor: isListening
            ? primaryColor
            : isActive
            ? `${primaryColor}80`
            : undefined,
        }}
      />

      {/* Boutons droite */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {/* Effacer */}
        <AnimatePresence>
          {value.length > 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Micro */}
        {effectiveVoiceEnabled && (
          <motion.button
            onClick={startVoiceSearch}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              backgroundColor: isListening ? primaryColor : '#f3f4f6',
            }}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-gray-500" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}