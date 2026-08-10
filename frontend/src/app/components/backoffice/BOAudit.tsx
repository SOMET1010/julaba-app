import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, User, MapPin, Clock, Activity, Layers, Users as UsersIcon, ChevronDown } from 'lucide-react';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalFiltreBO } from './universal/UniversalFiltreBO';
import type { FilterGroup, FilterValue } from './universal/UniversalFiltreBO';
import { UniversalPaginationBO } from './universal/UniversalPaginationBO';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { toast } from 'sonner';
import { exportToCSV, exportSimplePDF } from '../../utils/export.utils';

const ROLE_COLORS: Record<string, string> = {
  super_admin: BO_PRIMARY,
  admin_national: '#3B82F6',
  gestionnaire_zone: '#10B981',
  operateur_terrain: '#8B5CF6',
  admin_general: '#0891B2',
  identificateur: '#EC4899',
  admin: '#6366F1',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_national: 'Admin National',
  gestionnaire_zone: 'Gestionnaire Zone',
  operateur_terrain: 'Analyste',
  admin_general: 'Admin Général',
  identificateur: 'Identificateur',
  admin: 'Administrateur',
};

const MODULE_COLORS: Record<string, string> = {
  Acteurs: '#C66A2C',
  Enrôlement: '#2E8B57',
  Supervision: '#3B82F6',
  Commissions: BO_PRIMARY,
  Utilisateurs: '#8B5CF6',
  Zones: '#10B981',
};

export function BOAudit() {
  const _boCtx = useBackOffice();
  const auditLogs = Array.isArray(_boCtx.auditLogs) ? _boCtx.auditLogs : [];

  const refreshAuditLogsRef = useRef(_boCtx.refreshAuditLogs);
  refreshAuditLogsRef.current = _boCtx.refreshAuditLogs;

  useEffect(() => { void refreshAuditLogsRef.current?.(); }, []);

  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<FilterValue>({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const normalizeLog = (log: any) => ({
    id: log.id,
    date: log.date || log.created_at || new Date().toISOString(),
    action: log.action || 'Action inconnue',
    utilisateurBO: log.utilisateurBO || log.user_name || log.user_id || 'Utilisateur inconnu',
    roleBO: log.roleBO || log.role || 'admin',
    acteurImpacte: log.acteurImpacte || log.entite || log.target_name || null,
    module: log.module || log.entite || 'Système',
    ancienneValeur: log.ancienneValeur || log.old_value || null,
    nouvelleValeur: log.nouvelleValeur || log.new_value || null,
    ip: log.ip || null,
  });

  const modules = useMemo(() => [...new Set(auditLogs.map(l => normalizeLog(l).module))], [auditLogs]);

  const filterGroups = useMemo<FilterGroup[]>(() => [
    {
      id: 'module',
      label: 'Module',
      type: 'options',
      options: [
        { value: 'all', label: 'Tous modules' },
        ...modules.map(m => ({ value: m, label: m })),
      ],
    },
    {
      id: 'role',
      label: 'Role',
      type: 'options',
      options: [
        { value: 'all', label: 'Tous roles' },
        { value: 'admin_national', label: 'Admin National' },
        { value: 'gestionnaire_zone', label: 'Gestionnaire Zone' },
        { value: 'operateur_terrain', label: 'Analyste' },
        { value: 'admin_general', label: 'Admin General' },
        { value: 'identificateur', label: 'Identificateur' },
        { value: 'admin', label: 'Administrateur' },
      ],
    },
  ], [modules]);

  const filterModule = (filterValue.module as string) || 'all';
  const filterRole = (filterValue.role as string) || 'all';

  const filtered = useMemo(() => auditLogs.filter(l => {
    const n = normalizeLog(l);
    const matchSearch = !search || `${n.action} ${n.utilisateurBO} ${n.acteurImpacte || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchModule = filterModule === 'all' || n.module === filterModule;
    const matchRole = filterRole === 'all' || n.roleBO === filterRole;
    return matchSearch && matchModule && matchRole;
  }), [auditLogs, search, filterModule, filterRole]);

  const handleResetFilters = () => setFilterValue({});

  const handleExport = (fmt: 'CSV' | 'PDF') => {
    if (filtered.length === 0) {
      toast.info('Aucune entree a exporter');
      return;
    }
    const rows = filtered.map(l => {
      const n = normalizeLog(l);
      return {
        Date: new Date(n.date).toLocaleString('fr-FR'),
        Action: n.action,
        Utilisateur: n.utilisateurBO,
        'Role': ROLE_LABELS[n.roleBO] || n.roleBO,
        Module: n.module,
        Acteur: n.acteurImpacte || '-',
        'Ancienne valeur': n.ancienneValeur || '-',
        'Nouvelle valeur': n.nouvelleValeur || '-',
        IP: n.ip || '-',
      };
    });
    const filename = `audit_${new Date().toISOString().slice(0, 10)}`;
    try {
      if (fmt === 'CSV') {
        exportToCSV(rows, filename);
        toast.success(`${rows.length} entree(s) exportee(s) en CSV`);
      } else if (fmt === 'PDF') {
        exportSimplePDF(
          'Audit & Logs JULABA',
          [
            { label: 'Nombre d entrees', value: rows.length },
            { label: 'Periode export', value: new Date().toLocaleString('fr-FR') },
            { label: 'Modules couverts', value: [...new Set(rows.map(r => r.Module))].length },
          ],
          filename,
        );
        toast.success(`${rows.length} entree(s) exportee(s) en PDF`);
      }
    } catch (err) {
      console.warn('[BOAudit] handleExport failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de l export');
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Audit & Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} entrees - Historique immuable</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <UniversalDropdownMenuBO
            trigger={
              <span
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-bold text-sm bg-white flex-shrink-0 self-start sm:self-auto"
                style={{ borderColor: `${BO_PRIMARY}40`, color: BO_PRIMARY }}
              >
                <Download className="w-4 h-4" />
                Exporter
                <ChevronDown className="w-3 h-3" />
              </span>
            }
            triggerAriaLabel="Menu export"
            items={[
              {
                id: 'export-csv',
                label: `Exporter CSV (${filtered.length})`,
                icon: FileText,
                type: 'info',
                onClick: () => handleExport('CSV'),
              },
              { id: 'div-export', divider: true },
              {
                id: 'export-pdf',
                label: `Exporter PDF (${filtered.length})`,
                icon: Download,
                type: 'info',
                onClick: () => handleExport('PDF'),
              },
            ]}
            align="right"
            minWidth={240}
          />
        </div>
      </motion.div>

      {/* Stats */}
      <KPIGrid cols={3} className="mb-5">
        <UniversalKPI label="Actions totales" animatedTarget={auditLogs.length} icon={Activity} color={BO_DARK} iconAnimation="bounce" />
        <UniversalKPI label="Modules couverts" animatedTarget={modules.length} icon={Layers} color={BO_PRIMARY} iconAnimation="float" />
        <UniversalKPI label="Utilisateurs BO actifs" animatedTarget={[...new Set(auditLogs.map(l => l.utilisateurBO))].length} icon={UsersIcon} color="#10B981" iconAnimation="float" />
      </KPIGrid>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'nowrap', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <UniversalRechercheBO
            placeholder="Rechercher action, utilisateur, acteur..."
            debounceMs={200}
            onChange={(query) => setSearch(query)}
            onSubmit={(query) => setSearch(query)}
          />
        </div>
        <div style={{ flexShrink: 0 }}>
          <UniversalFiltreBO
            groups={filterGroups}
            value={filterValue}
            onChange={setFilterValue}
            onReset={handleResetFilters}
            triggerLabel="Filtres"
          />
        </div>
      </div>


      {/* Timeline logs */}
      <div className="space-y-3">
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((log, index) => {
          const n = normalizeLog(log);
          const roleColor = ROLE_COLORS[n.roleBO] || BO_PRIMARY;
          const moduleColor = MODULE_COLORS[n.module] || BO_DARK;
          return (
            <motion.div key={n.id} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
              whileHover={{ y: -2 }}>
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Indicateur module */}
                <div className="w-1 h-full min-h-[50px] rounded-full flex-shrink-0" style={{ backgroundColor: moduleColor }} />

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{n.action}</p>
                      {n.acteurImpacte && (
                        <p className="text-xs text-gray-500 mt-0.5">Acteur : {n.acteurImpacte}</p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 hidden sm:inline-block"
                      style={{ backgroundColor: `${moduleColor}20`, color: moduleColor }}>
                      {n.module}
                    </span>
                  </div>

                  {/* Badge module - mobile only */}
                  <span className="sm:hidden px-2 py-0.5 rounded-lg text-[10px] font-bold mb-2 inline-block"
                    style={{ backgroundColor: `${moduleColor}20`, color: moduleColor }}>
                    {n.module}
                  </span>

                  {/* Avant / Après */}
                  {(n.ancienneValeur || n.nouvelleValeur) && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {n.ancienneValeur && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 line-through">{n.ancienneValeur}</span>
                      )}
                      {n.ancienneValeur && n.nouvelleValeur && <span className="text-gray-400 text-xs">→</span>}
                      {n.nouvelleValeur && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700">{n.nouvelleValeur}</span>
                      )}
                    </div>
                  )}

                  {/* Meta - flex-wrap sur mobile */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: roleColor }}>
                        <User className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[120px] sm:max-w-none">{n.utilisateurBO}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg hidden sm:inline-block"
                        style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                        {ROLE_LABELS[n.roleBO] || n.roleBO}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">{new Date(n.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="sm:hidden">{new Date(n.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    {n.ip && n.ip !== '127.0.0.1' && (
                      <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {n.ip}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-3" />
            <p className="font-bold">Aucun log trouvé</p>
          </div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-6">
          <UniversalPaginationBO
            currentPage={page}
            totalItems={filtered.length}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setPage}
            showFirstLast={true}
            showCounter={true}
          />
        </div>
      )}
    </div>
  );
}