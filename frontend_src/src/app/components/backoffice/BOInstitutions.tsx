import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Search, Edit2, Trash2, Shield, X,
  Mail, User, Phone, MapPin, CheckCircle, XCircle, Calendar, AlertCircle,
  FileText, Download, ChevronDown, Eye, Lock, Unlock, Save,
  BarChart3, Activity, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBackOffice, InstitutionBO, TypeInstitution, ModuleAcces, NiveauAcces, DEFAULT_INSTITUTION_PERMISSIONS, InstitutionPermissions } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { springSnappy } from './bo-animations';
import { CIV_REGIONS_LIST } from '../../data/civ-geography';
import { PermissionsEditor } from './BOInstitutionsPermissions';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

const INST_COLOR = '#712864';

function formatPhone(v: string): string {
  return v.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

const TYPE_CONFIG: Record<TypeInstitution, { label: string; color: string; bg: string }> = {
  // Institutions financières
  banque: { label: 'Banque', color: '#047857', bg: 'bg-emerald-50' },
  microfinance: { label: 'Microfinance', color: '#0891B2', bg: 'bg-cyan-50' },
  cooperative_epargne: { label: 'Coopérative Épargne & Crédit', color: '#0284C7', bg: 'bg-sky-50' },
  
  // Institutions publiques
  ministere: { label: 'Ministère', color: '#7C3AED', bg: 'bg-violet-50' },
  agence_etat: { label: 'Agence d\'État', color: '#6366F1', bg: 'bg-indigo-50' },
  mairie: { label: 'Mairie / Collectivité', color: '#8B5CF6', bg: 'bg-purple-50' },
  
  // Structures d'encadrement agricole
  anader: { label: 'ANADER', color: '#D97706', bg: 'bg-amber-50' },
  firca: { label: 'FIRCA', color: '#EA580C', bg: 'bg-orange-50' },
  ocpv: { label: 'OCPV', color: '#DC2626', bg: 'bg-red-50' },
  
  // Organisations de développement
  ong: { label: 'ONG Internationale', color: '#0891B2', bg: 'bg-cyan-50' },
  ong_locale: { label: 'ONG Locale', color: '#06B6D4', bg: 'bg-cyan-50' },
  fondation: { label: 'Fondation', color: '#14B8A6', bg: 'bg-teal-50' },
  agence_cooperation: { label: 'Agence de Coopération', color: '#10B981', bg: 'bg-green-50' },
  
  // Fédérations et organisations professionnelles
  federation_producteurs: { label: 'Fédération de Producteurs', color: '#84CC16', bg: 'bg-lime-50' },
  syndicat_agricole: { label: 'Syndicat Agricole', color: '#22C55E', bg: 'bg-green-50' },
  chambre_agriculture: { label: 'Chambre d\'Agriculture', color: '#16A34A', bg: 'bg-green-50' },
  
  // Partenaires techniques
  centre_recherche: { label: 'Centre de Recherche', color: '#3B82F6', bg: 'bg-blue-50' },
  universite: { label: 'Université / École', color: '#2563EB', bg: 'bg-blue-50' },
  centre_formation: { label: 'Centre de Formation', color: '#1D4ED8', bg: 'bg-blue-50' },
  
  // Organismes de certification et contrôle
  organisme_certification: { label: 'Organisme de Certification', color: '#A855F7', bg: 'bg-purple-50' },
  bureau_controle: { label: 'Bureau de Contrôle Qualité', color: '#9333EA', bg: 'bg-purple-50' },
  
  // Partenaires commerciaux
  acheteur_institutionnel: { label: 'Acheteur Institutionnel', color: '#EC4899', bg: 'bg-pink-50' },
  transformateur: { label: 'Unité de Transformation', color: '#DB2777', bg: 'bg-pink-50' },
  exportateur: { label: 'Exportateur', color: '#BE185D', bg: 'bg-pink-50' },
  
  // Assurances et protection sociale
  cnps: { label: 'RSTI', color: '#1D4ED8', bg: 'bg-blue-50' },
  assurance_agricole: { label: 'Assurance Agricole', color: '#2563EB', bg: 'bg-blue-50' },
  mutuelle: { label: 'Mutuelle de Santé', color: '#3B82F6', bg: 'bg-blue-50' },
  
  // Médias et communication
  media: { label: 'Média / Presse', color: '#F59E0B', bg: 'bg-amber-50' },
  radio_rurale: { label: 'Radio Rurale', color: '#FBBF24', bg: 'bg-amber-50' },
  
  // Autres
  partenaire_tech: { label: 'Partenaire Technologique', color: '#6B7280', bg: 'bg-gray-50' },
  autre: { label: 'Autre', color: '#9CA3AF', bg: 'bg-gray-50' },
};

const MODULES_CONFIG: Array<{ key: keyof ModuleAcces; label: string; desc: string; icon: any }> = [
  { key: 'dashboard',  label: 'Dashboard',   desc: 'KPIs et vue d\'ensemble nationale', icon: BarChart3 },
  { key: 'analytics',  label: 'Analytics',   desc: 'Graphiques et statistiques avancées', icon: Activity },
  { key: 'acteurs',    label: 'Acteurs',     desc: 'Liste et fiches des acteurs vivrés', icon: Users },
  { key: 'supervision',label: 'Supervision', desc: 'Transactions et flux financiers', icon: Eye },
  { key: 'audit',      label: 'Audit Log',   desc: 'Historique des actions systèmes', icon: FileText },
  { key: 'export',     label: 'Export',      desc: 'Téléchargement rapports PDF/Excel/CSV', icon: Download },
];

// Documentation des niveaux d'accès par module
const ACCES_DOCUMENTATION: Record<keyof ModuleAcces, { lecture: string; complet: string }> = {
  dashboard: {
    lecture: 'Voir les KPIs, graphiques et statistiques en temps réel',
    complet: 'Lecture + personnaliser widgets, créer tableaux de bord, configurer alertes',
  },
  analytics: {
    lecture: 'Consulter les rapports et graphiques analytiques existants',
    complet: 'Lecture + créer rapports personnalisés, exporter données brutes, segmentation avancée',
  },
  acteurs: {
    lecture: 'Voir la liste des acteurs, consulter les fiches détaillées',
    complet: 'Lecture + modifier profils, suspendre/réactiver, supprimer, valider dossiers',
  },
  supervision: {
    lecture: 'Voir les transactions, consulter l\'historique des flux financiers',
    complet: 'Lecture + geler/débloquer transactions, annuler, résoudre litiges, rembourser',
  },
  audit: {
    lecture: 'Consulter l\'historique des actions et logs système',
    complet: 'Lecture + exporter logs, filtres avancés, purger archives anciennes',
  },
  export: {
    lecture: 'Télécharger exports standards (PDF/Excel/CSV) des vues prédéfinies',
    complet: 'Lecture + exports personnalisés, planifier exports automatiques, accès API',
  },
};

const NIVEAU_CONFIG: Record<NiveauAcces, { label: string; color: string; bg: string; border: string }> = {
  aucun:   { label: 'Aucun accès',   color: '#6B7280', bg: 'bg-gray-100',  border: 'border-gray-200' },
  lecture: { label: 'Lecture seule', color: '#D97706', bg: 'bg-amber-50',  border: 'border-amber-200' },
  complet: { label: 'Accès complet', color: '#059669', bg: 'bg-green-50',  border: 'border-green-200' },
};

const inputCls = 'w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#712864] transition-all bg-white';

const DEFAULT_MODULES: ModuleAcces = {
  dashboard: 'aucun', analytics: 'aucun', acteurs: 'aucun',
  supervision: 'aucun', audit: 'aucun', export: 'aucun',
};

function ModuleNiveauPicker({
  niveau, onChange,
}: {
  niveau: NiveauAcces;
  onChange: (n: NiveauAcces) => void;
}) {
  const niveaux: NiveauAcces[] = ['aucun', 'lecture', 'complet'];
  return (
    <div className="flex gap-1">
      {niveaux.map(n => {
        const cfg = NIVEAU_CONFIG[n];
        const active = niveau === n;
        return (
          <motion.button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border-2 transition-all ${
              active ? `${cfg.bg} ${cfg.border}` : 'bg-white border-gray-100 text-gray-400'
            }`}
            style={active ? { color: cfg.color } : {}}
            whileTap={{ scale: 0.95 }}
          >
            {n === 'aucun' ? 'Aucun' : n === 'lecture' ? 'Lecture' : 'Complet'}
          </motion.button>
        );
      })}
    </div>
  );
}

function InstitutionCard({
  inst, onEditModules, onToggleStatut, onDelete,
}: {
  inst: InstitutionBO;
  onEditModules: (inst: InstitutionBO) => void;
  onToggleStatut: (id: string, statut: InstitutionBO['statut']) => void;
  onDelete: (inst: InstitutionBO) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg = TYPE_CONFIG[inst.type];
  const actifs = Object.values(inst.modules).filter(v => v !== 'aucun').length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl border-2 overflow-hidden shadow-sm ${
        inst.statut === 'suspendu' ? 'border-red-200 opacity-75' : 'border-gray-100'
      }`}
    >
      {/* Header carte */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start gap-4">
          {/* Icone type */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${typeCfg.bg}`}>
            <Building2 className="w-6 h-6" style={{ color: typeCfg.color }} />
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-black text-gray-900 text-sm leading-tight">{inst.nom}</p>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${typeCfg.bg}`}
                  style={{ color: typeCfg.color }}
                >
                  {typeCfg.label}
                </span>
              </div>
              <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border-2 ${
                inst.statut === 'actif'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {inst.statut === 'actif' ? 'Actif' : 'Suspendu'}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />{inst.region}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span style={{ color: actifs > 0 ? '#059669' : '#6B7280' }}>
                  {actifs} module{actifs !== 1 ? 's' : ''} actif{actifs !== 1 ? 's' : ''}
                </span>
              </span>
            </div>
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </motion.div>
        </div>

        {/* Mini pills modules */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {MODULES_CONFIG.map(m => {
            const niv = inst.modules[m.key];
            const cfg = NIVEAU_CONFIG[niv];
            if (niv === 'aucun') return null;
            return (
              <span
                key={m.key}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border}`}
                style={{ color: cfg.color }}
              >
                {m.label}
              </span>
            );
          })}
          {actifs === 0 && (
            <span className="text-[10px] text-gray-400 italic">Aucun accès accordé</span>
          )}
        </div>
      </div>

      {/* Section expandée */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
              {/* Infos contact */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { icon: User, label: inst.referentNom, sub: 'Référent' },
                  { icon: Phone, label: inst.referentTelephone, sub: 'Téléphone' },
                  { icon: Mail, label: inst.email, sub: 'Email' },
                  { icon: Calendar, label: new Date(inst.dateCreation).toLocaleDateString('fr-FR'), sub: 'Créée le' },
                  { icon: User, label: inst.creePar, sub: 'Créée par' },
                ].map(item => (
                  <div key={item.sub} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-2.5">
                    {item.icon && React.createElement(item.icon, {className: "w-4 h-4 text-gray-400 flex-shrink-0"})}
                    <div>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Récap accès modules */}
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Accès modules</p>
                {MODULES_CONFIG.map(m => {
                  const niv = inst.modules[m.key];
                  const cfg = NIVEAU_CONFIG[niv];
                  return (
                    <div key={m.key} className={`flex items-center justify-between rounded-2xl px-3 py-2.5 border-2 ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-center gap-2">
                        {(m as any).icon && React.createElement((m as any).icon, {className: "w-4 h-4", style: {color: cfg.color}})}
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>{m.label}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <motion.button
                  onClick={() => onEditModules(inst)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border-2 font-bold text-sm"
                  style={{ borderColor: INST_COLOR, color: INST_COLOR }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier accès
                </motion.button>

                <motion.button
                  onClick={() => onToggleStatut(inst.id, inst.statut === 'actif' ? 'suspendu' : 'actif')}
                  className={`px-4 py-3 rounded-2xl border-2 font-bold text-sm flex items-center gap-2 ${
                    inst.statut === 'actif'
                      ? 'bg-orange-50 border-orange-200 text-orange-600'
                      : 'bg-green-50 border-green-200 text-green-600'
                  }`}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                >
                  {inst.statut === 'actif' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {inst.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
                </motion.button>

                <motion.button
                  onClick={() => onDelete(inst)}
                  className="p-3 rounded-2xl bg-red-50 border-2 border-red-200 text-red-500"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function BOInstitutions() {
  const {
    institutions,
    addInstitution,
    updateInstitutionModules,
    updateInstitutionStatut,
    deleteInstitution,
    hasPermission,
    boUser,
    addAuditLog,
    refreshInstitutions,
  } = useBackOffice();

  if (boUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const canWrite = hasPermission('utilisateurs.write');

  useEffect(() => {
    void refreshInstitutions();
  }, []);

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<'all' | 'actif' | 'suspendu'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<InstitutionBO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstitutionBO | null>(null);

  // Form state
  const [form, setForm] = useState({
    nom: '', type: 'cnps' as TypeInstitution, region: 'National',
    email: '', referentNom: '', referentTelephone: '',
  });
  const [formModules, setFormModules] = useState<ModuleAcces>({ ...DEFAULT_MODULES });

  // Edit modules state
  const [editModules, setEditModules] = useState<ModuleAcces>({ ...DEFAULT_MODULES });

  const filtered = institutions.filter(i => {
    if (filterStatut !== 'all' && i.statut !== filterStatut) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.nom.toLowerCase().includes(q) || (i.referentNom ?? '').toLowerCase().includes(q) || (i.region ?? '').toLowerCase().includes(q);
    }
    return true;
  });
  const totalInstitutions = institutions.length;
  const institutionsActives = institutions.filter(i => i.statut === 'actif').length;
  const institutionsSuspendues = institutions.filter(i => i.statut === 'suspendu').length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.email || !form.referentNom) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      toast.error('Format email invalide');
      return;
    }
    if (form.referentTelephone) {
      const digits = form.referentTelephone.replace(/\D/g, '');
      if (digits.length < 8) {
        toast.error('Numéro de téléphone invalide');
        return;
      }
    }
    const referentTelephoneDigits = form.referentTelephone.replace(/\D/g, '').slice(0, 10);
    try {
      await addInstitution({ ...form, referentTelephone: referentTelephoneDigits, statut: 'actif', modules: formModules });
      toast.success(`Institution "${form.nom}" créée avec succès`);
      setForm({ nom: '', type: 'cnps', region: 'National', email: '', referentNom: '', referentTelephone: '' });
      setFormModules({ ...DEFAULT_MODULES });
      setShowForm(false);
    } catch (err) {
      console.warn('[BOInstitutions] handleCreate failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de créer l\'institution. Réessaie.');
    }
  };

  const handleSaveModules = async () => {
    if (!editTarget) return;
    try {
      await updateInstitutionModules(editTarget.id, editModules);
      toast.success('Accès modules mis à jour');
      setEditTarget(null);
    } catch (err) {
      console.warn('[BOInstitutions] handleSaveModules failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de mettre à jour les modules. Réessaie.');
    }
  };

  const handleToggleStatut = async (id: string, statut: InstitutionBO['statut']) => {
    const nextStatut = statut === 'actif' ? 'suspendu' : 'actif';
    const inst = institutions.find(i => i.id === id);
    try {
      await updateInstitutionStatut(id, nextStatut);
      toast.info(`Institution "${inst?.nom}" ${nextStatut === 'suspendu' ? 'suspendue' : 'réactivée'}`);
    } catch (err) {
      console.warn('[BOInstitutions] handleToggleStatut failed:', err instanceof Error ? err.message : err);
      toast.error('Action impossible. Réessaie.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInstitution(deleteTarget.id);
      toast.error(`Institution "${deleteTarget.nom}" supprimée`);
      setDeleteTarget(null);
    } catch (err) {
      console.warn('[BOInstitutions] handleDelete failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de supprimer. Réessaie.');
    }
  };

  const openEditModules = (inst: InstitutionBO) => {
    setEditTarget(inst);
    setEditModules({ ...inst.modules });
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6"
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-gray-900">Institutions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {institutions.length} institution{institutions.length > 1 ? 's' : ''} — seul le BackOffice peut créer et modifier les accès
          </p>
        </div>
        {canWrite && (
          <motion.button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-white shadow-md flex-shrink-0 self-start sm:self-auto"
            style={{ backgroundColor: INST_COLOR }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-5 h-5" />
            Nouvelle institution
          </motion.button>
        )}
      </motion.div>

      {/* Filtres */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-3 mb-5"
      >
        <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl border-2 border-gray-200 px-4 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une institution..."
            className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-2xl border-2 border-gray-200 p-1 shadow-sm">
          {(['all', 'actif', 'suspendu'] as const).map(s => (
            <motion.button
              key={s}
              onClick={() => setFilterStatut(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={filterStatut === s ? { backgroundColor: INST_COLOR, color: '#fff' } : { color: '#6B7280' }}
              whileTap={{ scale: 0.95 }}
            >
              {s === 'all' ? 'Toutes' : s === 'actif' ? 'Actives' : 'Suspendues'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <KPIGrid cols={3}>
        <UniversalKPI
          label="Total institutions"
          animatedTarget={totalInstitutions}
          icon={Building2}
          color="#712864"
        />
        <UniversalKPI
          label="Actives"
          animatedTarget={institutionsActives}
          icon={CheckCircle}
          color="#16a34a"
        />
        <UniversalKPI
          label="Suspendues"
          animatedTarget={institutionsSuspendues}
          icon={XCircle}
          color="#dc2626"
        />
      </KPIGrid>

      {/* Formulaire de création */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form-create"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white rounded-3xl border-2 shadow-lg mb-6 overflow-hidden"
            style={{ borderColor: INST_COLOR }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: `${INST_COLOR}10` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: INST_COLOR }}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900">Nouvelle Institution</h2>
                  <p className="text-xs text-gray-500">Identifiants envoyés par email — Action journalisée</p>
                </div>
              </div>
              <motion.button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </motion.button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {/* Infos institution */}
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Informations institution</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nom complet *</label>
                    <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required className={inputCls} placeholder="Ex : RSTI" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Type *</label>
                      <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as TypeInstitution }))} className={inputCls}>
                        <optgroup label="🏦 Institutions Financières">
                          <option value="banque">Banque</option>
                          <option value="microfinance">Microfinance</option>
                          <option value="cooperative_epargne">Coopérative Épargne & Crédit</option>
                        </optgroup>
                        
                        <optgroup label="🏛️ Institutions Publiques">
                          <option value="ministere">Ministère</option>
                          <option value="agence_etat">Agence d'État</option>
                          <option value="mairie">Mairie / Collectivité</option>
                        </optgroup>
                        
                        <optgroup label="🌾 Structures d'Encadrement Agricole">
                          <option value="anader">ANADER</option>
                          <option value="firca">FIRCA</option>
                          <option value="ocpv">OCPV</option>
                        </optgroup>
                        
                        <optgroup label="🌍 Organisations de Développement">
                          <option value="ong">ONG Internationale</option>
                          <option value="ong_locale">ONG Locale</option>
                          <option value="fondation">Fondation</option>
                          <option value="agence_cooperation">Agence de Coopération</option>
                        </optgroup>
                        
                        <optgroup label="👥 Fédérations & Organisations Professionnelles">
                          <option value="federation_producteurs">Fédération de Producteurs</option>
                          <option value="syndicat_agricole">Syndicat Agricole</option>
                          <option value="chambre_agriculture">Chambre d'Agriculture</option>
                        </optgroup>
                        
                        <optgroup label="🎓 Partenaires Techniques">
                          <option value="centre_recherche">Centre de Recherche</option>
                          <option value="universite">Université / École</option>
                          <option value="centre_formation">Centre de Formation</option>
                        </optgroup>
                        
                        <optgroup label="✅ Organismes de Certification">
                          <option value="organisme_certification">Organisme de Certification</option>
                          <option value="bureau_controle">Bureau de Contrôle Qualité</option>
                        </optgroup>
                        
                        <optgroup label="🏭 Partenaires Commerciaux">
                          <option value="acheteur_institutionnel">Acheteur Institutionnel</option>
                          <option value="transformateur">Unité de Transformation</option>
                          <option value="exportateur">Exportateur</option>
                        </optgroup>
                        
                        <optgroup label="🛡️ Assurances & Protection Sociale">
                          <option value="cnps">RSTI</option>
                          <option value="assurance_agricole">Assurance Agricole</option>
                          <option value="mutuelle">Mutuelle de Santé</option>
                        </optgroup>
                        
                        <optgroup label="📻 Médias & Communication">
                          <option value="media">Média / Presse</option>
                          <option value="radio_rurale">Radio Rurale</option>
                        </optgroup>
                        
                        <optgroup label="Autres">
                          <option value="partenaire_tech">Partenaire Technologique</option>
                          <option value="autre">Autre</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Région de supervision *</label>
                      <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} className={inputCls}>
                        {CIV_REGIONS_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email institution *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className={inputCls} placeholder="contact@institution.ci" />
                  </div>
                </div>
              </div>

              {/* Référent */}
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Référent</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nom complet *</label>
                    <input value={form.referentNom} onChange={e => setForm(p => ({ ...p, referentNom: e.target.value }))} required className={inputCls} placeholder="NOM Prénom" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        aria-hidden
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: '#2a1a0a',
                          background: 'rgba(198,106,44,0.08)',
                          borderRadius: 12,
                          padding: '10px 12px',
                          letterSpacing: 0.5,
                          userSelect: 'none',
                          flexShrink: 0,
                        }}
                      >
                        +225
                      </span>
                      <input
                        type="tel"
                        value={form.referentTelephone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setForm(p => ({ ...p, referentTelephone: digits ? formatPhone(digits) : '' }));
                        }}
                        className={inputCls}
                        placeholder="07 00 00 00 00"
                        maxLength={14}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modules accès */}
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Accès aux modules</p>
                <p className="text-xs text-gray-400 mb-3">Définissez ce que l'institution peut voir et faire</p>
                
                {/* Légende explicative des niveaux */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-4 border-2 border-blue-100">
                  <p className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2">Niveaux d'accès</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-gray-700">Aucun</p>
                        <p className="text-[10px] text-gray-500">Le module n'est pas visible pour l'institution</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-700">Lecture seule</p>
                        <p className="text-[10px] text-amber-600">Peut VOIR les données (listes, graphiques, rapports) mais NE PEUT PAS modifier, créer ou supprimer</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-green-700">Accès complet</p>
                        <p className="text-[10px] text-green-600">Peut TOUT faire : voir + créer + modifier + supprimer + exporter + actions avancées</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {MODULES_CONFIG.map(m => (
                    <div key={m.key} className="bg-gray-50 rounded-2xl p-3 border-2 border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        {(m as any).icon && React.createElement((m as any).icon, {className: "w-4 h-4 text-gray-500"})}
                        <div>
                          <p className="text-sm font-bold text-gray-800">{m.label}</p>
                          <p className="text-xs text-gray-400">{m.desc}</p>
                        </div>
                      </div>
                      <ModuleNiveauPicker
                        niveau={formModules[m.key]}
                        onChange={n => setFormModules(prev => ({ ...prev, [m.key]: n }))}
                      />
                      {/* Aide contextuelle selon le niveau sélectionné */}
                      {formModules[m.key] !== 'aucun' && (
                        <div className="mt-2 p-2 rounded-xl bg-white border border-gray-200">
                          <p className="text-[10px] text-gray-600">
                            {formModules[m.key] === 'lecture' ? (
                              <span><strong className="text-amber-600">Lecture seule :</strong> {ACCES_DOCUMENTATION[m.key].lecture}</span>
                            ) : (
                              <span><strong className="text-green-600">Accès complet :</strong> {ACCES_DOCUMENTATION[m.key].complet}</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notice sécurité */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 border-2 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  L'institution verra uniquement les modules que vous avez activés. Les identifiants de connexion seront envoyés par email au référent.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                <motion.button type="submit" className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: INST_COLOR }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Building2 className="w-5 h-5" />
                  Créer l'institution
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste institutions */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((inst, i) => (
            <motion.div key={inst.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <InstitutionCard
                inst={inst}
                onEditModules={openEditModules}
                onToggleStatut={handleToggleStatut}
                onDelete={setDeleteTarget}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white rounded-3xl border-2 border-gray-100">
            <Building2 className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-400">Aucune institution trouvée</p>
            <p className="text-sm text-gray-300 mt-1">Créez une nouvelle institution pour commencer</p>
          </motion.div>
        )}
      </div>

      {/* Drawer modification accès */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end lg:items-center lg:justify-center"
            onClick={() => setEditTarget(null)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Poignée mobile */}
              <div className="flex justify-center pt-3 pb-1 lg:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: `${INST_COLOR}08` }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: INST_COLOR }}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm leading-tight">Modifier les accès</p>
                  <p className="text-xs text-gray-500 truncate">{editTarget.nom}</p>
                </div>
                <motion.button onClick={() => setEditTarget(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" whileTap={{ scale: 0.9 }}>
                  <X className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>

              {/* Corps scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <p className="text-xs text-gray-500 mb-1">Choisissez le niveau d'accès pour chaque module. Les changements s'appliquent immédiatement.</p>
                {MODULES_CONFIG.map(m => (
                  <div key={m.key} className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${INST_COLOR}15` }}>
                        {(m as any).icon && React.createElement((m as any).icon, {className: "w-4 h-4", style: {color: INST_COLOR}})}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </div>
                    </div>
                    <ModuleNiveauPicker
                      niveau={editModules[m.key]}
                      onChange={n => setEditModules(prev => ({ ...prev, [m.key]: n }))}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
                <button onClick={() => setEditTarget(null)} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                <motion.button
                  onClick={handleSaveModules}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: INST_COLOR }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal confirmation suppression */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-black text-gray-900 text-center text-lg mb-2">Supprimer cette institution ?</h3>
              <p className="text-sm text-gray-500 text-center mb-1">
                <strong className="text-gray-800">{deleteTarget.nom}</strong>
              </p>
              <p className="text-xs text-gray-400 text-center mb-6">
                Tous les accès seront révoqués immédiatement. Action irréversible et journalisée.
              </p>
              <div className="flex gap-3">
                <motion.button onClick={() => setDeleteTarget(null)} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700" whileTap={{ scale: 0.97 }}>Annuler</motion.button>
                <motion.button onClick={handleDelete} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-500 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}