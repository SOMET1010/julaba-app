/**
 * 🔄 AppLoader - Composant global de chargement
 * 
 * Utilisé pour remplacer les fallback démo pendant le chargement des données.
 * Compatible avec tous les profils Jùlaba.
 */

import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AppLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AppLoader({ message = 'Chargement en cours...', size = 'md' }: AppLoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className={`${sizeClasses[size]} text-primary`} />
      </motion.div>
      
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-600"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}