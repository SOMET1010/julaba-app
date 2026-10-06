import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface AnimatedChartProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  borderColor?: string;
  delay?: number;
}

/**
 * Wrapper pour animer les graphiques Recharts
 * Gère l'apparition progressive et les animations continues
 */
export function AnimatedChart({
  children,
  title,
  subtitle,
  borderColor = '#71286430',
  delay = 0,
}: AnimatedChartProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.div
      className="bg-white rounded-3xl p-5 border-2 shadow-lg relative overflow-hidden"
      style={{ borderColor }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 100 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    >
      {/* Effet de brillance animé */}
      <motion.div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
      />

      {/* Header */}
      <div className="mb-4 relative z-10">
        <motion.h3
          className="font-bold text-gray-900 text-base"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay / 1000 + 0.1 }}
        >
          {title}
        </motion.h3>
        {subtitle && (
          <motion.p
            className="text-xs text-gray-500 mt-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay / 1000 + 0.15 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Chart avec animation d'apparition */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.95 }}
        transition={{ duration: 0.5, delay: delay / 1000 + 0.2 }}
        className="relative z-10"
      >
        {children}
      </motion.div>

      {/* Pulse d'arrière-plan */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/3 opacity-5 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #712864, transparent)',
        }}
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}