import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileEdit,
  FileText,
  MapPin,
  MessageSquare,
  RotateCcw,
  Shield,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { KPIGrid, UniversalKPI } from '../ui/UniversalKPI';
import { useShortcuts } from '../../contexts/ShortcutsContext';
import { BO_PRIMARY } from './bo-theme';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { API_URL } from '../../utils/api';
import {
  boGetAdminsEnAttente,
  boRejectAdmin,
  boValidateAdmin,
  type AdminEnAttente,
} from '../../services/backoffice-api';
import {
  TYPE_COLORS,
  STATUT_CONFIG,
  TAB_ADMINS_COLOR,
  TAB_ANOMALIES_COLOR,
  TAB_BROUILLONS_COLOR,
  getRoleLabel,
} from '../../utils/role-config';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalFiltreBO } from './universal/UniversalFiltreBO';
import type { FilterGroup, FilterValue } from './universal/UniversalFiltreBO';
import { UniversalCardBODossier } from './UniversalCardBO';
import { UniversalModalBO } from './universal/UniversalModalBO';
import { UniversalActionButtonBO } from './universal/UniversalActionButtonBO';
import { UniversalErrorStateBO } from './universal/UniversalErrorStateBO';
import { UniversalSkeletonBO } from './universal/UniversalSkeletonBO';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import type { DropdownEntry } from './universal/UniversalDropdownMenuBO';
import { UniversalConfirmModalBO } from './universal/UniversalConfirmModalBO';
import { UniversalSectionCardBO } from './universal/UniversalSectionCardBO';
import { UniversalTabsBO, type TabItem } from './universal/UniversalTabsBO';

type ActiveTab = 'dossiers' | 'brouillons' | 'anomalies' | 'admins';

type DossierHistoriqueEntry = {
  id: string;
  action: string;
  user: string;
  date: string;
};

type DossierItem = Record<string, unknown> & {
  id: string;
  statut?: string;
  acteurNom?: string;
  acteurType?: string;
  dateCreation?: string;
  identificateurNom?: string;
  identificateurId?: string;
  motifRejet?: string | null;
  phone?: string;
  telephone?: string;
  photoUrl?: string;
  region?: string;
  commune?: string;
  dateValidation?: string;
  historique?: DossierHistoriqueEntry[];
  updatedAt?: string;
};

const MOTIFS_PREDEFINIS = [
  'CNI illisible ou manquante',
  'Photo floue ou non conforme',
  'Numéro de téléphone invalide',
  'Doublon détecté avec un acteur existant',
  'Données personnelles incohérentes',
  'Refus de signature de l’acteur',
  'Hors zone d’intervention',
] as const;

const MOTIF_AUTRE = 'Autre motif';

const DOSSIERS_CACHE_KEY = 'julaba_bo_enrolement_dossiers_refresh_at';
const DOSSIERS_BATCH = 20;
const BULK_MAX = 10;
const STATUS_DOSSIERS = ['en_attente', 'approuve', 'rejete', 'complement_requis', 'complement'];

function getStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeStatut(raw: unknown): string {
  const value = getStr(raw, '').toLowerCase();
  if (value === 'valide' || value === 'validee') return 'approuve';
  if (value === 'complement') return 'complement_requis';
  return value;
}

function parseDateValue(raw: unknown): string {
  const v = getStr(raw, '');
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function formatDateFr(raw: unknown, options?: { includeTime?: boolean }): string {
  const v = getStr(raw, '');
  if (!v) return 'Non renseigné';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'Non renseigné';
  if (options?.includeTime) {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('fr-FR');
}

function formatAdminName(admin: AdminEnAttente): string {
  const first = (admin.firstName || '').trim();
  const last = (admin.lastName || '').trim();
  if (first || last) return `${first} ${last}`.trim();
  return admin.phone || 'Compte sans nom';
}

function parseHistorique(raw: unknown): DossierHistoriqueEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((h, i) => {
    const o = h as Record<string, unknown>;
    return {
      id: getStr(o.id, String(i)),
      action: getStr(o.action ?? o.type ?? o.label, 'Action'),
      user: getStr(o.user ?? o.auteur ?? o.qui ?? o.userName ?? o.user_id, 'Système'),
      date: getStr(o.date ?? o.created_at ?? o.timestamp ?? o.at, ''),
    };
  });
}

const abreviateNomComplet = (nomComplet: string | undefined | null): string => {
  if (!nomComplet || typeof nomComplet !== 'string') return '-';
  const trimmed = nomComplet.trim();
  if (!trimmed) return '-';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const prenom = parts[0];
  const initiale = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${prenom} ${initiale}.`;
};

export function BOEnrolement() {
  const _boCtx = useBackOffice();
  const dossiersRaw = Array.isArray(_boCtx.dossiers) ? _boCtx.dossiers : [];
  const acteurs = Array.isArray(_boCtx.acteurs) ? _boCtx.acteurs : [];
  const { hasPermission, updateDossierStatut, deleteBrouillon, boUser, refreshDossiers, refreshActeurs, user, markCategoryRead } = _boCtx;
  const { registerNewAction, unregisterNewAction } = useShortcuts();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dossiers');
  const [expandedDossier, setExpandedDossier] = useState<string | null>(null);
  const [expandedBrouillon, setExpandedBrouillon] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterIdentificateur, setFilterIdentificateur] = useState<string>('all');
  const [filterIdentificateurBrouillons, setFilterIdentificateurBrouillons] = useState<string>('all');
  const [filterDateDepuis, setFilterDateDepuis] = useState('');
  const [sortBy, setSortBy] = useState<string>('dateDesc');
  const [filterMesDossiers, setFilterMesDossiers] = useState(false);
  const [dossiersVisibleCount, setDossiersVisibleCount] = useState(DOSSIERS_BATCH);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [piiExportModal, setPiiExportModal] = useState<{ open: boolean }>({ open: false });
  const [piiAccepted, setPiiAccepted] = useState(false);

  const [rejetModal, setRejetModal] = useState<{ open: boolean; dossier: DossierItem | null }>({ open: false, dossier: null });
  const [rejetBulkIds, setRejetBulkIds] = useState<string[] | null>(null);
  const [motifSelected, setMotifSelected] = useState('');
  const [motifLibre, setMotifLibre] = useState('');

  const [complementModal, setComplementModal] = useState<{ open: boolean; dossier: DossierItem | null }>({ open: false, dossier: null });
  const [motifComplement, setMotifComplement] = useState('');

  const [reintroModal, setReintroModal] = useState<{ open: boolean; dossier: DossierItem | null }>({ open: false, dossier: null });
  const [motifReintroduction, setMotifReintroduction] = useState('');

  const [deleteBrouillonModal, setDeleteBrouillonModal] = useState<{ open: boolean; dossier: DossierItem | null }>({ open: false, dossier: null });
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [dossiersInitialLoading, setDossiersInitialLoading] = useState(dossiersRaw.length === 0);
  const [dossiersLocalError, setDossiersLocalError] = useState<string | null>(null);
  const [adminsEnAttente, setAdminsEnAttente] = useState<AdminEnAttente[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [processingAdminId, setProcessingAdminId] = useState<string | null>(null);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminEnAttente | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [rejectMotifError, setRejectMotifError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const csvImportEnabled = false;
  const isSuperAdmin = boUser?.role === 'super_admin' || _boCtx.user?.role === 'super_admin';
  const canWrite = hasPermission('enrolement.write');
  const canValidate = hasPermission('enrolement.validate');
  const isGestionnaireZone = user?.role === 'gestionnaire_zone';
  const dossiersError = dossiersLocalError || _boCtx.error;

  const loadAdminsPending = useCallback(async () => {
    if (!isSuperAdmin) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAdminsLoading(true);
    setAdminsError(null);

    try {
      const data = await boGetAdminsEnAttente(controller.signal);
      if (!isMountedRef.current) return;
      setAdminsEnAttente(data);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      setAdminsError('Impossible de charger la liste des administrateurs en attente.');
      console.warn('[BOEnrolement] loadAdminsPending failed:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (isMountedRef.current) setAdminsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadAdminsPending();
    }
  }, [isSuperAdmin, loadAdminsPending]);

  useEffect(() => {
    if (activeTab === 'admins' && isSuperAdmin) {
      void loadAdminsPending();
    }
  }, [activeTab, isSuperAdmin, loadAdminsPending]);

  useEffect(() => {
    if (activeTab === 'admins' && !isSuperAdmin) {
      setActiveTab('dossiers');
    }
  }, [activeTab, isSuperAdmin]);

  const sessionZoneId = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('julaba_user');
      if (!raw) return '';
      const u = JSON.parse(raw) as Record<string, unknown>;
      return getStr(u.zone_id ?? u.zoneId ?? u.zone_id_bo, '');
    } catch {
      return '';
    }
  }, []);

  const identificateurZoneById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of acteurs) {
      const rec = a as Record<string, unknown>;
      const id = getStr(rec.id, '');
      const role = getStr(rec.type ?? rec.role, '').toLowerCase();
      if (!id || role !== 'identificateur') continue;
      const z = getStr(rec.zone ?? rec.zoneId ?? rec.zone_id, '');
      if (z) m.set(id, z);
    }
    return m;
  }, [acteurs]);

  const mesDossiersFilterAvailable = isGestionnaireZone && !!sessionZoneId && identificateurZoneById.size > 0;

  useEffect(() => {
    markCategoryRead('identification_soumise');
    const prev = Number(sessionStorage.getItem(DOSSIERS_CACHE_KEY) || '0');
    if (Date.now() - prev < 30000 && prev > 0) {
      setDossiersInitialLoading(false);
      return;
    }
    sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
    setDossiersLocalError(null);
    setDossiersInitialLoading(dossiersRaw.length === 0);
    void refreshDossiers(true)
      .catch((err) => {
        setDossiersLocalError(err instanceof Error ? err.message : 'Erreur lors du chargement des dossiers.');
      })
      .finally(() => setDossiersInitialLoading(false));
  }, [refreshDossiers]);

  useEffect(() => {
    if (canWrite) {
      registerNewAction(() => navigate('/backoffice/utilisateurs'));
    } else {
      unregisterNewAction();
    }
    return () => unregisterNewAction();
  }, [canWrite, registerNewAction, unregisterNewAction, navigate]);

  const dossiers = useMemo<DossierItem[]>(() => {
    return dossiersRaw.map((d) => {
      const raw = d as Record<string, unknown>;
      const acteurNom = getStr(d.acteurNom ?? d.acteur_nom ?? d.nom ?? d.acteur_id, '').trim();
      const identificateurNom = getStr(d.identificateurNom ?? d.identificateur_nom ?? d.identificateur_id, '').trim();
      const identificateurId = getStr(d.identificateurId ?? d.identificateur_id, '');
      const acteurType = getStr(d.acteurType ?? d.acteur_type ?? d.type_acteur ?? d.type, '').toLowerCase();
      const dateCreation = getStr(d.dateCreation ?? d.date_identification ?? d.created_at, '');
      const motifRejet = (d.motifRejet ?? d.motif_rejet ?? null) as string | null;
      const photoUrl = getStr(raw.photoUrl ?? raw.photo_url ?? raw.acteur_photo_url, '');
      const region = getStr(raw.region ?? raw.acteur_region, '');
      const commune = getStr(raw.commune ?? raw.acteur_commune, '');
      const dateValidation = getStr(raw.dateValidation ?? raw.date_validation ?? raw.validated_at ?? raw.date_statut, '');
      const updatedAt = getStr(raw.updatedAt ?? raw.updated_at, '');
      const historique = parseHistorique(raw.historique ?? raw.history ?? raw.audit_timeline);
      return {
        ...raw,
        id: getStr(d.id),
        statut: normalizeStatut(d.statut),
        acteurNom,
        identificateurNom,
        identificateurId,
        acteurType,
        dateCreation,
        motifRejet,
        photoUrl: photoUrl || undefined,
        region: region || undefined,
        commune: commune || undefined,
        dateValidation: dateValidation || undefined,
        updatedAt: updatedAt || undefined,
        historique,
      };
    });
  }, [dossiersRaw]);

  const dossiersSansCooperative = useMemo(
    () => dossiers.filter((d) => d.acteurType !== 'cooperative' && d.acteurType !== 'cooperateur'),
    [dossiers],
  );

  const kpiCounts = useMemo(() => {
    const brouillon = dossiersSansCooperative.filter((d) => d.statut === 'brouillon').length;
    const enAttente = dossiersSansCooperative.filter((d) => d.statut === 'en_attente').length;
    const approuve = dossiersSansCooperative.filter((d) => d.statut === 'approuve').length;
    const rejete = dossiersSansCooperative.filter((d) => d.statut === 'rejete').length;
    const complement = dossiersSansCooperative.filter((d) => d.statut === 'complement_requis').length;
    return { brouillon, enAttente, approuve, rejete, complement };
  }, [dossiersSansCooperative]);

  const kpiSecondary = useMemo(() => {
    const traite = kpiCounts.approuve + kpiCounts.rejete;
    const total = kpiCounts.brouillon + kpiCounts.enAttente + kpiCounts.approuve + kpiCounts.rejete + kpiCounts.complement;
    const tauxValidation = traite > 0 ? Math.round((kpiCounts.approuve / traite) * 100) : 0;
    const tauxRejet = traite > 0 ? Math.round((kpiCounts.rejete / traite) * 100) : 0;

    const countByIdent: Record<string, { count: number; nom: string }> = {};
    const countByRegion: Record<string, number> = {};

    dossiersSansCooperative.forEach((d) => {
      if (d.region) countByRegion[d.region] = (countByRegion[d.region] || 0) + 1;
      if (d.statut === 'brouillon') return;
      const key = d.identificateurId || d.identificateurNom || 'inconnu';
      const nom = d.identificateurNom || 'Inconnu';
      if (!countByIdent[key]) countByIdent[key] = { count: 0, nom };
      countByIdent[key].count += 1;
    });

    const topIdent = Object.values(countByIdent).sort((a, b) => b.count - a.count)[0] || { nom: '-', count: 0 };
    const topRegionEntry = Object.entries(countByRegion).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

    return {
      total,
      tauxValidation,
      tauxRejet,
      topIdent: { nom: abreviateNomComplet(topIdent.nom), nomComplet: topIdent.nom, count: topIdent.count },
      topRegion: { nom: topRegionEntry[0], count: topRegionEntry[1] },
    };
  }, [kpiCounts, dossiersSansCooperative]);

  const dossiersFiltres = useMemo(() => {
    return dossiersSansCooperative.filter((d) => {
      if (d.statut === 'brouillon') return false;
      if (!STATUS_DOSSIERS.includes(d.statut || '')) return false;

      const type = d.acteurType || '';
      const identId = d.identificateurId || d.identificateurNom || 'inconnu';
      const dateIso = parseDateValue(d.dateCreation);
      const query = search.trim().toLowerCase();

      if (filterMesDossiers && sessionZoneId) {
        const z = identificateurZoneById.get(d.identificateurId || '') || '';
        if (z !== sessionZoneId) return false;
      }

      if (filterStatut !== 'all' && d.statut !== filterStatut) return false;
      if (filterType !== 'all' && type !== filterType) return false;
      if (filterIdentificateur !== 'all' && identId !== filterIdentificateur) return false;
      if (filterDateDepuis) {
        if (!dateIso) return false;
        if (dateIso.slice(0, 10) < filterDateDepuis) return false;
      }

      if (!query) return true;
      const haystack = [
        d.acteurNom,
        getStr(d.telephone ?? d.phone, ''),
        d.identificateurNom,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [dossiersSansCooperative, filterDateDepuis, filterIdentificateur, filterMesDossiers, filterStatut, filterType, identificateurZoneById, search, sessionZoneId]);

  const tauxFinalisationByIdent = useMemo(() => {
    const approved = new Map<string, number>();
    const rejected = new Map<string, number>();
    for (const d of dossiersSansCooperative) {
      if (d.statut === 'brouillon') continue;
      const k = d.identificateurId || d.identificateurNom || 'inconnu';
      if (d.statut === 'approuve') approved.set(k, (approved.get(k) || 0) + 1);
      if (d.statut === 'rejete') rejected.set(k, (rejected.get(k) || 0) + 1);
    }
    const out = new Map<string, number>();
    const keys = new Set([...approved.keys(), ...rejected.keys()]);
    for (const k of keys) {
      const a = approved.get(k) || 0;
      const r = rejected.get(k) || 0;
      const den = a + r;
      out.set(k, den > 0 ? Math.round((a / den) * 100) : 0);
    }
    return out;
  }, [dossiersSansCooperative]);

  const dossiersSorted = useMemo(() => {
    const list = [...dossiersFiltres];
    const identKey = (d: DossierItem) => getStr(d.identificateurNom, '').toLowerCase();
    const nameKey = (d: DossierItem) => getStr(d.acteurNom, '').toLowerCase();
    const dateTs = (d: DossierItem) => {
      const t = new Date(getStr(d.dateCreation)).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    switch (sortBy) {
      case 'dateAsc':
        return list.sort((a, b) => dateTs(a) - dateTs(b));
      case 'nomAsc':
        return list.sort((a, b) => nameKey(a).localeCompare(nameKey(b), 'fr'));
      case 'identificateur':
        return list.sort((a, b) => identKey(a).localeCompare(identKey(b), 'fr') || dateTs(b) - dateTs(a));
      case 'type':
        return list.sort((a, b) => getStr(a.acteurType, '').localeCompare(getStr(b.acteurType, ''), 'fr') || dateTs(b) - dateTs(a));
      case 'dateDesc':
      default:
        return list.sort((a, b) => dateTs(b) - dateTs(a));
    }
  }, [dossiersFiltres, sortBy]);

  const visibleDossiers = useMemo(
    () => dossiersSorted.slice(0, dossiersVisibleCount),
    [dossiersSorted, dossiersVisibleCount],
  );

  useEffect(() => {
    setDossiersVisibleCount(DOSSIERS_BATCH);
  }, [filterDateDepuis, filterIdentificateur, filterMesDossiers, filterStatut, filterType, search, sortBy]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || dossiersSorted.length <= dossiersVisibleCount) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDossiersVisibleCount((c) => Math.min(c + DOSSIERS_BATCH, dossiersSorted.length));
        }
      },
      { rootMargin: '80px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [dossiersSorted.length, dossiersVisibleCount]);

  type BrouillonPlat = DossierItem & { isAbandonne: boolean; identificateurNom: string; identificateurId: string };

  const brouillonsPlatTries = useMemo(() => {
    const now = Date.now();
    const list: BrouillonPlat[] = [];
    for (const d of dossiersSansCooperative) {
      if (d.statut !== 'brouillon') continue;
      const t = new Date(getStr(d.dateCreation)).getTime();
      const ageDays = Number.isNaN(t) ? 0 : (now - t) / (1000 * 60 * 60 * 24);
      list.push({
        ...d,
        isAbandonne: ageDays > 7,
        identificateurNom: d.identificateurNom || 'Identificateur non renseigné',
        identificateurId: d.identificateurId || d.identificateurNom || 'inconnu',
      });
    }
    return list.sort((a, b) => Number(b.isAbandonne) - Number(a.isAbandonne) || (new Date(getStr(b.dateCreation)).getTime() - new Date(getStr(a.dateCreation)).getTime()));
  }, [dossiersSansCooperative]);

  const brouillonsFiltresAndSorted = useMemo(() => {
    if (filterIdentificateurBrouillons === 'all') return brouillonsPlatTries;
    return brouillonsPlatTries.filter((b) => b.identificateurId === filterIdentificateurBrouillons);
  }, [brouillonsPlatTries, filterIdentificateurBrouillons]);

  const topIdentificateursMemo = useMemo(() => {
    const m = new Map<string, { identificateurId: string; identificateurNom: string; count: number }>();
    for (const d of dossiersSansCooperative) {
      if (d.statut !== 'brouillon') continue;
      const identificateurId = d.identificateurId || d.identificateurNom || 'inconnu';
      const identificateurNom = d.identificateurNom || 'Identificateur non renseigné';
      const cur = m.get(identificateurId) || { identificateurId, identificateurNom, count: 0 };
      cur.count += 1;
      m.set(identificateurId, cur);
    }
    return [...m.values()]
      .map((row) => ({
        ...row,
        tauxFinalisation: tauxFinalisationByIdent.get(row.identificateurId) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || b.tauxFinalisation - a.tauxFinalisation);
  }, [dossiersSansCooperative, tauxFinalisationByIdent]);

  const anomalies = useMemo(() => {
    const rejetSansMotif = dossiersSansCooperative.filter(
      (d) => d.statut === 'rejete' && !getStr(d.motifRejet, '').trim(),
    );
    const now = Date.now();
    const brouillonsOrphelins = dossiersSansCooperative.filter((d) => {
      if (d.statut !== 'brouillon') return false;
      const t = new Date(getStr(d.dateCreation)).getTime();
      if (Number.isNaN(t)) return false;
      const updated = new Date(getStr(d.updatedAt ?? d.dateCreation)).getTime();
      const ref = Number.isNaN(updated) ? t : updated;
      return (now - ref) / (1000 * 60 * 60 * 24) > 30;
    });
    const stats = new Map<string, { nom: string; rej: number; decide: number }>();
    for (const d of dossiersSansCooperative) {
      if (d.statut === 'brouillon') continue;
      const k = d.identificateurId || d.identificateurNom || 'inconnu';
      const nom = d.identificateurNom || k;
      const cur = stats.get(k) || { nom, rej: 0, decide: 0 };
      if (d.statut === 'rejete') cur.rej += 1;
      if (d.statut === 'approuve' || d.statut === 'rejete') cur.decide += 1;
      stats.set(k, cur);
    }
    const identificateursTauxRejetEleve = [...stats.entries()]
      .filter(([, v]) => v.decide > 0 && (v.rej / v.decide) * 100 > 30)
      .map(([id, v]) => ({ id, nom: v.nom, tauxRejetPct: Math.round((v.rej / v.decide) * 100) }));
    return { rejetSansMotif, brouillonsOrphelins, identificateursTauxRejetEleve };
  }, [dossiersSansCooperative]);

  const TAB_CONFIG = useMemo<TabItem[]>(() => [
    {
      id: 'dossiers',
      label: 'Dossiers',
      icon: FileText,
      badge: kpiCounts.enAttente + kpiCounts.approuve + kpiCounts.rejete + kpiCounts.complement,
      tabColor: BO_PRIMARY,
    },
    {
      id: 'brouillons',
      label: 'Brouillons',
      icon: FileEdit,
      badge: kpiCounts.brouillon || undefined,
      tabColor: TAB_BROUILLONS_COLOR,
    },
    {
      id: 'anomalies',
      label: 'Anomalies',
      icon: AlertTriangle,
      badge: (anomalies.rejetSansMotif.length + anomalies.brouillonsOrphelins.length + anomalies.identificateursTauxRejetEleve.length) || undefined,
      tabColor: TAB_ANOMALIES_COLOR,
    },
    ...(isSuperAdmin ? [{
      id: 'admins',
      label: 'Admins à valider',
      icon: Shield,
      badge: adminsEnAttente.length || undefined,
      tabColor: TAB_ADMINS_COLOR,
    }] : []),
  ], [kpiCounts, anomalies, adminsEnAttente.length, isSuperAdmin]);

  const searchSuggestions = useMemo(() => {
    return dossiers.map((d) => {
      const roleKey = (d.acteurType || 'marchand').toLowerCase();
      const telephone = getStr(d.telephone ?? d.phone, '');
      const statutLabel = d.statut ? STATUT_CONFIG[d.statut]?.label : '';
      const sublabelParts = [
        getRoleLabel(roleKey),
        d.identificateurNom ? `Identificateur : ${d.identificateurNom}` : '',
        telephone,
        statutLabel ? `Statut : ${statutLabel}` : '',
      ].filter(Boolean);

      return {
        id: d.id,
        label: d.acteurNom || 'Acteur non renseigné',
        sublabel: sublabelParts.join(' - '),
        avatar: {
          src: d.photoUrl,
          fallback: (d.acteurNom || '?').charAt(0).toUpperCase(),
          color: TYPE_COLORS[roleKey] || BO_PRIMARY,
        },
        data: d,
      };
    });
  }, [dossiers]);

  const filterGroups = useMemo<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];
    const dossiersFiltrables = dossiersSansCooperative.filter((d) => d.statut !== 'brouillon' && STATUS_DOSSIERS.includes(d.statut || ''));

    groups.push({
      id: 'sortBy',
      label: 'Trier par',
      options: [
        { value: 'dateDesc', label: 'Plus récents' },
        { value: 'dateAsc', label: 'Plus anciens' },
        { value: 'nomAsc', label: 'Nom A-Z' },
        { value: 'identificateur', label: 'Par identificateur' },
        { value: 'type', label: 'Par type' },
      ],
    });

    const identificateurCounts = new Map<string, { value: string; label: string; count: number }>();
    for (const d of dossiersFiltrables) {
      const value = d.identificateurId || d.identificateurNom || 'inconnu';
      const label = d.identificateurNom || 'Identificateur non renseigné';
      const current = identificateurCounts.get(value) || { value, label, count: 0 };
      current.count += 1;
      identificateurCounts.set(value, current);
    }

    const identificateurFilterOptions = [...identificateurCounts.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));

    if (identificateurFilterOptions.length > 0) {
      groups.push({
        id: 'identificateur',
        label: 'Identificateur',
        options: identificateurFilterOptions,
      });
    }

    const typeCounts = new Map<string, { value: string; label: string; count: number }>();
    for (const d of dossiersFiltrables) {
      const value = (d.acteurType || '').toLowerCase();
      if (!value) continue;
      const current = typeCounts.get(value) || { value, label: getRoleLabel(value), count: 0 };
      current.count += 1;
      typeCounts.set(value, current);
    }

    const typeFilterOptions = [...typeCounts.values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    if (typeFilterOptions.length > 0) {
      groups.push({
        id: 'type',
        label: 'Type acteur',
        options: typeFilterOptions,
      });
    }

    groups.push({
      id: 'dateDepuis',
      label: 'Créé depuis',
      type: 'date',
    });

    if (mesDossiersFilterAvailable) {
      const mesDossiersCount = dossiersFiltrables.filter((d) => {
        const zoneId = identificateurZoneById.get(d.identificateurId || '') || '';
        return zoneId === sessionZoneId;
      }).length;

      groups.push({
        id: 'mesDossiers',
        label: 'Périmètre',
        options: [{ value: 'true', label: 'Mes dossiers', count: mesDossiersCount }],
      });
    }

    return groups;
  }, [dossiersSansCooperative, identificateurZoneById, mesDossiersFilterAvailable, sessionZoneId]);

  const filterValue = useMemo<FilterValue>(() => {
    const value: FilterValue = {};
    if (sortBy !== 'dateDesc') value.sortBy = sortBy;
    if (filterIdentificateur !== 'all') value.identificateur = filterIdentificateur;
    if (filterType !== 'all') value.type = filterType;
    if (filterDateDepuis) value.dateDepuis = filterDateDepuis;
    if (filterMesDossiers && mesDossiersFilterAvailable) value.mesDossiers = 'true';
    return value;
  }, [filterDateDepuis, filterIdentificateur, filterMesDossiers, filterType, mesDossiersFilterAvailable, sortBy]);

  const handleFilterChange = useCallback((value: FilterValue) => {
    setSortBy((value.sortBy as string) || 'dateDesc');
    setFilterIdentificateur((value.identificateur as string) || 'all');
    setFilterType((value.type as string) || 'all');
    setFilterDateDepuis((value.dateDepuis as string) || '');
    setFilterMesDossiers(mesDossiersFilterAvailable && value.mesDossiers === 'true');
  }, [mesDossiersFilterAvailable]);

  const handleResetFilters = useCallback(() => {
    setSortBy('dateDesc');
    setFilterIdentificateur('all');
    setFilterType('all');
    setFilterDateDepuis('');
    setFilterStatut('all');
    setFilterMesDossiers(false);
  }, []);

  const setBusy = (id: string, busy: boolean) => {
    setIsProcessing((prev) => ({ ...prev, [id]: busy }));
  };

  const handleOpenValidate = (admin: AdminEnAttente) => {
    setSelectedAdmin(admin);
    setShowValidateModal(true);
  };

  const handleConfirmValidate = async () => {
    if (!selectedAdmin || processingAdminId) return;
    setProcessingAdminId(selectedAdmin.id);
    try {
      await boValidateAdmin(selectedAdmin.id);
      if (!isMountedRef.current) return;
      toast.success(`Compte administrateur validé pour ${formatAdminName(selectedAdmin)}`);
      setShowValidateModal(false);
      setSelectedAdmin(null);
      await loadAdminsPending();
      void refreshActeurs().catch((refreshErr) => {
        console.warn('[BOEnrolement] refreshActeurs after validateAdmin failed:', refreshErr);
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Échec de la validation. Réessayer.');
      console.warn('[BOEnrolement] validateAdmin failed:', err);
    } finally {
      if (isMountedRef.current) setProcessingAdminId(null);
    }
  };

  const handleOpenReject = (admin: AdminEnAttente) => {
    setSelectedAdmin(admin);
    setRejectMotif('');
    setRejectMotifError(null);
    setShowRejectModal(true);
  };

  const closeRejectAdminModal = () => {
    setShowRejectModal(false);
    setSelectedAdmin(null);
    setRejectMotif('');
    setRejectMotifError(null);
  };

  const handleConfirmReject = async () => {
    if (!selectedAdmin || processingAdminId) return;

    const trimmed = rejectMotif.trim();
    if (trimmed.length < 10) {
      setRejectMotifError('Le motif doit contenir au moins 10 caractères.');
      return;
    }

    setProcessingAdminId(selectedAdmin.id);
    try {
      await boRejectAdmin(selectedAdmin.id, trimmed);
      if (!isMountedRef.current) return;
      toast.success(`Compte administrateur rejeté pour ${formatAdminName(selectedAdmin)}`);
      closeRejectAdminModal();
      await loadAdminsPending();
      void refreshActeurs().catch((refreshErr) => {
        console.warn('[BOEnrolement] refreshActeurs after rejectAdmin failed:', refreshErr);
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Échec du rejet. Réessayer.');
      console.warn('[BOEnrolement] rejectAdmin failed:', err);
    } finally {
      if (isMountedRef.current) setProcessingAdminId(null);
    }
  };

  const handleValider = async (dossier: DossierItem) => {
    if (isProcessing[dossier.id]) return;
    setBusy(dossier.id, true);
    try {
      await updateDossierStatut(dossier.id, 'approuve');
      toast.success(`Dossier de ${dossier.acteurNom || 'cet acteur'} approuvé.`);
      sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
      await refreshDossiers(true);
    } catch (err) {
      console.warn('[BOEnrolement] handleValider failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible d’approuver le dossier.');
    } finally {
      setBusy(dossier.id, false);
    }
  };

  const handleBulkValider = async () => {
    const ids = [...selectedIds].slice(0, BULK_MAX);
    if (ids.length === 0) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await updateDossierStatut(id, 'approuve');
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    toast.success(fail > 0 ? `${ok} réussis, ${fail} échecs` : `${ok} dossier(s) validé(s).`);
    setSelectedIds(new Set());
    sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
    await refreshDossiers(true);
  };

  const handleConfirmRejet = async () => {
    if (!motifSelected) {
      toast.error('Veuillez sélectionner un motif.');
      return;
    }
    if (motifSelected === MOTIF_AUTRE && motifLibre.trim().length < 10) {
      toast.error('Le motif libre doit contenir au moins 10 caractères.');
      return;
    }
    const motifFinal = motifSelected === MOTIF_AUTRE ? motifLibre.trim() : motifSelected;

    const bulk = rejetBulkIds;
    if (bulk && bulk.length > 0) {
      const results = await Promise.allSettled(bulk.map((id) => updateDossierStatut(id, 'rejete', motifFinal)));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      toast.success(fail > 0 ? `${ok} réussis, ${fail} échecs` : `${ok} dossier(s) rejeté(s).`);
      setRejetModal({ open: false, dossier: null });
      setRejetBulkIds(null);
      setMotifSelected('');
      setMotifLibre('');
      setSelectedIds(new Set());
      sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
      await refreshDossiers(true);
      return;
    }

    const dossier = rejetModal.dossier;
    if (!dossier) return;
    if (isProcessing[dossier.id]) return;
    setBusy(dossier.id, true);
    try {
      await updateDossierStatut(dossier.id, 'rejete', motifFinal);
      toast.success(`Dossier de ${dossier.acteurNom || 'cet acteur'} rejeté.`);
      setRejetModal({ open: false, dossier: null });
      setMotifSelected('');
      setMotifLibre('');
      sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
      await refreshDossiers(true);
    } catch (err) {
      console.warn('[BOEnrolement] handleConfirmRejet failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors du rejet du dossier.');
    } finally {
      setBusy(dossier.id, false);
    }
  };

  const handleRelancerIdentificateur = async (identificateurId: string, dossierId: string) => {
    try {
      const res = await fetch(`${API_URL}/notifications/relancer-identificateur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identificateurId,
          dossierId,
          type: 'brouillon_abandonne',
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success('Notification envoyée à l’identificateur.');
    } catch (err) {
      console.warn('[BOEnrolement] relancer failed:', err instanceof Error ? err.message : err);
      toast.info('Notification envoyée à l’identificateur (à implémenter côté backend).');
    }
  };

  const toggleDossierSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= BULK_MAX) {
          toast.warning('Maximum 10 dossiers par lot.');
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const escapeCsvField = (v: string) => {
    const s = v.replace(/"/g, '""');
    return `"${s}"`;
  };

  const handleExportCsv = useCallback(() => {
    const header = [
      'Acteur',
      'Type',
      'Identificateur',
      'Statut',
      'Date création',
      'Motif rejet',
      'Région',
      'Commune',
      'Téléphone',
    ];
    const lines = dossiersSorted.map((d) =>
      [
        escapeCsvField(d.acteurNom || ''),
        escapeCsvField(d.acteurType || ''),
        escapeCsvField(d.identificateurNom || ''),
        escapeCsvField(d.statut || ''),
        escapeCsvField(formatDateFr(d.dateCreation)),
        escapeCsvField(getStr(d.motifRejet, '')),
        escapeCsvField(d.region || ''),
        escapeCsvField(d.commune || ''),
        escapeCsvField(getStr(d.telephone ?? d.phone, '')),
      ].join(';'),
    );
    const bom = '\uFEFF';
    const csv = bom + [header.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossiers-enrolement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV généré.');
  }, [dossiersSorted]);

  const handleConfirmComplement = async () => {
    const dossier = complementModal.dossier;
    if (!dossier) return;
    if (isProcessing[dossier.id]) return;
    setBusy(dossier.id, true);
    try {
      const motif = motifComplement.trim() ? `COMPLEMENT: ${motifComplement.trim()}` : 'COMPLEMENT requis';
      await updateDossierStatut(dossier.id, 'complement_requis', motif);
      toast.success(`Demande de complément envoyée pour ${dossier.acteurNom || 'ce dossier'}.`);
      setComplementModal({ open: false, dossier: null });
      setMotifComplement('');
      sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
      await refreshDossiers(true);
    } catch (err) {
      console.warn('[BOEnrolement] handleConfirmComplement failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la demande de complément.');
    } finally {
      setBusy(dossier.id, false);
    }
  };

  const handleConfirmReintroduction = async () => {
    const dossier = reintroModal.dossier;
    if (!dossier) return;
    if (motifReintroduction.trim().length < 10) {
      toast.error('Le motif de réintroduction doit contenir au moins 10 caractères.');
      return;
    }
    if (isProcessing[dossier.id]) return;
    setBusy(dossier.id, true);
    try {
      await updateDossierStatut(dossier.id, 'en_attente', `REINTRODUCTION: ${motifReintroduction.trim()}`);
      toast.success(`Dossier de ${dossier.acteurNom || 'cet acteur'} réintroduit. Motif consigné.`);
      setReintroModal({ open: false, dossier: null });
      setMotifReintroduction('');
      sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
      await refreshDossiers(true);
    } catch (err) {
      console.warn('[BOEnrolement] handleConfirmReintroduction failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la réintroduction du dossier.');
    } finally {
      setBusy(dossier.id, false);
    }
  };

  const buildDropdownItems = useCallback((dossier: DossierItem): DropdownEntry[] => {
    const items: DropdownEntry[] = [];

    if (canValidate && dossier.statut === 'en_attente') {
      items.push({
        id: 'valider',
        label: 'Valider',
        icon: CheckCircle2,
        type: 'success',
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation();
          void handleValider(dossier);
        },
      });
      items.push({
        id: 'rejeter',
        label: 'Rejeter',
        icon: XCircle,
        type: 'danger',
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation();
          setRejetBulkIds(null);
          setMotifSelected('');
          setMotifLibre('');
          setRejetModal({ open: true, dossier });
        },
      });
      items.push({
        id: 'complement',
        label: 'Demander complément',
        icon: MessageSquare,
        type: 'info',
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation();
          setComplementModal({ open: true, dossier });
          setMotifComplement('');
        },
      });
    }

    return items;
  }, [canValidate, handleValider]);

  const handleDeleteBrouillonClick = (dossier: DossierItem) => {
    if (!isSuperAdmin) return;
    setDeleteBrouillonModal({ open: true, dossier });
  };

  const buildBrouillonDropdownItems = useCallback((brouillon: DossierItem): DropdownEntry[] => {
    const items: DropdownEntry[] = [];

    if (canValidate) {
      items.push({
        id: 'relancer',
        label: "Relancer l'identificateur",
        icon: Bell,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation();
          void handleRelancerIdentificateur(brouillon.identificateurId || '', brouillon.id);
        },
      });
    }

    if (isSuperAdmin) {
      if (items.length > 0) {
        items.push({ id: 'div-1', divider: true });
      }
      items.push({
        id: 'supprimer',
        label: 'Supprimer le brouillon',
        icon: Trash2,
        type: 'danger',
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation();
          handleDeleteBrouillonClick(brouillon);
        },
      });
    }

    return items;
  }, [canValidate, handleRelancerIdentificateur, isSuperAdmin, handleDeleteBrouillonClick]);

  const handleConfirmDeleteBrouillon = async () => {
    const dossier = deleteBrouillonModal.dossier;
    if (!dossier) return;
    if (isProcessing[dossier.id]) return;
    setBusy(dossier.id, true);
    try {
      await deleteBrouillon(dossier.id);
      toast.success(`Brouillon de ${dossier.acteurNom || 'l acteur'} supprimé`);
      setDeleteBrouillonModal({ open: false, dossier: null });
      sessionStorage.setItem(DOSSIERS_CACHE_KEY, String(Date.now()));
      await refreshDossiers(true);
    } catch (err) {
      console.warn('[BOEnrolement] deleteBrouillon failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setBusy(dossier.id, false);
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Enrôlement</h1>
            <p className="text-sm text-gray-500 mt-0.5">Suivi des dossiers en cours et des brouillons par identificateur</p>
          </div>
          <UniversalDropdownMenuBO
            trigger={
              <span
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-bold text-sm bg-white flex-shrink-0 self-start sm:self-auto"
                style={{ borderColor: `${BO_PRIMARY}40`, color: BO_PRIMARY }}
              >
                <FileText className="w-4 h-4" />
                CSV
                <ChevronDown className="w-3 h-3" />
              </span>
            }
            triggerAriaLabel="Menu CSV"
            items={[
              {
                id: 'importer-csv',
                label: 'Importer CSV',
                icon: FileText,
                disabled: !csvImportEnabled,
                shortcut: !csvImportEnabled ? 'Bientôt disponible' : undefined,
                onClick: () => {},
              },
              { id: 'div-csv', divider: true },
              {
                id: 'exporter-csv',
                label: `Exporter CSV (${dossiersSorted.length})`,
                icon: Download,
                type: 'info',
                onClick: () => setPiiExportModal({ open: true }),
              },
            ]}
            align="right"
            minWidth={240}
          />
        </div>
      </motion.div>

      <div className="mb-4">
        <UniversalTabsBO
          tabs={TAB_CONFIG}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as ActiveTab)}
          orientation="horizontal"
        />
      </div>

      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm pt-2 pb-3 mb-2 -mx-4 px-4 lg:mx-0 lg:px-0 border-b border-gray-100">
        <div className="mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, width: '100%' }}>
          <div title="Dossiers non finalisés">
            <UniversalKPI label="Brouillons" animatedTarget={kpiCounts.brouillon} icon={FileText} color={TYPE_COLORS.operateur_terrain} onClick={() => setActiveTab('brouillons')} />
          </div>
          <div title="Dossiers à valider">
            <UniversalKPI label="En attente" animatedTarget={kpiCounts.enAttente} icon={Clock} color={STATUT_CONFIG.en_attente.dotColor} onClick={() => { setActiveTab('dossiers'); setFilterStatut('en_attente'); }} />
          </div>
          <div title="Dossiers acceptés">
            <UniversalKPI label="Approuvés" animatedTarget={kpiCounts.approuve} icon={CheckCircle2} color={STATUT_CONFIG.actif.dotColor} onClick={() => { setActiveTab('dossiers'); setFilterStatut('approuve'); }} />
          </div>
          <div title="Dossiers refusés">
            <UniversalKPI label="Rejetés" animatedTarget={kpiCounts.rejete} icon={XCircle} color={STATUT_CONFIG.suspendu.dotColor} onClick={() => { setActiveTab('dossiers'); setFilterStatut('rejete'); }} />
          </div>
          <div title="En attente d’information supplémentaire">
            <UniversalKPI label="Complément requis" animatedTarget={kpiCounts.complement} icon={MessageSquare} color={TYPE_COLORS.admin_national} onClick={() => { setActiveTab('dossiers'); setFilterStatut('complement_requis'); }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, width: '100%' }}>
          <UniversalKPI
            label="Total dossiers"
            animatedTarget={kpiSecondary.total}
            icon={FileText}
            color={TYPE_COLORS.super_admin}
            explication="Nombre total de dossiers traités toutes catégories confondues."
            formule="Brouillons + En attente + Approuvés + Rejetés + Complément requis"
          />
          <UniversalKPI
            label="Taux validation"
            value={String(kpiSecondary.tauxValidation)}
            suffix="%"
            icon={CheckCircle2}
            color={STATUT_CONFIG.actif.dotColor}
            explication="Pourcentage de dossiers acceptés parmi ceux traités (en attente exclus)."
            formule="Approuvés / (Approuvés + Rejetés) x 100"
            details={[
              { label: 'Approuvés', value: kpiCounts.approuve, color: STATUT_CONFIG.actif.dotColor },
              { label: 'Rejetés', value: kpiCounts.rejete, color: STATUT_CONFIG.suspendu.dotColor },
            ]}
          />
          <UniversalKPI
            label="Taux rejet"
            value={String(kpiSecondary.tauxRejet)}
            suffix="%"
            icon={XCircle}
            color={STATUT_CONFIG.suspendu.dotColor}
            explication="Pourcentage de dossiers refusés parmi ceux traités."
            formule="Rejetés / (Approuvés + Rejetés) x 100"
            details={[
              { label: 'Rejetés', value: kpiCounts.rejete, color: STATUT_CONFIG.suspendu.dotColor },
              { label: 'Approuvés', value: kpiCounts.approuve, color: STATUT_CONFIG.actif.dotColor },
            ]}
          />
          <div title={kpiSecondary.topIdent.nom !== kpiSecondary.topIdent.nomComplet ? kpiSecondary.topIdent.nomComplet : undefined}>
            <UniversalKPI
              label="Identificateur actif"
              value={kpiSecondary.topIdent.nom}
              icon={Users}
              color={TYPE_COLORS.identificateur}
              explication="Identificateur ayant créé le plus de dossiers non-brouillons."
              formule="Max(count par identificateur)"
              details={[
                { label: 'Dossiers créés', value: kpiSecondary.topIdent.count, color: TYPE_COLORS.identificateur },
              ]}
            />
          </div>
          <UniversalKPI
            label="Région active"
            value={kpiSecondary.topRegion.nom}
            icon={MapPin}
            color={TYPE_COLORS.cooperative}
            explication="Région avec le plus de dossiers."
            formule="Max(count par région)"
            details={[
              { label: 'Dossiers dans cette région', value: kpiSecondary.topRegion.count, color: TYPE_COLORS.cooperative },
            ]}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dossiers' && (
          <UniversalSectionCardBO
            key="dossiers"
            title="Dossiers"
            icon={FileText}
            iconAnimated={true}
            variant="info"
            delay={0.1}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'nowrap', position: 'relative' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <UniversalRechercheBO
                  suggestions={searchSuggestions}
                  placeholder="Rechercher par nom acteur, téléphone, identificateur..."
                  debounceMs={200}
                  emptyMessage="Aucun dossier trouvé"
                  onChange={(query) => setSearch(query)}
                  onSelect={(suggestion) => {
                    const dossier = suggestion.data as Record<string, unknown> | undefined;
                    const acteurId = getStr(dossier?.acteurId ?? dossier?.acteur_id, '');
                    if (acteurId) {
                      navigate(`/backoffice/acteurs/${acteurId}`);
                      return;
                    }
                    setSearch(suggestion.label);
                  }}
                  onSubmit={(query) => setSearch(query)}
                />
              </div>
              <div style={{ flexShrink: 0 }}>
                <UniversalFiltreBO
                  groups={filterGroups}
                  value={filterValue}
                  onChange={handleFilterChange}
                  onReset={handleResetFilters}
                  triggerLabel="Filtres"
                />
              </div>
            </div>

            {dossiersInitialLoading && dossiers.length === 0 && (
              <div className="space-y-3">
                <UniversalSkeletonBO preset="list" count={8} />
              </div>
            )}

            {!dossiersInitialLoading && dossiersError && (
              <UniversalErrorStateBO
                type="network"
                role={boUser?.role}
                onRetry={() => {
                  setDossiersLocalError(null);
                  setDossiersInitialLoading(true);
                  void refreshDossiers(true).finally(() => setDossiersInitialLoading(false));
                }}
              />
            )}

            {!dossiersInitialLoading && !dossiersError && visibleDossiers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-3" />
                <p className="font-bold">Aucun dossier disponible</p>
              </div>
            )}

            {!dossiersInitialLoading && !dossiersError && visibleDossiers.length > 0 && (
              <div className="space-y-3">
                {visibleDossiers.map((dossier, index) => {
                  const isExpanded = expandedDossier === dossier.id;
                  const selectableActive = canValidate && dossier.statut === 'en_attente';
                  const motifRejetVisible = dossier.motifRejet?.trim() || 'Aucun motif renseigné';
                  const isMotifMissing = motifRejetVisible === 'Aucun motif renseigné';
                  const statusActionNode = dossier.statut === 'rejete' && canWrite ? (
                    <UniversalActionButtonBO
                      label="Réintroduire"
                      icon={RotateCcw}
                      variant="info"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReintroModal({ open: true, dossier });
                        setMotifReintroduction('');
                      }}
                      ariaLabel="Réintroduire le dossier"
                    />
                  ) : null;

                  return (
                    <UniversalCardBODossier
                      key={dossier.id}
                      dossier={{
                        ...dossier,
                        reference: dossier.identificateurNom ? `Identificateur : ${dossier.identificateurNom}` : undefined,
                        date: dossier.dateCreation ? formatDateFr(dossier.dateCreation) : 'Date inconnue',
                      }}
                      index={index}
                      expandable={true}
                      expanded={isExpanded}
                      onExpandChange={(next) => setExpandedDossier(next ? dossier.id : null)}
                      selectable={selectableActive}
                      selected={selectedIds.has(dossier.id)}
                      onSelectChange={() => toggleDossierSelected(dossier.id)}
                      dropdownItems={buildDropdownItems(dossier)}
                      statusAction={statusActionNode}
                      expandedContent={
                        <div className="space-y-4">
                          {dossier.statut === 'rejete' && (
                            <div className={`p-3 rounded-2xl border-2 ${isMotifMissing ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                              <p className={`text-xs font-bold mb-1 ${isMotifMissing ? 'text-gray-600' : 'text-red-700'}`}>Motif de rejet</p>
                              <p className={`text-xs ${isMotifMissing ? 'text-gray-500 italic' : 'text-red-700'}`}>{motifRejetVisible}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2">Détails acteur</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Téléphone</span><p className="font-medium text-gray-900">{getStr(dossier.telephone ?? dossier.phone, 'Non renseigné')}</p></div>
                              <div><span className="text-gray-500">Région</span><p className="font-medium text-gray-900">{dossier.region || 'Non renseigné'}</p></div>
                              <div><span className="text-gray-500">Commune</span><p className="font-medium text-gray-900">{dossier.commune || 'Non renseigné'}</p></div>
                              <div><span className="text-gray-500">Type acteur</span><p className="font-medium text-gray-900">{dossier.acteurType || 'Non renseigné'}</p></div>
                              <div><span className="text-gray-500">Date validation</span><p className="font-medium text-gray-900">{(dossier.statut === 'approuve' && dossier.dateValidation) ? formatDateFr(dossier.dateValidation) : (dossier.statut === 'approuve' ? 'Non renseigné' : 'N/A')}</p></div>
                              <div><span className="text-gray-500">Identificateur</span><p className="font-medium text-gray-900">{dossier.identificateurNom || 'Non renseigné'}</p></div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2">Historique</p>
                            {dossier.historique && dossier.historique.length > 0 ? (
                              <div className="space-y-1">
                                {dossier.historique.map((h) => (
                                  <p key={h.id} className="text-xs text-gray-600">
                                    {h.action} par {h.user} - {formatDateFr(h.date)}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">Audit en cours d’implémentation</p>
                            )}
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}

            {dossiersSorted.length > visibleDossiers.length && (
              <div ref={loadMoreSentinelRef} className="h-8 flex items-center justify-center text-xs text-gray-400 py-4">
                Faites défiler pour charger plus...
              </div>
            )}

          </UniversalSectionCardBO>
        )}

        {activeTab === 'brouillons' && (
          <UniversalSectionCardBO
            key="brouillons"
            title="Brouillons"
            icon={FileEdit}
            iconAnimated={true}
            variant="warning"
            delay={0.15}
          >
            <KPIGrid className="mb-5" cols={3}>
              {topIdentificateursMemo.slice(0, 3).map((idRow, i) => {
                const isActive = filterIdentificateurBrouillons === idRow.identificateurId;
                return (
                  <div
                    key={idRow.identificateurId}
                    title={`${idRow.count} brouillon${idRow.count > 1 ? 's' : ''}, taux finalisation ${idRow.tauxFinalisation} %`}
                  >
                    <UniversalKPI
                      label={`Top ${i + 1} identificateur`}
                      value={idRow.identificateurNom}
                      icon={Users}
                      color={TYPE_COLORS.operateur_terrain}
                      active={isActive}
                      onClick={() => setFilterIdentificateurBrouillons(isActive ? 'all' : idRow.identificateurId)}
                    />
                  </div>
                );
              })}
            </KPIGrid>

            {brouillonsFiltresAndSorted.length > 0 ? (
              <div className="space-y-3">
                {brouillonsFiltresAndSorted.map((b, index) => {
                  const isExpanded = expandedBrouillon === b.id;

                  return (
                    <UniversalCardBODossier
                      key={b.id}
                      dossier={b}
                      index={index}
                      expandable={true}
                      expanded={isExpanded}
                      onExpandChange={(next) => setExpandedBrouillon(next ? b.id : null)}
                      selectable={false}
                      statusAction={null}
                      dropdownItems={buildBrouillonDropdownItems(b)}
                      expandedContent={
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2">Détails acteur</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Téléphone</span><p className="font-medium text-gray-900">{getStr(b.telephone ?? b.phone, 'Non renseigné')}</p></div>
                              <div><span className="text-gray-500">Région</span><p className="font-medium text-gray-900">{b.region || 'Non renseigné'}</p></div>
                              <div><span className="text-gray-500">Commune</span><p className="font-medium text-gray-900">{b.commune || 'Non renseigné'}</p></div>
                              <div><span className="text-gray-500">Type acteur</span><p className="font-medium text-gray-900">{b.acteurType || 'Non renseigné'}</p></div>
                              <div><span className="text-gray-500">Date création</span><p className="font-medium text-gray-900">{b.dateCreation ? formatDateFr(b.dateCreation) : 'Inconnue'}</p></div>
                              <div><span className="text-gray-500">Identificateur</span><p className="font-medium text-gray-900">{b.identificateurNom || 'Non renseigné'}</p></div>
                              {b.isAbandonne && (
                                <div className="sm:col-span-2">
                                  <span className="text-gray-500">État</span>
                                  <p className="font-medium" style={{ color: TYPE_COLORS.operateur_terrain }}>Abandonné (&gt;7 jours sans modification)</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2">Historique</p>
                            {b.historique && b.historique.length > 0 ? (
                              <div className="space-y-1">
                                {b.historique.map((h) => (
                                  <p key={h.id} className="text-xs text-gray-600">
                                    {h.action} par {h.user} - {formatDateFr(h.date)}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">Aucun historique disponible pour ce brouillon</p>
                            )}
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-3" />
                <p className="font-bold">
                  {filterIdentificateurBrouillons !== 'all' ? 'Aucun brouillon pour cet identificateur' : 'Aucun brouillon disponible'}
                </p>
                {filterIdentificateurBrouillons !== 'all' && (
                  <div className="mt-3">
                    <UniversalActionButtonBO
                      label="Effacer le filtre"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterIdentificateurBrouillons('all')}
                    />
                  </div>
                )}
              </div>
            )}
          </UniversalSectionCardBO>
        )}

        {activeTab === 'anomalies' && (
          <motion.div key="anomalies" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <UniversalSectionCardBO
              title={`Rejets sans motif (${anomalies.rejetSansMotif.length})`}
              icon={AlertCircle}
              variant="danger"
            >
              {anomalies.rejetSansMotif.length === 0 ? (
                <p className="text-xs text-gray-600">Aucune anomalie.</p>
              ) : (
                <ul className="text-xs text-gray-800 space-y-1">
                  {anomalies.rejetSansMotif.map((d) => (
                    <li key={d.id}>{d.acteurNom || d.id} - {d.identificateurNom || ''}</li>
                  ))}
                </ul>
              )}
            </UniversalSectionCardBO>

            <UniversalSectionCardBO
              title={`Brouillons orphelins > 30 jours (${anomalies.brouillonsOrphelins.length})`}
              icon={Clock}
              variant="warning"
            >
              {anomalies.brouillonsOrphelins.length === 0 ? (
                <p className="text-xs text-gray-600">Aucune anomalie.</p>
              ) : (
                <ul className="text-xs text-gray-800 space-y-1">
                  {anomalies.brouillonsOrphelins.map((d) => (
                    <li key={d.id}>{d.acteurNom || d.id} - {formatDateFr(d.dateCreation)}</li>
                  ))}
                </ul>
              )}
            </UniversalSectionCardBO>

            <UniversalSectionCardBO
              title={`Identificateurs taux de rejet > 30% (${anomalies.identificateursTauxRejetEleve.length})`}
              icon={AlertTriangle}
              variant="violet"
            >
              {anomalies.identificateursTauxRejetEleve.length === 0 ? (
                <p className="text-xs text-gray-600">Aucune anomalie.</p>
              ) : (
                <ul className="text-xs text-gray-800 space-y-1">
                  {anomalies.identificateursTauxRejetEleve.map((row) => (
                    <li key={row.id}>{row.nom} - {row.tauxRejetPct}% de rejets</li>
                  ))}
                </ul>
              )}
            </UniversalSectionCardBO>
          </motion.div>
        )}

        {activeTab === 'admins' && isSuperAdmin && (
          <UniversalSectionCardBO
            key="admins"
            title="Comptes administrateurs en attente"
            icon={Shield}
            iconAnimated={true}
            variant="danger"
            delay={0.2}
          >
            {adminsLoading && (
              <div className="py-8 flex items-center justify-center text-gray-500 text-sm">
                Chargement des administrateurs en attente...
              </div>
            )}

            {adminsError && (
              <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {adminsError}
              </div>
            )}

            {!adminsLoading && !adminsError && adminsEnAttente.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <CheckCircle2 className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">Aucun administrateur en attente de validation</p>
                <p className="text-xs mt-1">Tous les comptes administrateurs sont à jour.</p>
              </div>
            )}

            {!adminsLoading && !adminsError && adminsEnAttente.length > 0 && (
              <div className="space-y-3">
                {adminsEnAttente.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatAdminName(admin)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {getRoleLabel(admin.role)} · {admin.phone}
                        {admin.email && ` · ${admin.email}`}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Créé le {formatDateFr(admin.createdAt, { includeTime: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <UniversalActionButtonBO
                        label="Valider"
                        variant="success"
                        size="sm"
                        onClick={() => handleOpenValidate(admin)}
                        disabled={processingAdminId !== null}
                        loading={processingAdminId === admin.id && showValidateModal}
                        ariaLabel={`Valider le compte administrateur de ${formatAdminName(admin)}`}
                      />
                      <UniversalActionButtonBO
                        label="Rejeter"
                        variant="danger"
                        size="sm"
                        onClick={() => handleOpenReject(admin)}
                        disabled={processingAdminId !== null}
                        ariaLabel={`Rejeter le compte administrateur de ${formatAdminName(admin)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </UniversalSectionCardBO>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.size > 0 && canValidate && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 lg:left-[300px] z-[190] mx-auto max-w-lg rounded-2xl border-2 shadow-xl bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ borderColor: `${BO_PRIMARY}40` }}
          >
            <p className="text-sm font-bold text-gray-800 flex-1">
              {selectedIds.size} dossier{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <UniversalActionButtonBO
                label="Valider tous"
                icon={CheckCircle2}
                variant="success"
                size="sm"
                onClick={() => void handleBulkValider()}
              />
              <UniversalActionButtonBO
                label="Rejeter tous"
                icon={XCircle}
                variant="danger"
                size="sm"
                onClick={() => {
                  const ids = [...selectedIds].slice(0, BULK_MAX);
                  if (ids.length === 0) return;
                  setRejetBulkIds(ids);
                  setMotifSelected('');
                  setMotifLibre('');
                  setRejetModal({ open: true, dossier: null });
                }}
              />
              <UniversalActionButtonBO
                label="Effacer sélection"
                icon={X}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UniversalModalBO
        open={rejetModal.open}
        onClose={() => {
          setRejetModal({ open: false, dossier: null });
          setRejetBulkIds(null);
        }}
        title={rejetBulkIds && rejetBulkIds.length > 0 ? 'Rejet en lot' : 'Motif de rejet'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="motif-select" className="text-xs font-bold text-gray-700 mb-2 block">Motif du rejet</label>
            <select
              id="motif-select"
              value={motifSelected}
              onChange={(e) => setMotifSelected(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-red-300"
            >
              <option value="">Sélectionnez un motif</option>
              {MOTIFS_PREDEFINIS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value={MOTIF_AUTRE}>{MOTIF_AUTRE}</option>
            </select>
          </div>

          {motifSelected === MOTIF_AUTRE && (
            <div>
              <label htmlFor="motif-libre" className="text-xs font-bold text-gray-700 mb-2 block">
                Motif libre (10 caractères minimum)
              </label>
              <textarea
                id="motif-libre"
                value={motifLibre}
                onChange={(e) => setMotifLibre(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-red-300"
                placeholder="Décrivez précisément le motif..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <UniversalActionButtonBO
              label="Annuler"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejetModal({ open: false, dossier: null });
                setRejetBulkIds(null);
                setMotifSelected('');
                setMotifLibre('');
              }}
            />
            <UniversalActionButtonBO
              label="Confirmer le rejet"
              variant="danger"
              size="sm"
              onClick={() => void handleConfirmRejet()}
            />
          </div>
        </div>
      </UniversalModalBO>

      <UniversalModalBO
        open={complementModal.open}
        onClose={() => {
          setComplementModal({ open: false, dossier: null });
          setMotifComplement('');
        }}
        title="Demander un complément"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="motif-complement" className="text-xs font-bold text-gray-700 mb-2 block">
              Motif du complément requis (optionnel)
            </label>
            <textarea
              id="motif-complement"
              value={motifComplement}
              onChange={(e) => setMotifComplement(e.target.value)}
              rows={3}
              placeholder="Précisez ce qui est attendu..."
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-blue-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <UniversalActionButtonBO
              label="Annuler"
              variant="ghost"
              size="sm"
              onClick={() => {
                setComplementModal({ open: false, dossier: null });
                setMotifComplement('');
              }}
            />
            <UniversalActionButtonBO
              label="Demander le complément"
              variant="info"
              size="sm"
              onClick={() => void handleConfirmComplement()}
            />
          </div>
        </div>
      </UniversalModalBO>

      <UniversalModalBO
        open={reintroModal.open}
        onClose={() => {
          setReintroModal({ open: false, dossier: null });
          setMotifReintroduction('');
        }}
        title="Réintroduire le dossier"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Le dossier sera repassé en statut "En attente" pour revue. Ajoutez un motif explicatif.
          </p>
          <div>
            <label htmlFor="motif-reintro" className="text-xs font-bold text-gray-700 mb-2 block">
              Motif de la réintroduction (10 caractères minimum)
            </label>
            <textarea
              id="motif-reintro"
              value={motifReintroduction}
              onChange={(e) => setMotifReintroduction(e.target.value)}
              rows={3}
              placeholder="Expliquez pourquoi vous réintroduisez ce dossier..."
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-blue-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <UniversalActionButtonBO
              label="Annuler"
              variant="ghost"
              size="sm"
              onClick={() => {
                setReintroModal({ open: false, dossier: null });
                setMotifReintroduction('');
              }}
            />
            <UniversalActionButtonBO
              label="Réintroduire"
              variant="info"
              size="sm"
              onClick={() => void handleConfirmReintroduction()}
            />
          </div>
        </div>
      </UniversalModalBO>

      <UniversalModalBO
        open={piiExportModal.open}
        onClose={() => {
          setPiiExportModal({ open: false });
          setPiiAccepted(false);
        }}
        title="Confirmer le téléchargement"
        size="md"
      >
        <div className="space-y-4">
          <div
            className="rounded-2xl border-2 p-3"
            style={{
              borderColor: `${TYPE_COLORS.operateur_terrain}40`,
              background: `${TYPE_COLORS.operateur_terrain}12`,
            }}
          >
            <p className="text-xs font-bold leading-snug" style={{ color: TYPE_COLORS.operateur_terrain }}>
              Export CSV : données personnelles soumises à la loi n° 2013-450 du 19 juin 2013 (Côte d’Ivoire). Usage interne et traçabilité obligatoires.
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={piiAccepted}
              onChange={(e) => setPiiAccepted(e.target.checked)}
              className="mt-0.5 rounded border-gray-300"
            />
            <span>Je confirme avoir pris connaissance du cadre légal avant téléchargement.</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <UniversalActionButtonBO
              label="Annuler"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPiiExportModal({ open: false });
                setPiiAccepted(false);
              }}
            />
            <UniversalActionButtonBO
              label={`Télécharger (${dossiersSorted.length})`}
              icon={Download}
              variant="info"
              size="sm"
              disabled={!piiAccepted}
              onClick={() => {
                handleExportCsv();
                setPiiExportModal({ open: false });
                setPiiAccepted(false);
              }}
            />
          </div>
        </div>
      </UniversalModalBO>

      <UniversalConfirmModalBO
        open={showValidateModal}
        onClose={() => {
          if (processingAdminId) return;
          setShowValidateModal(false);
          setSelectedAdmin(null);
        }}
        onConfirm={handleConfirmValidate}
        title="Valider l’accès administrateur"
        message={
          selectedAdmin
            ? `Confirmer la validation de ${formatAdminName(selectedAdmin)} (${getRoleLabel(selectedAdmin.role)}). Après validation, l’administrateur pourra se connecter au BO.`
            : ''
        }
        severity="info"
        confirmLabel="Valider"
        cancelLabel="Annuler"
        loading={processingAdminId === selectedAdmin?.id}
      />

      <UniversalModalBO
        open={showRejectModal}
        onClose={() => {
          if (processingAdminId) return;
          closeRejectAdminModal();
        }}
        title="Rejeter le compte administrateur"
        size="md"
      >
        {selectedAdmin && (
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              Vous êtes sur le point de rejeter le compte de
              <span className="font-semibold"> {formatAdminName(selectedAdmin)}</span>
              {' '}({getRoleLabel(selectedAdmin.role)}).
            </div>
            <div>
              <label htmlFor="reject-motif" className="block text-xs font-medium text-gray-700 mb-1">
                Motif du rejet (minimum 10 caractères)
              </label>
              <textarea
                id="reject-motif"
                value={rejectMotif}
                onChange={(e) => {
                  setRejectMotif(e.target.value);
                  if (rejectMotifError) setRejectMotifError(null);
                }}
                rows={4}
                disabled={processingAdminId === selectedAdmin.id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50"
                placeholder="Expliquer pourquoi ce compte est rejeté (visible dans l’audit log)..."
                aria-invalid={!!rejectMotifError}
                aria-describedby={rejectMotifError ? 'reject-motif-error' : undefined}
              />
              {rejectMotifError && (
                <p id="reject-motif-error" className="text-xs text-red-600 mt-1">{rejectMotifError}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">{rejectMotif.trim().length} / 10 caractères minimum</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
              <UniversalActionButtonBO
                label="Annuler"
                variant="ghost"
                size="sm"
                onClick={closeRejectAdminModal}
                disabled={processingAdminId === selectedAdmin.id}
              />
              <UniversalActionButtonBO
                label="Confirmer le rejet"
                variant="danger"
                size="sm"
                onClick={() => void handleConfirmReject()}
                loading={processingAdminId === selectedAdmin.id}
              />
            </div>
          </div>
        )}
      </UniversalModalBO>

      {deleteBrouillonModal.open && deleteBrouillonModal.dossier && (
        <UniversalConfirmModalBO
          open={deleteBrouillonModal.open}
          onClose={() => setDeleteBrouillonModal({ open: false, dossier: null })}
          onConfirm={handleConfirmDeleteBrouillon}
          title="Supprimer ce brouillon ?"
          message={`Suppression définitive du brouillon de ${deleteBrouillonModal.dossier.acteurNom || 'acteur'}. L'identificateur devra recommencer l'enrôlement. Action journalisée.`}
          severity="danger"
          requireTypedConfirmation="SUPPRIMER"
          loading={!!isProcessing[deleteBrouillonModal.dossier.id]}
        />
      )}
    </div>
  );
}