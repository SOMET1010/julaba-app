import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Plus, Trash2, Mic, ShoppingCart, BookOpen, Target, Navigation } from 'lucide-react';
import { useRaccourcis } from '../../contexts/RaccourcisContext';

const P = '#C46210';

const TYPES = [
  { id: 'vente',     label: 'Vente rapide',      Icon: ShoppingCart, color: '#16A34A' },
  { id: 'depense',   label: 'Dépense récurrente', Icon: BookOpen,     color: '#DC2626' },
  { id: 'objectif',  label: 'Objectif fixe',      Icon: Target,       color: P },
  { id: 'navigation',label: 'Navigation rapide',  Icon: Navigation,   color: '#7C3AED' },
];

const NAVIGATIONS = [
  { label: 'Caisse',      path: '/marchand/caisse' },
  { label: 'Stock',       path: '/marchand/stock' },
  { label: 'Commandes',   path: '/marchand/commandes' },
  { label: 'Marche',      path: '/marchand/marche' },
  { label: 'Keiwa',       path: '/marchand/keiwa' },
];

interface Props { isOpen: boolean; onClose: () => void; }

export function RaccourcisModal({ isOpen, onClose }: Props) {
  const { speak } = useApp();
  const { raccourcis, creerRaccourci, supprimerRaccourci, loading } = useRaccourcis();
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [type, setType] = useState('vente');
  const [nom, setNom] = useState('');
  const [declencheur, setDeclencheur] = useState('');
  const [produit, setProduit] = useState('');
  const [quantite, setQuantite] = useState('');
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [navPath, setNavPath] = useState('/marchand/caisse');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => { setNom(''); setDeclencheur(''); setProduit(''); setQuantite(''); setMontant(''); setDescription(''); setError(''); };

  const handleSave = async () => {
    if (!nom.trim() || !declencheur.trim()) { setError('Remplis tous les champs'); return; }
    if (raccourcis.length >= 5) { setError('Maximum 5 raccourcis atteint'); return; }
    let action: any = {};
    if (type === 'vente') action = { type: 'vendre', produit, quantite: Number(quantite), montant: Number(montant) };
    else if (type === 'depense') action = { type: 'depense', montant: Number(montant), description };
    else if (type === 'objectif') action = { type: 'definir_objectif', montant: Number(montant) };
    else if (type === 'navigation') action = { type: 'navigation', path: navPath };
    if ((type === 'vente' || type === 'depense') && action?.montant !== undefined) {
      const m = Number(action.montant);
      if (isNaN(m) || m <= 0) { setError('Le montant doit être supérieur à zéro'); return; }
    }

    setSaving(true);
    try {
      const result = await creerRaccourci({ nom, declencheur, type, action });
      if (result.error) { setError(result.error); return; }
      speak(`Raccourci ${nom} créé avec succès !`);
      resetForm();
      setMode('list');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-white rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${P}, #A0541F)` }}>
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-white" />
              <div>
                <p className="text-white font-black text-lg">Raccourcis vocaux</p>
                <p className="text-white/70 text-xs">{raccourcis.length}/5 raccourcis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'list' && raccourcis.length < 5 && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMode('create')}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Plus className="w-4 h-4 text-white" />
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { resetForm(); setMode('list'); onClose(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          </div>

          <div className="px-6 py-5">
            {mode === 'list' ? (
              <>
                {raccourcis.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: P }} />
                    <p className="text-gray-400 font-medium">Pas encore de raccourcis</p>
                    <p className="text-gray-300 text-sm mt-1">Appuie sur + pour en créer un</p>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setMode('create')}
                      className="mt-4 px-6 py-3 rounded-2xl font-black text-white text-sm"
                      style={{ background: `linear-gradient(135deg, ${P}, #A0541F)` }}>
                      Créer mon premier raccourci
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                      Dis le déclencheur à Tata Nanti Lou pour l'activer
                    </p>
                    {raccourcis.map(r => {
                      const typeInfo = TYPES.find(t => t.id === r.type);
                      const Icon = typeInfo?.Icon || Zap;
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl p-4 flex items-center gap-3"
                          style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${typeInfo?.color || P}15` }}>
                            <Icon className="w-5 h-5" style={{ color: typeInfo?.color || P }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-800 text-sm truncate">{r.nom}</p>
                            <p className="text-xs text-gray-400 truncate">Déclencheur: "{r.declencheur}"</p>
                            {r.action?.montant && (
                              <p className="text-xs font-bold mt-0.5" style={{ color: typeInfo?.color || P }}>
                                {Number(r.action.montant).toLocaleString('fr-FR')} FCFA
                                {r.action.produit ? ` · ${r.action.produit}` : ''}
                              </p>
                            )}
                          </div>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => {
                            supprimerRaccourci(r.id).catch((e: any) =>
                              console.warn('[RaccourcisModal] supprimerRaccourci failed:', e?.message)
                            );
                          }}
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: '#FEE2E2' }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </motion.button>
                        </motion.div>
                      );
                    })}
                    {raccourcis.length < 5 && (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setMode('create')}
                        className="w-full py-3 rounded-2xl font-bold text-sm border-2 flex items-center justify-center gap-2"
                        style={{ borderColor: P, color: P, background: 'white' }}>
                        <Plus className="w-4 h-4" /> Ajouter un raccourci
                      </motion.button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => { resetForm(); setMode('list'); }}
                    className="text-sm font-bold" style={{ color: P }}>
                    Retour
                  </motion.button>
                  <span className="text-gray-300">/</span>
                  <p className="text-sm font-bold text-gray-600">Nouveau raccourci</p>
                </div>

                {/* Type */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map(t => (
                      <motion.button key={t.id} whileTap={{ scale: 0.97 }}
                        onClick={() => setType(t.id)}
                        className="p-3 rounded-2xl flex items-center gap-2 font-bold text-sm border-2 transition-all"
                        style={{ background: type === t.id ? `${t.color}15` : 'white', borderColor: type === t.id ? t.color : '#E5E7EB', color: type === t.id ? t.color : '#6B7280' }}>
                        <t.Icon className="w-4 h-4" />
                        {t.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Nom */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nom du raccourci</p>
                  <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Tomates habituelles"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-orange-400" />
                </div>

                {/* Declencheur */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Phrase déclencheur</p>
                  <input value={declencheur} onChange={e => setDeclencheur(e.target.value)} placeholder="Ex: tomates habituelles"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-orange-400" />
                  <p className="text-xs text-gray-400 mt-1">Ce que tu dis à Tata Nanti Lou pour activer ce raccourci</p>
                </div>

                {/* Champs selon type */}
                {type === 'vente' && (
                  <div className="space-y-3">
                    <input value={produit} onChange={e => setProduit(e.target.value)} placeholder="Produit (ex: tomate)"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm outline-none focus:border-orange-400" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={quantite} onChange={e => setQuantite(e.target.value)} placeholder="Quantité" type="number" inputMode="numeric"
                        className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm outline-none focus:border-orange-400" />
                      <input value={montant} onChange={e => setMontant(e.target.value)} placeholder="Montant FCFA" type="number" inputMode="numeric"
                        className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm outline-none focus:border-orange-400" />
                    </div>
                  </div>
                )}
                {type === 'depense' && (
                  <div className="space-y-3">
                    <input value={montant} onChange={e => setMontant(e.target.value)} placeholder="Montant FCFA" type="number" inputMode="numeric"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm outline-none focus:border-orange-400" />
                    <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (ex: transport)"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm outline-none focus:border-orange-400" />
                  </div>
                )}
                {type === 'objectif' && (
                  <input value={montant} onChange={e => setMontant(e.target.value)} placeholder="Montant objectif FCFA" type="number" inputMode="numeric"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm outline-none focus:border-orange-400" />
                )}
                {type === 'navigation' && (
                  <div className="grid grid-cols-2 gap-2">
                    {NAVIGATIONS.map(n => (
                      <motion.button key={n.path} whileTap={{ scale: 0.97 }}
                        onClick={() => setNavPath(n.path)}
                        className="p-3 rounded-2xl font-bold text-sm border-2 transition-all"
                        style={{ background: navPath === n.path ? `${P}15` : 'white', borderColor: navPath === n.path ? P : '#E5E7EB', color: navPath === n.path ? P : '#6B7280' }}>
                        {n.label}
                      </motion.button>
                    ))}
                  </div>
                )}

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                  className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${P}, #A0541F)` }}>
                  {saving ? 'Enregistrement...' : 'Créer le raccourci'}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}