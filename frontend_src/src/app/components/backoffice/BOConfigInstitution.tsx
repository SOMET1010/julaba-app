import React, { useState, useEffect } from 'react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Eye, EyeOff, Save, RotateCcw, CheckCircle2,
  AlertTriangle, TrendingUp, Users, Activity, BarChart3,
  Globe, Shield, Heart, Wifi, UserPlus, XCircle, ChevronDown,
  ChevronUp, Info, MapPin, PieChart, Clock, ToggleRight, Layout,
} from 'lucide-react';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { toast } from 'sonner';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConfigItem {
  key: string;
  label: string;
  description?: string;
  icon: any;
  color: string;
  isVisible: boolean;
  displayOrder: number;
  isPermanent?: boolean; // Ne peut pas être masqué
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  items: ConfigItem[];
}

// ── Config par défaut ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG: ConfigSection[] = [
  {
    id: 'kpis_macro',
    title: 'KPIs Macro Nationale',
    description: 'Indicateurs de performance nationaux (Vue d\'ensemble)',
    icon: Globe,
    color: BO_PRIMARY,
    items: [
      { key: 'kpi_acteurs_actifs', label: 'Acteurs actifs', icon: Users, color: '#3B82F6', isVisible: true, displayOrder: 1, isPermanent: true },
      { key: 'kpi_total_acteurs', label: 'Total acteurs', icon: Users, color: '#8B5CF6', isVisible: true, displayOrder: 2, isPermanent: true },
      { key: 'kpi_acteurs_suspendus', label: 'Acteurs suspendus', icon: XCircle, color: '#EF4444', isVisible: true, displayOrder: 3 },
      { key: 'kpi_volume_transactions', label: 'Volume transactions', icon: Activity, color: '#10B981', isVisible: true, displayOrder: 4 },
      { key: 'kpi_valeur_monetaire', label: 'Valeur monétaire (Mds FCFA)', icon: TrendingUp, color: '#059669', isVisible: true, displayOrder: 5 },
      { key: 'kpi_digitalisation', label: 'Taux digitalisation', icon: Wifi, color: '#06B6D4', isVisible: true, displayOrder: 6 },
      { key: 'kpi_inclusion_cnps', label: 'Inclusion RSTI', icon: Shield, color: '#F97316', isVisible: true, displayOrder: 7 },
      { key: 'kpi_inclusion_cnam', label: 'Inclusion CNAM', icon: Heart, color: '#EC4899', isVisible: true, displayOrder: 8 },
      { key: 'kpi_croissance_mensuelle', label: 'Croissance mensuelle', icon: TrendingUp, color: '#14B8A6', isVisible: true, displayOrder: 9 },
    ],
  },
  {
    id: 'resume_jour',
    title: 'Résumé du Jour',
    description: 'Indicateurs journaliers de l\'activité',
    icon: Clock,
    color: '#8B5CF6',
    items: [
      { key: 'resume_nouveaux_inscrits', label: 'Nouveaux inscrits', icon: UserPlus, color: '#3B82F6', isVisible: true, displayOrder: 1 },
      { key: 'resume_dossiers_valides', label: 'Dossiers validés', icon: CheckCircle2, color: '#10B981', isVisible: true, displayOrder: 2 },
      { key: 'resume_dossiers_rejetes', label: 'Dossiers rejetés', icon: XCircle, color: '#EF4444', isVisible: true, displayOrder: 3 },
      { key: 'resume_transactions_jour', label: 'Transactions du jour', icon: Activity, color: '#8B5CF6', isVisible: true, displayOrder: 4 },
      { key: 'resume_alertes_actives', label: 'Alertes critiques actives', icon: AlertTriangle, color: '#F97316', isVisible: true, displayOrder: 5 },
    ],
  },
  {
    id: 'graphiques',
    title: 'Graphiques & Analytics',
    description: 'Visualisations de données',
    icon: BarChart3,
    color: '#10B981',
    items: [
      { key: 'graph_evolution_transactions', label: 'Évolution mensuelle transactions', icon: BarChart3, color: BO_PRIMARY, isVisible: true, displayOrder: 1 },
      { key: 'graph_repartition_type', label: 'Répartition acteurs par type', icon: PieChart, color: '#F97316', isVisible: true, displayOrder: 2 },
      { key: 'graph_activite_region', label: 'Activité par région', icon: MapPin, color: '#3B82F6', isVisible: true, displayOrder: 3 },
      { key: 'graph_courbe_adoption', label: 'Courbe adoption plateforme', icon: TrendingUp, color: '#10B981', isVisible: true, displayOrder: 4 },
    ],
  },
  {
    id: 'alertes',
    title: 'Alertes & Notifications',
    description: 'Système d\'alertes critiques',
    icon: AlertTriangle,
    color: '#EF4444',
    items: [
      { key: 'alertes_banniere', label: 'Bannière alertes critiques', icon: AlertTriangle, color: '#EF4444', isVisible: true, displayOrder: 1 },
      { key: 'alertes_detail', label: 'Détail des alertes', icon: Info, color: '#F59E0B', isVisible: true, displayOrder: 2 },
    ],
  },
];

// ── Component Toggle ──────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={disabled ? undefined : onChange}
      className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ backgroundColor: value ? BO_PRIMARY : '#d1d5db' }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
        animate={{ x: value ? 22 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function BOConfigInstitution() {
  const { boUser: _guardUser } = useBackOffice();
  if (_guardUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const [config, setConfig] = useState<ConfigSection[]>(DEFAULT_CONFIG);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['kpis_macro', 'resume_jour', 'graphiques', 'alertes']));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const isBackendReady = false; // TODO: passer à true quand /api/v1/admin/config existe

  // Charger config depuis NestJS /api/v1/admin
  useEffect(() => {
    loadConfigFromSupabase();
  }, []);

  const loadConfigFromSupabase = async () => {
    // FUTURE: GET /api/v1/admin/config
    // const { data } = await // migré NestJS
    // setConfig(parseConfigFromDB(data));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleItem = (sectionId: string, itemKey: string) => {
    setConfig(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.key === itemKey && !item.isPermanent) {
              return { ...item, isVisible: !item.isVisible };
            }
            return item;
          }),
        };
      }
      return section;
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!isBackendReady) {
      toast.info('Backend en construction. Sauvegarde indisponible pour le moment.');
      return;
    }
    setIsSaving(true);
    try {
      // FUTURE: PATCH /api/v1/admin/config
      // await // migré NestJS
      
      toast.info('Configuration sauvegardée localement. Persistance backend à implémenter.');
      setHasChanges(false);
      return;
    } catch (err) {
      console.warn('[BOConfigInstitution] handleSave failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la sauvegarde', {
        description: 'Impossible d\'enregistrer la configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setResetConfirmOpen(true);
  };

  const confirmReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
    toast.info('Configuration réinitialisée', {
      description: 'N\'oubliez pas de sauvegarder !',
    });
    setResetConfirmOpen(false);
  };

  // Stats
  const totalItems = config.reduce((acc, section) => acc + section.items.length, 0);
  const visibleItems = config.reduce((acc, section) => acc + section.items.filter(i => i.isVisible).length, 0);
  const hiddenItems = totalItems - visibleItems;
  const totalSections = config.length;
  const totalKPIs = config.reduce((acc, section) => acc + section.items.length, 0);
  const kpisActifs = config.reduce((acc, section) => acc + section.items.filter(item => item.isVisible).length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_DARK})` }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              >
                <Settings className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Configuration Interface Institution</h1>
                <p className="text-sm text-gray-600 mt-0.5">Personnaliser les données affichées sur le dashboard Institution</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm flex items-center gap-2 hover:bg-gray-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-4 h-4" />
                Réinitialiser
              </motion.button>

              <motion.button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !isBackendReady}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: hasChanges && isBackendReady ? `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_DARK})` : '#9CA3AF' }}
                whileHover={hasChanges && isBackendReady ? { scale: 1.02, y: -2 } : {}}
                whileTap={hasChanges && isBackendReady ? { scale: 0.98 } : {}}
                title={!isBackendReady ? 'Backend non disponible' : undefined}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
              </motion.button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{visibleItems}</span> éléments visibles
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{hiddenItems}</span> éléments masqués
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{totalItems}</span> total
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isBackendReady && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border-b-2 border-orange-200 px-6 py-3"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <p className="text-sm text-orange-900 font-semibold">
              Module en construction — La sauvegarde des configurations sera disponible quand le backend sera implémenté. Les modifications visibles ici sont locales uniquement.
            </p>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <KPIGrid cols={3} className="mb-6">
          <UniversalKPI label="Sections configurées" animatedTarget={totalSections} icon={Layout} color="#712864" />
          <UniversalKPI label="Total KPIs" animatedTarget={totalKPIs} icon={Settings} color="#2072AF" />
          <UniversalKPI label="KPIs actifs" animatedTarget={kpisActifs} icon={ToggleRight} color="#16a34a" />
        </KPIGrid>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold">
              Les modifications affectent l'affichage du dashboard Institution en temps réel.
              Les éléments marqués comme <span className="font-black">permanents</span> ne peuvent pas être masqués pour garantir la visibilité des KPIs critiques.
            </p>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {config.map((section, sectionIndex) => {
            const isExpanded = expandedSections.has(section.id);
            const SectionIcon = section.icon;
            const visibleCount = section.items.filter(i => i.isVisible).length;
            const totalCount = section.items.length;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.05 }}
                className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg overflow-hidden"
              >
                {/* Section Header */}
                <motion.button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  whileHover={{ x: 2 }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${section.color}15` }}
                    >
                      <SectionIcon className="w-6 h-6" style={{ color: section.color }} />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                      <p className="text-sm text-gray-600 mt-0.5">{section.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right mr-2">
                      <p className="text-sm font-bold text-gray-900">
                        {visibleCount}/{totalCount}
                      </p>
                      <p className="text-xs text-gray-500">visibles</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </motion.button>

                {/* Section Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t-2 border-gray-100"
                    >
                      <div className="p-6 space-y-3">
                        {section.items.map((item, itemIndex) => {
                          const ItemIcon = item.icon;
                          return (
                            <motion.div
                              key={item.key}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: itemIndex * 0.03 }}
                              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                item.isVisible
                                  ? 'bg-white border-gray-200 shadow-sm'
                                  : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${item.color}15` }}
                                >
                                  <ItemIcon className="w-5 h-5" style={{ color: item.color }} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900">{item.label}</p>
                                    {item.isPermanent && (
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                                        Permanent
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {item.isVisible ? (
                                  <Eye className="w-4 h-4 text-green-600" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                )}
                                <Toggle
                                  value={item.isVisible}
                                  onChange={() => toggleItem(section.id, item.key)}
                                  disabled={item.isPermanent}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating save button mobile */}
      {hasChanges && isBackendReady && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden"
        >
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 rounded-2xl text-white font-bold shadow-2xl flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_DARK})` }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </motion.button>
        </motion.div>
      )}

      {/* Modal confirmation Réinitialiser */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setResetConfirmOpen(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2"
              style={{ borderColor: BO_PRIMARY }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                  <RotateCcw className="w-5 h-5" style={{ color: '#D97706' }} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">Réinitialiser ?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Action réversible avec "Annuler"</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Toutes les configurations vont revenir aux valeurs par défaut. N'oublie pas de sauvegarder ensuite si tu confirmes.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmReset}
                  className="flex-1 py-3 rounded-2xl font-bold text-white"
                  style={{ background: BO_PRIMARY }}
                >
                  Réinitialiser
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}