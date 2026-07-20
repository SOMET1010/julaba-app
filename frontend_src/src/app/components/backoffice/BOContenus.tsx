import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, Edit3, Trash2, Eye, EyeOff, Save,
  HelpCircle, Image, Bell, BookOpen, ChevronDown, X,
  CheckCircle2, ToggleLeft, ToggleRight, Search,
} from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp, hoverGlow, springSnappy } from './bo-animations';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

type ContenuType = 'faq' | 'banniere' | 'message_systeme' | 'onboarding' | 'template_notif';

interface Contenu {
  id: string;
  type: ContenuType;
  titre: string;
  contenu: string;
  actif: boolean;
  dateModification: string;
  modifiePar: string;
}

const TYPE_CONFIG: Record<ContenuType, { label: string; icon: any; color: string }> = {
  faq: { label: 'FAQ', icon: HelpCircle, color: '#3B82F6' },
  banniere: { label: 'Bannière', icon: Image, color: '#F59E0B' },
  message_systeme: { label: 'Message système', icon: Bell, color: '#EF4444' },
  onboarding: { label: 'Écran d\'onboarding', icon: BookOpen, color: '#8B5CF6' },
  template_notif: { label: 'Template notification', icon: FileText, color: '#10B981' },
};


export function BOContenus() {
  const { hasPermission, addAuditLog, boUser } = useBackOffice();
  const canWrite = hasPermission('contenus.write');

  const [contenus, setContenus] = useState<Contenu[]>([]);

  React.useEffect(() => {
    fetch(`${API_URL}/communication`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const msgs = d?.messages || [];
        if (msgs.length > 0) {
          const mapped: Contenu[] = msgs.map((m: any) => ({
            id: m.id,
            type: m.type || 'message_systeme',
            titre: m.titre || m.title || '',
            contenu: m.contenu || m.content || '',
            actif: m.actif !== false,
            dateModification: m.updated_at ? new Date(m.updated_at).toISOString().split('T')[0] : '',
            modifiePar: m.modified_by || 'Admin',
          }));
          setContenus(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const [filterType, setFilterType] = useState<string>('tous');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<ContenuType>('faq');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const filtered = contenus.filter(c => {
    if (filterType !== 'tous' && c.type !== filterType) return false;
    if (search && !c.titre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleToggle = (id: string) => {
    setContenus(prev => prev.map(c => c.id === id ? { ...c, actif: !c.actif } : c));
    toast.info('Statut mis à jour localement (non persisté)');
  };

  const handleEdit = (c: Contenu) => {
    setEditingId(c.id);
    setEditTitle(c.titre);
    setEditContent(c.contenu);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setContenus(prev => prev.map(c => c.id === editingId ? { ...c, titre: editTitle, contenu: editContent, dateModification: new Date().toISOString().split('T')[0], modifiePar: boUser ? `${boUser.prenom} ${boUser.nom}` : 'Admin' } : c));
    toast.info('Contenu mis à jour localement (non persisté)');
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const newC: Contenu = {
      id: `c${Date.now()}`,
      type: newType,
      titre: newTitle,
      contenu: newContent,
      actif: true,
      dateModification: new Date().toISOString().split('T')[0],
      modifiePar: boUser ? `${boUser.prenom} ${boUser.nom}` : 'Admin',
    };
    setContenus(prev => [newC, ...prev]);
    setShowAdd(false);
    setNewTitle('');
    setNewContent('');
    toast.info('Contenu créé localement (non persisté)');
  };

  const handleDelete = (id: string) => {
    setContenus(prev => prev.filter(c => c.id !== id));
    toast.info('Contenu supprimé localement (non persisté)');
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Contenus dynamiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">FAQ, bannières, messages système et modèles</p>
        </div>
        {canWrite && (
          <motion.button onClick={() => setShowAdd(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-sm flex-shrink-0 self-start sm:self-auto"
            style={{ backgroundColor: BO_PRIMARY }}>
            <Plus className="w-4 h-4" /> Nouveau contenu
          </motion.button>
        )}
      </motion.div>

      {/* Filtres */}
      <motion.div {...fadeInUp(0.1)} className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'tous', label: 'Tous' }, ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
            <motion.button key={f.key} onClick={() => setFilterType(f.key)} whileTap={{ scale: 0.95 }}
              className="px-3 py-2 rounded-2xl border-2 text-xs font-bold transition-all"
              style={filterType === f.key
                ? { backgroundColor: BO_PRIMARY, color: '#fff', borderColor: BO_PRIMARY }
                : { borderColor: '#E5E7EB', color: '#6B7280' }}>
              {f.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Modal ajout */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-3xl border-2 border-gray-100 shadow-2xl p-6 w-full max-w-lg mx-4" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-gray-900">Nouveau contenu</h2>
                <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value as ContenuType)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm">
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Titre</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre du contenu"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Contenu</label>
                  <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={4} placeholder="Texte du contenu..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <motion.button onClick={() => setShowAdd(false)} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600">Annuler</motion.button>
                <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm text-white" style={{ backgroundColor: BO_PRIMARY }}>Créer</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste contenus */}
      <div className="space-y-3">
        {filtered.map((c, i) => {
          const cfg = TYPE_CONFIG[c.type] ?? Object.values(TYPE_CONFIG)[0];
          const Icon = cfg.icon || FileText;
          const isEditing = editingId === c.id;
          return (
            <motion.div key={c.id} {...fadeInUp(i * 0.04)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm font-bold" />
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm resize-none" />
                        <div className="flex gap-2">
                          <motion.button onClick={handleSaveEdit} whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: BO_PRIMARY }}>
                            <Save className="w-3 h-3" /> Sauvegarder
                          </motion.button>
                          <motion.button onClick={() => setEditingId(null)} whileTap={{ scale: 0.97 }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-gray-200 text-gray-500">Annuler</motion.button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-gray-900 text-sm">{c.titre}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</span>
                          {!c.actif && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactif</span>}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{c.contenu}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Modifié le {c.dateModification} par {c.modifiePar}</p>
                      </>
                    )}
                  </div>
                  {canWrite && !isEditing && (
                    <div className="flex items-center gap-1">
                      <motion.button onClick={() => handleToggle(c.id)} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl hover:bg-gray-100">
                        {c.actif ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      </motion.button>
                      <motion.button onClick={() => handleEdit(c)} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl hover:bg-gray-100">
                        <Edit3 className="w-4 h-4 text-gray-500" />
                      </motion.button>
                      <motion.button onClick={() => handleDelete(c.id)} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl hover:bg-red-50">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}