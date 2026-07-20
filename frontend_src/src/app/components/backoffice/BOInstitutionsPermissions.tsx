import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, X, Home, Users as UsersIcon, Eye, BarChart3, FileText, User } from 'lucide-react';
import { InstitutionPermissions } from '../../contexts/BackOfficeContext';

const INST_COLOR = '#712864';

// Configuration des permissions organisées par module avec labels clairs
const PERMISSIONS_CONFIG = {
  navigation: {
    title: 'Navigation / Menus',
    icon: Home,
    color: '#712864',
    permissions: [
      { key: 'menu_accueil', label: 'Menu Accueil', desc: 'Afficher le menu Accueil dans la barre de navigation' },
      { key: 'menu_acteurs', label: 'Menu Acteurs', desc: 'Afficher le menu Acteurs dans la barre de navigation' },
      { key: 'menu_supervision', label: 'Menu Supervision', desc: 'Afficher le menu Supervision dans la barre de navigation' },
      { key: 'menu_analytics', label: 'Menu Analytics', desc: 'Afficher le menu Analytics dans la barre de navigation' },
      { key: 'menu_audit', label: 'Menu Audit', desc: 'Afficher le menu Audit dans la barre de navigation' },
      { key: 'menu_profil', label: 'Menu Profil', desc: 'Afficher le menu Profil dans la barre de navigation' },
    ],
  },
  accueil: {
    title: 'Accueil / tableau de bord',
    icon: Home,
    color: '#059669',
    permissions: [
      { key: 'accueil_tantie_sagesse', label: 'Tata Lou', desc: 'Afficher l\'assistant vocal Tata Lou' },
      { key: 'accueil_bouton_audio', label: 'Bouton Audio', desc: 'Afficher le bouton de lecture audio des KPIs' },
      { key: 'accueil_alertes_critiques', label: 'Alertes Critiques', desc: 'Afficher le bloc des alertes critiques actives' },
      { key: 'accueil_kpi_acteurs_actifs', label: 'KPI Acteurs Actifs', desc: 'Afficher le nombre d\'acteurs actifs' },
      { key: 'accueil_kpi_total_acteurs', label: 'KPI Total Acteurs', desc: 'Afficher le nombre total d\'acteurs inscrits' },
      { key: 'accueil_kpi_suspendus', label: 'KPI Acteurs Suspendus', desc: 'Afficher le nombre d\'acteurs suspendus' },
      { key: 'accueil_kpi_transactions', label: 'KPI Transactions', desc: 'Afficher le volume de transactions' },
      { key: 'accueil_kpi_valeur_monetaire', label: 'KPI Valeur Monétaire', desc: 'Afficher la valeur totale en Milliards FCFA' },
      { key: 'accueil_kpi_digitalisation', label: 'KPI Digitalisation', desc: 'Afficher le taux de digitalisation (%)' },
      { key: 'accueil_kpi_inclusion_cnps', label: 'KPI Inclusion RSTI', desc: 'Afficher le taux d\'inclusion RSTI (%)' },
      { key: 'accueil_kpi_inclusion_cnam', label: 'KPI Inclusion CNAM', desc: 'Afficher le taux d\'inclusion CNAM (%)' },
      { key: 'accueil_kpi_croissance', label: 'KPI Croissance', desc: 'Afficher le taux de croissance mensuelle (%)' },
      { key: 'accueil_resume_jour', label: 'Résumé du Jour', desc: 'Afficher le bloc résumé quotidien (nouveaux inscrits, dossiers validés/rejetés, transactions)' },
      { key: 'accueil_graphique_evolution', label: 'Graphique Évolution', desc: 'Afficher le graphique d\'évolution des transactions/valeur' },
      { key: 'accueil_graphique_repartition', label: 'Graphique Répartition', desc: 'Afficher le graphique de répartition par type d\'acteur' },
      { key: 'accueil_graphique_regions', label: 'Graphique Régions', desc: 'Afficher le graphique de répartition par région' },
    ],
  },
  acteurs: {
    title: 'Acteurs',
    icon: UsersIcon,
    color: '#C66A2C',
    permissions: [
      { key: 'acteurs_voir_liste', label: 'Voir Liste', desc: 'Afficher la liste complète des acteurs' },
      { key: 'acteurs_recherche_texte', label: 'Recherche Texte', desc: 'Afficher la barre de recherche textuelle' },
      { key: 'acteurs_recherche_vocale', label: 'Recherche Vocale', desc: 'Afficher le bouton de recherche vocale' },
      { key: 'acteurs_filtrer_statut', label: 'Filtrer par Statut', desc: 'Afficher les filtres par statut (actif/suspendu)' },
      { key: 'acteurs_filtrer_type', label: 'Filtrer par Type', desc: 'Afficher les filtres par type d\'acteur' },
      { key: 'acteurs_filtrer_region', label: 'Filtrer par Région', desc: 'Afficher les filtres par région' },
      { key: 'acteurs_voir_fiche_complete', label: 'Voir Fiche Complète', desc: 'Permettre d\'ouvrir la fiche détaillée d\'un acteur' },
      { key: 'acteurs_voir_statistiques', label: 'Voir Statistiques', desc: 'Afficher les statistiques globales des acteurs' },
      { key: 'acteurs_voir_historique', label: 'Voir Historique', desc: 'Afficher l\'historique d\'activité d\'un acteur' },
      { key: 'acteurs_exporter_liste', label: 'Exporter Liste', desc: 'Afficher le bouton d\'export de la liste (PDF/Excel/CSV)' },
    ],
  },
  supervision: {
    title: 'Supervision',
    icon: Eye,
    color: '#2072AF',
    permissions: [
      { key: 'supervision_voir_transactions', label: 'Voir Transactions', desc: 'Afficher la liste des transactions' },
      { key: 'supervision_recherche_transactions', label: 'Recherche Transactions', desc: 'Afficher la barre de recherche' },
      { key: 'supervision_recherche_vocale', label: 'Recherche Vocale', desc: 'Afficher le bouton de recherche vocale' },
      { key: 'supervision_filtrer_periode', label: 'Filtrer par Période', desc: 'Afficher les filtres temporels' },
      { key: 'supervision_filtrer_type', label: 'Filtrer par Type', desc: 'Afficher les filtres par type d\'acteur' },
      { key: 'supervision_filtrer_region', label: 'Filtrer par Région', desc: 'Afficher les filtres par région' },
      { key: 'supervision_voir_details_transaction', label: 'Voir Détails', desc: 'Permettre d\'ouvrir les détails d\'une transaction' },
      { key: 'supervision_voir_graphiques_flux', label: 'Graphiques de Flux', desc: 'Afficher les graphiques de flux financiers' },
      { key: 'supervision_voir_audit_log', label: 'Audit Log', desc: 'Afficher le journal d\'audit des actions' },
      { key: 'supervision_exporter_transactions', label: 'Exporter', desc: 'Afficher le bouton d\'export (PDF/Excel/CSV)' },
    ],
  },
  analytics: {
    title: 'Analytics',
    icon: BarChart3,
    color: '#6366F1',
    permissions: [
      { key: 'analytics_graphique_inscriptions', label: 'Graphique Inscriptions', desc: 'Afficher le graphique d\'évolution des inscriptions' },
      { key: 'analytics_graphique_transactions', label: 'Graphique Transactions', desc: 'Afficher le graphique d\'évolution des transactions' },
      { key: 'analytics_graphique_produits', label: 'Graphique Produits', desc: 'Afficher le graphique des volumes par produit' },
      { key: 'analytics_graphique_repartition', label: 'Graphique Répartition', desc: 'Afficher le graphique de répartition par type' },
      { key: 'analytics_graphique_regions', label: 'Graphique Régions', desc: 'Afficher les statistiques par région' },
      { key: 'analytics_filtrer_periode', label: 'Filtrer Période', desc: 'Afficher les filtres temporels' },
      { key: 'analytics_exporter_graphiques', label: 'Exporter', desc: 'Afficher le bouton d\'export des graphiques' },
      { key: 'analytics_voir_kpis', label: 'Voir KPIs', desc: 'Afficher les indicateurs clés de performance' },
    ],
  },
  audit: {
    title: 'Audit',
    icon: FileText,
    color: '#DC2626',
    permissions: [
      { key: 'audit_voir_logs', label: 'Voir Logs', desc: 'Afficher la liste des logs d\'audit' },
      { key: 'audit_rechercher_logs', label: 'Rechercher Logs', desc: 'Afficher la barre de recherche' },
      { key: 'audit_filtrer_par_action', label: 'Filtrer par Action', desc: 'Afficher les filtres par type d\'action' },
      { key: 'audit_filtrer_par_role', label: 'Filtrer par Rôle', desc: 'Afficher les filtres par rôle utilisateur' },
      { key: 'audit_voir_details_log', label: 'Voir Détails', desc: 'Permettre d\'ouvrir les détails d\'un log' },
      { key: 'audit_exporter_logs', label: 'Exporter', desc: 'Afficher le bouton d\'export (PDF/Excel/CSV)' },
    ],
  },
  profil: {
    title: 'Profil',
    icon: User,
    color: '#7C3AED',
    permissions: [
      { key: 'profil_voir_carte_institutionnelle', label: 'Carte Institutionnelle', desc: 'Afficher la carte institutionnelle digitale' },
      { key: 'profil_telecharger_carte', label: 'Télécharger Carte', desc: 'Afficher le bouton de téléchargement de la carte' },
      { key: 'profil_voir_qr_code', label: 'QR Code', desc: 'Afficher le QR code sur la carte' },
      { key: 'profil_voir_permissions', label: 'Voir Permissions', desc: 'Afficher la liste des permissions accordées' },
      { key: 'profil_voir_stats_supervision', label: 'Stats Supervision', desc: 'Afficher les statistiques de supervision' },
      { key: 'profil_voir_infos_personnelles', label: 'Infos Personnelles', desc: 'Afficher les informations personnelles' },
      { key: 'profil_voir_sessions_actives', label: 'Sessions Actives', desc: 'Afficher la liste des sessions actives' },
      { key: 'profil_voir_historique_connexions', label: 'Historique Connexions', desc: 'Afficher l\'historique des connexions' },
      { key: 'profil_bouton_reglages', label: 'Bouton Réglages', desc: 'Afficher le bouton d\'accès aux réglages' },
    ],
  },
};

interface PermissionsEditorProps {
  permissions: InstitutionPermissions;
  onChange: (permissions: InstitutionPermissions) => void;
}

export function PermissionsEditor({ permissions, onChange }: PermissionsEditorProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['navigation']); // Par défaut, Navigation ouvert

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const togglePermission = (key: keyof InstitutionPermissions) => {
    onChange({ ...permissions, [key]: !permissions[key] });
  };

  const toggleAllInSection = (sectionKey: string, value: boolean) => {
    const section = PERMISSIONS_CONFIG[sectionKey as keyof typeof PERMISSIONS_CONFIG];
    if (!section) return;

    const newPerms = { ...permissions };
    section.permissions.forEach(perm => {
      newPerms[perm.key as keyof InstitutionPermissions] = value;
    });
    onChange(newPerms);
  };

  const getSectionStats = (sectionKey: string) => {
    const section = PERMISSIONS_CONFIG[sectionKey as keyof typeof PERMISSIONS_CONFIG];
    if (!section) return { active: 0, total: 0 };

    const active = section.permissions.filter(
      p => permissions[p.key as keyof InstitutionPermissions]
    ).length;
    return { active, total: section.permissions.length };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
          Permissions de l'interface Institution
        </p>
        <div className="text-xs text-gray-400">
          {Object.keys(PERMISSIONS_CONFIG).reduce((total, key) => {
            const stats = getSectionStats(key);
            return total + stats.active;
          }, 0)} permissions actives
        </div>
      </div>

      {Object.entries(PERMISSIONS_CONFIG).map(([sectionKey, section]) => {
        const stats = getSectionStats(sectionKey);
        const isExpanded = expandedSections.includes(sectionKey);
        const Icon = section.icon || Home;

        return (
          <div
            key={sectionKey}
            className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
          >
            {/* Header de section */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection(sectionKey)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${section.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-sm">{section.title}</h3>
                  <p className="text-xs text-gray-500">
                    {stats.active}/{stats.total} activées
                  </p>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllInSection(sectionKey, true);
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-green-600 hover:bg-green-50"
                  whileTap={{ scale: 0.95 }}
                >
                  Tout activer
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllInSection(sectionKey, false);
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                  whileTap={{ scale: 0.95 }}
                >
                  Tout désactiver
                </motion.button>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              </div>
            </div>

            {/* Corps de section (accordéon) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 p-4 space-y-2">
                    {section.permissions.map((perm) => {
                      const isActive = permissions[perm.key as keyof InstitutionPermissions];
                      return (
                        <motion.div
                          key={perm.key}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                            isActive
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                          whileHover={{ scale: 1.01 }}
                        >
                          {/* Toggle */}
                          <motion.button
                            onClick={() => togglePermission(perm.key as keyof InstitutionPermissions)}
                            className={`w-11 h-6 rounded-full flex items-center transition-all flex-shrink-0 ${
                              isActive ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
                              animate={{ x: isActive ? 24 : 2 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              {isActive ? (
                                <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                              ) : (
                                <X className="w-3 h-3 text-gray-400" strokeWidth={3} />
                              )}
                            </motion.div>
                          </motion.button>

                          {/* Libellé et description */}
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${isActive ? 'text-green-700' : 'text-gray-700'}`}>
                              {perm.label}
                            </p>
                            <p className={`text-xs ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                              {perm.desc}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}