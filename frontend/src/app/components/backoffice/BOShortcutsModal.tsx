import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Keyboard, X } from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';

interface BOShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BOShortcutsModal({ isOpen, onClose }: BOShortcutsModalProps) {
  const cmdKey = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl';
    const ua = navigator.userAgent || '';
    const isMac =
      navigator.platform.includes('Mac') ||
      ua.includes('Macintosh') ||
      ua.includes('Mac OS');
    return isMac ? 'Cmd' : 'Ctrl';
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl rounded-3xl bg-white border-2 shadow-2xl overflow-hidden"
            style={{ borderColor: `${BO_PRIMARY}35` }}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div
              className="px-6 py-5 border-b"
              style={{
                background: `linear-gradient(135deg, ${BO_PRIMARY}12 0%, ${BO_PRIMARY}05 100%)`,
                borderColor: `${BO_PRIMARY}20`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center border"
                    style={{ backgroundColor: `${BO_PRIMARY}18`, borderColor: `${BO_PRIMARY}28` }}
                  >
                    <Keyboard className="w-5 h-5" style={{ color: BO_PRIMARY }} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="shortcuts-modal-title" className="text-lg font-black text-gray-900">
                      Raccourcis clavier
                    </h2>
                    <p className="text-sm text-gray-600">Naviguez plus rapidement dans le Back-Office</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-2xl border bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                  aria-label="Fermer la fenêtre des raccourcis"
                >
                  <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {[
                { keys: `${cmdKey}+K`, description: 'Focus la recherche globale' },
                { keys: `${cmdKey}+N`, description: 'Nouvelle action contextuelle' },
                { keys: 'Échap', description: 'Fermer la fenêtre ou le modal actif' },
              ].map(item => (
                <div
                  key={item.keys}
                  className="rounded-2xl border px-4 py-3 flex items-center justify-between gap-3"
                  style={{ borderColor: `${BO_PRIMARY}22`, backgroundColor: '#FFFFFF' }}
                >
                  <p className="text-sm font-medium text-gray-700">{item.description}</p>
                  <kbd className="px-2.5 py-1 rounded-lg border bg-gray-50 text-xs font-black text-gray-700 border-gray-200">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                Astuce : utilisez {cmdKey}+K depuis n’importe quelle page pour accéder à tous les modules.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
