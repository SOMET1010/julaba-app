import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { useVoiceCore } from '../../hooks/useVoiceCore';

interface VoiceButtonProps {
  onVoiceCommand?: (command: string) => void;
}

export function VoiceButton({ onVoiceCommand }: VoiceButtonProps) {
  const { user, roleColor, speak } = useApp();
  const role = (user as any)?.role || 'general';
  const color = roleColor || '#C66A2C';

  const { state, handleMicClick, isListening, isProcessing, liveTranscript } = useVoiceCore({
    context: {
      module: role,
      prenom: user?.firstName || user?.prenoms || 'ma chère',
      genre: (user as any)?.genre || 'femme',
      userId: user?.id,
    },
    onAction: async (data) => {
      if (onVoiceCommand && (data.transcript || data.transcription)) {
        onVoiceCommand(data.transcript || data.transcription || '');
      }
    },
    onError: (msg) => { void msg; },
  });

  const isThinking = state === 'thinking' || state === 'processing';
  const isSpeaking = state === 'speaking';
  const isActive = isListening || isThinking || isSpeaking;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

      {/* Bouton micro avec animations */}
      <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Ondes — listening */}
        {isListening && [1, 2, 3].map(i => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: 72, height: 72,
              borderRadius: '50%',
              border: `2px solid ${color}`,
            }}
            animate={{ scale: [1, 1.4 + i * 0.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
          />
        ))}

        {/* Pulse — thinking */}
        {isThinking && (
          <motion.div
            style={{
              position: 'absolute',
              width: 72, height: 72,
              borderRadius: '50%',
              background: `${color}20`,
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Bouton principal */}
        <motion.button
          onClick={handleMicClick}
          onTouchStart={() => {
            try {
              const AC = window.AudioContext || (window as any).webkitAudioContext;
              const a = new AC();
              if (a.state === 'suspended') a.resume();
            } catch (e) { void e; }
          }}
          whileTap={{ scale: 0.92 }}
          animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.6, repeat: isSpeaking ? Infinity : 0 }}
          style={{
            width: 56, height: 56,
            borderRadius: '50%',
            border: 'none',
            background: isListening
              ? color
              : isThinking
              ? `${color}CC`
              : `${color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative', zIndex: 2,
            boxShadow: isActive ? `0 0 0 3px ${color}40` : 'none',
            transition: 'background 0.3s, box-shadow 0.3s',
          }}
        >
          <AnimatePresence mode="wait">
            {isThinking ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2
                  size={22}
                  color={color}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="mic-on"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <MicOff size={22} color="white" />
              </motion.div>
            ) : (
              <motion.div
                key="mic-off"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Mic size={22} color={color} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Texte de statut animé */}
      <AnimatePresence mode="wait">
        {liveTranscript ? (
          <motion.div
            key={liveTranscript}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isThinking ? color : '#888',
              textAlign: 'center',
              maxWidth: 120,
              lineHeight: 1.3,
            }}
          >
            {liveTranscript}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}
          >
            {isListening ? 'Appuie pour arrêter' : 'Parler à Tata Nanti Lou'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de volume animée — listening uniquement */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            style={{
              display: 'flex', gap: 3, alignItems: 'flex-end', height: 16,
            }}
          >
            {[0.4, 0.7, 1, 0.6, 0.8, 0.5, 0.9].map((h, i) => (
              <motion.div
                key={i}
                style={{
                  width: 3, borderRadius: 2,
                  background: color,
                  originY: 1,
                }}
                animate={{ scaleY: [h, h * 0.3 + Math.random() * 0.7, h] }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.07,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}