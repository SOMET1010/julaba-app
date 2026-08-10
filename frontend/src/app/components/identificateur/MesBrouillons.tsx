import React, {
  useEffect,
  useState,
  useId,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
  ShoppingBag,
  Sprout,
  Layers,
  ArrowRight,
  Trash2,
  Search,
  Clock,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';

const AUTO_DELETE_DAYS = 30;
const RECENT_DAYS = 7;

type ProfileEntry = {
  label: string;
  icon: LucideIcon;
  color: string;
  lightColor: string;
  totalSteps: number;
};

const PROFILES_CONFIG: Record<'marchand' | 'producteur' | 'cooperative', ProfileEntry> = {
  marchand: { label: 'Marchand', icon: ShoppingBag, color: '#C66A2C', lightColor: '#FFEEDD', totalSteps: 7 },
  producteur: { label: 'Producteur', icon: Sprout, color: '#16A34A', lightColor: '#E8F5E9', totalSteps: 7 },
  cooperative: { label: 'Coopérative', icon: Layers, color: '#7C3AED', lightColor: '#EDE9FE', totalSteps: 8 },
};

const TYPE_ACTEUR_INCONNU: ProfileEntry = {
  label: 'TYPE INCONNU',
  icon: FileText,
  color: '#9F8170',
  lightColor: '#FAF7F1',
  totalSteps: 0,
};

interface Brouillon {
  id: string;
  acteurNom: string;
  typeActeur: string;
  currentStep: number;
  formData: Record<string, unknown>;
  region: string;
  commune: string;
  updatedAt: string;
  createdAt: string;
}

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeTypeActeur(raw: string | undefined | null): 'marchand' | 'producteur' | 'cooperative' | 'inconnu' {
  const t = (raw ?? '').trim().toLowerCase();
  if (!t) return 'inconnu';
  if (t === 'cooperateur') {
    console.warn('[MesBrouillons] alias cooperateur détecté, aligner le backend pour utiliser cooperative');
    return 'cooperative';
  }
  if (t === 'marchand' || t === 'producteur' || t === 'cooperative') return t;
  return 'inconnu';
}

function parseDraftItem(raw: unknown): Brouillon | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;

  let formData: Record<string, unknown> = {};
  if (o.formData !== undefined && o.formData !== null && typeof o.formData === 'object' && !Array.isArray(o.formData)) {
    formData = o.formData as Record<string, unknown>;
  }

  const currentStep =
    typeof o.currentStep === 'number' && Number.isFinite(o.currentStep)
      ? o.currentStep
      : typeof o.currentStep === 'string' && o.currentStep.trim() !== '' && Number.isFinite(Number(o.currentStep))
        ? Number(o.currentStep)
        : 0;

  return {
    id: o.id,
    acteurNom: typeof o.acteurNom === 'string' ? o.acteurNom : '',
    typeActeur: typeof o.typeActeur === 'string' ? o.typeActeur : '',
    currentStep,
    formData,
    region: typeof o.region === 'string' ? o.region : '',
    commune: typeof o.commune === 'string' ? o.commune : '',
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
  };
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'Date inconnue';
  const now = Date.now();
  const rawDiff = now - then;
  const diff = Math.max(0, rawDiff);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (rawDiff < 0) return 'À l\u2019instant';
  if (minutes < 1) return 'À l\u2019instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function MesBrouillons() {
  const navigate = useNavigate();
  const prefersReducedMotion =
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { user: currentUser } = useApp();
  const searchInputId = useId();
  const confirmDeleteTitleId = 'confirm-delete-title';

  const [brouillons, setBrouillons] = useState<Brouillon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const restoreDeleteFocus = useCallback(() => {
    const el = deleteTriggerRef.current;
    deleteTriggerRef.current = null;
    if (el && typeof el.focus === 'function') {
      window.setTimeout(() => {
        try {
          el.focus();
        } catch {
          /* noop */
        }
      }, 0);
    }
  }, []);

  const closeDeleteModal = useCallback(() => {
    setConfirmDelete(null);
    restoreDeleteFocus();
  }, [restoreDeleteFocus]);

  useEffect(() => {
    const ac = new AbortController();

    if (!currentUser?.id) {
      setLoading(false);
      setSessionError(true);
      setBrouillons([]);
      return () => ac.abort();
    }

    setSessionError(false);

    (async () => {
      setLoading(true);
      try {
        let data: { drafts?: unknown } | null = null;
        try {
          data = await apiRequest<{ drafts?: unknown }>(API_URL, `/identifications/drafts/${currentUser.id}`, { method: 'GET', signal: ac.signal });
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
          if (!isMountedRef.current) return;
          console.warn('[MesBrouillons] fetchBrouillons HTTP error:', (e as Error)?.message);
          toast.error('Impossible de charger tes brouillons, réessaie');
          setBrouillons([]);
          return;
        }
        if (!isMountedRef.current) return;
        const rawList = data && Array.isArray(data.drafts) ? data.drafts : [];
        const parsed = rawList.map(parseDraftItem).filter((b): b is Brouillon => b !== null);
        setBrouillons(parsed);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        console.warn('[MesBrouillons] fetchBrouillons failed:', e instanceof Error ? e.message : e);
        if (isMountedRef.current) {
          toast.error('Impossible de charger tes brouillons, réessaie');
          setBrouillons([]);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!confirmDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDeleteModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete, closeDeleteModal]);

  useEffect(() => {
    if (confirmDelete) {
      cancelButtonRef.current?.focus();
    }
  }, [confirmDelete]);

  const handleResume = (brouillon: Brouillon) => {
    navigate('/identificateur/fiche-identification', {
      state: {
        resumeDraft: {
          id: brouillon.id,
          typeActeur: brouillon.typeActeur,
          currentStep: brouillon.currentStep,
          formData: brouillon.formData,
        },
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (processingId !== null) return;
    const ac = new AbortController();
    setProcessingId(id);
    try {
      let data: { success?: boolean; error?: string } | null = null;
      try {
        data = await apiRequest<{ success?: boolean; error?: string }>(API_URL, `/identifications/draft/${id}`, { method: 'DELETE', signal: ac.signal });
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        if (!isMountedRef.current) return;
        // apiRequest throw sur body vide (DELETE 200 sans contenu) : on tolere ce cas comme un succes
        if ((e as Error)?.message?.includes('non-JSON') || (e as Error)?.message?.includes('invalide')) {
          data = null;
        } else {
          console.warn('[MesBrouillons] delete failed:', (e as Error)?.message);
          toast.error('Suppression impossible, réessaie');
          return;
        }
      }
      if (!isMountedRef.current) return;
      if (data && data.success === false) {
        toast.error(typeof data.error === 'string' ? data.error : 'Suppression impossible, réessaie');
        return;
      }
      if (!isMountedRef.current) return;
      toast.success('Brouillon supprimé');
      setBrouillons((prev) => prev.filter((b) => b.id !== id));
      setConfirmDelete(null);
      restoreDeleteFocus();
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      console.warn('[MesBrouillons] delete failed:', e instanceof Error ? e.message : e);
      if (isMountedRef.current) toast.error('Suppression impossible, réessaie');
    } finally {
      if (isMountedRef.current) setProcessingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return brouillons;
    const q = normalizeForSearch(search.trim());
    return brouillons.filter((b) => {
      return (
        normalizeForSearch(b.acteurNom || '').includes(q)
        || normalizeForSearch(b.commune || '').includes(q)
        || normalizeForSearch(b.region || '').includes(q)
      );
    });
  }, [brouillons, search]);

  const countThisWeek = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 86400000;
    return brouillons.filter((b) => {
      const t = new Date(b.updatedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    }).length;
  }, [brouillons]);

  return (
    <SubPageLayout role="identificateur" title="Mes brouillons" subtitle="Reprends un dossier en cours">
      <div style={{ padding: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {sessionError && (
          <div role="alert" aria-live="assertive" style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: '#FEF2F2',
            border: '1.5px solid #FECACA',
            color: '#991B1B',
            fontSize: 13,
            fontWeight: 600,
          }}>
            Session non chargée, recharge la page
          </div>
        )}

        <KPIGrid cols={2}>
          <UniversalKPI
            label="En cours"
            animatedTarget={brouillons.length}
            icon={FileText}
            color="#C66A2C"
            bgColor="rgba(255,238,221,0.85)"
            borderColor="rgba(198,106,44,0.4)"
            iconAnimation="bounce"
            explication="Nombre total de brouillons en cours de saisie."
          />
          <UniversalKPI
            label="Cette semaine"
            animatedTarget={countThisWeek}
            icon={Clock}
            color="#6B7280"
            bgColor="rgba(243,244,246,0.85)"
            borderColor="rgba(107,114,128,0.4)"
            iconAnimation="pulse"
            explication={`Brouillons modifiés ces ${RECENT_DAYS} derniers jours.`}
          />
        </KPIGrid>

        <div style={{ position: 'relative', marginTop: 4 }}>
          <label htmlFor={searchInputId} style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            Rechercher un brouillon
          </label>
          <input
            id={searchInputId}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un brouillon\u2026"
            autoComplete="off"
            style={{
              width: '100%',
              padding: '11px 14px 11px 38px',
              border: '1.5px solid #E5E0D8',
              borderRadius: 12,
              fontSize: 13.5,
              background: '#fff',
              color: '#1a1a1a',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <Search
            className="w-4 h-4"
            aria-hidden="true"
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }}
          />
        </div>

        {loading && (
          <div role="status" aria-live="polite" style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>
            {'Chargement\u2026'}
          </div>
        )}

        {!loading && filtered.length === 0 && search.trim() && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: 32,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 18,
              color: '#888',
              fontSize: 13,
              border: '1.5px dashed #E5E0D8',
            }}
          >
            Aucun brouillon ne correspond à ta recherche
          </div>
        )}

        {!loading && brouillons.length === 0 && !sessionError && (
          <div style={{
            padding: 32,
            textAlign: 'center',
            background: '#fff',
            borderRadius: 18,
            color: '#666',
            border: '1.5px dashed #E5E0D8',
          }}>
            {prefersReducedMotion ? (
              <div style={{ display: 'inline-flex', marginBottom: 10 }} aria-hidden="true">
                <FileText className="w-12 h-12" style={{ color: '#D9D2C7' }} />
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'inline-flex', marginBottom: 10 }}
                aria-hidden="true"
              >
                <FileText className="w-12 h-12" style={{ color: '#D9D2C7' }} />
              </motion.div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 4 }}>
              Aucun brouillon
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              Les dossiers en cours apparaîtront ici
            </div>
          </div>
        )}

        {!loading && filtered.map((brouillon) => {
          const typeActeurNormalise = normalizeTypeActeur(brouillon.typeActeur);
          const profile = typeActeurNormalise === 'inconnu'
            ? TYPE_ACTEUR_INCONNU
            : PROFILES_CONFIG[typeActeurNormalise];
          const Icon = profile.icon;
          const showProgress = typeActeurNormalise !== 'inconnu' && profile.totalSteps > 0;
          const progressPct = showProgress
            ? Math.round(((brouillon.currentStep || 0) / profile.totalSteps) * 100)
            : 0;
          const resumeBlocked = typeActeurNormalise === 'inconnu';

          return (
            <motion.div
              key={brouillon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#fff',
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  background: profile.lightColor,
                  borderRadius: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
                >
                  <Icon className="w-5 h-5" style={{ color: profile.color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {brouillon.acteurNom || 'Sans nom'}
                    </div>
                    <span style={{
                      background: profile.lightColor,
                      color: profile.color,
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 6,
                      letterSpacing: 0.3,
                      flexShrink: 0,
                      textTransform: 'uppercase',
                    }}>
                      {profile.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: '#888', marginBottom: 8 }}>
                    {brouillon.commune || brouillon.region || 'Localisation non renseignée'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {showProgress ? (
                      <>
                        <div style={{
                          height: 5,
                          background: profile.lightColor,
                          borderRadius: 4,
                          flex: 1,
                          overflow: 'hidden',
                        }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{ height: '100%', background: profile.color, borderRadius: 4 }}
                          />
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: profile.color }}>
                          {brouillon.currentStep || 0}/{profile.totalSteps}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: profile.color }}>
                        -/-
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#999' }}>
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {timeAgo(brouillon.updatedAt)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <motion.button
                        type="button"
                        onClick={(e) => {
                          deleteTriggerRef.current = e.currentTarget;
                          setConfirmDelete(brouillon.id);
                        }}
                        disabled={processingId !== null}
                        whileTap={{ scale: 0.92 }}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9F8170] focus-visible:ring-offset-2"
                        style={{
                          background: '#fff',
                          color: '#9F8170',
                          border: '1px solid #E5E0D8',
                          borderRadius: 9,
                          padding: '10px',
                          minHeight: 44,
                          minWidth: 44,
                          cursor: processingId !== null ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'inherit',
                          opacity: processingId !== null ? 0.6 : 1,
                        }}
                        aria-label="Supprimer ce brouillon"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (!resumeBlocked) handleResume(brouillon);
                        }}
                        aria-disabled={resumeBlocked || undefined}
                        aria-label={
                          resumeBlocked
                            ? 'Type d\u2019acteur invalide, contacte le support'
                            : 'Reprendre l\u2019identification'
                        }
                        whileTap={{ scale: resumeBlocked ? 1 : 0.96 }}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                        style={{
                          background: profile.color,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 9,
                          padding: '10px 14px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: resumeBlocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'inherit',
                          minHeight: 44,
                          minWidth: 44,
                          opacity: resumeBlocked ? 0.5 : 1,
                          pointerEvents: resumeBlocked ? 'none' : 'auto',
                        }}
                      >
                        Reprendre
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {!loading && brouillons.length > 0 && (
          <div style={{
            border: '1.5px dashed #D9D2C7',
            borderRadius: 14,
            padding: '14px 16px',
            background: '#FAF7F1',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
            marginBottom: 18,
          }}
          >
            <div style={{
              width: 36,
              height: 36,
              background: '#fff',
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: '#9F8170' }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>
                {`Auto-suppression dans ${AUTO_DELETE_DAYS} jours`}
              </div>
              <div style={{ fontSize: 10.5, color: '#888', marginTop: 2 }}>
                Termine vite tes dossiers en cours
              </div>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDeleteModal}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={confirmDeleteTitleId}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: 24,
                maxWidth: 360,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  background: '#FEE2E2',
                  borderRadius: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                >
                  <Trash2 className="w-5 h-5" style={{ color: '#DC2626' }} aria-hidden="true" />
                </div>
                <div>
                  <div id={confirmDeleteTitleId} style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                    {`Supprimer ce brouillon\u202f?`}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    Cette action est définitive
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={closeDeleteModal}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9F8170] focus-visible:ring-offset-2"
                  style={{
                    flex: 1,
                    padding: 12,
                    minHeight: 44,
                    background: '#fff',
                    border: '1.5px solid #E5E0D8',
                    borderRadius: 12,
                    color: '#666',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={processingId !== null}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  style={{
                    flex: 1.5,
                    padding: 12,
                    minHeight: 44,
                    background: '#DC2626',
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: processingId !== null ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: processingId !== null ? 0.7 : 1,
                  }}
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}
