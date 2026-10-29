import React from 'react';
import { motion } from 'motion/react';
import { ChangePasswordScreen } from '../auth/ChangePasswordScreen';

export interface ChangePasswordModalProps {
  onClose: () => void;
  speak: (text: string) => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
        <ChangePasswordScreen />
      </div>
    </motion.div>
  );
}
