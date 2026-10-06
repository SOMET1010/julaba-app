import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from '../../ui/dialog';
import { BO_LIGHT, BO_PRIMARY, BO_TINT } from '../bo-theme';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CONFIG: Record<ModalSize, string> = {
  sm: '400px',
  md: '520px',
  lg: '680px',
  xl: '900px',
};

export interface UniversalModalBOProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  ariaLabelledBy?: string;
}

interface AnimatedIconProps {
  icon: LucideIcon;
  size: number;
  color?: string;
}

function AnimatedIcon({ icon: Icon, size, color }: AnimatedIconProps) {
  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
    >
      <Icon size={size} style={{ color }} />
    </motion.div>
  );
}

export function UniversalModalBO({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = BO_PRIMARY,
  iconBg,
  children,
  footer,
  size = 'md',
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = true,
  ariaLabelledBy,
}: UniversalModalBOProps) {
  const generatedTitleId = React.useId();
  const generatedDescriptionId = React.useId();
  const titleId = ariaLabelledBy || generatedTitleId;
  const descriptionId = subtitle ? generatedDescriptionId : undefined;
  const computedIconBg = iconBg || `${iconColor}15`;
  const portalTarget = typeof document === 'undefined' ? null : document.body;

  if (!portalTarget) return null;

  return createPortal(
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <>
            <DialogOverlay
              forceMount
              className="fixed inset-0"
              style={{ background: `${BO_PRIMARY}80`, zIndex: 1000 }}
            />
            <DialogPrimitive.Content
              forceMount
              asChild
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              onEscapeKeyDown={(event) => {
                if (!closeOnEscape) event.preventDefault();
              }}
              onPointerDownOutside={(event) => {
                if (!closeOnClickOutside) event.preventDefault();
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: '-50%', y: 'calc(-50% + 20px)', scale: 0.95 }}
                animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
                exit={{ opacity: 0, x: '-50%', y: 'calc(-50% + 20px)', scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed left-[50%] top-[50%] bg-white shadow-xl outline-none"
                style={{
                  zIndex: 1001,
                  width: 'calc(100% - 32px)',
                  maxWidth: SIZE_CONFIG[size],
                  maxHeight: 'calc(100vh - 32px)',
                  borderRadius: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {Icon && (
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="flex items-center justify-center flex-shrink-0"
                        style={{ width: 44, height: 44, background: computedIconBg, borderRadius: 12 }}
                      >
                        <Icon size={22} style={{ color: iconColor }} />
                      </motion.div>
                    )}
                    <div className="min-w-0">
                      <DialogTitle id={titleId} className="text-lg font-black text-gray-900 truncate m-0">
                        {title}
                      </DialogTitle>
                      {subtitle && (
                        <DialogDescription id={descriptionId} className="text-sm text-gray-500 mt-0.5 m-0">
                          {subtitle}
                        </DialogDescription>
                      )}
                    </div>
                  </div>
                  {showCloseButton && (
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

                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  {children}
                </div>

                {footer && (
                  <div className="border-t border-gray-100 p-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {footer}
                  </div>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </>
        )}
      </AnimatePresence>
    </Dialog>,
    document.body
  );
}

export default UniversalModalBO;
