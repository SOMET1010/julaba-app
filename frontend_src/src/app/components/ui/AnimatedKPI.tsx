import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

interface AnimatedKPIProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
  border: string;
  bg: string;
  text: string;
  delay?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  // Modal détaillé
  modalTitle?: string;
  modalContent?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    label: string;
  };
  details?: Array<{ label: string; value: string | number; color?: string }>;
}

export function AnimatedKPI({
  label,
  value,
  icon,
  color,
  border,
  bg,
  text,
  delay = 0,
  decimals = 0,
  suffix = '',
  prefix = '',
  modalTitle,
  modalContent,
  trend,
  details = [],
}: AnimatedKPIProps) {
  const [showModal, setShowModal] = useState(false);
  const animatedValue = useCountUp(value, 800, decimals, delay);

  const formatValue = (val: number) => {
    const formatted = decimals > 0 ? val.toFixed(decimals) : (val || 0).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  };

  const handleClick = () => {
    if (modalTitle || modalContent || details.length > 0) {
      setShowModal(true);
    }
  };

  const hasModal = modalTitle || modalContent || details.length > 0;

  return (
    <>
      {/* KPI Card */}
      <motion.div
        className={`bg-white rounded-3xl p-4 shadow-lg border-2 ${border} relative overflow-hidden ${
          hasModal ? 'cursor-pointer' : ''
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
        whileHover={hasModal ? { y: -4, scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' } : { y: -2 }}
        whileTap={hasModal ? { scale: 0.98 } : {}}
        onClick={handleClick}
      >
        {/* Effet de pulse sur le background */}
        <motion.div
          className={`absolute inset-0 ${bg} opacity-30`}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Icône animée */}
        <div className={`absolute right-3 top-3 w-9 h-9 rounded-full ${bg} flex items-center justify-center z-10`}>
          <motion.span
            className={text}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {icon}
          </motion.span>
        </div>

        {/* Contenu */}
        <div className="relative z-10">
          <p className="text-xs text-gray-500 font-semibold mb-1 pr-10">{label}</p>
          <motion.p
            className={`text-2xl font-black ${text}`}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: (delay / 1000) + 0.5 }}
          >
            {formatValue(animatedValue)}
          </motion.p>

          {/* Trend indicator si présent */}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.direction === 'up' && (
                <motion.div
                  animate={{ y: [-2, 0, -2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <TrendingUp className="w-3 h-3 text-green-500" />
                </motion.div>
              )}
              {trend.direction === 'down' && (
                <motion.div
                  animate={{ y: [0, 2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <TrendingDown className="w-3 h-3 text-red-500" />
                </motion.div>
              )}
              {trend.direction === 'stable' && (
                <Minus className="w-3 h-3 text-gray-400" />
              )}
              <span
                className={`text-[10px] font-bold ${
                  trend.direction === 'up'
                    ? 'text-green-600'
                    : trend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                {Math.abs(trend.value)}% {trend.label}
              </span>
            </div>
          )}

          {/* Indicateur cliquable */}
          {hasModal && (
            <motion.div
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className={`w-4 h-4 ${text}`} />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Modal détaillé */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-x-0 top-0 bottom-0 z-[9999] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden border-2" style={{ borderColor: color }}>
                {/* Header */}
                <div
                  className="px-6 py-5 border-b-2 relative overflow-hidden"
                  style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)` }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{ background: `linear-gradient(135deg, ${color} 0%, transparent 100%)` }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center`}>
                        <span className={text}>{icon}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-lg">{modalTitle || label}</h3>
                        <p className="text-xs text-gray-500 font-semibold">{label}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowModal(false)}
                      className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </motion.button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                  {/* Valeur principale */}
                  <motion.div
                    className={`text-center py-6 rounded-3xl ${bg} border-2 ${border} mb-6`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p className="text-xs text-gray-500 font-semibold mb-2">Valeur actuelle</p>
                    <motion.p
                      className={`text-5xl font-black ${text}`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {formatValue(value)}
                    </motion.p>
                    {trend && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        {trend.direction === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {trend.direction === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {trend.direction === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
                        <span
                          className={`text-sm font-bold ${
                            trend.direction === 'up'
                              ? 'text-green-600'
                              : trend.direction === 'down'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                          {Math.abs(trend.value)}% {trend.label}
                        </span>
                      </div>
                    )}
                  </motion.div>

                  {/* Détails supplémentaires */}
                  {details.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">Détails</h4>
                      {details.map((detail, i) => (
                        <motion.div
                          key={i}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-100"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                        >
                          <span className="text-sm font-semibold text-gray-700">{detail.label}</span>
                          <span
                            className="text-sm font-black"
                            style={{ color: detail.color || color }}
                          >
                            {detail.value}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Contenu personnalisé */}
                  {modalContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {modalContent}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}