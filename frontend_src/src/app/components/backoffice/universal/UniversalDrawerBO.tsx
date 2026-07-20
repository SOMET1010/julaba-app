import { ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

type UniversalDrawerBOProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  width?: number;
  ariaLabel?: string;
  children: ReactNode;
};

export function UniversalDrawerBO({
  open,
  onClose,
  title,
  width = 480,
  ariaLabel = 'Panneau latéral',
  children,
}: UniversalDrawerBOProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: `${width}px`,
          maxWidth: '90vw',
          backgroundColor: '#FFFFFF',
          borderLeft: '0.5px solid #E5E7EB',
          zIndex: 9999,
          overflowY: 'auto',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.08)',
        }}
        initial="closed"
        animate="open"
        exit="closed"
        variants={{
          open: { x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
          closed: { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
        }}
      >
        <div
          className="flex items-start justify-between gap-4"
          style={{ padding: '20px', borderBottom: '0.5px solid #E5E7EB' }}
        >
          <div className="min-w-0 flex-1">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
