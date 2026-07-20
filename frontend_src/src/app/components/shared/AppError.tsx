/**
 * ❌ AppError - Composant global d'erreur
 * 
 * Utilisé pour afficher les erreurs de chargement de données.
 * Remplace les fallback démo en cas d'échec API.
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface AppErrorProps {
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function AppError({ 
  message = 'Impossible de charger les données. Vérifie ta connexion internet.', 
  onRetry,
  showRetry = true 
}: AppErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 px-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          Une erreur est survenue
        </h3>
        <p className="text-sm text-gray-600 max-w-md">
          {message}
        </p>
      </motion.div>

      {showRetry && onRetry && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors border-2 border-primary"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Réessayer</span>
        </motion.button>
      )}
    </div>
  );
}