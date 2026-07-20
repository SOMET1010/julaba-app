import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserX,
  Clock, Users,
  UserPlus,
  UserCheck, CameraOff, IdCard, Heart, AlertTriangle,
  RotateCcw, Download, Square, CheckSquare, X,
  CreditCard, Eye, Flag, Key, KeyRound, Shield, Sprout, Trash2, UserCog,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import type { Acteur } from '../../services/backoffice-api';
import { boAdminResetPassword, boGetDuplicates, boGetUserFlags } from '../../services/backoffice-api';
import { CAN_CREATE_ADMIN, CAN_VIEW_ALERTS, CAN_SIGNAL } from '../../utils/permissions-bo';
import SignalementModal from './SignalementModal';
import { BO_PRIMARY } from './bo-theme';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { toast } from 'sonner';
import { useShortcuts } from '../../contexts/ShortcutsContext';
import { API_URL } from '../../utils/api';
import { TYPE_COLORS, getRoleLabel } from '../../utils/role-config';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalFiltreBO } from './universal/UniversalFiltreBO';
import type { FilterGroup, FilterValue } from './universal/UniversalFiltreBO';
import { UniversalCardBOActeur } from './UniversalCardBO';
import { UniversalPaginationBO } from './universal/UniversalPaginationBO';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import type { DropdownEntry } from './universal/UniversalDropdownMenuBO';
import { UniversalActionButtonBO } from './universal/UniversalActionButtonBO';
import { UniversalConfirmModalBO } from './universal/UniversalConfirmModalBO';
import { UniversalErrorStateBO } from './universal/UniversalErrorStateBO';
import { UniversalSkeletonBO } from './universal/UniversalSkeletonBO';

const ROLES_ADMIN = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];
const ALL_ROLE_TAB_COLOR = '#4B5563';

type ConfirmActionState = {
  open: boolean;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  requireTyped?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose?: () => void;
};

// @deprecated mapping cooperative -> cooperateur, retrait sous-passe 5C après alignement backend complet
const mapTypeToBackendRole = (frontendType: string): string => {
  if (frontendType === 'cooperative') return 'cooperateur';
  return frontendType;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function BOActeurs() {
  const navigate = useNavigate();
  const bo = useBackOffice();
  const acteurs = Array.isArray(bo.acteurs) ? bo.acteurs : [];
  const {
    hasPermission,
    updateActeurStatut,
    softDeleteActeur,
    refreshActeurs,
    acteursPage,
    setActeursPage,
    acteursTotal,
    setActeursRole,
    roleCounts,
    acteursLoading,
    error,
    clearError,
    boUser,
    markCategoryRead,
  } = bo;
  const ACTEURS_PAGE_SIZE = 20;
  const { registerNewAction, unregisterNewAction, pushUndoAction } = useShortcuts();

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterAlerte, setFilterAlerte] = useState<'all' | 'sans_photo' | 'sans_cni' | 'sans_cmu' | 'alerte_globale'>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterDateDepuis, setFilterDateDepuis] = useState<string>('');
  const [filterActivite, setFilterActivite] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<string>('all');
  const [pinVisible, setPinVisible] = useState<Record<string, boolean>>({});
  const [modifierPinActeur, setModifierPinActeur] = useState<{ id: string; nom: string } | null>(null);
  const [nouveauPin, setNouveauPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pendingPinChange, setPendingPinChange] = useState<{ id: string; nom: string; pin: string; lastTwoDigits: string } | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [duplicateUserIds, setDuplicateUserIds] = useState<Set<string>>(new Set());
  const [flaggedUserIds, setFlaggedUserIds] = useState<Set<string>>(new Set());
  const [acteurToSignal, setActeurToSignal] = useState<Acteur | null>(null);
  const [flagReasons, setFlagReasons] = useState<Map<string, string>>(new Map());
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [confirmActionLoading, setConfirmActionLoading] = useState(false);

  const searchSuggestions = useMemo(() => acteurs.map(a => {
    const roleKey = (a.type || a.role || 'marchand').toLowerCase();
    const fullName = `${a.prenoms || ''} ${a.nom || ''}`.trim() || a.full_name || 'Sans nom';
    const location = a.commune || a.region || 'Localisation inconnue';
    const phone = a.telephone || a.phone;

    return {
      id: a.id,
      label: fullName,
      sublabel: `${getRoleLabel(a.type || a.role)} à ${location}${phone ? ` - ${phone}` : ''}`,
      avatar: {
        src: a.photoUrl,
        fallback: `${(a.prenoms || '')[0] || ''}${(a.nom || '')[0] || ''}`.toUpperCase() || '?',
        color: TYPE_COLORS[roleKey] || BO_PRIMARY,
      },
      data: a,
    };
  }), [acteurs]);

  const filterGroups = useMemo<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];

    const regions = Array.from(new Set(acteurs.map((a) => a.region).filter(Boolean))) as string[];
    if (regions.length > 0) {
      const countByRegion: Record<string, number> = {};
      acteurs.forEach((a) => {
        if (a.region) countByRegion[a.region] = (countByRegion[a.region] || 0) + 1;
      });

      groups.push({
        id: 'region',
        label: 'Région',
        options: regions.map((region) => ({ value: region, label: region, count: countByRegion[region] || 0 })),
      });
    }

    const activites = Array.from(new Set(acteurs.map((a) => a.activite).filter(Boolean))) as string[];
    if (activites.length > 0) {
      const countByActivite: Record<string, number> = {};
      acteurs.forEach((a) => {
        if (a.activite) countByActivite[a.activite] = (countByActivite[a.activite] || 0) + 1;
      });

      groups.push({
        id: 'activite',
        label: 'Activité',
        options: activites.sort().map((activite) => ({
          value: activite,
          label: activite,
          count: countByActivite[activite] || 0,
        })),
      });
    }

    const genres = Array.from(new Set(acteurs.map((a) => (a.genre || '').toLowerCase().trim()).filter(Boolean))) as string[];
    if (genres.length > 0) {
      const countByGenre: Record<string, number> = {};
      acteurs.forEach((a) => {
        const genre = (a.genre || '').toLowerCase().trim();
        if (genre) countByGenre[genre] = (countByGenre[genre] || 0) + 1;
      });

      groups.push({
        id: 'genre',
        label: 'Genre',
        options: genres.map((genre) => ({
          value: genre,
          label: capitalize(genre),
          count: countByGenre[genre] || 0,
        })),
      });
    }

    groups.push({
      id: 'dateDepuis',
      label: 'Inscrit depuis',
      type: 'date',
    });

    return groups;
  }, [acteurs]);

  const filterValue = useMemo<FilterValue>(() => {
    const value: FilterValue = {};
    if (filterRegion !== 'all') value.region = filterRegion;
    if (filterActivite !== 'all') value.activite = filterActivite;
    if (filterGenre !== 'all') value.genre = filterGenre;
    if (filterDateDepuis) value.dateDepuis = filterDateDepuis;
    return value;
  }, [filterRegion, filterActivite, filterGenre, filterDateDepuis]);

  const handleFilterChange = useCallback((value: FilterValue) => {
    setFilterRegion((value.region as string) || 'all');
    setFilterActivite((value.activite as string) || 'all');
    setFilterGenre((value.genre as string) || 'all');
    setFilterDateDepuis((value.dateDepuis as string) || '');
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterRegion('all');
    setFilterDateDepuis('');
    setFilterActivite('all');
    setFilterGenre('all');
  }, []);

  const filtered = useMemo(() => acteurs.filter(a => {
    const matchSearch = !search || `${a.nom} ${a.prenoms} ${a.telephone}`.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === 'all' || a.statut === filterStatut;
    const matchRegion = filterRegion === 'all' || a.region === filterRegion;
    const matchDate = !filterDateDepuis || (a.dateInscription ? new Date(a.dateInscription) >= new Date(filterDateDepuis) : false);
    const matchActivite = filterActivite === 'all' || a.activite === filterActivite;
    const matchGenre = filterGenre === 'all' || (a.genre || '').toLowerCase().trim() === filterGenre;
    let matchAlerte = true;
    if (filterAlerte === 'sans_photo') matchAlerte = !a.photoUrl || a.photoUrl.trim() === '';
    else if (filterAlerte === 'sans_cni') matchAlerte = !a.nin || a.nin.trim() === '';
    else if (filterAlerte === 'sans_cmu') matchAlerte = !a.numCmu || a.numCmu.trim() === '';
    else if (filterAlerte === 'alerte_globale') {
      matchAlerte = (!a.photoUrl || !a.nin || !a.numCmu) || duplicateUserIds.has(a.id) || flaggedUserIds.has(a.id);
    }
    const matchRole = filterRole === 'all'
      || (filterRole === 'admin' && ROLES_ADMIN.includes(a.type || a.role || ''))
      || (filterRole !== 'admin' && (a.type === filterRole || a.role === filterRole));
    return matchSearch
      && matchStatut
      && matchRegion
      && matchDate
      && matchRole
      && matchActivite
      && matchGenre
      && matchAlerte;
  }), [
    acteurs,
    search,
    filterStatut,
    filterRegion,
    filterDateDepuis,
    filterRole,
    filterActivite,
    filterGenre,
    filterAlerte,
    duplicateUserIds,
    flaggedUserIds,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(acteursTotal / ACTEURS_PAGE_SIZE)),
    [acteursTotal],
  );

  const roleTabsConfig = useMemo(() => [
    { key: 'all', label: 'Tous', color: ALL_ROLE_TAB_COLOR, count: roleCounts.all },
    { key: 'marchand', label: 'Marchands', color: TYPE_COLORS.marchand, count: roleCounts.marchand },
    { key: 'producteur', label: 'Producteurs', color: TYPE_COLORS.producteur, count: roleCounts.producteur },
    { key: 'cooperative', label: 'Coopératives', color: TYPE_COLORS.cooperative, count: roleCounts.cooperateur },
    { key: 'identificateur', label: 'Identificateurs', color: TYPE_COLORS.identificateur, count: roleCounts.identificateur },
    { key: 'institution', label: 'Institutions', color: TYPE_COLORS.institution, count: roleCounts.institution },
    { key: 'admin', label: 'Admins', color: TYPE_COLORS.admin_national, count: roleCounts.admin },
  ], [roleCounts]);

  const kpiCounts = useMemo(() => ({
    actifs: acteurs.filter((a) => a.statut === 'actif').length,
    enAttente: acteurs.filter((a) => a.statut === 'en_attente').length,
    suspendus: acteurs.filter((a) => a.statut === 'suspendu').length,
    rejetes: acteurs.filter((a) => a.statut === 'rejete').length,
  }), [acteurs]);

  const alertesCounts = useMemo(() => {
    const sansPhoto = acteurs.filter((a) => !a.photoUrl || a.photoUrl.trim() === '').length;
    const sansCni = acteurs.filter((a) => !a.nin || a.nin.trim() === '').length;
    const sansCmu = acteurs.filter((a) => !a.numCmu || a.numCmu.trim() === '').length;
    const sansRsti = acteurs.filter((a) => {
      const v = (a as { numCNPS?: string; num_cnps?: string }).numCNPS ?? (a as { num_cnps?: string }).num_cnps;
      return !v || String(v).trim() === '';
    }).length;
    const alerteIds = new Set<string>();
    acteurs.forEach((a) => {
      if (!a.photoUrl || !a.nin || !a.numCmu) alerteIds.add(a.id);
    });
    duplicateUserIds.forEach((id) => alerteIds.add(id));
    flaggedUserIds.forEach((id) => alerteIds.add(id));
    return { sansPhoto, sansRsti, sansCni, sansCmu, alerte: alerteIds.size };
  }, [acteurs, duplicateUserIds, flaggedUserIds]);

  React.useEffect(() => {
    markCategoryRead('acteur_alerte');
    refreshActeurs();
  }, [refreshActeurs, markCategoryRead]);

  React.useEffect(() => {
    registerNewAction(() => navigate('/backoffice/enrolement'));
    return () => unregisterNewAction();
  }, [registerNewAction, unregisterNewAction, navigate]);

  React.useEffect(() => {
    const visibleKeys = Object.keys(pinVisible).filter(k => pinVisible[k]);
    if (visibleKeys.length === 0) return;
    const timeoutId = setTimeout(() => {
      setPinVisible({});
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [pinVisible]);

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [
    filterStatut,
    filterRegion,
    filterDateDepuis,
    filterRole,
    filterActivite,
    filterGenre,
    filterAlerte,
    search,
    acteursPage,
  ]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dup = await boGetDuplicates();
        if (cancelled) return;
        const ids = new Set<string>();
        dup.groups.forEach((g) => g.users.forEach((u) => ids.add(u.id)));
        setDuplicateUserIds(ids);
      } catch (e) {
        console.warn('Erreur fetch duplicates:', e);
      }
      try {
        const flags = await boGetUserFlags({ resolved: false });
        if (cancelled) return;
        const ids = new Set<string>();
        const reasons = new Map<string, string>();
        const sorted = [...flags.items].sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          return tb - ta;
        });
        sorted.forEach((f) => {
          if (!f.userId) return;
          ids.add(f.userId);
          if (!reasons.has(f.userId)) reasons.set(f.userId, f.raison || '');
        });
        setFlaggedUserIds(ids);
        setFlagReasons(reasons);
      } catch (e) {
        console.warn('Erreur fetch flags:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Bulk actions ─────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };
  const bulkSuspend = async () => {
    if (isBulkProcessing) return;
    setIsBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map(id => updateActeurStatut(id, 'suspendu', 'SUSPENSION massive'))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.length - failed;
      if (failed > 0) {
        toast.warning(`${succeeded} succès, ${failed} échec(s)`);
      } else {
        toast.success(`${succeeded} acteur(s) mis à jour`);
      }
      setSelectedIds(new Set());
    } finally {
      setIsBulkProcessing(false);
    }
  };
  const bulkReactivate = async () => {
    if (isBulkProcessing) return;
    setIsBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map(id => updateActeurStatut(id, 'actif', 'RÉACTIVATION massive'))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.length - failed;
      if (failed > 0) {
        toast.warning(`${succeeded} succès, ${failed} échec(s)`);
      } else {
        toast.success(`${succeeded} acteur(s) mis à jour`);
      }
      setSelectedIds(new Set());
    } finally {
      setIsBulkProcessing(false);
    }
  };
  const downloadCSV = (data: any[]) => {
    if (data.length === 0) { toast.error('Aucun acteur à exporter'); return; }
    const headers = ['Nom', 'Prénoms', 'Téléphone', 'Rôle', 'Statut', 'Région', 'Commune', 'Date inscription'];
    const rows = data.map(a => [
      a.nom || '',
      a.prenoms || '',
      a.telephone || '',
      a.role || a.type || '',
      a.statut || '',
      a.region || '',
      a.commune || '',
      a.dateInscription ? new Date(a.dateInscription).toLocaleDateString('fr-FR') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acteurs_julaba_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${data.length} acteur(s) exporté(s) en CSV`);
  };
  const generateCSV = (data: any[], isFiltered: boolean) => {
    setConfirmAction({
      open: true,
      title: 'Avertissement données personnelles',
      message: 'Ce fichier contient des données personnelles (nom, téléphone, région). Le partager engage votre responsabilité légale.',
      severity: 'warning',
      confirmLabel: 'Continuer',
      onConfirm: () => {
        downloadCSV(data);
        if (!isFiltered) setSelectedIds(new Set());
        setConfirmAction(null);
        setIsBulkProcessing(false);
      },
      onClose: () => setIsBulkProcessing(false),
    });
  };
  const bulkExport = () => {
    if (isBulkProcessing) return;
    const selected = acteurs.filter((a: any) => selectedIds.has(a.id));
    generateCSV(selected, false);
  };

  const fetchPin = async (acteurId: string) => {
    if (pinVisible[acteurId]) {
      setPinVisible(prev => ({ ...prev, [acteurId]: false }));
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_URL}/auth/identificateur/${acteurId}/pin-decrypted`, {
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) { toast.error('Impossible de récupérer le PIN'); return; }
      await res.json();
      setPinVisible(prev => ({ ...prev, [acteurId]: true }));
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as any)?.name === 'AbortError') {
        toast.error('Délai dépassé, vérifiez votre connexion');
        return;
      }
      console.warn('[BOActeurs] fetchPin failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur réseau');
    }
  };

  const getActeurName = useCallback((acteur: Acteur) => (
    `${acteur.prenoms || ''} ${acteur.nom || ''}`.trim() || acteur.full_name || 'cet acteur'
  ), []);

  const handleSingleSuspend = useCallback((acteur: Acteur) => {
    const acteurName = getActeurName(acteur);
    const prevStatut = acteur.statut;
    setConfirmAction({
      open: true,
      title: 'Suspendre cet acteur ?',
      message: `Vous allez suspendre ${acteurName}. Action journalisée.`,
      severity: 'danger',
      onConfirm: async () => {
        await updateActeurStatut(acteur.id, 'suspendu', 'SUSPENSION individuelle');
        pushUndoAction(`Suspension de ${acteurName}`, () => updateActeurStatut(acteur.id, prevStatut as 'actif' | 'suspendu' | 'en_attente' | 'rejete', 'ANNULATION SUSPENSION'));
        toast.success(`${acteurName} suspendu`);
        setConfirmAction(null);
      },
    });
  }, [getActeurName, pushUndoAction, updateActeurStatut]);

  const handleSingleReactivate = useCallback((acteur: Acteur) => {
    const acteurName = getActeurName(acteur);
    const prevStatut = acteur.statut;
    setConfirmAction({
      open: true,
      title: 'Réactiver cet acteur ?',
      message: `Vous allez réactiver ${acteurName}.`,
      severity: 'info',
      onConfirm: async () => {
        await updateActeurStatut(acteur.id, 'actif', 'RÉACTIVATION individuelle');
        pushUndoAction(`Réactivation de ${acteurName}`, () => updateActeurStatut(acteur.id, prevStatut as 'actif' | 'suspendu' | 'en_attente' | 'rejete', 'ANNULATION RÉACTIVATION'));
        toast.success(`${acteurName} réactivé`);
        setConfirmAction(null);
      },
    });
  }, [getActeurName, pushUndoAction, updateActeurStatut]);

  const handleSingleResetMdp = useCallback((acteur: Acteur) => {
    const acteurName = getActeurName(acteur);
    setConfirmAction({
      open: true,
      title: 'Réinitialiser le mot de passe ?',
      message: `Un nouveau mot de passe temporaire sera généré pour ${acteurName}.`,
      severity: 'warning',
      onConfirm: async () => {
        try {
          await boAdminResetPassword(acteur.id);
          toast.success('Mot de passe réinitialisé');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation');
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }, [getActeurName]);

  const handleSingleChangerType = useCallback((acteur: Acteur) => {
    navigate(`/backoffice/acteurs/${acteur.id}?action=changer-type`);
  }, [navigate]);

  const handleBulkSuspendConfirm = useCallback(() => {
    setConfirmAction({
      open: true,
      title: `Suspendre ${selectedIds.size} acteurs ?`,
      message: `Vous allez suspendre ${selectedIds.size} acteurs en une seule opération. Cette action est journalisée et réversible.`,
      severity: 'danger',
      requireTyped: 'SUSPENDRE',
      onConfirm: async () => {
        setConfirmAction(null);
        await bulkSuspend();
      },
    });
  }, [bulkSuspend, selectedIds.size]);

  const handleBulkReactivateConfirm = useCallback(() => {
    setConfirmAction({
      open: true,
      title: `Réactiver ${selectedIds.size} acteurs ?`,
      message: `Vous allez réactiver ${selectedIds.size} acteurs en une seule opération.`,
      severity: 'info',
      onConfirm: async () => {
        setConfirmAction(null);
        await bulkReactivate();
      },
    });
  }, [bulkReactivate, selectedIds.size]);

  const closeConfirmAction = useCallback(() => {
    confirmAction?.onClose?.();
    setConfirmAction(null);
  }, [confirmAction]);

  const submitConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmActionLoading(true);
    try {
      await confirmAction.onConfirm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible. Réessayez.');
    } finally {
      setConfirmActionLoading(false);
    }
  }, [confirmAction]);

  const buildDropdownItems = useCallback((acteur: Acteur): DropdownEntry[] => {
    const role = String(acteur.type || acteur.role || '');
    const items: DropdownEntry[] = [];

    if (role === 'marchand') {
      items.push({
        id: 'voir-transactions',
        label: 'Voir transactions',
        icon: CreditCard,
        onClick: () => navigate(`/backoffice/acteurs/${acteur.id}?tab=transactions`),
      });
    } else if (role === 'producteur') {
      items.push({
        id: 'voir-recoltes',
        label: 'Voir récoltes',
        icon: Sprout,
        onClick: () => navigate(`/backoffice/acteurs/${acteur.id}?tab=recoltes`),
      });
    } else if (role === 'cooperative' || role === 'cooperateur') {
      items.push({
        id: 'voir-membres',
        label: 'Voir membres',
        icon: Users,
        onClick: () => navigate(`/backoffice/acteurs/${acteur.id}?tab=membres`),
      });
    } else if (role === 'institution') {
      items.push({
        id: 'voir-permissions',
        label: 'Voir permissions',
        icon: Shield,
        onClick: () => navigate(`/backoffice/acteurs/${acteur.id}?tab=permissions`),
      });
    } else if (role === 'identificateur') {
      items.push({
        id: 'voir-enrolements',
        label: 'Voir enrôlements',
        icon: UserPlus,
        onClick: () => navigate(`/backoffice/acteurs/${acteur.id}?tab=enrolements`),
      });
      items.push({
        id: 'voir-pin',
        label: pinVisible[acteur.id] ? 'Masquer le PIN' : 'Voir le PIN',
        icon: KeyRound,
        onClick: () => fetchPin(acteur.id),
      });
      items.push({
        id: 'modifier-pin',
        label: 'Modifier le PIN',
        icon: Key,
        onClick: () => {
          setModifierPinActeur({
            id: acteur.id,
            nom: `${acteur.prenoms || ''} ${acteur.nom || ''}`.trim() || 'Identificateur',
          });
          setNouveauPin('');
        },
      });
    }

    items.push({
      id: 'voir-detail',
      label: 'Voir le détail',
      icon: Eye,
      onClick: () => navigate(`/backoffice/acteurs/${acteur.id}`),
    });

    items.push({ id: 'div-1', divider: true });

    if (hasPermission('acteurs.suspend') && acteur.statut === 'actif') {
      items.push({
        id: 'suspendre',
        label: 'Suspendre',
        icon: UserX,
        type: 'danger',
        onClick: () => handleSingleSuspend(acteur),
      });
    }

    if (hasPermission('acteurs.suspend') && acteur.statut === 'suspendu') {
      items.push({
        id: 'reactiver',
        label: 'Réactiver',
        icon: RotateCcw,
        type: 'success',
        onClick: () => handleSingleReactivate(acteur),
      });
    }

    if (hasPermission('acteurs.write')) {
      items.push({
        id: 'reset-mdp',
        label: 'Réinitialiser le mot de passe',
        icon: Key,
        onClick: () => handleSingleResetMdp(acteur),
      });
      items.push({
        id: 'changer-type',
        label: 'Changer le type',
        icon: UserCog,
        onClick: () => handleSingleChangerType(acteur),
      });
    }

    if (CAN_SIGNAL(boUser?.role || bo.user?.role)) {
      items.push({
        id: 'signaler',
        label: 'Signaler',
        icon: Flag,
        type: 'danger',
        onClick: () => setActeurToSignal(acteur),
      });
    }

    items.push({ id: 'div-2', divider: true });
    items.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      type: 'danger',
      onClick: () => {
        const acteurName = getActeurName(acteur);
        setConfirmAction({
          open: true,
          title: 'Supprimer cet acteur ?',
          message: `Suppression définitive de ${acteurName}. L'acteur ne pourra plus se connecter et disparaîtra de la liste. Données personnelles archivées 30 jours puis purgées. Action journalisée.`,
          severity: 'danger',
          requireTyped: 'SUPPRIMER',
          onConfirm: async () => {
            setConfirmAction(null);
            await softDeleteActeur(acteur.id);
          },
        });
      },
    });

    return items;
  }, [
    bo.user?.role,
    boUser?.role,
    fetchPin,
    getActeurName,
    handleSingleChangerType,
    handleSingleReactivate,
    handleSingleResetMdp,
    handleSingleSuspend,
    hasPermission,
    navigate,
    pinVisible,
    softDeleteActeur,
  ]);

  const handleModifierPin = async () => {
    if (!modifierPinActeur || pendingPinChange) return;
    if (!/^\d{4}$/.test(nouveauPin)) { toast.error('Le PIN doit contenir exactement 4 chiffres'); return; }
    const PINS_INTERDITS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '1212', '2121', '1010'];
    if (PINS_INTERDITS.includes(nouveauPin)) { toast.error('Ce PIN est trop simple. Choisissez une combinaison moins évidente.'); return; }
    setPendingPinChange({
      id: modifierPinActeur.id,
      nom: modifierPinActeur.nom,
      pin: nouveauPin,
      lastTwoDigits: nouveauPin.slice(-2),
    });
  };

  const confirmModifierPin = async () => {
    if (!pendingPinChange) return;
    setPinLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_URL}/auth/identificateur/${pendingPinChange.id}/pin`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pendingPinChange.pin }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) { toast.error('Erreur lors de la modification du PIN'); return; }
      toast.success(`PIN de ${pendingPinChange.nom} modifié avec succès`);
      setPinVisible(prev => ({ ...prev, [pendingPinChange.id]: true }));
      setModifierPinActeur(null);
      setPendingPinChange(null);
      setNouveauPin('');
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as any)?.name === 'AbortError') {
        toast.error('Délai dépassé, vérifiez votre connexion');
        return;
      }
      console.warn('[BOActeurs] handleModifierPin failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur réseau');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: '#111827' }}>Acteurs</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            {filtered.length} acteur{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} sur {acteurs.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            onClick={() => generateCSV(filtered, true)}
            style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRadius: 14, background: '#fff', border: '1px solid #DBD2C5', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </motion.button>
          {CAN_CREATE_ADMIN(bo.user?.role) && (
            <motion.button
              onClick={() => navigate('/backoffice/acteurs/nouveau')}
              style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRadius: 14, background: BO_PRIMARY, border: `1px solid ${BO_PRIMARY}`, fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <UserPlus className="w-5 h-5" />
              <span>Nouvel acteur</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Onglets rôles — hybride Charter v1.0 (actif = couleur rôle, inactif = neutre Charter) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {roleTabsConfig.map(tab => {
          const isActive = filterRole === tab.key;
          return (
            <motion.button
              key={tab.key}
              type="button"
              onClick={() => {
                setFilterRole(tab.key);
                setActeursPage(1);
                setActeursRole(mapTypeToBackendRole(tab.key));
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 44,
                padding: '0 16px',
                borderRadius: 16,
                background: isActive ? tab.color : '#fff',
                color: isActive ? '#fff' : '#6B7280',
                border: isActive ? `2px solid ${tab.color}` : '1px solid #DBD2C5',
                fontSize: 13,
                fontWeight: 500,
                boxShadow: isActive ? `0 2px 6px ${tab.color}26` : 'none',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
              whileHover={!isActive ? { y: -2, scale: 1.01 } : {}}
              whileTap={{ scale: 0.97 }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${tab.label} (${tab.count})`}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 7px',
                  borderRadius: 999,
                  background: isActive ? 'rgba(255,255,255,0.22)' : '#F5F2ED',
                  color: isActive ? '#fff' : '#5B5248',
                  fontSize: 11,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {tab.count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Section Vue d'ensemble — Charter v1.0 fond pastel #F5F2ED */}
      <div style={{ background: '#F5F2ED', borderRadius: 20, padding: 20, marginBottom: 20 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #E8DFD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BO_PRIMARY }}
            >
              <Users size={18} />
            </motion.div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111827', margin: 0 }}>Vue d'ensemble</h2>
              <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>Statuts et alertes en temps réel</p>
            </div>
          </div>
        </div>

        {/* Ligne 1: KPIs Statut */}
        <KPIGrid className="mb-3">
        <UniversalKPI
          label="Actifs"
          animatedTarget={kpiCounts.actifs}
          icon={UserCheck}
          color="#2E8B57"
          iconAnimation="bounce"
          active={filterStatut === 'actif'}
          onClick={() => setFilterStatut(filterStatut === 'actif' ? 'all' : 'actif')}
        />
        <UniversalKPI
          label="En attente"
          animatedTarget={kpiCounts.enAttente}
          icon={Clock}
          color="#C46210"
          iconAnimation="float"
          active={filterStatut === 'en_attente'}
          onClick={() => setFilterStatut(filterStatut === 'en_attente' ? 'all' : 'en_attente')}
        />
        <UniversalKPI
          label="Suspendus"
          animatedTarget={kpiCounts.suspendus}
          icon={UserX}
          color="#B84A3F"
          iconAnimation="pulse"
          active={filterStatut === 'suspendu'}
          onClick={() => setFilterStatut(filterStatut === 'suspendu' ? 'all' : 'suspendu')}
        />
        <UniversalKPI
          label="Rejetés"
          animatedTarget={kpiCounts.rejetes}
          icon={X}
          color="#8A7E70"
          iconAnimation="float"
          active={filterStatut === 'rejete'}
          onClick={() => setFilterStatut(filterStatut === 'rejete' ? 'all' : 'rejete')}
        />
      </KPIGrid>

      {/* Ligne 2: KPIs Alertes */}
      {CAN_VIEW_ALERTS(bo.user?.role) && (
        <KPIGrid className="mb-5">
          <UniversalKPI
            label="Sans RSTI"
            animatedTarget={alertesCounts.sansRsti}
            icon={CameraOff}
            color="#C46210"
            iconAnimation="float"
            active={filterAlerte === 'sans_photo'}
            onClick={() => setFilterAlerte(filterAlerte === 'sans_photo' ? 'all' : 'sans_photo')}
          />
          <UniversalKPI
            label="Sans CNI"
            animatedTarget={alertesCounts.sansCni}
            icon={IdCard}
            color="#B84A3F"
            iconAnimation="pulse"
            active={filterAlerte === 'sans_cni'}
            onClick={() => setFilterAlerte(filterAlerte === 'sans_cni' ? 'all' : 'sans_cni')}
          />
          <UniversalKPI
            label="Sans CMU"
            animatedTarget={alertesCounts.sansCmu}
            icon={Heart}
            color="#B14671"
            iconAnimation="float"
            active={filterAlerte === 'sans_cmu'}
            onClick={() => setFilterAlerte(filterAlerte === 'sans_cmu' ? 'all' : 'sans_cmu')}
          />
          <UniversalKPI
            label="Alerte"
            animatedTarget={alertesCounts.alerte}
            icon={AlertTriangle}
            color="#A03D33"
            iconAnimation="pulse"
            active={filterAlerte === 'alerte_globale'}
            onClick={() => setFilterAlerte(filterAlerte === 'alerte_globale' ? 'all' : 'alerte_globale')}
          />
        </KPIGrid>
      )}

      </div>
      {/* Fin section Vue d'ensemble */}

      {/* Section Liste — Charter v1.0 fond pastel #F5F2ED */}
      <div style={{ background: '#F5F2ED', borderRadius: 20, padding: 20 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #E8DFD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BO_PRIMARY }}
            >
              <Users size={18} />
            </motion.div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111827', margin: 0 }}>Liste des acteurs</h2>
              <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {acteurs.length}</p>
            </div>
          </div>
        </div>

      {/* Barre de recherche + filtre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'nowrap', position: 'relative' }}>
        {/* Checkbox tout sélectionner */}
        <motion.button
          onClick={toggleSelectAll}
          aria-label="Tout sélectionner"
          className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 font-semibold text-sm"
          style={{ borderColor: selectedIds.size > 0 ? BO_PRIMARY : undefined, color: selectedIds.size > 0 ? BO_PRIMARY : '#374151' }}
          whileTap={{ scale: 0.97 }}
          title="Tout sélectionner"
        >
          {selectedIds.size === filtered.length && filtered.length > 0
            ? <CheckSquare className="w-5 h-5" style={{ color: BO_PRIMARY }} />
            : <Square className="w-5 h-5" />}
        </motion.button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <UniversalRechercheBO
            suggestions={searchSuggestions}
            placeholder="Rechercher par nom, téléphone..."
            debounceMs={200}
            emptyMessage="Aucun acteur trouvé"
            onChange={(query) => setSearch(query)}
            onSelect={(suggestion) => navigate(`/backoffice/acteurs/${suggestion.id}`)}
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

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              background: 'var(--color-white)',
              border: `2px solid ${BO_PRIMARY}`,
              borderRadius: 16,
              padding: '12px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              boxShadow: `0 4px 12px color-mix(in srgb, ${BO_PRIMARY} 15%, transparent)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: BO_PRIMARY, fontWeight: 700, fontSize: 14 }}>
              <CheckSquare size={18} />
              {selectedIds.size} acteur{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {hasPermission('acteurs.suspend') && (
                <UniversalActionButtonBO
                  label="Suspendre la sélection"
                  icon={UserX}
                  variant="danger"
                  size="sm"
                  loading={isBulkProcessing}
                  onClick={handleBulkSuspendConfirm}
                />
              )}
              {hasPermission('acteurs.suspend') && (
                <UniversalActionButtonBO
                  label="Réactiver la sélection"
                  icon={RotateCcw}
                  variant="success"
                  size="sm"
                  loading={isBulkProcessing}
                  onClick={handleBulkReactivateConfirm}
                />
              )}
              <UniversalActionButtonBO
                label="Exporter CSV"
                icon={Download}
                variant="info"
                size="sm"
                loading={isBulkProcessing}
                onClick={bulkExport}
              />
              <UniversalActionButtonBO
                label="Tout désélectionner"
                icon={X}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {acteursLoading && acteurs.length === 0 && (
        <div className="space-y-3">
          <UniversalSkeletonBO preset="list" count={10} />
        </div>
      )}

      {!acteursLoading && error && acteurs.length === 0 && (
        <UniversalErrorStateBO
          type="network"
          role={boUser?.role || bo.user?.role || 'gestionnaire_zone'}
          onRetry={() => {
            clearError();
            void refreshActeurs();
          }}
        />
      )}

      {!acteursLoading && !(error && acteurs.length === 0) && filtered.length === 0 && (
        <UniversalErrorStateBO
          type="notfound"
          role={boUser?.role || bo.user?.role || 'gestionnaire_zone'}
          title="Aucun acteur trouvé"
          description="Aucun acteur ne correspond aux filtres."
          hideIcon={false}
        />
      )}

      {!acteursLoading && !(error && acteurs.length === 0) && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((acteur, index) => {
            const flagCount = flaggedUserIds.has(acteur.id) ? 1 : 0;
            const flagTooltip = flagReasons.get(acteur.id) || undefined;
            const isSelected = selectedIds.has(acteur.id);

            return (
              <div key={acteur.id} style={{ position: 'relative' }}>
                <UniversalCardBOActeur
                  acteur={acteur}
                  flagsCount={flagCount}
                  flagTooltip={flagTooltip}
                  selectable={true}
                  selected={isSelected}
                  onSelectChange={() => toggleSelect(acteur.id)}
                  onClick={() => navigate(`/backoffice/acteurs/${acteur.id}`)}
                  onDotsClick={(e) => {
                    e.stopPropagation();
                  }}
                  index={index}
                />
                <div
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    position: 'absolute',
                    right: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 5,
                  }}
                >
                  <UniversalDropdownMenuBO
                    trigger={<span style={{ display: 'block', width: 32, height: 32 }} />}
                    items={buildDropdownItems(acteur)}
                    align="right"
                    minWidth={260}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 pb-4">
          <UniversalPaginationBO
            currentPage={acteursPage}
            totalItems={acteursTotal}
            itemsPerPage={ACTEURS_PAGE_SIZE}
            onPageChange={(page) => setActeursPage(page)}
            showFirstLast={true}
            showItemsPerPage={false}
            showCounter={true}
            showPageJump={true}
          />
        </div>
      )}

      <AnimatePresence>
        {modifierPinActeur && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModifierPinActeur(null)}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 w-full max-w-sm border-2"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-modifier-pin-title"
            >
              <h3 id="modal-modifier-pin-title" className="font-black text-gray-900 text-lg mb-1">Modifier le PIN</h3>
              <p className="text-sm text-gray-500 mb-5">{modifierPinActeur.nom}</p>
              <label htmlFor="nouveau-pin-input" className="sr-only">Nouveau PIN</label>
              <input
                id="nouveau-pin-input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={nouveauPin}
                onChange={e => setNouveauPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Nouveau PIN à 4 chiffres"
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-center font-mono text-2xl tracking-widest mb-5"
                style={{ borderColor: nouveauPin.length === 4 ? BO_PRIMARY : undefined }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModifierPinActeur(null);
                    setPendingPinChange(null);
                  }}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                >
                  Annuler
                </button>
                <motion.button
                  onClick={handleModifierPin}
                  disabled={nouveauPin.length !== 4 || pinLoading}
                  className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: BO_PRIMARY }}
                  whileTap={{ scale: 0.97 }}
                >
                  {pinLoading ? 'Enregistrement...' : 'Confirmer'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingPinChange && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[210] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPendingPinChange(null)}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 w-full max-w-md border-2"
              style={{ borderColor: '#F59E0B' }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-confirm-pin-change-title"
            >
              <h3 id="modal-confirm-pin-change-title" className="font-black text-gray-900 text-lg mb-2">Confirmer le changement de PIN</h3>
              <p className="text-sm text-gray-700 mb-5">
                {`Confirmer le changement de PIN de ${pendingPinChange.nom} ? Le nouveau PIN sera ••${pendingPinChange.lastTwoDigits}. Cette action sera enregistrée dans l’audit avec votre identifiant et l’horodatage.`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingPinChange(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                >
                  Annuler
                </button>
                <motion.button
                  onClick={confirmModifierPin}
                  disabled={pinLoading}
                  className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: BO_PRIMARY }}
                  whileTap={{ scale: 0.97 }}
                >
                  {pinLoading ? 'Enregistrement...' : 'Confirmer'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmAction && (
        <UniversalConfirmModalBO
          open={confirmAction.open}
          onClose={closeConfirmAction}
          onConfirm={submitConfirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          severity={confirmAction.severity}
          confirmLabel={confirmAction.confirmLabel}
          requireTypedConfirmation={confirmAction.requireTyped}
          typedConfirmationHelper={confirmAction.requireTyped ? `Tapez ${confirmAction.requireTyped} pour confirmer cette opération` : undefined}
          loading={confirmActionLoading}
        />
      )}

      <AnimatePresence>
        {acteurToSignal && (
          <SignalementModal
            key={acteurToSignal.id}
            acteur={{
              id: acteurToSignal.id,
              prenoms: acteurToSignal.prenoms,
              nom: acteurToSignal.nom,
              role: acteurToSignal.role,
              type: acteurToSignal.type,
            }}
            onClose={() => setActeurToSignal(null)}
            onSuccess={(flag) => {
              const id = acteurToSignal.id;
              setFlaggedUserIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
              });
              setFlagReasons((prev) => {
                const next = new Map(prev);
                next.set(id, flag.raison);
                return next;
              });
              toast.success('Signalement envoy\u00e9 aux super-administrateurs');
            }}
          />
        )}
      </AnimatePresence>

      </div>
      {/* Fin section Liste */}
    </div>
  );
}