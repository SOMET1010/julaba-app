import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

const COLOR = '#9F8170';
const GRADIENT = 'linear-gradient(135deg,#9F8170,#B39485)';
const MAX_FAIL_COUNT = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const prefersReducedMotion = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function formatLockoutCountdown(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Section Paramètres : changement PIN identificateur (chiffrement AES côté API) */
export function IdentificateurPinChangeSection() {
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinLoading, setChangePinLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  // Refs pour annulation propre fetch et garde unmount
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const timedOutRef = useRef(false);
  const cycleIdRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      abortRef.current = null;
      timeoutRef.current = null;
      intervalRef.current = null;
    };
  }, []);

  const getRemainingLockoutMs = useCallback(() => Math.max(0, lockedUntil - now), [lockedUntil, now]);
  const remainingLockoutMs = getRemainingLockoutMs();
  const isLockedOut = remainingLockoutMs > 0;
  const pinErrorDescribedBy = changePinError || isLockedOut ? 'pin-change-error' : undefined;

  const closeModal = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timedOutRef.current = false;
    setShowChangePinModal(false);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setChangePinError('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    window.setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 0);
  }, []);

  const openModal = useCallback(() => {
    cycleIdRef.current += 1;
    setShowChangePinModal(true);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setChangePinError('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  }, []);

  useEffect(() => {
    if (!showChangePinModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !changePinLoading) {
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showChangePinModal, changePinLoading, closeModal]);

  useEffect(() => {
    if (lockedUntil <= 0 || lockedUntil <= now) {
      if (lockedUntil > 0) setLockedUntil(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    intervalRef.current = intervalId;
    return () => {
      window.clearInterval(intervalId);
      if (intervalRef.current === intervalId) {
        intervalRef.current = null;
      }
    };
  }, [lockedUntil, now]);

  const lockoutMessage = useMemo(
    () => `Trop de tentatives, attends ${formatLockoutCountdown(remainingLockoutMs)}`,
    [remainingLockoutMs],
  );

  const handleChangePin = async () => {
    const myCycleId = cycleIdRef.current;
    // Garde anti double soumission au niveau handler
    if (changePinLoading) return;

    setChangePinError('');

    if (isLockedOut) {
      setChangePinError(lockoutMessage);
      return;
    }

    if (oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      setChangePinError('Chaque code doit contenir exactement 4 chiffres');
      return;
    }
    if (!/^\d{4}$/.test(oldPin)) {
      setChangePinError('Ancien PIN invalide');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setChangePinError('Nouveau PIN invalide');
      return;
    }
    if (!/^\d{4}$/.test(confirmPin)) {
      setChangePinError('Confirmation invalide');
      return;
    }
    if (newPin !== confirmPin) {
      setChangePinError('La confirmation ne correspond pas au nouveau PIN');
      return;
    }
    if (newPin === oldPin) {
      setChangePinError('Le nouveau PIN doit être différent de l’ancien');
      return;
    }

    setChangePinLoading(true);

    // Annuler toute requête précédente encore en vol
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    timedOutRef.current = false;
    timeoutRef.current = window.setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, 15000);

    try {
      const res = await fetch(`${API_URL}/auth/identificateur/me/change-pin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin }),
        signal: controller.signal,
      });

      // Parsing JSON protégé (réponse non JSON possible si erreur infra)
      let data: { success?: boolean; message?: string } = {};
      try {
        data = await res.json() as { success?: boolean; message?: string };
      } catch {
        console.warn('[IdentificateurPinChangeSection] JSON parse failed');
      }

      if (!isMountedRef.current) return;
      if (cycleIdRef.current !== myCycleId) return;

      if (!res.ok || !data.success) {
        console.warn('[IdentificateurPinChangeSection] change PIN HTTP error:', res.status);
        const nextFailCount = failCount + 1;
        if (nextFailCount >= MAX_FAIL_COUNT) {
          const nextLockedUntil = Date.now() + LOCKOUT_DURATION_MS;
          setFailCount(0);
          setLockedUntil(nextLockedUntil);
          setNow(Date.now());
          setChangePinError(`Trop de tentatives, attends ${formatLockoutCountdown(nextLockedUntil - Date.now())}`);
          return;
        }
        setFailCount(nextFailCount);
        const message = typeof data.message === 'string' && data.message.trim()
          ? data.message
          : 'Impossible de modifier le PIN';
        setChangePinError(message);
        return;
      }
      toast.success('PIN modifié');
      setFailCount(0);
      setLockedUntil(0);
      closeModal();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (timedOutRef.current && isMountedRef.current && cycleIdRef.current === myCycleId) {
          setChangePinError('Délai dépassé, réessaie');
          toast.error('Délai dépassé, réessaie');
        }
        return;
      }
      console.warn('[IdentificateurPinChangeSection] change PIN failed:', err instanceof Error ? err.name : 'unknown');
      if (isMountedRef.current && cycleIdRef.current === myCycleId) {
        setChangePinError('Connexion impossible, réessaie');
        toast.error('Connexion impossible, réessaie');
      }
    } finally {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      abortRef.current = null;
      timedOutRef.current = false;
      if (isMountedRef.current && cycleIdRef.current === myCycleId) setChangePinLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden"
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
          style={{ background: `linear-gradient(90deg, ${COLOR}10 0%, transparent 100%)` }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}15` }}>
            <Lock className="w-5 h-5" style={{ color: COLOR }} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">Sécurité</h3>
            <p className="text-xs text-gray-500 mt-0.5">Code PIN à 4 chiffres pour modifier les fiches acteurs</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <motion.button
            ref={triggerButtonRef}
            type="button"
            onClick={openModal}
            className="w-full py-3.5 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2"
            style={{ background: GRADIENT }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            aria-haspopup="dialog"
            aria-expanded={showChangePinModal}
          >
            <Lock className="w-5 h-5" aria-hidden="true" />
            Changer mon code PIN
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showChangePinModal && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !changePinLoading && closeModal()} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-pin-title"
              className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${COLOR}20` }}>
                <Lock className="w-8 h-8" style={{ color: COLOR }} aria-hidden="true" />
              </div>
              <h3 id="change-pin-title" className="text-xl font-bold text-gray-900 text-center mb-2">Nouveau code PIN</h3>
              <p className="text-sm text-gray-600 text-center mb-6">Ancien code, puis nouveau (4 chiffres)</p>

              <div className="space-y-3 mb-2">
                <div className="relative">
                  <label htmlFor="pin-old-input" className="sr-only">Ancien code PIN</label>
                  <input
                    id="pin-old-input"
                    name="pin-old"
                    type={showOld ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="current-password"
                    autoFocus
                    maxLength={4}
                    value={oldPin}
                    disabled={changePinLoading || isLockedOut}
                    aria-invalid={changePinError || isLockedOut ? true : undefined}
                    aria-describedby={pinErrorDescribedBy}
                    onChange={e => { setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setChangePinError(''); }}
                    placeholder="Ancien PIN"
                    className="w-full text-lg h-12 rounded-2xl pl-4 pr-12 border-2 border-gray-200 focus:outline-none focus:border-gray-400"
                  />
                  <motion.button
                    type="button"
                    aria-label={showOld ? 'Masquer l’ancien PIN' : 'Afficher l’ancien PIN'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowOld(!showOld)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </motion.button>
                </div>
                <div className="relative">
                  <label htmlFor="pin-new-input" className="sr-only">Nouveau code PIN</label>
                  <input
                    id="pin-new-input"
                    name="pin-new"
                    type={showNew ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={newPin}
                    disabled={changePinLoading || isLockedOut}
                    aria-invalid={changePinError || isLockedOut ? true : undefined}
                    aria-describedby={pinErrorDescribedBy}
                    onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setChangePinError(''); }}
                    placeholder="Nouveau PIN"
                    className="w-full text-lg h-12 rounded-2xl pl-4 pr-12 border-2 border-gray-200 focus:outline-none focus:border-gray-400"
                  />
                  <motion.button
                    type="button"
                    aria-label={showNew ? 'Masquer le nouveau PIN' : 'Afficher le nouveau PIN'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowNew(!showNew)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </motion.button>
                </div>
                <div className="relative">
                  <label htmlFor="pin-confirm-input" className="sr-only">Confirmer le nouveau code PIN</label>
                  <input
                    id="pin-confirm-input"
                    name="pin-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={confirmPin}
                    disabled={changePinLoading || isLockedOut}
                    aria-invalid={changePinError || isLockedOut ? true : undefined}
                    aria-describedby={pinErrorDescribedBy}
                    onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setChangePinError(''); }}
                    onKeyDown={e => {
                      if (
                        e.key === 'Enter'
                        && oldPin.length === 4
                        && newPin.length === 4
                        && confirmPin.length === 4
                        && !changePinLoading
                        && !isLockedOut
                      ) {
                        void handleChangePin();
                      }
                    }}
                    placeholder="Confirmer le nouveau PIN"
                    className="w-full text-lg h-12 rounded-2xl pl-4 pr-12 border-2 border-gray-200 focus:outline-none focus:border-gray-400"
                  />
                  <motion.button
                    type="button"
                    aria-label={showConfirm ? 'Masquer la confirmation du PIN' : 'Afficher la confirmation du PIN'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowConfirm(!showConfirm)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </motion.button>
                </div>
              </div>

              {isLockedOut && (
                <p id="pin-change-error" role="alert" aria-live="assertive" className="text-orange-500 text-sm text-center mb-4">
                  {lockoutMessage}
                </p>
              )}
              {!isLockedOut && changePinError && (
                <p id="pin-change-error" role="alert" aria-live="assertive" className="text-red-500 text-sm text-center mb-4">
                  {changePinError}
                </p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  disabled={changePinLoading}
                  onClick={closeModal}
                  className="flex-1 h-12 rounded-2xl font-bold text-gray-700 bg-gray-100 border-2 border-gray-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={changePinLoading || isLockedOut}
                  aria-busy={changePinLoading ? 'true' : undefined}
                  onClick={() => void handleChangePin()}
                  className="flex-1 h-12 rounded-2xl font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: GRADIENT }}
                >
                  {changePinLoading ? (
                    <>
                      <motion.span
                        className="inline-flex items-center justify-center"
                        animate={prefersReducedMotion ? {} : { rotate: 360 }}
                        transition={prefersReducedMotion ? {} : { duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-5 h-5" aria-hidden="true" />
                      </motion.span>
                      <span className="sr-only">Modification en cours</span>
                    </>
                  ) : (
                    'Valider'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
