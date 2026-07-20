import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, UserPlus, RotateCcw, Eye,
  Check, X, ChevronDown, ChevronUp, Save,
  Crown, Globe, MapPin, Briefcase, PenLine, Zap,
  Search, Lock, Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useBackOffice, PERMISSIONS, type BORoleType } from '../../contexts/BackOfficeContext';
import {
  BO_PERMISSION_TREE,
  allPermissionKeys,
  roleCanHave,
  buildDefaultPermissions,
  type BoRole,
} from '../../config/bo-permissions';
import { useShortcuts } from '../../contexts/ShortcutsContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { toast } from 'sonner';
import { CIV_REGIONS_LIST } from '../../data/civ-geography';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { boAdminResetPassword } from '../../services/backoffice-api';

// ─── Configuration des rôles RBAC ────────────────────────────────────────────
type RoleConf = { label: string; color: string; icon: LucideIcon; desc: string };
// Carte volontairement partielle : seuls les roles a styliser y figurent ; les
// autres (ex. identificateur dans la liste) passent par un fallback a l'usage.
const ROLE_CONFIG: Partial<Record<BORoleType, RoleConf>> = {
  super_admin: {
    label: 'Super Administrateur',
    color: BO_PRIMARY,
    icon: Crown,
    desc: 'Accès total — toutes les fonctions du Back-Office',
  },
  admin_national: {
    label: 'Admin National',
    color: '#3B82F6',
    icon: Globe,
    desc: 'Gestion nationale — validation, enrôlement, supervision',
  },
  gestionnaire_zone: {
    label: 'Gestionnaire de Zone',
    color: '#10B981',
    icon: MapPin,
    desc: 'Gestion régionale — acteurs et identificateurs d\'une zone',
  },
  operateur_terrain: {
    label: 'Opérateur terrain',
    color: '#F59E0B',
    icon: Eye,
    desc: 'Supervision des opérations et acteurs',
  },
  admin_general: {
    label: 'Admin général',
    color: BO_PRIMARY,
    icon: Shield,
    desc: 'Administrateur général (compte entité, ex. une direction)',
  },
};

// Rôles réellement créables depuis cet écran. Le serveur tranche (POST
// /users/backoffice-account, réservé super_admin) ; on n'affiche donc pas
// super_admin ni les rôles non créables, pour ne pas proposer une action qui échoue.
const CREATABLE_BO_ROLES: BORoleType[] = [
  'admin_national',
  'gestionnaire_zone',
  'operateur_terrain',
];

// ─── Liste des métiers BO ────────────────────────────────────────────────────
const METIERS_BO = [
  { id: 'admin_financier', label: 'Admin Financier', desc: 'Suivi budgétaire, commissions, rapprochements' },
  { id: 'responsable_formation', label: 'Responsable Formation', desc: 'Gestion Academy, contenus pédagogiques' },
  { id: 'coordinateur_terrain', label: 'Coordinateur Terrain', desc: 'Suivi des identificateurs et missions' },
  { id: 'charge_communication', label: 'Chargé de communication', desc: 'Notifications, contenus, modération' },
  { id: 'responsable_qualite', label: 'Responsable qualité', desc: 'Audit, conformité, contrôles' },
  { id: 'charge_support', label: 'Chargé de support', desc: 'Assistance acteurs, tickets' },
  { id: 'data_analyst', label: 'Data Analyst', desc: 'Rapports, tableaux de bord, BI' },
  { id: 'responsable_logistique', label: 'Responsable Logistique', desc: 'Livraisons, zones, traçabilité' },
  { id: 'directeur_operations', label: 'Directeur des opérations', desc: 'Pilotage global, stratégie' },
  { id: 'responsable_partenariats', label: 'Responsable Partenariats', desc: 'Institutions, coopératives, ONG' },
  { id: 'autre', label: 'Autre (saisie libre)', desc: '' },
];

const PERMISSION_LABELS: Record<string, string> = {
  'acteurs.read': 'Voir acteurs',
  'acteurs.write': 'Modifier acteurs',
  'acteurs.delete': 'Supprimer acteurs',
  'acteurs.suspend': 'Suspendre acteurs',
  'enrolement.read': 'Voir l\'enrôlement',
  'enrolement.write': 'Modifier l\'enrôlement',
  'enrolement.validate': 'Valider dossiers',
  'supervision.read': 'Voir transactions',
  'supervision.write': 'Modifier transactions',
  'supervision.freeze': 'Geler transactions',
  'zones.read': 'Voir zones',
  'zones.write': 'Modifier zones',
  'commissions.read': 'Voir commissions',
  'commissions.write': 'Modifier commissions',
  'commissions.pay': 'Payer commissions',
  'academy.read': 'Voir Academy',
  'academy.write': 'Gérer Academy',
  'missions.read': 'Voir missions',
  'missions.write': 'Gérer missions',
  'parametres.read': 'Voir les paramètres',
  'parametres.write': 'Modifier les paramètres',
  'audit.read': 'Voir Audit et Logs',
  'utilisateurs.read': 'Voir utilisateurs BO',
  'utilisateurs.write': 'Créer utilisateurs BO',
  'utilisateurs.delete': 'Supprimer utilisateurs BO',
};

function RoleBadge({ role }: { role: BORoleType }) {
  const conf = ROLE_CONFIG[role] || { label: role, color: '#9CA3AF', icon: Zap, desc: '' };
  const Icon = conf.icon || Zap;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
      style={{ backgroundColor: `${conf.color}20`, color: conf.color }}>
      <Icon className="w-3.5 h-3.5" />
      {conf.label}
    </span>
  );
}

// ─── Toggle Switch animé ─────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled = false, tone = 'green' }: { checked: boolean; onChange: () => void; disabled?: boolean; tone?: 'green' | 'indigo' }) {
  const onColor = tone === 'indigo' ? '#6366F1' : '#10B981';
  return (
    <motion.button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 transition-colors duration-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        backgroundColor: checked ? `${onColor}20` : '#E5E7EB',
        borderColor: checked ? onColor : '#D1D5DB',
      }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
    >
      <motion.div
        className="inline-block h-5 w-5 rounded-full shadow-sm"
        style={{ backgroundColor: checked ? onColor : '#9CA3AF' }}
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

// Roles reglables par la matrice (les 4 roles BO ; super_admin exclu = tout par defaut).
const MATRIX_ROLE_IDS: BoRole[] = ['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];
// Modules affichables dans la matrice : les modules superOnly sont exclus.
const MATRIX_MODULES = BO_PERMISSION_TREE.filter((m) => !m.superOnly);

// Forme minimale d'un compte BO necessaire au calcul de l'etat rôle.
type BoUserPerms = {
  role?: string;
  boPermissions?: Record<string, boolean> | null;
  bo_permissions?: Record<string, boolean> | null;
};

// Etat reel partage par les comptes d'un role : une permission est consideree
// active pour le role seulement si TOUS les comptes de ce role l'ont a true.
// Hors perimetre du role -> false. Aucun compte -> defauts du registre.
function computeRoleState(role: BoRole, boUsers: ReadonlyArray<BoUserPerms>): Record<string, boolean> {
  const accounts = boUsers.filter((u) => u.role === role);
  if (accounts.length === 0) return buildDefaultPermissions(role);
  const result: Record<string, boolean> = {};
  for (const key of allPermissionKeys()) {
    if (!roleCanHave(role, key)) {
      result[key] = false;
      continue;
    }
    result[key] = accounts.every((acc) => {
      const stored = acc.boPermissions ?? acc.bo_permissions ?? {};
      return stored[key] === true;
    });
  }
  return result;
}

// ─── Matrice des permissions (branchee sur le registre bo-permissions.ts) ──────
function MatricePermissions() {
  const ctx = useBackOffice();
  const boUsers = Array.isArray(ctx.boUsers) ? ctx.boUsers : [];
  const { updateBOUserPermissions, boUser } = ctx;
  const canEdit = boUser?.role === 'super_admin';

  const [role, setRole] = useState<BoRole>('admin_general');
  const [mode, setMode] = useState<'role' | 'compte'>('role');
  const [accountId, setAccountId] = useState<string>('');
  const [perms, setPerms] = useState<Record<string, boolean>>(() => buildDefaultPermissions('admin_general'));
  // Reference de l'etat charge ; sert au suivi "dirty" et a l'auto-enregistrement.
  const [baseline, setBaseline] = useState<Record<string, boolean>>(() => buildDefaultPermissions('admin_general'));
  const [search, setSearch] = useState('');
  const [openModules, setOpenModules] = useState<Set<string>>(() => new Set(MATRIX_MODULES.map((m) => m.id)));
  const [saving, setSaving] = useState(false);
  const [autoStatus, setAutoStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');

  // Minuteur de debounce auto-save + garde anti-concurrence.
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const accountsOfRole = boUsers.filter((u) => u.role === role);

  const permsEqual = (a: Record<string, boolean>, b: Record<string, boolean>): boolean => {
    for (const key of allPermissionKeys()) {
      if ((a[key] === true) !== (b[key] === true)) return false;
    }
    return true;
  };
  const isDirty = !permsEqual(perms, baseline);

  // Valeurs initiales. Mode compte : boPermissions reels du compte selectionne.
  // Mode role : etat reel partage par les comptes du role (computeRoleState).
  // perms ET baseline sont alignes pour partir d'un etat "propre" (isDirty=false).
  useEffect(() => {
    let loaded: Record<string, boolean>;
    if (mode === 'compte') {
      const acc = boUsers.find((u) => u.id === accountId) as
        | { boPermissions?: Record<string, boolean> | null; bo_permissions?: Record<string, boolean> | null }
        | undefined;
      // Le backend renvoie bo_permissions (snake_case) dans la liste BO ; on
      // accepte aussi boPermissions (camelCase) selon la source.
      const rawStored = acc?.boPermissions ?? acc?.bo_permissions ?? null;
      const stored = rawStored && typeof rawStored === 'object' ? rawStored : null;
      if (stored) {
        loaded = {};
        for (const key of allPermissionKeys()) loaded[key] = stored[key] === true;
      } else {
        loaded = buildDefaultPermissions(role);
      }
    } else {
      loaded = computeRoleState(role, boUsers);
    }
    setPerms(loaded);
    setBaseline(loaded);
    setAutoStatus('idle');
    // boUsers : resynchronisation apres refresh post-save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mode, accountId, boUsers]);

  // En mode compte, selectionne le premier compte du role si aucun valide.
  useEffect(() => {
    if (mode === 'compte' && accountsOfRole.length > 0 && !accountsOfRole.some((a) => a.id === accountId)) {
      setAccountId(accountsOfRole[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, role, boUsers]);

  const isLocked = (key: string): boolean => !roleCanHave(role, key);

  const togglePerm = (key: string): void => {
    if (!canEdit || isLocked(key)) return;
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setModuleValue = (moduleId: string, value: boolean): void => {
    if (!canEdit) return;
    const mod = MATRIX_MODULES.find((m) => m.id === moduleId);
    if (!mod) return;
    setPerms((prev) => {
      const next = { ...prev };
      for (const grp of mod.groups) {
        for (const leaf of grp.perms) {
          if (!isLocked(leaf.key)) next[leaf.key] = value;
        }
      }
      return next;
    });
  };

  const setAll = (value: boolean): void => {
    if (!canEdit) return;
    setPerms((prev) => {
      const next = { ...prev };
      for (const key of allPermissionKeys()) {
        if (!isLocked(key)) next[key] = value;
      }
      return next;
    });
  };

  const resetDefaults = (): void => {
    if (!canEdit) return;
    setPerms(buildDefaultPermissions(role));
    toast.info('Permissions réinitialisées par défaut');
  };

  const toggleModuleOpen = (id: string): void => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOpen = MATRIX_MODULES.every((m) => openModules.has(m.id));
  const toggleAllOpen = (): void => {
    setOpenModules(allOpen ? new Set<string>() : new Set(MATRIX_MODULES.map((m) => m.id)));
  };

  const matchSearch = (label: string, key: string): boolean => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return label.toLowerCase().includes(q) || key.toLowerCase().includes(q);
  };

  // Synthese pour les KPI.
  const visibleLeaves = MATRIX_MODULES.flatMap((m) => m.groups.flatMap((g) => g.perms));
  const applicableLeaves = visibleLeaves.filter((l) => roleCanHave(role, l.key));
  const activeCount = applicableLeaves.filter((l) => perms[l.key]).length;
  const dangerActive = applicableLeaves.filter((l) => l.kind === 'danger' && perms[l.key]).length;
  const modulesVisibles = MATRIX_MODULES.filter((m) =>
    m.groups.some((g) => g.perms.some((l) => roleCanHave(role, l.key))),
  ).length;

  // Nombre de permissions actives pour un role (role courant = etat courant,
  // autres = defauts du role). Sert au compteur affiche sur chaque onglet.
  const roleActiveCount = (rid: BoRole): number => {
    const src = rid === role ? perms : buildDefaultPermissions(rid);
    let n = 0;
    for (const leaf of visibleLeaves) {
      if (roleCanHave(rid, leaf.key) && src[leaf.key]) n += 1;
    }
    return n;
  };

  // Enregistrement (manuel ou auto). silent = pas de toast en auto-save.
  const persist = async (silent: boolean): Promise<void> => {
    if (!canEdit || inFlight.current) return;
    const snapshot: Record<string, boolean> = {};
    for (const key of allPermissionKeys()) snapshot[key] = perms[key] === true;

    if (mode === 'compte') {
      const acc = boUsers.find((u) => u.id === accountId);
      if (!acc) {
        if (!silent) toast.error('Sélectionnez un compte');
        return;
      }
      inFlight.current = true;
      setSaving(true);
      setAutoStatus('saving');
      try {
        await updateBOUserPermissions(acc.id, snapshot);
        if (!silent) toast.success(`Permissions enregistrées pour ${acc.firstName || acc.full_name || acc.phone}`);
        setBaseline(snapshot);
        setAutoStatus('saved');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
        setAutoStatus('idle');
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
      return;
    }

    // Mode role : applique a tous les comptes du role.
    const targets = boUsers.filter((u) => u.role === role);
    if (targets.length === 0) {
      if (!silent) toast.error(`Aucun compte avec le rôle ${ROLE_CONFIG[role]?.label ?? role}`);
      // Rien a persister : on neutralise l'etat dirty pour ne pas relancer l'auto-save.
      setBaseline(snapshot);
      setAutoStatus('idle');
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setAutoStatus('saving');
    try {
      await Promise.all(targets.map((u) => updateBOUserPermissions(u.id, snapshot)));
      if (!silent) toast.success(`Permissions appliquées à ${targets.length} compte(s) ${ROLE_CONFIG[role]?.label ?? role}`);
      setBaseline(snapshot);
      setAutoStatus('saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
      setAutoStatus('idle');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  // Auto-enregistrement : 5 s apres la derniere modification (debounce). Chaque
  // nouvelle modif annule le minuteur precedent ; pas d'envoi si rien n'a change.
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (!canEdit || !isDirty) return;
    setAutoStatus('pending');
    autoSaveTimer.current = setTimeout(() => {
      void persist(true);
    }, 5000);
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perms, baseline, canEdit]);

  return (
    <motion.div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100 mb-6"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">Réglez un rôle entier ou un compte précis. Les éléments hors périmètre du rôle sont verrouillés.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 min-w-[90px] text-right">
              {autoStatus === 'saving'
                ? 'Enregistrement…'
                : autoStatus === 'pending'
                  ? 'Modifié'
                  : autoStatus === 'saved'
                    ? 'Enregistré'
                    : ''}
            </span>
            <button type="button" onClick={resetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Onglets de role (4 roles BO, sans super_admin) */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {MATRIX_ROLE_IDS.map((rid) => {
          const conf = ROLE_CONFIG[rid] ?? { label: rid, color: '#9CA3AF', icon: Zap, desc: '' };
          const Icon = conf.icon || Zap;
          const active = role === rid;
          return (
            <motion.button key={rid} onClick={() => setRole(rid)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm border-2 transition-all"
              style={{
                backgroundColor: active ? conf.color : 'transparent',
                color: active ? 'white' : '#374151',
                borderColor: active ? conf.color : '#e5e7eb',
              }}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{conf.label}</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                  color: active ? 'white' : '#6B7280',
                }}>
                {roleActiveCount(rid)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Mode (role / compte) + selection de compte */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-2xl border-2 border-gray-200 overflow-hidden">
          <button type="button" onClick={() => setMode('role')}
            className="px-4 py-2 text-sm font-bold transition-colors"
            style={{ backgroundColor: mode === 'role' ? BO_PRIMARY : 'transparent', color: mode === 'role' ? 'white' : '#374151' }}>
            Régler le rôle entier
          </button>
          <button type="button" onClick={() => setMode('compte')}
            className="px-4 py-2 text-sm font-bold transition-colors"
            style={{ backgroundColor: mode === 'compte' ? BO_PRIMARY : 'transparent', color: mode === 'compte' ? 'white' : '#374151' }}>
            Régler un compte précis
          </button>
        </div>
        {mode === 'compte' && (
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="px-3 py-2 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-700">
            {accountsOfRole.length === 0 && <option value="">Aucun compte pour ce rôle</option>}
            {accountsOfRole.map((a) => (
              <option key={a.id} value={a.id}>{a.firstName || a.full_name || a.phone}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI de synthese */}
      <KPIGrid>
        <UniversalKPI label="Permissions activées" animatedTarget={activeCount} icon={Check} color="#10B981" delay={0} />
        <UniversalKPI label="Permissions applicables" animatedTarget={applicableLeaves.length} icon={Layers} color={BO_PRIMARY} delay={0.05} />
        <UniversalKPI label="Modules visibles" animatedTarget={modulesVisibles} icon={Eye} color="#3B82F6" delay={0.1} />
        <UniversalKPI label="Actions sensibles" animatedTarget={dangerActive} icon={Shield} color="#EF4444" delay={0.15} />
      </KPIGrid>

      {/* Barre d'outils : recherche, tout activer/desactiver, plier/deplier */}
      <div className="flex flex-wrap items-center gap-2 my-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un module, une action..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl border-2 border-gray-200 text-sm" />
        </div>
        <button type="button" onClick={() => setAll(true)} disabled={!canEdit}
          className={`px-3 py-2 rounded-2xl text-xs font-bold border-2 border-gray-200 ${canEdit ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Tout activer</button>
        <button type="button" onClick={() => setAll(false)} disabled={!canEdit}
          className={`px-3 py-2 rounded-2xl text-xs font-bold border-2 border-gray-200 ${canEdit ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Tout désactiver</button>
        <button type="button" onClick={toggleAllOpen}
          className="px-3 py-2 rounded-2xl text-xs font-bold border-2 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5">
          {allOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {allOpen ? 'Tout plier' : 'Tout déplier'}
        </button>
      </div>

      {!canEdit && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
          Lecture seule : vous n'avez pas les droits pour modifier les permissions.
        </div>
      )}

      {/* Arbre des modules > actions > sous-elements */}
      <div className="space-y-2">
        {MATRIX_MODULES.map((mod) => {
          const leaves = mod.groups.flatMap((g) => g.perms);
          const applicable = leaves.filter((l) => roleCanHave(role, l.key));
          const moduleApplicable = applicable.length > 0;
          const moduleAllOn = moduleApplicable && applicable.every((l) => perms[l.key]);
          const visibleBySearch = matchSearch(mod.label, mod.id) || leaves.some((l) => matchSearch(l.label, l.key));
          if (!visibleBySearch) return null;
          const open = openModules.has(mod.id);
          return (
            <div key={mod.id} className={`rounded-2xl border-2 border-gray-100 ${moduleApplicable ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between px-4 py-3">
                <button type="button" onClick={() => toggleModuleOpen(mod.id)} className="flex items-center gap-2 min-w-0">
                  {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <span className="font-bold text-sm text-gray-800 truncate">{mod.label}</span>
                  <span className="text-[10px] text-gray-400">{applicable.filter((l) => perms[l.key]).length}/{applicable.length}</span>
                  {!moduleApplicable && <span className="text-[10px] font-bold text-gray-400">Non applicable</span>}
                </button>
                <ToggleSwitch checked={moduleAllOn} disabled={!canEdit || !moduleApplicable}
                  onChange={() => setModuleValue(mod.id, !moduleAllOn)} />
              </div>
              {open && (
                <div className="px-4 pb-3 space-y-2.5">
                  {mod.groups.map((grp) => (
                    <div key={grp.name}>
                      {mod.groups.length > 1 && <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 mb-1">{grp.name}</p>}
                      {grp.perms.filter((l) => matchSearch(l.label, l.key)).map((leaf) => {
                        const locked = isLocked(leaf.key);
                        const on = perms[leaf.key] === true;
                        return (
                          <div key={leaf.key}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${locked ? 'border-gray-100 bg-gray-50/60' : on ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {locked && <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                              <span className={`text-xs font-semibold ${locked ? 'text-gray-400' : 'text-gray-700'}`}>{leaf.label}</span>
                              {leaf.kind === 'danger' && !locked && <span className="text-[9px] font-bold text-red-500 uppercase">sensible</span>}
                              <span className="text-[10px] text-gray-300 truncate">{leaf.key}</span>
                            </div>
                            <ToggleSwitch checked={on} disabled={!canEdit || locked} onChange={() => togglePerm(leaf.key)} tone="indigo" />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </motion.div>
  );
}

export function BOUtilisateurs() {
  const _boCtx = useBackOffice();
  const boUsers = Array.isArray(_boCtx.boUsers) ? _boCtx.boUsers : [];
  const { boUser, hasPermission, addBOUser, updateBOUserActif, refreshBOUsers, updateBOUserPermissions } = _boCtx;
  const { registerNewAction, unregisterNewAction, pushUndoAction } = useShortcuts();

  useEffect(() => {
    void refreshBOUsers();
  }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; nom: string } | null>(null);

  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '',
    role: 'admin_national' as BORoleType,
    region: 'National',
    actif: true,
    metier: '',
    metierCustom: '',
  });

  const canCreate = hasPermission('utilisateurs.write');
  const canDelete = hasPermission('utilisateurs.delete');
  const isSuperAdmin = _boCtx.user?.role === 'super_admin' || _boCtx.boUser?.role === 'super_admin';

  useEffect(() => {
    if (canCreate) {
      registerNewAction(() => setShowCreate(true));
    } else {
      unregisterNewAction();
    }
    return () => unregisterNewAction();
  }, [canCreate, registerNewAction, unregisterNewAction]);

  const handleToggleActif = async (id: string) => {
    const user = boUsers.find(u => u.id === id);
    if (!user) return;
    try {
      // user.actif est optionnel cote type (BOUser.actif?: boolean) ; on garantit
      // un booleen pour les appels qui l'exigent.
      const oldActif = user.actif ?? false;
      await updateBOUserActif(id, !oldActif);
      toast.success(`Utilisateur ${!oldActif ? 'reactivé' : 'désactivé'}`);
      pushUndoAction(`Modification statut ${user.prenom} ${user.nom}`, async () => {
        await updateBOUserActif(id, oldActif);
      });
    } catch (err) {
      console.warn('[BOUtilisateurs] handleToggleActif failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.telephone) {
      toast.error('Tous les champs obligatoires doivent être remplis');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await addBOUser({
        prenom: form.prenom,
        nom: form.nom,
        telephone: form.telephone,
        role: form.role,
        region: form.region,
      });
      const motDePasse = res?.motDePasseInitial;
      toast.success(
        motDePasse
          ? `Compte créé pour ${form.prenom} ${form.nom}. Mot de passe initial : ${motDePasse}. À communiquer, l’utilisateur devra le changer à sa première connexion.`
          : `Compte créé pour ${form.prenom} ${form.nom}. L’utilisateur devra définir son mot de passe à sa première connexion.`,
      );
      setForm({ prenom: '', nom: '', telephone: '', role: 'admin_national', region: 'National', actif: true, metier: '', metierCustom: '' });
      setShowCreate(false);
    } catch (err) {
      console.warn('[BOUtilisateurs] handleCreate failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création du compte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetTarget || isResetting) return;
    setIsResetting(true);
    try {
      const res = await boAdminResetPassword(resetTarget.id);
      const motDePasse = res?.motDePasseInitial;
      toast.success(
        motDePasse
          ? `Mot de passe réinitialisé pour ${resetTarget.nom}. Nouveau mot de passe : ${motDePasse}. À communiquer, il devra le changer à la prochaine connexion.`
          : `Mot de passe réinitialisé pour ${resetTarget.nom}`,
      );
      setResetTarget(null);
    } catch (err) {
      console.warn('[BOUtilisateurs] reset password failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setIsResetting(false);
    }
  };

  // Comptes BO affiches dans la liste (tous les roles back-office).
  const BO_ROLES: BORoleType[] = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur'];
  const filteredUsers = boUsers.filter(u => BO_ROLES.includes(u.role as BORoleType));

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Matrice des permissions des Administrateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Definissez ce que chaque role ou compte administrateur peut voir et faire dans le Back-Office. Les modifications sont enregistrees automatiquement.</p>
        </div>
        {canCreate && (
          <motion.button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold shadow-lg"
            style={{ backgroundColor: BO_PRIMARY }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouvel utilisateur</span>
          </motion.button>
        )}
      </motion.div>

      {/* Matrice des permissions — branchee sur le registre config/bo-permissions.ts */}
      <MatricePermissions />

      {/* Liste utilisateurs */}
      <div className="space-y-3">
        {filteredUsers.map((user, index) => {
          const conf = ROLE_CONFIG[user.role as BORoleType] || { label: user.role, color: '#9CA3AF', icon: Zap, desc: '' };
          const Icon = conf.icon || Zap;
          const isExpanded = expanded === user.id;
          const isCurrentUser = boUser?.id === user.id;

          return (
            <motion.div key={user.id}
              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${isCurrentUser ? 'border-[#9F8170]' : 'border-gray-100'}`}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
              layout>
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: conf.color }}>
                    {(user.prenom || '?').charAt(0)}{(user.nom || '').charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{user.prenom} {user.nom}</p>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#9F8170]/20 text-[#9F8170]">Vous</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{user.phone || 'Téléphone non renseigné'}</p>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      {user.region && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {user.region}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Dernière connexion : {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle + Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Toggle Actif/Inactif */}
                    {!isCurrentUser && canDelete && (
                      <div className="flex flex-col items-center gap-0.5">
                        <ToggleSwitch
                          checked={user.actif ?? false}
                          onChange={() => handleToggleActif(user.id)}
                        />
                        <span className={`text-[9px] font-bold ${user.actif ? 'text-green-600' : 'text-gray-400'}`}>
                          {user.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    )}
                    {isCurrentUser && (
                      <div className="flex flex-col items-center gap-0.5">
                        <ToggleSwitch checked={true} onChange={() => {}} disabled />
                        <span className="text-[9px] font-bold text-green-600">Actif</span>
                      </div>
                    )}

                    {isSuperAdmin && (
                      <motion.button
                        type="button"
                        onClick={() => setResetTarget({ id: user.id, nom: `${user.prenom || ''} ${user.nom || ''}`.trim() })}
                        aria-label={`Réinitialiser le mot de passe de ${user.prenom} ${user.nom}`}
                        className="px-3 py-2 rounded-xl border-2 border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Réinitialiser password
                      </motion.button>
                    )}

                    <motion.button onClick={() => setExpanded(isExpanded ? null : user.id)}
                      aria-label={isExpanded ? 'Réduire les détails utilisateur' : 'Afficher les détails utilisateur'}
                      className="w-9 h-9 rounded-xl flex items-center justify-center border-2 border-gray-200 bg-gray-50"
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                    </motion.button>
                  </div>
                </div>
              </div>

      {/* Détail permissions */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="px-4 pb-4 border-t-2 border-gray-100 pt-4">
                      <p className="text-xs font-bold text-gray-600 mb-3">Permissions accordées</p>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {PERMISSIONS[user.role as BORoleType]?.map(perm => (
                          <div key={perm} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-green-50 border border-green-200">
                            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <span className="text-[10px] font-semibold text-green-800">{PERMISSION_LABELS[perm] || perm}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Modal création */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}>
            <motion.div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-2 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-black text-gray-900 text-xl">Nouvel utilisateur BO</h2>
                  <p className="text-sm text-gray-500">Accès Back-Office Central</p>
                </div>
                <button onClick={() => setShowCreate(false)}
                  aria-label="Fermer la fenêtre de création"
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bo-user-prenom" className="block text-sm font-bold text-gray-700 mb-1">Prénom *</label>
                    <input id="bo-user-prenom" value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" placeholder="Jean" />
                  </div>
                  <div>
                    <label htmlFor="bo-user-nom" className="block text-sm font-bold text-gray-700 mb-1">Nom *</label>
                    <input id="bo-user-nom" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" placeholder="KOUASSI" />
                  </div>
                </div>

                <div>
                  <label htmlFor="bo-user-telephone" className="block text-sm font-bold text-gray-700 mb-1">Téléphone *</label>
                  <input
                    id="bo-user-telephone"
                    type="tel"
                    value={form.telephone}
                    onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm"
                    placeholder="0700000000"
                  />
                </div>

                {/* Sélection rôle */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Rôle *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(ROLE_CONFIG) as [BORoleType, RoleConf][])
                      .filter(([role]) => CREATABLE_BO_ROLES.includes(role))
                      .map(([role, conf]) => {
                      const Icon = conf.icon || Zap;
                      const selected = form.role === role;
                      return (
                        <motion.button type="button" key={role} onClick={() => setForm(p => ({ ...p, role }))}
                          className="p-3 rounded-2xl border-2 text-left transition-all"
                          style={{
                            borderColor: selected ? conf.color : '#e5e7eb',
                            backgroundColor: selected ? `${conf.color}10` : 'transparent',
                          }}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4" style={{ color: conf.color }} />
                            {selected && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: conf.color }} />}
                          </div>
                          <p className="text-xs font-bold text-gray-900">{conf.label}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Métier / Fonction */}
                <div>
                  <label htmlFor="bo-user-metier-custom" className="block text-sm font-bold text-gray-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      Fonction / Métier
                    </div>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {METIERS_BO.map(m => {
                      const selected = form.metier === m.id;
                      return (
                        <motion.button type="button" key={m.id}
                          onClick={() => setForm(p => ({ ...p, metier: m.id, metierCustom: m.id === 'autre' ? p.metierCustom : '' }))}
                          className="p-2.5 rounded-xl border-2 text-left transition-all"
                          style={{
                            borderColor: selected ? BO_PRIMARY : '#e5e7eb',
                            backgroundColor: selected ? `${BO_PRIMARY}10` : 'transparent',
                          }}
                          whileTap={{ scale: 0.97 }}>
                          <p className="text-xs font-bold text-gray-900 leading-tight">{m.label}</p>
                          {m.desc && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{m.desc}</p>}
                          {selected && m.id !== 'autre' && (
                            <Check className="w-3 h-3 mt-1" style={{ color: BO_PRIMARY }} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  {form.metier === 'autre' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <div className="relative">
                        <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          id="bo-user-metier-custom"
                          type="text"
                          value={form.metierCustom}
                          onChange={e => setForm(p => ({ ...p, metierCustom: e.target.value }))}
                        placeholder="Saisir le métier..."
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Région */}
                <div>
                  <label htmlFor="bo-user-region" className="block text-sm font-bold text-gray-700 mb-1">Région d'affectation</label>
                  <select id="bo-user-region" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm">
                    {CIV_REGIONS_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Permissions preview */}
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-2">Permissions accordées automatiquement ({PERMISSIONS[form.role]?.length})</p>
                  <p className="text-xs text-gray-500">{(ROLE_CONFIG[form.role] || { label: 'Inconnu', color: '#9CA3AF', icon: Zap, desc: '' }).desc}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">
                    Annuler
                  </button>
                  <motion.button type="submit" disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ backgroundColor: BO_PRIMARY }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Save className="w-5 h-5" />
                    {isSubmitting ? 'Création…' : 'Créer le compte'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetTarget && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[210] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isResetting && setResetTarget(null)}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 w-full max-w-md border-2"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="bo-users-reset-password-title"
            >
              <h3 id="bo-users-reset-password-title" className="font-black text-gray-900 text-lg mb-2">
                Réinitialiser le mot de passe de {resetTarget.nom} ?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Un nouveau mot de passe aléatoire sera généré et affiché après confirmation, à communiquer à l’utilisateur. Il devra le changer à sa prochaine connexion. Cette action sera enregistrée dans l’audit.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  disabled={isResetting}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 disabled:opacity-50"
                >
                  Annuler
                </button>
                <motion.button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={isResetting}
                  className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: BO_PRIMARY }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isResetting ? 'Réinitialisation...' : 'Confirmer'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}