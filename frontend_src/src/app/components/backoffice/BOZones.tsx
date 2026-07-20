import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Edit2,
  List,
  Map as MapIcon,
  MapPin,
  MoreVertical,
  Navigation,
  Plus,
  Power,
  Store,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBackOffice, type BOZone } from '../../contexts/BackOfficeContext';
import {
  boCreateMarche,
  boDeleteMarche,
  boGetMarches,
  boUpdateMarche,
} from '../../services/backoffice-api';
import { BO_PRIMARY, BO_TINT } from './bo-theme';
import { FilterableSelect } from './CIVLocationPicker';
import { CIV_REGIONS_FILTER } from '../../data/civ-geography';
import {
  UniversalDropdownMenuBO,
  UniversalModalBO,
  UniversalConfirmModalBO,
  UniversalActionWithReasonModalBO,
} from './universal';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalFiltreBO } from './universal/UniversalFiltreBO';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import type { DropdownEntry } from './universal/UniversalDropdownMenuBO';
import type { FilterValue } from './universal/UniversalFiltreBO';
import { UniversalCardBOZoneRow, UniversalCardBOMarcheRow } from './UniversalCardBOZone';
import { expandRegionFilterForZones } from './utils/civ-gadm-district-mapping';
import { API_URL } from '../../utils/api';

const BOZonesMap = lazy(() => import('./BOZonesMap'));

const BO_DANGER = '#A32D2D';

const KPI_VERT = { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97' };
const KPI_BRUN = { bg: '#F5F3EF', text: '#5B5248', border: '#D7CFC0' };
const KPI_BLEU = { bg: '#E6F1FB', text: '#185FA5', border: '#B5D4F4' };
const KPI_AMBER = { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' };

const REGION_NON_DEFINIE = 'Région non définie';

const VILLES = [
  { ville: 'Abidjan', region: 'Abidjan' },
  { ville: 'Abengourou', region: 'Indenie-Djuablin' },
  { ville: 'Aboisso', region: 'Sud-Comoe' },
  { ville: 'Adzopé', region: 'La Me' },
  { ville: 'Agboville', region: 'Agneby-Tiassa' },
  { ville: 'Bondoukou', region: 'Gontougo' },
  { ville: 'Bouaké', region: 'Gbeke' },
  { ville: 'Boundiali', region: 'Bagoue' },
  { ville: 'Daloa', region: 'Haut-Sassandra' },
  { ville: 'Daoukro', region: 'Iffou' },
  { ville: 'Dimbokro', region: "N'Zi" },
  { ville: 'Divo', region: 'Loh-Djiboua' },
  { ville: 'Duekoue', region: 'Guemon' },
  { ville: 'Ferkessédougou', region: 'Tchologo' },
  { ville: 'Gagnoa', region: 'Goh' },
  { ville: 'Grand-Bassam', region: 'Sud-Comoe' },
  { ville: 'Issia', region: 'Haut-Sassandra' },
  { ville: 'Korhogo', region: 'Poro' },
  { ville: 'Man', region: 'Tonkpi' },
  { ville: 'Odienné', region: 'Kabadougou' },
  { ville: 'Oumé', region: 'Goh' },
  { ville: 'San-Pédro', region: 'San-Pedro' },
  { ville: 'Sassandra', region: 'Gbokle' },
  { ville: 'Séguéla', region: 'Worodougou' },
  { ville: 'Soubré', region: 'Nawa' },
  { ville: 'Tabou', region: 'San-Pedro' },
  { ville: 'Touba', region: 'Bafing' },
  { ville: 'Yamoussoukro', region: 'Yamoussoukro' },
  { ville: 'Zuénoula', region: 'Marahoue' },
];

type SortKey =
  | 'volume_desc'
  | 'volume_asc'
  | 'acteurs_desc'
  | 'acteurs_asc'
  | 'taux_desc'
  | 'taux_asc'
  | 'name_asc'
  | 'name_desc';

type MarcheSortKey = 'zone' | 'nom_asc' | 'nom_desc' | 'date_desc' | 'type';

type BOMMarche = {
  id: string;
  nom: string;
  zoneId: string;
  zoneNom: string;
  zoneRegion: string;
  adresse: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  type: string;
  actif: boolean;
  description: string | null;
  created_at?: string;
};

const MARCHE_SORT_LABELS: Record<MarcheSortKey, string> = {
  zone: 'Par zone',
  nom_asc: 'Alphabétique A-Z',
  nom_desc: 'Alphabétique Z-A',
  date_desc: 'Date création (récent)',
  type: 'Type',
};

function normalizeMarche(raw: Record<string, unknown>): BOMMarche {
  const z = (raw.zone as Record<string, unknown>) || {};
  const lat = raw.latitude ?? null;
  const lng = raw.longitude ?? null;
  return {
    id: String(raw.id ?? ''),
    nom: String(raw.nom ?? ''),
    zoneId: String(raw.zone_id ?? z.id ?? ''),
    zoneNom: String(z.nom ?? ''),
    zoneRegion: String(z.region ?? ''),
    adresse: (raw.adresse as string) ?? null,
    latitude: lat as string | number | null,
    longitude: lng as string | number | null,
    type: String(raw.marcheType ?? raw.type ?? 'autre'),
    actif: Boolean(raw.actif),
    description: (raw.description as string) ?? null,
    created_at: (raw.created_at as string) || undefined,
  };
}

function marcheHasGps(m: BOMMarche): boolean {
  const la = m.latitude;
  const lo = m.longitude;
  if (la == null || lo == null) return false;
  const ns = String(la).trim();
  const ew = String(lo).trim();
  return ns.length > 0 && ew.length > 0;
}

function isMarcheActive(m: BOMMarche): boolean {
  return m.actif === true;
}

const SORT_LABELS: Record<SortKey, string> = {
  volume_desc: 'Volume décroissant',
  volume_asc: 'Volume croissant',
  acteurs_desc: 'Acteurs décroissant',
  acteurs_asc: 'Acteurs croissant',
  taux_desc: 'Activité décroissante',
  taux_asc: 'Activité croissante',
  name_asc: 'Alphabétique A-Z',
  name_desc: 'Alphabétique Z-A',
};

function formatFCFA(v: number): string {
  const n = Math.round(Number(v) || 0);
  return `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
}

function isZoneActive(z: BOZone): boolean {
  const a = z.actif as unknown;
  if (a === true) return true;
  if (a === 1 || a === 'true' || a === 't') return true;
  const s = z.statut;
  if (s === 'active' || s === 'actif') return true;
  return false;
}

/** Région de référence pour une ville (table VILLES). */
function resolveRegionFromVille(ville: string | undefined): string | null {
  const v = String(ville ?? '').trim();
  if (!v) return null;
  const found = VILLES.find((x) => x.ville === v);
  return found ? found.region : null;
}

/**
 * Libellé de région pour affichage et groupement.
 * Migration DB recommandée : nettoyer les anciennes valeurs region « Intérieur » / « Autre ».
 */
function groupeRegionLibelle(z: BOZone): string {
  const r = String(z.region ?? '').trim();
  if (!r) return REGION_NON_DEFINIE;
  const n = r
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (n === 'interieur') {
    return resolveRegionFromVille(z.ville as string | undefined) ?? REGION_NON_DEFINIE;
  }
  if (n === 'autre') return REGION_NON_DEFINIE;
  return r;
}

function activityBarBg(t: number): string {
  if (t <= 0) return '#F7C1C1';
  if (t <= 10) return '#EF9F27';
  return '#854F0B';
}

function countMarchesForZone(zoneId: string | undefined, territoires: any[]): number {
  if (!zoneId) return 0;
  let n = 0;
  territoires.forEach((ville: any) => {
    ville.communes?.forEach((c: any) => {
      if (String(c.id) === String(zoneId)) n += c.marches?.length || 0;
    });
  });
  return n;
}

type MarcheGpsRow = {
  id: string;
  nom: string;
  commune: string | null;
  statut: string | null;
  latitude: number | null;
  longitude: number | null;
};

const MARCHE_GPS_STATUT: Record<string, { label: string; color: string; bg: string }> = {
  a_verifier: { label: 'À vérifier', color: '#D97706', bg: '#FEF3C7' },
  'à_vérifier': { label: 'À vérifier', color: '#D97706', bg: '#FEF3C7' },
  actif: { label: 'Actif', color: '#16A34A', bg: '#DCFCE7' },
  en_attente: { label: 'En attente', color: '#2563EB', bg: '#DBEAFE' },
};

function parseCoord(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function normalizeMarcheGps(raw: Record<string, unknown>): MarcheGpsRow {
  return {
    id: String(raw.id ?? ''),
    nom: String(raw.nom ?? ''),
    commune: raw.commune != null ? String(raw.commune) : null,
    statut: raw.statut != null ? String(raw.statut) : null,
    latitude: parseCoord(raw.latitude),
    longitude: parseCoord(raw.longitude),
  };
}

function marcheGpsStatutStyle(statut: string | null) {
  const key = (statut || '').toLowerCase().replace(/\s+/g, '_');
  return MARCHE_GPS_STATUT[key] ?? { label: statut || '—', color: '#6B7280', bg: '#F3F4F6' };
}

function formatCoord(n: number | null): string {
  if (n == null) return '—';
  return String(n);
}

function MarchesGpsSaisiePanel({
  canWrite,
  onMarkCategoryRead,
}: {
  canWrite: boolean;
  onMarkCategoryRead: (category: string) => void;
}) {
  const isMountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<MarcheGpsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsModal, setGpsModal] = useState<MarcheGpsRow | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [gpsSubmitting, setGpsSubmitting] = useState(false);

  const loadMarchesGps = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/marches`, {
        credentials: 'include',
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data ?? [];
      if (isMountedRef.current) {
        setRows(arr.map((r: Record<string, unknown>) => normalizeMarcheGps(r)));
      }
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') return;
      if (isMountedRef.current) {
        toast.error('Impossible de charger les marchés.');
        setRows([]);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    onMarkCategoryRead('marche_suggestion');
    void loadMarchesGps();
    return () => {
      isMountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadMarchesGps, onMarkCategoryRead]);

  const saisirGPS = useCallback((m: MarcheGpsRow) => {
    setGpsModal(m);
    setLatInput(m.latitude != null ? String(m.latitude) : '');
    setLngInput(m.longitude != null ? String(m.longitude) : '');
  }, []);

  const closeGpsModal = useCallback(() => {
    if (gpsSubmitting) return;
    setGpsModal(null);
    setLatInput('');
    setLngInput('');
  }, [gpsSubmitting]);

  const saveGps = useCallback(async () => {
    if (!gpsModal || gpsSubmitting) return;
    const latStr = latInput.trim();
    const lngStr = lngInput.trim();
    if (!latStr || !lngStr) {
      toast.error('Latitude et longitude sont obligatoires.');
      return;
    }
    const latitude = Number(latStr.replace(',', '.'));
    const longitude = Number(lngStr.replace(',', '.'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error('Coordonnées invalides.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      toast.error('La latitude doit être entre -90 et 90.');
      return;
    }
    if (longitude < -180 || longitude > 180) {
      toast.error('La longitude doit être entre -180 et 180.');
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setGpsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/marches/${gpsModal.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
        signal: abortRef.current.signal,
      });
      if (!isMountedRef.current) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { message?: string })?.message || 'Enregistrement impossible.');
        return;
      }
      toast.success('Coordonnées GPS enregistrées.');
      closeGpsModal();
      void loadMarchesGps();
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') return;
      if (isMountedRef.current) toast.error('Erreur réseau.');
    } finally {
      if (isMountedRef.current) setGpsSubmitting(false);
    }
  }, [gpsModal, gpsSubmitting, latInput, lngInput, closeGpsModal, loadMarchesGps]);

  return (
    <>
      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement des marchés…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Aucun marché trouvé.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => {
            const st = marcheGpsStatutStyle(m.statut);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border-2 p-4 space-y-3"
                style={{ borderColor: '#F3F4F6' }}
              >
                <motion.div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{m.nom}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{m.commune || 'Commune inconnue'}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </motion.div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-gray-400 block mb-0.5">Latitude</span>
                    <span className="font-semibold text-gray-800">{formatCoord(m.latitude)}</span>
                  </div>
                  <motion.div className="bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-gray-400 block mb-0.5">Longitude</span>
                    <span className="font-semibold text-gray-800">{formatCoord(m.longitude)}</span>
                  </motion.div>
                </div>
                {canWrite && (
                  <motion.div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => saisirGPS(m)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: BO_PRIMARY }}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Saisir GPS
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {gpsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end lg:items-center lg:justify-center p-0 lg:p-4"
            onClick={closeGpsModal}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md overflow-hidden p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Saisir GPS — {gpsModal.nom}</h3>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={closeGpsModal}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="-90 à 90"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="-180 à 180"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              <button
                type="button"
                onClick={() => void saveGps()}
                disabled={gpsSubmitting}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: BO_PRIMARY }}
              >
                <Check className="w-4 h-4" />
                {gpsSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MapLoading() {
  return (
    <div
      style={{
        height: 520,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        border: '1px solid #E5E1D8',
        background: BO_TINT,
        color: BO_PRIMARY,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      Chargement de la carte…
    </div>
  );
}

export function BOZones() {
  const _bo = useBackOffice();
  const zones = Array.isArray(_bo.zones) ? _bo.zones : [];
  const territoires = Array.isArray(_bo.territoires) ? _bo.territoires : [];
  const boUsers = _bo.boUsers || [];
  const {
    hasPermission,
    updateZoneStatut,
    addZone,
    updateZoneData,
    deleteZone,
    refreshZones,
    markCategoryRead,
  } = _bo;

  const refreshZonesRef = useRef(refreshZones);
  refreshZonesRef.current = refreshZones;

  useEffect(() => {
    void (async () => {
      try {
        await refreshZonesRef.current();
      } catch {
        /* erreur déjà gérée dans le contexte */
      }
    })();
  }, []);

  const [activeTab, setActiveTab] = useState<'zones' | 'marches' | 'marches_gps'>('zones');
  const [viewMode, setViewMode] = useState<'liste' | 'carte'>('liste');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  const [filterValue, setFilterValue] = useState<FilterValue>({});
  const [sortKey, setSortKey] = useState<SortKey>('volume_desc');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(() => new Set(['Abidjan']));
  const [visiblePerRegion, setVisiblePerRegion] = useState<Record<string, number>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [editZone, setEditZone] = useState<BOZone | null>(null);
  const [form, setForm] = useState({ nom: '', ville: '', region: '', gestionnaire: '', description: '' });
  const [marchesInitiaux, setMarchesInitiaux] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BOZone | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmCloseCreate, setConfirmCloseCreate] = useState(false);

  const [marchesRecords, setMarchesRecords] = useState<BOMMarche[]>([]);
  const [loadingMarches, setLoadingMarches] = useState(false);
  const [marchesSearch, setMarchesSearch] = useState('');
  const [marchesSearchResetKey, setMarchesSearchResetKey] = useState(0);
  const [marchesFilterValue, setMarchesFilterValue] = useState<FilterValue>({});
  const [marchesSortKey, setMarchesSortKey] = useState<MarcheSortKey>('zone');
  const [expandedMarcheZones, setExpandedMarcheZones] = useState<Set<string>>(new Set());
  const [createMarcheOpen, setCreateMarcheOpen] = useState(false);
  const [editMarcheTarget, setEditMarcheTarget] = useState<BOMMarche | null>(null);
  const [deleteMarcheTarget, setDeleteMarcheTarget] = useState<BOMMarche | null>(null);
  const [marcheForm, setMarcheForm] = useState<{
    nom: string;
    zoneId: string;
    type: 'couvert' | 'decouvert' | 'mixte' | 'autre';
    adresse: string;
    latitude: string;
    longitude: string;
    description: string;
    actif: boolean;
  }>({
    nom: '',
    zoneId: '',
    type: 'autre',
    adresse: '',
    latitude: '',
    longitude: '',
    description: '',
    actif: true,
  });
  const [marcheSubmitting, setMarcheSubmitting] = useState(false);
  const [deleteMarcheLoading, setDeleteMarcheLoading] = useState(false);

  const refreshMarchesList = useCallback(async () => {
    setLoadingMarches(true);
    try {
      const raw = await boGetMarches();
      const arr = Array.isArray(raw) ? raw : [];
      const next = arr.map((row) => normalizeMarche(row as Record<string, unknown>));
      setMarchesRecords(next);
      setExpandedMarcheZones((prev) => {
        if (prev.size > 0) return prev;
        const byZone = new Map<string, BOMMarche[]>();
        next.forEach((m) => {
          if (!byZone.has(m.zoneId)) byZone.set(m.zoneId, []);
          byZone.get(m.zoneId)!.push(m);
        });
        const keys = [...byZone.keys()].sort((a, b) => {
          const na = next.find((x) => x.zoneId === a)?.zoneNom || '';
          const nb = next.find((x) => x.zoneId === b)?.zoneNom || '';
          return na.localeCompare(nb, 'fr');
        });
        return keys.length ? new Set([keys[0]]) : new Set();
      });
    } catch {
      toast.error('Impossible de charger les marchés.');
      setMarchesRecords([]);
    } finally {
      setLoadingMarches(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'marches') return;
    void refreshMarchesList();
  }, [activeTab, refreshMarchesList]);

  const gestionnairesOptions = useMemo(() => {
    const list = (boUsers as any[]).filter(
      (u) => u.role === 'gestionnaire_zone' || u.role === 'admin_general' || u.role === 'super_admin',
    );
    return list.length ? list : (boUsers as any[]);
  }, [boUsers]);

  const nbMarchesTotal = useMemo(() => {
    let t = 0;
    territoires.forEach((ville: any) => {
      ville.communes?.forEach((c: any) => {
        t += c.marches?.length || 0;
      });
    });
    return t;
  }, [territoires]);

  const nbZonesActives = useMemo(() => zones.filter((z) => isZoneActive(z)).length, [zones]);
  const totalActeurs = useMemo(() => zones.reduce((s, z) => s + (Number(z.nbActeurs) || 0), 0), [zones]);
  const volumeTotal = useMemo(() => zones.reduce((s, z) => s + (Number(z.volumeTotal) || 0), 0), [zones]);

  const moyenneTauxActivite = useMemo(() => {
    const zonesActives = zones.filter((z) => isZoneActive(z));
    if (!zonesActives.length) return 0;
    return Math.round(
      zonesActives.reduce((sum, z) => sum + (Number(z.tauxActivite) || 0), 0) / zonesActives.length,
    );
  }, [zones]);

  const filteredZones = useMemo(() => {
    let list = [...zones];
    const q = localSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((z) => {
        const nom = String(z.nom || '').toLowerCase();
        const ville = String(z.ville || '').toLowerCase();
        const region = groupeRegionLibelle(z).toLowerCase();
        return nom.includes(q) || ville.includes(q) || region.includes(q);
      });
    }
    const reg = filterValue.region as string | undefined;
    if (reg) {
      const expanded = expandRegionFilterForZones(reg);
      if (expanded?.length) {
        list = list.filter((z) => expanded.includes(groupeRegionLibelle(z)));
      }
    }
    const st = filterValue.statut as string | undefined;
    if (st === 'active') list = list.filter((z) => isZoneActive(z));
    if (st === 'inactive') list = list.filter((z) => !isZoneActive(z));
    const act = filterValue.activite as string | undefined;
    if (act === 'eleve') list = list.filter((z) => (Number(z.tauxActivite) || 0) > 10);
    if (act === 'moyen') {
      list = list.filter((z) => {
        const t = Number(z.tauxActivite) || 0;
        return t > 0 && t <= 10;
      });
    }
    if (act === 'faible') list = list.filter((z) => (Number(z.tauxActivite) || 0) === 0);

    list.sort((a, b) => {
      const va = Number(a.volumeTotal) || 0;
      const vb = Number(b.volumeTotal) || 0;
      const na = Number(a.nbActeurs) || 0;
      const nb = Number(b.nbActeurs) || 0;
      const ta = Number(a.tauxActivite) || 0;
      const tb = Number(b.tauxActivite) || 0;
      const naStr = String(a.nom || '');
      const nbStr = String(b.nom || '');
      switch (sortKey) {
        case 'volume_desc': return vb - va;
        case 'volume_asc': return va - vb;
        case 'acteurs_desc': return nb - na;
        case 'acteurs_asc': return na - nb;
        case 'taux_desc': return tb - ta;
        case 'taux_asc': return ta - tb;
        case 'name_asc': return naStr.localeCompare(nbStr, 'fr');
        case 'name_desc': return nbStr.localeCompare(naStr, 'fr');
        default: return 0;
      }
    });
    return list;
  }, [zones, localSearch, filterValue, sortKey, territoires]);

  const groupedByRegion = useMemo(() => {
    const m = new Map<string, BOZone[]>();
    filteredZones.forEach((z) => {
      const r = groupeRegionLibelle(z);
      if (!m.has(r)) m.set(r, []);
      m.get(r)!.push(z);
    });
    const entries = Array.from(m.entries()).map(([region, zs]) => {
      const vol = zs.reduce((s, z) => s + (Number(z.volumeTotal) || 0), 0);
      return { region, zones: zs, volume: vol };
    });
    entries.sort((a, b) => b.volume - a.volume);
    return entries;
  }, [filteredZones]);

  const marchesFilterGroups = useMemo(
    () => [
      {
        id: 'zoneId',
        label: 'Zone',
        options: zones
          .filter((z) => z.id)
          .map((z) => ({ value: String(z.id), label: String(z.nom || z.id) })),
      },
      {
        id: 'type',
        label: 'Type',
        options: [
          { value: 'couvert', label: 'Couvert' },
          { value: 'decouvert', label: 'Découvert' },
          { value: 'mixte', label: 'Mixte' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        id: 'statut',
        label: 'Statut',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    ],
    [zones],
  );

  const filteredMarches = useMemo(() => {
    let list = [...marchesRecords];
    const q = marchesSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((m) => {
        const blob = `${m.nom} ${m.zoneNom} ${m.zoneRegion} ${m.adresse || ''}`.toLowerCase();
        return blob.includes(q);
      });
    }
    const zid = marchesFilterValue.zoneId as string | undefined;
    if (zid) list = list.filter((m) => m.zoneId === zid);
    const tp = marchesFilterValue.type as string | undefined;
    if (tp) list = list.filter((m) => m.type === tp);
    const st = marchesFilterValue.statut as string | undefined;
    if (st === 'active') list = list.filter((m) => isMarcheActive(m));
    if (st === 'inactive') list = list.filter((m) => !isMarcheActive(m));

    const cmpNom = (a: BOMMarche, b: BOMMarche) => a.nom.localeCompare(b.nom, 'fr');
    if (marchesSortKey === 'nom_asc') list.sort(cmpNom);
    else if (marchesSortKey === 'nom_desc') list.sort((a, b) => cmpNom(b, a));
    else if (marchesSortKey === 'date_desc') {
      list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    } else if (marchesSortKey === 'type') list.sort((a, b) => a.type.localeCompare(b.type, 'fr'));
    return list;
  }, [marchesRecords, marchesSearch, marchesFilterValue, marchesSortKey]);

  const marchesByZone = useMemo(() => {
    const m = new Map<string, { zoneId: string; zoneNom: string; zoneRegion: string; items: BOMMarche[] }>();
    filteredMarches.forEach((row) => {
      const key = row.zoneId || '_';
      if (!m.has(key)) {
        m.set(key, {
          zoneId: key,
          zoneNom: row.zoneNom || 'Zone',
          zoneRegion: row.zoneRegion || '',
          items: [],
        });
      }
      m.get(key)!.items.push(row);
    });
    const groups = [...m.values()];
    const cmpMarche = (a: BOMMarche, b: BOMMarche) => {
      if (marchesSortKey === 'nom_asc') return a.nom.localeCompare(b.nom, 'fr');
      if (marchesSortKey === 'nom_desc') return b.nom.localeCompare(a.nom, 'fr');
      if (marchesSortKey === 'date_desc') {
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      }
      if (marchesSortKey === 'type') return a.type.localeCompare(b.type, 'fr');
      return a.nom.localeCompare(b.nom, 'fr');
    };
    groups.forEach((g) => {
      g.items.sort(cmpMarche);
    });
    groups.sort((a, b) => a.zoneNom.localeCompare(b.zoneNom, 'fr'));
    return groups;
  }, [filteredMarches, marchesSortKey]);

  const marchesKpis = useMemo(() => {
    const total = marchesRecords.length;
    const actifs = marchesRecords.filter(isMarcheActive).length;
    const avec = marchesRecords.filter((x) => marcheHasGps(x)).length;
    return { total, actifs, avec, sans: Math.max(0, total - avec) };
  }, [marchesRecords]);

  const marchesSortMenuItems: DropdownEntry[] = (Object.keys(MARCHE_SORT_LABELS) as MarcheSortKey[]).map((key) => ({
    id: key,
    label: MARCHE_SORT_LABELS[key],
    onClick: () => setMarchesSortKey(key),
  }));

  const marchesActiveChips = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (marchesSearch.trim()) chips.push({ id: '__msearch', label: `Recherche : ${marchesSearch.trim()}` });
    const zid = marchesFilterValue.zoneId as string | undefined;
    if (zid) {
      const z = zones.find((x) => String(x.id) === zid);
      chips.push({ id: 'zoneId', label: `Zone : ${String(z?.nom || zid)}` });
    }
    const tp = marchesFilterValue.type as string | undefined;
    if (tp) chips.push({ id: 'type', label: `Type : ${tp}` });
    const st = marchesFilterValue.statut as string | undefined;
    if (st === 'active') chips.push({ id: 'statut', label: 'Statut : Active' });
    if (st === 'inactive') chips.push({ id: 'statut', label: 'Statut : Inactive' });
    return chips;
  }, [marchesSearch, marchesFilterValue, zones]);

  const filterGroups = useMemo(
    () => [
      {
        id: 'region',
        label: 'Région',
        options: [
          ...CIV_REGIONS_FILTER.map((r) => ({ value: r, label: r })),
          { value: REGION_NON_DEFINIE, label: REGION_NON_DEFINIE },
        ],
      },
      {
        id: 'statut',
        label: 'Statut',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
      {
        id: 'activite',
        label: 'Activité',
        options: [
          { value: 'eleve', label: 'Élevée (>10%)' },
          { value: 'moyen', label: 'Moyenne (1-10%)' },
          { value: 'faible', label: 'Faible (0%)' },
        ],
      },
    ],
    [],
  );

  const sortMenuItems: DropdownEntry[] = (Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
    id: key,
    label: SORT_LABELS[key],
    onClick: () => setSortKey(key),
  }));

  const activeChips = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (localSearch.trim()) chips.push({ id: '__search', label: `Recherche : ${localSearch.trim()}` });
    const r = filterValue.region as string | undefined;
    if (r) chips.push({ id: 'region', label: `Région : ${r}` });
    const st = filterValue.statut as string | undefined;
    if (st === 'active') chips.push({ id: 'statut', label: 'Statut : Active' });
    if (st === 'inactive') chips.push({ id: 'statut', label: 'Statut : Inactive' });
    const ac = filterValue.activite as string | undefined;
    if (ac === 'eleve') chips.push({ id: 'activite', label: 'Activité : élevée' });
    if (ac === 'moyen') chips.push({ id: 'activite', label: 'Activité : moyenne' });
    if (ac === 'faible') chips.push({ id: 'activite', label: 'Activité : faible' });
    return chips;
  }, [localSearch, filterValue]);

  const clearChip = (id: string) => {
    if (id === '__search') {
      setLocalSearch('');
      setSearchResetKey((k) => k + 1);
    } else setFilterValue((prev) => {
      const next = { ...prev };
      delete next[id as keyof FilterValue];
      return next;
    });
  };

  const clearAllFilters = () => {
    setLocalSearch('');
    setFilterValue({});
    setSearchResetKey((k) => k + 1);
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const getVisibleCount = (region: string, total: number) => {
    const v = visiblePerRegion[region];
    if (v != null) return Math.min(v, total);
    return Math.min(4, total);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep(1);
    setForm({ nom: '', ville: '', region: '', gestionnaire: '', description: '' });
    setMarchesInitiaux(['']);
    setConfirmCloseCreate(false);
  };

  const requestCloseCreate = () => {
    if (form.nom.trim() || form.ville.trim() || form.region.trim() || form.description.trim() || marchesInitiaux.some((m) => m.trim())) {
      setConfirmCloseCreate(true);
    } else {
      closeCreateModal();
    }
  };

  const openCreate = () => {
    setCreateStep(1);
    setForm({ nom: '', ville: '', region: '', gestionnaire: '', description: '' });
    setMarchesInitiaux(['']);
    setShowCreateModal(true);
  };

  const openEdit = (z: BOZone) => {
    setEditZone(z);
    setForm({
      nom: String(z.nom || ''),
      ville: String(z.ville || ''),
      region: String(z.region || ''),
      gestionnaire: String(z.gestionnaire || ''),
      description: String((z as any).description || ''),
    });
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const marchesValides = marchesInitiaux.filter((m) => m.trim());
      await addZone({
        nom: form.nom,
        ville: form.ville,
        region: form.region,
        gestionnaire: form.gestionnaire || undefined,
        description: form.description.trim() || undefined,
        marches: marchesValides,
      } as any);
      toast.success(`La zone « ${form.nom} » a été créée.`);
      closeCreateModal();
    } catch {
      toast.error('La création de la zone a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editZone?.id) return;
    setIsSubmitting(true);
    try {
      await updateZoneData(editZone.id, {
        nom: form.nom,
        region: form.region,
        gestionnaire: form.gestionnaire || undefined,
        ville: form.ville || undefined,
        description: form.description.trim() || undefined,
      } as any);
      toast.success('La zone a été mise à jour.');
      setEditZone(null);
    } catch {
      toast.error('La mise à jour a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatut = async (z: BOZone) => {
    try {
      const next = isZoneActive(z) ? 'inactive' : 'active';
      await updateZoneStatut(String(z.id), next);
      toast.success(next === 'active' ? 'La zone est réactivée.' : 'La zone est suspendue.');
    } catch {
      toast.error('Impossible de modifier le statut.');
    }
  };

  const handleDeleteConfirm = async (motif: string) => {
    if (!deleteTarget?.id) return;
    const n = Number(deleteTarget.nbActeurs) || 0;
    if (n > 0) {
      toast.error(`Cette zone contient ${n} acteur${n > 1 ? 's' : ''}. Réaffectez-les avant suppression.`);
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteZone(String(deleteTarget.id), { motif });
      toast.success('La zone a été supprimée.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La suppression a échoué.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMapZoneSelect = useCallback((z: BOZone) => {
    setFilterValue((prev) => ({ ...prev, region: groupeRegionLibelle(z) }));
    setViewMode('liste');
    setActiveTab('zones');
    setExpandedRegions((prev) => new Set(prev).add(groupeRegionLibelle(z)));
  }, []);

  const handleMapRegionDetail = useCallback((regionName: string) => {
    setFilterValue((prev) => ({ ...prev, region: regionName }));
    setViewMode('liste');
    setActiveTab('zones');
    const expanded = expandRegionFilterForZones(regionName);
    if (expanded?.length) {
      setExpandedRegions((prev) => {
        const n = new Set(prev);
        expanded.forEach((r) => n.add(r));
        return n;
      });
    } else {
      setExpandedRegions((prev) => new Set(prev).add(regionName));
    }
  }, []);

  const handleMapRegionFilterChange = useCallback((regionKey: string | null) => {
    setFilterValue((prev) => {
      const next = { ...prev };
      if (regionKey == null || regionKey === '') delete next.region;
      else next.region = regionKey;
      return next;
    });
  }, []);

  const resetMarcheForm = useCallback(() => {
    setMarcheForm({
      nom: '',
      zoneId: '',
      type: 'autre',
      adresse: '',
      latitude: '',
      longitude: '',
      description: '',
      actif: true,
    });
  }, []);

  const openCreateMarcheModal = useCallback(() => {
    resetMarcheForm();
    setEditMarcheTarget(null);
    setCreateMarcheOpen(true);
  }, [resetMarcheForm]);

  const openEditMarcheModal = useCallback((m: BOMMarche) => {
    setEditMarcheTarget(m);
    const t = m.type;
    const typeOk: 'couvert' | 'decouvert' | 'mixte' | 'autre' =
      t === 'couvert' || t === 'decouvert' || t === 'mixte' || t === 'autre' ? t : 'autre';
    setMarcheForm({
      nom: m.nom,
      zoneId: m.zoneId,
      type: typeOk,
      adresse: (m.adresse || '').trim(),
      latitude: m.latitude != null && String(m.latitude).trim() ? String(m.latitude) : '',
      longitude: m.longitude != null && String(m.longitude).trim() ? String(m.longitude) : '',
      description: (m.description || '').trim(),
      actif: m.actif,
    });
    setCreateMarcheOpen(true);
  }, []);

  const handleToggleMarcheActif = useCallback(
    async (m: BOMMarche) => {
      try {
        await boUpdateMarche(m.id, { actif: !isMarcheActive(m) });
        toast.success(isMarcheActive(m) ? 'Le marché est suspendu.' : 'Le marché est réactivé.');
        await refreshMarchesList();
      } catch {
        toast.error('Impossible de modifier le statut du marché.');
      }
    },
    [refreshMarchesList],
  );

  const handleDeleteMarcheConfirm = useCallback(
    async (motif: string) => {
      if (!deleteMarcheTarget) return;
      setDeleteMarcheLoading(true);
      try {
        await boDeleteMarche(deleteMarcheTarget.id, { motif });
        toast.success('Le marché a été supprimé.');
        setDeleteMarcheTarget(null);
        await refreshMarchesList();
      } catch {
        toast.error('La suppression a échoué.');
      } finally {
        setDeleteMarcheLoading(false);
      }
    },
    [deleteMarcheTarget, refreshMarchesList],
  );

  const submitMarcheForm = useCallback(async () => {
    const nom = marcheForm.nom.trim();
    if (nom.length < 2) {
      toast.error('Le nom doit comporter au moins 2 caractères.');
      return;
    }
    if (!marcheForm.zoneId) {
      toast.error('La zone parente est obligatoire.');
      return;
    }
    const latStr = marcheForm.latitude.trim();
    const lngStr = marcheForm.longitude.trim();
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (latStr || lngStr) {
      if (!latStr || !lngStr) {
        toast.error('Renseignez la latitude et la longitude, ou laissez les deux champs vides.');
        return;
      }
      latitude = Number(latStr.replace(',', '.'));
      longitude = Number(lngStr.replace(',', '.'));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        toast.error('Latitude ou longitude invalide.');
        return;
      }
    }
    setMarcheSubmitting(true);
    try {
      const payload = {
        nom,
        zoneId: marcheForm.zoneId,
        type: marcheForm.type,
        adresse: marcheForm.adresse.trim() || undefined,
        latitude,
        longitude,
        description: marcheForm.description.trim() || undefined,
        actif: marcheForm.actif,
      };
      if (editMarcheTarget) {
        await boUpdateMarche(editMarcheTarget.id, payload);
        toast.success('Le marché a été mis à jour.');
      } else {
        await boCreateMarche(payload);
        toast.success('Le marché a été créé.');
      }
      setCreateMarcheOpen(false);
      setEditMarcheTarget(null);
      resetMarcheForm();
      await refreshMarchesList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'enregistrement a échoué.");
    } finally {
      setMarcheSubmitting(false);
    }
  }, [marcheForm, editMarcheTarget, resetMarcheForm, refreshMarchesList]);

  const clearMarcheChip = (id: string) => {
    if (id === '__msearch') {
      setMarchesSearch('');
      setMarchesSearchResetKey((k) => k + 1);
    } else {
      setMarchesFilterValue((prev) => {
        const next = { ...prev };
        delete next[id as keyof FilterValue];
        return next;
      });
    }
  };

  const clearAllMarchesFilters = () => {
    setMarchesSearch('');
    setMarchesFilterValue({});
    setMarchesSearchResetKey((k) => k + 1);
  };

  const toggleMarcheZoneExpanded = (zoneId: string) => {
    setExpandedMarcheZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const getMarcheMenuItems = (m: BOMMarche): DropdownEntry[] => {
    if (!hasPermission('zones.write')) return [];
    return [
      {
        id: 'edit-m',
        label: 'Éditer',
        icon: Edit2,
        onClick: () => openEditMarcheModal(m),
      } as DropdownEntry,
      {
        id: 'toggle-m',
        label: isMarcheActive(m) ? 'Suspendre' : 'Réactiver',
        icon: Power,
        onClick: () => void handleToggleMarcheActif(m),
      } as DropdownEntry,
      { id: 'sep-m', divider: true } as DropdownEntry,
      {
        id: 'del-m',
        label: 'Supprimer',
        icon: Trash2,
        type: 'danger' as const,
        onClick: () => setDeleteMarcheTarget(m),
      } as DropdownEntry,
    ];
  };

  const inputCls = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm';

  const getZoneMenuItems = (z: BOZone): DropdownEntry[] => {
    if (!hasPermission('zones.write')) return [];
    return [
      {
        id: 'edit',
        label: 'Éditer la zone',
        icon: Edit2,
        onClick: () => openEdit(z),
      } as DropdownEntry,
      {
        id: 'toggle',
        label: isZoneActive(z) ? 'Suspendre' : 'Réactiver',
        icon: Power,
        onClick: () => void handleToggleStatut(z),
      } as DropdownEntry,
      { id: 'sep-edit', divider: true } as DropdownEntry,
      {
        id: 'del',
        label: 'Supprimer',
        icon: Trash2,
        type: 'danger' as const,
        onClick: () => setDeleteTarget(z),
      } as DropdownEntry,
    ];
  };

  const renderRegionBlock = (region: string, zs: BOZone[]) => {
    const expanded = expandedRegions.has(region);
    const nbAct = zs.reduce((s, z) => s + (Number(z.nbActeurs) || 0), 0);
    const nbId = zs.reduce((s, z) => s + (Number(z.nbIdentificateurs) || 0), 0);
    const vol = zs.reduce((s, z) => s + (Number(z.volumeTotal) || 0), 0);
    const tauxMoy = zs.length ? Math.round(zs.reduce((s, z) => s + (Number(z.tauxActivite) || 0), 0) / zs.length) : 0;
    const regionActive = zs.some((z) => isZoneActive(z));
    const barBg = activityBarBg(tauxMoy);
    const total = zs.length;
    const vis = getVisibleCount(region, total);
    const hidden = Math.max(0, total - vis);

    return (
      <div key={region} style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => toggleRegion(region)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #E5E1D8',
            background: '#fff',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: regionActive ? BO_PRIMARY : BO_TINT,
              color: regionActive ? '#fff' : BO_PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {region.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#1F1F1F' }}>{region}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: regionActive ? '#EAF3DE' : '#F5F3EF',
                  color: regionActive ? '#3B6D11' : '#5B5248',
                }}
              >
                {zs.length} commune{zs.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              {nbAct.toLocaleString('fr-FR')} acteurs · {nbId.toLocaleString('fr-FR')} identificateurs · {formatFCFA(vol)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: barBg }}>{tauxMoy}%</span>
            <div style={{ width: 60, height: 6, borderRadius: 4, background: '#F0EBE3', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, tauxMoy)}%`, height: '100%', background: barBg }} />
            </div>
          </div>
        </button>
        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
            {zs.slice(0, vis).map((z, zi) => {
              const marchesN = countMarchesForZone(String(z.id), territoires);
              const vol = Number(z.volumeTotal) || 0;
              const menuItems = getZoneMenuItems(z);
              return (
                <UniversalCardBOZoneRow
                  key={String(z.id)}
                  index={zi}
                  nom={String(z.nom || '')}
                  regionLabel={groupeRegionLibelle(z)}
                  marchesCount={marchesN}
                  nbActeurs={Number(z.nbActeurs) || 0}
                  nbIdentificateurs={Number(z.nbIdentificateurs) || 0}
                  volumeFcfaLabel={formatFCFA(vol)}
                  volumePositive={vol > 0}
                  tauxActivite={Number(z.tauxActivite) || 0}
                  active={isZoneActive(z)}
                  menuItems={menuItems}
                  showMenu={hasPermission('zones.write')}
                />
              );
            })}
          </div>
        )}
        {expanded && hidden > 0 && (
          <button
            type="button"
            onClick={() =>
              setVisiblePerRegion((prev) => ({
                ...prev,
                [region]: total,
              }))
            }
            style={{
              marginTop: 8,
              width: '100%',
              padding: 8,
              borderRadius: 10,
              border: `1px dashed ${BO_PRIMARY}`,
              background: '#fff',
              color: BO_PRIMARY,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Voir les {hidden} autres communes
          </button>
        )}
      </div>
    );
  };

  const modalOpen = showCreateModal || !!editZone;
  const modalTitle = editZone ? 'Éditer la zone' : createStep === 1 ? 'Nouvelle zone' : 'Marchés initiaux';
  const modalSubtitle = editZone
    ? String(editZone.nom || '')
    : createStep === 1
      ? 'Informations zone'
      : 'Étape 2 sur 2';

  const modalBody = editZone ? (
    <form id="bo-zone-form" onSubmit={handleEditSave} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Nom *</label>
        <input value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} required className={inputCls} />
      </div>
      <FilterableSelect
        label="Région"
        value={form.region}
        options={CIV_REGIONS_FILTER}
        onChange={(v) => setForm((p) => ({ ...p, region: v }))}
        placeholder="Choisir une région…"
        required
      />
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Ville</label>
        <select
          value={form.ville}
          onChange={(e) => {
            const found = VILLES.find((v) => v.ville === e.target.value);
            setForm((p) => ({ ...p, ville: e.target.value, region: found?.region || p.region }));
          }}
          className={inputCls}
        >
          <option value="">Choisir une ville…</option>
          {VILLES.map((v) => (
            <option key={v.ville} value={v.ville}>
              {v.ville} · {v.region}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Gestionnaire</label>
        <select
          value={form.gestionnaire}
          onChange={(e) => setForm((p) => ({ ...p, gestionnaire: e.target.value }))}
          className={inputCls}
        >
          <option value="">Non assigné</option>
          {gestionnairesOptions.map((u: any) => {
            const nom = u.full_name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.phone;
            return (
              <option key={u.id} value={nom}>
                {nom}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className={inputCls}
          rows={3}
          placeholder="Notes internes, consignes…"
        />
      </div>
    </form>
  ) : createStep === 1 ? (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Nom de la commune *</label>
        <input
          value={form.nom}
          onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
          className={inputCls}
          placeholder="Ex. : Cocody, Abobo…"
          required
        />
      </div>
      <FilterableSelect
        label="Région *"
        value={form.region}
        options={CIV_REGIONS_FILTER}
        onChange={(v) => setForm((p) => ({ ...p, region: v }))}
        placeholder="Choisir une région…"
        required
      />
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Ville *</label>
        <select
          value={form.ville}
          onChange={(e) => {
            const found = VILLES.find((v) => v.ville === e.target.value);
            setForm((p) => ({ ...p, ville: e.target.value, region: found?.region || p.region }));
          }}
          className={inputCls}
          required
        >
          <option value="">Choisir une ville…</option>
          {VILLES.map((v) => (
            <option key={v.ville} value={v.ville}>
              {v.ville} · {v.region}
            </option>
          ))}
        </select>
      </div>
      {form.region && (
        <div className="px-4 py-2 bg-gray-50 rounded-xl text-xs text-gray-500 font-semibold">
          Région sélectionnée : <span className="font-black text-gray-700">{form.region}</span>
        </div>
      )}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Gestionnaire</label>
        <select
          value={form.gestionnaire}
          onChange={(e) => setForm((p) => ({ ...p, gestionnaire: e.target.value }))}
          className={inputCls}
        >
          <option value="">Non assigné</option>
          {gestionnairesOptions.map((u: any) => {
            const nom = u.full_name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.phone;
            return (
              <option key={u.id} value={nom}>
                {nom}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className={inputCls}
          rows={3}
          placeholder="Notes internes, consignes…"
        />
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-100">
        <p className="text-xs text-gray-500 font-semibold">Commune</p>
        <p className="font-black text-gray-900">
          {form.nom} <span className="font-semibold text-gray-500">· {form.ville}</span>
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-gray-700">
            Marchés <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <button
            type="button"
            onClick={() => setMarchesInitiaux((p) => [...p, ''])}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500"
          >
            <Plus className="w-3 h-3" /> Ajouter
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {marchesInitiaux.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={m}
                onChange={(e) => setMarchesInitiaux((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                className={inputCls}
                placeholder={`Marché ${i + 1}…`}
              />
              {marchesInitiaux.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMarchesInitiaux((p) => p.filter((_, j) => j !== i))}
                  className="w-11 h-11 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const modalFooter = editZone ? (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={() => setEditZone(null)}
        className="px-5 py-2.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
      >
        Annuler
      </button>
      <button
        type="submit"
        form="bo-zone-form"
        disabled={isSubmitting}
        className="px-5 py-2.5 rounded-2xl font-bold text-white disabled:opacity-60"
        style={{ background: BO_PRIMARY }}
      >
        {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  ) : createStep === 1 ? (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={() => requestCloseCreate()}
        className="px-5 py-2.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={() => {
          if (form.nom && form.ville && form.region) setCreateStep(2);
          else toast.error('Veuillez renseigner le nom, la ville et la région.');
        }}
        className="px-5 py-2.5 rounded-2xl font-bold text-white"
        style={{ background: BO_PRIMARY }}
      >
        Suivant
      </button>
    </div>
  ) : (
    <div className="flex gap-3 justify-end flex-wrap">
      <button
        type="button"
        onClick={() => setCreateStep(1)}
        className="px-4 py-2.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
      >
        Retour
      </button>
      <button
        type="button"
        onClick={() => {
          setMarchesInitiaux(['']);
          void handleCreate();
        }}
        className="px-4 py-2.5 rounded-2xl font-bold text-gray-600 border-2 border-gray-200"
      >
        Ignorer
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleCreate()}
        className="px-5 py-2.5 rounded-2xl font-bold text-white disabled:opacity-60"
        style={{ background: BO_PRIMARY }}
      >
        {isSubmitting ? 'Création…' : 'Créer'}
      </button>
    </div>
  );

  const marcheModalBody = (
    <form
      id="bo-marche-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submitMarcheForm();
      }}
    >
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Nom *</label>
        <input
          value={marcheForm.nom}
          onChange={(e) => setMarcheForm((p) => ({ ...p, nom: e.target.value }))}
          className={inputCls}
          placeholder="Nom du marché"
          required
          minLength={2}
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Zone parente *</label>
        <select
          value={marcheForm.zoneId}
          onChange={(e) => setMarcheForm((p) => ({ ...p, zoneId: e.target.value }))}
          className={inputCls}
          required
        >
          <option value="">Choisir une zone…</option>
          {zones
            .filter((z) => z.id)
            .map((z) => (
              <option key={String(z.id)} value={String(z.id)}>
                {String(z.nom || z.id)} · {groupeRegionLibelle(z)}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
        <select
          value={marcheForm.type}
          onChange={(e) =>
            setMarcheForm((p) => ({
              ...p,
              type: e.target.value as 'couvert' | 'decouvert' | 'mixte' | 'autre',
            }))
          }
          className={inputCls}
        >
          <option value="couvert">Couvert</option>
          <option value="decouvert">Découvert</option>
          <option value="mixte">Mixte</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Adresse</label>
        <textarea
          value={marcheForm.adresse}
          onChange={(e) => setMarcheForm((p) => ({ ...p, adresse: e.target.value }))}
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="Adresse du marché"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Latitude</label>
          <input
            value={marcheForm.latitude}
            onChange={(e) => setMarcheForm((p) => ({ ...p, latitude: e.target.value }))}
            className={inputCls}
            inputMode="decimal"
            placeholder="Ex. : 5.32"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Longitude</label>
          <input
            value={marcheForm.longitude}
            onChange={(e) => setMarcheForm((p) => ({ ...p, longitude: e.target.value }))}
            className={inputCls}
            inputMode="decimal"
            placeholder="Ex. : -4.02"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
        <textarea
          value={marcheForm.description}
          onChange={(e) => setMarcheForm((p) => ({ ...p, description: e.target.value }))}
          className={inputCls}
          rows={3}
          placeholder="Informations complémentaires (optionnel)"
        />
      </div>
      <div className="flex items-center justify-between rounded-2xl border-2 border-gray-100 px-4 py-3">
        <span className="text-sm font-bold text-gray-700">Actif</span>
        <button
          type="button"
          role="switch"
          aria-checked={marcheForm.actif}
          onClick={() => setMarcheForm((p) => ({ ...p, actif: !p.actif }))}
          className="relative h-8 w-14 rounded-full transition-colors"
          style={{ background: marcheForm.actif ? BO_PRIMARY : '#D1D5DB' }}
        >
          <span
            className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
            style={{ left: marcheForm.actif ? 30 : 4 }}
          />
        </button>
      </div>
    </form>
  );

  const marcheModalFooter = (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={() => {
          if (marcheSubmitting) return;
          setCreateMarcheOpen(false);
          setEditMarcheTarget(null);
          resetMarcheForm();
        }}
        className="px-5 py-2.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
      >
        Annuler
      </button>
      <button
        type="submit"
        form="bo-marche-form"
        disabled={marcheSubmitting}
        className="px-5 py-2.5 rounded-2xl font-bold text-white disabled:opacity-60"
        style={{ background: BO_PRIMARY }}
      >
        {marcheSubmitting ? 'Enregistrement…' : editMarcheTarget ? 'Enregistrer' : 'Créer'}
      </button>
    </div>
  );

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Zones & Territoires</h1>
          <p className="text-sm text-gray-500 mt-1">
            {zones.length} zones · {totalActeurs.toLocaleString('fr-FR')} acteurs · {formatFCFA(volumeTotal)} volume
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginLeft: 'auto',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: 3,
              background: '#F5F3EF',
              border: '1px solid #E5E1D8',
              borderRadius: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('zones')}
              style={{
                padding: '7px 20px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'zones' ? '#5B5248' : 'transparent',
                color: activeTab === 'zones' ? '#FFFFFF' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MapPin size={14} />
              Zones
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: activeTab === 'zones' ? 'rgba(255,255,255,0.22)' : '#E5E1D8',
                  color: activeTab === 'zones' ? '#FFFFFF' : '#5B5248',
                  lineHeight: 1.2,
                }}
              >
                {zones.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('marches')}
              style={{
                padding: '7px 20px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'marches' ? '#5B5248' : 'transparent',
                color: activeTab === 'marches' ? '#FFFFFF' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Store size={14} />
              Marchés
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: activeTab === 'marches' ? 'rgba(255,255,255,0.22)' : '#E5E1D8',
                  color: activeTab === 'marches' ? '#FFFFFF' : '#5B5248',
                  lineHeight: 1.2,
                }}
              >
                {nbMarchesTotal}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('marches_gps')}
              style={{
                padding: '7px 20px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'marches_gps' ? '#5B5248' : 'transparent',
                color: activeTab === 'marches_gps' ? '#FFFFFF' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Navigation size={14} />
              Saisie GPS
            </button>
          </div>
          {hasPermission('zones.write') && activeTab === 'zones' && (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-bold shadow-md"
              style={{ background: BO_PRIMARY }}
            >
              <Plus className="w-5 h-5" />
              Nouvelle zone
            </button>
          )}
          {hasPermission('zones.write') && activeTab === 'marches' && (
            <button
              type="button"
              onClick={openCreateMarcheModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-bold shadow-md"
              style={{ background: BO_PRIMARY }}
            >
              <Plus className="w-5 h-5" />
              Nouveau marché
            </button>
          )}
        </div>
      </div>

      {activeTab === 'marches' && (
        <>
          <KPIGrid cols={4} className="mb-4">
            <UniversalKPI
              label="Total marchés"
              animatedTarget={marchesKpis.total}
              icon={Store}
              color={KPI_BRUN.text}
              bgColor={KPI_BRUN.bg}
              borderColor={KPI_BRUN.border}
              iconAnimation="bounce"
            />
            <UniversalKPI
              label="Marchés actifs"
              value={
                marchesKpis.total === 0
                  ? '0 / 0'
                  : `${marchesKpis.actifs} / ${marchesKpis.total}`
              }
              icon={CircleCheck}
              color={KPI_VERT.text}
              bgColor={KPI_VERT.bg}
              borderColor={KPI_VERT.border}
              iconAnimation="float"
            />
            <UniversalKPI
              label="Avec GPS"
              animatedTarget={marchesKpis.avec}
              icon={MapPin}
              color={KPI_BLEU.text}
              bgColor={KPI_BLEU.bg}
              borderColor={KPI_BLEU.border}
              iconAnimation="float"
            />
            <UniversalKPI
              label="Sans GPS"
              animatedTarget={marchesKpis.sans}
              icon={MapIcon}
              color={KPI_AMBER.text}
              bgColor={KPI_AMBER.bg}
              borderColor={KPI_AMBER.border}
              iconAnimation="pulse"
            />
          </KPIGrid>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <UniversalRechercheBO
                  key={marchesSearchResetKey}
                  placeholder="Rechercher un marché, une zone…"
                  onChange={setMarchesSearch}
                />
              </div>
              <div style={{ flexShrink: 0 }}>
                <UniversalFiltreBO
                  groups={marchesFilterGroups}
                  value={marchesFilterValue}
                  onChange={setMarchesFilterValue}
                  triggerLabel="Filtres"
                />
              </div>
            </div>
            <UniversalDropdownMenuBO
              trigger={
                <button
                  type="button"
                  style={{
                    height: 40,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid #D7CFC0',
                    background: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    color: BO_PRIMARY,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Trier : {MARCHE_SORT_LABELS[marchesSortKey]}
                </button>
              }
              items={marchesSortMenuItems}
              align="left"
            />
          </div>

          {marchesActiveChips.length > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #E5E1D8',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              {marchesActiveChips.map((c) => (
                <span
                  key={c.id + c.label}
                  style={{
                    background: '#F5F3EF',
                    color: '#5B5248',
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {c.label}
                  <button
                    type="button"
                    aria-label="Retirer le filtre"
                    onClick={() => clearMarcheChip(c.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllMarchesFilters}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'transparent',
                  color: BO_PRIMARY,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Tout effacer
              </button>
            </div>
          )}

          {loadingMarches ? (
            <p className="text-center text-gray-400 py-12">Chargement des marchés…</p>
          ) : marchesByZone.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucun marché ne correspond à vos critères.</p>
          ) : (
            <div>
              {marchesByZone.map((grp) => {
                const expanded = expandedMarcheZones.has(grp.zoneId);
                const zoneMeta = zones.find((z) => String(z.id) === grp.zoneId);
                const zoneActive = zoneMeta ? isZoneActive(zoneMeta) : true;
                const headerLabel = grp.zoneNom || 'Zone';
                return (
                  <div key={grp.zoneId || '_'} style={{ marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => toggleMarcheZoneExpanded(grp.zoneId)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #E5E1D8',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: zoneActive ? BO_PRIMARY : BO_TINT,
                          color: zoneActive ? '#fff' : BO_PRIMARY,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <MapPin size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#1F1F1F' }}>{headerLabel}</span>
                          {grp.zoneRegion ? (
                            <span style={{ fontSize: 12, color: '#6B7280' }}>{grp.zoneRegion}</span>
                          ) : null}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: '#F5F3EF',
                              color: '#5B5248',
                            }}
                          >
                            {grp.items.length} marché{grp.items.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </button>
                    {expanded && (
                      <div
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          paddingLeft: 8,
                        }}
                      >
                        {grp.items.map((m, mi) => (
                          <UniversalCardBOMarcheRow
                            key={m.id}
                            index={mi}
                            nom={m.nom}
                            typeKey={m.type}
                            adresse={m.adresse}
                            hasGps={marcheHasGps(m)}
                            active={isMarcheActive(m)}
                            menuItems={getMarcheMenuItems(m)}
                            showMenu={hasPermission('zones.write')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'marches_gps' && (
        <MarchesGpsSaisiePanel
          canWrite={hasPermission('zones.write')}
          onMarkCategoryRead={markCategoryRead}
        />
      )}

      {activeTab === 'zones' && (
        <>
          <KPIGrid cols={4} className="mb-4">
            <UniversalKPI
              label="Zones actives"
              animatedTarget={nbZonesActives}
              icon={CircleCheck}
              color={KPI_VERT.text}
              bgColor={KPI_VERT.bg}
              borderColor={KPI_VERT.border}
              iconAnimation="bounce"
            />
            <UniversalKPI
              label="Total acteurs"
              animatedTarget={totalActeurs}
              icon={Users}
              color={KPI_BRUN.text}
              bgColor={KPI_BRUN.bg}
              borderColor={KPI_BRUN.border}
              iconAnimation="float"
            />
            <UniversalKPI
              label="Volume total"
              value={formatFCFA(volumeTotal)}
              icon={TrendingUp}
              color={KPI_BLEU.text}
              bgColor={KPI_BLEU.bg}
              borderColor={KPI_BLEU.border}
              iconAnimation="float"
            />
            <UniversalKPI
              label={'Taux d\u2019activité'}
              value={`${moyenneTauxActivite}%`}
              icon={Activity}
              color={KPI_AMBER.text}
              bgColor={KPI_AMBER.bg}
              borderColor={KPI_AMBER.border}
              iconAnimation="pulse"
            />
          </KPIGrid>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <UniversalRechercheBO
                  key={searchResetKey}
                  placeholder="Rechercher une zone, ville, marché…"
                  onChange={setLocalSearch}
                />
              </div>
              <div style={{ flexShrink: 0 }}>
                <UniversalFiltreBO
                  groups={filterGroups}
                  value={filterValue}
                  onChange={setFilterValue}
                  triggerLabel="Filtres"
                />
              </div>
            </div>
            <UniversalDropdownMenuBO
              trigger={
                <button
                  type="button"
                  style={{
                    height: 40,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: `1px solid #D7CFC0`,
                    background: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    color: BO_PRIMARY,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Trier : {SORT_LABELS[sortKey]}
                </button>
              }
              items={sortMenuItems}
              align="left"
            />
            <div
              style={{
                display: 'inline-flex',
                height: 36,
                borderRadius: 10,
                border: '1px solid #E5E1D8',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('liste')}
                style={{
                  width: 40,
                  height: 36,
                  border: 'none',
                  background: viewMode === 'liste' ? BO_PRIMARY : 'transparent',
                  color: viewMode === 'liste' ? '#fff' : '#999',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Vue liste"
              >
                <List size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('carte')}
                style={{
                  width: 40,
                  height: 36,
                  border: 'none',
                  background: viewMode === 'carte' ? BO_PRIMARY : 'transparent',
                  color: viewMode === 'carte' ? '#fff' : '#999',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Vue carte"
              >
                <MapIcon size={18} />
              </button>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #E5E1D8',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              {activeChips.map((c) => (
                <span
                  key={c.id + c.label}
                  style={{
                    background: '#F5F3EF',
                    color: '#5B5248',
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {c.label}
                  <button
                    type="button"
                    aria-label="Retirer le filtre"
                    onClick={() => clearChip(c.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'transparent',
                  color: BO_PRIMARY,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Tout effacer
              </button>
            </div>
          )}

          {viewMode === 'carte' ? (
            <Suspense fallback={<MapLoading />}>
              <BOZonesMap
                zones={zones}
                mapRegionFilter={(filterValue.region as string | undefined) ?? null}
                onZoneSelect={handleMapZoneSelect}
                onRegionDetail={handleMapRegionDetail}
                onMapRegionFilterChange={handleMapRegionFilterChange}
              />
            </Suspense>
          ) : groupedByRegion.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucune zone ne correspond à vos critères.</p>
          ) : (
            <div>{groupedByRegion.map(({ region, zones: zs }) => renderRegionBlock(region, zs))}</div>
          )}

          <UniversalModalBO
            open={modalOpen}
            onClose={() => {
              if (editZone) setEditZone(null);
              else requestCloseCreate();
            }}
            title={modalTitle}
            subtitle={modalSubtitle}
            icon={MapPin}
            footer={modalFooter}
            size="md"
          >
            {modalBody}
          </UniversalModalBO>

          <UniversalActionWithReasonModalBO
            open={!!deleteTarget}
            onClose={() => !deleteLoading && setDeleteTarget(null)}
            onConfirm={async (reason) => {
              await handleDeleteConfirm(reason);
            }}
            title={deleteTarget ? `Supprimer la zone « ${deleteTarget.nom} »` : 'Supprimer la zone'}
            message="Cette action est irréversible. La zone et ses marchés associés seront supprimés. Indiquez le motif de suppression."
            severity="danger"
            icon={Trash2}
            reasonMinLength={5}
            loading={deleteLoading}
          />

          <UniversalConfirmModalBO
            open={confirmCloseCreate}
            onClose={() => setConfirmCloseCreate(false)}
            onConfirm={() => {
              closeCreateModal();
            }}
            title="Abandonner la création ?"
            message="Les informations saisies seront perdues. Souhaitez-vous fermer sans enregistrer ?"
            severity="warning"
            confirmLabel="Fermer"
            cancelLabel="Continuer"
          />
        </>
      )}

      <UniversalModalBO
        open={createMarcheOpen}
        onClose={() => {
          if (marcheSubmitting) return;
          setCreateMarcheOpen(false);
          setEditMarcheTarget(null);
          resetMarcheForm();
        }}
        title={editMarcheTarget ? 'Éditer le marché' : 'Nouveau marché'}
        subtitle={editMarcheTarget ? editMarcheTarget.nom : undefined}
        icon={Store}
        footer={marcheModalFooter}
        size="md"
      >
        {marcheModalBody}
      </UniversalModalBO>

      <UniversalActionWithReasonModalBO
        open={!!deleteMarcheTarget}
        onClose={() => !deleteMarcheLoading && setDeleteMarcheTarget(null)}
        onConfirm={async (motif) => {
          await handleDeleteMarcheConfirm(motif);
        }}
        title={deleteMarcheTarget ? `Supprimer le marché ${deleteMarcheTarget.nom}` : 'Supprimer le marché'}
        message="Cette action est irréversible. Indiquez le motif de suppression."
        severity="danger"
        icon={Trash2}
        reasonMinLength={5}
        loading={deleteMarcheLoading}
      />
    </div>
  );
}
