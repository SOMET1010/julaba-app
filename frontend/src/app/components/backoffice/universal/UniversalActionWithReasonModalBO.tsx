import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { UniversalModalBO } from './UniversalModalBO';
import { BO_PRIMARY } from '../bo-theme';

const BO_DANGER = '#DC2626';
const BO_WARNING = '#D97706';

export interface UniversalActionWithReasonModalBOProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title: string;
  subtitle?: string;
  message: string;
  icon?: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'info' | 'warning' | 'danger';
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonMinLength?: number;
  reasonMaxLength?: number;
  loading?: boolean;
}

export function UniversalActionWithReasonModalBO({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  message,
  icon,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  severity = 'warning',
  reasonLabel = 'Motif (obligatoire)',
  reasonPlaceholder = 'Expliquez la raison de cette action en au moins 5 caractères...',
  reasonMinLength = 5,
  reasonMaxLength = 500,
  loading = false,
}: UniversalActionWithReasonModalBOProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const isValid = trimmedReason.length >= reasonMinLength && trimmedReason.length <= reasonMaxLength;
  const showError = touched && !isValid;
  const severityColor = severity === 'danger' ? BO_DANGER : severity === 'warning' ? BO_WARNING : BO_PRIMARY;

  const handleConfirm = async () => {
    setTouched(true);
    if (!isValid || loading) return;
    await onConfirm(trimmedReason);
  };

  return (
    <UniversalModalBO
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconColor={severityColor}
      size="md"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#FFFFFF',
              border: '1.5px solid #E5E7EB',
              borderRadius: 10,
              color: '#4B5563',
              fontWeight: 500,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <motion.button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !isValid}
            whileHover={{ scale: !loading && isValid ? 1.02 : 1 }}
            whileTap={{ scale: !loading && isValid ? 0.98 : 1 }}
            style={{
              padding: '8px 16px',
              background: !isValid ? '#E5E7EB' : severityColor,
              border: 'none',
              borderRadius: 10,
              color: !isValid ? '#9CA3AF' : '#FFFFFF',
              fontWeight: 600,
              fontSize: 13,
              cursor: loading || !isValid ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'En cours...' : confirmLabel}
          </motion.button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 14, color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#1F1F1F',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}
          >
            {reasonLabel}
          </label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={reasonPlaceholder}
            maxLength={reasonMaxLength}
            disabled={loading}
            rows={4}
            style={{
              padding: '10px 12px',
              background: '#FAFAF8',
              border: `1.5px solid ${showError ? BO_DANGER : '#E5E7EB'}`,
              borderRadius: 10,
              fontSize: 13,
              color: '#1F1F1F',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 80,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {showError ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: BO_DANGER }}>
                <AlertCircle size={12} />
                Minimum {reasonMinLength} caractères requis
              </span>
            ) : (
              <span />
            )}
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {reason.length} / {reasonMaxLength}
            </span>
          </div>
        </div>
      </div>
    </UniversalModalBO>
  );
}

export default UniversalActionWithReasonModalBO;
