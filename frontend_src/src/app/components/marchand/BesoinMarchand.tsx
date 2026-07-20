import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Check, RefreshCw } from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { CATALOGUE_PRODUITS } from '../../data/catalogue-produits';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

const COLOR = '#C46210';

export function BesoinMarchand() {
  const { speak } = useApp();
  const [cooperativeId, setCooperativeId] = useState('');
  const [produit, setProduit] = useState('');
  const [categorie, setCategorie] = useState('');
  const [quantite, setQuantite] = useState('');
  const [unite, setUnite] = useState('kg');
  const [prixMax, setPrixMax] = useState('');
  const [priorite, setPriorite] = useState<'normale' | 'urgente'>('normale');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiRequest<{ id?: string } | null>(API_URL, '/cooperatives/ma-cooperative', { method: 'GET' })
      .then(d => { if (d?.id) setCooperativeId(d.id); })
      .catch((e: any) => console.warn('[BesoinMarchand] ma-cooperative failed:', e?.message));
  }, []);

  const handleSubmit = async () => {
    if (!produit.trim() || !quantite) { toast.error('Produit et quantité obligatoires'); return; }
    const quantiteNum = Number(quantite);
    if (isNaN(quantiteNum) || quantiteNum <= 0) { toast.error('Quantité invalide'); return; }
    if (!cooperativeId) { toast.error('Vous n\'êtes pas membre d\'une coopérative'); return; }
    setSubmitting(true);
    try {
      await apiRequest<unknown>(API_URL, '/cooperatives/besoins', {
        method: 'POST',
        body: JSON.stringify({
          cooperative_id: cooperativeId,
          produit: produit.trim(),
          categorie: categorie || 'autre',
          quantite: quantiteNum,
          unite,
          prix_max: prixMax ? Number(prixMax) : null,
          priorite,
          notes: notes || null,
        }),
      });
      setDone(true);
      speak('Votre besoin a été soumis à la coopérative');
      setTimeout(() => {
        setDone(false);
        setProduit(''); setCategorie(''); setQuantite('');
        setPrixMax(''); setNotes(''); setPriorite('normale');
      }, 2000);
    } catch (e: any) {
      console.warn('[BesoinMarchand] handleSubmit failed:', e?.message);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SubPageLayout role="marchand" title="Soumettre un besoin">
      <div className="pb-32 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 py-20">
              <div className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${COLOR}20` }}>
                <Check className="w-12 h-12" style={{ color: COLOR }} strokeWidth={3} />
              </div>
              <p className="text-xl font-bold text-gray-900">Besoin soumis !</p>
              <p className="text-sm text-gray-500 text-center">La coopérative a été notifiée de votre besoin.</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Produit <span className="text-red-500">*</span></label>
                <input type="text" value={produit} onChange={e => {
                  setProduit(e.target.value);
                  const found = CATALOGUE_PRODUITS.find(p => p.nom.toLowerCase() === e.target.value.toLowerCase());
                  if (found) { setCategorie(found.categorie); setUnite(found.unite); }
                }}
                  placeholder="Ex : Riz, Manioc, Igname..."
                  className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                  onFocus={e => (e.target.style.borderColor = COLOR)}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                {produit.length >= 2 && (() => {
                  const suggestions = CATALOGUE_PRODUITS.filter(p =>
                    p.nom.toLowerCase().includes(produit.toLowerCase()) && p.nom.toLowerCase() !== produit.toLowerCase()
                  ).slice(0, 5);
                  return suggestions.length > 0 ? (
                    <div className="mt-1 bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      {suggestions.map(p => (
                        <button key={p.nom} type="button"
                          onClick={() => { setProduit(p.nom); setCategorie(p.categorie); setUnite(p.unite); }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                          <span className="font-medium text-gray-900">{p.nom}</span>
                          <span className="text-xs text-gray-400">{p.categorie} · {p.unite}</span>
                        </button>
                      ))}
                      <button type="button"
                        onClick={() => { setProduit(produit); setCategorie('autre'); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-orange-600 font-bold hover:bg-orange-50">
                        Autre : "{produit}"
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Catégorie</label>
                <input type="text" value={categorie} onChange={e => setCategorie(e.target.value)}
                  placeholder="Auto-rempli selon le produit"
                  className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                  onFocus={e => (e.target.style.borderColor = COLOR)}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Quantité <span className="text-red-500">*</span></label>
                  <input type="number" value={quantite} onChange={e => setQuantite(e.target.value)}
                    placeholder="Ex : 50"
                    className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                    onFocus={e => (e.target.style.borderColor = COLOR)}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                </div>
                <SelectWithAutre
                  label="Unité"
                  value={unite}
                  onChange={setUnite}
                  options={['kg', 'tonne', 'sac', 'régimes', 'litre', 'carton']}
                  primaryColor={COLOR}
                  placeholder="Autre unité..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Prix maximum (FCFA) — optionnel</label>
                <input type="number" value={prixMax} onChange={e => setPrixMax(e.target.value)}
                  placeholder="Ex : 500"
                  className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                  onFocus={e => (e.target.style.borderColor = COLOR)}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Priorité</label>
                <div className="flex gap-3">
                  {(['normale', 'urgente'] as const).map(p => (
                    <motion.button key={p} onClick={() => setPriorite(p)} whileTap={{ scale: 0.95 }}
                      className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold"
                      style={priorite === p
                        ? { backgroundColor: p === 'urgente' ? '#DC2626' : COLOR, borderColor: 'transparent', color: 'white' }
                        : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
                      }>
                      {p === 'urgente' ? 'Urgente' : 'Normale'}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes — optionnel</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Précisions sur le besoin..."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white resize-none"
                  onFocus={e => (e.target.style.borderColor = COLOR)}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
              </div>

              <motion.button onClick={handleSubmit} disabled={submitting} whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ backgroundColor: COLOR }}>
                {submitting
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><RefreshCw className="w-4 h-4" /></motion.div> Envoi...</>
                  : <><Package className="w-4 h-4" /> Soumettre à ma coopérative</>
                }
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SubPageLayout>
  );
}
