import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMarchesByCommune, type MarcheItem } from '../../hooks/useMarchesByCommune';

export interface MarcheSelectProps {
  commune: string;
  value: string;
  onChange: (nom: string) => void;
  color: string;
  error?: string;
}

function TablerIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  return <i className={`ti ti-${name}${className ? ` ${className}` : ''}`} style={style} aria-hidden="true" />;
}

export function MarcheSelect({ commune, value, onChange, color, error }: MarcheSelectProps) {
  const { marches, allMarches, loading, suggestMarche } = useMarchesByCommune(commune || undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const displayedMarches = useMemo(() => {
    const list = showAll ? allMarches : marches;
    return [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [showAll, allMarches, marches]);

  const selectedMarche = useMemo(
    () => allMarches.find(m => m.nom === value) ?? marches.find(m => m.nom === value),
    [allMarches, marches, value],
  );

  const handleSelect = (m: MarcheItem) => {
    onChange(m.nom);
    setSubmitted(false);
    setIsOpen(false);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [commune]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleSubmitSuggestion = async () => {
    const nom = newNom.trim();
    if (!nom || !commune.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    const created = await suggestMarche(nom, commune);
    setSubmitting(false);
    if (!created) {
      setSubmitError('Envoi impossible. Réessaie.');
      return;
    }
    setSubmitted(true);
    setModalOpen(false);
    setNewNom('');
    onChange(created.nom);
    setIsOpen(false);
  };

  const radiusMd = 'var(--border-radius-md, 12px)';
  const radiusLg = 'var(--border-radius-lg, 16px)';

  return (
    <motion.div className="space-y-3">
      {!commune.trim() ? (
        <motion.div
          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500"
          style={{ border: '2px solid #E5E7EB', borderRadius: radiusLg }}
        >
          <TablerIcon name="map-pin" />
          <span>Choisir d&apos;abord la commune</span>
        </motion.div>
      ) : (
        <>
          {loading && isOpen && (
            <p className="text-sm text-gray-500 px-1" role="status">Chargement des marchés…</p>
          )}

          <motion.button
            type="button"
            onClick={() => setIsOpen(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-0"
            style={{
              border: `2px solid ${error ? '#ef4444' : isOpen ? color : '#E5E7EB'}`,
              borderRadius: radiusLg,
              background: '#fff',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <TablerIcon
              name="building-store"
              style={{ color: selectedMarche ? color : '#9CA3AF', fontSize: '1.15rem', flexShrink: 0 }}
            />
            <span className="flex-1 min-w-0">
              {selectedMarche ? (
                <>
                  <span
                    className="block font-semibold text-gray-900 truncate"
                    style={{ color }}
                  >
                    {selectedMarche.nom}
                  </span>
                  <span className="block text-xs text-gray-500 truncate">
                    {selectedMarche.commune}
                  </span>
                </>
              ) : (
                <span className="block text-sm font-semibold text-gray-500">
                  Choisir un marché…
                </span>
              )}
            </span>
            <TablerIcon
              name="chevron-down"
              style={{
                color: '#9CA3AF',
                fontSize: '1.1rem',
                flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </motion.button>

          {isOpen && (
            <motion.div
              className="overflow-hidden"
              style={{ border: `2px solid ${error ? '#ef4444' : '#E5E7EB'}`, borderRadius: radiusLg }}
            >
              <motion.div className="max-h-52 overflow-y-auto">
                {displayedMarches.length === 0 && !loading ? (
                  <motion.div className="px-4 py-6 text-center text-sm text-gray-500">
                    Aucun marché pour cette commune
                  </motion.div>
                ) : (
                  displayedMarches.map(m => {
                    const active = value === m.nom;
                    return (
                      <motion.button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelect(m)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left border-0 border-b border-gray-100 last:border-b-0"
                        style={{
                          background: active ? `${color}1A` : '#fff',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                        }}
                        aria-pressed={active}
                      >
                        <TablerIcon
                          name="building-store"
                          style={{ color: active ? color : '#9CA3AF', fontSize: '1.15rem', flexShrink: 0 }}
                        />
                        <motion.span className="flex-1 min-w-0">
                          <span
                            className="block font-semibold text-gray-900 truncate"
                            style={{ color: active ? color : undefined }}
                          >
                            {m.nom}
                          </span>
                          {showAll && m.commune && (
                            <span className="block text-xs text-gray-500 truncate">{m.commune}</span>
                          )}
                        </motion.span>
                        {active && (
                          <TablerIcon name="check" style={{ color, fontSize: '1.1rem', flexShrink: 0 }} />
                        )}
                      </motion.button>
                    );
                  })
                )}
              </motion.div>

              <motion.div style={{ borderTop: '1px solid #E5E7EB' }} />

              <motion.button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold bg-white border-0"
                style={{ color, fontFamily: 'inherit', cursor: 'pointer' }}
                aria-expanded={showAll}
              >
                <span className="flex items-center gap-2">
                  <TablerIcon name="building-store" />
                  Voir tous les marchés
                </span>
                <TablerIcon
                  name="chevron-down"
                  style={{
                    transform: showAll ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </motion.button>

              <motion.div style={{ borderTop: '1px solid #E5E7EB' }} />

              <motion.button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setModalOpen(true);
                  setSubmitError('');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold border-0"
                style={{
                  background: '#FFF7ED',
                  borderTop: '1.5px solid #C66A2C',
                  color: '#C66A2C',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <TablerIcon name="plus" />
                Ajouter un nouveau marché
              </motion.button>
            </motion.div>
          )}

          {submitted && (
            <motion.div
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-green-800"
              style={{ background: '#DCFCE7', borderRadius: radiusMd, border: '1.5px solid #86EFAC' }}
              role="status"
            >
              <TablerIcon name="check" />
              Marché soumis au BackOffice
            </motion.div>
          )}
        </>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => !submitting && setModalOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-white overflow-y-auto"
              style={{ borderRadius: `${radiusLg} ${radiusLg} 0 0`, maxHeight: '90vh' }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="marche-suggest-title"
            >
              <motion.div className="flex justify-center pt-3 pb-2">
                <motion.div className="w-10 h-1 rounded-full bg-gray-300" />
              </motion.div>

              <motion.div className="px-5 pb-6 space-y-4">
                <motion.div className="flex items-center justify-between gap-3">
                  <h3 id="marche-suggest-title" className="text-lg font-black text-gray-900">
                    Nouveau marché
                  </h3>
                  <motion.button
                    type="button"
                    onClick={() => !submitting && setModalOpen(false)}
                    className="p-2 rounded-full border-0 bg-gray-100"
                    style={{ cursor: 'pointer' }}
                    aria-label="Fermer"
                  >
                    <TablerIcon name="x" />
                  </motion.button>
                </motion.div>

                <motion.div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nom du marché <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newNom}
                    onChange={e => setNewNom(e.target.value)}
                    placeholder="Ex : Marché de…"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900"
                    style={{ fontSize: '0.95rem' }}
                    onFocus={e => { e.target.style.borderColor = color; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </motion.div>

                <motion.div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Commune</label>
                  <input
                    type="text"
                    value={commune}
                    readOnly
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-600 font-semibold"
                    style={{ fontSize: '0.95rem' }}
                  />
                </motion.div>

                <motion.div
                  className="flex gap-3 p-3 text-sm text-blue-800"
                  style={{ background: '#EFF6FF', borderRadius: radiusMd, border: '1.5px solid #BFDBFE' }}
                >
                  <TablerIcon name="info-circle" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p>
                    Votre suggestion sera vérifiée par le BackOffice avant d&apos;être visible pour tous les identificateurs.
                  </p>
                </motion.div>

                {submitError && (
                  <p className="text-sm text-red-600 font-semibold" role="alert">{submitError}</p>
                )}

                <motion.button
                  type="button"
                  disabled={submitting || !newNom.trim()}
                  onClick={handleSubmitSuggestion}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold border-0 disabled:opacity-50"
                  style={{ backgroundColor: color, cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                >
                  <TablerIcon name="send" />
                  {submitting ? 'Envoi…' : 'Soumettre au BackOffice'}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
