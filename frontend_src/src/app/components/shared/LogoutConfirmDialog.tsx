import { motion, AnimatePresence } from 'motion/react';

/**
 * Confirmation « panier en cours » avant une déconnexion volontaire (R3).
 * Présentation pure ; la logique vit dans useVoluntaryLogout.
 */
export function LogoutConfirmDialog({
  open,
  onConfirm,
  onCancel,
  color = '#C66A2C',
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  color?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog" aria-modal="true" aria-label="Confirmer la déconnexion"
        >
          <motion.div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-gray-900 mb-1">Une vente est en cours.</p>
            <p className="text-gray-600 mb-5">Si tu te déconnectes, ce panier sera effacé.</p>
            <button
              type="button"
              onClick={onCancel}
              className="w-full mb-2 py-4 rounded-2xl font-bold text-white"
              style={{ background: color }}
            >
              Continuer la vente
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold"
            >
              Se déconnecter et effacer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
