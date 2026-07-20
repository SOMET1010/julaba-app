// BackOfficeContext.tsx — migré Supabase → NestJS
import { eventBus, EVENTS } from '../services/eventBus';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  boDashboardStats,
  boGetActeurs,
  boGetActeurCounts,
  boGetTransactions,
  boGetCooperatives,
  boGetZones, boGetTerritoires,
  boCreateZone,
  boUpdateZone,
  boGetMissions,
  boCreateMission,
  boUpdateMission,
  boGetDossiers,
  boUpdateDossier,
  boGetAuditLogs,
  boGetBOUsers,
  boCreateBOUser,
  updateBOUserActif as patchBOUserActifStatus,
  boUpdateBOUserPermissions,
  boGetInstitutions,
  boCreateInstitution,
  boUpdateInstitution,
  boDeleteInstitutionApi,
  boDeleteBrouillon,
  boGetSignalements,
  boGetNotifications,
  boSoftDeleteActeur,
  type BOUser,
  type Acteur,
  type RoleCounts,
  type Transaction,
  type Cooperative,
  type DashboardStats,
  type BODossier,
  type BOTerritoire,
  type BOMission,
  type BOAuditLog,
  type BOInstitution,
} from '../services/backoffice-api';
import { useBONotifCounts, type BONotifCounts } from '../hooks/useBONotifCounts';

interface BackOfficeContextType {
  user: BOUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  logout: () => void;
  stats: DashboardStats | null;
  statsLoading: boolean;
  refreshStats: () => Promise<void>;
  acteurs: Acteur[];
  acteursTotal: number;
  acteursLoading: boolean;
  acteursPage: number;
  acteursSearch: string;
  acteursRole: string;
  roleCounts: RoleCounts;
  setActeursPage: (p: number) => void;
  setActeursSearch: (s: string) => void;
  setActeursRole: (r: string) => void;
  refreshActeurs: () => Promise<void>;
  refreshRoleCounts: (force?: boolean) => Promise<void>;
  transactions: Transaction[];
  transactionsTotal: number;
  transactionsLoading: boolean;
  refreshTransactions: (force?: boolean) => Promise<void>;
  cooperatives: Cooperative[];
  cooperativesLoading: boolean;
  refreshCooperatives: (force?: boolean) => Promise<void>;
  refreshDossiers: (force?: boolean) => Promise<void>;
  refreshZones: (force?: boolean) => Promise<void>;
  refreshMissions: (force?: boolean) => Promise<void>;
  refreshBOUsers: () => Promise<void>;
  refreshInstitutions: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentPage: string;
  setCurrentPage: (p: string) => void;
  // Champs legacy attendus par les écrans BO
  dossiers: BODossier[];
  zones: BOZone[];
  zonesMap: Record<string, string>;
  territoires: BOTerritoire[];
  missions: BOMission[];
  auditLogs: BOAuditLog[];
  boUsers: BOUser[];
  institutions: BOInstitution[];
  boUser: any;
  setBOUser: (u: any) => void;
  hasPermission: (permission: string) => boolean;
  updateActeurStatut: (id: string, s: string, raison?: string) => Promise<void>;
  softDeleteActeur: (id: string) => Promise<void>;
  updateDossierStatut: (id: string, s: string, motif?: string) => Promise<void>;
  updateMissionStatut: (id: string, s: string) => Promise<void>;
  updateZoneStatut: (id: string, s: string) => Promise<void>;
  updateZoneData: (id: string, data: Partial<BOZone>) => Promise<void>;
  deleteZone: (id: string, opts?: { motif?: string }) => Promise<void>;
  addAuditLog: (entry: any) => void;
  addBOUser: (user: any) => Promise<any>;
  addMission: (mission: any) => Promise<void>;
  addZone: (zone: any) => Promise<void>;
  deleteBrouillon: (id: string) => Promise<void>;
  updateBOUserActif: (id: string, a: boolean) => Promise<void>;
  updateBOUserPermissions: (id: string, permissions: Record<string, boolean>) => Promise<void>;
  addInstitution: (institution: any) => Promise<void>;
  updateInstitutionModules: (id: string, modules: any) => Promise<void>;
  updateInstitutionStatut: (id: string, s: string) => Promise<void>;
  deleteInstitution: (id: string) => Promise<void>;
  refreshUser: () => Promise<boolean>;
  boCounts: BONotifCounts;
  markCategoryRead: (category: string) => void;
}

const BackOfficeContext = createContext<BackOfficeContextType | null>(null);

const DEFAULT_ROLE_COUNTS: RoleCounts = {
  all: 0,
  marchand: 0,
  producteur: 0,
  cooperateur: 0,
  institution: 0,
  identificateur: 0,
  admin: 0,
};

const BO_SCREEN_PERMISSIONS: Record<string, string[]> = {
  admin_general: ['acteurs.read','acteurs.write','acteurs.delete','acteurs.suspend','enrolement.read','enrolement.write','enrolement.validate','supervision.read','supervision.write','supervision.freeze','zones.read','zones.write','missions.read','missions.write','mutations.read','mutations.write','moderation.read','moderation.write','audit.read','utilisateurs.read','utilisateurs.write','utilisateurs.delete','parametres.read','parametres.write','academy.read','academy.write'],
  admin_national: ['acteurs.read','acteurs.write','acteurs.suspend','enrolement.read','enrolement.write','enrolement.validate','supervision.read','supervision.write','supervision.freeze','zones.read','zones.write','missions.read','missions.write','mutations.read','mutations.write','moderation.read','moderation.write','audit.read','utilisateurs.read','parametres.read','academy.read'],
  gestionnaire_zone: ['acteurs.read','acteurs.write','enrolement.read','enrolement.validate','supervision.read','zones.read','missions.read','mutations.read','mutations.write','moderation.read','moderation.write','audit.read','academy.read'],
  operateur_terrain: ['acteurs.read','acteurs.write','acteurs.suspend','enrolement.read','enrolement.validate','supervision.read','supervision.write','supervision.freeze','zones.read','missions.read','mutations.read','mutations.write','moderation.read','moderation.write','audit.read','academy.read'],
};

export function useBackOffice(): BackOfficeContextType {
  const ctx = useContext(BackOfficeContext);
  if (!ctx) throw new Error('useBackOffice doit être utilisé dans <BackOfficeProvider>');
  return ctx;
}

export function BackOfficeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BOUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [acteursTotal, setActeursTotal] = useState(0);
  const [acteursLoading, setActeursLoading] = useState(false);
  const [acteursPage, setActeursPage] = useState(1);
  const [acteursSearch, setActeursSearchState] = useState('');
  const [acteursRole, setActeursRole] = useState('all');
  const [roleCounts, setRoleCounts] = useState<RoleCounts>(DEFAULT_ROLE_COUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [cooperativesLoading, setCooperativesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = () => setError(null);

  // ── États des données manquantes ──────────────────────────
  const [dossiers, setDossiers] = useState<BODossier[]>([]);
  const [dossiersLoading, setDossiersLoading] = useState(false);
  const [territoires, setTerritoires] = useState<BOTerritoire[]>([]);
  const [zones, setZones] = useState<BOZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [missions, setMissions] = useState<any[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [boUsers, setBOUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [signalements, setSignalements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const { counts: boCounts, markCategoryRead } = useBONotifCounts(!!user);

  // ── Flags chargement à la demande ──────────────────────────
  const [dossiersLoaded, setDossiersLoaded] = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [missionsLoaded, setMissionsLoaded] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [boUsersLoaded, setBOUsersLoaded] = useState(false);
  const [institutionsLoaded, setInstitutionsLoaded] = useState(false);
  const [signalementsLoaded, setSignalementsLoaded] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [cooperativesLoaded, setCooperativesLoaded] = useState(false);

  const zonesMap = useMemo(() => {
    return zones.reduce<Record<string, string>>((acc, zone) => {
      if (typeof zone.id !== 'string' || !zone.id) return acc;
      const nom = typeof zone.nom === 'string' ? zone.nom.trim() : '';
      if (nom) acc[zone.id] = nom;
      return acc;
    }, {});
  }, [zones]);

  const loadUser = useCallback(async (): Promise<boolean> => {
    try {
      let res = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });
      if (!res.ok) {
        sessionStorage.removeItem('julaba_user');
        setUser(null);
        return false;
      }
      const data = await res.json();
      const u = data.user;
      if (u && ['admin_general', 'operateur_terrain', 'super_admin', 'admin_national', 'gestionnaire_zone'].includes(u.role)) {
        setUser({
          id: u.id,
          phone: u.phone,
          // On conserve les vrais firstName/lastName du backend (source non
          // tronquee) en plus de full_name reconstruit.
          firstName: u.firstName ?? undefined,
          lastName: u.lastName ?? undefined,
          full_name: u.firstName ? u.firstName + ' ' + (u.lastName || '') : (u.full_name || u.phone),
          role: u.role,
          boPermissions: u.boPermissions ?? u.bo_permissions ?? null,
          mustChangePassword: !!(u.mustChangePassword ?? u.must_change_password),
          // Champs entite exposes pour l'affichage (raison sociale) et l'etape D.
          institutionName: u.institutionName ?? u.institution_name ?? null,
          entiteMetadata: u.entiteMetadata ?? u.entite_metadata ?? null,
        });
        sessionStorage.setItem('julaba_user', JSON.stringify(u));
        return true;
      }
    } catch (e) {
      void e;
      setUser(null);
    }
    return false;
  }, []);

  useEffect(() => {
    (async () => {
      await loadUser();
      setIsAuthLoading(false);
    })();

    const handleLogin = async () => {
      await loadUser();
    };
    window.addEventListener('julaba:bo-login', handleLogin);
    return () => {
      window.removeEventListener('julaba:bo-login', handleLogin);
    };
  }, [loadUser]);

  const logout = useCallback(() => {
    setUser(null);
    setStats(null);
    setActeurs([]);
    setRoleCounts(DEFAULT_ROLE_COUNTS);
    setTransactions([]);
    setCooperatives([]);
    setDossiersLoaded(false);
    setZonesLoaded(false);
    setMissionsLoaded(false);
    setAuditLoaded(false);
    setBOUsersLoaded(false);
    setInstitutionsLoaded(false);
    setSignalementsLoaded(false);
    setTransactionsLoaded(false);
    setCooperativesLoaded(false);
  }, []);

  // Force logout déclenché depuis EntryGate (rôle inconnu, état zombie post-auth)
  // Reset complet état BO local
  useEffect(() => {
    const onForceLogout = () => {
      console.warn('[BackOfficeContext] julaba:force-logout received - logout BO forcé');
      logout();
    };
    window.addEventListener('julaba:force-logout', onForceLogout);
    return () => window.removeEventListener('julaba:force-logout', onForceLogout);
  }, [logout]);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await boDashboardStats()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur stats'); }
    finally { setStatsLoading(false); }
  }, []);

  const refreshActeurs = useCallback(async (retryCount = 0) => {
    setActeursLoading(true);
    try {
      const res = await boGetActeurs({ page: acteursPage, limit: 50, search: acteursSearch || undefined, role: acteursRole || undefined });
      // Normalisation NestJS → format attendu par BODashboard
      const normalized = res.data.map((a: any) => ({
        ...a,
        nom: a.lastName || a.full_name?.split(' ')[1] || '',
        prenoms: a.firstName || a.full_name?.split(' ')[0] || '',
        telephone: a.phone,
        region: a.region || '',
        statut: a.statut || a.status || (a.validated === false ? 'en_attente' : 'actif'),
        type: a.role,
        activite: a.activity || a.activite || '',
        nin: a.nin || '',
        zone: a.zoneId || '',
        dateInscription: a.createdAt || a.created_at || '',
      }));
      const acteursFiltres = user?.role === 'super_admin'
        ? normalized
        : normalized.filter((a: { role?: string }) => a.role !== 'super_admin');
      setActeurs(acteursFiltres);
      setActeursTotal(res.total);
      setError(null);
    }
    catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur chargement acteurs';
      console.error('[refreshActeurs] Failed:', errorMsg, 'retry:', retryCount);

      if (retryCount < 3) {
        console.warn(`[refreshActeurs] Retry ${retryCount + 1}/3 dans 5s`);
        setTimeout(() => {
          void refreshActeurs(retryCount + 1);
        }, 5000);
      } else {
        setError(errorMsg);
        toast.error(`Impossible de charger les acteurs: ${errorMsg}. Verifiez votre connexion.`);
      }
    }
    finally { setActeursLoading(false); }
  }, [acteursPage, acteursSearch, acteursRole]);

  const refreshRoleCounts = useCallback(async (force = false) => {
    const controller = new AbortController();
    const counts = await boGetActeurCounts(controller.signal, force);
    setRoleCounts(counts);
  }, []);

  const setActeursSearch = useCallback((s: string) => {
    setActeursSearchState(s);
    setActeursPage(1);
  }, []);

  const refreshTransactions = useCallback(async (force = false) => {
    if (transactionsLoaded && !force) return;
    setTransactionsLoading(true);
    try {
      const res = await boGetTransactions({ page: 1, limit: 50 });
      const normalizedTx = res.data.map((t: any) => ({
        ...t,
        montant: parseFloat(t.amount || t.montant || '0'),
        date: t.created_at || t.date || '',
        region: t.region || t.commune || '',
        acteurNom: t.acteur_nom || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.phone || '',
        statut: t.statut || t.status || 'en_attente',
      }));
      setTransactions(normalizedTx);
      setTransactionsTotal(res.total);
      setTransactionsLoaded(true);
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur transactions'); }
    finally { setTransactionsLoading(false); }
  }, [transactionsLoaded]);

  const refreshCooperatives = useCallback(async (force = false) => {
    if (cooperativesLoaded && !force) return;
    setCooperativesLoading(true);
    try { setCooperatives(await boGetCooperatives()); setCooperativesLoaded(true); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur coopératives'); }
    finally { setCooperativesLoading(false); }
  }, [cooperativesLoaded]);

  // ── Fonctions de chargement des données manquantes ──────────
  const refreshDossiers = useCallback(async (force = false) => {
    if (dossiersLoaded && !force) return;
    setDossiersLoading(true);
    try { setDossiers(await boGetDossiers()); setDossiersLoaded(true); }
    catch (e: any) { console.error('[BO]', e); }
    finally { setDossiersLoading(false); }
  }, [dossiersLoaded]);

  const refreshZones = useCallback(async (force = false) => {
    if (zonesLoaded && !force) return;
    setZonesLoading(true);
    try { setZones(await boGetZones()); setTerritoires(await boGetTerritoires()); setZonesLoaded(true); }
    catch (e: any) { console.error('[BO]', e); }
    finally { setZonesLoading(false); }
  }, [zonesLoaded]);


  const refreshMissions = useCallback(async (force = false) => {
    if (missionsLoaded && !force) return;
    setMissionsLoading(true);
    try { setMissions(await boGetMissions()); setMissionsLoaded(true); }
    catch (e: any) { console.error('[BO]', e); }
    finally { setMissionsLoading(false); }
  }, [missionsLoaded]);

  const refreshAuditLogs = useCallback(async (force = false) => {
    if (auditLoaded && !force) return;
    try { setAuditLogs(await boGetAuditLogs()); setAuditLoaded(true); }
    catch (e: any) { console.error('[BO]', e); }
  }, [auditLoaded]);

  const refreshBOUsers = useCallback(async (force = false) => {
    if (boUsersLoaded && !force) return;
    try {
      const res: any = await boGetBOUsers();
      const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.users) ? res.users : (Array.isArray(res?.data) ? res.data : []));
      const filtres = user?.role === 'super_admin'
        ? list
        : list.filter((u: { role?: string }) => u.role !== 'super_admin');
      setBOUsers(filtres);
      setBOUsersLoaded(true);
    }
    catch (e: any) { console.error('[BO]', e); }
  }, [boUsersLoaded, user?.role]);

  const refreshInstitutions = useCallback(async (force = false) => {
    if (institutionsLoaded && !force) return;
    try { setInstitutions(await boGetInstitutions()); setInstitutionsLoaded(true); }
    catch (e: any) { console.error('[BO]', e); }
  }, [institutionsLoaded]);

  const refreshSignalements = useCallback(async (force = false) => {
    if (signalementsLoaded && !force) return;
    try { setSignalements(await boGetSignalements()); setSignalementsLoaded(true); }
    catch (e: any) { console.error('[BO]', e); }
  }, [signalementsLoaded]);

  const refreshNotifications = useCallback(async () => {
    try { setNotifications(await boGetNotifications()); }
    catch (e: any) { console.error('[BO]', e); }
  }, []);

  // Abonnement eventBus — refresh instantane sur actions locales
  useEffect(() => {
    const unsubs = [
      eventBus.subscribe(EVENTS.TRANSACTION_CREATED, () => { void refreshStats(); void refreshTransactions(true); }),
      eventBus.subscribe(EVENTS.USER_CREATED, () => { void refreshActeurs(); void refreshStats(); void refreshRoleCounts(true); }),
      eventBus.subscribe(EVENTS.USER_UPDATED, () => { void refreshActeurs(); }),
      eventBus.subscribe(EVENTS.STOCK_UPDATED, () => { void refreshStats(); }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  useEffect(() => {
    if (!user?.id || user.mustChangePassword) return;
    void refreshStats();
    void refreshActeurs();
    void refreshRoleCounts();
    void refreshTransactions(true);
    void refreshDossiers(true);
    void refreshZones(true);
    void refreshMissions(true);
  }, [user?.id]); // eslint-disable-line

  useEffect(() => {
    if (!user?.id || user.mustChangePassword) return;
    const poll = setInterval(() => {
      void refreshStats();
      void refreshActeurs();
      void refreshTransactions(true);
    }, 60000);
    return () => clearInterval(poll);
  }, [user?.id]); // eslint-disable-line

  useEffect(() => {
    if (user && !user.mustChangePassword) refreshActeurs();
  }, [acteursPage, acteursSearch, acteursRole]); // eslint-disable-line

  const value: BackOfficeContextType = useMemo(
    () => ({
    user, isAuthenticated: !!user, isAuthLoading, logout,
    refreshUser: loadUser,
    stats, statsLoading, refreshStats,
    acteurs, acteursTotal, acteursLoading, acteursPage, acteursSearch, acteursRole, roleCounts,
    setActeursPage, setActeursSearch, setActeursRole, refreshActeurs, refreshRoleCounts,
    transactions, transactionsTotal, transactionsLoading, refreshTransactions,
    cooperatives, cooperativesLoading, refreshCooperatives,
    refreshDossiers,
    refreshZones,
    refreshMissions,
    refreshBOUsers,
    refreshInstitutions,
    error, clearError,
    dossiers, zones, zonesMap, territoires, missions,
    searchQuery, setSearchQuery, currentPage, setCurrentPage,
    auditLogs, boUsers, institutions,
    // Actions CRUD réelles
    updateActeurStatut: async (id: string, s: string, raison?: string) => {
      const { boUpdateActeur } = await import('../services/backoffice-api');
      await boUpdateActeur(id, {
        status: s,
        ...(raison ? { suspension_reason: raison } : {}),
      });
      await refreshActeurs();
      await refreshRoleCounts(true);
    },
    softDeleteActeur: async (id: string) => {
      try {
        await boSoftDeleteActeur(id);
        await refreshActeurs();
        await refreshRoleCounts(true);
        toast.success('Acteur supprimé avec succès');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erreur lors de la suppression';
        toast.error(message);
        throw e;
      }
    },
    updateDossierStatut: async (id: string, s: string, motif?: string) => {
      const payload: Record<string, string> = { statut: s };
      if (motif) payload.motif_rejet = motif;
      await boUpdateDossier(id, payload);
      await refreshDossiers();
    },
    updateMissionStatut: async (id: string, s: string) => {
      await boUpdateMission(id, { statut: s });
      await refreshMissions();
    },
    updateZoneStatut: async (id: string, s: string) => {
      await boUpdateZone(id, { actif: s === 'active' || s === 'actif' });
      await refreshZones();
    },
    updateZoneData: async (id: string, d: any) => {
      await boUpdateZone(id, d);
      await refreshZones();
    },
    deleteZone: async (id: string, opts?: { motif?: string }) => {
      const { boDeleteZone } = await import('../services/backoffice-api');
      await boDeleteZone(id, opts);
      await refreshZones();
    },
    addAuditLog: async (entry: any) => {
      try {
        const { boPostAuditLog } = await import('../services/backoffice-api');
        await boPostAuditLog({ ...entry, timestamp: new Date().toISOString() });
        refreshAuditLogs();
      } catch (e) {
        void e;
      }
    },
    addBOUser: async (u: any) => {
      const res = await boCreateBOUser(u);
      await refreshBOUsers();
      return res;
    },
    addMission: async (m: any) => {
      await boCreateMission(m);
      await refreshMissions();
    },
    addZone: async (z: any) => {
      await boCreateZone(z);
      await refreshZones();
    },
    deleteBrouillon: async (id: string) => {
      await boDeleteBrouillon(id);
      await refreshDossiers();
    },
    updateBOUserActif: async (id: string, a: boolean) => {
      await patchBOUserActifStatus(id, a);
      await refreshBOUsers();
    },
    updateBOUserPermissions: async (id: string, permissions: Record<string, boolean>) => {
      await boUpdateBOUserPermissions(id, permissions);
      await refreshBOUsers();
    },
    addInstitution: async (i: any) => {
      await boCreateInstitution(i);
      await refreshInstitutions();
    },
    updateInstitutionModules: async (id: string, m: any) => {
      await boUpdateInstitution(id, { modules: m });
      await refreshInstitutions();
    },
    updateInstitutionStatut: async (id: string, s: string) => {
      await boUpdateInstitution(id, { statut: s });
      await refreshInstitutions();
    },
    deleteInstitution: async (id: string) => {
      await boDeleteInstitutionApi(id);
      await refreshInstitutions();
    },
    boUser: user ? {
      ...user,
      // Lecture directe des vrais champs : aucun split de full_name (qui
      // tronquerait les noms multi-mots, dont la raison sociale des entites).
      prenom: user.firstName || '',
      nom: user.lastName || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    } : null,
    setBOUser: setUser,
    hasPermission: (permission: string) => {
      if (!user) return false;
      if (user.role === 'super_admin') return true;
      if (user.boPermissions && typeof user.boPermissions === 'object') {
        return user.boPermissions[permission] === true;
      }
      const role = (user as { role?: string }).role as string;
      return BO_SCREEN_PERMISSIONS[role]?.includes(permission) ?? false;
    },
    boCounts,
    markCategoryRead,
  }),
  [
    user,
    boCounts,
    markCategoryRead,
    isAuthLoading,
    logout,
    loadUser,
    stats,
    statsLoading,
    refreshStats,
    acteurs,
    acteursTotal,
    acteursLoading,
    acteursPage,
    acteursSearch,
    acteursRole,
    roleCounts,
    setActeursPage,
    setActeursSearch,
    setActeursRole,
    refreshActeurs,
    refreshRoleCounts,
    transactions,
    transactionsTotal,
    transactionsLoading,
    refreshTransactions,
    cooperatives,
    cooperativesLoading,
    refreshCooperatives,
    refreshDossiers,
    refreshZones,
    refreshMissions,
    refreshBOUsers,
    refreshInstitutions,
    refreshAuditLogs,
    error,
    dossiers,
    zones,
    zonesMap,
    territoires,
    missions,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    auditLogs,
    boUsers,
    institutions,
    setUser,
  ],
  );

  return <BackOfficeContext.Provider value={value}>{children}</BackOfficeContext.Provider>;
}

// ── Exports de compatibilité dev (ProfileSwitcher) ──────────────────────────
export type BORoleType =
  | 'admin_general'
  | 'operateur_terrain'
  | 'identificateur'
  | 'super_admin'
  | 'admin_national'
  | 'gestionnaire_zone';

export const MOCK_BO_USERS: any[] = [];

export function useBackOfficeOptional() {
  try {
    return useBackOffice();
  } catch {
    return null;
  }
}

// ── Types de compatibilité legacy ───────────────────────────────────────────

export type NiveauAcces = 'lecture' | 'ecriture' | 'complet' | 'admin_general' | 'aucun';
export type TypeInstitution =
  | 'banque' | 'microfinance' | 'cooperative_epargne'
  | 'ministere' | 'agence_etat' | 'mairie'
  | 'anader' | 'firca' | 'ocpv'
  | 'ong' | 'ong_locale' | 'fondation' | 'agence_cooperation'
  | 'federation_producteurs' | 'syndicat_agricole' | 'chambre_agriculture'
  | 'centre_recherche' | 'universite' | 'centre_formation'
  | 'organisme_certification' | 'bureau_controle'
  | 'acheteur_institutionnel' | 'transformateur' | 'exportateur'
  | 'cnps' | 'assurance_agricole' | 'mutuelle'
  | 'media' | 'radio_rurale'
  | 'partenaire_tech' | 'autre'
  | 'cooperative' | 'gouvernement';
export interface ModuleAcces {
  dashboard?: NiveauAcces;
  analytics?: NiveauAcces;
  acteurs?: NiveauAcces;
  supervision?: NiveauAcces;
  audit?: NiveauAcces;
  export?: NiveauAcces;
  transactions?: NiveauAcces;
  cooperatives?: NiveauAcces;
  rapports?: NiveauAcces;
  parametres?: NiveauAcces;
  [key: string]: NiveauAcces | undefined;
}

export interface InstitutionPermissions {
  modules: Array<keyof ModuleAcces>;
  niveau: NiveauAcces;
  zones: string[];
  territoires?: string[];
}

export const DEFAULT_INSTITUTION_PERMISSIONS: InstitutionPermissions = {
  modules: [],
  niveau: 'aucun',
  zones: [],
  territoires: [],
};

export interface InstitutionBO {
  id: string;
  name?: string;
  nom?: string;
  type?: TypeInstitution;
  permissions?: InstitutionPermissions;
  email?: string;
  referentNom?: string;
  referentTelephone?: string;
  dateCreation?: string;
  creePar?: string;
  region?: string;
  statut?: string;
  modules?: string[];
}

export const PERMISSIONS: Record<BORoleType, Array<keyof ModuleAcces>> = {
  admin_general: ['acteurs', 'transactions', 'cooperatives', 'rapports', 'parametres'],
  operateur_terrain: ['acteurs', 'transactions', 'cooperatives', 'rapports'],
  identificateur: ['acteurs'],
};

export interface BOZone {
  id?: string;
  nom?: string;
  region?: string;
  statut?: string;
  nbActeurs?: number;
  nbIdentificateurs?: number;
  tauxActivite?: number;
  [key: string]: unknown;
}

export interface BOActeur {
  id: string;
  full_name?: string;
  phone?: string;
  telephone?: string;
  nom?: string;
  prenoms?: string;
  region?: string;
  statut?: string;
  type?: string;
  activite?: string;
  commune?: string;
  email?: string;
  score?: number;
  nin?: string;
  validated?: boolean;
  dateInscription?: string;
  role: BORoleType;
  zone?: BOZone;
  is_active: boolean;
}

export interface BOTransaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  created_at: string;
  user_id: string;
}
