import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { STATUT_CONFIG, TYPE_COLORS } from '../../../utils/role-config';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type ConfirmSeverity = 'info' | 'warning' | 'danger';

const SEVERITY_CONFIG: Record<ConfirmSeverity, { icon: LucideIcon; iconColor: string; confirmBg: string }> = {
  info: { icon: Check, iconColor: TYPE_COLORS.cooperative, confirmBg: TYPE_COLORS.cooperative },
  warning: { icon: AlertTriangle, iconColor: TYPE_COLORS.operateur_terrain, confirmBg: TYPE_COLORS.operateur_terrain },
  danger: { icon: AlertTriangle, iconColor: STATUT_CONFIG.suspendu.dotColor, confirmBg: STATUT_CONFIG.suspendu.dotColor },
};

export interface UniversalConfirmModalBOProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  severity?: ConfirmSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  requireTypedConfirmation?: string;
  typedConfirmationHelper?: string;
  loading?: boolean;
}

interface AnimatedIconProps {
  icon: LucideIcon;
  size: number;
  color?: string;
}

function AnimatedIcon({ icon: Icon, size, color }: AnimatedIconProps) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
    >
      <Icon size={size} style={{ color }} />
    </motion.div>
  );
}

export function UniversalConfirmModalBO({
  open,
  onClose,
  onConfirm,
  title,
  message,
  severity = 'warning',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  requireTypedConfirmation,
  typedConfirmationHelper,
  loading = false,
}: UniversalConfirmModalBOProps) {
  const [typedValue, setTypedValue] = React.useState('');
  const titleId = React.useId();
  const descriptionId = React.useId();
  const config = SEVERITY_CONFIG[severity];
  const confirmationTarget = requireTypedConfirmation || (severity === 'danger' ? 'SUPPRIMER' : undefined);
  const canConfirm = !loading && (!confirmationTarget || typedValue === confirmationTarget);

  React.useEffect(() => {
    if (!open) setTypedValue('');
  }, [open]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) onClose();
      }}
    >
      <AlertDialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="p-0 gap-0 overflow-hidden rounded-3xl bg-white"
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white shadow-xl outline-none"
          style={{ borderRadius: 24, padding: 0, overflow: 'hidden' }}
        >
          <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 44, height: 44, background: `${config.iconColor}15`, borderRadius: 12 }}
              >
                <AnimatedIcon icon={config.icon} size={22} color={config.iconColor} />
              </motion.div>
              <div className="min-w-0">
                <AlertDialogTitle id={titleId} className="text-lg font-black text-gray-900 truncate m-0">
                  {title}
                </AlertDialogTitle>
                <AlertDialogDescription id={descriptionId} className="text-sm text-gray-500 mt-0.5 m-0">
                  {message}
                </AlertDialogDescription>
              </div>
            </div>
            {!loading && (
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.05, backgroundColor: BO_TINT }}
                whileTap={{ scale: 0.9 }}
                aria-label="Fermer"
                className="flex items-center justify-center flex-shrink-0 transition-all"
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BO_LIGHT}`, background: 'white' }}
              >
                <AnimatedIcon icon={X} size={16} color={BO_PRIMARY} />
              </motion.button>
            )}
          </div>

          <div style={{ padding: 20 }}>
            {confirmationTarget && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {typedConfirmationHelper || `Tape ${confirmationTarget} pour confirmer la suppression définitive`}
                </p>
                <input
                  type="text"
                  value={typedValue}
                  onChange={(event) => setTypedValue(event.target.value)}
                  placeholder={confirmationTarget}
                  disabled={loading}
                  autoFocus
                  aria-label={`Confirmation ${confirmationTarget}`}
                  className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none disabled:bg-gray-50"
                  style={{ borderColor: BO_LIGHT, fontFamily: 'monospace', letterSpacing: '0.5px' }}
                />
                {typedValue.length > 0 && typedValue !== confirmationTarget && (
                  <p className="text-xs mt-1.5" style={{ color: STATUT_CONFIG.suspendu.dotColor }}>
                    La saisie ne correspond pas. Tape exactement : {confirmationTarget}
                  </p>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter className="border-t border-gray-100 p-4">
            <motion.button
              type="button"
              onClick={onClose}
              disabled={loading}
              whileHover={{ scale: 1.02, backgroundColor: BO_TINT }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 text-sm font-bold bg-white border rounded-xl disabled:opacity-50 transition-all"
              style={{ color: BO_MEDIUM, borderColor: BO_LIGHT }}
            >
              {cancelLabel}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              whileHover={canConfirm ? { scale: 1.02, filter: 'brightness(0.92)' } : { scale: 1 }}
              whileTap={canConfirm ? { scale: 0.97 } : { scale: 1 }}
              className="px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all"
              style={{ background: config.confirmBg }}
            >
              {loading ? 'En cours...' : confirmLabel}
            </motion.button>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default UniversalConfirmModalBO;
