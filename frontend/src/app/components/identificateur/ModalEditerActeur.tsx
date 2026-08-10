import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Check,
  Loader2,
  Briefcase,
  MapPin,
  Shield,
} from 'lucide-react';
import { ROLE_COLORS } from '../../config/roleConfig';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { compressImage } from '../../utils/imageCompression';

const PRIMARY = ROLE_COLORS.identificateur;
// Gradient secondaire propre à ce composant (teinte plus chaude que PRIMARY pour le bouton CTA)
// TODO backlog : harmoniser les gradients secondaires identificateur cross-module
const SECONDARY_GRADIENT_END = '#B39485';

// Validation upload photo
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE_MB = 5;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const repeatLoop = prefersReducedMotion ? 0 : Infinity;

interface ModalEditerActeurProps {
  isOpen: boolean;
  onClose: () => void;
  acteur: {
    id: string;
    firstName: string;
    lastName: string;
    activity?: string;
    market?: string;
    commune?: string;
    photoUrl?: string;
  };
  onSaved: (updates: { activity?: string; market?: string; photoUrl?: string; commune?: string }) => void;
}

export function ModalEditerActeur({ isOpen, onClose, acteur, onSaved }: ModalEditerActeurProps) {
  const [activity, setActivity] = useState(acteur.activity || '');
  const [market, setMarket] = useState(acteur.market || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [marketSuggestions, setMarketSuggestions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const isMountedRef = useRef(true);
  const searchAbortRef = useRef<AbortController | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);

  const handleClose = useCallback(() => {
    const el = triggerElementRef.current;
    triggerElementRef.current = null;
    try {
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
    } catch {
      /* noop */
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (searchAbortRef.current) searchAbortRef.current.abort();
      if (saveAbortRef.current) saveAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      setActivity(acteur.activity || '');
      setMarket(acteur.market || '');
      setPhotoPreview(null);
      setPhotoFile(null);
      setError(null);
      setPhotoMenuOpen(false);
    }
    // Stabilite reference acteur : reset seulement si ouverture ou changement d'id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, acteur.id]);

  useEffect(() => {
    if (!market || market.length < 2) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      setMarketSuggestions([]);
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timeoutId = setTimeout(async () => {
      try {
        let data: any = {};
        try {
          data = await apiRequest<any>(API_URL, `/users/search-identificateur?q=${encodeURIComponent(market)}&limit=20`, { method: 'GET', signal: controller.signal });
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.warn('[ModalEditerActeur] search failed:', err instanceof Error ? err.message : err);
          return;
        }
        const users = Array.isArray(data?.results) ? data.results : [];
        const markets = new Set<string>();
        users.forEach((u: any) => {
          if (u.market && u.market.toLowerCase().includes(market.toLowerCase())) {
            markets.add(u.market);
          }
        });
        if (isMountedRef.current) {
          setMarketSuggestions(Array.from(markets).slice(0, 5));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[ModalEditerActeur] market suggestions failed:', err instanceof Error ? err.message : err);
      }
    }, 300);
    return () => {
      clearTimeout(timeoutId);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
    };
  }, [market]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSaving, handleClose]);

  const handlePhotoSelected = async (file: File) => {
    if (!file) return;
    if (isSaving) return;

    setError(null);

    if (!ALLOWED_PHOTO_MIME.includes(file.type)) {
      setError('Format non supporté. Utilise une photo JPG, PNG ou WEBP.');
      setPhotoMenuOpen(false);
      return;
    }

    setPhotoFile(file);

    try {
      const compressedDataUrl = await compressImage(file, { maxWidthPx: 1024, maxSizeKb: 200 });

      const approxBytes = Math.ceil((compressedDataUrl.length * 3) / 4);
      const approxMB = approxBytes / (1024 * 1024);
      if (approxMB > MAX_PHOTO_SIZE_MB) {
        setError(`Photo trop lourde après compression (${approxMB.toFixed(1)} Mo). Maximum ${MAX_PHOTO_SIZE_MB} Mo.`);
        setPhotoFile(null);
        setPhotoMenuOpen(false);
        return;
      }

      if (isMountedRef.current) setPhotoPreview(compressedDataUrl);
    } catch (err) {
      console.warn('[ModalEditerActeur] image compression failed, using FileReader fallback:', err instanceof Error ? err.message : err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const approxBytesFallback = Math.ceil((result.length * 3) / 4);
        const approxMBFallback = approxBytesFallback / (1024 * 1024);
        if (approxMBFallback > MAX_PHOTO_SIZE_MB) {
          if (isMountedRef.current) {
            setError(
              `Photo trop volumineuse (après échec compression). Limite : ${MAX_PHOTO_SIZE_MB} Mo. Utilise une photo plus petite.`
            );
            setPhotoFile(null);
            setPhotoPreview(null);
          }
          return;
        }
        if (isMountedRef.current) setPhotoPreview(result);
      };
      reader.onerror = () => {
        console.warn('[ModalEditerActeur] FileReader fallback failed:', reader.error?.message);
        if (isMountedRef.current) {
          setError('Impossible de charger l\u2019image. Réessaie avec une autre photo.');
        }
      };
      reader.readAsDataURL(file);
    }
    setPhotoMenuOpen(false);
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handlePhotoSelected(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (isSaving) return;

    setError(null);
    setIsSaving(true);

    if (saveAbortRef.current) saveAbortRef.current.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    const updates: Record<string, string> = {};
    if (activity !== (acteur.activity || '')) updates.activity = activity.trim();
    if (market !== (acteur.market || '')) updates.market = market.trim();

    let patchApplied = false;
    let newPhotoUrl: string | undefined;

    try {
      if (Object.keys(updates).length > 0) {
        await apiRequest(API_URL, `/users/${acteur.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
          signal: controller.signal,
        });
        patchApplied = true;
      }

      if (photoFile && photoPreview) {
        setIsUploadingPhoto(true);
        try {
          const dataUrlRes = await fetch(photoPreview);
          const compressedBlob = await dataUrlRes.blob();

          const ext = compressedBlob.type.split('/')[1] || 'jpg';
          const compressedFile = new File(
            [compressedBlob],
            `photo_${Date.now()}.${ext}`,
            { type: compressedBlob.type },
          );

          const formData = new FormData();
          formData.append('file', compressedFile);

          let photoData: any = {};
          try {
            photoData = await apiRequest<any>(API_URL, `/users/${acteur.id}/photo`, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            });
          } catch (errPhoto) {
            if (errPhoto instanceof DOMException && errPhoto.name === 'AbortError') throw errPhoto;
            throw new Error(errPhoto instanceof Error ? errPhoto.message : 'Erreur lors de l\u2019upload de la photo');
          }
          newPhotoUrl = photoData.photoUrl;
        } catch (inner) {
          if (inner instanceof DOMException && inner.name === 'AbortError') throw inner;
          if (isMountedRef.current) {
            setIsUploadingPhoto(false);
            if (patchApplied) {
              const partial: { activity?: string; market?: string } = {};
              if (updates.activity !== undefined) partial.activity = updates.activity;
              if (updates.market !== undefined) partial.market = updates.market;
              onSaved(partial);
              setError(
                'Tes infos ont été enregistrées mais la photo n\u2019a pas pu être mise à jour. Réessaie pour la photo.',
              );
            } else {
              setError('La photo n\u2019a pas pu être mise à jour. Réessaie avec une autre photo.');
            }
          }
          return;
        }
        if (isMountedRef.current) setIsUploadingPhoto(false);
      } else if (photoFile && !photoPreview) {
        throw new Error('Photo compressée indisponible (preview manquante)');
      }

      if (!isMountedRef.current) return;

      const savedPayload: { activity?: string; market?: string; photoUrl?: string } = {};
      if (updates.activity !== undefined) savedPayload.activity = updates.activity;
      if (updates.market !== undefined) savedPayload.market = updates.market;
      if (newPhotoUrl !== undefined) savedPayload.photoUrl = newPhotoUrl;

      onSaved(savedPayload);
      handleClose();
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.warn('[ModalEditerActeur] save failed:', e instanceof Error ? e.message : e);
      if (isMountedRef.current) setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      window.clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setIsSaving(false);
        setIsUploadingPhoto(false);
      }
    }
  };

  const btnHoverSmall = prefersReducedMotion ? {} : { scale: 1.02 };
  const btnTapSmall = prefersReducedMotion ? {} : { scale: 0.97 };
  const btnHoverXs = prefersReducedMotion ? {} : { scale: 1.05 };
  const btnTapXs = prefersReducedMotion ? {} : { scale: 0.92 };
  const menuItemHover = prefersReducedMotion ? {} : { x: 2 };
  const menuItemTap = prefersReducedMotion ? {} : { scale: 0.98 };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        onClick={() => {
          if (!isSaving) handleClose();
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-editer-acteur-title"
          aria-busy={isSaving}
          initial={{ y: prefersReducedMotion ? 0 : '100%', opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: prefersReducedMotion ? 0 : '100%', opacity: prefersReducedMotion ? 1 : 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 25 }}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 id="modal-editer-acteur-title" className="text-lg font-bold text-gray-900">
                Modifier {acteur.firstName}
              </h2>
              <span className="sr-only" aria-live="polite">
                {isSaving ? 'Sauvegarde en cours' : ''}
              </span>
            </div>
            <motion.button
              type="button"
              aria-label="Fermer la fenêtre de modification"
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
              disabled={isSaving}
              whileHover={!isSaving ? btnHoverXs : undefined}
              whileTap={!isSaving ? btnTapXs : undefined}
            >
              <X className="h-4 w-4 text-gray-600" aria-hidden="true" />
            </motion.button>
          </div>

          <div
            className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
            role="status"
            aria-live="polite"
          >
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-sm font-medium text-amber-900">
              Écran sensible. Ne pas capturer ni partager cet écran.
            </p>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold text-gray-700">Photo</label>
            <div className="flex items-center gap-4">
              <div
                className="relative h-24 w-24 overflow-hidden rounded-2xl border-2"
                style={{ borderColor: `${PRIMARY}30` }}
              >
                {photoPreview || acteur.photoUrl ? (
                  <img
                    src={photoPreview || acteur.photoUrl}
                    alt={`Photo de ${acteur.firstName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {(acteur.firstName || acteur.lastName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <motion.span
                      className="inline-flex"
                      animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
                      transition={{ duration: 1, repeat: repeatLoop, ease: 'linear' }}
                    >
                      <Loader2 className="h-6 w-6 text-white" aria-hidden="true" />
                    </motion.span>
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <motion.button
                  type="button"
                  onClick={() => setPhotoMenuOpen(!photoMenuOpen)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
                  disabled={isSaving}
                  aria-expanded={photoMenuOpen}
                  aria-haspopup="menu"
                  whileHover={!isSaving ? btnHoverSmall : undefined}
                  whileTap={!isSaving ? btnTapSmall : undefined}
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Changer la photo
                </motion.button>
                {photoMenuOpen && (
                  <motion.div
                    role="menu"
                    initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={prefersReducedMotion ? { duration: 0 } : undefined}
                    className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-lg"
                  >
                    <motion.button
                      type="button"
                      role="menuitem"
                      onClick={handleCameraClick}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                      whileHover={menuItemHover}
                      whileTap={menuItemTap}
                    >
                      <Camera className="h-4 w-4" style={{ color: PRIMARY }} aria-hidden="true" />
                      Prendre avec la caméra
                    </motion.button>
                    <motion.button
                      type="button"
                      role="menuitem"
                      onClick={handleGalleryClick}
                      className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50"
                      whileHover={menuItemHover}
                      whileTap={menuItemTap}
                    >
                      <ImageIcon className="h-4 w-4" style={{ color: PRIMARY }} aria-hidden="true" />
                      Choisir dans la galerie
                    </motion.button>
                  </motion.div>
                )}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  aria-label="Prendre une photo avec la caméra"
                  tabIndex={-1}
                  onChange={handleFileChange}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Choisir une photo dans la galerie"
                  tabIndex={-1}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="modal-editer-activity-input"
              className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-700"
            >
              <Briefcase className="h-3.5 w-3.5" style={{ color: PRIMARY }} aria-hidden="true" />
              Activité
            </label>
            <input
              id="modal-editer-activity-input"
              name="modal-editer-activity"
              type="text"
              autoFocus
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Ex: Vendeuse de tomates"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
              disabled={isSaving}
            />
          </div>

          <div className="relative mb-5">
            <label
              htmlFor="modal-editer-market-input"
              className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-700"
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: PRIMARY }} aria-hidden="true" />
              Marché
            </label>
            <input
              id="modal-editer-market-input"
              name="modal-editer-market"
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="Ex: Marché de Cocody"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
              disabled={isSaving}
            />
            {marketSuggestions.length > 0 && market.length >= 2 && (
              <div
                role="listbox"
                aria-label="Suggestions de marché"
                className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-lg"
              >
                {marketSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={market === s}
                    onClick={() => {
                      setMarket(s);
                      setMarketSuggestions([]);
                    }}
                    className="w-full border-b border-gray-50 px-4 py-2 text-left text-sm last:border-0 hover:bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border-2 border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <motion.button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              whileHover={!isSaving ? btnHoverSmall : undefined}
              whileTap={!isSaving ? btnTapSmall : undefined}
            >
              Annuler
            </motion.button>
            <motion.button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-md disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY_GRADIENT_END} 100%)` }}
              whileHover={!isSaving ? btnHoverSmall : undefined}
              whileTap={!isSaving ? btnTapSmall : undefined}
            >
              {isSaving ? (
                <>
                  <motion.span
                    className="inline-flex items-center justify-center"
                    animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
                    transition={{ duration: 1, repeat: repeatLoop, ease: 'linear' }}
                  >
                    <Loader2 className="h-4 w-4" aria-hidden="true" />
                  </motion.span>
                  Enregistrement
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Enregistrer
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
