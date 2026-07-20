import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Flag, X, Copy, AlertTriangle, ShieldX, MoreHorizontal, Info } from 'lucide-react';
import { boCreateUserFlag } from '../../services/backoffice-api';

const BO_PRIMARY = '#9F8170';
const BO_DARK = '#4A3F38';
const BO_PRIMARY_BG = '#F9F5F0';

type FlagTypeValue = 'doublon' | 'fraude' | 'abus' | 'autre';

interface FlagTypeOption {
  value: FlagTypeValue;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const FLAG_TYPES: FlagTypeOption[] = [
  { value: 'doublon', label: 'Doublon', Icon: Copy },
  { value: 'fraude', label: 'Fraude', Icon: AlertTriangle },
  { value: 'abus', label: 'Abus', Icon: ShieldX },
  { value: 'autre', label: 'Autre', Icon: MoreHorizontal },
];

export interface SignalementModalActeur {
  id: string;
  prenom?: string;
  prenoms?: string;
  nom?: string;
  role?: string;
  type?: string;
}

interface Props {
  acteur: SignalementModalActeur | null;
  onClose: () => void;
  onSuccess: (flag: { id: string; raison: string }) => void;
}

export default function SignalementModal({ acteur, onClose, onSuccess }: Props) {
  const [flagType, setFlagType] = useState<FlagTypeValue>('doublon');
  const [raison, setRaison] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const firstFieldRef = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!acteur) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setFlagType('doublon');
    setRaison('');
    setCommentaire('');
    setErrorMsg(null);
    submittedRef.current = false;
  }, [acteur?.id]);

  useEffect(() => {
    if (acteur && firstFieldRef.current) firstFieldRef.current.focus();
  }, [acteur]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const acteurNom = useMemo(() => {
    if (!acteur) return 'Acteur';
    const p = (acteur.prenoms || acteur.prenom || '').trim();
    const n = (acteur.nom || '').trim();
    const full = `${p} ${n}`.trim();
    return full || 'Acteur';
  }, [acteur]);

  const roleLabel = useMemo(() => {
    if (!acteur) return '';
    const r = (acteur.role || acteur.type || '').trim();
    if (!r) return '';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [acteur]);

  const formValid = useMemo(() => {
    const rOk = raison.trim().length >= 1 && raison.trim().length <= 500;
    const c = commentaire.trim();
    const cOk = c.length === 0 || (c.length >= 10 && c.length <= 2000);
    return rOk && cOk;
  }, [raison, commentaire]);

  const commentaireInvalidHint =
    commentaire.trim().length > 0
    && (commentaire.trim().length < 10 || commentaire.trim().length > 2000);

  if (!acteur) return null;

  const handleSubmit = async () => {
    if (!formValid || submitting || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setErrorMsg(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await boCreateUserFlag(
        {
          userId: acteur.id,
          flagType,
          raison: raison.trim(),
          commentaire: commentaire.trim() ? commentaire.trim() : undefined,
        },
        abortRef.current.signal,
      );
      onSuccess({ id: result.id, raison: raison.trim() });
      onClose();
    } catch (e) {
      submittedRef.current = false;
      if (e instanceof Error && e.name === 'AbortError') return;
      setErrorMsg(e instanceof Error ? e.message : 'Erreur lors de l\u2019envoi du signalement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signalement-modal-title"
        className="w-full max-w-[480px] bg-white p-6"
        style={{ border: `2px solid ${BO_PRIMARY}`, borderRadius: 24 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 44, height: 44, background: '#FCEBEB', borderRadius: 12 }}
            >
              <Flag className="w-5 h-5" style={{ color: '#A32D2D' }} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="signalement-modal-title"
                className="text-lg font-medium text-gray-900 m-0"
              >
                Signaler cet acteur
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 m-0">
                {acteurNom}
                {roleLabel ? ` \u00b7 ${roleLabel}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="w-4 h-4 text-gray-600" aria-hidden="true" />
          </button>
        </div>

        <div className="h-px bg-gray-200 my-4" />

        <div className="mb-4">
          <p className="block text-xs font-medium text-gray-900 mb-2 m-0">
            Type de signalement
            {' '}
            <span style={{ color: '#A32D2D' }}>*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FLAG_TYPES.map((opt, idx) => {
              const selected = flagType === opt.value;
              const IconCmp = opt.Icon;
              return (
                <button
                  key={opt.value}
                  ref={idx === 0 ? firstFieldRef : undefined}
                  type="button"
                  onClick={() => setFlagType(opt.value)}
                  aria-pressed={selected}
                  className="flex items-center gap-2 px-3 py-2.5 transition-colors"
                  style={{
                    border: selected ? `2px solid ${BO_PRIMARY}` : '0.5px solid #E5E7EB',
                    background: selected ? BO_PRIMARY_BG : '#FFFFFF',
                    borderRadius: 12,
                    color: selected ? BO_DARK : '#6B7280',
                    fontWeight: selected ? 500 : 400,
                  }}
                >
                  <IconCmp className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="signalement-raison" className="block text-xs font-medium text-gray-900 mb-2">
            Raison
            {' '}
            <span style={{ color: '#A32D2D' }}>*</span>
          </label>
          <input
            id="signalement-raison"
            type="text"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            maxLength={500}
            placeholder="R\u00e9sumer en une phrase courte"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#9F8170]"
          />
          <p className="text-[11px] text-gray-400 mt-1 m-0">
            {`Obligatoire. Entre 1 et 500 caract\u00e8res. (${raison.trim().length}/500)`}
          </p>
        </div>

        <div className="mb-5">
          <label htmlFor="signalement-commentaire" className="block text-xs font-medium text-gray-900 mb-2">
            Commentaire d\u00e9taill\u00e9
            {' '}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            id="signalement-commentaire"
            rows={3}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            maxLength={2000}
            placeholder="Ajouter du contexte, des r\u00e9f\u00e9rences, des num\u00e9ros de dossier..."
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-y focus:outline-none focus:border-[#9F8170]"
            style={{ fontFamily: 'inherit' }}
          />
          <p className="text-[11px] text-gray-400 mt-1 m-0">
            {`Si rempli : minimum 10 caract\u00e8res, maximum 2000. (${commentaire.trim().length}/2000)`}
          </p>
          {commentaireInvalidHint && (
            <p className="text-[11px] mt-1 m-0" style={{ color: '#A32D2D' }}>
              Le commentaire doit faire au moins 10 caract\u00e8res s\u2019il est rempli.
            </p>
          )}
        </div>

        <div
          className="flex items-start gap-2 mb-5 px-3 py-2.5"
          style={{
            background: '#FAEEDA',
            borderLeft: '3px solid #BA7517',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#854F0B' }} aria-hidden="true" />
          <p className="text-xs m-0 leading-relaxed" style={{ color: '#633806' }}>
            Ce signalement sera transmis aux super-administrateurs. Une notification leur sera envoy\u00e9e.
          </p>
        </div>

        {errorMsg && (
          <div
            className="mb-4 px-3 py-2.5 text-xs"
            style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 12 }}
            role="alert"
          >
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!formValid || submitting}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: BO_DARK }}
          >
            <Flag className="w-4 h-4" aria-hidden="true" />
            {submitting ? 'Envoi...' : 'Signaler'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
