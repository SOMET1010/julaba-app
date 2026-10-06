import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, FileX, Lock, RefreshCw, ServerCrash, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TYPE_COLORS } from '../../../utils/role-config';
import { BO_MEDIUM, BO_PRIMARY } from '../bo-theme';

export type ErrorType = 'network' | 'server' | 'forbidden' | 'notfound' | 'generic';

const ERROR_CONFIG: Record<ErrorType, { icon: LucideIcon; defaultTitle: string; defaultDescription: string }> = {
  network: {
    icon: WifiOff,
    defaultTitle: 'Problème de connexion',
    defaultDescription: 'Vérifie ta connexion internet et réessaie.',
  },
  server: {
    icon: ServerCrash,
    defaultTitle: 'Erreur serveur',
    defaultDescription: 'Le serveur ne répond pas. Réessaie dans quelques instants.',
  },
  forbidden: {
    icon: Lock,
    defaultTitle: 'Accès refusé',
    defaultDescription: "Tu n'as pas les permissions nécessaires pour cette action.",
  },
  notfound: {
    icon: FileX,
    defaultTitle: 'Élément introuvable',
    defaultDescription: "L'élément demandé n'existe pas ou a été supprimé.",
  },
  generic: {
    icon: AlertCircle,
    defaultTitle: 'Une erreur est survenue',
    defaultDescription: "Une erreur inattendue s'est produite. Réessaie.",
  },
};

export type ErrorLayout = 'inline' | 'fullpage';

export interface UniversalErrorStateBOProps {
  type?: ErrorType;
  role?: string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  layout?: ErrorLayout;
  hideIcon?: boolean;
}

export function UniversalErrorStateBO({
  type = 'generic',
  role,
  title,
  description,
  onRetry,
  retryLabel = 'Réessayer',
  layout = 'inline',
  hideIcon = false,
}: UniversalErrorStateBOProps) {
  const config = ERROR_CONFIG[type];
  const Icon = config.icon;
  const accentColor = (role && TYPE_COLORS[role]) || BO_PRIMARY;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;
  const isFullPage = layout === 'fullpage';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: isFullPage ? '60px 24px' : '32px 24px',
        background: 'var(--color-white)',
        borderRadius: 24,
        border: `2px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
        textAlign: 'center',
        minHeight: isFullPage ? 400 : 'auto',
      }}
    >
      {!hideIcon && (
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
          style={{
            width: isFullPage ? 80 : 60,
            height: isFullPage ? 80 : 60,
            borderRadius: '50%',
            background: `color-mix(in srgb, ${accentColor} 12%, white)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
          }}
        >
          <Icon size={isFullPage ? 36 : 28} style={{ color: accentColor }} />
        </motion.div>
      )}

      <div>
        <h3
          style={{
            fontSize: isFullPage ? 18 : 16,
            fontWeight: 900,
            color: BO_PRIMARY,
            margin: 0,
            marginBottom: 6,
          }}
        >
          {displayTitle}
        </h3>
        <p
          style={{
            fontSize: isFullPage ? 14 : 13,
            color: BO_MEDIUM,
            margin: 0,
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          {displayDescription}
        </p>
      </div>

      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: accentColor,
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
            style={{ display: 'inline-flex' }}
          >
            <RefreshCw size={14} />
          </motion.span>
          {retryLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

export default UniversalErrorStateBO;
