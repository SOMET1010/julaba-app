import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { Card } from '../ui/card';

interface TantieSagesseCardProps {
  title?: string;
  message: string;
  primaryColor: string;
  onListen: () => void;
  isSpeaking?: boolean;
  messageKey?: string;
  /** Choix du layout : 'A' | 'B' | 'C' — défaut 'B' */
  variant?: 'A' | 'B' | 'C';
}

/** Fit-text : remplit un conteneur avec la plus grande police possible */
function useFitText(
  containerRef: React.RefObject<HTMLDivElement | null>,
  textRef: React.RefObject<HTMLDivElement | null>,
  deps: unknown[]
) {
  const fit = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    const availH = container.clientHeight;
    const availW = container.clientWidth;
    if (!availH || !availW) return;
    let lo = 8, hi = 80, best = lo;
    for (let i = 0; i < 20; i++) {
      const mid = Math.floor((lo + hi) / 2);
      text.style.fontSize = `${mid}px`;
      if (text.scrollHeight <= availH && text.scrollWidth <= availW) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    text.style.fontSize = `${best}px`;
  }, [containerRef, textRef]);

  useEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ...deps]);
}

// ─── FOND ANIMÉ COMMUN ────────────────────────────────────────────────────────
function AnimatedBg({ primaryColor }: { primaryColor: string }) {
  return (
    <motion.div
      className="absolute inset-0 opacity-5"
      style={{ background: `linear-gradient(135deg, ${primaryColor}FF 0%, ${primaryColor}44 100%)` }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
    />
  );
}

// ─── BOUTON ÉCOUTER ───────────────────────────────────────────────────────────
function ListenBtn({ primaryColor, onListen }: { primaryColor: string; onListen: () => void }) {
  return (
    <div className="flex justify-end flex-shrink-0 mt-2">
      <motion.button
        onClick={onListen}
        className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md"
        style={{ backgroundColor: primaryColor }}
        whileHover={{ scale: 1.1, boxShadow: `0 8px 20px ${primaryColor}40` }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Volume2 className="w-5 h-5" />
      </motion.button>
    </div>
  );
}

// ─── PROPOSITION A ─────────────────────────────────────────────────────────────
// Deux zones flex indépendantes : le titre remplit sa zone (40%), le message
// remplit sa zone (60%). Chaque bloc a son propre fit-text.
function VariantA({ title = 'Tata Nanti Lou', message, primaryColor, onListen, messageKey }: TantieSagesseCardProps) {
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLDivElement>(null);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const msgTextRef = useRef<HTMLDivElement>(null);

  useFitText(titleContainerRef, titleTextRef, [title]);
  useFitText(msgContainerRef, msgTextRef, [message]);

  return (
    <Card className="flex-1 rounded-3xl border-2 shadow-lg relative overflow-hidden" style={{ borderColor: primaryColor }}>
      <AnimatedBg primaryColor={primaryColor} />
      <div className="relative z-10 flex flex-col h-full p-4 gap-1">

        {/* Zone titre — flex 2 (≈ 40%) */}
        <div ref={titleContainerRef} className="overflow-hidden" style={{ flex: 2 }}>
          <div ref={titleTextRef} style={{ fontSize: 16 }}>
            <motion.div
              className="font-black text-gray-900 leading-none"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {title}
            </motion.div>
          </div>
        </div>

        {/* Zone message — flex 3 (≈ 60%) */}
        <div ref={msgContainerRef} className="overflow-hidden" style={{ flex: 3 }}>
          <div ref={msgTextRef} style={{ fontSize: 16 }}>
            <motion.div
              className="text-gray-600 leading-snug"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              key={messageKey}
            >
              {message}
            </motion.div>
          </div>
        </div>

        <ListenBtn primaryColor={primaryColor} onListen={onListen} />
      </div>
    </Card>
  );
}

// ─── PROPOSITION B ─────────────────────────────────────────────────────────────
// Titre = badge coloré compact et fixe en haut.
// Le message occupe TOUT le reste et grandit pour remplir l'espace.
function VariantB({ title = 'Tata Nanti Lou', message, primaryColor, onListen, messageKey }: TantieSagesseCardProps) {
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const msgTextRef = useRef<HTMLDivElement>(null);
  useFitText(msgContainerRef, msgTextRef, [message]);

  return (
    <Card className="flex-1 rounded-3xl border-2 shadow-lg relative overflow-hidden" style={{ borderColor: primaryColor }}>
      <AnimatedBg primaryColor={primaryColor} />
      <div className="relative z-10 flex flex-col h-full p-4">

        {/* Badge titre compact en haut */}
        <motion.div
          className="inline-flex items-center self-start px-3 py-1 rounded-full text-white mb-3 flex-shrink-0"
          style={{ backgroundColor: primaryColor, fontSize: 13, fontWeight: 800, letterSpacing: '0.01em' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {title}
        </motion.div>

        {/* Message — prend TOUT l'espace restant */}
        <div ref={msgContainerRef} className="flex-1 overflow-hidden">
          <div ref={msgTextRef} style={{ fontSize: 16 }}>
            <motion.div
              className="font-bold text-gray-800 leading-snug"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              key={messageKey}
            >
              {message}
            </motion.div>
          </div>
        </div>

        <ListenBtn primaryColor={primaryColor} onListen={onListen} />
      </div>
    </Card>
  );
}

// ─── PROPOSITION C ─────────────────────────────────────────────────────────────
// Un seul bloc fit-text centré verticalement.
// Titre en proportion 1.6× du message via em — les deux grandissent ensemble.
function VariantC({ title = 'Tata Nanti Lou', message, primaryColor, onListen, messageKey }: TantieSagesseCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  useFitText(containerRef, textRef, [message, title]);

  return (
    <Card className="flex-1 rounded-3xl border-2 shadow-lg relative overflow-hidden" style={{ borderColor: primaryColor }}>
      <AnimatedBg primaryColor={primaryColor} />
      <div className="relative z-10 flex flex-col justify-between h-full p-4">

        {/* Texte centré verticalement qui occupe tout */}
        <div ref={containerRef} className="flex-1 flex items-center overflow-hidden">
          <div ref={textRef} style={{ fontSize: 16, width: '100%' }}>
            <motion.div
              className="font-black text-gray-900 leading-tight"
              style={{ fontSize: '1.6em', marginBottom: '0.2em' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {title}
            </motion.div>
            <motion.div
              className="text-gray-600 leading-snug"
              style={{ fontSize: '1em' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              key={messageKey}
            >
              {message}
            </motion.div>
          </div>
        </div>

        <ListenBtn primaryColor={primaryColor} onListen={onListen} />
      </div>
    </Card>
  );
}

// ─── EXPORT PRINCIPAL ──────────────────────────────────────────────────────────
export function TantieSagesseCard(props: TantieSagesseCardProps) {
  const { variant = 'A' } = props;
  if (variant === 'A') return <VariantA {...props} />;
  if (variant === 'C') return <VariantC {...props} />;
  return <VariantB {...props} />;
}