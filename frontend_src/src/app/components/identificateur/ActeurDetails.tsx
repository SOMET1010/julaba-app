import { SubPageLayout } from '../layout/SubPageLayout';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
  Phone, MapPin, Briefcase, Calendar, CheckCircle, XCircle,
  Clock, Lock, Edit, AlertTriangle, History, User as UserIcon,
  RefreshCw, Search, Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { ROLE_COLORS } from '../../config/roleConfig';
import { ModalEditerActeur } from './ModalEditerActeur';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';

const PRIMARY = ROLE_COLORS.identificateur;

interface ActeurAPI {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  region?: string;
  commune?: string;
  activity?: string;
  market?: string;
  photoUrl?: string;
  nin?: string;
  status?: string;
  validated?: boolean;
  zoneId?: string;
  createdAt?: string;
  horsZone?: boolean;
  messageZone?: string | null;
  lockedUntil?: string | null;
  failedPinAttempts?: number;
}

interface IdentificationAPI {
  id: string;
  identificateur_id?: string;
  acteur_id?: string;
  latitude?: number;
  longitude?: number;
  motif_rejet?: string;
  created_at?: string;
}

interface HistoriqueItem {
  id: string;
  date: string;
  type: string;
  description: string;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s);

const STATUS_INFO: Record<string, { label: string; bg: string; text: string; icon: LucideIcon; isRejected?: boolean }> = {
  pending: { label: 'En attente', bg: '#FAEEDA', text: '#854F0B', icon: Clock },
  actif: { label: 'Validé', bg: '#EAF3DE', text: '#3B6D11', icon: CheckCircle },
  suspendu: { label: 'Suspendu', bg: '#F1EFE8', text: '#5F5E5A', icon: XCircle },
  rejete: { label: 'Rejeté', bg: '#FCEBEB', text: '#A32D2D', icon: XCircle, isRejected: true },
};

const ROLE_LABELS: Record<string, string> = {
  marchand: 'Marchand',
  producteur: 'Producteur',
  cooperateur: 'Coopérateur',
};

const pulseAnim = (prefersReducedMotion: boolean) => prefersReducedMotion ? {} : {
  scale: [1, 1.08, 1],
  transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const },
};

const sectionAnim = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateMonth(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function ActeurDetails() {
  const { numero } = useParams<{ numero: string }>();
  const navigate = useNavigate();
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { user: currentUser } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acteur, setActeur] = useState<ActeurAPI | null>(null);
  const [identification, setIdentification] = useState<IdentificationAPI | null>(null);
  const [identificateurResp, setIdentificateurResp] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    if (!numero) {
      setError('Numéro manquant');
      setLoading(false);
      return () => ac.abort();
    }

    (async () => {
      try {
        let userId: string;
        if (isUuid(numero)) {
          userId = numero;
        } else {
          let data: any;
          try {
            data = await apiRequest<any>(API_URL, `/users/by-phone/${encodeURIComponent(numero)}`, { method: 'GET', signal: ac.signal });
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') return;
            if (!isMountedRef.current) return;
            setError('Acteur introuvable');
            setLoading(false);
            return;
          }
          if (!isMountedRef.current) return;
          // Contrat API : GET /users/by-phone/:numero retourne { id: string, ... } à la racine
          if (!data || typeof data.id !== 'string') {
            setError('Acteur introuvable');
            setLoading(false);
            return;
          }
          userId = data.id;
        }

        const [detailsR, historiqueR, identificationsR] = await Promise.allSettled([
          apiRequest<ActeurAPI>(API_URL, `/users/${userId}`, { method: 'GET', signal: ac.signal }),
          apiRequest<any>(API_URL, `/users/${userId}/historique`, { method: 'GET', signal: ac.signal }),
          apiRequest<any>(API_URL, `/identifications?acteur_id=${userId}`, { method: 'GET', signal: ac.signal }),
        ]);

        if (!isMountedRef.current) return;
        if (detailsR.status === 'rejected') {
          if ((detailsR.reason as Error)?.name === 'AbortError') return;
          setError('Acteur introuvable');
          setLoading(false);
          return;
        }

        // Contrat API : GET /users/:id retourne l'objet User à la racine
        const acteurData: ActeurAPI = detailsR.value;
        if (!isMountedRef.current) return;
        setActeur(acteurData);

        if (historiqueR.status === 'fulfilled') {
          // Contrat API : GET /users/:id/historique retourne { historique: Array<...> }
          const histData = historiqueR.value;
          if (!isMountedRef.current) return;
          const histList = Array.isArray(histData?.historique) ? histData.historique : [];
          setHistorique(histList);
        }

        if (identificationsR.status === 'fulfilled') {
          const idData = identificationsR.value;
          if (!isMountedRef.current) return;
          const list: IdentificationAPI[] = Array.isArray(idData)
            ? (idData as IdentificationAPI[])
            : (Array.isArray(idData?.identifications)
                ? (idData.identifications as IdentificationAPI[])
                : Array.isArray(idData?.data)
                  ? (idData.data as IdentificationAPI[])
                  : []);
          const mostRecent = list
            .slice()
            .sort(
              (a, b) =>
                new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
            )[0];
          if (mostRecent) {
            setIdentification(mostRecent);
            if (mostRecent.identificateur_id && typeof mostRecent.identificateur_id === 'string') {
              let u: Record<string, unknown> | null = null;
              try {
                u = await apiRequest<Record<string, unknown>>(API_URL, `/users/${mostRecent.identificateur_id}`, { method: 'GET', signal: ac.signal });
              } catch (err) {
                if ((err as Error)?.name === 'AbortError') return;
                u = null;
              }
              if (!isMountedRef.current) return;
              if (u && typeof u.id === 'string') {
                const prenoms = u.prenoms;
                const nom = u.nom;
                setIdentificateurResp({
                  id: u.id,
                  firstName:
                    typeof u.firstName === 'string'
                      ? u.firstName
                      : typeof prenoms === 'string'
                        ? prenoms
                        : '',
                  lastName:
                    typeof u.lastName === 'string'
                      ? u.lastName
                      : typeof nom === 'string'
                        ? nom
                        : '',
                });
              }
            }
          }
        }

        if (isMountedRef.current) setLoading(false);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('[ActeurDetails] load failed:', err instanceof Error ? err.message : err);
        if (isMountedRef.current) {
          setError('Erreur de chargement');
          setLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [numero]);

  useEffect(() => {
    setProfilePhotoError(false);
  }, [acteur?.id, acteur?.photoUrl]);

  useEffect(() => {
    if (acteur?.horsZone) return;
    if (!identification?.latitude || !identification?.longitude || !mapRef.current) return;

    if (mapInstance.current) {
      try {
        mapInstance.current.remove();
      } catch (err) {
        console.warn('[ActeurDetails] map remove (pre-init) failed:', err instanceof Error ? err.message : err);
      }
      mapInstance.current = null;
    }

    let invalidateTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Délai pour s’assurer que la div a ses vraies dimensions
    const timeoutId = setTimeout(() => {
      if (!mapRef.current || !identification?.latitude || !identification?.longitude) return;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([identification.latitude, identification.longitude], 17);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);

      const customIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:${PRIMARY};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;">
                 <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;background:white;border-radius:50%;"></div>
               </div>`,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([identification.latitude, identification.longitude], { icon: customIcon }).addTo(map);

      // Assignation AVANT setTimeout invalidateSize
      mapInstance.current = map;

      // Force le recalcul de taille après un délai pour que le DOM ait les vraies dimensions
      invalidateTimeoutId = setTimeout(() => {
        if (mapInstance.current) {
          try {
            mapInstance.current.invalidateSize(true);
            // Re-set view après invalidation pour bien centrer
            if (identification?.latitude && identification?.longitude) {
              mapInstance.current.setView([identification.latitude, identification.longitude], 17);
            }
          } catch (err) {
            console.warn('[ActeurDetails] map invalidateSize failed:', err instanceof Error ? err.message : err);
          }
        }
      }, 200);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (invalidateTimeoutId) clearTimeout(invalidateTimeoutId);
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (err) {
          console.warn('[ActeurDetails] map remove (cleanup) failed:', err instanceof Error ? err.message : err);
        }
        mapInstance.current = null;
      }
    };
  }, [identification, acteur?.horsZone]);

  if (loading) {
    return (
      <SubPageLayout role="identificateur" title="Détail acteur">
        <div
          className="min-h-[60vh] flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="text-center">
            {prefersReducedMotion ? (
              <div aria-hidden="true">
                <RefreshCw className="w-10 h-10 mx-auto mb-3" style={{ color: PRIMARY }} />
              </div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              >
                <RefreshCw className="w-10 h-10 mx-auto mb-3" style={{ color: PRIMARY }} />
              </motion.div>
            )}
            <p className="text-gray-600 font-medium">{'Chargement\u2026'}</p>
          </div>
        </div>
      </SubPageLayout>
    );
  }

  if (error || !acteur) {
    return (
      <SubPageLayout role="identificateur" title="Détail acteur">
        <motion.div className="min-h-[60vh] flex items-center justify-center px-4"
          {...sectionAnim(0)}>
          <div className="text-center">
            <motion.div animate={pulseAnim(prefersReducedMotion)} className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
              <Search className="w-9 h-9 text-gray-400" />
            </motion.div>
            <p className="text-lg font-bold text-gray-900 mb-1">Acteur introuvable</p>
            <p className="text-sm text-gray-500 mb-6">{`Cet acteur n\u2019existe pas ou a été supprimé.`}</p>
            <motion.button
              type="button"
              onClick={() => navigate('/identificateur')}
              whileTap={{ scale: 0.97 }}
              className="px-6 py-3 rounded-2xl text-white font-bold shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: PRIMARY, minHeight: '44px' }}
            >
              {`Retour à l\u2019accueil`}
            </motion.button>
          </div>
        </motion.div>
      </SubPageLayout>
    );
  }

  const statusKey = (acteur.status || 'pending').toLowerCase();
  const statusInfo = STATUS_INFO[statusKey] || STATUS_INFO.pending;
  const StatusIcon = statusInfo.icon;
  const canEdit = acteur.horsZone === false;
  const canResume = canEdit && (statusKey === 'rejete' || statusKey === 'pending');

  // Comparaison robuste avec validation explicite
  const isOwn = (() => {
    const respId = identificateurResp?.id;
    const userId = currentUser?.id;

    // Si l’un des deux n’est pas un UUID valide, ce n’est pas l’utilisateur courant
    if (!respId || !userId) return false;
    if (typeof respId !== 'string' || typeof userId !== 'string') return false;
    if (respId.length !== 36 || userId.length !== 36) return false;

    // Comparaison exacte (sensible à la casse : les UUID sont en minuscules de toute façon)
    return respId.toLowerCase().trim() === userId.toLowerCase().trim();
  })();
  const motifRejet = identification?.motif_rejet;

  // Verrouillage : la fiche expose lockedUntil (date future = bloqué).
  const lockedUntilMs = acteur.lockedUntil ? new Date(acteur.lockedUntil).getTime() : NaN;
  const isVerrouille = Number.isFinite(lockedUntilMs) && lockedUntilMs > Date.now();

  const handleDebloquer = async () => {
    if (!acteur || unlocking) return;
    setUnlocking(true);
    try {
      await apiRequest(API_URL, `/auth/acteur/${acteur.id}/debloquer-pin`, { method: 'POST' });
      // Rafraîchir la fiche depuis le backend (source de vérité).
      const fresh = await apiRequest<ActeurAPI>(API_URL, `/users/${acteur.id}`, { method: 'GET' });
      if (isMountedRef.current) setActeur(fresh);
      toast.success('Compte débloqué');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du déblocage');
    } finally {
      if (isMountedRef.current) setUnlocking(false);
    }
  };

  return (
    <SubPageLayout role="identificateur" title="Détail acteur">
      <div className="px-4 py-4 max-w-3xl mx-auto space-y-4">
        {acteur.horsZone && (
          <motion.div {...sectionAnim(0.05)}
            className="rounded-2xl p-4 flex items-start gap-3 border-2"
            style={{ background: '#FAEEDA', borderColor: '#FAC775' }}>
            <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#854F0B' }} />
            </motion.div>
            <p className="text-sm font-medium" style={{ color: '#854F0B' }}>
              <span className="font-bold">Hors zone</span>
              {`\u202f: Tu es en consultation uniquement, cet acteur n\u2019est pas dans ta zone.`}
            </p>
          </motion.div>
        )}

        {isVerrouille && (
          <motion.div {...sectionAnim(0.06)}
            className="rounded-2xl p-4 border-2"
            style={{ background: '#FCEBEB', borderColor: '#F09595' }}>
            <div className="flex items-start gap-3">
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#A32D2D' }} />
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-bold mb-1" style={{ color: '#A32D2D' }}>Compte verrouillé</p>
                <p className="text-sm" style={{ color: '#A32D2D' }}>
                  Ce compte est bloqué après plusieurs échecs de connexion.
                </p>
                {acteur.horsZone === false && (
                  <motion.button
                    type="button"
                    onClick={handleDebloquer}
                    disabled={unlocking}
                    whileTap={{ scale: 0.97 }}
                    className="mt-3 px-4 py-2.5 rounded-xl text-white font-bold inline-flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ background: '#A32D2D', minHeight: '44px' }}
                  >
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    {unlocking ? 'Déblocage…' : 'Débloquer le compte'}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {!acteur.horsZone && statusInfo.isRejected && motifRejet && (
          <motion.div {...sectionAnim(0.08)}
            className="rounded-2xl p-4 border-2"
            style={{ background: '#FCEBEB', borderColor: '#F09595' }}>
            <div className="flex items-start gap-3">
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#A32D2D' }} />
              </motion.div>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: '#A32D2D' }}>Motif du rejet</p>
                <p className="text-sm" style={{ color: '#A32D2D' }}>{motifRejet}</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          {...sectionAnim(0.09)}
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4"
          role="status"
          aria-live="polite"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-900">
            Écran sensible. Données personnelles identifiées (nom, téléphone, NIN, photo, GPS, historique). Ne pas
            capturer ni partager cet écran.
          </p>
        </motion.div>

        <motion.div {...sectionAnim(0.1)}
          className="bg-white rounded-3xl p-5 shadow-sm border-2"
          style={{ borderColor: `${PRIMARY}30` }}>
          <div className="flex items-center gap-4 mb-4">
            <motion.div animate={pulseAnim(prefersReducedMotion)}
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-md"
              style={{ backgroundColor: PRIMARY }}
              aria-hidden="true">
              {acteur.photoUrl && !profilePhotoError ? (
                <img
                  src={acteur.photoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.warn('[ActeurDetails] photo load failed');
                    setProfilePhotoError(true);
                  }}
                />
              ) : (
                (acteur.firstName || '?').charAt(0).toUpperCase()
              )}
            </motion.div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{acteur.firstName} {acteur.lastName}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#FAEEDA', color: '#854F0B' }}>
                  {ROLE_LABELS[acteur.role] || acteur.role}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{ background: statusInfo.bg, color: statusInfo.text }}>
                  <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true"><StatusIcon className="w-3 h-3" /></motion.div>
                  {statusInfo.label}
                </span>
                {acteur.horsZone && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#FAEEDA', color: '#854F0B' }}>
                    Hors zone
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3 mt-3" style={{ background: '#F1EFE8' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                  <Phone className="w-4 h-4" style={{ color: PRIMARY }} />
                </motion.div>
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-bold text-gray-900">{acteur.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-400" aria-label="Champ verrouillé">
                <Lock className="w-3 h-3" aria-hidden="true" />
                <span className="text-[10px]">Verrouillé</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 italic">{`Modifiable uniquement par l\u2019administrateur`}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {acteur.nin && (
              <div className="rounded-2xl p-3" style={{ background: '#F1EFE8' }}>
                <div className="flex items-center gap-2 mb-1">
                  <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                    <UserIcon className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
                  </motion.div>
                  <p className="text-xs text-gray-500">CNI / NIN</p>
                </div>
                <p className="font-bold text-sm text-gray-900">{acteur.nin}</p>
              </div>
            )}
            {acteur.createdAt && (
              <div className="rounded-2xl p-3" style={{ background: '#F1EFE8' }}>
                <div className="flex items-center gap-2 mb-1">
                  <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                    <Calendar className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
                  </motion.div>
                  <p className="text-xs text-gray-500">Inscrit le</p>
                </div>
                <p className="font-bold text-sm text-gray-900">{formatDateShort(acteur.createdAt)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {(acteur.activity || acteur.market || acteur.commune || acteur.region) && (
          <motion.div {...sectionAnim(0.15)}
            className="bg-white rounded-3xl p-5 shadow-sm border-2"
            style={{ borderColor: `${PRIMARY}20` }}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <Briefcase className="w-4 h-4" style={{ color: PRIMARY }} />
              </motion.div>
              Activité
            </h3>
            <div className="space-y-2 text-sm">
              {acteur.activity && (
                <div className="flex justify-between"><span className="text-gray-500">Activité</span><span className="font-medium text-gray-900">{acteur.activity}</span></div>
              )}
              {acteur.market && (
                <div className="flex justify-between"><span className="text-gray-500">Marché</span><span className="font-medium text-gray-900">{acteur.market}</span></div>
              )}
              {acteur.commune && (
                <div className="flex justify-between"><span className="text-gray-500">Commune</span><span className="font-medium text-gray-900">{acteur.commune}</span></div>
              )}
              {acteur.region && (
                <div className="flex justify-between"><span className="text-gray-500">Région</span><span className="font-medium text-gray-900">{acteur.region}</span></div>
              )}
            </div>
          </motion.div>
        )}

        {!acteur.horsZone && identification?.latitude && identification?.longitude && (
          <motion.div {...sectionAnim(0.2)}
            className="bg-white rounded-3xl p-5 shadow-sm border-2"
            style={{ borderColor: `${PRIMARY}20` }}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <MapPin className="w-4 h-4" style={{ color: PRIMARY }} />
              </motion.div>
              Localisation précise
            </h3>
            <div ref={mapRef} className="rounded-2xl overflow-hidden border-2 border-gray-100" style={{ height: 220 }} />
            <p className="text-[10px] text-gray-400 mt-2 text-right">
              {identification.latitude.toFixed(3)}, {identification.longitude.toFixed(3)}
            </p>
          </motion.div>
        )}

        {identificateurResp && (
          <motion.div {...sectionAnim(0.25)}
            className="bg-white rounded-3xl p-5 shadow-sm border-2"
            style={{ borderColor: `${PRIMARY}20` }}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <UserIcon className="w-4 h-4" style={{ color: PRIMARY }} />
              </motion.div>
              Identifié par
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: isOwn ? PRIMARY : '#888780' }}>
                {(identificateurResp.firstName || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                {/* Pas de seconde ligne : le libellé « Toi » suffit lorsque c’est ton dossier. */}
                <p className="font-bold text-gray-900">
                  {isOwn ? 'Toi' : `${identificateurResp.firstName || ''} ${identificateurResp.lastName || ''}`.trim() || 'Identificateur'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div {...sectionAnim(0.3)}
          className="bg-white rounded-3xl p-5 shadow-sm border-2"
          style={{ borderColor: `${PRIMARY}20` }}>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
              <History className="w-4 h-4" style={{ color: PRIMARY }} />
            </motion.div>
            Historique
          </h3>
          {historique.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun historique disponible</p>
          ) : (
            <div className="space-y-1">
              {historique.map((h) => (
                <div key={h.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-medium text-gray-900">{h.description || h.type}</p>
                    {h.type !== h.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{h.type}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{formatDateMonth(h.date)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div {...sectionAnim(0.35)} className="flex gap-3 pt-2">
          {canResume && (
            <motion.button
              type="button"
              onClick={() => navigate('/identificateur/fiche-identification')}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #B39485 100%)`, minHeight: '44px' }}
            >
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              Reprendre le dossier
            </motion.button>
          )}

          {canEdit ? (
            <motion.button
              type="button"
              onClick={() => setShowEditModal(true)}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #B39485 100%)`, minHeight: '44px' }}
            >
              <motion.div animate={pulseAnim(prefersReducedMotion)} aria-hidden="true">
                <Edit className="w-4 h-4" />
              </motion.div>
              Modifier
            </motion.button>
          ) : (
            <motion.button
              type="button"
              disabled
              aria-disabled={true}
              aria-label="Édition impossible : acteur hors zone"
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed border-2 border-gray-200"
              style={{ minHeight: '44px' }}
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              Lecture seule
            </motion.button>
          )}
        </motion.div>
      </div>

      {acteur && (
        <ModalEditerActeur
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          acteur={{
            id: acteur.id,
            firstName: acteur.firstName,
            lastName: acteur.lastName,
            activity: acteur.activity,
            market: acteur.market,
            commune: acteur.commune,
            photoUrl: acteur.photoUrl,
          }}
          onSaved={(updates) => {
            setActeur((prev) => prev ? {
              ...prev,
              activity: updates.activity !== undefined ? updates.activity : prev.activity,
              market: updates.market !== undefined ? updates.market : prev.market,
              commune: updates.commune !== undefined ? updates.commune : prev.commune,
              photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : prev.photoUrl,
            } : prev);
          }}
        />
      )}
    </SubPageLayout>
  );
}